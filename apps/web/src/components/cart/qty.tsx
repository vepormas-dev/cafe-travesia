'use client';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';

export function QtyStepper({ value, onChange, max = 50, label = 'Cantidad', size = 'md', tone = 'light', disabled }: { value: number; onChange: (n: number) => void; max?: number; label?: string; size?: 'sm' | 'md'; tone?: 'light' | 'dark'; disabled?: boolean }) {
  const btn = cn('grid place-items-center transition disabled:opacity-30', size === 'sm' ? 'size-8' : 'size-11', tone === 'dark' ? 'hover:bg-crema/10' : 'hover:bg-noche/5');
  return (
    <div className={cn('inline-flex items-center rounded-full border', tone === 'dark' ? 'border-crema/30 text-crema' : 'border-noche/15 text-noche')} role="group" aria-label={label}>
      <button type="button" className={cn(btn, 'rounded-l-full')} onClick={() => onChange(Math.max(1, value - 1))} disabled={disabled || value <= 1} aria-label="Restar uno">
        <Minus className="size-3.5" aria-hidden />
      </button>
      <span className={cn('min-w-8 text-center font-semibold tabular-nums', size === 'sm' ? 'text-sm' : '')} aria-live="polite">
        {value}
      </span>
      <button type="button" className={cn(btn, 'rounded-r-full')} onClick={() => onChange(Math.min(max, value + 1))} disabled={disabled || value >= max} aria-label="Sumar uno">
        <Plus className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}
