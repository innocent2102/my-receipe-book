'use client';

import {
  Alert,
  AppBar,
  Box,
  Button,
  CircularProgress,
  Container,
  IconButton,
  Paper,
  Snackbar,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BookmarkRemoveIcon from '@mui/icons-material/BookmarkRemove';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { AddToGroceryDialog, groceryCandidates } from '../../components/AddToGroceryDialog';
import { RecipeRows, type RecipeSummary } from '../../components/RecipeRows';
import { OfflineIndicator } from '../../components/OfflineIndicator';
import { ThemeToggle } from '../../components/ThemeToggle';
import { LanguageToggle } from '../../components/LanguageToggle';
import { UserMenu } from '../../components/UserMenu';
import { useTranslation } from '../../i18n/LanguageProvider';
import { useOnline } from '../../lib/useOnline';
import { readOffline, writeOffline } from '../../lib/offlineStore';

const PLANNED_CACHE_KEY = 'planned.list';

export default function PlannedPage() {
  const router = useRouter();
  const { status } = useSession();
  const { t, tPlural } = useTranslation();
  const online = useOnline();

  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingOfflineCopy, setUsingOfflineCopy] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [groceryTarget, setGroceryTarget] = useState<RecipeSummary | null>(null);
  const [groceryAdded, setGroceryAdded] = useState<number | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated' && online) {
      router.replace('/login?callbackUrl=%2Fplanned');
    }
  }, [status, online, router]);

  const loadPlanned = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/planned', { cache: 'no-store' });
      const json = (await res.json()) as {
        success?: boolean;
        data?: RecipeSummary[];
        error?: string;
      };
      if (res.status === 401) {
        router.replace('/login?callbackUrl=%2Fplanned');
        return;
      }
      if (!res.ok || !json.success || !Array.isArray(json.data)) {
        throw new Error(json.error || t('planned.loadError'));
      }
      setRecipes(json.data);
      writeOffline(PLANNED_CACHE_KEY, json.data);
      setUsingOfflineCopy(false);
    } catch (e) {
      // Fall back to the last successful load so the plan stays readable offline.
      const cached = readOffline<RecipeSummary[]>(PLANNED_CACHE_KEY);
      if (cached && cached.length > 0) {
        setRecipes(cached);
        setUsingOfflineCopy(true);
        setError(null);
      } else {
        setError(e instanceof Error ? e.message : t('planned.loadError'));
        setRecipes([]);
      }
    } finally {
      setLoading(false);
    }
  }, [router, t]);

  useEffect(() => {
    if (status === 'authenticated') {
      void loadPlanned();
    } else if (status === 'unauthenticated') {
      if (!online) {
        const cached = readOffline<RecipeSummary[]>(PLANNED_CACHE_KEY);
        if (cached && cached.length > 0) {
          setRecipes(cached);
          setUsingOfflineCopy(true);
        }
      }
      setLoading(false);
    }
  }, [status, online, loadPlanned]);

  const handleRemove = async (recipeId: string) => {
    setRemovingId(recipeId);
    setError(null);
    try {
      const res = await fetch(`/api/planned?id=${encodeURIComponent(recipeId)}`, {
        method: 'DELETE',
      });
      const json = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        data?: RecipeSummary[];
        error?: string;
      };
      if (!res.ok || !json.success) {
        throw new Error(json.error || t('planned.updateFailed'));
      }
      const next = Array.isArray(json.data) ? json.data : recipes.filter((r) => r.id !== recipeId);
      setRecipes(next);
      writeOffline(PLANNED_CACHE_KEY, next);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('planned.updateFailed'));
    } finally {
      setRemovingId(null);
    }
  };

  if (status === 'unauthenticated' && online) {
    return null;
  }

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            aria-label={t('planned.backAria')}
            onClick={() => router.push('/recipes')}
            sx={{ mr: 1 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {t('planned.title')}
          </Typography>
          <OfflineIndicator online={online} />
          <Tooltip title={t('grocery.openAria')}>
            <IconButton
              color="inherit"
              aria-label={t('grocery.openAria')}
              onClick={() => router.push('/grocery')}
            >
              <ShoppingCartIcon />
            </IconButton>
          </Tooltip>
          <LanguageToggle />
          <ThemeToggle />
          <UserMenu />
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {usingOfflineCopy ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            {t('offline.cachedRecipes')}
          </Alert>
        ) : null}

        {error ? (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        ) : null}

        {status === 'loading' || loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : recipes.length === 0 ? (
          <Paper elevation={2} sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {t('planned.empty.title')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {t('planned.empty.body')}
            </Typography>
            <Button variant="contained" onClick={() => router.push('/recipes')}>
              {t('planned.empty.cta')}
            </Button>
          </Paper>
        ) : (
          <Paper elevation={2} sx={{ overflow: 'hidden' }}>
            <RecipeRows
              recipes={recipes}
              onOpen={(recipe) => router.push(`/recipes/${encodeURIComponent(recipe.id)}`)}
              actionsSpacing={14}
              renderActions={(recipe) => (
                <>
                  <IconButton
                    aria-label={t('grocery.addAria', { title: recipe.title })}
                    onClick={() => setGroceryTarget(recipe)}
                    disabled={!groceryCandidates(recipe).length}
                    color="secondary"
                  >
                    <ShoppingCartIcon />
                  </IconButton>
                  <IconButton
                    edge="end"
                    aria-label={t('planned.removeAria', { title: recipe.title })}
                    onClick={() => handleRemove(recipe.id)}
                    disabled={removingId !== null || !online}
                    color="error"
                  >
                    <BookmarkRemoveIcon />
                  </IconButton>
                </>
              )}
            />
          </Paper>
        )}
      </Container>

      <AddToGroceryDialog
        open={Boolean(groceryTarget)}
        recipeId={groceryTarget?.id}
        ingredients={groceryTarget ? groceryCandidates(groceryTarget) : []}
        onClose={() => setGroceryTarget(null)}
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
