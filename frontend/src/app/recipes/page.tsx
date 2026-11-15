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
  TextField,
  InputAdornment,
  Snackbar,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkAddOutlinedIcon from '@mui/icons-material/BookmarkAddOutlined';
import BookmarksIcon from '@mui/icons-material/Bookmarks';
import AddLinkIcon from '@mui/icons-material/AddLink';
import {
  AddToGroceryDialog,
  groceryCandidates,
} from '../../components/AddToGroceryDialog';
import { ImportFromUrlDialog } from '../../components/ImportFromUrlDialog';
import { ThemeToggle } from '../../components/ThemeToggle';
import { LanguageToggle } from '../../components/LanguageToggle';
import { UserMenu } from '../../components/UserMenu';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { downloadRecipeExport, exportDateStamp } from '../../lib/recipeExport';
import { useTranslation } from '../../i18n/LanguageProvider';
import { OfflineIndicator } from '../../components/OfflineIndicator';
import { useOnline } from '../../lib/useOnline';
import { readOffline, writeOffline } from '../../lib/offlineStore';
import { RecipeRows, ingredientNames, type RecipeSummary } from '../../components/RecipeRows';

const RECIPES_CACHE_KEY = 'recipes.list';
const PLANNED_CACHE_KEY = 'planned.ids';

type RecipeListItem = RecipeSummary;

/** Everything a search term may match: title, description, ingredients and tags. */
const searchHaystack = (recipe: RecipeListItem) =>
  [
    recipe.title,
    recipe.description ?? '',
    ingredientNames(recipe),
    (recipe.tags ?? []).join(' '),
  ]
    .join(' ')
    .toLowerCase();

export default function RecipesPage() {
  const router = useRouter();
  const { status } = useSession();
  const { t, tPlural } = useTranslation();
  const online = useOnline();
  const [recipes, setRecipes] = useState<RecipeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RecipeListItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteDialogError, setDeleteDialogError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [groceryTarget, setGroceryTarget] = useState<RecipeListItem | null>(null);
  const [groceryAdded, setGroceryAdded] = useState<number | null>(null);
  const [usingOfflineCopy, setUsingOfflineCopy] = useState(false);
  const [plannedIds, setPlannedIds] = useState<Set<string>>(new Set());
  const [urlImportOpen, setUrlImportOpen] = useState(false);

  /** All whitespace-separated terms must match, so extra words narrow the list. */
  const filteredRecipes = useMemo(() => {
    const terms = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return recipes;
    return recipes.filter((recipe) => {
      const haystack = searchHaystack(recipe);
      return terms.every((term) => haystack.includes(term));
    });
  }, [recipes, search]);

  useEffect(() => {
    if (status === 'unauthenticated' && online) {
      router.replace('/login?callbackUrl=/recipes');
    }
  }, [status, online, router]);

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
      writeOffline(RECIPES_CACHE_KEY, json.data);
      setUsingOfflineCopy(false);
    } catch (e) {
      // Fall back to the last successful load so recipes stay readable offline.
      const cached = readOffline<RecipeListItem[]>(RECIPES_CACHE_KEY);
      if (cached && cached.length > 0) {
        setRecipes(cached);
        setUsingOfflineCopy(true);
        setError(null);
      } else {
        setError(e instanceof Error ? e.message : t('recipes.loadError'));
        setRecipes([]);
      }
    } finally {
      setLoading(false);
    }
  }, [router, t]);

  useEffect(() => {
    if (status === 'authenticated') {
      loadRecipes();
    } else if (status === 'unauthenticated') {
      if (!online) {
        const cached = readOffline<RecipeListItem[]>(RECIPES_CACHE_KEY);
        if (cached && cached.length > 0) {
          setRecipes(cached);
          setUsingOfflineCopy(true);
        }
      }
      setLoading(false);
    }
  }, [status, online, loadRecipes]);

  const handleExportAll = () => {
    if (recipes.length === 0) return;
    downloadRecipeExport(recipes, `my-recipes-${exportDateStamp()}`);
  };

  /** Keeps the bookmark icons in sync with the planned list. */
  const loadPlanned = useCallback(async () => {
    try {
      const res = await fetch('/api/planned', { cache: 'no-store' });
      const json = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        data?: { id: string }[];
      };
      if (res.ok && json.success && Array.isArray(json.data)) {
        const ids = json.data.map((recipe) => recipe.id);
        setPlannedIds(new Set(ids));
        writeOffline(PLANNED_CACHE_KEY, ids);
      }
    } catch {
      setPlannedIds(new Set(readOffline<string[]>(PLANNED_CACHE_KEY) ?? []));
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated' && online) {
      void loadPlanned();
    } else {
      setPlannedIds(new Set(readOffline<string[]>(PLANNED_CACHE_KEY) ?? []));
    }
  }, [status, online, loadPlanned]);

  const togglePlanned = async (recipeId: string) => {
    const planned = plannedIds.has(recipeId);
    setError(null);
    try {
      const res = planned
        ? await fetch(`/api/planned?id=${encodeURIComponent(recipeId)}`, { method: 'DELETE' })
        : await fetch('/api/planned', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipeId }),
          });
      if (!res.ok) throw new Error(t('planned.updateFailed'));
      await loadPlanned();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('planned.updateFailed'));
    }
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

  if (status === 'unauthenticated' && online) {
    return null;
  }

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {t('recipes.title')}
          </Typography>
          <OfflineIndicator online={online} />
          <Tooltip title={t('planned.title')}>
            <IconButton
              color="inherit"
              aria-label={t('planned.openAria')}
              onClick={() => router.push('/planned')}
            >
              <BookmarksIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('recipes.addRecipe')}>
            <span>
              <IconButton
                color="inherit"
                aria-label={t('recipes.addRecipe')}
                onClick={() => router.push('/recipes/add')}
                disabled={!online}
              >
                <AddIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={t('urlImport.action')}>
            <span>
              <IconButton
                color="inherit"
                aria-label={t('urlImport.action')}
                onClick={() => setUrlImportOpen(true)}
                disabled={!online}
              >
                <AddLinkIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={importing ? t('common.importing') : t('common.import')}>
            <span>
              <IconButton
                color="inherit"
                aria-label={t('common.import')}
                onClick={() => fileInputRef.current?.click()}
                disabled={importing || !online}
              >
                <UploadIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={t('recipes.exportAll')}>
            <span>
              <IconButton
                color="inherit"
                aria-label={t('recipes.exportAll')}
                onClick={handleExportAll}
                disabled={loading || recipes.length === 0}
              >
                <DownloadIcon />
              </IconButton>
            </span>
          </Tooltip>
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

        {!loading && recipes.length > 0 ? (
          <Box sx={{ mb: 3 }}>
            {usingOfflineCopy ? (
              <Alert severity="info" sx={{ mb: 2 }}>
                {t('offline.cachedRecipes')}
              </Alert>
            ) : null}
            <TextField
              fullWidth
              size="small"
              type="search"
              label={t('recipes.search.label')}
              placeholder={t('recipes.search.placeholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: search ? (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      aria-label={t('recipes.search.clear')}
                      onClick={() => setSearch('')}
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              }}
            />
            {search.trim() ? (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {tPlural('recipes.search.results', filteredRecipes.length)}
              </Typography>
            ) : null}
          </Box>
        ) : null}

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
        ) : filteredRecipes.length === 0 ? (
          <Paper elevation={2} sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {t('recipes.search.noResults.title')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {t('recipes.search.noResults.body', { query: search.trim() })}
            </Typography>
            <Button variant="outlined" startIcon={<ClearIcon />} onClick={() => setSearch('')}>
              {t('recipes.search.clear')}
            </Button>
          </Paper>
        ) : (
          <Paper elevation={2} sx={{ overflow: 'hidden' }}>
            <RecipeRows
              recipes={filteredRecipes}
              onOpen={(recipe) => router.push(`/recipes/${encodeURIComponent(recipe.id)}`)}
              actionsSpacing={26}
              renderActions={(recipe) => (
                <>
                  <IconButton
                    aria-label={
                      plannedIds.has(recipe.id)
                        ? t('planned.removeAria', { title: recipe.title })
                        : t('planned.addAria', { title: recipe.title })
                    }
                    onClick={() => togglePlanned(recipe.id)}
                    disabled={deletingId !== null || !online}
                    color={plannedIds.has(recipe.id) ? 'primary' : 'default'}
                  >
                    {plannedIds.has(recipe.id) ? <BookmarkIcon /> : <BookmarkAddOutlinedIcon />}
                  </IconButton>
                  <IconButton
                    aria-label={t('grocery.addAria', { title: recipe.title })}
                    onClick={() => setGroceryTarget(recipe)}
                    disabled={deletingId !== null || !groceryCandidates(recipe).length}
                    color="secondary"
                  >
                    <ShoppingCartIcon />
                  </IconButton>
                  <IconButton
                    aria-label={t('recipes.editAria', { title: recipe.title })}
                    onClick={() => router.push(`/recipes/${encodeURIComponent(recipe.id)}/edit`)}
                    disabled={deletingId !== null || !online}
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
                    disabled={deletingId !== null || !online}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </>
              )}
            />
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

      <ImportFromUrlDialog open={urlImportOpen} onClose={() => setUrlImportOpen(false)} />

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
