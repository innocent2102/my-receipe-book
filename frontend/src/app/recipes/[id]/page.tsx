'use client';

import {
  Container,
  Typography,
  Box,
  AppBar,
  Toolbar,
  Button,
  CircularProgress,
  Alert,
  Snackbar,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DownloadIcon from '@mui/icons-material/Download';
import EditIcon from '@mui/icons-material/Edit';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import ShareIcon from '@mui/icons-material/Share';
import { AddToGroceryDialog } from '../../../components/AddToGroceryDialog';
import { RecipeView } from '../../../components/RecipeView';
import { ShareRecipeDialog } from '../../../components/ShareRecipeDialog';
import { ThemeToggle } from '../../../components/ThemeToggle';
import { LanguageToggle } from '../../../components/LanguageToggle';
import { UserMenu } from '../../../components/UserMenu';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { downloadRecipeExport, slugify } from '../../../lib/recipeExport';
import { useTranslation } from '../../../i18n/LanguageProvider';
import { OfflineIndicator } from '../../../components/OfflineIndicator';
import { useOnline } from '../../../lib/useOnline';
import { readOffline, writeOffline } from '../../../lib/offlineStore';

const DETAIL_CACHE_PREFIX = 'recipes.detail.';

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
  sourceUrl?: string;
};

export default function RecipeDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const recipeId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const { status } = useSession();
  const { t, tPlural } = useTranslation();
  const online = useOnline();
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groceryOpen, setGroceryOpen] = useState(false);
  const [groceryAdded, setGroceryAdded] = useState<number | null>(null);
  const [usingOfflineCopy, setUsingOfflineCopy] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const callbackUrl = recipeId ? `/recipes/${encodeURIComponent(recipeId)}` : '/recipes';

  useEffect(() => {
    if (status === 'unauthenticated' && online) {
      router.replace(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }
  }, [status, online, router, callbackUrl]);

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
      writeOffline(`${DETAIL_CACHE_PREFIX}${recipeId}`, json.data);
      setUsingOfflineCopy(false);
    } catch (e) {
      const cached = readOffline<RecipeDetail>(`${DETAIL_CACHE_PREFIX}${recipeId}`);
      if (cached) {
        setRecipe(cached);
        setUsingOfflineCopy(true);
        setError(null);
      } else {
        setError(e instanceof Error ? e.message : t('detail.loadError'));
        setRecipe(null);
      }
    } finally {
      setLoading(false);
    }
  }, [recipeId, router, callbackUrl, t]);

  useEffect(() => {
    if (status === 'authenticated') {
      loadRecipe();
    } else if (status === 'unauthenticated') {
      if (!online && recipeId) {
        const cached = readOffline<RecipeDetail>(`${DETAIL_CACHE_PREFIX}${recipeId}`);
        if (cached) {
          setRecipe(cached);
          setUsingOfflineCopy(true);
        }
      }
      setLoading(false);
    }
  }, [status, online, recipeId, loadRecipe]);

  if (status === 'unauthenticated' && online) {
    return null;
  }

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
          <OfflineIndicator online={online} />
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
              disabled={!recipe || !online}
            >
              {t('common.edit')}
            </Button>
            <Button
              variant="outlined"
              startIcon={<ShareIcon />}
              onClick={() => setShareOpen(true)}
              disabled={!recipe || !online}
            >
              {t('share.action')}
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

        {usingOfflineCopy && (
          <Alert severity="info" sx={{ mb: 3 }}>
            {t('offline.cachedRecipes')}
          </Alert>
        )}

        {status === 'loading' || loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : recipe ? (
          <RecipeView recipe={recipe} />
        ) : null}
      </Container>

      <ShareRecipeDialog
        open={shareOpen}
        recipeId={recipe?.id}
        onClose={() => setShareOpen(false)}
      />

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
