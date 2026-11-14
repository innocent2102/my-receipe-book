'use client';

import { Container, Typography, Box, AppBar, Toolbar, Button } from '@mui/material';
import { ThemeToggle } from '../components/ThemeToggle';
import { LanguageToggle } from '../components/LanguageToggle';
import { UserMenu } from '../components/UserMenu';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '../i18n/LanguageProvider';

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {t('common.appName')}
          </Typography>
          <LanguageToggle />
          <ThemeToggle />
          <UserMenu />
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Typography variant="h3" component="h1" gutterBottom>
            {session?.user
              ? t('home.welcomeBack', { name: session.user.name?.split(' ')[0] ?? '' })
              : t('home.welcome')}
          </Typography>
          <Typography variant="h6" color="text.secondary" align="center">
            {t('home.tagline')}
          </Typography>
          {session ? (
            <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
              <Button
                variant="contained"
                size="large"
                onClick={() => router.push('/recipes/add')}
              >
                {t('home.addRecipe')}
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={() => router.push('/recipes')}
              >
                {t('home.viewRecipes')}
              </Button>
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
              {t('home.signInPrompt')}
            </Typography>
          )}
        </Box>
      </Container>
    </>
  );
}
