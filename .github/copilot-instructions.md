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

## Other conventions

- The browser never calls the Express backend directly: add a Next.js route handler under
  `frontend/src/app/api/` that forwards the request with `recipesProxyHeaders(userId)`.
- Every backend route resolves the user with `requireRecipeUser` and scopes its queries to that
  user id; legacy rows with a `NULL`/empty `user_id` stay visible.
- Use parameterized SQL statements and validate/normalize untrusted input before writing.
- Validate changes with `npx tsc --noEmit` and `npx next lint` in `frontend/`, and
  `npx tsc --noEmit` in `backend/`.
