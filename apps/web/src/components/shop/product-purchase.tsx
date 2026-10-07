'use client';
/** Selección de presentación/molienda/fecha, cantidad, precio vivo y agregar al carrito (+ barra fija en móvil). */
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Check, Repeat, ShoppingBag, Truck } from 'lucide-react';
import { formatCOP, formatDate, type ProductDTO, type ProductVariantDTO } from '@travesia/shared';
import { cart } from '@/components/cart/cart-store';
import { QtyStepper } from '@/components/cart/qty';
import { cn } from '@/lib/cn';

const GRIND: Record<string, string> = { grano: 'En grano', fina: 'Fina · espresso', media: 'Molido medio', gruesa: 'Gruesa · prensa' };

export function ProductPurchase({ product: p, tone, savingPct }: { product: ProductDTO; tone: 'light' | 'dark'; savingPct: number }) {
  const dark = tone === 'dark';
  const variants = p.variants;
  const weights = useMemo(() => [...new Set(variants.map((v) => v.weightG).filter((x): x is number => x != null))].sort((a, b) => a - b), [variants]);
  const grinds = useMemo(() => [...new Set(variants.map((v) => v.grind).filter((x): x is string => Boolean(x)))], [variants]);
  const isEvent = variants.some((v) => v.eventAt);
  const byAxes = weights.length > 0 || grinds.length > 0;

  const first = variants.find((v) => v.inStock) ?? variants[0] ?? null;
  const [weight, setWeight] = useState<number | null>(first?.weightG ?? null);
  const [grind, setGrind] = useState<string | null>(first?.grind ?? null);
  const [variantId, setVariantId] = useState<string | null>(first?.id ?? null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [showSticky, setShowSticky] = useState(false);
  const ctaRef = useRef<HTMLDivElement>(null);

  const variant: ProductVariantDTO | null = byAxes && !isEvent
    ? (variants.find((v) => v.weightG === weight && v.grind === grind) ?? variants.find((v) => v.weightG === weight) ?? first)
    : (variants.find((v) => v.id === variantId) ?? first);
  const maxQty = Math.max(1, Math.min(50, variant?.stock ?? 50));

  useEffect(() => {
    if (qty > maxQty) setQty(maxQty);
  }, [maxQty, qty]);

  useEffect(() => {
    const el = ctaRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setShowSticky(!e!.isIntersecting && e!.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const add = () => {
    if (!variant || !variant.inStock) return;
    cart.add({
      kind: 'product',
      id: p.id,
      variantId: variant.id,
      quantity: qty,
      name: p.name,
      variantName: variant.name,
      imageUrl: p.imageUrl,
      slug: p.slug,
      unitPriceCop: variant.priceCop,
      themeColor: p.kind === 'coffee' ? p.themeColor : null,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  const opt = (on: boolean, disabled?: boolean) =>
    cn(
      'group relative flex min-h-11 items-center justify-between gap-2 rounded-xl border px-4 py-2.5 text-left text-sm font-medium transition focus-visible:outline-2',
      on ? (dark ? 'border-crema bg-crema text-noche' : 'border-noche bg-noche text-crema') : dark ? 'border-crema/35 hover:border-crema' : 'border-noche/20 hover:border-noche',
      disabled && 'cursor-not-allowed opacity-45 line-through',
    );
  const mark = (on: boolean) => (
    <span aria-hidden className={cn('grid size-4 place-items-center rounded-full border', on ? 'border-current' : 'border-current opacity-50')}>
      {on ? <Check className="size-3" /> : null}
    </span>
  );
  const legend = 'mb-2 text-xs font-semibold tracking-[0.18em] uppercase opacity-80';
  const price = (variant?.priceCop ?? p.priceFromCop) * qty;
  const compare = variant?.compareAtCop ? variant.compareAtCop * qty : null;

  return (
    <div className="space-y-6">
      {isEvent ? (
        <fieldset>
          <legend className={legend}>Elige la fecha</legend>
          <div className="grid gap-2">
            {variants.map((v) => {
              const on = v.id === variant?.id;
              return (
                <button key={v.id} type="button" disabled={!v.inStock} aria-pressed={on} onClick={() => setVariantId(v.id)} className={opt(on, !v.inStock)}>
                  <span className="flex items-center gap-3">
                    <CalendarDays className="size-4 shrink-0" aria-hidden />
                    <span>
                      <span className="block">{v.eventAt ? formatDate(v.eventAt, { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' }) : v.name}</span>
                      <span className="block text-xs font-normal opacity-75">{v.inStock ? `${v.stock} ${v.stock === 1 ? 'cupo disponible' : 'cupos disponibles'}` : 'Sin cupos'}</span>
                    </span>
                  </span>
                  {mark(on)}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : byAxes ? (
        <>
          {weights.length ? (
            <fieldset>
              <legend className={legend}>Presentación</legend>
              <div className="grid grid-cols-2 gap-2">
                {weights.map((w) => {
                  const vs = variants.filter((v) => v.weightG === w);
                  const on = weight === w;
                  return (
                    <button key={w} type="button" aria-pressed={on} disabled={!vs.some((v) => v.inStock)} onClick={() => setWeight(w)} className={opt(on, !vs.some((v) => v.inStock))}>
                      <span>
                        {w >= 1000 ? `${w / 1000} kg` : `${w} g`}
                        <span className="ml-2 text-xs font-normal opacity-75 tabular-nums">{formatCOP(Math.min(...vs.map((v) => v.priceCop)))}</span>
                      </span>
                      {mark(on)}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ) : null}
          {grinds.length ? (
            <fieldset>
              <legend className={legend}>Molienda</legend>
              <div className="grid grid-cols-2 gap-2">
                {grinds.map((g) => {
                  const v = variants.find((x) => x.grind === g && (weight == null || x.weightG === weight));
                  const on = grind === g;
                  return (
                    <button key={g} type="button" aria-pressed={on} disabled={!v?.inStock} onClick={() => setGrind(g)} className={opt(on, !v?.inStock)}>
                      {GRIND[g] ?? g}
                      {mark(on)}
                    </button>
                  );
                })}
              </div>
              {grind && grind !== 'grano' ? <p className="mt-2 text-xs opacity-75">Molemos al momento de despachar. ¿Otro punto de molienda? Déjalo en las notas del pedido.</p> : null}
            </fieldset>
          ) : null}
        </>
      ) : variants.length > 1 ? (
        <fieldset>
          <legend className={legend}>Opción</legend>
          <div className="grid grid-cols-2 gap-2">
            {variants.map((v) => (
              <button key={v.id} type="button" aria-pressed={v.id === variant?.id} disabled={!v.inStock} onClick={() => setVariantId(v.id)} className={opt(v.id === variant?.id, !v.inStock)}>
                {v.name}
                {mark(v.id === variant?.id)}
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}

      <div className="flex items-end justify-between gap-4">
        <div>
          <p className={legend}>Cantidad</p>
          <QtyStepper value={qty} onChange={setQty} max={maxQty} tone={tone} label={isEvent ? 'Número de personas' : 'Cantidad'} />
        </div>
        <div className="text-right" aria-live="polite">
          <p className="text-xs opacity-75">{variant?.name}</p>
          <p className="font-display text-3xl font-semibold tabular-nums">{formatCOP(price)}</p>
          {compare && compare > price ? <s className="text-sm tabular-nums opacity-70">{formatCOP(compare)}</s> : <p className="text-[0.7rem] opacity-70">Impuestos incluidos</p>}
        </div>
      </div>
      {variant && variant.inStock && variant.stock <= 10 ? <p className="text-sm font-medium">{isEvent ? `¡Quedan ${variant.stock} cupos!` : `Solo quedan ${variant.stock} unidades de esta presentación.`}</p> : null}

      <div ref={ctaRef} className="space-y-3">
        <button type="button" onClick={add} disabled={!variant?.inStock} className={cn('w-full py-4 text-base', dark ? 'btn-ambar' : 'btn-primary')}>
          {added ? <Check className="size-5" aria-hidden /> : <ShoppingBag className="size-5" aria-hidden />}
          {!variant?.inStock ? 'Agotado' : added ? '¡Agregado al carrito!' : isEvent ? 'Reservar mi cupo' : 'Agregar al carrito'}
        </button>
        {p.subscriptionEligible ? (
          <Link href={`/suscripciones?cafe=${p.slug}`} className={cn('w-full py-3.5', dark ? 'btn-light' : 'btn-outline')}>
            <Repeat className="size-4" aria-hidden /> Suscríbete y ahorra{savingPct ? ` hasta ${savingPct} %` : ''}
          </Link>
        ) : null}
        <p className="flex items-center justify-center gap-2 text-xs opacity-80">
          <Truck className="size-4" aria-hidden /> {isEvent ? 'Recibirás la confirmación y las indicaciones por correo.' : 'Tostado esta semana · Envío gratis en el Valle de Aburrá desde $99.000'}
        </p>
      </div>

      {/* Barra fija en móvil */}
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-40 border-t border-noche/10 bg-hueso/95 px-4 py-3 text-noche shadow-elevada backdrop-blur transition-transform duration-300 lg:hidden',
          showSticky ? 'translate-y-0' : 'translate-y-full',
        )}
        aria-hidden={!showSticky}
        inert={!showSticky}
      >
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-base">{p.name}</p>
            <p className="truncate text-xs text-gris">
              {variant?.name} · <span className="font-semibold text-noche tabular-nums">{formatCOP(price)}</span>
            </p>
          </div>
          <button type="button" onClick={add} disabled={!variant?.inStock} className="btn-primary shrink-0">
            {added ? <Check className="size-4" aria-hidden /> : <ShoppingBag className="size-4" aria-hidden />} {added ? 'Listo' : 'Agregar'}
          </button>
        </div>
      </div>
    </div>
  );
}
