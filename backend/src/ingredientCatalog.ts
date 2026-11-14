import type { Database } from 'better-sqlite3';

/** Case/whitespace-insensitive key so "Olive Oil" and "olive oil" stay one entry. */
export function ingredientNameKey(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

function generateCatalogId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Adds any new ingredient names to the user's catalog.
 * Existing entries keep their original spelling.
 */
export function rememberIngredientNames(db: Database, userId: string, names: string[]): void {
  const statement = db.prepare(`
    INSERT INTO ingredient_catalog (id, user_id, name, name_key, created_at)
    VALUES (@id, @user_id, @name, @name_key, @created_at)
    ON CONFLICT (user_id, name_key) DO NOTHING
  `);

  const now = new Date().toISOString();
  const seen = new Set<string>();

  for (const raw of names) {
    const name = typeof raw === 'string' ? raw.trim().replace(/\s+/g, ' ') : '';
    if (!name) continue;

    const nameKey = ingredientNameKey(name);
    if (seen.has(nameKey)) continue;
    seen.add(nameKey);

    statement.run({
      id: generateCatalogId(),
      user_id: userId,
      name,
      name_key: nameKey,
      created_at: now,
    });
  }
}

/** Removes a name from the user's catalog. Returns true when an entry was deleted. */
export function forgetIngredientName(db: Database, userId: string, name: string): boolean {
  const nameKey = ingredientNameKey(name);
  if (!nameKey) return false;

  const result = db
    .prepare('DELETE FROM ingredient_catalog WHERE user_id = ? AND name_key = ?')
    .run(userId, nameKey);

  return result.changes > 0;
}

/** Returns the user's known ingredient names, optionally filtered by a search term. */
export function listIngredientNames(db: Database, userId: string, query?: string): string[] {
  const search = query?.trim();

  const rows = search
    ? (db
        .prepare(
          `SELECT name FROM ingredient_catalog
           WHERE user_id = ? AND name_key LIKE ? ESCAPE '\\'
           ORDER BY name_key`
        )
        .all(userId, `%${escapeLike(ingredientNameKey(search))}%`) as { name: string }[])
    : (db
        .prepare(`SELECT name FROM ingredient_catalog WHERE user_id = ? ORDER BY name_key`)
        .all(userId) as { name: string }[]);

  return rows.map((row) => row.name);
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}
