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
  Snackbar,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DownloadIcon from '@mui/icons-material/Download';
import EditIcon from '@mui/icons-material/Edit';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { AddToGroceryDialog } from '../../../components/AddToGroceryDialog';
import { ThemeToggle } from '../../../components/ThemeToggle';
import { LanguageToggle } from '../../../components/LanguageToggle';
import { UserMenu } from '../../../components/UserMenu';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { downloadRecipeExport, slugify } from '../../../lib/recipeExport';
import { youTubeEmbedUrl } from '../../../lib/youtube';
import { useTranslation } from '../../../i18n/LanguageProvider';

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
  videoUrl?: string;
};

export default function RecipeDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const recipeId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const { status } = useSession();
  const { t, tPlural } = useTranslation();
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groceryOpen, setGroceryOpen] = useState(false);
  const [groceryAdded, setGroceryAdded] = useState<number | null>(null);

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
        throw new Error(t('detail.notFound'));
      }
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error || t('detail.loadError'));
      }
      setRecipe(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('detail.loadError'));
      setRecipe(null);
    } finally {
      setLoading(false);
    }
  }, [recipeId, router, callbackUrl, t]);

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

  const instructionSteps =
    recipe?.instructions?.filter((step) => step.trim() !== '') ?? [];

  const videoEmbedUrl = recipe?.videoUrl ? youTubeEmbedUrl(recipe.videoUrl) : null;

  const groceryCandidates = (recipe?.ingredients ?? []).filter(
    (ingredient) => ingredient.name.trim() !== ''
  );

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {t('detail.title')}
          </Typography>
          <LanguageToggle />
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
            {t('detail.back')}
          </Button>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<ShoppingCartIcon />}
              onClick={() => setGroceryOpen(true)}
              disabled={!groceryCandidates.length}
            >
              {t('grocery.addToList')}
            </Button>
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={() => {
                if (recipe) router.push(`/recipes/${encodeURIComponent(recipe.id)}/edit`);
              }}
              disabled={!recipe}
            >
              {t('common.edit')}
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => {
                if (recipe) downloadRecipeExport([recipe], slugify(recipe.title));
              }}
              disabled={!recipe}
            >
              {t('common.export')}
            </Button>
          </Box>
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
                <Chip size="small" label={t('recipes.chip.prep', { minutes: recipe.prepTime })} />
              ) : null}
              {recipe.cookTime != null ? (
                <Chip size="small" label={t('recipes.chip.cook', { minutes: recipe.cookTime })} />
              ) : null}
              {totalTime != null ? (
                <Chip
                  size="small"
                  color="primary"
                  label={t('recipes.chip.total', { minutes: totalTime })}
                />
              ) : null}
              {recipe.servings != null ? (
                <Chip
                  size="small"
                  label={t('recipes.chip.servings', { count: recipe.servings })}
                />
              ) : null}
              {recipe.tags?.map((tag) => (
                <Chip key={tag} size="small" variant="outlined" label={tag} />
              ))}
            </Stack>

            <Divider sx={{ mb: 3 }} />

            {videoEmbedUrl ? (
              <>
                <Typography variant="h6" component="h2" gutterBottom>
                  {t('detail.video')}
                </Typography>
                <Box
                  sx={{
                    position: 'relative',
                    width: '100%',
                    pt: '56.25%',
                    mb: 3,
                    borderRadius: 1,
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    component="iframe"
                    src={videoEmbedUrl}
                    title={t('detail.video')}
                    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      border: 0,
                    }}
                  />
                </Box>
              </>
            ) : null}

            <Typography variant="h6" component="h2" gutterBottom>
              {t('detail.ingredients')}
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
                {t('detail.noIngredients')}
              </Typography>
            )}

            {instructionSteps.length > 0 ? (
              <>
                <Typography variant="h6" component="h2" gutterBottom>
                  {t('detail.instructions')}
                </Typography>
                <Box component="ol" sx={{ pl: 3, m: 0 }}>
                  {instructionSteps.map((step, index) => (
                    <Box component="li" key={index} sx={{ mb: 1.5 }}>
                      <Typography variant="body1">{step}</Typography>
                    </Box>
                  ))}
                </Box>
              </>
            ) : null}
          </Paper>
        ) : null}
      </Container>

      <AddToGroceryDialog
        open={groceryOpen}
        recipeId={recipe?.id}
        ingredients={groceryCandidates}
        onClose={() => setGroceryOpen(false)}
        onAdded={(count) => setGroceryAdded(count)}
      />

      <Snackbar
        open={groceryAdded !== null}
        autoHideDuration={5000}
        onClose={() => setGroceryAdded(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity="success"
          onClose={() => setGroceryAdded(null)}
          action={
            <Button color="inherit" size="small" onClick={() => router.push('/grocery')}>
              {t('grocery.viewList')}
            </Button>
          }
        >
          {tPlural('grocery.added', groceryAdded ?? 0, { count: groceryAdded ?? 0 })}
        </Alert>
      </Snackbar>
    </>
  );
}
