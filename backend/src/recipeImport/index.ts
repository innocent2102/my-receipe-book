import { fetchPage, ImportError } from './fetchPage.js';
import { extractRecipeDraft, noRecipeFound, type RecipeDraft } from './extract.js';

export { ImportError } from './fetchPage.js';
export type { RecipeDraft } from './extract.js';

/**
 * Downloads a recipe page and converts it into a draft for the user to review.
 *
 * Today the conversion is purely deterministic (schema.org JSON-LD or microdata,
 * plus an ingredient parser). Pages without structured data fail with
 * `no_recipe_found`; that is the single place where an AI extractor would be added.
 */
export async function importRecipeFromUrl(url: string): Promise<RecipeDraft> {
  const page = await fetchPage(url);
  const draft = extractRecipeDraft(page.html, page.url);

  if (!draft) throw noRecipeFound();
  if (draft.ingredients.length === 0 && draft.instructions.length === 0) {
    throw noRecipeFound();
  }

  return draft;
}

export function isImportError(error: unknown): error is ImportError {
  return error instanceof ImportError;
}
