'use client';
import { useState } from 'react';
import { Check, Link2, Share2 } from 'lucide-react';
import { FacebookIcon, WhatsAppIcon } from './social-icons';

/** Compartir: Web Share API (móvil), WhatsApp, Facebook y copiar enlace. */
export function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const btn = 'grid size-10 place-items-center rounded-full border border-noche/15 text-noche transition hover:border-noche hover:bg-noche hover:text-crema';
  const enc = encodeURIComponent;
  return (
    <div className="flex items-center gap-2">
      <span className="mr-1 text-xs font-semibold tracking-[0.18em] text-gris uppercase">Compartir</span>
      <button
        type="button"
        className={`${btn} sm:hidden`}
        aria-label="Compartir"
        onClick={() => navigator.share?.({ title, url }).catch(() => undefined)}
      >
        <Share2 className="size-4" aria-hidden />
      </button>
      <a className={btn} href={`https://wa.me/?text=${enc(`${title} ${url}`)}`} target="_blank" rel="noopener noreferrer" aria-label="Compartir por WhatsApp">
        <WhatsAppIcon className="size-4" />
      </a>
      <a className={btn} href={`https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`} target="_blank" rel="noopener noreferrer" aria-label="Compartir en Facebook">
        <FacebookIcon className="size-4" />
      </a>
      <button
        type="button"
        className={btn}
        aria-label={copied ? 'Enlace copiado' : 'Copiar enlace'}
        onClick={async () => {
          await navigator.clipboard?.writeText(url).catch(() => undefined);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        }}
      >
        {copied ? <Check className="size-4" aria-hidden /> : <Link2 className="size-4" aria-hidden />}
      </button>
    </div>
  );
}
