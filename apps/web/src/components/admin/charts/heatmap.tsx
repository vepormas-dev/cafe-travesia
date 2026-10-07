'use client';
import { useState } from 'react';
import { cn } from '@/lib/cn';

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DAYS_LONG = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

/** Mapa de calor día de la semana × hora (pedidos pagados, hora Bogotá). */
export function Heatmap({ data }: { data: number[][] }) {
  const [hover, setHover] = useState<{ d: number; h: number } | null>(null);
  const max = Math.max(1, ...data.flat());
  const total = data.flat().reduce((a, b) => a + b, 0);
  const peak = data.flatMap((row, d) => row.map((v, h) => ({ d, h, v }))).sort((a, b) => b.v - a.v)[0];
  const color = (v: number) => {
    if (!v) return 'rgba(17,26,49,0.04)';
    const x = v / max;
    if (x < 0.5) return `rgba(235,154,55,${0.12 + x * 1.1})`;
    return `rgba(17,26,49,${0.35 + (x - 0.5) * 1.3})`;
  };
  return (
    <div>
      <div className="mb-3 flex min-h-5 items-center justify-between text-xs text-gris">
        {hover ? (
          <span>
            <strong className="text-noche">{data[hover.d]![hover.h]} pedidos</strong> · {DAYS_LONG[hover.d]} {hover.h}:00–{hover.h}:59
          </span>
        ) : peak && total ? (
          <span>
            Hora pico: <strong className="text-noche">{DAYS_LONG[peak.d]} {peak.h}:00</strong> ({peak.v} pedidos)
          </span>
        ) : (
          <span>Sin pedidos en el periodo</span>
        )}
        <span className="hidden items-center gap-1 sm:flex">
          Menos
          {[0.05, 0.25, 0.5, 0.75, 1].map((x) => (
            <span key={x} className="size-2.5 rounded-[2px]" style={{ background: color(x * max) }} />
          ))}
          Más
        </span>
      </div>
      <div className="overflow-x-auto">
        <div className="grid min-w-[520px] grid-cols-[2.2rem_repeat(24,minmax(0,1fr))] gap-[3px]" onMouseLeave={() => setHover(null)}>
          {data.map((row, d) => (
            <div key={d} className="contents">
              <span className="self-center text-[0.68rem] font-medium text-gris">{DAYS[d]}</span>
              {row.map((v, h) => (
                <span
                  key={h}
                  onMouseEnter={() => setHover({ d, h })}
                  title={`${DAYS_LONG[d]} ${h}:00 · ${v} pedidos`}
                  className={cn('aspect-square rounded-[3px] transition-transform duration-150 hover:scale-125 hover:ring-2 hover:ring-ambar', hover?.d === d && hover.h === h && 'ring-2 ring-ambar')}
                  style={{ background: color(v) }}
                />
              ))}
            </div>
          ))}
          <span />
          {Array.from({ length: 24 }, (_, h) => (
            <span key={h} className="text-center text-[0.6rem] text-gris">
              {h % 3 === 0 ? h : ''}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
