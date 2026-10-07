'use client';
/** "Completa tu travesía ✨" / "Combina con ✨": recomendaciones de POST /api/ai/recommend. */
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { formatCOP, type AiRecommendation } from '@travesia/shared';
import type { CartLine } from './cart-store';
import { cn } from '@/lib/cn';

type Props = {
  context: 'cart' | 'product' | 'home' | 'course' | 'account';
  productSlug?: string;
  cart?: CartLine[];
  title?: string;
  variant?: 'compact' | 'grid';
  exclude?: string[];
  className?: string;
};

export function Recommendations({ context, productSlug, cart, title = 'Completa tu travesía ✨', variant = 'grid', exclude = [], className }: Props) {
  const [items, setItems] = useState<AiRecommendation[] | null>(null);
  const [ai, setAi] = useState(false);
  const cartKey = JSON.stringify((cart ?? []).map((l) => [l.kind, l.id, l.variantId ?? null, l.quantity]));

  useEffect(() => {
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const lines = (cart ?? []).map((l) => ({ kind: l.kind, id: l.id, variantId: l.variantId ?? null, quantity: l.quantity }));
        const res = await fetch('/api/ai/recommend', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ context, productSlug, cart: lines.length ? lines : undefined }),
          signal: ctrl.signal,
        });
        if (!res.ok) return setItems([]);
        const data = (await res.json()) as { items?: AiRecommendation[]; ai?: boolean };
        setAi(Boolean(data.ai));
        setItems((data.items ?? []).filter((i) => !exclude.includes(i.id) && !exclude.includes(i.slug)));
      } catch {
        if (!ctrl.signal.aborted) setItems([]);
      }
    }, 500);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context, productSlug, cartKey]);

  if (items === null)
    return (
      <div className={cn('space-y-3', className)} aria-hidden>
        <div className="h-5 w-48 animate-pulse rounded bg-noche/10" />
        <div className={cn('grid gap-3', variant === 'grid' ? 'sm:grid-cols-3' : '')}>
          {[0, 1, 2].slice(0, variant === 'grid' ? 3 : 2).map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-noche/5" />
          ))}
        </div>
      </div>
    );
  if (!items.length) return null;
  const list = items.slice(0, variant === 'grid' ? 3 : 3);

  return (
    <section className={cn('space-y-3', className)} aria-label={title}>
      <div className="flex items-center justify-between gap-2">
        <h3 className={cn('flex items-center gap-2', variant === 'grid' ? 'text-2xl' : 'text-lg')}>
          <Sparkles className="size-4 text-ambar" aria-hidden /> {title}
        </h3>
        {ai ? <span className="text-[0.65rem] tracking-wider text-gris uppercase">Sugerido por IA</span> : null}
      </div>
      <ul className={cn('grid gap-3', variant === 'grid' ? 'sm:grid-cols-3' : '')}>
        {list.map((r) => (
          <li key={`${r.kind}-${r.id}`}>
            <Link
              href={r.href}
              className={cn(
                'group flex gap-3 rounded-2xl border border-noche/10 bg-hueso p-3 transition hover:-translate-y-0.5 hover:border-ambar/60 hover:shadow-suave',
                variant === 'grid' && 'sm:flex-col',
              )}
            >
              <div className={cn('relative size-16 shrink-0 overflow-hidden rounded-xl bg-arena', variant === 'grid' && 'sm:aspect-[4/3] sm:size-auto sm:w-full')}>
                {r.imageUrl ? <Image src={r.imageUrl} alt="" fill sizes="(min-width:640px) 240px, 64px" className="object-cover transition duration-500 group-hover:scale-105" /> : <div className="bg-andino size-full opacity-60" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-base text-noche">{r.title}</p>
                <p className="line-clamp-2 text-xs text-gris">{r.reason}</p>
                <p className="mt-1 text-sm font-semibold text-noche tabular-nums">{r.priceCop ? formatCOP(r.priceCop) : 'Incluido'}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
