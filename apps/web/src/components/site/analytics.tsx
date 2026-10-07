'use client';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Analítica propia, sin cookies ni identificadores: un beacon por vista a /api/track
 * con la ruta, la fuente (referrer) y el tipo de dispositivo. Respeta "Do Not Track".
 */
export function Analytics() {
  const pathname = usePathname();
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (typeof navigator === 'undefined' || navigator.doNotTrack === '1') return;
    if (last.current === pathname) return;
    const referrer = last.current === null ? document.referrer : `${location.origin}${last.current}`;
    last.current = pathname;
    const device = /\bTravesiaApp\b/i.test(navigator.userAgent) ? 'app' : window.matchMedia('(max-width: 767px)').matches || /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
    const body = JSON.stringify({ path: `${pathname}${location.search}`, referrer, device });
    try {
      if (!navigator.sendBeacon?.('/api/track', new Blob([body], { type: 'application/json' })))
        void fetch('/api/track', { method: 'POST', body, headers: { 'content-type': 'application/json' }, keepalive: true }).catch(() => undefined);
    } catch {
      /* nunca romper la navegación */
    }
  }, [pathname]);

  return null;
}
