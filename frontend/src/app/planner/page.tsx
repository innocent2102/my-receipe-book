'use client';

import {
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Snackbar,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DeleteIcon from '@mui/icons-material/Delete';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { PlanRecipeDialog } from '../../components/PlanRecipeDialog';
import { RecipeThumbnail } from '../../components/RecipeThumbnail';
import type { RecipeSummary } from '../../components/RecipeRows';
import { OfflineIndicator } from '../../components/OfflineIndicator';
import { ThemeToggle } from '../../components/ThemeToggle';
import { LanguageToggle } from '../../components/LanguageToggle';
import { UserMenu } from '../../components/UserMenu';
import { useTranslation } from '../../i18n/LanguageProvider';
import { useOnline } from '../../lib/useOnline';
import { readOffline, writeOffline } from '../../lib/offlineStore';
import { isoDate, startOfWeek, addDays, weekDays } from '../../lib/week';
import { googleCalendarEventUrl } from '../../lib/googleCalendarLink';

type PlanEntry = {
  id: string;
  date: string;
  time?: string;
  googleEventId?: string;
  recipe: RecipeSummary;
};

const planCacheKey = (weekStart: string) => `planner.week.${weekStart}`;

export default function PlannerPage() {
  const router = useRouter();
  const { status } = useSession();
  const { t, locale } = useTranslation();
  const online = useOnline();

  const [weekStart, setWeekStart] = useState(() => isoDate(startOfWeek(new Date())));
  const [entries, setEntries] = useState<PlanEntry[]>([]);
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingOfflineCopy, setUsingOfflineCopy] = useState(false);
  const [dialogDate, setDialogDate] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const days = useMemo(() => weekDays(weekStart), [weekStart]);
  const weekEnd = days[days.length - 1];

  const dayLabel = useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'short' }),
    [locale]
  );
  const rangeLabel = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }),
    [locale]
  );

  useEffect(() => {
    if (status === 'unauthenticated' && online) {
      router.replace('/login?callbackUrl=%2Fplanner');
    }
  }, [status, online, router]);

  const loadWeek = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/meal-plans?from=${encodeURIComponent(weekStart)}&to=${encodeURIComponent(weekEnd)}`,
        { cache: 'no-store' }
      );
      const json = (await res.json()) as {
        success?: boolean;
        data?: PlanEntry[];
        error?: string;
      };
      if (res.status === 401) {
        router.replace('/login?callbackUrl=%2Fplanner');
        return;
      }
      if (!res.ok || !json.success || !Array.isArray(json.data)) {
        throw new Error(json.error || t('planner.loadError'));
      }
      setEntries(json.data);
      writeOffline(planCacheKey(weekStart), json.data);
      setUsingOfflineCopy(false);
    } catch (e) {
      // Fall back to the last successful load so the week stays readable offline.
      const cached = readOffline<PlanEntry[]>(planCacheKey(weekStart));
      if (cached) {
        setEntries(cached);
        setUsingOfflineCopy(true);
        setError(null);
      } else {
        setError(e instanceof Error ? e.message : t('planner.loadError'));
        setEntries([]);
      }
    } finally {
      setLoading(false);
    }
  }, [weekStart, weekEnd, router, t]);

  useEffect(() => {
    if (status === 'authenticated') {
      void loadWeek();
    } else if (status === 'unauthenticated') {
      if (!online) {
        const cached = readOffline<PlanEntry[]>(planCacheKey(weekStart));
        if (cached) {
          setEntries(cached);
          setUsingOfflineCopy(true);
        }
      }
      setLoading(false);
    }
  }, [status, online, weekStart, loadWeek]);

  // The picker needs the full recipe list; it is only used inside the dialog.
  useEffect(() => {
    if (status !== 'authenticated') return;

    const loadRecipes = async () => {
      try {
        const res = await fetch('/api/recipes', { cache: 'no-store' });
        const json = (await res.json()) as { success?: boolean; data?: RecipeSummary[] };
        if (res.ok && json.success && Array.isArray(json.data)) {
          setRecipes(json.data);
        }
      } catch (e) {
        console.error('Error loading recipes for the planner:', e);
      }
    };

    void loadRecipes();
  }, [status]);

  /** Opens Google Calendar with one event per meal, pre-filled and unsaved. */
  const openInGoogleCalendar = (entry: PlanEntry) => {
    const url = googleCalendarEventUrl({
      title: entry.recipe.title,
      date: entry.date,
      time: entry.time,
      details: [
        entry.recipe.description,
        `${window.location.origin}/recipes/${encodeURIComponent(entry.recipe.id)}`,
      ]
        .filter(Boolean)
        .join('\n\n'),
    });
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleRemove = async (entry: PlanEntry) => {
    setRemovingId(entry.id);
    setError(null);
    try {
      const res = await fetch(`/api/meal-plans?id=${encodeURIComponent(entry.id)}`, {
        method: 'DELETE',
      });
      const json = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
      };
      if (!res.ok || !json.success) {
        throw new Error(json.error || t('planner.updateFailed'));
      }
      const next = entries.filter((item) => item.id !== entry.id);
      setEntries(next);
      writeOffline(planCacheKey(weekStart), next);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('planner.updateFailed'));
    } finally {
      setRemovingId(null);
    }
  };

  if (status === 'unauthenticated' && online) {
    return null;
  }

  const today = isoDate(new Date());

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            aria-label={t('planner.backAria')}
            onClick={() => router.push('/recipes')}
            sx={{ mr: 1 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {t('planner.title')}
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
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            mb: 2,
            flexWrap: 'wrap',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton
              aria-label={t('planner.previousWeek')}
              onClick={() => setWeekStart(isoDate(addDays(weekStart, -7)))}
            >
              <ChevronLeftIcon />
            </IconButton>
            <Typography variant="subtitle1" sx={{ minWidth: 200, textAlign: 'center' }}>
              {rangeLabel.format(new Date(`${weekStart}T00:00:00`))} –{' '}
              {rangeLabel.format(new Date(`${weekEnd}T00:00:00`))}
            </Typography>
            <IconButton
              aria-label={t('planner.nextWeek')}
              onClick={() => setWeekStart(isoDate(addDays(weekStart, 7)))}
            >
              <ChevronRightIcon />
            </IconButton>
          </Box>
          <Button onClick={() => setWeekStart(isoDate(startOfWeek(new Date())))}>
            {t('planner.thisWeek')}
          </Button>
        </Box>

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
        ) : (
          <Grid container spacing={2}>
            {days.map((day) => {
              const dayEntries = entries.filter((entry) => entry.date === day);

              return (
                <Grid item xs={12} sm={6} md={4} lg={3} key={day}>
                  <Card
                    variant="outlined"
                    sx={{
                      height: '100%',
                      borderColor: day === today ? 'primary.main' : undefined,
                    }}
                  >
                    <CardContent sx={{ pb: 1 }}>
                      <Typography
                        variant="subtitle2"
                        color={day === today ? 'primary' : 'text.secondary'}
                        sx={{ textTransform: 'capitalize' }}
                      >
                        {dayLabel.format(new Date(`${day}T00:00:00`))}
                      </Typography>

                      {dayEntries.length === 0 ? (
                        <Typography variant="body2" color="text.disabled" sx={{ py: 2 }}>
                          {t('planner.dayEmpty')}
                        </Typography>
                      ) : (
                        <List dense disablePadding>
                          {dayEntries.map((entry) => (
                            <ListItem
                              key={entry.id}
                              disableGutters
                              secondaryAction={
                                <Stack direction="row" spacing={0}>
                                  <Tooltip title={t('planner.calendarAction')}>
                                    <IconButton
                                      size="small"
                                      aria-label={t('planner.calendarAria', {
                                        title: entry.recipe.title,
                                      })}
                                      onClick={() => openInGoogleCalendar(entry)}
                                      disabled={!online}
                                    >
                                      <EventAvailableIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <IconButton
                                    edge="end"
                                    size="small"
                                    aria-label={t('planner.removeAria', {
                                      title: entry.recipe.title,
                                    })}
                                    onClick={() => handleRemove(entry)}
                                    disabled={removingId !== null || !online}
                                    color="error"
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Stack>
                              }
                            >
                              <ListItemButton
                                disableGutters
                                onClick={() =>
                                  router.push(`/recipes/${encodeURIComponent(entry.recipe.id)}`)
                                }
                                sx={{ gap: 1, pr: 9 }}
                              >
                                <RecipeThumbnail
                                  imageUrl={entry.recipe.imageUrl}
                                  alt={entry.recipe.title}
                                  size={40}
                                />
                                <ListItemText
                                  primary={entry.recipe.title}
                                  secondary={entry.time}
                                  primaryTypographyProps={{ variant: 'body2' }}
                                />
                              </ListItemButton>
                            </ListItem>
                          ))}
                        </List>
                      )}

                      <Button
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => setDialogDate(day)}
                        disabled={!online}
                        sx={{ mt: 1 }}
                      >
                        {t('planner.addMeal')}
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Container>

      <PlanRecipeDialog
        open={dialogDate !== null}
        choices={recipes}
        defaultDate={dialogDate ?? today}
        onClose={() => setDialogDate(null)}
        onPlanned={(title) => {
          setNotice(t('planner.added', { title }));
          void loadWeek();
        }}
      />

      <Snackbar
        open={notice !== null}
        autoHideDuration={5000}
        onClose={() => setNotice(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setNotice(null)}>
          {notice}
        </Alert>
      </Snackbar>
    </>
  );
}
