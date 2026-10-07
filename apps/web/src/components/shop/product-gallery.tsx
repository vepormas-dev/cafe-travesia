'use client';
import Image from 'next/image';
import { useState } from 'react';
import { CoffeeBag } from '@/components/brand/coffee-bag';
import { cn } from '@/lib/cn';

type Slide = { type: 'bag' } | { type: 'photo'; src: string };

/** Galería: bolsa ilustrada (cafés) + fotos reales, con miniaturas accesibles. */
export function ProductGallery({ name, origin, color, accent, photos, showBag, tone }: { name: string; origin?: string | null; color: string; accent: string; photos: string[]; showBag: boolean; tone: 'light' | 'dark' }) {
  const slides: Slide[] = [...(showBag ? [{ type: 'bag' as const }] : []), ...photos.map((src) => ({ type: 'photo' as const, src }))];
  if (!slides.length) slides.push({ type: 'bag' });
  const [i, setI] = useState(0);
  const cur = slides[i]!;
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative aspect-[4/5] w-full max-w-[460px]">
        {slides.map((s, k) => (
          <div key={k} className={cn('absolute inset-0 transition duration-500', k === i ? 'opacity-100' : 'pointer-events-none scale-[0.98] opacity-0')} aria-hidden={k !== i}>
            {s.type === 'bag' ? (
              <div className="mx-auto h-full w-[78%] pt-4">
                <CoffeeBag name={name} origin={origin} color={color} accent={accent} className="h-full drop-shadow-[0_40px_40px_rgba(10,16,34,0.45)]" />
              </div>
            ) : (
              <div className="arch relative h-full overflow-hidden shadow-elevada ring-1 ring-black/5">
                <Image src={s.src} alt={`${name}: foto ${k + (showBag ? 0 : 1)}`} fill priority={k === 0} sizes="(min-width:1024px) 40vw, 92vw" className="object-cover" />
              </div>
            )}
          </div>
        ))}
        <span className="sr-only" aria-live="polite">
          Imagen {i + 1} de {slides.length}
          {cur.type === 'bag' ? ': empaque' : ''}
        </span>
      </div>
      {slides.length > 1 ? (
        <div className="flex gap-3" role="group" aria-label="Imágenes del producto">
          {slides.map((s, k) => (
            <button
              key={k}
              type="button"
              onClick={() => setI(k)}
              aria-label={s.type === 'bag' ? 'Ver empaque' : `Ver foto ${k + (showBag ? 0 : 1)}`}
              aria-pressed={k === i}
              className={cn(
                'relative size-16 overflow-hidden rounded-2xl ring-2 ring-offset-2 transition',
                tone === 'dark' ? 'ring-offset-transparent' : 'ring-offset-transparent',
                k === i ? (tone === 'dark' ? 'ring-crema' : 'ring-noche') : 'opacity-70 ring-transparent hover:opacity-100',
              )}
              style={{ backgroundColor: s.type === 'bag' ? accent : undefined }}
            >
              {s.type === 'bag' ? (
                <div className="absolute inset-x-2.5 top-1.5 bottom-0">
                  <CoffeeBag name={name} color={color} accent={accent} />
                </div>
              ) : (
                <Image src={s.src} alt="" fill sizes="64px" className="object-cover" />
              )}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
