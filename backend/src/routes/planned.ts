import { Router } from 'express';
import type { Database } from 'better-sqlite3';
import { getDatabase, isDbAvailable } from '../database.js';
import { requireRecipeUser } from '../recipeAuth.js';
import { toRecipeSummaries, type RecipeRow } from './recipes.js';

const router = Router();

function generatePlanId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/** Legacy rows (NULL / empty user_id) stay visible, as everywhere else. */
function findOwnedRecipeId(db: Database, id: string, userId: string): string | null {
  const row = db
    .prepare(
      `SELECT id FROM recipes
       WHERE id = ?
         AND (user_id = ? OR user_id IS NULL OR user_id = '')`
    )
    .get(id, userId) as { id: string } | undefined;
  return row?.id ?? null;
}

function loadPlanned(db: Database, userId: string) {
  const recipes = db
    .prepare(
      `SELECT r.* FROM planned_recipes p
       JOIN recipes r ON r.id = p.recipe_id
       WHERE p.user_id = ?
         AND (r.user_id = ? OR r.user_id IS NULL OR r.user_id = '')
       ORDER BY p.created_at DESC`
    )
    .all(userId, userId) as RecipeRow[];

  return toRecipeSummaries(db, recipes);
}

/** GET returns the planned recipes in the same shape as the recipe list. */
router.get('/', (req, res) => {
  if (!isDbAvailable()) {
    return res.status(503).json({ success: false, error: 'Database unavailable' });
  }

  const userId = requireRecipeUser(req, res);
  if (!userId) return;

  const db = getDatabase() as Database;
  return res.json({ success: true, data: loadPlanned(db, userId) });
});

/** POST marks a recipe as planned; planning it twice is a no-op. */
router.post('/', (req, res) => {
  if (!isDbAvailable()) {
    return res.status(503).json({ success: false, error: 'Database unavailable' });
  }

  const userId = requireRecipeUser(req, res);
  if (!userId) return;

  const recipeId =
    typeof req.body?.recipeId === 'string' ? req.body.recipeId.trim() : '';
  if (!recipeId) {
    return res.status(400).json({ success: false, error: 'Missing recipe id' });
  }

  const db = getDatabase() as Database;
  if (!findOwnedRecipeId(db, recipeId, userId)) {
    return res.status(404).json({ success: false, error: 'Recipe not found' });
  }

  db.prepare(
    `INSERT OR IGNORE INTO planned_recipes (id, user_id, recipe_id, created_at)
     VALUES (?, ?, ?, ?)`
  ).run(generatePlanId(), userId, recipeId, new Date().toISOString());

  return res.status(201).json({ success: true, data: loadPlanned(db, userId) });
});

/** DELETE takes the recipe id, so callers never need to know the plan row id. */
router.delete('/:recipeId', (req, res) => {
  if (!isDbAvailable()) {
    return res.status(503).json({ success: false, error: 'Database unavailable' });
  }

  const userId = requireRecipeUser(req, res);
  if (!userId) return;

  const recipeId = typeof req.params.recipeId === 'string' ? req.params.recipeId.trim() : '';
  if (!recipeId) {
    return res.status(400).json({ success: false, error: 'Missing recipe id' });
  }

  const db = getDatabase() as Database;
  const result = db
    .prepare(`DELETE FROM planned_recipes WHERE user_id = ? AND recipe_id = ?`)
    .run(userId, recipeId);

  if (result.changes === 0) {
    return res.status(404).json({ success: false, error: 'Recipe is not planned' });
  }

  return res.json({ success: true, data: loadPlanned(db, userId) });
});

export default router;
