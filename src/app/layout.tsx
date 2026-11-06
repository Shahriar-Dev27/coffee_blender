import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { preload } from 'react-dom';
import { BootScript } from '@/components/BootScript';
import '@/styles/global.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3100'),
  title: 'BREOU CAFFEE — A little everyday ritual',
  description: 'A cup, a pause, a little possibility. Make your own coffee in the BREOU interactive demo.',
  openGraph: { title: 'BREOU CAFFEE — Make a little moment', description: 'Your coffee. Your little ritual.', images: [{ url: '/assets/share-final-1200x630.webp', width: 1200, height: 630 }] },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  preload('/fonts/bricolage-grotesque-latin.woff2', {
    as: 'font',
    type: 'font/woff2',
    crossOrigin: 'anonymous',
  });
  preload('/fonts/instrument-sans-latin.woff2', { as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' });
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <BootScript />
        <link rel="preload" as="image" href="/assets/cup-s1-cup-320x400.avif" imageSrcSet="/assets/cup-s1-cup-320x400.avif 320w, /assets/cup-s1-cup-480x600.avif 480w, /assets/cup-s1-cup-800x1000.avif 800w, /assets/cup-s1-cup-1200x1500.avif 1200w" imageSizes="292px" type="image/avif" media="(max-width: 40rem)" fetchPriority="high" />
        <link rel="preload" as="image" href="/assets/cup-s1-cup-2400x1350.avif" type="image/avif" media="(min-width: 40.001rem)" fetchPriority="high" />
      </head>
      <body>{children}</body>
    </html>
  );
}
