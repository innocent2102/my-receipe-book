import { Router } from 'express';
import type { Database } from 'better-sqlite3';
import { getDatabase, isDbAvailable } from '../database.js';
import { requireRecipeUser } from '../recipeAuth.js';
import {
  forgetIngredientName,
  listIngredientNames,
  rememberIngredientNames,
} from '../ingredientCatalog.js';

const router = Router();

/** Known ingredient names for the current user (autocomplete source). */
router.get('/', (req, res) => {
  if (!isDbAvailable()) {
    return res.status(503).json({ success: false, error: 'Database unavailable' });
  }

  const userId = requireRecipeUser(req, res);
  if (!userId) return;

  const query = typeof req.query.q === 'string' ? req.query.q : undefined;
  const db = getDatabase() as Database;

  try {
    return res.json({ success: true, data: listIngredientNames(db, userId, query) });
  } catch (e) {
    console.error('Failed to list ingredients:', e);
    return res.status(500).json({ success: false, error: 'Failed to list ingredients' });
  }
});

/** Adds a name to the user's catalog so it shows up in autocomplete next time. */
router.post('/', (req, res) => {
  if (!isDbAvailable()) {
    return res.status(503).json({ success: false, error: 'Database unavailable' });
  }

  const userId = requireRecipeUser(req, res);
  if (!userId) return;

  const body = req.body as { name?: unknown };
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  if (!name) {
    return res.status(400).json({ success: false, error: 'Ingredient name is required' });
  }

  const db = getDatabase() as Database;

  try {
    rememberIngredientNames(db, userId, [name]);
  } catch (e) {
    console.error('Failed to save ingredient:', e);
    return res.status(500).json({ success: false, error: 'Failed to save ingredient' });
  }

  return res.status(201).json({ success: true, data: listIngredientNames(db, userId) });
});

/** Removes a name from the user's catalog so it stops showing up in autocomplete. */
router.delete('/', (req, res) => {
  if (!isDbAvailable()) {
    return res.status(503).json({ success: false, error: 'Database unavailable' });
  }

  const userId = requireRecipeUser(req, res);
  if (!userId) return;

  const name = typeof req.query.name === 'string' ? req.query.name.trim() : '';
  if (!name) {
    return res.status(400).json({ success: false, error: 'Ingredient name is required' });
  }

  const db = getDatabase() as Database;

  try {
    const removed = forgetIngredientName(db, userId, name);
    if (!removed) {
      return res.status(404).json({ success: false, error: 'Ingredient not found' });
    }
  } catch (e) {
    console.error('Failed to remove ingredient:', e);
    return res.status(500).json({ success: false, error: 'Failed to remove ingredient' });
  }

  return res.json({ success: true, data: listIngredientNames(db, userId) });
});

export default router;
