'use client';
/** Catálogo con filtros del lado cliente sincronizados con la URL (?tipo=&metodo=&proceso=&nota=&orden=). */
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { PRODUCT_KIND_LABEL, type ProductDTO } from '@travesia/shared';
import { filterProducts } from './catalog-utils';
import { ProductGrid } from './product-grid';
import { cn } from '@/lib/cn';

const KINDS: { value: string; label: string }[] = [
  { value: '', label: 'Todo' },
  { value: 'coffee', label: 'Café de origen' },
  { value: 'accessory', label: 'Barismo en casa' },
  { value: 'kit', label: 'Kits de regalo' },
  { value: 'experience', label: 'Catas y tours' },
  { value: 'merch', label: 'Ropa y merch' },
];
const SORTS = [
  { value: '', label: 'Destacados' },
  { value: 'precio-asc', label: 'Precio: menor a mayor' },
  { value: 'precio-desc', label: 'Precio: mayor a menor' },
  { value: 'nombre', label: 'Nombre (A-Z)' },
  { value: 'rating', label: 'Mejor calificados' },
];

const uniq = (xs: (string | null | undefined)[]) => [...new Set(xs.filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, 'es'));

export function ShopCatalog({ products }: { products: ProductDTO[] }) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const f = { tipo: sp.get('tipo'), metodo: sp.get('metodo'), proceso: sp.get('proceso'), nota: sp.get('nota'), orden: sp.get('orden') };

  const facets = useMemo(() => {
    const base = f.tipo ? products.filter((p) => p.kind === f.tipo) : products;
    return { metodos: uniq(base.flatMap((p) => p.brewMethods)), procesos: uniq(base.map((p) => p.process)), notas: uniq(base.flatMap((p) => p.tastingNotes)) };
  }, [products, f.tipo]);
  const list = useMemo(() => filterProducts(products, f), [products, f.tipo, f.metodo, f.proceso, f.nota, f.orden]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
  const active = (['metodo', 'proceso', 'nota'] as const).filter((k) => f[k]);

  return (
    <div className="space-y-8">
      <div className="sticky top-16 lg:top-20 z-20 -mx-5 space-y-3 border-b border-noche/10 bg-crema/90 px-5 py-3 backdrop-blur sm:-mx-8 sm:px-8">
        <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Tipo de producto">
          {KINDS.map((k) => {
            const on = (f.tipo ?? '') === k.value;
            const n = k.value ? products.filter((p) => p.kind === k.value).length : products.length;
            if (k.value && !n) return null;
            return (
              <button
                key={k.value || 'all'}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => set({ tipo: k.value || null, metodo: null, proceso: null, nota: null })}
                className={cn('chip shrink-0 px-4 py-2 text-sm transition hover:border-noche', on && 'chip-active')}
              >
                {k.label} <span className={cn('text-[0.7rem] tabular-nums', on ? 'text-crema/70' : 'text-gris')}>{n}</span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SlidersHorizontal className="size-4 text-gris" aria-hidden />
          <FacetSelect label="Método" value={f.metodo} options={facets.metodos} onChange={(v) => set({ metodo: v })} />
          <FacetSelect label="Proceso" value={f.proceso} options={facets.procesos} onChange={(v) => set({ proceso: v })} />
          <FacetSelect label="Notas" value={f.nota} options={facets.notas} onChange={(v) => set({ nota: v })} />
          <div className="ml-auto flex items-center gap-2">
            <label htmlFor="orden" className="text-xs text-gris">
              Ordenar
            </label>
            <select id="orden" value={f.orden ?? ''} onChange={(e) => set({ orden: e.target.value || null })} className="rounded-full border border-noche/15 bg-hueso px-3 py-1.5 text-sm text-noche focus:border-noche focus:outline-none">
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {active.length ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {active.map((k) => (
              <button key={k} type="button" onClick={() => set({ [k]: null })} className="chip chip-active gap-1.5">
                {f[k]} <X className="size-3" aria-label="Quitar filtro" />
              </button>
            ))}
            <button type="button" onClick={() => set({ metodo: null, proceso: null, nota: null })} className="link text-xs">
              Limpiar filtros
            </button>
          </div>
        ) : null}
      </div>

      <p className="text-sm text-gris" aria-live="polite">
        {list.length} {list.length === 1 ? 'producto' : 'productos'}
        {f.tipo ? ` en ${PRODUCT_KIND_LABEL[f.tipo] ?? f.tipo}` : ''}
      </p>
      {list.length ? (
        <ProductGrid products={list} />
      ) : (
        <div className="card px-6 py-14 text-center">
          <h3 className="text-xl">No encontramos productos con esos filtros</h3>
          <p className="mt-2 text-gris">Prueba con otro método o escríbenos qué buscas en el buscador inteligente.</p>
          <button type="button" className="btn-outline mt-5" onClick={() => set({ tipo: null, metodo: null, proceso: null, nota: null })}>
            Ver todo
          </button>
        </div>
      )}
    </div>
  );
}

function FacetSelect({ label, value, options, onChange }: { label: string; value: string | null; options: string[]; onChange: (v: string | null) => void }) {
  if (!options.length) return null;
  return (
    <label className={cn('relative inline-flex items-center rounded-full border text-sm transition', value ? 'border-noche bg-noche text-crema' : 'border-noche/15 bg-hueso text-noche hover:border-noche')}>
      <span className="sr-only">{label}</span>
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value || null)} className="cursor-pointer appearance-none bg-transparent py-1.5 pr-7 pl-3 focus:outline-none">
        <option value="">{label}</option>
        {options.map((o) => (
          <option key={o} value={o} className="text-noche">
            {o}
          </option>
        ))}
      </select>
      <span aria-hidden className="pointer-events-none absolute right-3 text-[0.6rem]">
        ▼
      </span>
    </label>
  );
}
