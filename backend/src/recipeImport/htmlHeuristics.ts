import * as cheerio from 'cheerio';
import type { CheerioAPI } from 'cheerio';
import type { Element } from 'domhandler';
import { blockText } from './microdata.js';

/**
 * Last deterministic tier: read the page's own markup when it publishes no JSON-LD and
 * no usable microdata. Recipe CMSes (Drupal, WordPress recipe plugins, most blogs) name
 * their containers predictably, so matching on class/id names covers many sites without
 * hardcoding a single domain.
 */

const INGREDIENT_SELECTOR = [
  '[class*="skladnik" i]',
  '[class*="składnik" i]',
  '[class*="ingredient" i]',
  '[id*="skladnik" i]',
  '[id*="ingredient" i]',
].join(',');

const INSTRUCTION_SELECTOR = [
  '[class*="przygotowanie" i]',
  '[class*="wykonanie" i]',
  '[class*="przyrzadzenie" i]',
  '[class*="instruction" i]',
  '[class*="direction" i]',
  '[class*="preparation" i]',
  '[class*="method" i]',
  '[id*="przygotowanie" i]',
  '[id*="instruction" i]',
].join(',');

const MAX_LINE_LENGTH = 400;

/**
 * Several nested containers usually match (a wrapper and the field inside it); the one
 * holding the most lines is the actual list.
 */
function bestLines($: CheerioAPI, selector: string, maxLineLength: number): string[] {
  let best: string[] = [];

  $(selector).each((_, el) => {
    const lines = blockText($, $(el as Element))
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line !== '' && line.length <= maxLineLength);

    if (lines.length > best.length) best = lines;
  });

  return best;
}

function metaContent($: CheerioAPI, names: string[]): string {
  for (const name of names) {
    const value = $(`meta[property="${name}"], meta[name="${name}"]`).attr('content');
    if (value?.trim()) return value.trim();
  }
  return '';
}

function readServings(text: string): number | undefined {
  const match = text.match(/(\d{1,3})\s*(?:porcj\w*|servings?|serves)/i);
  if (!match) return undefined;

  const servings = Number(match[1]);
  return servings > 0 && servings <= 100 ? servings : undefined;
}

export type HeuristicRecipe = {
  title: string;
  description: string;
  ingredientLines: string[];
  instructions: string[];
  servings?: number;
};

/** Returns null unless both a title and an ingredient list could be found. */
export function extractRecipeFromMarkup(html: string): HeuristicRecipe | null {
  const $ = cheerio.load(html);

  const title =
    $('h1').first().text().replace(/\s+/g, ' ').trim() ||
    metaContent($, ['og:title', 'twitter:title']);
  if (!title) return null;

  const ingredientLines = bestLines($, INGREDIENT_SELECTOR, 200);
  if (ingredientLines.length === 0) return null;

  return {
    title,
    description: metaContent($, ['og:description', 'description']),
    ingredientLines,
    instructions: bestLines($, INSTRUCTION_SELECTOR, MAX_LINE_LENGTH * 4),
    servings: readServings($('body').text()),
  };
}
