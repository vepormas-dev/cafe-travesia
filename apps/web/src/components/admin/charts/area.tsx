'use client';
import { useId } from 'react';
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import { CHART, SERIES } from '@/lib/admin/labels';
import { shortDay } from '@/lib/admin/range';
import { ChartFrame, ChartTooltip, Legend, axisProps, fmtAxis, fmtDayTick, type Fmt } from './base';

/** Área simple con degradado (MRR semanal, vistas diarias…). */
export function AreaTrend({ data, xKey, yKey, name, color = CHART.ambar, fmt = 'cop', height = 220, weekly }: { data: Record<string, number | string>[]; xKey: string; yKey: string; name: string; color?: string; fmt?: Fmt; height?: number; weekly?: boolean }) {
  const id = useId().replace(/:/g, '');
  const vals = data.map((d) => Number(d[yKey]) || 0);
  const min = Math.min(...vals);
  return (
    <ChartFrame height={height} empty={!vals.some(Boolean)}>
      <AreaChart data={data} margin={{ top: 8, right: 6, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`at-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.45} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={CHART.grid} strokeDasharray="3 4" />
        <XAxis dataKey={xKey} {...axisProps} tickFormatter={(v) => (weekly ? shortDay(String(v)) : fmtDayTick(String(v)))} minTickGap={18} dy={6} />
        <YAxis {...axisProps} width={60} tickFormatter={(v) => fmtAxis(Number(v), fmt)} domain={[Math.floor(min * 0.85), 'auto']} />
        <Tooltip cursor={{ stroke: color, strokeOpacity: 0.4 }} content={(p) => <ChartTooltip active={p.active} payload={p.payload as never} label={p.label} labelFmt={weekly ? (l) => `Semana del ${shortDay(l)}` : undefined} fmt={fmt} names={{ [yKey]: name }} />} />
        <Area type="monotone" dataKey={yKey} name={name} stroke={color} strokeWidth={2.2} fill={`url(#at-${id})`} animationDuration={1100} activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} />
      </AreaChart>
    </ChartFrame>
  );
}

/** Áreas apiladas por clave (tráfico por fuente). */
export function StackedAreas({ data, keys, height = 280, fmt = 'num' }: { data: Record<string, number | string>[]; keys: string[]; height?: number; fmt?: Fmt }) {
  const id = useId().replace(/:/g, '');
  return (
    <div>
      <Legend className="mb-3" items={keys.map((k, i) => ({ key: k, label: k, color: SERIES[i % SERIES.length]! }))} />
      <ChartFrame height={height} empty={!data.length}>
        <AreaChart data={data} margin={{ top: 8, right: 6, bottom: 0, left: 0 }}>
          <defs>
            {keys.map((k, i) => (
              <linearGradient key={k} id={`sa-${i}-${id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={SERIES[i % SERIES.length]} stopOpacity={0.55} />
                <stop offset="100%" stopColor={SERIES[i % SERIES.length]} stopOpacity={0.08} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid vertical={false} stroke={CHART.grid} strokeDasharray="3 4" />
          <XAxis dataKey="day" {...axisProps} tickFormatter={fmtDayTick} minTickGap={18} dy={6} />
          <YAxis {...axisProps} width={52} tickFormatter={(v) => fmtAxis(Number(v), fmt)} />
          <Tooltip content={(p) => <ChartTooltip active={p.active} payload={p.payload as never} label={p.label} fmt={fmt} total />} />
          {keys.map((k, i) => (
            <Area key={k} type="monotone" dataKey={k} stackId="1" stroke={SERIES[i % SERIES.length]} strokeWidth={1.2} fill={`url(#sa-${i}-${id})`} isAnimationActive={false} />
          ))}
        </AreaChart>
      </ChartFrame>
    </div>
  );
}
