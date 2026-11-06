import type { ReactNode } from 'react';
import { preload } from 'react-dom';
import { BootScript } from '@/components/BootScript';
import '@/styles/global.css';

export default function RootLayout({ children }: { children: ReactNode }) {
  preload('/fonts/fraunces-latin-opsz-normal.woff2', {
    as: 'font',
    type: 'font/woff2',
    crossOrigin: 'anonymous',
  });
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <BootScript />
      </head>
      <body>{children}</body>
    </html>
  );
}
