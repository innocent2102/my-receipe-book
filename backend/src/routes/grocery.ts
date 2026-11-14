import { Router } from 'express';
import type { Database } from 'better-sqlite3';
import { getDatabase, isDbAvailable } from '../database.js';
import { requireRecipeUser } from '../recipeAuth.js';
import { ingredientNameKey, rememberIngredientNames } from '../ingredientCatalog.js';

const router = Router();

const DEFAULT_LIST_NAME = 'My shopping list';
const MAX_ITEMS_PER_REQUEST = 200;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

type GroceryItemRow = {
  id: string;
  grocery_list_id: string;
  name: string;
  amount: number;
  unit: string;
  checked: number;
  recipe_id: string | null;
  created_at: string | null;
};

type NormalizedItem = {
  name: string;
  amount: number;
  unit: string;
  recipeId: string | null;
};

/** Every user has exactly one list in the MVP; it is created on first use. */
function getOrCreateListId(db: Database, userId: string): string {
  const existing = db
    .prepare('SELECT id FROM grocery_lists WHERE user_id = ? ORDER BY created_at LIMIT 1')
    .get(userId) as { id: string } | undefined;
  if (existing) return existing.id;

  const id = generateId();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO grocery_lists (id, name, user_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, DEFAULT_LIST_NAME, userId, now, now);

  return id;
}

function touchList(db: Database, listId: string): void {
  db.prepare('UPDATE grocery_lists SET updated_at = ? WHERE id = ?').run(
    new Date().toISOString(),
    listId
  );
}

function toOptionalNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function normalizeItems(raw: unknown): NormalizedItem[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map((item) => ({
      name: typeof item.name === 'string' ? item.name.trim().replace(/\s+/g, ' ') : '',
      amount: toOptionalNumber(item.amount) ?? 0,
      unit: typeof item.unit === 'string' ? item.unit.trim() : '',
      recipeId: typeof item.recipeId === 'string' && item.recipeId.trim() ? item.recipeId.trim() : null,
    }))
    .filter((item) => item.name !== '')
    .slice(0, MAX_ITEMS_PER_REQUEST);
}

/** Same ingredient in the same unit is one line, like Listonic. */
function mergeKey(name: string, unit: string): string {
  return `${ingredientNameKey(name)}|${unit.trim().toLowerCase()}`;
}

function toApiItem(row: GroceryItemRow) {
  return {
    id: row.id,
    name: row.name,
    amount: row.amount,
    unit: row.unit,
    checked: row.checked === 1,
    recipeId: row.recipe_id ?? undefined,
  };
}

/** Unchecked items first, then alphabetically, so the list reads like a real one. */
function loadItems(db: Database, listId: string) {
  const rows = db
    .prepare(
      `SELECT * FROM grocery_items
       WHERE grocery_list_id = ?
       ORDER BY checked, name COLLATE NOCASE`
    )
    .all(listId) as GroceryItemRow[];

  return rows.map(toApiItem);
}

/** Adds items to the list, merging duplicates and reviving checked-off lines. */
function addItems(db: Database, listId: string, items: NormalizedItem[]): number {
  const existing = db
    .prepare('SELECT * FROM grocery_items WHERE grocery_list_id = ?')
    .all(listId) as GroceryItemRow[];

  const byKey = new Map<string, GroceryItemRow>();
  for (const row of existing) {
    byKey.set(mergeKey(row.name, row.unit), row);
  }

  const insert = db.prepare(
    `INSERT INTO grocery_items (id, grocery_list_id, name, amount, unit, checked, recipe_id, created_at)
     VALUES (@id, @grocery_list_id, @name, @amount, @unit, 0, @recipe_id, @created_at)`
  );
  const update = db.prepare(
    'UPDATE grocery_items SET amount = ?, checked = 0 WHERE id = ?'
  );

  const now = new Date().toISOString();
  let affected = 0;

  for (const item of items) {
    const key = mergeKey(item.name, item.unit);
    const match = byKey.get(key);

    if (match) {
      const amount = match.amount + item.amount;
      update.run(amount, match.id);
      byKey.set(key, { ...match, amount, checked: 0 });
    } else {
      const id = generateId();
      insert.run({
        id,
        grocery_list_id: listId,
        name: item.name,
        amount: item.amount,
        unit: item.unit,
        recipe_id: item.recipeId,
        created_at: now,
      });
      byKey.set(key, {
        id,
        grocery_list_id: listId,
        name: item.name,
        amount: item.amount,
        unit: item.unit,
        checked: 0,
        recipe_id: item.recipeId,
        created_at: now,
      });
    }

    affected += 1;
  }

  return affected;
}

/** The current user's shopping list. */
router.get('/', (req, res) => {
  if (!isDbAvailable()) {
    return res.status(503).json({ success: false, error: 'Database unavailable' });
  }

  const userId = requireRecipeUser(req, res);
  if (!userId) return;

  const db = getDatabase() as Database;

  try {
    const listId = getOrCreateListId(db, userId);
    return res.json({ success: true, data: { id: listId, items: loadItems(db, listId) } });
  } catch (e) {
    console.error('Failed to load grocery list:', e);
    return res.status(500).json({ success: false, error: 'Failed to load grocery list' });
  }
});

/** Adds one or more items (from a recipe or typed manually). */
router.post('/items', (req, res) => {
  if (!isDbAvailable()) {
    return res.status(503).json({ success: false, error: 'Database unavailable' });
  }

  const userId = requireRecipeUser(req, res);
  if (!userId) return;

  const body = req.body as { items?: unknown };
  const items = normalizeItems(body?.items);
  if (items.length === 0) {
    return res.status(400).json({ success: false, error: 'No valid items provided' });
  }

  const db = getDatabase() as Database;

  try {
    const listId = getOrCreateListId(db, userId);
    const added = db.transaction(() => addItems(db, listId, items))();
    rememberIngredientNames(db, userId, items.map((item) => item.name));
    touchList(db, listId);

    return res.status(201).json({
      success: true,
      data: { id: listId, items: loadItems(db, listId) },
      added,
    });
  } catch (e) {
    console.error('Failed to add grocery items:', e);
    return res.status(500).json({ success: false, error: 'Failed to add grocery items' });
  }
});

/** Ticks an item off (or back on). */
router.patch('/items/:id', (req, res) => {
  if (!isDbAvailable()) {
    return res.status(503).json({ success: false, error: 'Database unavailable' });
  }

  const userId = requireRecipeUser(req, res);
  if (!userId) return;

  const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
  const body = req.body as { checked?: unknown; amount?: unknown };
  if (!id) {
    return res.status(400).json({ success: false, error: 'Invalid item id' });
  }
  if (typeof body?.checked !== 'boolean' && toOptionalNumber(body?.amount) === null) {
    return res.status(400).json({ success: false, error: 'Nothing to update' });
  }

  const db = getDatabase() as Database;

  try {
    const listId = getOrCreateListId(db, userId);
    const owned = db
      .prepare('SELECT id FROM grocery_items WHERE id = ? AND grocery_list_id = ?')
      .get(id, listId) as { id: string } | undefined;
    if (!owned) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    if (typeof body.checked === 'boolean') {
      db.prepare('UPDATE grocery_items SET checked = ? WHERE id = ?').run(
        body.checked ? 1 : 0,
        id
      );
    }

    const amount = toOptionalNumber(body.amount);
    if (amount !== null) {
      db.prepare('UPDATE grocery_items SET amount = ? WHERE id = ?').run(amount, id);
    }

    touchList(db, listId);
    return res.json({ success: true, data: { id: listId, items: loadItems(db, listId) } });
  } catch (e) {
    console.error('Failed to update grocery item:', e);
    return res.status(500).json({ success: false, error: 'Failed to update grocery item' });
  }
});

/** Removes a single item. */
router.delete('/items/:id', (req, res) => {
  if (!isDbAvailable()) {
    return res.status(503).json({ success: false, error: 'Database unavailable' });
  }

  const userId = requireRecipeUser(req, res);
  if (!userId) return;

  const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
  if (!id) {
    return res.status(400).json({ success: false, error: 'Invalid item id' });
  }

  const db = getDatabase() as Database;

  try {
    const listId = getOrCreateListId(db, userId);
    const result = db
      .prepare('DELETE FROM grocery_items WHERE id = ? AND grocery_list_id = ?')
      .run(id, listId);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    touchList(db, listId);
    return res.json({ success: true, data: { id: listId, items: loadItems(db, listId) } });
  } catch (e) {
    console.error('Failed to remove grocery item:', e);
    return res.status(500).json({ success: false, error: 'Failed to remove grocery item' });
  }
});

/** Clears every ticked-off item at once. */
router.delete('/checked', (req, res) => {
  if (!isDbAvailable()) {
    return res.status(503).json({ success: false, error: 'Database unavailable' });
  }

  const userId = requireRecipeUser(req, res);
  if (!userId) return;

  const db = getDatabase() as Database;

  try {
    const listId = getOrCreateListId(db, userId);
    const result = db
      .prepare('DELETE FROM grocery_items WHERE grocery_list_id = ? AND checked = 1')
      .run(listId);

    touchList(db, listId);
    return res.json({
      success: true,
      data: { id: listId, items: loadItems(db, listId) },
      removed: result.changes,
    });
  } catch (e) {
    console.error('Failed to clear grocery items:', e);
    return res.status(500).json({ success: false, error: 'Failed to clear grocery items' });
  }
});

export default router;
