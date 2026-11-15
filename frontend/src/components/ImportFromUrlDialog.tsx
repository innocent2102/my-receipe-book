'use client';

import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTranslation } from '../i18n/LanguageProvider';
import { saveImportDraft, type ImportedRecipeDraft } from '../lib/importDraft';
import type { TranslationKey } from '../i18n/translations';

type Props = {
  open: boolean;
  onClose: () => void;
};

const ERROR_CODES = [
  'invalid_url',
  'blocked_address',
  'fetch_failed',
  'too_large',
  'unsupported_content',
  'no_recipe_found',
  'rate_limited',
] as const;

function errorKey(code: unknown): TranslationKey {
  const known = ERROR_CODES.find((candidate) => candidate === code);
  return (known ? `urlImport.error.${known}` : 'urlImport.error.generic') as TranslationKey;
}

/**
 * Reads a recipe published on another website and hands the result to the add page
 * as a draft, so nothing is stored until the user has reviewed it.
 */
export function ImportFromUrlDialog({ open, onClose }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [draft, setDraft] = useState<ImportedRecipeDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setUrl('');
    setDraft(null);
    setError(null);
  };

  const close = () => {
    if (loading) return;
    reset();
    onClose();
  };

  const fetchDraft = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setDraft(null);
    try {
      const res = await fetch('/api/recipes/from-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        data?: ImportedRecipeDraft;
        code?: string;
      };

      if (!res.ok || !json.success || !json.data) {
        setError(t(errorKey(json.code)));
        return;
      }

      setDraft(json.data);
    } catch {
      setError(t('urlImport.error.fetch_failed'));
    } finally {
      setLoading(false);
    }
  };

  const continueToForm = () => {
    if (!draft) return;
    saveImportDraft(draft);
    onClose();
    reset();
    router.push('/recipes/add');
  };

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pr: 6 }}>
        {t('urlImport.title')}
        <IconButton
          aria-label={t('common.close')}
          onClick={close}
          disabled={loading}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {error ? (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        ) : null}

        <DialogContentText sx={{ mb: 2 }}>{t('urlImport.body')}</DialogContentText>

        <TextField
          autoFocus
          fullWidth
          type="url"
          label={t('urlImport.urlLabel')}
          placeholder="https://"
          value={url}
          disabled={loading}
          onChange={(e) => {
            setUrl(e.target.value);
            setDraft(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !loading) {
              e.preventDefault();
              void fetchDraft();
            }
          }}
        />

        {draft ? (
          <Stack spacing={0.5} sx={{ mt: 3 }}>
            <Typography variant="h6" component="p">
              {draft.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('urlImport.summary', {
                ingredients: draft.ingredients.length,
                steps: draft.instructions.length,
              })}
            </Typography>
            <Alert severity="info" sx={{ mt: 1 }}>
              {t('urlImport.reviewHint')}
            </Alert>
          </Stack>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={close} disabled={loading}>
          {t('common.cancel')}
        </Button>
        {draft ? (
          <Button onClick={continueToForm} variant="contained">
            {t('urlImport.continue')}
          </Button>
        ) : (
          <Button onClick={fetchDraft} variant="contained" disabled={loading || !url.trim()}>
            {loading ? t('urlImport.fetching') : t('urlImport.fetch')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
