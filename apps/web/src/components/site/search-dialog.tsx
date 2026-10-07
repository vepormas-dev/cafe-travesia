'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Loader2, Search, Sparkles, X } from 'lucide-react';
import { formatCOP, type AiRecommendation } from '@travesia/shared';
import { cn } from '@/lib/cn';

const SUGGESTIONS = ['Algo frutal para V60', 'Regalo por menos de 150 mil', 'Café para espresso con leche', 'Curso para principiantes', 'Café para la oficina', 'Descafeinado suave'];
const KIND_LABEL = { product: 'Tienda', course: 'Academia', plan: 'Suscripción' } as const;

export const openSearch = () => window.dispatchEvent(new CustomEvent('ct-search-open'));

export function SearchDialog() {
  const ref = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ summary: string; items: AiRecommendation[]; ai: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reqId = useRef(0);

  const open = useCallback(() => {
    const d = ref.current;
    if (d && !d.open) {
      d.showModal();
      document.documentElement.style.overflow = 'hidden';
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, []);
  const close = useCallback(() => ref.current?.close(), []);

  useEffect(() => {
    const onOpen = () => open();
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        open();
      }
    };
    window.addEventListener('ct-search-open', onOpen);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('ct-search-open', onOpen);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const run = useCallback(async (q: string) => {
    const text = q.trim();
    if (text.length < 2) {
      setResult(null);
      return;
    }
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/search', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: text }) });
      const data = await res.json();
      if (id !== reqId.current) return;
      if (!res.ok) throw new Error(data.error ?? 'No pudimos buscar');
      setResult(data);
    } catch (e) {
      if (id === reqId.current) setError(e instanceof Error ? e.message : 'No pudimos buscar');
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, []);

  // Búsqueda mientras escribe (con pausa)
  useEffect(() => {
    if (query.trim().length < 3) return;
    const h = setTimeout(() => run(query), 450);
    return () => clearTimeout(h);
  }, [query, run]);

  return (
    <dialog
      ref={ref}
      aria-label="Búsqueda inteligente"
      onClose={() => (document.documentElement.style.overflow = '')}
      onClick={(e) => e.target === ref.current && close()}
      className="m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-noche-950/60 backdrop:backdrop-blur-sm open:flex sm:items-start sm:justify-center sm:pt-[10vh]"
    >
      <div className="flex h-full w-full flex-col overflow-hidden bg-crema text-tinta shadow-elevada sm:h-auto sm:max-h-[78vh] sm:max-w-2xl sm:rounded-3xl">
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            run(query);
          }}
          className="flex items-center gap-3 border-b border-noche/10 px-5 py-4"
        >
          <Search className="size-5 shrink-0 text-ambar-700" aria-hidden />
          <label htmlFor="ct-search" className="sr-only">
            ¿Qué se te antoja?
          </label>
          <input
            ref={inputRef}
            id="ct-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Prueba: “algo frutal para V60 por menos de 60 mil”"
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent font-display text-lg text-noche placeholder:font-sans placeholder:text-base placeholder:text-gris/70 focus:outline-none sm:text-xl"
          />
          {loading ? <Loader2 className="size-5 animate-spin text-gris" aria-label="Buscando" /> : null}
          <button type="button" onClick={close} className="grid size-9 place-items-center rounded-full text-noche hover:bg-noche/5" aria-label="Cerrar búsqueda">
            <X className="size-5" aria-hidden />
          </button>
        </form>

        <div className="flex-1 overflow-y-auto px-5 py-5" aria-live="polite">
          {!result && !error ? (
            <div>
              <p className="eyebrow mb-3 flex items-center gap-1.5">
                <Sparkles className="size-3.5" aria-hidden /> Búsqueda inteligente
              </p>
              <p className="mb-4 text-sm text-gris">Escribe como le hablarías a nuestro barista: método, sabores, presupuesto, para quién es…</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setQuery(s);
                      run(s);
                    }}
                    className="chip bg-hueso transition hover:border-noche hover:bg-noche hover:text-crema"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {error ? <p className="rounded-xl bg-cereza/10 px-4 py-3 text-sm text-cereza">{error}</p> : null}
          {result ? (
            <div className={cn('transition-opacity', loading && 'opacity-60')}>
              <p className="mb-4 flex items-start gap-2 text-sm text-noche/80">
                {result.ai ? <span className="mt-0.5 rounded-full bg-ambar-100 px-2 py-0.5 text-[0.65rem] font-bold tracking-wider text-ambar-700">IA</span> : <Sparkles className="mt-0.5 size-4 shrink-0 text-ambar-700" aria-hidden />}
                <span>{result.summary}</span>
              </p>
              <ul className="grid gap-2">
                {result.items.map((i) => (
                  <li key={`${i.kind}-${i.id}`}>
                    <Link href={i.href} onClick={close} className="group flex items-center gap-4 rounded-2xl border border-transparent p-2.5 transition hover:border-noche/10 hover:bg-hueso focus-visible:bg-hueso">
                      <span className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-arena">
                        {i.imageUrl ? <Image src={i.imageUrl} alt="" fill sizes="64px" className="object-cover" /> : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="text-[0.65rem] font-semibold tracking-[0.18em] text-ambar-700 uppercase">{KIND_LABEL[i.kind]}</span>
                        <span className="block truncate font-display text-lg text-noche">{i.title}</span>
                        <span className="line-clamp-1 text-sm text-gris">{i.reason}</span>
                      </span>
                      <span className="hidden shrink-0 text-right text-sm font-semibold text-noche tabular-nums sm:block">{i.priceCop === 0 ? 'Gratis' : formatCOP(i.priceCop)}</span>
                      <ArrowRight className="size-4 shrink-0 text-noche/40 transition group-hover:translate-x-0.5 group-hover:text-noche" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex flex-wrap gap-2 border-t border-noche/10 pt-4 text-sm">
                <Link href="/tienda" onClick={close} className="link">
                  Ver toda la tienda
                </Link>
                <span className="text-gris">·</span>
                <button
                  type="button"
                  className="link"
                  onClick={() => {
                    close();
                    window.dispatchEvent(new CustomEvent('ct-chat-open', { detail: { message: query } }));
                  }}
                >
                  Preguntarle al asistente
                </button>
              </div>
            </div>
          ) : null}
        </div>
        <p className="hidden border-t border-noche/10 px-5 py-2.5 text-xs text-gris sm:block">
          <kbd className="rounded border border-noche/15 bg-hueso px-1.5 font-sans">Esc</kbd> para cerrar · <kbd className="rounded border border-noche/15 bg-hueso px-1.5 font-sans">Ctrl</kbd> + <kbd className="rounded border border-noche/15 bg-hueso px-1.5 font-sans">K</kbd> para abrir
        </p>
      </div>
    </dialog>
  );
}
