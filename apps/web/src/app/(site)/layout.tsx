import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getSiteContent } from '@/lib/data/catalog';
import { AnnouncementBar } from '@/components/site/announcement-bar';
import { SiteHeader, SiteHeaderFallback } from '@/components/site/site-header';
import { AccountSlot, AccountSlotFallback } from '@/components/site/account-slot';
import { SiteFooter } from '@/components/site/site-footer';
import { Analytics } from '@/components/site/analytics';
import { ChatWidget } from '@/components/chat/chat-widget';
import { CookieNotice } from '@/components/site/cookie-notice';
import { CartDrawer } from '@/components/cart/cart-drawer';

const OG_IMAGE = { url: '/opengraph-image', width: 1200, height: 630, alt: 'Café Travesía · Café especial de Caicedo, Antioquia' };

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSiteContent('seo');
  return {
    title: { default: seo.title, template: '%s · Café Travesía' },
    description: seo.description,
    // Este openGraph reemplaza al del layout raíz; sin `images` se perdía la imagen de /opengraph-image
    openGraph: { type: 'website', locale: 'es_CO', siteName: 'Café Travesía', title: seo.title, description: seo.description, images: [OG_IMAGE] },
    twitter: { card: 'summary_large_image', title: seo.title, description: seo.description, images: [OG_IMAGE.url] },
  };
}

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#contenido" className="sr-only z-[60] rounded-full bg-noche px-5 py-3 text-sm font-semibold text-crema focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Saltar al contenido
      </a>
      <AnnouncementBar />
      <Suspense fallback={<SiteHeaderFallback />}>
        <SiteHeader
          account={
            <Suspense fallback={<AccountSlotFallback />}>
              <AccountSlot />
            </Suspense>
          }
        />
      </Suspense>
      <main id="contenido" className="min-h-[60vh]">
        {children}
      </main>
      <SiteFooter />
      <Suspense fallback={null}>
        <CartDrawer />
      </Suspense>
      <ChatWidget />
      <CookieNotice />
      <Suspense fallback={null}>
        <Analytics />
      </Suspense>
    </>
  );
}
