# Database Inspection Guide

## Database Location
The SQLite database is stored at: `backend/data/recipes.db`

## Methods to Check the Database

### Method 1: Using the Check Script (Recommended)
Run the provided script to see database status and contents:

```bash
cd backend
npm run db:check
```

This will show:
- Database file location
- All tables and their row counts
- Sample data from each table
- Table schemas

### Method 2: Using SQLite Command Line
If you have SQLite installed:

```bash
# Navigate to backend/data
cd backend/data

# Open the database
sqlite3 recipes.db

# Then run SQL commands:
.tables                    # List all tables
.schema                    # Show all table schemas
.schema recipes           # Show schema for specific table
SELECT * FROM recipes;    # View all recipes
SELECT COUNT(*) FROM recipes;  # Count recipes
.quit                     # Exit
```

### Method 3: Using a GUI Tool
Popular SQLite GUI tools:
- **DB Browser for SQLite** (Free): https://sqlitebrowser.org/
- **SQLiteStudio** (Free): https://sqlitestudio.pl/
- **DBeaver** (Free): https://dbeaver.io/

1. Download and install one of the tools
2. Open the database file: `backend/data/recipes.db`
3. Browse tables and run queries

### Method 4: Using Node.js REPL
```bash
cd backend
node
```

Then in the Node.js REPL:
```javascript
const Database = require('better-sqlite3');
const db = new Database('./data/recipes.db');

// List tables
db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();

// Query recipes
db.prepare("SELECT * FROM recipes").all();

// Close
db.close();
```

## Database Tables

The database contains the following tables:
- `recipes` - Main recipe information
- `ingredients` - Recipe ingredients
- `instructions` - Recipe instructions/steps
- `grocery_lists` - Grocery lists
- `grocery_items` - Items in grocery lists
- `meal_plans` - Meal planning data

## Common Queries

### View all recipes
```sql
SELECT * FROM recipes;
```

### View recipe with ingredients
```sql
SELECT 
  r.*,
  i.name as ingredient_name,
  i.amount,
  i.unit
FROM recipes r
LEFT JOIN ingredients i ON r.id = i.recipe_id
WHERE r.id = 'your-recipe-id';
```

### Count recipes
```sql
SELECT COUNT(*) as total_recipes FROM recipes;
```

### View all ingredients for a recipe
```sql
SELECT * FROM ingredients WHERE recipe_id = 'your-recipe-id';
```

### View all instructions for a recipe
```sql
SELECT * FROM instructions WHERE recipe_id = 'your-recipe-id' ORDER BY step_number;
```

