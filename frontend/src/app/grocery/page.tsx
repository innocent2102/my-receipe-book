'use client';

import {
  Container,
  Typography,
  Box,
  AppBar,
  Toolbar,
  IconButton,
  Button,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Checkbox,
  TextField,
  Autocomplete,
  CircularProgress,
  Alert,
  Stack,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { ThemeToggle } from '../../components/ThemeToggle';
import { LanguageToggle } from '../../components/LanguageToggle';
import { UserMenu } from '../../components/UserMenu';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useTranslation } from '../../i18n/LanguageProvider';

type GroceryItem = {
  id: string;
  name: string;
  amount: number;
  unit: string;
  checked: boolean;
};

type GroceryResponse = {
  success?: boolean;
  data?: { id: string; items: GroceryItem[] };
  error?: string;
};

export default function GroceryPage() {
  const router = useRouter();
  const { status } = useSession();
  const { t, tPlural } = useTranslation();
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [ingredientOptions, setIngredientOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState<number | ''>('');
  const [newUnit, setNewUnit] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login?callbackUrl=%2Fgrocery');
    }
  }, [status, router]);

  /** Shared handler: every endpoint returns the full, refreshed list. */
  const applyResponse = useCallback(
    (res: Response, json: GroceryResponse) => {
      if (res.status === 401) {
        router.replace('/login?callbackUrl=%2Fgrocery');
        return false;
      }
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error || t('grocery.loadError'));
      }
      setItems(json.data.items);
      return true;
    },
    [router, t]
  );

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/grocery', { cache: 'no-store' });
      const json = (await res.json().catch(() => ({}))) as GroceryResponse;
      applyResponse(res, json);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('grocery.loadError'));
    } finally {
      setLoading(false);
    }
  }, [applyResponse, t]);

  useEffect(() => {
    if (status === 'authenticated') {
      loadList();
    } else if (status === 'unauthenticated') {
      setLoading(false);
    }
  }, [status, loadList]);

  useEffect(() => {
    if (status !== 'authenticated') return;

    let cancelled = false;

    const loadIngredientOptions = async () => {
      try {
        const res = await fetch('/api/ingredients', { cache: 'no-store' });
        const json = (await res.json().catch(() => ({}))) as {
          success?: boolean;
          data?: string[];
        };
        if (!cancelled && res.ok && json.success && Array.isArray(json.data)) {
          setIngredientOptions(json.data);
        }
      } catch (err) {
        console.error('Error loading ingredient suggestions:', err);
      }
    };

    loadIngredientOptions();

    return () => {
      cancelled = true;
    };
  }, [status]);

  const mutate = async (input: RequestInfo, init: RequestInit) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(input, init);
      const json = (await res.json().catch(() => ({}))) as GroceryResponse;
      applyResponse(res, json);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('grocery.saveError'));
    } finally {
      setBusy(false);
    }
  };

  const handleToggle = (item: GroceryItem) => {
    // Optimistic: the checkbox should feel instant while the request is in flight.
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, checked: !i.checked } : i))
    );
    void mutate(`/api/grocery?id=${encodeURIComponent(item.id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checked: !item.checked }),
    });
  };

  const handleRemove = (item: GroceryItem) =>
    void mutate(`/api/grocery?id=${encodeURIComponent(item.id)}`, { method: 'DELETE' });

  const handleClearChecked = () =>
    void mutate('/api/grocery?checked=true', { method: 'DELETE' });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;

    await mutate('/api/grocery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ name, amount: newAmount === '' ? 0 : Number(newAmount), unit: newUnit.trim() }],
      }),
    });

    setNewName('');
    setNewAmount('');
    setNewUnit('');
  };

  if (status === 'unauthenticated') {
    return null;
  }

  const checkedCount = items.filter((item) => item.checked).length;

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => router.push('/recipes')}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {t('grocery.title')}
          </Typography>
          <LanguageToggle />
          <ThemeToggle />
          <UserMenu />
        </Toolbar>
      </AppBar>

      <Container maxWidth="sm" sx={{ mt: 4, mb: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Paper elevation={2} sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
          <Box component="form" onSubmit={handleAdd} sx={{ display: 'flex', gap: 1 }}>
            <Autocomplete
              freeSolo
              autoHighlight
              selectOnFocus
              handleHomeEndKeys
              options={ingredientOptions}
              inputValue={newName}
              value={newName}
              sx={{ flex: 2 }}
              onInputChange={(_event, value) => setNewName(value)}
              onChange={(_event, value) => setNewName(typeof value === 'string' ? value : '')}
              renderInput={(params) => (
                <TextField {...params} size="small" label={t('grocery.itemName')} />
              )}
            />
            <TextField
              size="small"
              type="number"
              label={t('add.amount')}
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value ? Number(e.target.value) : '')}
              sx={{ width: 90 }}
              inputProps={{ step: 0.1 }}
            />
            <TextField
              size="small"
              label={t('add.unit')}
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
              sx={{ width: 90 }}
            />
            <Button
              type="submit"
              variant="contained"
              startIcon={<AddIcon />}
              disabled={busy || !newName.trim()}
            >
              {t('common.add')}
            </Button>
          </Box>
        </Paper>

        {status === 'loading' || loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : items.length === 0 ? (
          <Paper elevation={2} sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              {t('grocery.empty')}
            </Typography>
          </Paper>
        ) : (
          <Paper elevation={2} sx={{ overflow: 'hidden' }}>
            <Stack
              direction="row"
              sx={{ px: 2, py: 1.5, alignItems: 'center', justifyContent: 'space-between' }}
            >
              <Typography variant="body2" color="text.secondary">
                {tPlural('grocery.count', items.length, { count: items.length })}
              </Typography>
              <Button size="small" onClick={handleClearChecked} disabled={busy || checkedCount === 0}>
                {t('grocery.clearChecked')}
              </Button>
            </Stack>

            <List disablePadding>
              {items.map((item) => (
                <ListItem
                  key={item.id}
                  disablePadding
                  divider
                  secondaryAction={
                    <IconButton
                      edge="end"
                      color="error"
                      aria-label={t('grocery.removeAria', { name: item.name })}
                      onClick={() => handleRemove(item)}
                      disabled={busy}
                    >
                      <DeleteIcon />
                    </IconButton>
                  }
                >
                  <ListItemButton onClick={() => handleToggle(item)} dense>
                    <ListItemIcon sx={{ minWidth: 42 }}>
                      <Checkbox edge="start" checked={item.checked} tabIndex={-1} disableRipple />
                    </ListItemIcon>
                    <ListItemText
                      primary={item.name}
                      secondary={
                        [item.amount || '', item.unit]
                          .map((part) => String(part).trim())
                          .filter((part) => part !== '')
                          .join(' ') || null
                      }
                      sx={{
                        textDecoration: item.checked ? 'line-through' : 'none',
                        opacity: item.checked ? 0.6 : 1,
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Paper>
        )}
      </Container>
    </>
  );
}
