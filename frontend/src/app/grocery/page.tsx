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
import DoneAllIcon from '@mui/icons-material/DoneAll';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import { ThemeToggle } from '../../components/ThemeToggle';
import { LanguageToggle } from '../../components/LanguageToggle';
import { UserMenu } from '../../components/UserMenu';
import { OfflineIndicator } from '../../components/OfflineIndicator';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useOnline } from '../../lib/useOnline';
import { readOffline, writeOffline } from '../../lib/offlineStore';
import {
  applyOp,
  fetchList,
  newLocalId,
  readCachedItems,
  readQueue,
  replayQueue,
  UnauthorizedError,
  writeCachedItems,
  writeQueue,
  type GroceryItem,
  type PendingOp,
} from '../../lib/groceryOffline';
import { useTranslation } from '../../i18n/LanguageProvider';

const INGREDIENTS_CACHE_KEY = 'ingredients';

export default function GroceryPage() {
  const router = useRouter();
  const { status } = useSession();
  const { t, tPlural } = useTranslation();
  const online = useOnline();
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [queue, setQueue] = useState<PendingOp[]>([]);
  const [ingredientOptions, setIngredientOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState<number | ''>('');
  const [newUnit, setNewUnit] = useState('');
  const syncing = useRef(false);

  // Offline the session endpoint may be unreachable, so never bounce the user
  // out of a list they are standing in a shop with.
  useEffect(() => {
    if (status === 'unauthenticated' && online) {
      router.replace('/login?callbackUrl=%2Fgrocery');
    }
  }, [status, online, router]);

  /** Show the local copy immediately — the network is only ever a refresh. */
  useEffect(() => {
    setItems(readCachedItems());
    setQueue(readQueue());
    setIngredientOptions(readOffline<string[]>(INGREDIENTS_CACHE_KEY) ?? []);
    setLoading(false);
  }, []);

  const sync = useCallback(async () => {
    if (syncing.current) return;
    syncing.current = true;
    try {
      const pending = readQueue();
      const { remaining, synced } = pending.length
        ? await replayQueue(pending)
        : { remaining: [] as PendingOp[], synced: false };

      writeQueue(remaining);
      setQueue(remaining);
      if (remaining.length > 0) return;

      // Queue is drained, so the server is now authoritative.
      const fresh = await fetchList();
      setItems(fresh);
      writeCachedItems(fresh);
      if (synced) setError(null);
    } catch (e) {
      if (e instanceof UnauthorizedError && online) {
        router.replace('/login?callbackUrl=%2Fgrocery');
        return;
      }
      // Otherwise keep working from the local copy; the queue survives a reload.
      if (online) setError(t('grocery.syncError'));
    } finally {
      syncing.current = false;
    }
  }, [online, router, t]);

  useEffect(() => {
    if (status === 'authenticated' && online) {
      void sync();
    }
  }, [status, online, sync]);

  useEffect(() => {
    if (status !== 'authenticated' || !online) return;

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
          writeOffline(INGREDIENTS_CACHE_KEY, json.data);
        }
      } catch (err) {
        console.error('Error loading ingredient suggestions:', err);
      }
    };

    loadIngredientOptions();

    return () => {
      cancelled = true;
    };
  }, [status, online]);

  /** Single write path: update the local copy, queue the changes, then sync. */
  const enqueue = useCallback(
    (...ops: PendingOp[]) => {
      if (ops.length === 0) return;

      setItems((prev) => {
        const next = ops.reduce(applyOp, prev);
        writeCachedItems(next);
        return next;
      });
      setQueue((prev) => {
        const next = [...prev, ...ops];
        writeQueue(next);
        return next;
      });
      if (online) {
        // Let state settle first so sync reads the queue including these ops.
        setTimeout(() => void sync(), 0);
      }
    },
    [online, sync]
  );

  const handleToggle = (item: GroceryItem) =>
    enqueue({ kind: 'toggle', itemId: item.id, checked: !item.checked });

  const handleRemove = (item: GroceryItem) => enqueue({ kind: 'remove', itemId: item.id });

  const handleClearChecked = () => enqueue({ kind: 'clearChecked' });

  /** Ticks everything off (or puts it all back), one operation per item. */
  const handleToggleAll = (checked: boolean) =>
    enqueue(
      ...items
        .filter((item) => item.checked !== checked)
        .map((item): PendingOp => ({ kind: 'toggle', itemId: item.id, checked }))
    );

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;

    enqueue({
      kind: 'add',
      localId: newLocalId(),
      name,
      amount: newAmount === '' ? 0 : Number(newAmount),
      unit: newUnit.trim(),
    });

    setNewName('');
    setNewAmount('');
    setNewUnit('');
  };

  if (status === 'unauthenticated' && online) {
    return null;
  }

  const checkedCount = items.filter((item) => item.checked).length;
  const allChecked = items.length > 0 && checkedCount === items.length;

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
          <OfflineIndicator online={online} pending={queue.length} />
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
              disabled={!newName.trim()}
            >
              {t('common.add')}
            </Button>
          </Box>
        </Paper>

        {loading ? (
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
              <Stack direction="row" spacing={0.5}>
                <Button
                  size="small"
                  startIcon={allChecked ? <CheckBoxOutlineBlankIcon /> : <DoneAllIcon />}
                  onClick={() => handleToggleAll(!allChecked)}
                >
                  {allChecked ? t('grocery.unmarkAll') : t('grocery.markAll')}
                </Button>
                <Button
                  size="small"
                  color="error"
                  startIcon={<DeleteSweepIcon />}
                  onClick={handleClearChecked}
                  disabled={checkedCount === 0}
                >
                  {t('grocery.clearChecked')}
                </Button>
              </Stack>
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
