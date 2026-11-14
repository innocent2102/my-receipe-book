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
  Divider,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DownloadIcon from '@mui/icons-material/Download';
import { ThemeToggle } from '../../../components/ThemeToggle';
import { UserMenu } from '../../../components/UserMenu';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { downloadRecipeExport, slugify } from '../../../lib/recipeExport';

type Ingredient = {
  id: string;
  name: string;
  amount: number;
  unit: string;
};

type RecipeDetail = {
  id: string;
  title: string;
  description?: string;
  ingredients?: Ingredient[];
  instructions?: string[];
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  tags?: string[];
};

export default function RecipeDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const recipeId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const { status } = useSession();
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const callbackUrl = recipeId ? `/recipes/${encodeURIComponent(recipeId)}` : '/recipes';

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }
  }, [status, router, callbackUrl]);

  const loadRecipe = useCallback(async () => {
    if (!recipeId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/recipes?id=${encodeURIComponent(recipeId)}`);
      const json = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        data?: RecipeDetail;
        error?: string;
      };
      if (res.status === 401) {
        router.replace(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
        return;
      }
      if (res.status === 404) {
        throw new Error('Recipe not found or you no longer have access.');
      }
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error || 'Could not load this recipe');
      }
      setRecipe(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load this recipe');
      setRecipe(null);
    } finally {
      setLoading(false);
    }
  }, [recipeId, router, callbackUrl]);

  useEffect(() => {
    if (status === 'authenticated') {
      loadRecipe();
    } else if (status === 'unauthenticated') {
      setLoading(false);
    }
  }, [status, loadRecipe]);

  if (status === 'unauthenticated') {
    return null;
  }

  const totalTime =
    recipe && (recipe.prepTime != null || recipe.cookTime != null)
      ? (recipe.prepTime ?? 0) + (recipe.cookTime ?? 0)
      : null;

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Recipe
          </Typography>
          <ThemeToggle />
          <UserMenu />
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2,
            mb: 3,
          }}
        >
          <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/recipes')}>
            Back to recipes
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => {
              if (recipe) downloadRecipeExport([recipe], slugify(recipe.title));
            }}
            disabled={!recipe}
          >
            Export
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {status === 'loading' || loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : recipe ? (
          <Paper elevation={2} sx={{ p: { xs: 3, sm: 4 } }}>
            <Typography variant="h4" component="h1" gutterBottom>
              {recipe.title}
            </Typography>

            {recipe.description ? (
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                {recipe.description}
              </Typography>
            ) : null}

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 3 }}>
              {recipe.prepTime != null ? (
                <Chip size="small" label={`Prep: ${recipe.prepTime} min`} />
              ) : null}
              {recipe.cookTime != null ? (
                <Chip size="small" label={`Cook: ${recipe.cookTime} min`} />
              ) : null}
              {totalTime != null ? (
                <Chip size="small" color="primary" label={`Total: ${totalTime} min`} />
              ) : null}
              {recipe.servings != null ? (
                <Chip size="small" label={`Servings: ${recipe.servings}`} />
              ) : null}
              {recipe.tags?.map((tag) => (
                <Chip key={tag} size="small" variant="outlined" label={tag} />
              ))}
            </Stack>

            <Divider sx={{ mb: 3 }} />

            <Typography variant="h6" component="h2" gutterBottom>
              Ingredients
            </Typography>
            {recipe.ingredients && recipe.ingredients.length > 0 ? (
              <List dense disablePadding sx={{ mb: 3 }}>
                {recipe.ingredients.map((ing) => (
                  <ListItem key={ing.id} disableGutters sx={{ py: 0.5 }}>
                    <ListItemText
                      primary={[ing.amount || '', ing.unit || '', ing.name]
                        .map((part) => String(part).trim())
                        .filter((part) => part !== '')
                        .join(' ')}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                No ingredients listed for this recipe.
              </Typography>
            )}

            <Typography variant="h6" component="h2" gutterBottom>
              Instructions
            </Typography>
            {recipe.instructions && recipe.instructions.length > 0 ? (
              <Box component="ol" sx={{ pl: 3, m: 0 }}>
                {recipe.instructions.map((step, index) => (
                  <Box component="li" key={index} sx={{ mb: 1.5 }}>
                    <Typography variant="body1">{step}</Typography>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No instructions listed for this recipe.
              </Typography>
            )}
          </Paper>
        ) : null}
      </Container>
    </>
  );
}
