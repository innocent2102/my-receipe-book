'use client';

import { Container, Typography, Box, AppBar, Toolbar, Button, Paper } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { ThemeToggle } from '../../components/ThemeToggle';
import { UserMenu } from '../../components/UserMenu';
import { useRouter } from 'next/navigation';

export default function RecipesPage() {
  const router = useRouter();

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            My Recipes
          </Typography>
          <ThemeToggle />
          <UserMenu />
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" component="h1">
            My Recipes
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => router.push('/recipes/add')}
            size="large"
          >
            Add Recipe
          </Button>
        </Box>

        <Paper elevation={2} sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No recipes yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Start building your recipe collection by adding your first recipe!
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => router.push('/recipes/add')}
          >
            Create Your First Recipe
          </Button>
        </Paper>
      </Container>
    </>
  );
}

