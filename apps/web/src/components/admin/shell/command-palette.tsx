'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CornerDownLeft, GraduationCap, Loader2, Package, Search, ShoppingBag, User } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ALL_NAV } from './nav';

type Hit = { type: 'order' | 'product' | 'customer' | 'course' | 'page'; id: string; title: string; subtitle?: string; href: string };
const ICON = { order: ShoppingBag, product: Package, customer: User, course: GraduationCap } as const;
const GROUP = { page: 'Ir a', order: 'Pedidos', customer: 'Clientes', product: 'Productos', course: 'Cursos' } as const;

export function CommandPalette({ open, onClose, role }: { open: boolean; onClose: () => void; role: string }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 10);
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQ('');
      setHits([]);
      setSel(0);
    }
  }, [open]);

  useEffect(() => {
    if (!open || q.trim().length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHits([]);
      return;
    }
    const ctrl = new AbortController();
    const id = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(q.trim())}`, { signal: ctrl.signal });
        const data = (await res.json()) as { results?: Hit[] };
        setHits(data.results ?? []);
        setSel(0);
      } catch {
        /* abortado */
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => {
      clearTimeout(id);
      ctrl.abort();
    };
  }, [q, open]);

  const pages: Hit[] = useMemo(() => {
    const s = q.trim().toLowerCase();
    return ALL_NAV.filter((n) => (!n.adminOnly || role === 'admin') && (!s || n.label.toLowerCase().includes(s) || n.group.toLowerCase().includes(s)))
      .slice(0, s ? 5 : 8)
      .map((n) => ({ type: 'page' as const, id: n.href, title: n.label, subtitle: n.keys ? `${n.group} · atajo ${n.keys}` : n.group, href: n.href }));
  }, [q, role]);
  const all = [...hits, ...pages];

  if (!open) return null;
  const go = (h: Hit) => {
    onClose();
    router.push(h.href);
  };
  const groups = (['order', 'customer', 'product', 'course', 'page'] as const).map((g) => ({ g, items: all.filter((h) => h.type === g) })).filter((x) => x.items.length);

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center p-3 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Búsqueda global">
      <button type="button" aria-label="Cerrar" className="absolute inset-0 bg-noche-950/45 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-noche/10 bg-white shadow-[0_30px_80px_-20px_rgba(10,16,34,0.5)]">
        <div className="flex items-center gap-3 border-b border-noche/[0.08] px-4">
          {loading ? <Loader2 className="size-4 animate-spin text-gris" /> : <Search className="size-4 text-gris" />}
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSel((s) => Math.min(all.length - 1, s + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSel((s) => Math.max(0, s - 1));
              } else if (e.key === 'Enter' && all[sel]) {
                e.preventDefault();
                go(all[sel]!);
              }
            }}
            placeholder="Número de pedido, correo, producto, curso…"
            className="h-14 flex-1 border-0 bg-transparent text-[0.95rem] text-noche outline-none placeholder:text-gris/70"
            aria-label="Buscar"
          />
          <kbd className="rounded border border-noche/15 px-1.5 py-0.5 text-[0.65rem] text-gris">Esc</kbd>
        </div>
        <div className="max-h-[56vh] overflow-y-auto p-2">
          {q.trim().length >= 2 && !loading && hits.length === 0 ? <p className="px-3 py-6 text-center text-sm text-gris">Sin resultados para «{q}».</p> : null}
          {groups.map(({ g, items }) => (
            <div key={g} className="mb-1">
              <p className="px-3 pt-2 pb-1 text-[0.65rem] font-semibold tracking-wider text-gris uppercase">{GROUP[g]}</p>
              {items.map((h) => {
                const i = all.indexOf(h);
                const Icon = h.type === 'page' ? (ALL_NAV.find((n) => n.href === h.href)?.icon ?? Search) : ICON[h.type];
                return (
                  <button
                    key={`${h.type}-${h.id}`}
                    type="button"
                    onMouseEnter={() => setSel(i)}
                    onClick={() => go(h)}
                    className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left', sel === i ? 'bg-crema' : 'hover:bg-crema/60')}
                  >
                    <span className={cn('grid size-8 shrink-0 place-items-center rounded-lg', sel === i ? 'bg-noche text-ambar-300' : 'bg-noche/[0.05] text-noche/70')}>
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-noche">{h.title}</span>
                      {h.subtitle ? <span className="block truncate text-xs text-gris">{h.subtitle}</span> : null}
                    </span>
                    {sel === i ? <CornerDownLeft className="size-3.5 text-gris" /> : null}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 border-t border-noche/[0.08] bg-crema/40 px-4 py-2 text-[0.68rem] text-gris">
          <span>↑↓ navegar</span>
          <span>↵ abrir</span>
          <span>/ o ⌘K buscar</span>
          <span className="hidden sm:inline">g + d/p/c/o/s/a/m/n/l/h ir a sección</span>
        </div>
      </div>
    </div>
  );
}
