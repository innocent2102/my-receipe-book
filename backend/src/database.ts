import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db: any = null;
let isDatabaseAvailable = false;
let dbInitAttempted = false;

async function tryLoadDatabase() {
  if (dbInitAttempted) {
    return isDatabaseAvailable;
  }
  
  dbInitAttempted = true;
  
  try {
    const Database = (await import('better-sqlite3')).default;
    const dbPath = path.join(__dirname, '../data/recipes.db');
    db = new Database(dbPath);
    isDatabaseAvailable = true;
    return true;
  } catch (error: any) {
    console.warn('⚠️  better-sqlite3 not available:', error.message);
    console.warn('⚠️  Database features will be disabled. To enable:');
    console.warn('   1. Install Visual Studio Build Tools');
    console.warn('   2. Run: npm rebuild better-sqlite3');
    isDatabaseAvailable = false;
    return false;
  }
}

export async function initDatabase() {
  const loaded = await tryLoadDatabase();
  
  if (!loaded || !db) {
    console.warn('⚠️  Database not available - skipping initialization');
    return false;
  }

  try {
    // Enable foreign keys
    db.pragma('foreign_keys = ON');

    // Create recipes table
    db.exec(`
      CREATE TABLE IF NOT EXISTS recipes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        prep_time INTEGER,
        cook_time INTEGER,
        servings INTEGER,
        tags TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // Create ingredients table
    db.exec(`
      CREATE TABLE IF NOT EXISTS ingredients (
        id TEXT PRIMARY KEY,
        recipe_id TEXT NOT NULL,
        name TEXT NOT NULL,
        amount REAL NOT NULL,
        unit TEXT NOT NULL,
        FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
      )
    `);

    // Create instructions table
    db.exec(`
      CREATE TABLE IF NOT EXISTS instructions (
        id TEXT PRIMARY KEY,
        recipe_id TEXT NOT NULL,
        step_number INTEGER NOT NULL,
        instruction TEXT NOT NULL,
        FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
      )
    `);

    // Create grocery_lists table
    db.exec(`
      CREATE TABLE IF NOT EXISTS grocery_lists (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // Create grocery_items table
    db.exec(`
      CREATE TABLE IF NOT EXISTS grocery_items (
        id TEXT PRIMARY KEY,
        grocery_list_id TEXT NOT NULL,
        name TEXT NOT NULL,
        amount REAL NOT NULL,
        unit TEXT NOT NULL,
        checked INTEGER DEFAULT 0,
        recipe_id TEXT,
        FOREIGN KEY (grocery_list_id) REFERENCES grocery_lists(id) ON DELETE CASCADE,
        FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE SET NULL
      )
    `);

    // Create meal_plans table
    db.exec(`
      CREATE TABLE IF NOT EXISTS meal_plans (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        recipe_id TEXT NOT NULL,
        meal_type TEXT NOT NULL CHECK(meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
        FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
      )
    `);

    console.log('✅ Database initialized successfully');
    return true;
  } catch (error: any) {
    console.error('❌ Database initialization failed:', error.message);
    return false;
  }
}

export function getDatabase() {
  return db;
}

export function isDbAvailable() {
  return isDatabaseAvailable;
}

export default db;

