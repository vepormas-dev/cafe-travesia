import { formatNumber } from '@travesia/shared';
import { cn } from '@/lib/cn';
import { Delta } from '../ui';

type F = { visits: number; carts: number; created: number; paid: number };
const STEPS: { key: keyof F; label: string; hint: string }[] = [
  { key: 'visits', label: 'Visitas', hint: 'page_views' },
  { key: 'carts', label: 'Carritos', hint: 'carritos activos' },
  { key: 'created', label: 'Pedidos creados', hint: 'checkout iniciado' },
  { key: 'paid', label: 'Pagados', hint: 'confirmados por Wompi' },
];
const COLORS = ['#111A31', '#36466E', '#C4741A', '#EB9A37'];

/** Embudo horizontal con tasas de paso entre etapas. */
export function Funnel({ data, prev, compact }: { data: F; prev?: F; compact?: boolean }) {
  const max = Math.max(1, data.visits);
  return (
    <div className={cn('grid gap-3', compact ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2 md:grid-cols-4')}>
      {STEPS.map((s, i) => {
        const v = data[s.key];
        const before = i > 0 ? data[STEPS[i - 1]!.key] : null;
        const rate = before ? (v / Math.max(1, before)) * 100 : 100;
        const h = v ? Math.max(8, (Math.log10(v + 1) / Math.log10(max + 1)) * 100) : 4;
        return (
          <div key={s.key} className="relative flex flex-col">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-xs font-medium text-gris">{s.label}</p>
              {prev ? <Delta value={v} prev={prev[s.key]} /> : null}
            </div>
            <p className="mt-1 text-xl font-semibold text-noche tabular-nums">{formatNumber(v)}</p>
            <div className="mt-3 flex h-28 items-end rounded-lg bg-crema/60 p-1.5">
              <div className="w-full rounded-md transition-[height] duration-1000 ease-out" style={{ height: `${h}%`, background: `linear-gradient(180deg, ${COLORS[i]}, ${COLORS[i]}cc)` }} />
            </div>
            <p className="mt-2 text-[0.7rem] text-gris">
              {i === 0 ? s.hint : (
                <>
                  <span className="font-semibold text-noche">{rate.toLocaleString('es-CO', { maximumFractionDigits: rate < 10 ? 1 : 0 })} %</span> de la etapa anterior
                </>
              )}
            </p>
          </div>
        );
      })}
    </div>
  );
}
