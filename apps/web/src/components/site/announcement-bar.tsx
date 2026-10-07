import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getSiteContent } from '@/lib/data/catalog';

/** Barra de anuncio editable desde el CMS (home.banner). */
export async function AnnouncementBar() {
  const banner = await getSiteContent('home.banner');
  if (!banner.enabled || !banner.text) return null;
  const parts = banner.text.split('·').map((s) => s.trim()).filter(Boolean);
  const content = (
    <span className="inline-flex items-center gap-3">
      {parts.map((p, i) => (
        <span key={i} className="inline-flex items-center gap-3">
          {i > 0 ? <span aria-hidden className="inline-block size-1.5 rotate-45 bg-ambar" /> : null}
          {p}
        </span>
      ))}
      {banner.href ? <ArrowRight className="size-3.5 opacity-70 transition group-hover:translate-x-0.5" aria-hidden /> : null}
    </span>
  );
  return (
    <div className="relative z-50 bg-noche-950 text-crema">
      <div className="container-site flex min-h-9 items-center justify-center py-1.5 text-center text-[0.78rem] font-medium tracking-wide">
        {banner.href ? (
          <Link href={banner.href} className="group hover:text-ambar-300">
            {content}
          </Link>
        ) : (
          content
        )}
      </div>
    </div>
  );
}
