'use client';
/** Base de los gráficos del panel: contenedor con skeleton, tooltip en COP y formateadores. */
import { useEffect, useState } from 'react';
import { ResponsiveContainer } from 'recharts';
import { formatCOP, formatCOPShort, formatNumber } from '@travesia/shared';
import { cn } from '@/lib/cn';
import { shortDay } from '@/lib/admin/range';

export type Fmt = 'cop' | 'num' | 'pct';
export const fmtValue = (v: number, f: Fmt = 'cop') => (f === 'cop' ? formatCOP(v) : f === 'pct' ? `${v.toLocaleString('es-CO', { maximumFractionDigits: 1 })} %` : formatNumber(Math.round(v)));
export const fmtAxis = (v: number, f: Fmt = 'cop') => (f === 'cop' ? formatCOPShort(v) : f === 'pct' ? `${v}%` : v >= 1000 ? `${(v / 1000).toLocaleString('es-CO', { maximumFractionDigits: 1 })} mil` : String(v));
export const fmtDayTick = (d: string) => (typeof d === 'string' && d.length === 10 ? shortDay(d) : String(d));

function useMounted() {
  const [m, setM] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setM(true), []);
  return m;
}

/** Contenedor responsive: muestra un skeleton hasta montar (evita saltos de SSR) y luego anima. */
export function ChartFrame({ height = 260, children, className, empty, emptyText = 'Aún no hay datos en este periodo' }: { height?: number; children: React.ReactElement; className?: string; empty?: boolean; emptyText?: string }) {
  const mounted = useMounted();
  if (empty)
    return (
      <div className={cn('grid place-items-center rounded-lg border border-dashed border-noche/10 bg-crema/30 text-center text-xs text-gris', className)} style={{ height }}>
        <div>
          <svg aria-hidden viewBox="0 0 120 40" className="mx-auto mb-2 h-8 w-24 text-noche/15">
            <path d="M0 35 C20 30 30 10 50 18 S80 32 95 12 120 8 120 8" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
          {emptyText}
        </div>
      </div>
    );
  return (
    <div className={cn('relative w-full', className)} style={{ height }}>
      {mounted ? (
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height }}>
          {children}
        </ResponsiveContainer>
      ) : (
        <div className="h-full w-full animate-pulse rounded-lg bg-gradient-to-t from-noche/[0.06] to-transparent" />
      )}
    </div>
  );
}

type TPayload = { name?: string | number; value?: number | string | (number | string)[]; color?: string; dataKey?: string | number; payload?: Record<string, unknown>; stroke?: string; fill?: string };

/** Tooltip con estética de marca. */
export function ChartTooltip({ active, payload, label, fmt = 'cop', labelFmt, total, names, hideZero }: { active?: boolean; payload?: readonly TPayload[]; label?: string | number; fmt?: Fmt; labelFmt?: (l: string) => string; total?: boolean; names?: Record<string, string>; hideZero?: boolean }) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((p) => !hideZero || Number(p.value) !== 0);
  const sum = rows.reduce((s, p) => s + (p.dataKey === 'prevTotal' ? 0 : Number(p.value) || 0), 0);
  const l = label != null ? (labelFmt ? labelFmt(String(label)) : fmtDayTick(String(label))) : null;
  return (
    <div className="min-w-[11rem] rounded-xl border border-noche/10 bg-white/95 px-3 py-2.5 text-xs shadow-[0_12px_32px_-12px_rgba(17,26,49,0.35)] backdrop-blur">
      {l ? <p className="mb-1.5 font-semibold text-noche">{l}</p> : null}
      <ul className="space-y-1">
        {rows.map((p, i) => (
          <li key={`${p.dataKey ?? p.name}-${i}`} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-gris">
              <span className="size-2 rounded-full" style={{ background: p.color ?? p.stroke ?? p.fill, opacity: p.dataKey === 'prevTotal' ? 0.5 : 1 }} />
              {names?.[String(p.dataKey)] ?? p.name}
            </span>
            <span className="font-semibold text-noche tabular-nums">{fmtValue(Math.abs(Number(p.value) || 0), fmt)}</span>
          </li>
        ))}
      </ul>
      {total && rows.length > 1 ? (
        <p className="mt-1.5 flex justify-between border-t border-noche/[0.07] pt-1.5 font-semibold text-noche">
          <span>Total</span>
          <span className="tabular-nums">{fmtValue(sum, fmt)}</span>
        </p>
      ) : null}
    </div>
  );
}

export const axisProps = {
  tick: { fill: '#8A847C', fontSize: 11, fontFamily: 'var(--font-dm-sans)' },
  tickLine: false,
  axisLine: false,
} as const;

export function Legend({ items, className, onToggle, hidden }: { items: { key: string; label: string; color: string; dashed?: boolean }[]; className?: string; onToggle?: (k: string) => void; hidden?: Set<string> }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-1 text-xs', className)}>
      {items.map((i) => (
        <button key={i.key} type="button" onClick={() => onToggle?.(i.key)} className={cn('inline-flex items-center gap-1.5 text-noche/75 transition', onToggle ? 'hover:text-noche' : 'cursor-default', hidden?.has(i.key) && 'opacity-40 line-through')}>
          {i.dashed ? <span className="h-0 w-4 border-t-2 border-dashed" style={{ borderColor: i.color }} /> : <span className="size-2.5 rounded-[3px]" style={{ background: i.color }} />}
          {i.label}
        </button>
      ))}
    </div>
  );
}
