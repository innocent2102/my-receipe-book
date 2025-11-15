'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { ThemeProvider } from '../components/ThemeProvider';
import EmotionRegistry from '../app/registry';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <EmotionRegistry>
      <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
        <ThemeProvider>{children}</ThemeProvider>
      </NextThemesProvider>
    </EmotionRegistry>
  );
}

