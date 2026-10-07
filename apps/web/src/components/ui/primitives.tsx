import { Star } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { formatCOP } from '@travesia/shared';
import { cn } from '@/lib/cn';

export function Price({ value, compareAt, from, className }: { value: number; compareAt?: number | null; from?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex items-baseline gap-2', className)}>
      {from ? <span className="text-xs font-medium tracking-wide text-gris uppercase">Desde</span> : null}
      <span className="font-semibold text-noche tabular-nums">{value === 0 ? 'Gratis' : formatCOP(value)}</span>
      {compareAt && compareAt > value ? <s className="text-sm text-gris tabular-nums">{formatCOP(compareAt)}</s> : null}
    </span>
  );
}

export function Rating({ value, count, className }: { value: number; count?: number; className?: string }) {
  if (!value) return null;
  return (
    <span className={cn('inline-flex items-center gap-1 text-sm text-noche/80', className)} aria-label={`Calificación ${value.toFixed(1)} de 5`}>
      <Star className="size-4 fill-ambar text-ambar" aria-hidden />
      <span className="font-semibold">{value.toFixed(1)}</span>
      {count ? <span className="text-gris">({count})</span> : null}
    </span>
  );
}

export function Markdown({ children, className, dark }: { children: string | null | undefined; className?: string; dark?: boolean }) {
  if (!children) return null;
  return (
    <div className={cn(dark ? 'prose-noche' : 'prose-travesia', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}

export function PatternDivider({ className }: { className?: string }) {
  return <div aria-hidden className={cn('divider-andino', className)} />;
}

export function SectionHeading({ eyebrow, title, intro, align = 'left', className, dark }: { eyebrow?: string; title: React.ReactNode; intro?: React.ReactNode; align?: 'left' | 'center'; className?: string; dark?: boolean }) {
  return (
    <div className={cn('max-w-2xl', align === 'center' && 'mx-auto text-center', className)}>
      {eyebrow ? <p className={cn('eyebrow mb-3', dark && 'text-ambar-300')}>{eyebrow}</p> : null}
      <h2 className={cn('title-lg', dark && 'text-crema')}>{title}</h2>
      {intro ? <p className={cn('lede mt-4', dark && 'text-crema/75')}>{intro}</p> : null}
    </div>
  );
}

export function EmptyState({ icon, title, text, action }: { icon?: React.ReactNode; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
      {icon ? <div className="text-ambar">{icon}</div> : null}
      <h3 className="text-xl">{title}</h3>
      {text ? <p className="max-w-md text-gris">{text}</p> : null}
      {action}
    </div>
  );
}

export function DemoNotice({ children }: { children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-ambar/40 bg-ambar-100 px-4 py-3 text-sm text-noche">
      <strong>Modo demo.</strong> {children ?? 'Conecta la base de datos para habilitar esta función.'}
    </div>
  );
}
