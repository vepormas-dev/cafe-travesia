'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, Star } from 'lucide-react';
import { formatCOP, PRODUCT_KIND_LABEL } from '@travesia/shared';
import { cn } from '@/lib/cn';
import { setProductsActive } from '@/lib/admin/actions/catalog';
import { Badge, Empty, SortHeader, Table, td, th, trHover } from '../ui';
import { useRunAction } from '../client-ui';

export type ProductListItem = { id: string; name: string; slug: string; kind: string; category: string | null; imageUrl: string | null; themeColor: string | null; isActive: boolean; isFeatured: boolean; isSeasonal: boolean; priceFrom: number; stock: number; variants: number; lowVariants: number; sold30: number; ratingAvg: number; ratingCount: number };

export function ProductsTable({ rows, params }: { rows: ProductListItem[]; params: Record<string, string | undefined> }) {
  const [sel, setSel] = useState<Set<string>>(new Set());
  const { pending, run } = useRunAction();
  if (!rows.length) return <Empty title="Sin productos con estos filtros" />;
  const allSel = rows.every((r) => sel.has(r.id));
  const bulk = (active: boolean) => run(() => setProductsActive([...sel], active), { onOk: () => setSel(new Set()) });
  return (
    <>
      {sel.size ? (
        <div className="sticky top-16 z-10 mb-3 flex items-center gap-2 rounded-lg bg-noche px-3 py-2 text-sm text-crema shadow-lg">
          <span className="font-semibold">{sel.size} seleccionados</span>
          <button type="button" disabled={pending} onClick={() => bulk(true)} className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 hover:bg-white/10"><Eye className="size-4" /> Activar</button>
          <button type="button" disabled={pending} onClick={() => bulk(false)} className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 hover:bg-white/10"><EyeOff className="size-4" /> Desactivar</button>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          <button type="button" onClick={() => setSel(new Set())} className="ml-auto text-xs text-crema/70 hover:text-crema">Limpiar</button>
        </div>
      ) : null}
      <Table>
        <thead>
          <tr>
            <th className={cn(th, 'w-8')}>
              <input type="checkbox" aria-label="Seleccionar todos" checked={allSel} onChange={() => setSel(allSel ? new Set() : new Set(rows.map((r) => r.id)))} className="size-4 accent-noche" />
            </th>
            <SortHeader label="Producto" field="name" base="/admin/productos" params={params} />
            <th className={th}>Tipo</th>
            <th className={th}>Estado</th>
            <SortHeader label="Precio desde" field="price" base="/admin/productos" params={params} />
            <SortHeader label="Stock" field="stock" base="/admin/productos" params={params} />
            <SortHeader label="Vendidos 30 d" field="sold" base="/admin/productos" params={params} className="text-right" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className={cn(trHover, sel.has(r.id) && 'bg-ambar-100/40')}>
              <td className={td}>
                <input type="checkbox" aria-label={`Seleccionar ${r.name}`} checked={sel.has(r.id)} onChange={() => setSel((s) => { const n = new Set(s); if (n.has(r.id)) n.delete(r.id); else n.add(r.id); return n; })} className="size-4 accent-noche" />
              </td>
              <td className={td}>
                <Link href={`/admin/productos/${r.id}`} className="flex items-center gap-3">
                  <span className="relative size-11 shrink-0 overflow-hidden rounded-lg" style={{ background: r.themeColor ?? '#EFE6D6' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {r.imageUrl ? <img src={r.imageUrl} alt="" className="size-full object-cover" /> : null}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-medium text-noche hover:underline">{r.name}</span>
                    <span className="block text-xs text-gris">
                      {r.category ?? r.slug}
                      {r.ratingCount ? <span className="ml-1.5 inline-flex items-center gap-0.5"><Star className="size-3 fill-ambar text-ambar" />{r.ratingAvg.toFixed(1)} ({r.ratingCount})</span> : null}
                    </span>
                  </span>
                </Link>
              </td>
              <td className={cn(td, 'text-gris')}>{PRODUCT_KIND_LABEL[r.kind]}</td>
              <td className={td}>
                <div className="flex flex-wrap gap-1">
                  {r.isActive ? <Badge tone="success" dot>Activo</Badge> : <Badge>Inactivo</Badge>}
                  {r.isFeatured ? <Badge tone="ambar">Destacado</Badge> : null}
                  {r.isSeasonal ? <Badge tone="noche">Temporada</Badge> : null}
                </div>
              </td>
              <td className={cn(td, 'font-medium text-noche tabular-nums')}>{formatCOP(r.priceFrom)}</td>
              <td className={td}>
                <span className={cn('font-semibold tabular-nums', r.stock === 0 ? 'text-cereza' : r.lowVariants ? 'text-amber-700' : 'text-noche')}>{r.stock}</span>
                <span className="ml-1 text-xs text-gris">· {r.variants} var.{r.lowVariants ? ` · ${r.lowVariants} bajas` : ''}</span>
              </td>
              <td className={cn(td, 'text-right tabular-nums')}>{r.sold30}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
