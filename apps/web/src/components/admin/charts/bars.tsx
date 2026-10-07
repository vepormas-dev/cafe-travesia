'use client';
import { useId } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts';
import { CHART, SERIES } from '@/lib/admin/labels';
import { shortDay } from '@/lib/admin/range';
import { ChartFrame, ChartTooltip, axisProps, fmtAxis, fmtValue, type Fmt } from './base';

/** Barras horizontales por categoría con degradado de marca y % de participación. */
export function CategoryBars({ data, height: hIn, fmt = 'cop' }: { data: { name: string; value: number }[]; height?: number; fmt?: Fmt }) {
  const id = useId().replace(/:/g, '');
  const total = data.reduce((s, d) => s + d.value, 0);
  const height = hIn ?? Math.max(180, data.length * 38 + 20);
  return (
    <ChartFrame height={height} empty={!total}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 44, bottom: 0, left: 0 }} barCategoryGap="26%">
        <defs>
          {data.map((_, i) => (
            <linearGradient key={i} id={`cb-${i}-${id}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={SERIES[i % SERIES.length]} stopOpacity={0.6} />
              <stop offset="100%" stopColor={SERIES[i % SERIES.length]} stopOpacity={1} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid horizontal={false} stroke={CHART.grid} strokeDasharray="3 4" />
        <XAxis type="number" {...axisProps} tickFormatter={(v) => fmtAxis(Number(v), fmt)} />
        <YAxis type="category" dataKey="name" {...axisProps} width={96} tick={{ ...axisProps.tick, fill: '#111A31', fontSize: 12 }} />
        <Tooltip cursor={{ fill: CHART.noche, fillOpacity: 0.04 }} content={(p) => <ChartTooltip active={p.active} payload={p.payload as never} label={p.label} labelFmt={(l) => l} fmt={fmt} names={{ value: fmt === 'cop' ? 'Ventas' : 'Total' }} />} />
        <Bar dataKey="value" radius={[2, 6, 6, 2]} animationDuration={900}>
          {data.map((_, i) => (
            <Cell key={i} fill={`url(#cb-${i}-${id})`} />
          ))}
          <LabelList dataKey="value" position="right" formatter={(v: unknown) => (total ? `${Math.round((Number(v) / total) * 100)}%` : '')} style={{ fill: '#5f5a54', fontSize: 11, fontWeight: 600 }} />
        </Bar>
      </BarChart>
    </ChartFrame>
  );
}

/** Barras simples por semana (inscripciones, etc.). */
export function WeeklyBars({ data, height = 200, color = CHART.montana, fmt = 'num', name = 'Total' }: { data: { week: string; n: number }[]; height?: number; color?: string; fmt?: Fmt; name?: string }) {
  const id = useId().replace(/:/g, '');
  return (
    <ChartFrame height={height} empty={!data.some((d) => d.n)}>
      <BarChart data={data} margin={{ top: 8, right: 0, bottom: 0, left: 0 }} barCategoryGap="28%">
        <defs>
          <linearGradient id={`wb-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={1} />
            <stop offset="100%" stopColor={color} stopOpacity={0.45} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={CHART.grid} strokeDasharray="3 4" />
        <XAxis dataKey="week" {...axisProps} tickFormatter={(w) => shortDay(String(w))} interval={1} dy={6} />
        <YAxis {...axisProps} width={34} allowDecimals={false} tickFormatter={(v) => fmtAxis(Number(v), fmt)} />
        <Tooltip cursor={{ fill: CHART.noche, fillOpacity: 0.04 }} content={(p) => <ChartTooltip active={p.active} payload={p.payload as never} label={p.label} labelFmt={(l) => `Semana del ${shortDay(l)}`} fmt={fmt} names={{ n: name }} />} />
        <Bar dataKey="n" fill={`url(#wb-${id})`} radius={[5, 5, 1, 1]} animationDuration={900} />
      </BarChart>
    </ChartFrame>
  );
}

/** Altas (positivas) vs. bajas (negativas) por semana. */
export function DivergingBars({ data, height = 220 }: { data: { week: string; altas: number; bajas: number }[]; height?: number }) {
  return (
    <ChartFrame height={height} empty={!data.some((d) => d.altas || d.bajas)}>
      <BarChart data={data} stackOffset="sign" margin={{ top: 8, right: 0, bottom: 0, left: 0 }} barCategoryGap="26%">
        <CartesianGrid vertical={false} stroke={CHART.grid} strokeDasharray="3 4" />
        <XAxis dataKey="week" {...axisProps} tickFormatter={(w) => shortDay(String(w))} interval={1} dy={6} />
        <YAxis {...axisProps} width={30} allowDecimals={false} />
        <ReferenceLine y={0} stroke={CHART.noche} strokeOpacity={0.25} />
        <Tooltip cursor={{ fill: CHART.noche, fillOpacity: 0.04 }} content={(p) => <ChartTooltip active={p.active} payload={p.payload as never} label={p.label} labelFmt={(l) => `Semana del ${shortDay(l)}`} fmt="num" names={{ altas: 'Altas', bajas: 'Cancelaciones' }} />} />
        <Bar dataKey="altas" stackId="s" fill={CHART.montana} radius={[4, 4, 0, 0]} animationDuration={900} />
        <Bar dataKey="bajas" stackId="s" fill={CHART.cereza} fillOpacity={0.85} radius={[0, 0, 4, 4]} animationDuration={900} />
      </BarChart>
    </ChartFrame>
  );
}

/** Barras apiladas ok/error (eventos por hora). */
export function OkErrorBars({ data, height = 160, xKey = 'hour' }: { data: { ok: number; error: number; [k: string]: number | string }[]; height?: number; xKey?: string }) {
  return (
    <ChartFrame height={height} empty={!data.some((d) => d.ok || d.error)}>
      <BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }} barCategoryGap="18%">
        <XAxis dataKey={xKey} {...axisProps} interval={3} tickFormatter={(h) => `${h}h`} />
        <YAxis hide />
        <Tooltip cursor={{ fill: CHART.noche, fillOpacity: 0.04 }} content={(p) => <ChartTooltip active={p.active} payload={p.payload as never} label={p.label} labelFmt={(l) => `${l}:00 – ${l}:59`} fmt="num" names={{ ok: 'Correctos', error: 'Errores' }} />} />
        <Bar dataKey="ok" stackId="a" fill={CHART.noche} fillOpacity={0.8} animationDuration={700} />
        <Bar dataKey="error" stackId="a" fill={CHART.cereza} radius={[3, 3, 0, 0]} animationDuration={700} />
      </BarChart>
    </ChartFrame>
  );
}

/** Lista de barras horizontales (estilo BarList de Tremor) — ventas por ciudad, páginas, etc. */
export function BarList({ items, fmt = 'cop', color = CHART.noche, max: maxIn, stacked }: { items: { name: string; value: number; hint?: string }[]; fmt?: Fmt; color?: string; max?: number; stacked?: boolean }) {
  const max = maxIn ?? Math.max(1, ...items.map((i) => i.value));
  if (stacked && items.length)
    return (
      <ul className="space-y-3">
        {items.map((it, i) => (
          <li key={`${it.name}-${i}`}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
              <span className="min-w-0 truncate font-medium text-noche" title={it.name}>{it.name}</span>
              <span className="shrink-0 font-semibold text-noche tabular-nums">{fmtValue(it.value, fmt)}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-noche/[0.06]">
              <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.max(2, (it.value / max) * 100)}%`, background: color }} />
            </div>
          </li>
        ))}
      </ul>
    );
  if (!items.length) return <p className="py-6 text-center text-xs text-gris">Sin datos en este periodo</p>;
  return (
    <ul className="space-y-1.5">
      {items.map((it, i) => (
        <li key={`${it.name}-${i}`} className="group relative flex items-center justify-between gap-3 text-sm">
          <div className="relative h-8 flex-1 overflow-hidden rounded-md">
            <div className="absolute inset-y-0 left-0 rounded-md transition-[width] duration-700 ease-out group-hover:opacity-90" style={{ width: `${Math.max(2, (it.value / max) * 100)}%`, background: `linear-gradient(90deg, ${color}26, ${color}12)` }} />
            <div className="relative flex h-full items-center gap-2 px-2.5">
              <span className="truncate font-medium text-noche">{it.name}</span>
              {it.hint ? <span className="truncate text-xs text-gris">{it.hint}</span> : null}
            </div>
          </div>
          <span className="min-w-[3.5rem] shrink-0 text-right font-semibold text-noche tabular-nums">{fmtValue(it.value, fmt)}</span>
        </li>
      ))}
    </ul>
  );
}
