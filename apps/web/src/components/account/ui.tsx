import { Check, CircleX } from 'lucide-react';
import { ORDER_FLOW, ORDER_STATUS_LABEL, SUBSCRIPTION_STATUS_LABEL, formatDate } from '@travesia/shared';
import { cn } from '@/lib/cn';

const ORDER_TONE: Record<string, string> = {
  pending: 'bg-ambar-100 text-ambar-700',
  paid: 'bg-noche/10 text-noche',
  preparing: 'bg-ambar-100 text-ambar-700',
  shipped: 'bg-hoja/20 text-montana',
  delivered: 'bg-montana/15 text-montana',
  cancelled: 'bg-noche/5 text-gris',
  refunded: 'bg-noche/5 text-gris',
  failed: 'bg-cereza/10 text-cereza',
};
const SUB_TONE: Record<string, string> = { active: 'bg-montana/15 text-montana', paused: 'bg-ambar-100 text-ambar-700', past_due: 'bg-cereza/10 text-cereza', pending: 'bg-ambar-100 text-ambar-700', cancelled: 'bg-noche/5 text-gris' };

export function StatusPill({ status, kind = 'order', className }: { status: string; kind?: 'order' | 'subscription'; className?: string }) {
  const label = kind === 'order' ? ORDER_STATUS_LABEL[status] : SUBSCRIPTION_STATUS_LABEL[status];
  const tone = (kind === 'order' ? ORDER_TONE : SUB_TONE)[status] ?? 'bg-noche/5 text-noche';
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold', tone, className)}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {label ?? status}
    </span>
  );
}

const STEP_LABEL: Record<string, string> = { paid: 'Pagado', preparing: 'En preparación', shipped: 'Enviado', delivered: 'Entregado' };

/** Línea de tiempo del pedido: paid → preparing → shipped → delivered. */
export function OrderTimeline({ order, compact }: { order: { status: string; paidAt: string | null; shippedAt: string | null; deliveredAt: string | null; requiresShipping?: boolean }; compact?: boolean }) {
  if (['cancelled', 'refunded', 'failed'].includes(order.status) || order.status === 'pending') {
    return (
      <p className={cn('flex items-center gap-2 rounded-xl px-3 py-2 text-sm', order.status === 'pending' ? 'bg-ambar-100 text-ambar-700' : 'bg-cereza/10 text-cereza')}>
        <CircleX className="size-4" aria-hidden />
        {order.status === 'pending' ? 'Estamos esperando la confirmación del pago.' : ORDER_STATUS_LABEL[order.status]}
      </p>
    );
  }
  const flow: readonly string[] = order.requiresShipping === false ? ['paid'] : ORDER_FLOW;
  const idx = Math.max(0, flow.indexOf(order.status));
  const dates: Record<string, string | null> = { paid: order.paidAt, preparing: null, shipped: order.shippedAt, deliveredAt: null, delivered: order.deliveredAt };
  return (
    <ol className="flex w-full items-start" aria-label="Estado del pedido">
      {flow.map((s, i) => {
        const done = i <= idx;
        return (
          <li key={s} className="relative flex flex-1 flex-col items-center text-center" aria-current={i === idx ? 'step' : undefined}>
            {i > 0 ? <span aria-hidden className={cn('absolute top-3.5 right-1/2 h-0.5 w-full -translate-y-1/2', i <= idx ? 'bg-montana' : 'bg-noche/10')} /> : null}
            <span className={cn('relative z-10 grid size-7 place-items-center rounded-full border-2 transition', done ? 'border-montana bg-montana text-crema' : 'border-noche/15 bg-hueso text-noche/30')}>
              {done ? <Check className="size-3.5" aria-hidden /> : <span className="size-1.5 rounded-full bg-current" />}
            </span>
            <span className={cn('mt-2 text-xs font-semibold', done ? 'text-noche' : 'text-gris')}>{STEP_LABEL[s]}</span>
            {!compact && dates[s] ? <span className="text-[0.7rem] text-gris">{formatDate(dates[s], { day: 'numeric', month: 'short' })}</span> : null}
          </li>
        );
      })}
    </ol>
  );
}

export function PageTitle({ title, intro, children }: { title: string; intro?: string; children?: React.ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="title-lg">{title}</h1>
        {intro ? <p className="mt-2 max-w-2xl text-noche/70">{intro}</p> : null}
      </div>
      {children}
    </header>
  );
}

export function SectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Cargando">
      <div className="h-9 w-64 animate-pulse rounded-lg bg-noche/10" />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-28 animate-pulse rounded-2xl bg-noche/5" />
      ))}
    </div>
  );
}
