import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'My Recipe Book',
  description: 'Create and save your own recipes, access your favorites instantly, and generate grocery lists in seconds.',
  manifest: '/manifest.json',
  themeColor: '#ffffff',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

