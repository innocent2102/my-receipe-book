'use client';

import { Container, Typography, Box, AppBar, Toolbar } from '@mui/material';
import { ThemeToggle } from '../components/ThemeToggle';

export default function Home() {
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
            Welcome to Your Recipe Book
          </Typography>
          <Typography variant="h6" color="text.secondary" align="center">
            Create and save your own recipes, access your favorites instantly, and generate grocery lists in seconds.
          </Typography>
        </Box>
      </Container>
    </>
  );
}
