# Copilot instructions for My Recipe Book

## Keep the feature documentation up to date

**Whenever a feature is added, changed or removed, the feature list must be updated in the same
change.** This is a hard requirement — a feature change is not complete until both places below
are updated:

1. **`features.md`** (repository root) — the developer-facing list, grouped by area, with a
   pointer to the files that implement the feature. Keep the API endpoint table current too.
2. **`frontend/src/app/features/content.ts`** — the user-facing Features page shown at
   `/features`. Describe the feature in plain language, from the user's point of view, and
   **update both the `en` and `pl` lists** so the page stays fully translated.

Checklist for any feature work:

- [ ] `features.md` describes the new or changed behaviour (and no longer mentions removed behaviour).
- [ ] `frontend/src/app/features/content.ts` is updated in **both** `en` and `pl`.
- [ ] New API endpoints appear in the endpoint table in `features.md`.
- [ ] New user-visible strings are added to **both** locales in `frontend/src/i18n/translations.ts`.

## Changing the recipe or ingredient model means changing the import layer

The recipe import pipeline in `backend/src/recipeImport/` builds recipes from other websites,
so it is a second producer of the same data model as the forms. **Whenever a recipe or
ingredient field is added, renamed or removed — for example adding a thumbnail/photo to an
ingredient row — the extractor layer must be updated in the same change**, otherwise imported
recipes silently miss the new field.

What to go through:

- [ ] `backend/src/recipeImport/extract.ts` — map the field in **all** tiers (JSON-LD, microdata
      and the markup heuristics) and in the shared `buildDraft()`; extend `RecipeDraft`.
- [ ] `backend/src/recipeImport/ingredientParser.ts` — update `ParsedIngredient` and the parsing
      when the change concerns an ingredient field.
- [ ] `backend/src/routes/recipes.ts` — `normalizeRecipeInput`/`RecipeInput`, the SQL statements
      and `loadRecipeDetail` so the field is validated, stored and returned.
- [ ] `frontend/src/lib/importDraft.ts` and `ImportFromUrlDialog` — the draft handed to the add
      page carries the new field.
- [ ] `frontend/src/lib/recipeExport.ts` — the JSON export/import format is the third producer of
      the model and has to stay in sync as well.

## Other conventions

- The browser never calls the Express backend directly: add a Next.js route handler under
  `frontend/src/app/api/` that forwards the request with `recipesProxyHeaders(userId)`.
- Every backend route resolves the user with `requireRecipeUser` and scopes its queries to that
  user id; legacy rows with a `NULL`/empty `user_id` stay visible.
- Use parameterized SQL statements and validate/normalize untrusted input before writing.
- Validate changes with `npx tsc --noEmit` and `npx next lint` in `frontend/`, and
  `npx tsc --noEmit` in `backend/`.
