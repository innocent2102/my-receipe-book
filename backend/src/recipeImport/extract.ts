import { ImportError } from './fetchPage.js';
import { extractRecipeFromMarkup } from './htmlHeuristics.js';
import { parseIngredientLines } from './ingredientParser.js';
import { extractJsonLdBlocks, extractRecipeMicrodata } from './microdata.js';

/** The draft handed back to the user for review; mirrors RecipeInput. */
export type RecipeDraft = {
  title: string;
  description?: string;
  ingredients: { name: string; amount: number; unit: string }[];
  instructions: string[];
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  tags?: string[];
  videoUrl?: string;
  sourceUrl: string;
};

const MAX_TAGS = 8;
const MAX_INGREDIENTS = 100;
const MAX_INSTRUCTIONS = 100;
const MAX_TEXT = 2000;

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name: string) => ENTITIES[name.toLowerCase()] ?? match);
}

/** Recipe text frequently arrives as HTML fragments; keep only the words. */
function toText(value: unknown): string {
  if (typeof value === 'number') return String(value);
  if (typeof value !== 'string') return '';
  return decodeEntities(value.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_TEXT);
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  return value === undefined || value === null ? [] : [value];
}

/** Schema.org `@type` may be a string or an array. */
function hasType(node: Record<string, unknown>, type: string): boolean {
  return asArray(node['@type']).some(
    (t) => typeof t === 'string' && t.toLowerCase() === type.toLowerCase()
  );
}

/** Walks JSON-LD (including `@graph` and nested arrays) for the first Recipe node. */
function findRecipeNode(value: unknown, depth = 0): Record<string, unknown> | null {
  if (depth > 6 || value === null || typeof value !== 'object') return null;

  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = findRecipeNode(entry, depth + 1);
      if (found) return found;
    }
    return null;
  }

  const node = value as Record<string, unknown>;
  if (hasType(node, 'Recipe')) return node;

  for (const key of ['@graph', 'mainEntity', 'mainEntityOfPage', 'itemListElement']) {
    const found = findRecipeNode(node[key], depth + 1);
    if (found) return found;
  }

  return null;
}

/** "PT1H30M" -> 90 minutes. Also tolerates plain numbers. */
function isoDurationToMinutes(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
  if (typeof value !== 'string') return undefined;

  const match = value.trim().match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:\d+S)?)?$/i);
  if (!match) {
    const plain = Number(value.trim());
    return Number.isFinite(plain) && plain > 0 ? Math.round(plain) : undefined;
  }

  const minutes =
    Number(match[1] ?? 0) * 24 * 60 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0);
  return minutes > 0 ? minutes : undefined;
}

function parseServings(value: unknown): number | undefined {
  for (const entry of asArray(value)) {
    const text = toText(entry);
    const match = text.match(/\d+/);
    if (match) {
      const servings = Number(match[0]);
      if (servings > 0 && servings <= 1000) return servings;
    }
  }
  return undefined;
}

/** Flattens HowToStep / HowToSection / plain strings into a list of steps. */
function parseInstructions(value: unknown, depth = 0): string[] {
  if (depth > 4) return [];

  const steps: string[] = [];
  for (const entry of asArray(value)) {
    if (typeof entry === 'string') {
      // A single blob is often newline-separated steps, so split before collapsing space.
      steps.push(...entry.split(/\n+/).map((part) => toText(part)).filter(Boolean));
      continue;
    }

    if (entry && typeof entry === 'object') {
      const node = entry as Record<string, unknown>;
      if (node.itemListElement) {
        steps.push(...parseInstructions(node.itemListElement, depth + 1));
        continue;
      }
      const text = toText(node.text ?? node.name ?? node.description);
      if (text) steps.push(text);
    }
  }

  return steps.filter((step) => step !== '').slice(0, MAX_INSTRUCTIONS);
}

function collectTags(values: unknown[]): string[] {
  const tags = new Set<string>();
  for (const entry of values) {
    for (const part of toText(entry).split(',')) {
      const tag = part.trim();
      if (tag && tag.length <= 40) tags.add(tag);
      if (tags.size >= MAX_TAGS) break;
    }
    if (tags.size >= MAX_TAGS) break;
  }
  return [...tags];
}

/** Only YouTube links survive; anything else is dropped by the recipe normalizer. */
function parseVideoUrl(value: unknown): string | undefined {
  for (const entry of asArray(value)) {
    if (!entry || typeof entry !== 'object') continue;
    const node = entry as Record<string, unknown>;
    for (const key of ['embedUrl', 'contentUrl', 'url']) {
      const candidate = typeof node[key] === 'string' ? (node[key] as string).trim() : '';
      if (/youtube\.com|youtu\.be/i.test(candidate)) return candidate;
    }
  }
  return undefined;
}

/** Shared tail of both extractors: a total-only time still has to add up correctly. */
function buildDraft(parts: {
  title: string;
  description?: string;
  ingredientLines: string[];
  instructions: string[];
  prepTime?: number;
  cookTime?: number;
  totalTime?: number;
  servings?: number;
  tags: string[];
  videoUrl?: string;
  sourceUrl: string;
}): RecipeDraft | null {
  const ingredients = parseIngredientLines(parts.ingredientLines.slice(0, MAX_INGREDIENTS));
  // A title alone is not a recipe; returning null lets the next extractor try the page.
  if (ingredients.length === 0 && parts.instructions.length === 0) return null;

  return {
    title: parts.title,
    description: parts.description || undefined,
    ingredients,
    instructions: parts.instructions,
    prepTime: parts.prepTime,
    // Only a total time was published: record it as cook time so the totals still add up.
    cookTime: parts.cookTime ?? (parts.prepTime === undefined ? parts.totalTime : undefined),
    servings: parts.servings,
    tags: parts.tags.length > 0 ? parts.tags : undefined,
    videoUrl: parts.videoUrl,
    sourceUrl: parts.sourceUrl,
  };
}

function draftFromJsonLd(html: string, sourceUrl: string): RecipeDraft | null {
  let node: Record<string, unknown> | null = null;
  for (const block of extractJsonLdBlocks(html)) {
    node = findRecipeNode(block);
    if (node) break;
  }
  if (!node) return null;

  const title = toText(node.name ?? node.headline);
  if (!title) return null;

  return buildDraft({
    title,
    description: toText(node.description),
    ingredientLines: [...asArray(node.recipeIngredient), ...asArray(node.ingredients)]
      .map((entry) => toText(entry))
      .filter((line) => line !== ''),
    instructions: parseInstructions(node.recipeInstructions),
    prepTime: isoDurationToMinutes(node.prepTime),
    cookTime: isoDurationToMinutes(node.cookTime),
    totalTime: isoDurationToMinutes(node.totalTime),
    servings: parseServings(node.recipeYield),
    tags: collectTags([
      ...asArray(node.recipeCategory),
      ...asArray(node.recipeCuisine),
      ...asArray(node.keywords),
    ]),
    videoUrl: parseVideoUrl(node.video),
    sourceUrl,
  });
}

function draftFromMicrodata(html: string, sourceUrl: string): RecipeDraft | null {
  const props = extractRecipeMicrodata(html);
  if (!props) return null;

  const first = (key: string) => props[key]?.[0];
  const title = toText(first('name'));
  if (!title) return null;

  const rawSteps = props.recipeInstructions ?? [];
  const ingredientLines = (props.recipeIngredient ?? props.ingredients ?? [])
    .map((entry) => toText(entry))
    .filter((line) => line !== '');

  const instructions =
    rawSteps.length === 1
      ? parseInstructions(rawSteps[0])
      : rawSteps.map((step) => toText(step)).filter(Boolean).slice(0, MAX_INSTRUCTIONS);

  // Sites that tag a whole article as `recipeInstructions` repeat the ingredient list
  // inside it; drop those lines so the steps stay readable.
  const ingredientSet = new Set(ingredientLines.map((line) => line.toLowerCase()));

  return buildDraft({
    title,
    description: toText(first('description')),
    ingredientLines,
    instructions: instructions.filter((step) => !ingredientSet.has(step.toLowerCase())),
    prepTime: isoDurationToMinutes(first('prepTime')),
    cookTime: isoDurationToMinutes(first('cookTime')),
    totalTime: isoDurationToMinutes(first('totalTime')),
    servings: parseServings(props.recipeYield),
    tags: collectTags([
      ...(props.recipeCategory ?? []),
      ...(props.recipeCuisine ?? []),
      ...(props.keywords ?? []),
    ]),
    sourceUrl,
  });
}

/** Falls back to the page's own markup for sites that publish no structured data. */
function draftFromMarkup(html: string, sourceUrl: string): RecipeDraft | null {
  const found = extractRecipeFromMarkup(html);
  if (!found) return null;

  return buildDraft({
    title: found.title,
    description: found.description,
    ingredientLines: found.ingredientLines,
    instructions: found.instructions.slice(0, MAX_INSTRUCTIONS),
    servings: found.servings,
    tags: [],
    sourceUrl,
  });
}

/**
 * Maps a page to our draft shape, preferring JSON-LD, then microdata, then the page's
 * own markup. Returns null when none of them yield a recipe - the point where an AI
 * extractor would be plugged in.
 */
export function extractRecipeDraft(html: string, sourceUrl: string): RecipeDraft | null {
  return (
    draftFromJsonLd(html, sourceUrl) ??
    draftFromMicrodata(html, sourceUrl) ??
    draftFromMarkup(html, sourceUrl)
  );
}

/** Thrown when a page simply has no machine-readable recipe on it. */
export function noRecipeFound(): ImportError {
  return new ImportError('No recipe was found on that page', 422, 'no_recipe_found');
}
