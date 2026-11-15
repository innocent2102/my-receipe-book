import type { Database } from 'better-sqlite3';
import { catalogNameKey, forgetName, listNames, rememberNames } from './nameCatalog.js';

const TABLE = 'ingredient_catalog';

/** Case/whitespace-insensitive key so "Olive Oil" and "olive oil" stay one entry. */
export const ingredientNameKey = catalogNameKey;

/**
 * Adds any new ingredient names to the user's catalog.
 * Existing entries keep their original spelling.
 */
export function rememberIngredientNames(db: Database, userId: string, names: string[]): void {
  rememberNames(db, TABLE, userId, names);
}

/** Removes a name from the user's catalog. Returns true when an entry was deleted. */
export function forgetIngredientName(db: Database, userId: string, name: string): boolean {
  return forgetName(db, TABLE, userId, name);
}

/** Returns the user's known ingredient names, optionally filtered by a search term. */
export function listIngredientNames(db: Database, userId: string, query?: string): string[] {
  return listNames(db, TABLE, userId, query);
}
