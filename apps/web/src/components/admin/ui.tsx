/**
 * Kit visual del panel (sin estado: sirve en Server y Client Components).
 * Estética: superficies blancas sobre crema, bordes finos, tipografía DM Sans con
 * titulares Playfair, acentos ámbar — al estilo de Stripe/Shopify con la marca Travesía.
 */
import Link from 'next/link';
import { ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight, Inbox, Minus } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Tone } from '@/lib/admin/labels';

export const inputCls =
  'w-full rounded-lg border border-noche/15 bg-white px-3 py-2 text-sm text-tinta shadow-[inset_0_1px_1px_rgba(17,26,49,0.04)] placeholder:text-gris/60 transition focus:border-noche/60 focus:ring-2 focus:ring-ambar/30 focus:outline-none disabled:bg-arena/60 disabled:text-gris';
export const selectCls = cn(inputCls, 'appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27 fill=%27none%27 stroke=%27%23111A31%27 stroke-width=%271.6%27%3E%3Cpath d=%27m3 4.5 3 3 3-3%27/%3E%3C/svg%3E")] bg-[length:12px] bg-[right_0.7rem_center] bg-no-repeat pr-8');
export const labelCls = 'mb-1 block text-[0.8rem] font-medium text-noche/80';
export const btn = {
  base: 'inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ambar',
  get primary() {
    return cn(this.base, 'bg-noche text-crema shadow-sm hover:bg-noche-800 active:scale-[0.98]');
  },
  get ambar() {
    return cn(this.base, 'bg-ambar text-noche shadow-sm hover:bg-ambar-300 active:scale-[0.98]');
  },
  get secondary() {
    return cn(this.base, 'border border-noche/15 bg-white text-noche shadow-[0_1px_1px_rgba(17,26,49,0.04)] hover:border-noche/30 hover:bg-crema/60');
  },
  get ghost() {
    return cn(this.base, 'text-noche/75 hover:bg-noche/5 hover:text-noche');
  },
  get danger() {
    return cn(this.base, 'border border-cereza/25 bg-white text-cereza hover:bg-cereza hover:text-white');
  },
  get ai() {
    return cn(this.base, 'border border-ambar/40 bg-gradient-to-br from-ambar-100 to-white text-noche hover:border-ambar hover:shadow-[0_0_0_3px_rgba(235,154,55,0.15)]');
  },
  sm: '!px-2.5 !py-1.5 !text-xs',
  icon: '!p-2',
};

export function PageHeader({ title, description, actions, back, eyebrow, className }: { title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; back?: { href: string; label: string }; eyebrow?: string; className?: string }) {
  return (
    <header className={cn('mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        {back ? (
          <Link href={back.href} className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-gris hover:text-noche">
            <ChevronLeft className="size-3.5" /> {back.label}
          </Link>
        ) : null}
        {eyebrow ? <p className="mb-1 text-[0.7rem] font-semibold tracking-[0.18em] text-ambar-700 uppercase">{eyebrow}</p> : null}
        <h1 className="font-display text-[1.7rem] leading-tight text-noche sm:text-3xl">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-sm text-gris">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function Panel({ title, description, actions, children, className, bodyClassName, id }: { title?: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string; bodyClassName?: string; id?: string }) {
  return (
    <section id={id} className={cn('rounded-xl border border-noche/[0.08] bg-white shadow-[0_1px_2px_rgba(17,26,49,0.04),0_4px_16px_-8px_rgba(17,26,49,0.08)]', className)}>
      {title || actions ? (
        <div className="flex items-start justify-between gap-3 px-5 pt-4">
          <div className="min-w-0">
            {title ? <h2 className="font-sans text-[0.95rem] font-semibold tracking-tight text-noche">{title}</h2> : null}
            {description ? <p className="mt-0.5 text-xs text-gris">{description}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className={cn('p-5', title || actions ? 'pt-3' : '', bodyClassName)}>{children}</div>
    </section>
  );
}

const TONES: Record<Tone, string> = {
  neutral: 'bg-noche/[0.06] text-noche/70 ring-noche/10',
  info: 'bg-sky-50 text-sky-800 ring-sky-200',
  success: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-800 ring-amber-200',
  danger: 'bg-rose-50 text-rose-800 ring-rose-200',
  ambar: 'bg-ambar-100 text-ambar-700 ring-ambar/30',
  noche: 'bg-noche text-crema ring-noche',
};
export function Badge({ tone = 'neutral', children, className, dot }: { tone?: Tone; children: React.ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.7rem] font-semibold whitespace-nowrap ring-1 ring-inset', TONES[tone], className)}>
      {dot ? <span className="size-1.5 rounded-full bg-current opacity-80" /> : null}
      {children}
    </span>
  );
}

export function Delta({ value, prev, invert, suffix = '%', className }: { value: number; prev: number; invert?: boolean; suffix?: string; className?: string }) {
  const d = prev === 0 ? (value === 0 ? 0 : 100) : ((value - prev) / Math.abs(prev)) * 100;
  const good = invert ? d < 0 : d > 0;
  const flat = Math.abs(d) < 0.5;
  const Icon = flat ? Minus : d > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn('inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[0.72rem] font-semibold tabular-nums', flat ? 'bg-noche/5 text-gris' : good ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700', className)}>
      <Icon className="size-3" aria-hidden />
      {flat ? '0' : `${d > 0 ? '+' : ''}${Math.abs(d) >= 100 ? Math.round(d) : d.toFixed(1).replace('.', ',')}`}
      {suffix}
    </span>
  );
}

export function Stat({ label, value, hint, className }: { label: string; value: React.ReactNode; hint?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      <p className="text-xs font-medium text-gris">{label}</p>
      <p className="mt-1 text-xl font-semibold tracking-tight text-noche tabular-nums">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-gris">{hint}</p> : null}
    </div>
  );
}

export function Empty({ icon, title, text, action, className }: { icon?: React.ReactNode; title: string; text?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 px-6 py-12 text-center', className)}>
      <div className="mb-1 grid size-12 place-items-center rounded-full bg-ambar-100 text-ambar-700">{icon ?? <Inbox className="size-5" />}</div>
      <p className="font-display text-lg text-noche">{title}</p>
      {text ? <p className="max-w-sm text-sm text-gris">{text}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-md bg-gradient-to-r from-noche/[0.05] via-noche/[0.09] to-noche/[0.05]', className)} />;
}

export function PageSkeleton({ rows = 8, kpis = 0 }: { rows?: number; kpis?: number }) {
  return (
    <div aria-busy="true" aria-label="Cargando">
      <Skeleton className="mb-2 h-4 w-28" />
      <Skeleton className="mb-6 h-8 w-64" />
      {kpis ? (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: kpis }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : null}
      <div className="rounded-xl border border-noche/[0.08] bg-white p-5">
        <Skeleton className="mb-4 h-9 w-full max-w-md" />
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className="mb-3 h-10 w-full" />
        ))}
      </div>
    </div>
  );
}

/** Tabla con estilos consistentes. */
export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('-mx-5 overflow-x-auto', className)}>
      <table className="w-full min-w-[640px] border-separate border-spacing-0 text-sm">{children}</table>
    </div>
  );
}
export const th = 'border-b border-noche/[0.08] bg-crema/40 px-4 py-2.5 text-left text-[0.7rem] font-semibold tracking-wide text-gris uppercase first:pl-5 last:pr-5 whitespace-nowrap';
export const td = 'border-b border-noche/[0.06] px-4 py-3 align-middle first:pl-5 last:pr-5';
export const trHover = 'transition-colors hover:bg-crema/50';

/** Construye URLs conservando los searchParams actuales. */
export function hrefWith(base: string, params: Record<string, string | undefined>, patch: Record<string, string | number | null | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v != null && v !== '') sp.set(k, v);
  for (const [k, v] of Object.entries(patch)) {
    if (v == null || v === '') sp.delete(k);
    else sp.set(k, String(v));
  }
  const q = sp.toString();
  return q ? `${base}?${q}` : base;
}

export function SortHeader({ label, field, base, params, className }: { label: string; field: string; base: string; params: Record<string, string | undefined>; className?: string }) {
  const active = params.sort === field;
  const dir = active && params.dir === 'asc' ? 'desc' : 'asc';
  return (
    <th className={cn(th, className)} aria-sort={active ? (params.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <Link href={hrefWith(base, params, { sort: field, dir, page: null })} className={cn('inline-flex items-center gap-1 hover:text-noche', active && 'text-noche')} scroll={false}>
        {label}
        <span className="text-[0.6rem]">{active ? (params.dir === 'asc' ? '▲' : '▼') : '↕'}</span>
      </Link>
    </th>
  );
}

export function Pagination({ page, pageSize, total, base, params }: { page: number; pageSize: number; total: number; base: string; params: Record<string, string | undefined> }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <nav className="flex items-center justify-between gap-3 pt-4 text-xs text-gris" aria-label="Paginación">
      <span className="tabular-nums">
        {from.toLocaleString('es-CO')}–{to.toLocaleString('es-CO')} de {total.toLocaleString('es-CO')}
      </span>
      <div className="flex items-center gap-1">
        <Link aria-disabled={page <= 1} className={cn(btn.secondary, btn.sm, page <= 1 && 'pointer-events-none opacity-40')} href={hrefWith(base, params, { page: page - 1 > 1 ? page - 1 : null })} scroll={false}>
          <ChevronLeft className="size-3.5" /> Anterior
        </Link>
        <span className="px-2 tabular-nums">
          {page} / {pages}
        </span>
        <Link aria-disabled={page >= pages} className={cn(btn.secondary, btn.sm, page >= pages && 'pointer-events-none opacity-40')} href={hrefWith(base, params, { page: page + 1 })} scroll={false}>
          Siguiente <ChevronRight className="size-3.5" />
        </Link>
      </div>
    </nav>
  );
}

export function KeyValue({ items, className }: { items: [React.ReactNode, React.ReactNode][]; className?: string }) {
  return (
    <dl className={cn('grid grid-cols-[minmax(0,9rem)_1fr] gap-x-4 gap-y-2 text-sm', className)}>
      {items.map(([k, v], i) => (
        <div key={i} className="contents">
          <dt className="text-gris">{k}</dt>
          <dd className="min-w-0 break-words text-noche">{v ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Avatar({ name, src, className }: { name?: string | null; src?: string | null; className?: string }) {
  const ini = (name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('') || '☕';
  const hue = [...(name ?? 'x')].reduce((s, c) => s + c.charCodeAt(0), 0) % 4;
  const bg = ['bg-noche text-crema', 'bg-ambar text-noche', 'bg-montana text-crema', 'bg-noche-600 text-crema'][hue];
  if (src)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className={cn('size-8 shrink-0 rounded-full object-cover', className)} />;
  return <span className={cn('grid size-8 shrink-0 place-items-center rounded-full text-[0.7rem] font-semibold', bg, className)}>{ini}</span>;
}

export function Tabs({ items, active }: { items: { href: string; label: string; key: string; count?: number }[]; active: string }) {
  return (
    <div className="-mx-1 mb-4 flex gap-1 overflow-x-auto border-b border-noche/10 px-1 scrollbar-none">
      {items.map((it) => (
        <Link key={it.key} href={it.href} scroll={false} className={cn('relative -mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm whitespace-nowrap transition', active === it.key ? 'border-ambar font-semibold text-noche' : 'border-transparent text-gris hover:text-noche')}>
          {it.label}
          {it.count != null ? <span className="rounded-full bg-noche/[0.06] px-1.5 text-[0.65rem] tabular-nums">{it.count}</span> : null}
        </Link>
      ))}
    </div>
  );
}

export function DemoBanner({ children }: { children?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-start gap-2 rounded-lg border border-ambar/40 bg-ambar-100/70 px-3 py-2 text-xs text-noche">
      <span className="font-semibold">Modo demo.</span>
      <span>{children ?? 'Ves datos de ejemplo. Los cambios no se guardan hasta conectar la base de datos.'}</span>
    </div>
  );
}

export const relTime = (iso: string | Date | null | undefined, now = Date.now()) => {
  if (!iso) return '—';
  const ms = now - new Date(iso).getTime();
  const m = Math.round(ms / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  if (d < 30) return `hace ${d} d`;
  return new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'short' }).format(new Date(iso));
};
