import { Router } from 'express';
import type { Database } from 'better-sqlite3';
import { getDatabase, isDbAvailable } from '../database.js';
import { requireRecipeUser } from '../recipeAuth.js';
import { toRecipeSummaries, type RecipeRow } from './recipes.js';

const router = Router();

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

type MealPlanRow = {
  id: string;
  user_id: string;
  recipe_id: string;
  date: string;
  time: string | null;
  created_at: string;
};

function generatePlanId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function isValidDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  // Rejects things like 2026-02-31, which the pattern alone lets through.
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
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

/**
 * Entries for a date range, each carrying the full recipe summary so the planner
 * can show thumbnails and push ingredients to the shopping list without extra calls.
 */
function loadRange(db: Database, userId: string, from: string, to: string) {
  const plans = db
    .prepare(
      `SELECT * FROM meal_plans
       WHERE user_id = ? AND date >= ? AND date <= ?
       ORDER BY date, COALESCE(time, '99:99'), created_at`
    )
    .all(userId, from, to) as MealPlanRow[];

  if (plans.length === 0) return [];

  const recipeIds = [...new Set(plans.map((plan) => plan.recipe_id))];
  const placeholders = recipeIds.map(() => '?').join(',');
  const recipes = db
    .prepare(
      `SELECT * FROM recipes
       WHERE id IN (${placeholders})
         AND (user_id = ? OR user_id IS NULL OR user_id = '')`
    )
    .all(...recipeIds, userId) as RecipeRow[];

  const summaries = new Map(
    toRecipeSummaries(db, recipes).map((summary) => [summary.id, summary])
  );

  return plans
    .map((plan) => {
      const recipe = summaries.get(plan.recipe_id);
      if (!recipe) return null;
      return {
        id: plan.id,
        date: plan.date,
        time: plan.time ?? undefined,
        recipe,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
}

/** GET `?from=&to=` returns every entry in an inclusive date range. */
router.get('/', (req, res) => {
  if (!isDbAvailable()) {
    return res.status(503).json({ success: false, error: 'Database unavailable' });
  }

  const userId = requireRecipeUser(req, res);
  if (!userId) return;

  const from = typeof req.query.from === 'string' ? req.query.from.trim() : '';
  const to = typeof req.query.to === 'string' ? req.query.to.trim() : '';
  if (!isValidDate(from) || !isValidDate(to) || from > to) {
    return res.status(400).json({ success: false, error: 'Invalid date range' });
  }

  const db = getDatabase() as Database;
  return res.json({ success: true, data: loadRange(db, userId, from, to) });
});

/** POST `{ recipeId, date, time? }` puts a recipe on a day. */
router.post('/', (req, res) => {
  if (!isDbAvailable()) {
    return res.status(503).json({ success: false, error: 'Database unavailable' });
  }

  const userId = requireRecipeUser(req, res);
  if (!userId) return;

  const recipeId = typeof req.body?.recipeId === 'string' ? req.body.recipeId.trim() : '';
  const date = typeof req.body?.date === 'string' ? req.body.date.trim() : '';
  const time = typeof req.body?.time === 'string' ? req.body.time.trim() : '';

  if (!recipeId) {
    return res.status(400).json({ success: false, error: 'Missing recipe id' });
  }
  if (!isValidDate(date)) {
    return res.status(400).json({ success: false, error: 'Invalid date' });
  }
  if (time && !TIME_PATTERN.test(time)) {
    return res.status(400).json({ success: false, error: 'Invalid time' });
  }

  const db = getDatabase() as Database;
  if (!findOwnedRecipeId(db, recipeId, userId)) {
    return res.status(404).json({ success: false, error: 'Recipe not found' });
  }

  const id = generatePlanId();
  db.prepare(
    `INSERT INTO meal_plans (id, user_id, recipe_id, date, time, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, userId, recipeId, date, time || null, new Date().toISOString());

  return res.status(201).json({ success: true, data: { id } });
});

/** PUT `/:id` moves an entry to another day or time. */
router.put('/:id', (req, res) => {
  if (!isDbAvailable()) {
    return res.status(503).json({ success: false, error: 'Database unavailable' });
  }

  const userId = requireRecipeUser(req, res);
  if (!userId) return;

  const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
  if (!id) {
    return res.status(400).json({ success: false, error: 'Missing plan id' });
  }

  const db = getDatabase() as Database;
  const existing = db
    .prepare(`SELECT * FROM meal_plans WHERE id = ? AND user_id = ?`)
    .get(id, userId) as MealPlanRow | undefined;
  if (!existing) {
    return res.status(404).json({ success: false, error: 'Plan entry not found' });
  }

  const date = typeof req.body?.date === 'string' ? req.body.date.trim() : undefined;
  const hasTime = 'time' in (req.body ?? {});
  const time = typeof req.body?.time === 'string' ? req.body.time.trim() : '';

  if (date !== undefined && !isValidDate(date)) {
    return res.status(400).json({ success: false, error: 'Invalid date' });
  }
  if (hasTime && time && !TIME_PATTERN.test(time)) {
    return res.status(400).json({ success: false, error: 'Invalid time' });
  }

  db.prepare(`UPDATE meal_plans SET date = ?, time = ? WHERE id = ? AND user_id = ?`).run(
    date ?? existing.date,
    hasTime ? time || null : existing.time,
    id,
    userId
  );

  return res.json({ success: true, data: { id } });
});

/** DELETE `/:id` removes an entry from the plan. */
router.delete('/:id', (req, res) => {
  if (!isDbAvailable()) {
    return res.status(503).json({ success: false, error: 'Database unavailable' });
  }

  const userId = requireRecipeUser(req, res);
  if (!userId) return;

  const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
  if (!id) {
    return res.status(400).json({ success: false, error: 'Missing plan id' });
  }

  const db = getDatabase() as Database;
  const result = db
    .prepare(`DELETE FROM meal_plans WHERE id = ? AND user_id = ?`)
    .run(id, userId);

  if (result.changes === 0) {
    return res.status(404).json({ success: false, error: 'Plan entry not found' });
  }

  return res.json({ success: true, data: { id } });
});

export default router;
