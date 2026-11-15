'use client';

import {
  Alert,
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useTranslation } from '../i18n/LanguageProvider';
import type { RecipeSummary } from './RecipeRows';

type Props = {
  open: boolean;
  /** Fixed recipe (opened from a recipe row); omit to let the user pick one. */
  recipe?: RecipeSummary;
  /** Recipes to choose from, when no fixed recipe is given. */
  choices?: RecipeSummary[];
  /** Pre-selected day, `YYYY-MM-DD`. */
  defaultDate: string;
  onClose: () => void;
  onPlanned: (title: string) => void;
};

/** Puts a recipe on a day of the meal plan, optionally at a given time. */
export function PlanRecipeDialog({
  open,
  recipe,
  choices,
  defaultDate,
  onClose,
  onPlanned,
}: Props) {
  const { t } = useTranslation();
  const [picked, setPicked] = useState<RecipeSummary | null>(null);
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setPicked(null);
      setDate(defaultDate);
      setTime('');
      setError(null);
    }
  }, [open, defaultDate]);

  const target = recipe ?? picked;

  const handleSubmit = async () => {
    if (!target || !date) return;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/meal-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeId: target.id, date, ...(time ? { time } : {}) }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
      };
      if (!res.ok || !json.success) {
        throw new Error(json.error || t('planner.saveError'));
      }
      onPlanned(target.title);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('planner.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('planner.dialogTitle')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error ? <Alert severity="error">{error}</Alert> : null}

          {recipe ? (
            <Typography variant="subtitle1">{recipe.title}</Typography>
          ) : (
            <Autocomplete
              options={choices ?? []}
              value={picked}
              onChange={(_event, value) => setPicked(value)}
              getOptionLabel={(option) => option.title}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={(params) => (
                <TextField {...params} label={t('planner.recipeLabel')} autoFocus />
              )}
            />
          )}

          <TextField
            type="date"
            label={t('planner.dateLabel')}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            type="time"
            label={t('planner.timeLabel')}
            value={time}
            onChange={(e) => setTime(e.target.value)}
            InputLabelProps={{ shrink: true }}
            helperText={t('planner.timeHelp')}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={saving || !target || !date}
        >
          {t('planner.addToPlan')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
