import { Router, raw } from 'express';
import { randomBytes } from 'crypto';
import type { Database } from 'better-sqlite3';
import { getDatabase, isDbAvailable } from '../database.js';
import { requireRecipeUser } from '../recipeAuth.js';

const router = Router();

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

type ImageRow = {
  id: string;
  mime_type: string;
  data: Buffer;
};

function unavailable(res: import('express').Response) {
  return res.status(503).json({ success: false, error: 'Database unavailable' });
}

/** The id is also the public address of the photo, so it has to be unguessable. */
function generateImageId(mimeType: string): string {
  return `${randomBytes(12).toString('base64url')}.${EXTENSIONS[mimeType] ?? 'bin'}`;
}

/**
 * Uploads one recipe photo. The body is the raw image, which keeps the request small
 * (no base64 inflation) and avoids a multipart dependency.
 */
router.post('/', raw({ type: ALLOWED_TYPES, limit: MAX_IMAGE_BYTES }), (req, res) => {
  const userId = requireRecipeUser(req, res);
  if (!userId) return;
  if (!isDbAvailable()) return unavailable(res);

  const mimeType = (req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
  if (!ALLOWED_TYPES.includes(mimeType)) {
    return res
      .status(415)
      .json({ success: false, error: 'Unsupported image type', code: 'unsupported_type' });
  }

  const data = Buffer.isBuffer(req.body) ? req.body : null;
  if (!data || data.length === 0) {
    return res.status(400).json({ success: false, error: 'Empty image', code: 'empty' });
  }
  if (data.length > MAX_IMAGE_BYTES) {
    return res.status(413).json({ success: false, error: 'Image is too large', code: 'too_large' });
  }

  const db = getDatabase() as Database;
  const id = generateImageId(mimeType);
  db.prepare(
    `INSERT INTO recipe_images (id, user_id, mime_type, data, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, userId, mimeType, data, new Date().toISOString());

  return res.status(201).json({ success: true, data: { id, url: `/api/images/${id}` } });
});

/**
 * Public on purpose: shared recipes are read by visitors without a session, and the
 * unguessable id is what protects the photo.
 */
router.get('/:id', (req, res) => {
  if (!isDbAvailable()) return unavailable(res);

  const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
  const row = id
    ? (db().prepare('SELECT id, mime_type, data FROM recipe_images WHERE id = ?').get(id) as
        | ImageRow
        | undefined)
    : undefined;

  if (!row) {
    return res.status(404).json({ success: false, error: 'Image not found' });
  }

  res.setHeader('Content-Type', row.mime_type);
  // Images are immutable: a new upload always gets a new id.
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  return res.send(row.data);
});

function db(): Database {
  return getDatabase() as Database;
}

/** Deletes an uploaded photo once no recipe points at it any more. */
export function deleteUnusedImage(database: Database, imageUrl: string | null | undefined): void {
  const id = imageIdFromUrl(imageUrl);
  if (!id) return;

  const stillUsed = database
    .prepare('SELECT 1 FROM recipes WHERE image_url = ? LIMIT 1')
    .get(imageUrl as string);
  if (stillUsed) return;

  database.prepare('DELETE FROM recipe_images WHERE id = ?').run(id);
}

/** `/api/images/<id>` -> `<id>`; returns null for external image addresses. */
export function imageIdFromUrl(imageUrl: string | null | undefined): string | null {
  if (typeof imageUrl !== 'string') return null;
  const match = imageUrl.trim().match(/^\/api\/images\/([A-Za-z0-9_-]+\.[a-z]{3,4})$/);
  return match ? match[1] : null;
}

export default router;
