'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { formatCOP, type AiRecommendation } from '@travesia/shared';
import { cn } from '@/lib/cn';

const KIND = { product: 'Tienda', course: 'Academia', plan: 'Suscripción' } as const;

/** "Recomendado para ti ✨": POST /api/ai/recommend. Skeleton mientras carga; se oculta si no hay ítems. */
export function Recommended({
  context = 'home',
  productSlug,
  courseSlug,
  title = 'Recomendado para ti ✨',
  eyebrow = 'Elegido para tu taza',
  className,
}: {
  context?: 'home' | 'product' | 'cart' | 'course' | 'account';
  productSlug?: string;
  courseSlug?: string;
  title?: string;
  eyebrow?: string;
  className?: string;
}) {
  const [items, setItems] = useState<AiRecommendation[] | null>(null);
  const [ai, setAi] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch('/api/ai/recommend', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ context, productSlug, courseSlug }), signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d: { items: AiRecommendation[]; ai: boolean }) => {
        setItems(d.items ?? []);
        setAi(Boolean(d.ai));
      })
      .catch(() => !ctrl.signal.aborted && setItems([]));
    return () => ctrl.abort();
  }, [context, productSlug, courseSlug]);

  if (items && items.length === 0) return null;

  return (
    <section aria-labelledby="reco-title" className={cn('container-site py-20', className)}>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">{eyebrow}</p>
          <h2 id="reco-title" className="title-lg">
            {title}
          </h2>
        </div>
        {ai ? <span className="rounded-full bg-ambar-100 px-3 py-1 text-xs font-semibold text-ambar-700">Seleccionado con IA</span> : null}
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-busy={!items}>
        {(items ?? Array.from({ length: 4 }, () => null)).slice(0, 4).map((i, idx) =>
          i ? (
            <li key={`${i.kind}-${i.id}`}>
              <Link href={i.href} className="group flex h-full flex-col overflow-hidden rounded-3xl border border-noche/10 bg-hueso shadow-suave transition hover:-translate-y-1 hover:shadow-elevada">
                <div className="relative aspect-[4/3] overflow-hidden bg-arena">
                  {i.imageUrl ? <Image src={i.imageUrl} alt="" fill sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition duration-700 group-hover:scale-105" /> : null}
                  <span className="absolute top-3 left-3 rounded-full bg-crema/95 px-2.5 py-1 text-[0.65rem] font-bold tracking-wider text-noche uppercase">{KIND[i.kind]}</span>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-display text-xl leading-tight text-noche">{i.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-gris">{i.reason}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="font-semibold text-noche tabular-nums">{i.priceCop === 0 ? 'Gratis' : `${i.kind === 'plan' ? '' : 'Desde '}${formatCOP(i.priceCop)}`}</span>
                    <ArrowUpRight className="size-5 text-noche/40 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-ambar-700" aria-hidden />
                  </div>
                </div>
              </Link>
            </li>
          ) : (
            <li key={idx} className="overflow-hidden rounded-3xl border border-noche/5 bg-hueso" aria-hidden>
              <div className="aspect-[4/3] animate-pulse bg-arena" />
              <div className="space-y-3 p-5">
                <div className="h-5 w-2/3 animate-pulse rounded bg-arena" />
                <div className="h-4 w-full animate-pulse rounded bg-arena/70" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-arena/70" />
              </div>
            </li>
          ),
        )}
      </ul>
    </section>
  );
}
