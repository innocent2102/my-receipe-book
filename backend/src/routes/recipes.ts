import { Router } from 'express';
import type { Database } from 'better-sqlite3';
import { getDatabase, isDbAvailable } from '../database.js';
import { requireRecipeUser } from '../recipeAuth.js';
import { rememberIngredientNames } from '../ingredientCatalog.js';

const router = Router();

function generateRecipeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

type RecipeRow = {
  id: string;
  title: string;
  description: string | null;
  prep_time: number | null;
  cook_time: number | null;
  servings: number | null;
  tags: string | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
};

type IngredientRow = {
  id: string;
  recipe_id: string;
  name: string;
  amount: number;
  unit: string;
};

type InstructionRow = {
  id: string;
  recipe_id: string;
  step_number: number;
  instruction: string;
};

function parseTags(tags: string | null): string[] | undefined {
  if (!tags) return undefined;
  try {
    const parsed = JSON.parse(tags) as unknown;
    return Array.isArray(parsed) ? (parsed as string[]) : undefined;
  } catch {
    return undefined;
  }
}

export type RecipeInput = {
  title?: unknown;
  description?: unknown;
  ingredients?: unknown;
  instructions?: unknown;
  prepTime?: unknown;
  cookTime?: unknown;
  servings?: unknown;
  tags?: unknown;
};

type NormalizedRecipe = {
  title: string;
  description: string | null;
  prepTime: number | null;
  cookTime: number | null;
  servings: number | null;
  tags: string | null;
  ingredients: { name: string; amount: number; unit: string }[];
  instructions: string[];
};

function toOptionalNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

/** Validates/normalizes an untrusted recipe payload (create or import). */
function normalizeRecipeInput(raw: RecipeInput): NormalizedRecipe | null {
  const title = typeof raw?.title === 'string' ? raw.title.trim() : '';
  if (!title) return null;

  const description = typeof raw.description === 'string' ? raw.description.trim() : '';

  const tags = Array.isArray(raw.tags)
    ? raw.tags.filter((t): t is string => typeof t === 'string' && t.trim() !== '').map((t) => t.trim())
    : [];

  const ingredients = Array.isArray(raw.ingredients)
    ? raw.ingredients
        .filter((ing): ing is Record<string, unknown> => typeof ing === 'object' && ing !== null)
        .map((ing) => ({
          name: typeof ing.name === 'string' ? ing.name.trim() : '',
          amount: toOptionalNumber(ing.amount) ?? 0,
          unit: typeof ing.unit === 'string' ? ing.unit.trim() : '',
        }))
        .filter((ing) => ing.name !== '')
    : [];

  const instructions = Array.isArray(raw.instructions)
    ? raw.instructions
        .filter((step): step is string => typeof step === 'string')
        .map((step) => step.trim())
        .filter((step) => step !== '')
    : [];

  return {
    title,
    description: description || null,
    prepTime: toOptionalNumber(raw.prepTime),
    cookTime: toOptionalNumber(raw.cookTime),
    servings: toOptionalNumber(raw.servings),
    tags: tags.length > 0 ? JSON.stringify(tags) : null,
    ingredients,
    instructions,
  };
}

function recipeInsertStatements(db: Database) {
  return {
    recipe: db.prepare(`
      INSERT INTO recipes (id, title, description, prep_time, cook_time, servings, tags, user_id, created_at, updated_at)
      VALUES (@id, @title, @description, @prep_time, @cook_time, @servings, @tags, @user_id, @created_at, @updated_at)
    `),
    ingredient: db.prepare(`
      INSERT INTO ingredients (id, recipe_id, name, amount, unit)
      VALUES (@id, @recipe_id, @name, @amount, @unit)
    `),
    instruction: db.prepare(`
      INSERT INTO instructions (id, recipe_id, step_number, instruction)
      VALUES (@id, @recipe_id, @step_number, @instruction)
    `),
  };
}

/** Writes one normalized recipe. Caller is responsible for the surrounding transaction. */
function insertRecipe(
  db: Database,
  statements: ReturnType<typeof recipeInsertStatements>,
  userId: string,
  recipe: NormalizedRecipe
): string {
  const recipeId = generateRecipeId();
  const now = new Date().toISOString();

  statements.recipe.run({
    id: recipeId,
    title: recipe.title,
    description: recipe.description,
    prep_time: recipe.prepTime,
    cook_time: recipe.cookTime,
    servings: recipe.servings,
    tags: recipe.tags,
    user_id: userId,
    created_at: now,
    updated_at: now,
  });

  for (const ing of recipe.ingredients) {
    statements.ingredient.run({
      id: generateRecipeId(),
      recipe_id: recipeId,
      name: ing.name,
      amount: ing.amount,
      unit: ing.unit,
    });
  }

  recipe.instructions.forEach((text, index) => {
    statements.instruction.run({
      id: generateRecipeId(),
      recipe_id: recipeId,
      step_number: index + 1,
      instruction: text,
    });
  });

  rememberIngredientNames(db, userId, recipe.ingredients.map((ing) => ing.name));

  return recipeId;
}

router.get('/', (req, res) => {
  if (!isDbAvailable()) {
    return res.status(503).json({ success: false, error: 'Database unavailable' });
  }

  const userId = requireRecipeUser(req, res);
  if (!userId) return;

  const db = getDatabase() as Database;
  // Include legacy rows (NULL / empty user_id) so older DBs still list + delete correctly.
  const recipes = db
    .prepare(
      `SELECT * FROM recipes
       WHERE user_id = ? OR user_id IS NULL OR user_id = ''
       ORDER BY updated_at DESC`
    )
    .all(userId) as RecipeRow[];

  if (recipes.length === 0) {
    return res.json({ success: true, data: [] });
  }

  const ids = recipes.map((r) => r.id);
  const placeholders = ids.map(() => '?').join(',');

  const ingredientRows = db
    .prepare(`SELECT * FROM ingredients WHERE recipe_id IN (${placeholders})`)
    .all(...ids) as IngredientRow[];

  const instructionRows = db
    .prepare(
      `SELECT * FROM instructions WHERE recipe_id IN (${placeholders}) ORDER BY recipe_id, step_number`
    )
    .all(...ids) as InstructionRow[];

  const ingredientsByRecipe = new Map<string, IngredientRow[]>();
  for (const row of ingredientRows) {
    const list = ingredientsByRecipe.get(row.recipe_id) ?? [];
    list.push(row);
    ingredientsByRecipe.set(row.recipe_id, list);
  }

  const instructionsByRecipe = new Map<string, InstructionRow[]>();
  for (const row of instructionRows) {
    const list = instructionsByRecipe.get(row.recipe_id) ?? [];
    list.push(row);
    instructionsByRecipe.set(row.recipe_id, list);
  }

  const data = recipes.map((r) => {
    const ings = ingredientsByRecipe.get(r.id) ?? [];
    const insts = instructionsByRecipe.get(r.id) ?? [];
    return {
      id: r.id,
      title: r.title,
      description: r.description ?? undefined,
      ingredients: ings.map((ing) => ({
        id: ing.id,
        name: ing.name,
        amount: ing.amount,
        unit: ing.unit,
      })),
      instructions: insts.sort((a, b) => a.step_number - b.step_number).map((i) => i.instruction),
      prepTime: r.prep_time ?? undefined,
      cookTime: r.cook_time ?? undefined,
      servings: r.servings ?? undefined,
      tags: parseTags(r.tags),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  });

  return res.json({ success: true, data });
});

router.get('/:id', (req, res) => {
  if (!isDbAvailable()) {
    return res.status(503).json({ success: false, error: 'Database unavailable' });
  }

  const userId = requireRecipeUser(req, res);
  if (!userId) return;

  const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
  if (!id) {
    return res.status(400).json({ success: false, error: 'Invalid recipe id' });
  }

  const db = getDatabase() as Database;
  // Include legacy rows (NULL / empty user_id) so older DBs stay readable.
  const row = db
    .prepare(
      `SELECT * FROM recipes
       WHERE id = ?
         AND (user_id = ? OR user_id IS NULL OR user_id = '')`
    )
    .get(id, userId) as RecipeRow | undefined;

  if (!row) {
    return res.status(404).json({ success: false, error: 'Recipe not found' });
  }

  const ingRows = db
    .prepare('SELECT * FROM ingredients WHERE recipe_id = ?')
    .all(row.id) as IngredientRow[];
  const instRows = db
    .prepare('SELECT * FROM instructions WHERE recipe_id = ? ORDER BY step_number')
    .all(row.id) as InstructionRow[];

  return res.json({
    success: true,
    data: {
      id: row.id,
      title: row.title,
      description: row.description ?? undefined,
      ingredients: ingRows.map((ing) => ({
        id: ing.id,
        name: ing.name,
        amount: ing.amount,
        unit: ing.unit,
      })),
      instructions: instRows.map((i) => i.instruction),
      prepTime: row.prep_time ?? undefined,
      cookTime: row.cook_time ?? undefined,
      servings: row.servings ?? undefined,
      tags: parseTags(row.tags),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
  });
});

router.post('/', (req, res) => {
  if (!isDbAvailable()) {
    return res.status(503).json({ success: false, error: 'Database unavailable' });
  }

  const userId = requireRecipeUser(req, res);
  if (!userId) return;

  const body = req.body as RecipeInput;
  const normalized = normalizeRecipeInput(body);
  if (!normalized) {
    return res.status(400).json({ success: false, error: 'Title is required' });
  }

  const db = getDatabase() as Database;
  const statements = recipeInsertStatements(db);

  let recipeId: string;
  try {
    recipeId = db.transaction(() => insertRecipe(db, statements, userId, normalized))();
  } catch (e) {
    console.error('Failed to save recipe:', e);
    return res.status(500).json({ success: false, error: 'Failed to save recipe' });
  }

  const row = db.prepare('SELECT * FROM recipes WHERE id = ?').get(recipeId) as RecipeRow;
  const ingRows = db
    .prepare('SELECT * FROM ingredients WHERE recipe_id = ?')
    .all(recipeId) as IngredientRow[];
  const instRows = db
    .prepare('SELECT * FROM instructions WHERE recipe_id = ? ORDER BY step_number')
    .all(recipeId) as InstructionRow[];

  return res.status(201).json({
    success: true,
    data: {
      id: row.id,
      title: row.title,
      description: row.description ?? undefined,
      ingredients: ingRows.map((ing) => ({
        id: ing.id,
        name: ing.name,
        amount: ing.amount,
        unit: ing.unit,
      })),
      instructions: instRows.map((i) => i.instruction),
      prepTime: row.prep_time ?? undefined,
      cookTime: row.cook_time ?? undefined,
      servings: row.servings ?? undefined,
      tags: parseTags(row.tags),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
  });
});

const MAX_IMPORT_RECIPES = 500;

/** Bulk import. Accepts the export envelope `{ recipes: [...] }` or a bare array. */
router.post('/import', (req, res) => {
  if (!isDbAvailable()) {
    return res.status(503).json({ success: false, error: 'Database unavailable' });
  }

  const userId = requireRecipeUser(req, res);
  if (!userId) return;

  const body = req.body as { recipes?: unknown } | unknown[];
  const rawRecipes = Array.isArray(body)
    ? body
    : Array.isArray((body as { recipes?: unknown })?.recipes)
      ? ((body as { recipes: unknown[] }).recipes)
      : null;

  if (!rawRecipes) {
    return res.status(400).json({
      success: false,
      error: 'Expected a JSON file containing a "recipes" array.',
    });
  }

  if (rawRecipes.length === 0) {
    return res.status(400).json({ success: false, error: 'The file contains no recipes.' });
  }

  if (rawRecipes.length > MAX_IMPORT_RECIPES) {
    return res.status(413).json({
      success: false,
      error: `Too many recipes in one import (max ${MAX_IMPORT_RECIPES}).`,
    });
  }

  const normalized: NormalizedRecipe[] = [];
  let skipped = 0;
  for (const raw of rawRecipes) {
    const recipe =
      typeof raw === 'object' && raw !== null ? normalizeRecipeInput(raw as RecipeInput) : null;
    if (recipe) {
      normalized.push(recipe);
    } else {
      skipped += 1;
    }
  }

  if (normalized.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'No valid recipes found. Each recipe needs at least a title.',
    });
  }

  const db = getDatabase() as Database;
  const statements = recipeInsertStatements(db);

  try {
    // All-or-nothing: a partially applied import would be confusing to undo.
    db.transaction(() => {
      for (const recipe of normalized) {
        insertRecipe(db, statements, userId, recipe);
      }
    })();
  } catch (e) {
    console.error('Failed to import recipes:', e);
    return res.status(500).json({ success: false, error: 'Failed to import recipes' });
  }

  return res.status(201).json({
    success: true,
    data: { imported: normalized.length, skipped },
  });
});

router.delete('/:id', (req, res) => {
  if (!isDbAvailable()) {
    return res.status(503).json({ success: false, error: 'Database unavailable' });
  }

  const userId = requireRecipeUser(req, res);
  if (!userId) return;

  const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
  if (!id) {
    return res.status(400).json({ success: false, error: 'Invalid recipe id' });
  }

  const db = getDatabase() as Database;
  const result = db
    .prepare(
      `DELETE FROM recipes
       WHERE id = ?
         AND (user_id = ? OR user_id IS NULL OR user_id = '')`
    )
    .run(id, userId);

  if (result.changes === 0) {
    return res.status(404).json({ success: false, error: 'Recipe not found' });
  }

  return res.json({ success: true });
});

export default router;
