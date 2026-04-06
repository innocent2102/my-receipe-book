import express from 'express';
import cors from 'cors';
import { initDatabase, isDbAvailable } from './database.js';
import recipesRouter from './routes/recipes.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Backend is running',
    database: isDbAvailable() ? 'available' : 'unavailable',
  });
});

app.use('/api/recipes', recipesRouter);

async function bootstrap() {
  const dbInitialized = await initDatabase();

  app.listen(PORT, () => {
    console.log(`🚀 Backend server running on http://localhost:${PORT}`);
    if (!dbInitialized) {
      console.log('⚠️  Running without database - API endpoints will have limited functionality');
    }
  });
}

bootstrap();

