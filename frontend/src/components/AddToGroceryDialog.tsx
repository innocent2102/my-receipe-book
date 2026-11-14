'use client';

import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useTranslation } from '../i18n/LanguageProvider';

export type GroceryCandidate = {
  id: string;
  name: string;
  amount: number;
  unit: string;
};

type Props = {
  open: boolean;
  recipeId?: string;
  ingredients: GroceryCandidate[];
  onClose: () => void;
  onAdded: (count: number) => void;
};

function describe(ingredient: GroceryCandidate) {
  return [ingredient.amount || '', ingredient.unit]
    .map((part) => String(part).trim())
    .filter((part) => part !== '')
    .join(' ');
}

/** Lets the user pick which recipe ingredients land on the shopping list. */
export function AddToGroceryDialog({ open, recipeId, ingredients, onClose, onAdded }: Props) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSelected(ingredients.map((ingredient) => ingredient.id));
      setError(null);
    }
  }, [open, ingredients]);

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]
    );

  const handleSubmit = async () => {
    const picked = ingredients.filter((ingredient) => selected.includes(ingredient.id));
    if (picked.length === 0) return;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/grocery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: picked.map((ingredient) => ({
            name: ingredient.name,
            amount: ingredient.amount,
            unit: ingredient.unit,
            recipeId,
          })),
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        added?: number;
        error?: string;
      };
      if (!res.ok || !json.success) {
        throw new Error(json.error || t('grocery.saveError'));
      }
      onAdded(json.added ?? picked.length);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('grocery.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>{t('grocery.dialogTitle')}</DialogTitle>
      <DialogContent dividers>
        <DialogContentText sx={{ mb: 1 }}>{t('grocery.dialogBody')}</DialogContentText>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
          <Button
            size="small"
            onClick={() => setSelected(ingredients.map((ingredient) => ingredient.id))}
          >
            {t('grocery.selectAll')}
          </Button>
          <Button size="small" onClick={() => setSelected([])}>
            {t('grocery.clearSelection')}
          </Button>
        </Stack>

        <List disablePadding>
          {ingredients.map((ingredient) => (
            <ListItem key={ingredient.id} disablePadding>
              <ListItemButton dense onClick={() => toggle(ingredient.id)}>
                <ListItemIcon sx={{ minWidth: 42 }}>
                  <Checkbox
                    edge="start"
                    checked={selected.includes(ingredient.id)}
                    tabIndex={-1}
                    disableRipple
                  />
                </ListItemIcon>
                <ListItemText primary={ingredient.name} secondary={describe(ingredient) || null} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={saving || selected.length === 0}
        >
          {t('common.add')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
