'use client';

import {
  AppBar,
  Box,
  Container,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Toolbar,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '../../components/ThemeToggle';
import { LanguageToggle } from '../../components/LanguageToggle';
import { UserMenu } from '../../components/UserMenu';
import { useTranslation } from '../../i18n/LanguageProvider';
import { featureSections } from './content';

export default function FeaturesPage() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const sections = featureSections[locale];

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            aria-label={t('features.backAria')}
            onClick={() => router.push('/recipes')}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {t('features.title')}
          </Typography>
          <LanguageToggle />
          <ThemeToggle />
          <UserMenu />
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ mt: 4, mb: 6 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {t('features.heading')}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          {t('features.intro')}
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {sections.map((section) => (
            <Paper key={section.id} elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" component="h2">
                {section.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {section.summary}
              </Typography>
              <List dense disablePadding sx={{ mt: 1 }}>
                {section.items.map((item) => (
                  <ListItem key={item} disableGutters alignItems="flex-start" sx={{ py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 32, mt: 0.5 }}>
                      <CheckCircleOutlineIcon fontSize="small" color="primary" />
                    </ListItemIcon>
                    <ListItemText primary={item} />
                  </ListItem>
                ))}
              </List>
            </Paper>
          ))}
        </Box>
      </Container>
    </>
  );
}
