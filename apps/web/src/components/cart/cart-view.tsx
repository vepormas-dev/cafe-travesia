'use client';
/** Página /tienda/carrito: tabla del carrito, cupón, estimación de envío por ciudad, puntos y recomendaciones. */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, Loader2, ShieldCheck, ShoppingBag, Tag, Trash2, X } from 'lucide-react';
import { formatCOP, formatNumber, LOYALTY } from '@travesia/shared';
import { useCart } from './cart-store';
import { getPrefs, setPrefs } from './prefs';
import { useQuote } from './use-quote';
import { FreeShippingBar } from './free-shipping';
import { QtyStepper } from './qty';
import { LineThumb } from './line-thumb';
import { Recommendations } from './recommendations';
import { TotalsList } from './totals';
import { RegionSelect } from './region-select';
import { useMe } from '@/components/account/use-me';
import { cn } from '@/lib/cn';

export function CartView() {
  const { lines, count, setQuantity, remove, key } = useCart();
  const { status, me } = useMe();
  const [hydrated, setHydrated] = useState(false);
  const [region, setRegion] = useState('');
  const [city, setCity] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState<string | null>(null);
  const [usePoints, setUsePoints] = useState(false);

  useEffect(() => {
    const p = getPrefs();
    setRegion(p.region ?? '');
    setCity(p.city ?? '');
    setCoupon(p.couponCode ?? null);
    setCouponInput(p.couponCode ?? '');
    setUsePoints(Boolean(p.redeemPoints));
    setHydrated(true);
  }, []);

  const points = me?.loyaltyPoints ?? 0;
  const q = useQuote(hydrated ? lines : [], { region, city, couponCode: coupon, redeemPoints: usePoints ? points : 0 }, 400);
  const totals = q.data?.totals ?? null;
  const cr = q.data?.coupon ?? null;

  useEffect(() => {
    if (hydrated) setPrefs({ region, city, couponCode: coupon, redeemPoints: usePoints });
  }, [hydrated, region, city, coupon, usePoints]);

  if (!hydrated) return <CartSkeleton />;

  if (!lines.length)
    return (
      <div className="card mx-auto flex max-w-xl flex-col items-center gap-4 px-6 py-16 text-center">
        <div className="grid size-20 place-items-center rounded-full bg-arena text-ambar-700">
          <ShoppingBag className="size-8" aria-hidden />
        </div>
        <h2 className="text-3xl">Tu carrito está vacío</h2>
        <p className="text-gris">Tostamos cada semana: elige tu origen y te lo enviamos recién empacado.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/tienda" className="btn-primary">
            Explorar la tienda
          </Link>
          <Link href="/suscripciones" className="btn-outline">
            Ver suscripciones
          </Link>
        </div>
      </div>
    );

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
      <div className="space-y-8">
        <div className="card overflow-hidden">
          <table className="w-full text-left">
            <caption className="sr-only">Productos en tu carrito</caption>
            <thead className="hidden border-b border-noche/10 bg-arena/60 text-xs tracking-wider text-gris uppercase sm:table-header-group">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">
                  Producto
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Cantidad
                </th>
                <th scope="col" className="px-5 py-3 text-right font-semibold">
                  Total
                </th>
                <th scope="col" className="w-12">
                  <span className="sr-only">Quitar</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-noche/10">
              {lines.map((l) => {
                const k = key(l);
                const s = q.data?.lines.find((x) => x.key === k);
                const unit = s?.unitPriceCop ?? l.unitPriceCop;
                const href = l.kind === 'course' ? `/academia/${l.slug}` : `/tienda/${l.slug}`;
                return (
                  <tr key={k} className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4 sm:table-row sm:p-0">
                    <td className="flex flex-1 items-center gap-4 sm:px-5 sm:py-4">
                      <LineThumb name={l.name} imageUrl={l.imageUrl} themeColor={l.themeColor} kind={l.kind} />
                      <div className="min-w-0">
                        <Link href={href} className="font-display text-lg text-noche hover:text-ambar-700">
                          {l.name}
                        </Link>
                        {l.variantName ? <p className="text-sm text-gris">{l.variantName}</p> : null}
                        <p className="text-sm text-gris tabular-nums">{formatCOP(unit)} c/u</p>
                        {s?.stock != null && s.stock < l.quantity ? <p className="text-xs text-cereza">Solo quedan {s.stock} unidades</p> : null}
                      </div>
                    </td>
                    <td className="sm:px-3 sm:py-4">{l.kind === 'course' ? <span className="text-sm text-gris">1 acceso</span> : <QtyStepper size="sm" value={l.quantity} max={Math.min(50, s?.stock ?? 50)} onChange={(n) => setQuantity(k, n)} />}</td>
                    <td className="ml-auto font-semibold text-noche tabular-nums sm:px-5 sm:py-4 sm:text-right">{formatCOP(unit * l.quantity)}</td>
                    <td className="sm:pr-4">
                      <button type="button" onClick={() => remove(k)} className="grid size-9 place-items-center rounded-full text-gris hover:bg-cereza/10 hover:text-cereza" aria-label={`Quitar ${l.name}`}>
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Link href="/tienda" className="link text-sm">
          ← Seguir comprando
        </Link>
        <Recommendations context="cart" cart={lines} exclude={lines.map((l) => l.id)} />
      </div>

      <aside className="lg:sticky lg:top-26 lg:self-start">
        <div className="card space-y-6 p-6">
          <h2 className="text-2xl">
            Resumen <span className="font-sans text-sm text-gris">({count} {count === 1 ? 'artículo' : 'artículos'})</span>
          </h2>
          <FreeShippingBar totals={totals} />

          {/* Cupón */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setCoupon(couponInput.trim().toUpperCase() || null);
            }}
          >
            <label htmlFor="cupon" className="label flex items-center gap-1.5">
              <Tag className="size-4 text-ambar-700" aria-hidden /> Cupón de descuento
            </label>
            {coupon && cr?.ok ? (
              <div className="flex items-center justify-between rounded-xl border border-montana/30 bg-montana/10 px-4 py-2.5 text-sm text-montana">
                <span>
                  <strong>{cr.code}</strong> {cr.description ? `· ${cr.description}` : 'aplicado'}
                </span>
                <button type="button" onClick={() => (setCoupon(null), setCouponInput(''))} className="grid size-7 place-items-center rounded-full hover:bg-montana/10" aria-label="Quitar cupón">
                  <X className="size-4" aria-hidden />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input id="cupon" value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} placeholder="BIENVENIDA10" className={cn('input uppercase', coupon && cr && !cr.ok && 'input-error')} maxLength={40} aria-describedby="cupon-msg" />
                <button type="submit" className="btn-outline shrink-0 px-4" disabled={!couponInput.trim()}>
                  {q.loading && coupon ? <Loader2 className="size-4 animate-spin" aria-hidden /> : 'Aplicar'}
                </button>
              </div>
            )}
            <p id="cupon-msg" className="field-error" aria-live="polite">
              {coupon && cr && !cr.ok ? cr.error : ''}
            </p>
          </form>

          {/* Estimación de envío */}
          {totals?.requiresShipping !== false ? (
            <fieldset className="space-y-2">
              <legend className="label">Estima tu envío</legend>
              <RegionSelect id="cart-region" value={region} onChange={setRegion} />
              <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ciudad o municipio (ej. Medellín)" className="input" aria-label="Ciudad o municipio" autoComplete="address-level2" />
            </fieldset>
          ) : null}

          {/* Puntos */}
          {status === 'user' && points > 0 ? (
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-ambar/40 bg-ambar-100/60 p-3 text-sm">
              <input type="checkbox" checked={usePoints} onChange={(e) => setUsePoints(e.target.checked)} className="mt-0.5 size-4 accent-noche" />
              <span>
                Usar mis <strong>{formatNumber(points)} Puntos Travesía</strong> (hasta {formatCOP(points * LOYALTY.valueCop)}; máx. {LOYALTY.maxRedeemPct} % del pedido)
              </span>
            </label>
          ) : status === 'guest' ? (
            <p className="text-xs text-gris">
              <Link href="/ingresar?next=/tienda/carrito" className="link">
                Inicia sesión
              </Link>{' '}
              para ganar y usar Puntos Travesía.
            </p>
          ) : null}

          {q.error && q.status !== 0 ? <p className="rounded-xl bg-cereza/10 px-3 py-2 text-sm text-cereza">{q.error}</p> : null}
          <TotalsList totals={totals} couponCode={cr?.ok ? cr.code : null} loading={q.loading} shippingHint="Elige tu ciudad" />
          <Link href="/tienda/checkout" className="btn-primary w-full py-4 text-base">
            Continuar al pago <ArrowRight className="size-4" aria-hidden />
          </Link>
          <p className="flex items-center justify-center gap-2 text-xs text-gris">
            <ShieldCheck className="size-4 text-montana" aria-hidden /> Pago seguro con Wompi · Bancolombia
          </p>
        </div>
      </aside>
    </div>
  );
}

export function CartSkeleton() {
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_380px]" aria-busy="true" aria-label="Cargando carrito">
      <div className="card space-y-4 p-5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-4">
            <div className="size-20 animate-pulse rounded-xl bg-noche/10" />
            <div className="flex-1 space-y-2 py-2">
              <div className="h-4 w-1/2 animate-pulse rounded bg-noche/10" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-noche/5" />
            </div>
          </div>
        ))}
      </div>
      <div className="card h-96 animate-pulse bg-noche/5" />
    </div>
  );
}
