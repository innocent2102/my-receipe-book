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
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import { ThemeToggle } from '../../components/ThemeToggle';
import { UserMenu } from '../../components/UserMenu';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { downloadRecipeExport, exportDateStamp } from '../../lib/recipeExport';

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
        throw new Error(json.error || 'Could not load recipes');
      }
      setRecipes(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load recipes');
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  }, [router]);

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
        throw new Error('That file is not valid JSON.');
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
        throw new Error(json.error || 'Could not import that file.');
      }

      const imported = json.data?.imported ?? 0;
      const skipped = json.data?.skipped ?? 0;
      setImportResult(
        `Imported ${imported} recipe${imported === 1 ? '' : 's'}` +
          (skipped > 0 ? ` — skipped ${skipped} without a title.` : '.')
      );
      await loadRecipes();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not import that file.');
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
            (res.status === 404
              ? 'Recipe not found or you no longer have access.'
              : 'Could not delete this recipe.')
        );
        return;
      }
      setRecipes((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      setDeleteDialogError('Network error while deleting. Check that the app and API are running.');
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
            My Recipes
          </Typography>
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
            My Recipes
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleExportAll}
              disabled={loading || recipes.length === 0}
            >
              Export all
            </Button>
            <Button
              variant="outlined"
              startIcon={<UploadIcon />}
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
            >
              {importing ? 'Importing…' : 'Import'}
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => router.push('/recipes/add')}
            >
              Add Recipe
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
              Ensure the backend is running and <code>BACKEND_URL</code> in{' '}
              <code>frontend/.env.local</code> matches it (default <code>http://localhost:3001</code>
              ). If you set <code>RECIPES_PROXY_SECRET</code> on the backend, use the same value in{' '}
              <code>frontend/.env.local</code>.
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
              No recipes yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Start building your recipe collection by adding your first recipe, or import a
              previously exported file.
            </Typography>
            <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" useFlexGap>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => router.push('/recipes/add')}
              >
                Create Your First Recipe
              </Button>
              <Button
                variant="outlined"
                startIcon={<UploadIcon />}
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
              >
                {importing ? 'Importing…' : 'Import from file'}
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
                      <IconButton
                        edge="end"
                        aria-label={`Delete ${recipe.title}`}
                        onClick={() => {
                          setDeleteDialogError(null);
                          setDeleteTarget(recipe);
                        }}
                        disabled={deletingId !== null}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    }
                  >
                    <ListItemButton
                      alignItems="flex-start"
                      onClick={() => router.push(`/recipes/${encodeURIComponent(recipe.id)}`)}
                      sx={{ py: 2, px: 3, pr: 9 }}
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
        <DialogTitle>Delete recipe?</DialogTitle>
        <DialogContent>
          {deleteDialogError ? (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setDeleteDialogError(null)}>
              {deleteDialogError}
            </Alert>
          ) : null}
          <DialogContentText>
            This will permanently remove &quot;{deleteTarget?.title}&quot; and cannot be undone.
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
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={deletingId !== null}
          >
            {deletingId ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
