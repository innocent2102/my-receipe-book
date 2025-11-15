import express from 'express';
import cors from 'cors';
import { initDatabase, isDbAvailable } from './database.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database (will gracefully fail if better-sqlite3 is not available)
let dbInitialized = false;
initDatabase().then((result) => {
  dbInitialized = result;
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Backend is running',
    database: isDbAvailable() ? 'available' : 'unavailable'
  });
});

// TODO: Add your API routes here
// app.use('/api/recipes', recipesRouter);
// app.use('/api/grocery-lists', groceryListsRouter);

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  if (!dbInitialized) {
    console.log('⚠️  Running without database - API endpoints will have limited functionality');
  }
});

