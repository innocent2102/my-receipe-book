'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Container,
  Paper,
  Typography,
  Box,
  IconButton,
  AppBar,
  Toolbar,
  CircularProgress,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import { ThemeToggle } from '../../../components/ThemeToggle';
import { LanguageToggle } from '../../../components/LanguageToggle';
import { UserMenu } from '../../../components/UserMenu';
import { RecipeForm, RecipeFormValues } from '../../../components/RecipeForm';
import { takeImportDraft, type ImportedRecipeDraft } from '../../../lib/importDraft';
import { useTranslation } from '../../../i18n/LanguageProvider';

export default function AddRecipePage() {
  const router = useRouter();
  const { status } = useSession();
  const { t } = useTranslation();
  const [draft, setDraft] = useState<ImportedRecipeDraft | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const draftRead = useRef(false);

  // A recipe imported from a website lands here as a draft for review. Reading it
  // clears it, so the guard keeps React's double-run of effects from losing it.
  useEffect(() => {
    if (draftRead.current) return;
    draftRead.current = true;
    setDraft(takeImportDraft());
    setDraftLoaded(true);
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login?callbackUrl=/recipes/add');
    }
  }, [status, router]);

  const handleSubmit = async (values: RecipeFormValues) => {
    const res = await fetch('/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...values, sourceUrl: draft?.sourceUrl }),
    });

    const json = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      error?: string;
    };

    if (res.status === 401) {
      router.replace('/login?callbackUrl=/recipes/add');
      return;
    }

    if (!res.ok || !json.success) {
      throw new Error(json.error || t('add.saveFailedStatus', { status: res.status }));
    }

    router.push('/recipes');
  };

  if (status === 'loading' || !draftLoaded) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => router.back()}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {t('add.appBarTitle')}
          </Typography>
          <LanguageToggle />
          <ThemeToggle />
          <UserMenu />
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Typography variant="h4" component="h1" gutterBottom>
              {t('add.heading')}
            </Typography>
            <IconButton aria-label={t('common.close')} onClick={() => router.back()}>
              <CloseIcon />
            </IconButton>
          </Box>

          <RecipeForm
            initialValues={draft ?? undefined}
            submitLabel={t('add.save')}
            submittingLabel={t('add.saving')}
            onSubmit={handleSubmit}
            onCancel={() => router.back()}
          />
        </Paper>
      </Container>
    </>
  );
}
