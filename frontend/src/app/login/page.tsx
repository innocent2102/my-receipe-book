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

export default function LoginPage() {
  const router = useRouter();
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
            ? 'Sign-in is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in frontend/.env.local (see frontend/GOOGLE_OAUTH_SETUP.md).'
            : 'Failed to sign in. Please try again.'
        );
        setIsLoading(false);
      } else if (result?.ok) {
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      setError('An error occurred during sign in.');
      setIsLoading(false);
    }
  };

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            My Recipe Book
          </Typography>
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
              Welcome Back
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
              Sign in to access your recipes and grocery lists
            </Typography>

            {error && (
              <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
                {error}
              </Alert>
            )}

            {providers && !providers.google && (
              <Alert severity="info" sx={{ width: '100%', mb: 2 }}>
                Google sign-in is not configured. Add{' '}
                <code>GOOGLE_CLIENT_ID</code>, <code>GOOGLE_CLIENT_SECRET</code>,{' '}
                <code>NEXTAUTH_URL</code>, and <code>NEXTAUTH_SECRET</code> to{' '}
                <code>.env.local</code> in the frontend folder. See{' '}
                <code>frontend/GOOGLE_OAUTH_SETUP.md</code>.
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
              {isLoading ? 'Signing in...' : 'Sign in with Google'}
            </Button>

            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
              By signing in, you agree to our Terms of Service and Privacy Policy
            </Typography>
          </Paper>
        </Box>
      </Container>
    </>
  );
}

