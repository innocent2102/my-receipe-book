import { Router } from 'express';
import type { Database } from 'better-sqlite3';
import { getDatabase, isDbAvailable } from '../database.js';
import { requireRecipeUser } from '../recipeAuth.js';

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

router.post('/', (req, res) => {
  if (!isDbAvailable()) {
    return res.status(503).json({ success: false, error: 'Database unavailable' });
  }

  const userId = requireRecipeUser(req, res);
  if (!userId) return;

  const body = req.body as {
    title?: string;
    description?: string;
    ingredients?: { name?: string; amount?: number; unit?: string }[];
    instructions?: string[];
    prepTime?: number;
    cookTime?: number;
    servings?: number;
    tags?: string[];
  };

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title) {
    return res.status(400).json({ success: false, error: 'Title is required' });
  }

  const db = getDatabase() as Database;
  const recipeId = generateRecipeId();
  const now = new Date().toISOString();
  const description = typeof body.description === 'string' ? body.description.trim() : undefined;
  const tagsJson =
    Array.isArray(body.tags) && body.tags.length > 0 ? JSON.stringify(body.tags) : null;

  const ingredients = Array.isArray(body.ingredients) ? body.ingredients : [];
  const instructions = Array.isArray(body.instructions) ? body.instructions : [];

  const insertRecipe = db.prepare(`
    INSERT INTO recipes (id, title, description, prep_time, cook_time, servings, tags, user_id, created_at, updated_at)
    VALUES (@id, @title, @description, @prep_time, @cook_time, @servings, @tags, @user_id, @created_at, @updated_at)
  `);

  const insertIngredient = db.prepare(`
    INSERT INTO ingredients (id, recipe_id, name, amount, unit)
    VALUES (@id, @recipe_id, @name, @amount, @unit)
  `);

  const insertInstruction = db.prepare(`
    INSERT INTO instructions (id, recipe_id, step_number, instruction)
    VALUES (@id, @recipe_id, @step_number, @instruction)
  `);

  const transaction = db.transaction(() => {
    insertRecipe.run({
      id: recipeId,
      title,
      description: description || null,
      prep_time: typeof body.prepTime === 'number' && !Number.isNaN(body.prepTime) ? body.prepTime : null,
      cook_time: typeof body.cookTime === 'number' && !Number.isNaN(body.cookTime) ? body.cookTime : null,
      servings: typeof body.servings === 'number' && !Number.isNaN(body.servings) ? body.servings : null,
      tags: tagsJson,
      user_id: userId,
      created_at: now,
      updated_at: now,
    });

    for (const ing of ingredients) {
      insertIngredient.run({
        id: generateRecipeId(),
        recipe_id: recipeId,
        name: typeof ing.name === 'string' ? ing.name : '',
        amount: typeof ing.amount === 'number' && !Number.isNaN(ing.amount) ? ing.amount : 0,
        unit: typeof ing.unit === 'string' ? ing.unit : '',
      });
    }

    instructions.forEach((text, index) => {
      insertInstruction.run({
        id: generateRecipeId(),
        recipe_id: recipeId,
        step_number: index + 1,
        instruction: typeof text === 'string' ? text : '',
      });
    });
  });

  try {
    transaction();
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
