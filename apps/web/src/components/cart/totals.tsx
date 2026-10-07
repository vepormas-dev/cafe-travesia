import { formatCOP, formatNumber, type Totals } from '@travesia/shared';
import { cn } from '@/lib/cn';

/** Filas de totales (subtotal, cupón, puntos, envío, total) a partir de la cotización del servidor. */
export function TotalsList({ totals, couponCode, loading, shippingHint, className }: { totals: Totals | null; couponCode?: string | null; loading?: boolean; shippingHint?: string; className?: string }) {
  if (!totals) return null;
  const row = 'flex items-baseline justify-between gap-4 text-sm';
  return (
    <dl className={cn('space-y-2.5 transition-opacity', loading && 'opacity-60', className)} aria-busy={loading}>
      <div className={row}>
        <dt className="text-gris">Subtotal</dt>
        <dd className="text-noche tabular-nums">{formatCOP(totals.subtotalCop)}</dd>
      </div>
      {totals.discountCop > 0 ? (
        <div className={row}>
          <dt className="text-montana">Cupón {couponCode ? <span className="font-semibold">{couponCode}</span> : null}</dt>
          <dd className="text-montana tabular-nums">−{formatCOP(totals.discountCop)}</dd>
        </div>
      ) : null}
      {totals.pointsDiscountCop > 0 ? (
        <div className={row}>
          <dt className="text-montana">Puntos Travesía</dt>
          <dd className="text-montana tabular-nums">−{formatCOP(totals.pointsDiscountCop)}</dd>
        </div>
      ) : null}
      {totals.requiresShipping ? (
        <div className={row}>
          <dt className="text-gris">
            Envío{totals.zone ? <span className="block text-xs">{totals.zone.name} · {totals.zone.etaDays}</span> : shippingHint ? <span className="block text-xs">{shippingHint}</span> : null}
          </dt>
          <dd className="text-noche tabular-nums">{totals.shippingCop === 0 ? <span className="font-semibold text-montana">Gratis</span> : formatCOP(totals.shippingCop)}</dd>
        </div>
      ) : (
        <div className={row}>
          <dt className="text-gris">Envío</dt>
          <dd className="text-gris">No aplica (digital)</dd>
        </div>
      )}
      <div className="flex items-baseline justify-between gap-4 border-t border-noche/10 pt-3">
        <dt className="font-semibold text-noche">Total</dt>
        <dd className="font-display text-2xl font-semibold text-noche tabular-nums">{formatCOP(totals.totalCop)}</dd>
      </div>
      {totals.pointsToEarn > 0 ? <p className="text-right text-xs text-ambar-700">Ganarás {formatNumber(totals.pointsToEarn)} Puntos Travesía con esta compra</p> : null}
    </dl>
  );
}
