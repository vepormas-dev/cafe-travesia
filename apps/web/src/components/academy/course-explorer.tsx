'use client';
import { useMemo, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import type { CourseDTO } from '@travesia/shared';
import { LEVEL_LABEL } from '@travesia/shared';
import { cn } from '@/lib/cn';
import { BrandIcon } from '@/components/brand/logo';
import { CourseCard } from './course-card';

export type PriceFilter = '' | 'gratis' | 'incluido' | 'pago';
const PRICE_LABEL: Record<Exclude<PriceFilter, ''>, string> = { gratis: 'Gratis', incluido: 'Incluido en Maestro Premium', pago: 'De pago' };

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

export function filterCourses(courses: CourseDTO[], f: { q: string; nivel: string; categoria: string; precio: PriceFilter }) {
  const q = norm(f.q.trim());
  return courses.filter((c) => {
    if (f.nivel && c.level !== f.nivel) return false;
    if (f.categoria && c.category !== f.categoria) return false;
    if (f.precio === 'gratis' && !c.isFree) return false;
    if (f.precio === 'incluido' && !(c.includedInSubscription && !c.isFree)) return false;
    if (f.precio === 'pago' && (c.isFree || c.priceCop <= 0)) return false;
    if (q && !norm([c.title, c.subtitle, c.description, c.category, c.instructorName, ...c.whatYouLearn].filter(Boolean).join(' ')).includes(q)) return false;
    return true;
  });
}

/** Filtros de Explorar cursos: búsqueda, nivel, categoría y precio, sincronizados con la URL. */
export function CourseExplorer({ courses }: { courses: CourseDTO[] }) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState(sp.get('q') ?? '');
  const [open, setOpen] = useState(false);
  const nivel = sp.get('nivel') ?? '';
  const categoria = sp.get('categoria') ?? '';
  const precio = (sp.get('precio') ?? '') as PriceFilter;

  const categories = useMemo(() => [...new Set(courses.map((c) => c.category).filter(Boolean) as string[])], [courses]);
  const list = useMemo(() => filterCourses(courses, { q, nivel, categoria, precio }), [courses, q, nivel, categoria, precio]);

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(sp.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    startTransition(() => router.replace(`${pathname}${next.size ? `?${next}` : ''}`, { scroll: false }));
  };
  const activeCount = [nivel, categoria, precio].filter(Boolean).length;
  const clear = () => {
    setQ('');
    startTransition(() => router.replace(pathname, { scroll: false }));
  };

  const group = ({ title, k, value, options }: { title: string; k: string; value: string; options: { value: string; label: string; count: number }[] }) => (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-[0.7rem] font-bold tracking-[0.2em] text-noche/60 uppercase">{title}</legend>
      <div className="flex flex-wrap gap-2 lg:flex-col lg:items-stretch">
        <button type="button" onClick={() => set(k, '')} aria-pressed={!value} className={cn('chip justify-between transition lg:rounded-lg lg:px-3 lg:py-2 lg:text-sm', !value ? 'chip-active' : 'hover:border-noche/40')}>
          Todos
        </button>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => set(k, value === o.value ? '' : o.value)}
            aria-pressed={value === o.value}
            className={cn('chip justify-between gap-3 transition lg:rounded-lg lg:px-3 lg:py-2 lg:text-sm', value === o.value ? 'chip-active' : 'hover:border-noche/40', o.count === 0 && 'opacity-50')}
          >
            {o.label}
            <span className={cn('text-[0.7rem] tabular-nums', value === o.value ? 'text-crema/70' : 'text-gris')}>{o.count}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );

  const filters = (
    <div className="space-y-7">
      {group({ title: "Nivel", k: "nivel", value: nivel, options: (['principiante', 'intermedio', 'avanzado'] as const).map((l) => ({ value: l, label: LEVEL_LABEL[l]!, count: courses.filter((c) => c.level === l).length })) })}
      {group({ title: "Categoría", k: "categoria", value: categoria, options: categories.map((c) => ({ value: c, label: c, count: courses.filter((x) => x.category === c).length })) })}
      {group({
        title: "Precio",
        k: "precio",
        value: precio,
        options: (Object.keys(PRICE_LABEL) as Exclude<PriceFilter, ''>[]).map((p) => ({ value: p, label: PRICE_LABEL[p], count: filterCourses(courses, { q: '', nivel: '', categoria: '', precio: p }).length })),
      })}
    </div>
  );

  return (
    <div className="grid gap-10 lg:grid-cols-[230px_1fr]">
      <aside className="hidden lg:block" aria-label="Filtros">
        <div className="sticky top-28">{filters}</div>
      </aside>
      <div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Buscar cursos</span>
            <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-gris" aria-hidden />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onBlur={() => set('q', q.trim())}
              onKeyDown={(e) => e.key === 'Enter' && set('q', q.trim())}
              placeholder="Buscar cursos: espresso, tueste, V60…"
              className="input rounded-full pl-11"
            />
          </label>
          <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="btn-outline btn-sm lg:hidden">
            <SlidersHorizontal className="size-4" aria-hidden /> Filtros{activeCount ? ` (${activeCount})` : ''}
          </button>
        </div>
        {open ? <div className="card mt-4 p-5 lg:hidden">{filters}</div> : null}
        <div className="mt-5 flex flex-wrap items-center gap-2 text-sm text-gris" aria-live="polite">
          <span>
            {list.length} {list.length === 1 ? 'curso' : 'cursos'}
          </span>
          {activeCount || q ? (
            <button type="button" onClick={clear} className="inline-flex items-center gap-1 font-medium text-noche underline decoration-ambar underline-offset-4">
              <X className="size-3.5" aria-hidden /> Limpiar filtros
            </button>
          ) : null}
        </div>
        {list.length ? (
          <ul className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((c, i) => (
              <li key={c.id}>
                <CourseCard course={c} priority={i < 3} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="card mt-6 flex flex-col items-center gap-3 px-6 py-14 text-center">
            <BrandIcon name="pregunta" className="size-12 text-ambar" />
            <h3 className="text-xl">No encontramos cursos con esos filtros</h3>
            <p className="max-w-md text-gris">Prueba con otra palabra o quita algún filtro. Cada temporada sumamos cursos nuevos.</p>
            <button type="button" onClick={clear} className="btn-primary btn-sm mt-2">
              Ver todos los cursos
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
