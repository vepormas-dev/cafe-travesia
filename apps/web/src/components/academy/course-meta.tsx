import { BadgeCheck, Gift } from 'lucide-react';
import type { CourseDTO } from '@travesia/shared';
import { formatCOP, formatDuration, initials, LEVEL_LABEL } from '@travesia/shared';
import { cn } from '@/lib/cn';

export const PREMIUM_PLAN = 'Maestro Premium';

export const courseDuration = (min: number) => formatDuration(min * 60).replace(' 00 min', '');
export const lessonDuration = (s: number) => `${Math.max(1, Math.round(s / 60))} min`;

const LEVEL_STYLE: Record<string, string> = {
  principiante: 'bg-hoja/90 text-white',
  intermedio: 'bg-ambar text-noche',
  avanzado: 'bg-cereza text-white',
};

export function LevelBadge({ level, className }: { level: CourseDTO['level']; className?: string }) {
  return <span className={cn('inline-flex items-center rounded-sm px-2 py-0.5 text-[0.65rem] font-bold tracking-[0.14em] uppercase', LEVEL_STYLE[level], className)}>{LEVEL_LABEL[level] ?? level}</span>;
}

/** Precio editorial: Gratis / precio (+ tachado) y sello "Incluido en Maestro Premium". */
export function CoursePrice({ course, dark, showIncluded = true, className }: { course: Pick<CourseDTO, 'isFree' | 'priceCop' | 'compareAtCop' | 'includedInSubscription'>; dark?: boolean; showIncluded?: boolean; className?: string }) {
  if (course.isFree || course.priceCop === 0)
    return (
      <span className={cn('inline-flex items-center gap-1.5 font-semibold', dark ? 'text-[#c9dfa4]' : 'text-montana', className)}>
        <Gift className="size-4" aria-hidden /> Gratis
      </span>
    );
  return (
    <span className={cn('inline-flex flex-col items-end leading-tight', className)}>
      <span className="inline-flex items-baseline gap-2">
        <span className={cn('font-semibold tabular-nums', dark ? 'text-crema' : 'text-noche')}>{formatCOP(course.priceCop)}</span>
        {course.compareAtCop && course.compareAtCop > course.priceCop ? <s className={cn('text-xs tabular-nums', dark ? 'text-crema/50' : 'text-gris')}>{formatCOP(course.compareAtCop)}</s> : null}
      </span>
      {showIncluded && course.includedInSubscription ? (
        <span className={cn('mt-0.5 inline-flex items-center gap-1 text-[0.68rem] font-medium', dark ? 'text-ambar-300' : 'text-ambar-700')}>
          <BadgeCheck className="size-3" aria-hidden /> Incluido en {PREMIUM_PLAN}
        </span>
      ) : null}
    </span>
  );
}

export function InstructorAvatar({ name, className }: { name: string | null; className?: string }) {
  return (
    <span aria-hidden className={cn('inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-ambar to-ambar-700 font-display text-xs font-bold text-noche ring-2 ring-white/60', className)}>
      {initials(name)}
    </span>
  );
}

export function ProgressBar({ value, className, tone = 'hoja', label }: { value: number; className?: string; tone?: 'hoja' | 'ambar'; label?: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={v} aria-label={label ?? 'Progreso'} className={cn('h-1.5 w-full overflow-hidden rounded-full bg-current/15', className)}>
      <div className={cn('h-full rounded-full transition-[width] duration-700', tone === 'hoja' ? 'bg-[#a9c97a]' : 'bg-ambar')} style={{ width: `${v}%` }} />
    </div>
  );
}

export const CATEGORY_ICON: Record<string, string> = {
  Origen: 'finca',
  Barismo: 'maquina-espresso',
  Tueste: 'granos',
  Preparación: 'idea',
  Cata: 'cosecha',
};
