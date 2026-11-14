# Features

A complete list of what **My Recipe Book** can do today, grouped by area. Paths point at the
implementation so the list is easy to keep up to date.

> **Keeping this current:** whenever a feature is added, changed or removed, update this file
> **and** the in-app Features page content in `frontend/src/app/features/content.ts` (both the
> `en` and `pl` lists). See `.github/copilot-instructions.md`.

## Accounts & access

- **Google sign-in** via NextAuth — the only provider; it is registered only when
  `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` are set (`frontend/src/lib/auth.ts`).
- **Helpful setup messages** on the login screen when OAuth is not configured yet
  (`frontend/src/app/login/page.tsx`, see `frontend/GOOGLE_OAUTH_SETUP.md`).
- **Per-user data isolation** — recipes, planned recipes, shopping list and ingredient
  suggestions are all scoped to the signed-in user id (OAuth `sub`).
- **Protected pages** — unauthenticated visitors are redirected to `/login` with a
  `callbackUrl`, and the root page routes straight to recipes or login
  (`frontend/src/app/page.tsx`).
- **Trusted proxy boundary** — the browser never calls the Express API directly. Next.js route
  handlers forward requests with the session user id and an optional shared secret
  (`RECIPES_PROXY_SECRET`) that the backend verifies (`backend/src/recipeAuth.ts`).
- **User menu** with avatar and sign-out (`frontend/src/components/UserMenu.tsx`).

## Recipes

- **Recipe list** with title, description, ingredient summary and chips for prep time, cook
  time, servings and tags (`frontend/src/app/recipes/page.tsx`).
- **Search** across title, description, ingredient names and tags. Multiple words narrow the
  results (all terms must match), with a live result count, a clear button and a dedicated
  "no matching recipes" state.
- **Recipe detail view** with ingredients, numbered instructions, time/servings chips and tags
  (`frontend/src/app/recipes/[id]/page.tsx`). Sections with no content are hidden rather than
  showing an empty placeholder.
- **Add a recipe** — title, description, prep/cook time, servings, ingredients, step-by-step
  instructions, tags and an optional video link (`frontend/src/app/recipes/add/page.tsx`).
- **Edit a recipe** — the same form pre-filled with the current values
  (`frontend/src/app/recipes/[id]/edit/page.tsx`, shared `frontend/src/components/RecipeForm.tsx`).
- **Delete a recipe** with a confirmation dialog that names the recipe.
- **Empty state** that offers both "create your first recipe" and "import from file".

## Ingredients & autocomplete

- **Per-user ingredient catalog** — every ingredient name you save is remembered
  (`backend/src/ingredientCatalog.ts`, table `ingredient_catalog`).
- **Autocomplete when adding ingredients** — pick a known ingredient or simply type a new one;
  new names are stored immediately and appear in later suggestions.
- **Case- and whitespace-insensitive de-duplication**, so `Olive Oil` and `olive oil` stay a
  single entry; the original spelling is kept.
- **Names are also captured** from saved recipes, imported recipes and manually added shopping
  list items.
- **Remove a suggestion** you no longer want from the autocomplete list.
- **Search endpoint** (`GET /api/ingredients?q=`) for filtered lookups.

## Video

- **Optional YouTube link per recipe**, validated on input and embedded in the recipe detail
  page with a live preview in the form (`frontend/src/lib/youtube.ts`).

## Shopping list

- **One shopping list per user**, created automatically on first use
  (`backend/src/routes/grocery.ts`, `frontend/src/app/grocery/page.tsx`).
- **Add ingredients straight from a recipe** through a picker dialog where you select only the
  items you still need (`frontend/src/components/AddToGroceryDialog.tsx`).
- **Add items manually**, with ingredient autocomplete.
- **Automatic merging** — the same ingredient in the same unit becomes one line with summed
  amounts, and re-adding something already ticked off puts it back on the list.
- **Tick items off**, mark/unmark everything at once, remove a single item, or clear all
  checked items.
- **Sensible ordering** — unchecked items first, then alphabetically.

## Planned recipes

- **Mark a recipe as planned** from the list or detail view, and unplan it again
  (`backend/src/routes/planned.ts`, `frontend/src/app/planned/page.tsx`).
- **Planned page** showing everything you intend to cook soon, newest first, in the same layout
  as the recipe list, with its own empty state.

## Import & export

- **Export all recipes** to a portable JSON file with a date-stamped filename
  (`frontend/src/lib/recipeExport.ts`).
- **Portable format** — ids, ownership and timestamps are stripped so a file can be imported
  into any account.
- **Import from file** with validation: invalid JSON is reported, recipes without a title are
  skipped and counted, and up to 500 recipes can be imported at once. The import is
  all-or-nothing inside a single transaction.
- **Result summary** telling you how many recipes were imported and skipped.

## Offline support (PWA)

- **Installable PWA** with service worker and runtime caching (`frontend/next.config.js`,
  `frontend/public/manifest.json`).
- **Cached session** so losing connection does not bounce you to the login page.
- **Offline copies** of the recipe list, individual recipes, planned recipes and the shopping
  list, kept in `localStorage` (`frontend/src/lib/offlineStore.ts`).
- **Offline shopping-list edits** — additions, toggles and removals are applied locally and
  queued, then replayed in order once you are back online, with ids created offline translated
  to the real server ids (`frontend/src/lib/groceryOffline.ts`).
- **Offline indicator** showing connection state and how many changes are still waiting to sync
  (`frontend/src/components/OfflineIndicator.tsx`).
- **Defensive storage** — private mode, full quota or corrupted JSON degrade to "no offline
  copy" instead of breaking a page.

## Interface

- **Polish and English** throughout, with correct plural forms via `Intl.PluralRules`; the
  language is auto-detected from the browser and remembered in `localStorage`
  (`frontend/src/i18n/`).
- **Light and dark theme** built on `next-themes` — follows the system preference by default and
  remembers your manual choice (`frontend/src/components/ThemeToggle.tsx`,
  `frontend/src/theme/theme.ts`).
- **Material UI** components with responsive layouts, loading spinners, inline error alerts and
  accessible labels on icon buttons.
- **In-app Features page** at `/features` describing everything the app can do, in both
  languages, reachable from the user menu and from the login screen
  (`frontend/src/app/features/`).

## API

All backend routes require the proxy headers and operate on the current user only.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Service and database status |
| GET | `/api/recipes` | List the user's recipes |
| GET | `/api/recipes/:id` | Fetch one recipe |
| POST | `/api/recipes` | Create a recipe |
| PUT | `/api/recipes/:id` | Update a recipe |
| DELETE | `/api/recipes/:id` | Delete a recipe |
| POST | `/api/recipes/import` | Bulk import (max 500, transactional) |
| GET | `/api/ingredients` | Known ingredient names, optional `q` filter |
| POST | `/api/ingredients` | Remember a new ingredient name |
| DELETE | `/api/ingredients` | Forget an ingredient name |
| GET | `/api/grocery` | The user's shopping list |
| POST | `/api/grocery/items` | Add items (merging duplicates) |
| PATCH | `/api/grocery/items/:id` | Check / uncheck an item |
| DELETE | `/api/grocery/items/:id` | Remove an item |
| DELETE | `/api/grocery/checked` | Clear all checked items |
| GET | `/api/planned` | List planned recipes |
| POST | `/api/planned` | Mark a recipe as planned |
| DELETE | `/api/planned/:recipeId` | Remove a recipe from planned |

The matching Next.js proxy routes live in `frontend/src/app/api/`.

## Data & resilience

- **SQLite storage** with foreign keys enabled and tables created/migrated on startup:
  `recipes`, `ingredients`, `instructions`, `ingredient_catalog`, `grocery_lists`,
  `grocery_items`, `planned_recipes`, `meal_plans` (`backend/src/database.ts`).
- **Graceful degradation** — if `better-sqlite3` cannot be loaded, the server still starts and
  database-backed endpoints return `503` with a clear message instead of crashing.
- **Legacy rows** without a `user_id` stay readable and deletable.
- **Input validation and normalization** on every write, with parameterized statements
  throughout.
- **Shared types** between frontend and backend (`shared/src/types`).
