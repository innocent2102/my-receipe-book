import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Script is in backend/scripts/, so go up one level to backend/, then into data/
const dbPath = path.join(__dirname, '../data/recipes.db');

// Try to import better-sqlite3
let Database: any = null;
try {
  const betterSqlite3 = await import('better-sqlite3');
  Database = betterSqlite3.default;
} catch (error: any) {
  console.error('❌ Error: better-sqlite3 is not available');
  console.error('   Message:', error.message);
  console.error('\n📋 To fix this:');
  console.error('   1. Install Visual Studio Build Tools');
  console.error('      Download: https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022');
  console.error('      Select "Desktop development with C++" workload during installation');
  console.error('   2. Rebuild better-sqlite3:');
  console.error('      npm rebuild better-sqlite3');
  console.error('\n💡 The database file would be located at:');
  console.error(`   ${dbPath}`);
  process.exit(1);
}

try {
  // Check if database file exists
  if (!existsSync(dbPath)) {
    console.log('📊 Database Status:');
    console.log('==================\n');
    console.log(`Database file: ${dbPath}`);
    console.log('❌ Database file does not exist yet.');
    console.log('\n💡 The database will be created automatically when:');
    console.log('   1. better-sqlite3 is properly compiled');
    console.log('   2. The backend server starts');
    console.log('\n📝 Expected location:', dbPath);
    process.exit(0);
  }

  const db = new Database(dbPath);

  console.log('📊 Database Status:');
  console.log('==================\n');
  console.log(`Database file: ${dbPath}`);
  console.log(`Database exists: ${db.exists ? 'Yes' : 'No'}\n`);

  // Get all table names
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all() as Array<{ name: string }>;

  console.log(`Tables found: ${tables.length}\n`);

  // Show data from each table
  for (const table of tables) {
    const tableName = table.name;
    const count = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get() as { count: number };
    
    console.log(`📋 Table: ${tableName}`);
    console.log(`   Rows: ${count.count}`);

    if (count.count > 0) {
      const rows = db.prepare(`SELECT * FROM ${tableName} LIMIT 5`).all();
      console.log(`   Sample data (first 5 rows):`);
      rows.forEach((row, index) => {
        console.log(`   ${index + 1}.`, JSON.stringify(row, null, 2));
      });
    }
    console.log('');
  }

  // Show schema for each table
  console.log('\n📐 Table Schemas:');
  console.log('==================\n');
  for (const table of tables) {
    const schema = db
      .prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name=?`)
      .get(table.name) as { sql: string };
    console.log(`${table.name}:`);
    console.log(schema.sql);
    console.log('');
  }

  db.close();
  console.log('✅ Database check complete!');
} catch (error: any) {
  console.error('❌ Error checking database:', error.message);
  console.error('\nMake sure:');
  console.error('1. better-sqlite3 is properly installed');
  console.error('2. The database file exists at:', dbPath);
  console.error('3. You have the necessary permissions');
  process.exit(1);
}

