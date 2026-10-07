'use client';
import { useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CalendarDays, Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { RANGE_OPTIONS, parseRange } from '@/lib/admin/range';

/** Selector de rango del dashboard (?r=7d|30d|90d|mes). */
export function RangePicker() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const cur = parseRange(sp.get('r'));
  return (
    <div className="hidden items-center gap-1 rounded-lg border border-noche/10 bg-white p-0.5 shadow-[0_1px_1px_rgba(17,26,49,0.03)] sm:flex" role="radiogroup" aria-label="Rango de fechas">
      {pending ? <Loader2 className="mx-1.5 size-3.5 animate-spin text-gris" /> : <CalendarDays className="mx-1.5 size-3.5 text-gris" />}
      {RANGE_OPTIONS.map((o) => (
        <button
          key={o.key}
          type="button"
          role="radio"
          aria-checked={cur === o.key}
          title={o.label}
          onClick={() => {
            const next = new URLSearchParams(sp.toString());
            if (o.key === '30d') next.delete('r');
            else next.set('r', o.key);
            const q = next.toString();
            start(() => router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false }));
          }}
          className={cn('rounded-md px-2.5 py-1 text-xs font-semibold transition', cur === o.key ? 'bg-noche text-crema shadow-sm' : 'text-noche/65 hover:bg-noche/5 hover:text-noche')}
        >
          {o.short}
        </button>
      ))}
    </div>
  );
}
