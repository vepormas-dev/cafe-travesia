import { Truck } from 'lucide-react';
import { formatCOP, type Totals } from '@travesia/shared';
import { cn } from '@/lib/cn';

/** Barra de progreso hacia el envío gratis de la zona (según la cotización del servidor). */
export function FreeShippingBar({ totals, className }: { totals: Totals | null | undefined; className?: string }) {
  if (!totals?.requiresShipping) return null;
  const threshold = totals.zone?.freeFromCop ?? null;
  if (totals.freeShippingByCoupon || threshold == null) {
    return totals.freeShippingByCoupon ? (
      <p className={cn('flex items-center gap-2 rounded-xl bg-montana/10 px-3 py-2 text-sm text-montana', className)}>
        <Truck className="size-4" aria-hidden /> Tu cupón incluye envío gratis.
      </p>
    ) : null;
  }
  const have = totals.productsSubtotalCop;
  const missing = Math.max(0, threshold - have);
  const pct = Math.min(100, Math.round((have / threshold) * 100));
  return (
    <div className={cn('space-y-2', className)}>
      <p className="flex items-center gap-2 text-sm text-noche">
        <Truck className={cn('size-4', missing === 0 ? 'text-montana' : 'text-ambar-700')} aria-hidden />
        {missing === 0 ? (
          <span>
            <strong>¡Tu envío es gratis!</strong> <span className="text-gris">({totals.zone?.name})</span>
          </span>
        ) : (
          <span>
            Te faltan <strong className="tabular-nums">{formatCOP(missing)}</strong> para envío gratis <span className="text-gris">({totals.zone?.name})</span>
          </span>
        )}
      </p>
      <div className="h-1.5 overflow-hidden rounded-full bg-noche/10" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Progreso hacia el envío gratis">
        <div className={cn('h-full rounded-full transition-[width] duration-500', missing === 0 ? 'bg-montana' : 'bg-ambar')} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
