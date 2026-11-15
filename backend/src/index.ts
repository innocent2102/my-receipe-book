import express from 'express';
import cors from 'cors';
import { initDatabase, isDbAvailable } from './database.js';
import recipesRouter from './routes/recipes.js';
import ingredientsRouter from './routes/ingredients.js';
import groceryRouter from './routes/grocery.js';
import plannedRouter from './routes/planned.js';
import shareRouter from './routes/share.js';
import imagesRouter from './routes/images.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
// Raised from the 100kb default so bulk recipe imports fit.
app.use(express.json({ limit: '5mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Backend is running',
    database: isDbAvailable() ? 'available' : 'unavailable',
  });
});

app.use('/api/recipes', recipesRouter);
app.use('/api/ingredients', ingredientsRouter);
app.use('/api/grocery', groceryRouter);
app.use('/api/planned', plannedRouter);
app.use('/api/share', shareRouter);
app.use('/api/images', imagesRouter);

async function bootstrap() {
  const dbInitialized = await initDatabase();

  app.listen(PORT, () => {
    console.log(`🚀 Backend server running on http://localhost:${PORT}`);
    if (!dbInitialized) {
      console.log('⚠️  Running without database - API endpoints will have limited functionality');
    }
    if (process.env.NODE_ENV === 'production' && !process.env.RECIPES_PROXY_SECRET?.trim()) {
      console.warn(
      '⚠️  RECIPES_PROXY_SECRET is not set — recipe APIs can be impersonated. Set it in production.');
    }
  });
}

bootstrap();

