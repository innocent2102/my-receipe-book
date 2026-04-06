import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '../providers/Providers';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#ffffff',
};

export const metadata: Metadata = {
  title: 'My Recipe Book',
  description: 'Create and save your own recipes, access your favorites instantly, and generate grocery lists in seconds.',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

