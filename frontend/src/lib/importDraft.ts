import type { RecipeFormValues } from '../components/RecipeForm';

/** A recipe parsed from a website, waiting for the user to review it on the add page. */
export type ImportedRecipeDraft = RecipeFormValues & { sourceUrl?: string };

const DRAFT_KEY = 'recipe-book.importDraft';

/** Session storage keeps the draft out of the URL and clears it when the tab closes. */
export function saveImportDraft(draft: ImportedRecipeDraft): void {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Private-mode quota errors just mean the add page opens empty.
  }
}

/** Reads the draft once; a reload of the add page should start from a clean form. */
export function takeImportDraft(): ImportedRecipeDraft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    sessionStorage.removeItem(DRAFT_KEY);
    if (!raw) return null;

    const draft = JSON.parse(raw) as ImportedRecipeDraft;
    return typeof draft?.title === 'string' ? draft : null;
  } catch {
    return null;
  }
}
