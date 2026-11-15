import type { Database } from 'better-sqlite3';
import { forgetName, listNames, rememberNames } from './nameCatalog.js';

const TABLE = 'tag_catalog';

/** Adds any new tags to the user's catalog; existing entries keep their spelling. */
export function rememberTags(db: Database, userId: string, tags: string[]): void {
  rememberNames(db, TABLE, userId, tags);
}

/** Removes a tag from the user's catalog. Returns true when an entry was deleted. */
export function forgetTag(db: Database, userId: string, tag: string): boolean {
  return forgetName(db, TABLE, userId, tag);
}

/** Returns the user's known tags, optionally filtered by a search term. */
export function listTags(db: Database, userId: string, query?: string): string[] {
  return listNames(db, TABLE, userId, query);
}

/**
 * Seeds the catalog from tags already saved on recipes, so the autocomplete is useful
 * straight away for books created before this table existed. Inserts ignore conflicts,
 * which makes running it on every startup harmless.
 */
export function seedTagsFromRecipes(db: Database): void {
  const rows = db
    .prepare(`SELECT user_id, tags FROM recipes WHERE tags IS NOT NULL AND user_id IS NOT NULL`)
    .all() as { user_id: string; tags: string }[];

  const byUser = new Map<string, string[]>();
  for (const row of rows) {
    let tags: unknown;
    try {
      tags = JSON.parse(row.tags);
    } catch {
      continue;
    }
    if (!Array.isArray(tags)) continue;

    const known = byUser.get(row.user_id) ?? [];
    known.push(...tags.filter((tag): tag is string => typeof tag === 'string'));
    byUser.set(row.user_id, known);
  }

  for (const [userId, tags] of byUser) {
    rememberNames(db, TABLE, userId, tags);
  }
}
