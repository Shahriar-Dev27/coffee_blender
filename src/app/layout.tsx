import type { ReactNode } from 'react';
import '@/styles/global.css';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="preload"
          as="font"
          type="font/woff2"
          crossOrigin=""
          href="/fonts/fraunces-latin-opsz-normal.woff2"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
