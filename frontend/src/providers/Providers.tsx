'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { ThemeProvider } from '../components/ThemeProvider';
import { SessionProvider } from '../components/SessionProvider';
import { LanguageProvider } from '../i18n/LanguageProvider';
import EmotionRegistry from '../app/registry';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <EmotionRegistry>
      <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
        <SessionProvider>
          <LanguageProvider>
            <ThemeProvider>{children}</ThemeProvider>
          </LanguageProvider>
        </SessionProvider>
      </NextThemesProvider>
    </EmotionRegistry>
  );
}

