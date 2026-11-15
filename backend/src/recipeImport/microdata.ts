import * as cheerio from 'cheerio';
import type { Cheerio, CheerioAPI } from 'cheerio';
import type { Element } from 'domhandler';

/**
 * Schema.org microdata reader. Several large recipe sites (notably Polish ones)
 * publish `itemprop` markup instead of JSON-LD, so this is a first-class source
 * rather than a fallback hack.
 */

const VALUE_ATTRIBUTES: Record<string, string> = {
  meta: 'content',
  time: 'datetime',
  link: 'href',
  a: 'href',
  img: 'src',
  data: 'value',
};

function propertyValue($: CheerioAPI, el: Element): string {
  const node = $(el);
  const tag = el.tagName?.toLowerCase() ?? '';

  const attribute = VALUE_ATTRIBUTES[tag];
  if (attribute) {
    const value = node.attr(attribute);
    if (value) return value.trim();
  }

  // `content` is also valid on ordinary elements.
  const content = node.attr('content');
  if (content) return content.trim();

  return blockText($, node);
}

/**
 * Reads an element's text while keeping block boundaries as newlines. Sites often mark
 * a whole article as `recipeInstructions`, so individual paragraphs and list items have
 * to stay separate to become usable steps.
 */
export function blockText($: CheerioAPI, node: Cheerio<Element>): string {
  const clone = node.clone();
  clone.find('script, style, noscript, iframe, ins, figure, .adsbygoogle').remove();
  clone.find('br').replaceWith('\n');

  const blocks: string[] = [];
  clone.find('p, li').each((_, block) => {
    // Skip wrappers; only the innermost blocks carry the actual text.
    if ($(block).find('p, li').length > 0) return;
    const text = $(block).text();
    if (text.trim()) blocks.push(text);
  });

  const text = blocks.length > 0 ? blocks.join('\n') : clone.text();
  return text
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line !== '')
    .join('\n');
}

/** Collects `itemprop` values that belong to this scope, skipping nested item scopes. */
function readScope($: CheerioAPI, scope: Cheerio<Element>): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  scope.find('[itemprop]').each((_, el) => {
    // Ignore properties owned by a nested itemscope (e.g. nutrition, author).
    const owner = $(el).parentsUntil(scope).filter('[itemscope]').first();
    if (owner.length > 0) return;

    const names = ($(el).attr('itemprop') ?? '').split(/\s+/).filter(Boolean);
    const value = propertyValue($, el);
    if (!value) return;

    for (const name of names) {
      (result[name] ??= []).push(value);
    }
  });

  return result;
}

/** Returns the Recipe scope's properties, or null when the page has no Recipe item. */
export function extractRecipeMicrodata(html: string): Record<string, string[]> | null {
  const $ = cheerio.load(html);
  const scope = $('[itemscope][itemtype*="Recipe" i]').first();
  if (scope.length === 0) return null;

  const props = readScope($, scope);
  return Object.keys(props).length > 0 ? props : null;
}

/** Pulls `application/ld+json` payloads out of a document. */
export function extractJsonLdBlocks(html: string): unknown[] {
  const $ = cheerio.load(html);
  const blocks: unknown[] = [];

  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).text().trim().replace(/^<!\[CDATA\[|\]\]>$/g, '');
    if (!raw) return;
    try {
      blocks.push(JSON.parse(raw));
    } catch {
      // Some sites emit slightly invalid JSON-LD; skip it rather than failing the import.
    }
  });

  return blocks;
}
