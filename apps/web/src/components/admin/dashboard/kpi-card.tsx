import { formatCOP, formatNumber } from '@travesia/shared';
import { cn } from '@/lib/cn';
import type { Kpi } from '@/lib/admin/types';
import { Sparkline } from '../charts/sparkline';
import { Delta } from '../ui';
import type { Fmt } from '../charts/base';

const fmt = (v: number, f: Fmt) => (f === 'cop' ? formatCOP(v) : f === 'pct' ? `${v.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %` : formatNumber(v));

export function KpiCard({ label, kpi, format = 'cop', icon, color = '#EB9A37', hint, invert, highlight, sparkLabels }: { label: string; kpi: Kpi; format?: Fmt; icon?: React.ReactNode; color?: string; hint?: string; invert?: boolean; highlight?: boolean; sparkLabels?: string[] }) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border p-4 pb-2 transition hover:-translate-y-0.5 hover:shadow-[0_14px_36px_-18px_rgba(17,26,49,0.35)]',
        highlight ? 'border-noche bg-noche text-crema' : 'border-noche/[0.08] bg-white shadow-[0_1px_2px_rgba(17,26,49,0.04)]',
      )}
    >
      {highlight ? <div aria-hidden className="pointer-events-none absolute -top-10 -right-10 size-40 rounded-full bg-ambar/20 blur-2xl" /> : null}
      <div className="relative flex items-center justify-between gap-2">
        <p className={cn('flex items-center gap-2 text-[0.78rem] font-medium', highlight ? 'text-crema/70' : 'text-gris')}>
          {icon ? <span className={cn('grid size-6 place-items-center rounded-md', highlight ? 'bg-white/10 text-ambar-300' : 'bg-crema text-noche/70')}>{icon}</span> : null}
          {label}
        </p>
        <Delta value={kpi.value} prev={kpi.prev} invert={invert} className={highlight ? '!bg-white/10 !text-ambar-300' : undefined} />
      </div>
      <p className={cn('relative mt-2 text-[1.6rem] leading-none font-semibold tracking-tight tabular-nums', highlight ? 'text-crema' : 'text-noche')}>{fmt(kpi.value, format)}</p>
      <p className={cn('relative mt-1.5 text-[0.7rem]', highlight ? 'text-crema/55' : 'text-gris')}>{hint ?? `Antes: ${fmt(kpi.prev, format)}`}</p>
      <div className="relative -mx-4 mt-1">
        <Sparkline data={kpi.spark} color={highlight ? '#F5C27A' : color} height={46} fmt={format} labels={sparkLabels} />
      </div>
    </div>
  );
}
