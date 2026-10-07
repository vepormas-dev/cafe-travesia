import { COLOMBIA_REGIONS } from '@travesia/shared';
import { cn } from '@/lib/cn';

export function RegionSelect({ id, value, onChange, error, className, required }: { id: string; value: string; onChange: (v: string) => void; error?: string; className?: string; required?: boolean }) {
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={cn('input', error && 'input-error', className)} aria-invalid={Boolean(error)} required={required} autoComplete="address-level1">
      <option value="">Elige un departamento</option>
      {COLOMBIA_REGIONS.map((r) => (
        <option key={r} value={r}>
          {r}
        </option>
      ))}
    </select>
  );
}
