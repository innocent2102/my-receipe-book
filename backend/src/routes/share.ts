import { Router } from 'express';
import { randomBytes } from 'crypto';
import type { Database } from 'better-sqlite3';
import { getDatabase, isDbAvailable } from '../database.js';
import { requireRecipeUser } from '../recipeAuth.js';
import {
  createRecipeForUser,
  findOwnedRecipeId,
  loadRecipeDetail,
  type RecipeInput,
} from './recipes.js';

const router = Router();

type ShareRow = {
  token: string;
  recipe_id: string;
  user_id: string;
  created_at: string;
};

/** 128 bits of entropy: the token is the only thing protecting a shared recipe. */
function generateShareToken(): string {
  return randomBytes(16).toString('base64url');
}

function findShareByRecipe(db: Database, recipeId: string): ShareRow | undefined {
  return db.prepare('SELECT * FROM recipe_shares WHERE recipe_id = ?').get(recipeId) as
    | ShareRow
    | undefined;
}

function unavailable(res: import('express').Response) {
  return res.status(503).json({ success: false, error: 'Database unavailable' });
}

/** Public: anyone holding the token can read the recipe, no session required. */
router.get('/view/:token', (req, res) => {
  if (!isDbAvailable()) return unavailable(res);

  const token = typeof req.params.token === 'string' ? req.params.token.trim() : '';
  if (!token) {
    return res.status(400).json({ success: false, error: 'Missing share token' });
  }

  const db = getDatabase() as Database;
  const share = db.prepare('SELECT * FROM recipe_shares WHERE token = ?').get(token) as
    | ShareRow
    | undefined;
  if (!share) {
    return res.status(404).json({ success: false, error: 'Share link not found' });
  }

  const recipe = loadRecipeDetail(db, share.recipe_id);
  if (!recipe) {
    return res.status(404).json({ success: false, error: 'Share link not found' });
  }

  return res.json({ success: true, data: { token: share.token, recipe } });
});

/** Public read, authenticated write: copies a shared recipe into the caller's book. */
router.post('/view/:token/import', (req, res) => {
  if (!isDbAvailable()) return unavailable(res);

  const userId = requireRecipeUser(req, res);
  if (!userId) return;

  const token = typeof req.params.token === 'string' ? req.params.token.trim() : '';
  if (!token) {
    return res.status(400).json({ success: false, error: 'Missing share token' });
  }

  const db = getDatabase() as Database;
  const share = db.prepare('SELECT * FROM recipe_shares WHERE token = ?').get(token) as
    | ShareRow
    | undefined;
  if (!share) {
    return res.status(404).json({ success: false, error: 'Share link not found' });
  }

  const recipe = loadRecipeDetail(db, share.recipe_id);
  if (!recipe) {
    return res.status(404).json({ success: false, error: 'Share link not found' });
  }

  if (share.user_id === userId) {
    return res.status(409).json({ success: false, error: 'This recipe is already yours' });
  }

  let newId: string | null;
  try {
    newId = createRecipeForUser(db, userId, recipe as RecipeInput);
  } catch (e) {
    console.error('Failed to copy shared recipe:', e);
    return res.status(500).json({ success: false, error: 'Failed to save recipe' });
  }

  if (!newId) {
    return res.status(400).json({ success: false, error: 'Shared recipe is invalid' });
  }

  return res.status(201).json({ success: true, data: loadRecipeDetail(db, newId) });
});

/** Tells the owner whether a recipe is currently shared, and under which token. */
router.get('/recipe/:recipeId', (req, res) => {
  if (!isDbAvailable()) return unavailable(res);

  const userId = requireRecipeUser(req, res);
  if (!userId) return;

  const recipeId = typeof req.params.recipeId === 'string' ? req.params.recipeId.trim() : '';
  if (!recipeId) {
    return res.status(400).json({ success: false, error: 'Missing recipe id' });
  }

  const db = getDatabase() as Database;
  if (!findOwnedRecipeId(db, recipeId, userId)) {
    return res.status(404).json({ success: false, error: 'Recipe not found' });
  }

  const share = findShareByRecipe(db, recipeId);
  return res.json({ success: true, data: { token: share?.token ?? null } });
});

/** Publishes a recipe. Re-publishing keeps the existing token so old links stay valid. */
router.post('/', (req, res) => {
  if (!isDbAvailable()) return unavailable(res);

  const userId = requireRecipeUser(req, res);
  if (!userId) return;

  const recipeId = typeof req.body?.recipeId === 'string' ? req.body.recipeId.trim() : '';
  if (!recipeId) {
    return res.status(400).json({ success: false, error: 'Missing recipe id' });
  }

  const db = getDatabase() as Database;
  if (!findOwnedRecipeId(db, recipeId, userId)) {
    return res.status(404).json({ success: false, error: 'Recipe not found' });
  }

  const existing = findShareByRecipe(db, recipeId);
  if (existing) {
    return res.json({ success: true, data: { token: existing.token } });
  }

  const token = generateShareToken();
  db.prepare(
    `INSERT INTO recipe_shares (token, recipe_id, user_id, created_at) VALUES (?, ?, ?, ?)`
  ).run(token, recipeId, userId, new Date().toISOString());

  return res.status(201).json({ success: true, data: { token } });
});

/** Unpublishes a recipe; existing links stop working immediately. */
router.delete('/recipe/:recipeId', (req, res) => {
  if (!isDbAvailable()) return unavailable(res);

  const userId = requireRecipeUser(req, res);
  if (!userId) return;

  const recipeId = typeof req.params.recipeId === 'string' ? req.params.recipeId.trim() : '';
  if (!recipeId) {
    return res.status(400).json({ success: false, error: 'Missing recipe id' });
  }

  const db = getDatabase() as Database;
  const result = db
    .prepare('DELETE FROM recipe_shares WHERE recipe_id = ? AND user_id = ?')
    .run(recipeId, userId);

  if (result.changes === 0) {
    return res.status(404).json({ success: false, error: 'Recipe is not shared' });
  }

  return res.json({ success: true, data: { token: null } });
});

export default router;
