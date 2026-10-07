'use client';
import { useId } from 'react';
import { Area, AreaChart, Tooltip, YAxis } from 'recharts';
import { ChartFrame, ChartTooltip, type Fmt } from './base';

export function Sparkline({ data, color = '#EB9A37', height = 44, fmt = 'cop', labels }: { data: number[]; color?: string; height?: number; fmt?: Fmt; labels?: string[] }) {
  const id = useId().replace(/:/g, '');
  const rows = data.map((v, i) => ({ i: labels?.[i] ?? String(i), v }));
  const empty = !data.length || data.every((v) => v === 0);
  if (empty) return <div style={{ height }} className="flex items-end"><div className="h-px w-full bg-noche/10" /></div>;
  return (
    <ChartFrame height={height}>
      <AreaChart data={rows} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`sp-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <YAxis hide domain={['dataMin', 'dataMax']} />
        {labels ? <Tooltip cursor={false} content={(p) => <ChartTooltip active={p.active} payload={p.payload as never} label={p.label} fmt={fmt} names={{ v: 'Valor' }} />} /> : null}
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.75} fill={`url(#sp-${id})`} dot={false} isAnimationActive animationDuration={900} />
      </AreaChart>
    </ChartFrame>
  );
}
