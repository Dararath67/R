import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { DataProvider } from '@/context/DataContext';

import { BannedUserGuard } from '@/components/user/BannedUserGuard';

export const metadata: Metadata = {
  title: 'TERK TLA - Movie Streaming App',
  description: 'Stream movies, blockbusters, anime, and series in HD 4K.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'TERK TLA Movie',
  },
};

export const viewport: Viewport = {
  themeColor: '#020617',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="km">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Kantumruy+Pro:ital,wght@0,400..700;1,400..700&family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <link rel="apple-touch-icon" href="https://api.dicebear.com/7.x/bottts/svg?seed=TERKTLA" />
      </head>
      <body className="antialiased bg-slate-950 text-slate-100 font-sans">
        <AuthProvider>
          <DataProvider>
            <BannedUserGuard>
              {children}
            </BannedUserGuard>
          </DataProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
