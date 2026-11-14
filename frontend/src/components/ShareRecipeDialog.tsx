'use client';

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Tooltip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from '../i18n/LanguageProvider';

type Props = {
  open: boolean;
  recipeId?: string;
  onClose: () => void;
};

/**
 * Publishes a recipe behind an unguessable token. The recipe stays private until
 * the owner creates a link, and "stop sharing" invalidates every copy of it.
 */
export function ShareRecipeDialog({ open, recipeId, onClose }: Props) {
  const { t } = useTranslation();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const shareUrl =
    token && typeof window !== 'undefined'
      ? `${window.location.origin}/share/${encodeURIComponent(token)}`
      : '';

  const loadToken = useCallback(async () => {
    if (!recipeId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/share?recipeId=${encodeURIComponent(recipeId)}`, {
        cache: 'no-store',
      });
      const json = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        data?: { token: string | null };
        error?: string;
      };
      if (!res.ok || !json.success) {
        throw new Error(json.error || t('share.loadError'));
      }
      setToken(json.data?.token ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('share.loadError'));
    } finally {
      setLoading(false);
    }
  }, [recipeId, t]);

  useEffect(() => {
    if (open) {
      setCopied(false);
      void loadToken();
    } else {
      setToken(null);
      setError(null);
    }
  }, [open, loadToken]);

  const createLink = async () => {
    if (!recipeId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeId }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        data?: { token: string | null };
        error?: string;
      };
      if (!res.ok || !json.success || !json.data?.token) {
        throw new Error(json.error || t('share.createError'));
      }
      setToken(json.data.token);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('share.createError'));
    } finally {
      setBusy(false);
    }
  };

  const stopSharing = async () => {
    if (!recipeId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/share?recipeId=${encodeURIComponent(recipeId)}`, {
        method: 'DELETE',
      });
      const json = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
      if (!res.ok || !json.success) {
        throw new Error(json.error || t('share.revokeError'));
      }
      setToken(null);
      setCopied(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('share.revokeError'));
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    } catch {
      setError(t('share.copyError'));
    }
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pr: 6 }}>
        {t('share.title')}
        <IconButton
          aria-label={t('common.close')}
          onClick={onClose}
          disabled={busy}
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

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : token ? (
          <>
            <DialogContentText sx={{ mb: 2 }}>{t('share.activeBody')}</DialogContentText>
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                fullWidth
                size="small"
                value={shareUrl}
                label={t('share.linkLabel')}
                InputProps={{ readOnly: true }}
                onFocus={(e) => e.target.select()}
              />
              <Tooltip title={copied ? t('share.copied') : t('share.copy')}>
                <span>
                  <IconButton aria-label={t('share.copy')} onClick={copyLink} color="primary">
                    <ContentCopyIcon />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
            {copied ? (
              <Alert severity="success" sx={{ mt: 2 }}>
                {t('share.copied')}
              </Alert>
            ) : null}
          </>
        ) : (
          <DialogContentText>{t('share.inactiveBody')}</DialogContentText>
        )}
      </DialogContent>
      <DialogActions>
        {token ? (
          <Button onClick={stopSharing} color="error" disabled={busy}>
            {t('share.stop')}
          </Button>
        ) : null}
        <Box sx={{ flexGrow: 1 }} />
        <Button onClick={onClose} disabled={busy}>
          {t('common.close')}
        </Button>
        {!token && !loading ? (
          <Button onClick={createLink} variant="contained" disabled={busy || !recipeId}>
            {busy ? t('share.creating') : t('share.create')}
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  );
}
