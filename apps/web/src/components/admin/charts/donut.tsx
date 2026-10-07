'use client';
import { useState } from 'react';
import { Cell, Pie, PieChart, Tooltip } from 'recharts';
import { SERIES } from '@/lib/admin/labels';
import { ChartFrame, ChartTooltip, fmtValue, type Fmt } from './base';

/** Donut con total al centro y leyenda con porcentajes. */
export function Donut({ data, fmt = 'num', height = 200, centerLabel = 'Total', colors = SERIES, horizontal }: { horizontal?: boolean; data: { name: string; value: number }[]; fmt?: Fmt; height?: number; centerLabel?: string; colors?: readonly string[] }) {
  const [active, setActive] = useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.value, 0);
  const shown = active != null ? data[active] : null;
  return (
    <div className={horizontal ? 'flex flex-col items-center gap-4 sm:flex-row' : 'flex flex-col items-center gap-3'}>
      <div className="relative w-full max-w-[180px] shrink-0">
        <ChartFrame height={height} empty={!total}>
          <PieChart>
            <Tooltip content={(p) => <ChartTooltip active={p.active} payload={p.payload as never} fmt={fmt} />} />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="64%"
              outerRadius="92%"
              paddingAngle={2}
              cornerRadius={4}
              stroke="none"
              animationDuration={900}
              onMouseEnter={(_, i) => setActive(i)}
              onMouseLeave={() => setActive(null)}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} opacity={active == null || active === i ? 1 : 0.35} />
              ))}
            </Pie>
          </PieChart>
        </ChartFrame>
        {total ? (
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
            <div>
              <p className="text-[0.65rem] font-medium tracking-wide text-gris uppercase">{shown?.name ?? centerLabel}</p>
              <p className="text-lg font-semibold text-noche tabular-nums">{fmt === 'cop' ? fmtValue(shown?.value ?? total, 'cop').replace(/\s/g, ' ') : fmtValue(shown?.value ?? total, fmt)}</p>
            </div>
          </div>
        ) : null}
      </div>
      <ul className="w-full space-y-2 text-sm">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center gap-2" onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}>
            <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: colors[i % colors.length] }} />
            <span className="flex-1 truncate text-noche/80">{d.name}</span>
            <span className="text-xs text-gris tabular-nums">{fmtValue(d.value, fmt)}</span>
            <span className="w-11 text-right font-semibold text-noche tabular-nums">{total ? Math.round((d.value / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
