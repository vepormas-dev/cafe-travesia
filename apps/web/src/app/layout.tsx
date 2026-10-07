import type { Metadata, Viewport } from 'next';
import { Playfair_Display, DM_Sans, Caveat_Brush } from 'next/font/google';
import { Toaster } from 'sonner';
import { brand } from '@travesia/shared';
import { env } from '@/lib/env';
import './globals.css';

const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair', display: 'swap', style: ['normal', 'italic'] });
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans', display: 'swap' });
const caveat = Caveat_Brush({ subsets: ['latin'], weight: '400', variable: '--font-caveat', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl),
  title: { default: `${brand.name} · Café especial de Caicedo, Antioquia`, template: `%s · ${brand.name}` },
  description: brand.claim,
  applicationName: brand.name,
  openGraph: { type: 'website', locale: 'es_CO', siteName: brand.name },
  twitter: { card: 'summary_large_image' },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: brand.colors.noche,
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CO" className={`${playfair.variable} ${dmSans.variable} ${caveat.variable}`}>
      <body>
        {children}
        <Toaster position="top-center" richColors closeButton toastOptions={{ style: { fontFamily: 'var(--font-dm-sans)' } }} />
      </body>
    </html>
  );
}
