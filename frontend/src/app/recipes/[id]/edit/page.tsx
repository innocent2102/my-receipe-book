'use client';

import {
  Container,
  Typography,
  Box,
  AppBar,
  Toolbar,
  IconButton,
  Paper,
  CircularProgress,
  Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { ThemeToggle } from '../../../../components/ThemeToggle';
import { LanguageToggle } from '../../../../components/LanguageToggle';
import { UserMenu } from '../../../../components/UserMenu';
import { RecipeForm, RecipeFormValues } from '../../../../components/RecipeForm';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useTranslation } from '../../../../i18n/LanguageProvider';

type RecipeDetail = {
  id: string;
  title: string;
  description?: string;
  ingredients?: Array<{ id: string; name: string; amount: number; unit: string }>;
  instructions?: string[];
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  tags?: string[];
};

export default function EditRecipePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const recipeId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const { status } = useSession();
  const { t } = useTranslation();
  const [initialValues, setInitialValues] = useState<RecipeFormValues | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const detailUrl = recipeId ? `/recipes/${encodeURIComponent(recipeId)}` : '/recipes';
  const callbackUrl = `${detailUrl}/edit`;

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
      const recipe = json.data;
      setInitialValues({
        title: recipe.title,
        description: recipe.description,
        ingredients: (recipe.ingredients ?? []).map(({ name, amount, unit }) => ({
          name,
          amount,
          unit,
        })),
        instructions: recipe.instructions ?? [],
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        servings: recipe.servings,
        tags: recipe.tags ?? [],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : t('detail.loadError'));
      setInitialValues(null);
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

  const handleSubmit = async (values: RecipeFormValues) => {
    if (!recipeId) return;

    const res = await fetch(`/api/recipes?id=${encodeURIComponent(recipeId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });

    const json = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      error?: string;
    };

    if (res.status === 401) {
      router.replace(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
      return;
    }

    if (!res.ok || !json.success) {
      throw new Error(json.error || t('edit.saveFailedStatus', { status: res.status }));
    }

    router.push(detailUrl);
    router.refresh();
  };

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => router.push(detailUrl)}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {t('edit.appBarTitle')}
          </Typography>
          <LanguageToggle />
          <ThemeToggle />
          <UserMenu />
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {status === 'loading' || loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : initialValues ? (
          <Paper elevation={3} sx={{ p: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              {t('edit.heading')}
            </Typography>

            <RecipeForm
              initialValues={initialValues}
              submitLabel={t('edit.save')}
              submittingLabel={t('edit.saving')}
              onSubmit={handleSubmit}
              onCancel={() => router.push(detailUrl)}
            />
          </Paper>
        ) : null}
      </Container>
    </>
  );
}
