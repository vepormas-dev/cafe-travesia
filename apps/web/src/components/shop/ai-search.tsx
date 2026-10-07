'use client';
/** Búsqueda inteligente: POST /api/ai/search; si la IA no responde, búsqueda local por palabras clave y precio. */
import Image from 'next/image';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { ArrowRight, Loader2, Search, Sparkles, X } from 'lucide-react';
import { formatCOP, type AiRecommendation, type ProductDTO } from '@travesia/shared';
import { localSearch } from './local-search';
import { api } from './fetcher';

const EXAMPLES = ['algo frutal para V60 por menos de 60 mil', 'un regalo para alguien que ama el café', 'café dulce para greca', 'una experiencia en Medellín'];

export function AiSearch({ products }: { products: ProductDTO[] }) {
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ summary: string; items: AiRecommendation[]; ai: boolean } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function run(query: string) {
    const text = query.trim();
    if (text.length < 2) return;
    setBusy(true);
    const r = await api<{ summary: string; items: AiRecommendation[]; ai: boolean }>('/api/ai/search', { body: { query: text, kind: 'all' } });
    if (r.ok && r.data.items?.length) setRes(r.data);
    else {
      const { items, max } = localSearch(products, text);
      setRes({
        summary: items.length
          ? `Encontramos ${items.length} ${items.length === 1 ? 'opción' : 'opciones'}${max ? ` hasta ${formatCOP(max)}` : ''} para «${text}».`
          : `No encontramos coincidencias exactas para «${text}». Prueba con notas (chocolate, frutal), métodos (V60, espresso) o un presupuesto.`,
        ai: false,
        items: items.slice(0, 6).map((p) => ({
          kind: 'product',
          id: p.id,
          slug: p.slug,
          title: p.name,
          subtitle: p.subtitle,
          imageUrl: p.imageUrl,
          priceCop: p.priceFromCop,
          reason: p.tastingNotes.length ? p.tastingNotes.join(' · ') : (p.subtitle ?? ''),
          href: `/tienda/${p.slug}`,
        })),
      });
    }
    setBusy(false);
  }

  return (
    <div className="w-full">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          void run(q);
        }}
        className="group relative flex items-center rounded-full border border-noche/15 bg-hueso shadow-suave transition focus-within:border-noche focus-within:ring-4 focus-within:ring-ambar/25"
      >
        <Sparkles className="ml-5 size-5 shrink-0 text-ambar" aria-hidden />
        <label htmlFor="ai-q" className="sr-only">
          Búsqueda inteligente
        </label>
        <input
          id="ai-q"
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Describe lo que buscas: «algo frutal para V60 por menos de 60 mil»"
          className="min-w-0 flex-1 bg-transparent px-3 py-4 text-[0.95rem] text-tinta placeholder:text-gris/80 focus:outline-none"
          maxLength={300}
          autoComplete="off"
        />
        {q ? (
          <button type="button" onClick={() => (setQ(''), setRes(null), inputRef.current?.focus())} className="grid size-9 place-items-center rounded-full text-gris hover:bg-noche/5" aria-label="Borrar búsqueda">
            <X className="size-4" aria-hidden />
          </button>
        ) : null}
        <button type="submit" disabled={busy || q.trim().length < 2} className="btn-primary m-1.5 px-5">
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Search className="size-4" aria-hidden />}
          <span className="hidden sm:inline">Buscar</span>
        </button>
      </form>
      {!res ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLES.map((e) => (
            <button key={e} type="button" className="chip bg-hueso/60 transition hover:border-noche" onClick={() => (setQ(e), void run(e))}>
              {e}
            </button>
          ))}
        </div>
      ) : (
        <div className="card mt-4 animate-fade-up p-5" aria-live="polite">
          <div className="flex items-start justify-between gap-3">
            <p className="text-noche">
              {res.ai ? <Sparkles className="mr-1.5 inline size-4 text-ambar" aria-hidden /> : null}
              {res.summary}
            </p>
            <button type="button" onClick={() => setRes(null)} className="grid size-8 shrink-0 place-items-center rounded-full hover:bg-noche/5" aria-label="Cerrar resultados">
              <X className="size-4" aria-hidden />
            </button>
          </div>
          {res.items.length ? (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {res.items.map((r) => (
                <li key={`${r.kind}-${r.id}`}>
                  <Link href={r.href} className="group flex items-center gap-3 rounded-xl border border-noche/10 p-2.5 transition hover:border-ambar/60 hover:bg-crema">
                    <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-arena">{r.imageUrl ? <Image src={r.imageUrl} alt="" fill sizes="56px" className="object-cover" /> : null}</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-noche">{r.title}</p>
                      <p className="truncate text-xs text-gris">{r.reason}</p>
                    </div>
                    <span className="text-sm font-semibold text-noche tabular-nums">{r.priceCop ? formatCOP(r.priceCop) : ''}</span>
                    <ArrowRight className="size-4 text-gris transition group-hover:translate-x-0.5 group-hover:text-noche" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </div>
  );
}
