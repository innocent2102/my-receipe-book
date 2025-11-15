'use client';

import { ThemeProvider as MUIThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { lightTheme, darkTheme } from '../theme/theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const { theme, systemTheme } = useTheme();
  const [currentTheme, setCurrentTheme] = useState(lightTheme);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    const effectiveTheme = theme === 'system' ? systemTheme : theme;
    setCurrentTheme(effectiveTheme === 'dark' ? darkTheme : lightTheme);
  }, [theme, systemTheme, mounted]);

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <MUIThemeProvider theme={currentTheme}>
      <CssBaseline />
      {children}
    </MUIThemeProvider>
  );
}

