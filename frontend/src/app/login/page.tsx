'use client';

import { 
  Container, 
  Box, 
  Paper, 
  Typography, 
  Button, 
  Alert 
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { signIn, getSession, getProviders } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ClientSafeProvider } from 'next-auth/react';
import { AppBar, Toolbar } from '@mui/material';
import { ThemeToggle } from '../../components/ThemeToggle';
import { LanguageToggle } from '../../components/LanguageToggle';
import { useTranslation } from '../../i18n/LanguageProvider';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providers, setProviders] = useState<Record<
    string,
    ClientSafeProvider
  > | null>(null);

  useEffect(() => {
    getProviders().then(setProviders);
  }, []);

  useEffect(() => {
    // Check if user is already logged in
    getSession().then((session) => {
      if (session) {
        router.push('/');
      }
    });
  }, [router]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await signIn('google', {
        callbackUrl: '/',
        redirect: false,
      });

      if (result?.error) {
        setError(
          result.error === 'OAuthSignin' || result.error === 'Configuration'
            ? t('login.errorNotConfigured')
            : t('login.errorGeneric')
        );
        setIsLoading(false);
      } else if (result?.ok) {
        router.push('/');
        router.refresh();
      }
    } catch {
      setError(t('login.errorDuringSignIn'));
      setIsLoading(false);
    }
  };

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {t('common.appName')}
          </Typography>
          <LanguageToggle />
          <ThemeToggle />
        </Toolbar>
      </AppBar>
      <Container maxWidth="sm">
        <Box
          sx={{
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Paper
            elevation={3}
            sx={{
              padding: 4,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '100%',
            }}
          >
            <Typography component="h1" variant="h4" gutterBottom>
              {t('login.title')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
              {t('login.subtitle')}
            </Typography>

            {error && (
              <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
                {error}
              </Alert>
            )}

            {providers && !providers.google && (
              <Alert severity="info" sx={{ width: '100%', mb: 2 }}>
                {t('login.notConfigured')}
              </Alert>
            )}

            <Button
              variant="contained"
              fullWidth
              startIcon={<GoogleIcon />}
              onClick={handleGoogleSignIn}
              disabled={isLoading || !providers?.google}
              sx={{
                mt: 2,
                mb: 2,
                py: 1.5,
                backgroundColor: '#4285f4',
                '&:hover': {
                  backgroundColor: '#357ae8',
                },
              }}
            >
              {isLoading ? t('login.signingIn') : t('login.signInWithGoogle')}
            </Button>

            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
              {t('login.terms')}
            </Typography>
          </Paper>
        </Box>
      </Container>
    </>
  );
}

