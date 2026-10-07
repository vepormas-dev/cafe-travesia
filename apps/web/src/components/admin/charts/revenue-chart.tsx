'use client';
import { useId, useState } from 'react';
import { Area, CartesianGrid, ComposedChart, Line, Tooltip, XAxis, YAxis } from 'recharts';
import { CHART } from '@/lib/admin/labels';
import { ChartFrame, ChartTooltip, Legend, axisProps, fmtAxis, fmtDayTick } from './base';

type Row = { day: string; store: number; subs: number; courses: number; total: number; prevTotal: number };
const SERIES = [
  { key: 'store', label: 'Tienda', color: CHART.noche },
  { key: 'subs', label: 'Suscripciones', color: CHART.ambar },
  { key: 'courses', label: 'Cursos', color: CHART.montana },
] as const;

/** Ingresos diarios apilados (tienda / suscripciones / cursos) vs. periodo anterior. */
export function RevenueChart({ data, height = 300 }: { data: Row[]; height?: number }) {
  const id = useId().replace(/:/g, '');
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const toggle = (k: string) => setHidden((h) => {
    const n = new Set(h);
    if (n.has(k)) n.delete(k);
    else n.add(k);
    return n;
  });
  const empty = data.every((d) => d.total === 0 && d.prevTotal === 0);
  const ticks = data.length > 31 ? Math.ceil(data.length / 8) : data.length > 14 ? 3 : 0;
  return (
    <div>
      <Legend
        className="mb-3"
        onToggle={toggle}
        hidden={hidden}
        items={[...SERIES.map((s) => ({ key: s.key, label: s.label, color: s.color })), { key: 'prevTotal', label: 'Periodo anterior', color: CHART.noche400, dashed: true }]}
      />
      <ChartFrame height={height} empty={empty}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            {SERIES.map((s) => (
              <linearGradient key={s.key} id={`rv-${s.key}-${id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={s.key === 'store' ? 0.5 : 0.65} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0.04} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid vertical={false} stroke={CHART.grid} strokeDasharray="3 4" />
          <XAxis dataKey="day" {...axisProps} tickFormatter={fmtDayTick} interval={ticks} minTickGap={12} dy={6} />
          <YAxis {...axisProps} tickFormatter={(v) => fmtAxis(Number(v))} width={64} />
          <Tooltip
            cursor={{ stroke: CHART.noche, strokeOpacity: 0.15, strokeWidth: 28 }}
            content={(p) => <ChartTooltip active={p.active} payload={p.payload as never} label={p.label} total names={{ store: 'Tienda', subs: 'Suscripciones', courses: 'Cursos', prevTotal: 'Periodo anterior' }} />}
          />
          {SERIES.map((s) =>
            hidden.has(s.key) ? null : (
              <Area key={s.key} type="monotone" dataKey={s.key} name={s.label} stackId="1" stroke={s.color} strokeWidth={1.6} fill={`url(#rv-${s.key}-${id})`} animationDuration={1100} animationEasing="ease-out" activeDot={{ r: 3.5, strokeWidth: 2, stroke: '#fff' }} />
            ),
          )}
          {hidden.has('prevTotal') ? null : <Line type="monotone" dataKey="prevTotal" name="Periodo anterior" stroke={CHART.noche400} strokeWidth={1.5} strokeDasharray="5 5" dot={false} animationDuration={1300} />}
        </ComposedChart>
      </ChartFrame>
    </div>
  );
}
