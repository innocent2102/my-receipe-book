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
  ListItemButton,
  ListItemText,
  CircularProgress,
  Alert,
  Chip,
  Stack,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import { ThemeToggle } from '../../components/ThemeToggle';
import { LanguageToggle } from '../../components/LanguageToggle';
import { UserMenu } from '../../components/UserMenu';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { downloadRecipeExport, exportDateStamp } from '../../lib/recipeExport';
import { useTranslation } from '../../i18n/LanguageProvider';

type RecipeListItem = {
  id: string;
  title: string;
  description?: string;
  ingredients?: { name?: string; amount?: number; unit?: string }[];
  instructions?: string[];
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  tags?: string[];
};

export default function RecipesPage() {
  const router = useRouter();
  const { status } = useSession();
  const { t, tPlural } = useTranslation();
  const [recipes, setRecipes] = useState<RecipeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RecipeListItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteDialogError, setDeleteDialogError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login?callbackUrl=/recipes');
    }
  }, [status, router]);

  const loadRecipes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/recipes');
      const json = (await res.json()) as {
        success?: boolean;
        data?: RecipeListItem[];
        error?: string;
      };
      if (res.status === 401) {
        router.replace('/login?callbackUrl=/recipes');
        return;
      }
      if (!res.ok || !json.success || !Array.isArray(json.data)) {
        throw new Error(json.error || t('recipes.loadError'));
      }
      setRecipes(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('recipes.loadError'));
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  }, [router, t]);

  useEffect(() => {
    if (status === 'authenticated') {
      loadRecipes();
    } else if (status === 'unauthenticated') {
      setLoading(false);
    }
  }, [status, loadRecipes]);

  const handleExportAll = () => {
    if (recipes.length === 0) return;
    downloadRecipeExport(recipes, `my-recipes-${exportDateStamp()}`);
  };

  const handleImportFile = async (file: File) => {
    setImporting(true);
    setError(null);
    setImportResult(null);
    try {
      const text = await file.text();
      let payload: unknown;
      try {
        payload = JSON.parse(text);
      } catch {
        throw new Error(t('recipes.import.invalidJson'));
      }

      const res = await fetch('/api/recipes/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        data?: { imported?: number; skipped?: number };
        error?: string;
      };

      if (res.status === 401) {
        router.replace('/login?callbackUrl=/recipes');
        return;
      }
      if (!res.ok || !json.success) {
        throw new Error(json.error || t('recipes.import.failed'));
      }

      const imported = json.data?.imported ?? 0;
      const skipped = json.data?.skipped ?? 0;
      setImportResult(
        [
          tPlural('recipes.import.success', imported),
          skipped > 0 ? tPlural('recipes.import.skipped', skipped) : null,
        ]
          .filter(Boolean)
          .join(' ')
      );
      await loadRecipes();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('recipes.import.failed'));
    } finally {
      setImporting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    setDeleteDialogError(null);
    try {
      const res = await fetch(
        `/api/recipes?id=${encodeURIComponent(deleteTarget.id)}`,
        { method: 'DELETE' }
      );
      const json = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
      if (res.status === 401) {
        router.replace('/login?callbackUrl=/recipes');
        return;
      }
      if (!res.ok || !json.success) {
        setDeleteDialogError(
          json.error ||
            (res.status === 404 ? t('recipes.delete.notFound') : t('recipes.delete.failed'))
        );
        return;
      }
      setRecipes((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      setDeleteDialogError(t('recipes.delete.network'));
    } finally {
      setDeletingId(null);
    }
  };

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {t('recipes.title')}
          </Typography>
          <LanguageToggle />
          <ThemeToggle />
          <UserMenu />
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: { xs: 'stretch', sm: 'center' },
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2,
            mb: 4,
          }}
        >
          <Typography variant="h4" component="h1">
            {t('recipes.title')}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleExportAll}
              disabled={loading || recipes.length === 0}
            >
              {t('recipes.exportAll')}
            </Button>
            <Button
              variant="outlined"
              startIcon={<UploadIcon />}
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
            >
              {importing ? t('common.importing') : t('common.import')}
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => router.push('/recipes/add')}
            >
              {t('recipes.addRecipe')}
            </Button>
          </Stack>
        </Box>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            // Reset so picking the same file again still fires onChange.
            e.target.value = '';
            if (file) handleImportFile(file);
          }}
        />

        {importResult && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setImportResult(null)}>
            {importResult}
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
            <Typography component="span" variant="body2" display="block" sx={{ mt: 1 }}>
              {t('recipes.loadErrorHelp')}
            </Typography>
          </Alert>
        )}

        {status === 'loading' || loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : recipes.length === 0 ? (
          <Paper elevation={2} sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {t('recipes.empty.title')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {t('recipes.empty.body')}
            </Typography>
            <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" useFlexGap>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => router.push('/recipes/add')}
              >
                {t('recipes.empty.cta')}
              </Button>
              <Button
                variant="outlined"
                startIcon={<UploadIcon />}
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
              >
                {importing ? t('common.importing') : t('recipes.empty.importCta')}
              </Button>
            </Stack>
          </Paper>
        ) : (
          <Paper elevation={2} sx={{ overflow: 'hidden' }}>
            <List disablePadding>
              {recipes.map((recipe, index) => (
                <Box key={recipe.id}>
                  {index > 0 ? <Box sx={{ borderTop: 1, borderColor: 'divider' }} /> : null}
                  <ListItem
                    alignItems="flex-start"
                    disablePadding
                    secondaryAction={
                      <Stack direction="row" spacing={0.5}>
                        <IconButton
                          aria-label={t('recipes.editAria', { title: recipe.title })}
                          onClick={() =>
                            router.push(`/recipes/${encodeURIComponent(recipe.id)}/edit`)
                          }
                          disabled={deletingId !== null}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          edge="end"
                          aria-label={t('recipes.deleteAria', { title: recipe.title })}
                          onClick={() => {
                            setDeleteDialogError(null);
                            setDeleteTarget(recipe);
                          }}
                          disabled={deletingId !== null}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Stack>
                    }
                  >
                    <ListItemButton
                      alignItems="flex-start"
                      onClick={() => router.push(`/recipes/${encodeURIComponent(recipe.id)}`)}
                      sx={{ py: 2, px: 3, pr: 14 }}
                    >
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
                            <Stack
                              direction="row"
                              spacing={1}
                              flexWrap="wrap"
                              useFlexGap
                              sx={{ mt: 1 }}
                            >
                              {recipe.prepTime != null ? (
                                <Chip
                                  size="small"
                                  label={t('recipes.chip.prep', { minutes: recipe.prepTime })}
                                />
                              ) : null}
                              {recipe.cookTime != null ? (
                                <Chip
                                  size="small"
                                  label={t('recipes.chip.cook', { minutes: recipe.cookTime })}
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
                          </>
                        }
                        secondaryTypographyProps={{ component: 'div' }}
                      />
                    </ListItemButton>
                  </ListItem>
                </Box>
              ))}
            </List>
          </Paper>
        )}
      </Container>

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!deletingId) {
            setDeleteTarget(null);
            setDeleteDialogError(null);
          }
        }}
      >
        <DialogTitle>{t('recipes.delete.title')}</DialogTitle>
        <DialogContent>
          {deleteDialogError ? (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setDeleteDialogError(null)}>
              {deleteDialogError}
            </Alert>
          ) : null}
          <DialogContentText>
            {t('recipes.delete.body', { title: deleteTarget?.title ?? '' })}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDeleteTarget(null);
              setDeleteDialogError(null);
            }}
            disabled={deletingId !== null}
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={deletingId !== null}
          >
            {deletingId ? t('common.deleting') : t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
