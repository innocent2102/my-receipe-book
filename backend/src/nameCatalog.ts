import type { Database } from 'better-sqlite3';

/**
 * Shared implementation behind the per-user autocomplete catalogs (ingredient names and
 * recipe tags). Both tables have the same shape, so the only difference is which one a
 * call writes to. The table name is interpolated into the SQL, so it must only ever come
 * from the constants in this codebase - never from a request.
 */

/** Case/whitespace-insensitive key so "Olive Oil" and "olive oil" stay one entry. */
export function catalogNameKey(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

function generateCatalogId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/** Adds any new names to the user's catalog; existing entries keep their spelling. */
export function rememberNames(
  db: Database,
  table: string,
  userId: string,
  names: string[]
): void {
  const statement = db.prepare(`
    INSERT INTO ${table} (id, user_id, name, name_key, created_at)
    VALUES (@id, @user_id, @name, @name_key, @created_at)
    ON CONFLICT (user_id, name_key) DO NOTHING
  `);

  const now = new Date().toISOString();
  const seen = new Set<string>();

  for (const raw of names) {
    const name = typeof raw === 'string' ? raw.trim().replace(/\s+/g, ' ') : '';
    if (!name) continue;

    const nameKey = catalogNameKey(name);
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
export function forgetName(db: Database, table: string, userId: string, name: string): boolean {
  const nameKey = catalogNameKey(name);
  if (!nameKey) return false;

  const result = db
    .prepare(`DELETE FROM ${table} WHERE user_id = ? AND name_key = ?`)
    .run(userId, nameKey);

  return result.changes > 0;
}

/** Returns the user's known names, optionally filtered by a search term. */
export function listNames(
  db: Database,
  table: string,
  userId: string,
  query?: string
): string[] {
  const search = query?.trim();

  const rows = search
    ? (db
        .prepare(
          `SELECT name FROM ${table}
           WHERE user_id = ? AND name_key LIKE ? ESCAPE '\\'
           ORDER BY name_key`
        )
        .all(userId, `%${escapeLike(catalogNameKey(search))}%`) as { name: string }[])
    : (db
        .prepare(`SELECT name FROM ${table} WHERE user_id = ? ORDER BY name_key`)
        .all(userId) as { name: string }[]);

  return rows.map((row) => row.name);
}
