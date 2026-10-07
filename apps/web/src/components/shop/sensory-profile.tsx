import { PROFILE_LABELS, type SensoryProfile as Profile } from '@travesia/shared';
import { cn } from '@/lib/cn';

const ORDER: (keyof Profile)[] = ['tueste', 'acidez', 'cuerpo', 'dulzor', 'amargor', 'complejidad'];

/** Perfil sensorial estilo Pergamino: escala 1-10 con marcas, punto y Bajo/Medio/Alto. */
export function SensoryProfile({ profile, tone = 'light', className }: { profile: Profile; tone?: 'light' | 'dark'; className?: string }) {
  const line = tone === 'dark' ? 'bg-crema/35' : 'bg-noche/20';
  const dot = tone === 'dark' ? 'bg-crema ring-crema/30' : 'bg-noche ring-noche/15';
  const fill = tone === 'dark' ? 'bg-crema/80' : 'bg-noche/70';
  return (
    <dl className={cn('space-y-5', className)}>
      {ORDER.map((k) => {
        const v = Math.max(1, Math.min(10, Number(profile[k] ?? 0)));
        const pct = ((v - 1) / 9) * 100;
        return (
          <div key={k}>
            <dt className="flex items-baseline justify-between text-[0.95rem] font-medium">
              <span>{PROFILE_LABELS[k]}</span>
              <span className="text-xs tabular-nums opacity-70">{v}/10</span>
            </dt>
            <dd className="mt-2">
              <div className="relative h-4" role="meter" aria-valuemin={1} aria-valuemax={10} aria-valuenow={v} aria-label={`${PROFILE_LABELS[k]}: ${v} de 10`}>
                <div className={cn('absolute inset-x-0 top-1/2 h-px -translate-y-1/2', line)} />
                <div className={cn('absolute top-1/2 left-0 h-[3px] -translate-y-1/2 rounded-full', fill)} style={{ width: `${pct}%` }} />
                {Array.from({ length: 10 }, (_, i) => (
                  <span key={i} aria-hidden className={cn('absolute top-1/2 h-2 w-px -translate-y-1/2', line)} style={{ left: `${(i / 9) * 100}%` }} />
                ))}
                <span aria-hidden className={cn('absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-4', dot)} style={{ left: `${pct}%` }} />
              </div>
              <div aria-hidden className="mt-1 flex justify-between text-[0.6rem] tracking-wider uppercase opacity-60">
                <span>Bajo</span>
                <span>Medio</span>
                <span>Alto</span>
              </div>
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
