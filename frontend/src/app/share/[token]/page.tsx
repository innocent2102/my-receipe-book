'use client';

import {
  Alert,
  AppBar,
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Toolbar,
  Typography,
} from '@mui/material';
import BookmarkAddIcon from '@mui/icons-material/BookmarkAdd';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { RecipeView, type RecipeViewData } from '../../../components/RecipeView';
import { ThemeToggle } from '../../../components/ThemeToggle';
import { LanguageToggle } from '../../../components/LanguageToggle';
import { useTranslation } from '../../../i18n/LanguageProvider';

/**
 * Public page for a shared recipe. Anyone holding the token may read it; saving a
 * copy requires signing in, which is why the sign-in CTA keeps the link as callback.
 */
export default function SharedRecipePage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = Array.isArray(params?.token) ? params.token[0] : params?.token;
  const { status } = useSession();
  const { t } = useTranslation();

  const [recipe, setRecipe] = useState<RecipeViewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadShared = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/share/view?token=${encodeURIComponent(token)}`, {
        cache: 'no-store',
      });
      const json = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        data?: { recipe: RecipeViewData };
        error?: string;
      };
      if (res.status === 404) {
        throw new Error(t('share.notFound'));
      }
      if (!res.ok || !json.success || !json.data?.recipe) {
        throw new Error(json.error || t('share.loadError'));
      }
      setRecipe(json.data.recipe);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('share.loadError'));
      setRecipe(null);
    } finally {
      setLoading(false);
    }
  }, [token, t]);

  useEffect(() => {
    void loadShared();
  }, [loadShared]);

  const saveCopy = async () => {
    if (!token) return;
    if (status !== 'authenticated') {
      router.push(`/login?callbackUrl=${encodeURIComponent(`/share/${token}`)}`);
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/share/view?token=${encodeURIComponent(token)}`, {
        method: 'POST',
      });
      const json = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        data?: { id: string };
        error?: string;
      };
      if (res.status === 409) {
        throw new Error(t('share.alreadyYours'));
      }
      if (!res.ok || !json.success || !json.data?.id) {
        throw new Error(json.error || t('share.saveError'));
      }
      setSavedId(json.data.id);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : t('share.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {t('common.appName')}
          </Typography>
          <LanguageToggle />
          <ThemeToggle />
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        {error ? (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        ) : null}

        {saveError ? (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setSaveError(null)}>
            {saveError}
          </Alert>
        ) : null}

        {savedId ? (
          <Alert
            severity="success"
            sx={{ mb: 3 }}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => router.push(`/recipes/${encodeURIComponent(savedId)}`)}
              >
                {t('share.openSaved')}
              </Button>
            }
          >
            {t('share.saved')}
          </Alert>
        ) : null}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : recipe ? (
          <>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 2,
                mb: 3,
                flexWrap: 'wrap',
              }}
            >
              <Typography variant="body2" color="text.secondary">
                {t('share.sharedWithYou')}
              </Typography>
              <Button
                variant="contained"
                startIcon={<BookmarkAddIcon />}
                onClick={saveCopy}
                disabled={saving || savedId !== null || status === 'loading'}
              >
                {saving
                  ? t('share.saving')
                  : status === 'authenticated'
                    ? t('share.saveToMyBook')
                    : t('share.signInToSave')}
              </Button>
            </Box>
            <RecipeView recipe={recipe} />
          </>
        ) : !error ? (
          <Paper elevation={2} sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              {t('share.notFound')}
            </Typography>
          </Paper>
        ) : null}
      </Container>
    </>
  );
}
