'use client';
/**
 * Carrito lateral (lo monta el layout del sitio). Accesible: role=dialog, foco atrapado,
 * Esc para cerrar, devuelve el foco al disparador. Abre con el evento 'ct-cart-open'.
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, ShoppingBag, Trash2, X } from 'lucide-react';
import { formatCOP } from '@travesia/shared';
import { useCart } from './cart-store';
import { useCartSync } from './cart-sync';
import { getPrefs } from './prefs';
import { useQuote } from './use-quote';
import { FreeShippingBar } from './free-shipping';
import { QtyStepper } from './qty';
import { LineThumb } from './line-thumb';
import { Recommendations } from './recommendations';
import { cn } from '@/lib/cn';

export function CartDrawer() {
  useCartSync();
  const { lines, count, subtotal, setQuantity, remove, key } = useCart();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const pathname = usePathname();
  const [prefs, setPrefsState] = useState<{ region?: string | null; city?: string | null }>({});

  const quote = useQuote(open ? lines : [], { region: prefs.region, city: prefs.city }, 300);
  const totals = quote.data?.totals ?? null;

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const onOpen = () => {
      lastFocus.current = document.activeElement as HTMLElement | null;
      setPrefsState(getPrefs());
      setOpen(true);
    };
    window.addEventListener('ct-cart-open', onOpen);
    return () => window.removeEventListener('ct-cart-open', onOpen);
  }, []);

  // Cerrar al navegar
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- cerrar el carrito al cambiar de ruta
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) {
      lastFocus.current?.focus?.();
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const id = requestAnimationFrame(() => closeRef.current?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const f = panelRef.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])');
      if (!f.length) return;
      const first = f[0]!;
      const last = f[f.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(id);
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  const shownSubtotal = totals?.subtotalCop ?? subtotal;

  return (
    <div className={cn('fixed inset-0 z-[70]', open ? 'pointer-events-auto' : 'pointer-events-none')} aria-hidden={!open} inert={!open}>
      <div className={cn('absolute inset-0 bg-noche-950/50 backdrop-blur-[2px] transition-opacity duration-300', open ? 'opacity-100' : 'opacity-0')} onClick={close} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ct-cart-title"
        className={cn(
          'absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-crema shadow-elevada transition-transform duration-300 ease-[cubic-bezier(0.2,0.7,0.2,1)]',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <header className="flex items-center justify-between border-b border-noche/10 px-5 py-4">
          <h2 id="ct-cart-title" className="flex items-center gap-2 text-2xl">
            Tu carrito <span className="rounded-full bg-noche px-2 py-0.5 font-sans text-xs font-semibold text-crema tabular-nums">{count}</span>
          </h2>
          <button ref={closeRef} type="button" onClick={close} className="grid size-10 place-items-center rounded-full hover:bg-noche/5" aria-label="Cerrar carrito">
            <X className="size-5" aria-hidden />
          </button>
        </header>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
            <div className="grid size-20 place-items-center rounded-full bg-arena text-ambar-700">
              <ShoppingBag className="size-8" aria-hidden />
            </div>
            <h3 className="text-2xl">Tu carrito está vacío</h3>
            <p className="text-gris">Si vas a tomar café… que sea de verdad. Empieza por nuestro origen Caicedo.</p>
            <Link href="/tienda" className="btn-primary" onClick={close}>
              Ir a la tienda
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
              <FreeShippingBar totals={totals} />
              {quote.error && quote.status !== 0 ? <p className="rounded-xl bg-cereza/10 px-3 py-2 text-sm text-cereza">{quote.error}</p> : null}
              <ul className="divide-y divide-noche/10">
                {lines.map((l) => {
                  const k = key(l);
                  const server = quote.data?.lines.find((x) => x.key === k);
                  const href = l.kind === 'course' ? `/academia/${l.slug}` : `/tienda/${l.slug}`;
                  return (
                    <li key={k} className="flex gap-4 py-4">
                      <Link href={href} onClick={close} className="shrink-0">
                        <LineThumb name={l.name} imageUrl={l.imageUrl} themeColor={l.themeColor} kind={l.kind} />
                      </Link>
                      <div className="flex min-w-0 flex-1 flex-col gap-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <Link href={href} onClick={close} className="block truncate font-display text-lg text-noche hover:text-ambar-700">
                              {l.name}
                            </Link>
                            {l.variantName ? <p className="text-xs text-gris">{l.variantName}</p> : null}
                          </div>
                          <button type="button" onClick={() => remove(k)} className="grid size-8 shrink-0 place-items-center rounded-full text-gris hover:bg-cereza/10 hover:text-cereza" aria-label={`Quitar ${l.name}`}>
                            <Trash2 className="size-4" aria-hidden />
                          </button>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          {l.kind === 'course' ? <span className="text-xs text-gris">Acceso de por vida</span> : <QtyStepper size="sm" value={l.quantity} max={Math.min(50, server?.stock ?? 50)} onChange={(n) => setQuantity(k, n)} />}
                          <span className="font-semibold text-noche tabular-nums">{formatCOP((server?.unitPriceCop ?? l.unitPriceCop) * l.quantity)}</span>
                        </div>
                        {server?.stock != null && server.stock < l.quantity ? <p className="text-xs text-cereza">Solo quedan {server.stock} unidades.</p> : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
              <Recommendations context="cart" cart={lines} variant="compact" exclude={lines.map((l) => l.id)} />
            </div>

            <footer className="space-y-3 border-t border-noche/10 bg-hueso px-5 py-4">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-gris">Subtotal</span>
                <span className={cn('text-xl font-semibold text-noche tabular-nums transition-opacity', quote.loading && 'opacity-60')}>{formatCOP(shownSubtotal)}</span>
              </div>
              <p className="text-xs text-gris">Envío, cupones y puntos se calculan en el pago.</p>
              <div className="grid grid-cols-2 gap-2">
                <Link href="/tienda/carrito" className="btn-outline" onClick={close}>
                  Ver carrito
                </Link>
                <Link href="/tienda/checkout" className="btn-primary" onClick={close}>
                  Pagar <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
