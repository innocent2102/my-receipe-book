'use client';

import {
  Container,
  Typography,
  Box,
  AppBar,
  Toolbar,
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Alert,
  Chip,
  Stack,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { ThemeToggle } from '../../components/ThemeToggle';
import { UserMenu } from '../../components/UserMenu';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { getApiBaseUrl } from '../../lib/api';

type RecipeListItem = {
  id: string;
  title: string;
  description?: string;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  tags?: string[];
};

export default function RecipesPage() {
  const router = useRouter();
  const [recipes, setRecipes] = useState<RecipeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRecipes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/recipes`);
      const json = (await res.json()) as {
        success?: boolean;
        data?: RecipeListItem[];
        error?: string;
      };
      if (!res.ok || !json.success || !Array.isArray(json.data)) {
        throw new Error(json.error || 'Could not load recipes');
      }
      setRecipes(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load recipes');
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            My Recipes
          </Typography>
          <ThemeToggle />
          <UserMenu />
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" component="h1">
            My Recipes
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => router.push('/recipes/add')}
            size="large"
          >
            Add Recipe
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}. Run the backend (<code>npm run dev</code> from the repo root, or{' '}
            <code>npm run dev:backend</code>). Default API is <code>http://localhost:3001</code>;
            set <code>NEXT_PUBLIC_API_URL</code> in <code>frontend/.env.local</code> if yours differs.
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : recipes.length === 0 ? (
          <Paper elevation={2} sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No recipes yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Start building your recipe collection by adding your first recipe!
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => router.push('/recipes/add')}
            >
              Create Your First Recipe
            </Button>
          </Paper>
        ) : (
          <Paper elevation={2} sx={{ overflow: 'hidden' }}>
            <List disablePadding>
              {recipes.map((recipe, index) => (
                <Box key={recipe.id}>
                  {index > 0 ? <Box sx={{ borderTop: 1, borderColor: 'divider' }} /> : null}
                  <ListItem alignItems="flex-start" sx={{ py: 2, px: 3 }}>
                    <ListItemText
                      primary={recipe.title}
                      primaryTypographyProps={{ variant: 'h6', component: 'div' }}
                      secondary={
                        <>
                          {recipe.description ? (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                              {recipe.description}
                            </Typography>
                          ) : null}
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                            {recipe.prepTime != null ? (
                              <Chip size="small" label={`Prep: ${recipe.prepTime} min`} />
                            ) : null}
                            {recipe.cookTime != null ? (
                              <Chip size="small" label={`Cook: ${recipe.cookTime} min`} />
                            ) : null}
                            {recipe.servings != null ? (
                              <Chip size="small" label={`Servings: ${recipe.servings}`} />
                            ) : null}
                            {recipe.tags?.map((tag) => (
                              <Chip key={tag} size="small" variant="outlined" label={tag} />
                            ))}
                          </Stack>
                        </>
                      }
                      secondaryTypographyProps={{ component: 'div' }}
                    />
                  </ListItem>
                </Box>
              ))}
            </List>
          </Paper>
        )}
      </Container>
    </>
  );
}
