import { Suspense } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Boxes, Plus } from 'lucide-react';
import { PRODUCT_KIND_LABEL } from '@travesia/shared';
import { staffPage } from '@/lib/admin/guard';
import { listProducts } from '@/lib/admin/data/catalog';
import { flat, type SPromise } from '@/lib/admin/sp';
import { PageHeader, PageSkeleton, Panel, Stat, btn } from '@/components/admin/ui';
import { ChipFilter, SearchBox, SelectFilter } from '@/components/admin/client-ui';
import { ProductsTable } from '@/components/admin/catalog/products-table';

export const metadata: Metadata = { title: 'Productos' };

export default function Page({ searchParams }: { searchParams: SPromise }) {
  return (
    <Suspense fallback={<PageSkeleton rows={10} />}>
      <Products searchParams={searchParams} />
    </Suspense>
  );
}

async function Products({ searchParams }: { searchParams: SPromise }) {
  await staffPage('/admin/productos');
  const sp = flat(await searchParams);
  const [rows, all] = await Promise.all([listProducts(sp), listProducts({})]);
  const items = rows.map((r) => ({ id: r.id, name: r.name, slug: r.slug, kind: r.kind, category: r.category, imageUrl: r.imageUrl, themeColor: r.themeColor, isActive: r.isActive, isFeatured: r.isFeatured, isSeasonal: r.isSeasonal, priceFrom: r.priceFrom, stock: r.stock, variants: r.variants.length, lowVariants: r.variants.filter((v) => v.isActive && v.stock <= 5).length, sold30: r.sold30, ratingAvg: r.ratingAvg, ratingCount: r.ratingCount }));
  return (
    <>
      <PageHeader
        eyebrow="Catálogo"
        title="Productos"
        description="Café de origen, barismo en casa, kits, merch y experiencias."
        actions={
          <>
            <Link href="/admin/productos/inventario" className={btn.secondary}><Boxes className="size-4" /> Inventario rápido</Link>
            <Link href="/admin/productos/nuevo" className={btn.primary}><Plus className="size-4" /> Nuevo producto</Link>
          </>
        }
      />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Panel><Stat label="Productos activos" value={all.filter((p) => p.isActive).length} hint={`de ${all.length}`} /></Panel>
        <Panel><Stat label="Unidades en stock" value={all.reduce((s, p) => s + p.stock, 0).toLocaleString('es-CO')} /></Panel>
        <Panel><Stat label="Variantes con stock bajo" value={all.reduce((s, p) => s + p.variants.filter((v) => v.isActive && v.stock <= 5).length, 0)} hint="≤ 5 unidades" /></Panel>
        <Panel><Stat label="Vendidos (30 d)" value={all.reduce((s, p) => s + p.sold30, 0).toLocaleString('es-CO')} hint="unidades" /></Panel>
      </div>
      <Panel>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <SearchBox placeholder="Buscar por nombre, slug o categoría…" />
          <SelectFilter param="kind" label="Todos los tipos" options={Object.entries(PRODUCT_KIND_LABEL).map(([value, label]) => ({ value, label }))} />
          <ChipFilter param="status" options={[{ value: '', label: 'Todos' }, { value: 'active', label: 'Activos' }, { value: 'inactive', label: 'Inactivos' }, { value: 'featured', label: 'Destacados' }, { value: 'low', label: 'Stock bajo' }]} />
        </div>
        <ProductsTable rows={items} params={sp} />
      </Panel>
    </>
  );
}
