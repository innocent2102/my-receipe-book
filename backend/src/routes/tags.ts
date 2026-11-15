import { Router } from 'express';
import type { Database } from 'better-sqlite3';
import { getDatabase, isDbAvailable } from '../database.js';
import { requireRecipeUser } from '../recipeAuth.js';
import { forgetTag, listTags, rememberTags } from '../tagCatalog.js';

const router = Router();

/** Known tags for the current user (autocomplete source). */
router.get('/', (req, res) => {
  if (!isDbAvailable()) {
    return res.status(503).json({ success: false, error: 'Database unavailable' });
  }

  const userId = requireRecipeUser(req, res);
  if (!userId) return;

  const query = typeof req.query.q === 'string' ? req.query.q : undefined;
  const db = getDatabase() as Database;

  try {
    return res.json({ success: true, data: listTags(db, userId, query) });
  } catch (e) {
    console.error('Failed to list tags:', e);
    return res.status(500).json({ success: false, error: 'Failed to list tags' });
  }
});

/** Adds a tag to the user's catalog so it shows up in autocomplete next time. */
router.post('/', (req, res) => {
  if (!isDbAvailable()) {
    return res.status(503).json({ success: false, error: 'Database unavailable' });
  }

  const userId = requireRecipeUser(req, res);
  if (!userId) return;

  const body = req.body as { name?: unknown };
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  if (!name) {
    return res.status(400).json({ success: false, error: 'Tag is required' });
  }

  const db = getDatabase() as Database;

  try {
    rememberTags(db, userId, [name]);
  } catch (e) {
    console.error('Failed to save tag:', e);
    return res.status(500).json({ success: false, error: 'Failed to save tag' });
  }

  return res.status(201).json({ success: true, data: listTags(db, userId) });
});

/** Removes a tag from the user's catalog so it stops showing up in autocomplete. */
router.delete('/', (req, res) => {
  if (!isDbAvailable()) {
    return res.status(503).json({ success: false, error: 'Database unavailable' });
  }

  const userId = requireRecipeUser(req, res);
  if (!userId) return;

  const name = typeof req.query.name === 'string' ? req.query.name.trim() : '';
  if (!name) {
    return res.status(400).json({ success: false, error: 'Tag is required' });
  }

  const db = getDatabase() as Database;

  try {
    const removed = forgetTag(db, userId, name);
    if (!removed) {
      return res.status(404).json({ success: false, error: 'Tag not found' });
    }
  } catch (e) {
    console.error('Failed to remove tag:', e);
    return res.status(500).json({ success: false, error: 'Failed to remove tag' });
  }

  return res.json({ success: true, data: listTags(db, userId) });
});

export default router;
