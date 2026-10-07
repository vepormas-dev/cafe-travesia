'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import type { AiRecommendation } from '@travesia/shared';
import { formatCOP } from '@travesia/shared';

/** Sugeridos (POST /api/ai/recommend {context:'course'}). Si falla o no hay resultados, no se muestra. */
export function RecommendedCourses({ exclude = [] }: { exclude?: string[] }) {
  const [items, setItems] = useState<AiRecommendation[] | null>(null);
  const excludeKey = exclude.join(',');
  useEffect(() => {
    const ctrl = new AbortController();
    fetch('/api/ai/recommend', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ context: 'course' }), signal: ctrl.signal })
      .then((r) => (r.ok ? (r.json() as Promise<{ items?: AiRecommendation[] }>) : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        const skip = new Set(excludeKey.split(',').filter(Boolean));
        const list = (d.items ?? []).filter((i) => !skip.has(i.id));
        const courses = list.filter((i) => i.kind === 'course');
        setItems((courses.length ? courses : list).slice(0, 3));
      })
      .catch(() => setItems([]));
    return () => ctrl.abort();
  }, [excludeKey]);

  if (!items?.length) return null;
  return (
    <section aria-labelledby="sugeridos" className="mt-14">
      <h2 id="sugeridos" className="flex items-center gap-2 font-display text-2xl">
        <Sparkles className="size-5 text-ambar-700" aria-hidden /> Sugeridos para ti
      </h2>
      <ul className="mt-5 grid gap-4 sm:grid-cols-3">
        {items.map((i) => (
          <li key={`${i.kind}:${i.id}`}>
            <Link href={i.href} className="group flex h-full gap-4 rounded-2xl border border-noche/10 bg-hueso p-3 transition hover:border-noche/30 hover:shadow-suave">
              <span className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-arena">
                {i.imageUrl ? <Image src={i.imageUrl} alt="" fill sizes="80px" className="object-cover transition group-hover:scale-105" /> : null}
              </span>
              <span className="min-w-0">
                <span className="block font-display text-base leading-snug text-noche">{i.title}</span>
                <span className="mt-1 line-clamp-2 block text-xs text-gris">{i.reason}</span>
                <span className="mt-1 block text-xs font-semibold text-noche">{i.priceCop ? formatCOP(i.priceCop) : 'Gratis'}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
