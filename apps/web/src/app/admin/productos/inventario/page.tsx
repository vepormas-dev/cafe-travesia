import { Suspense } from 'react';
import type { Metadata } from 'next';
import { staffPage } from '@/lib/admin/guard';
import { listProducts } from '@/lib/admin/data/catalog';
import { PageHeader, PageSkeleton, Panel } from '@/components/admin/ui';
import { InventoryGrid } from '@/components/admin/catalog/inventory-grid';

export const metadata: Metadata = { title: 'Inventario' };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton rows={14} />}>
      <Inventory />
    </Suspense>
  );
}

async function Inventory() {
  await staffPage('/admin/productos/inventario');
  const rows = await listProducts({});
  const items = rows.flatMap((p) => p.variants.map((v) => ({ id: v.id, productId: p.id, product: p.name, variant: v.name, sku: v.sku, stock: v.stock, priceCop: v.priceCop, isActive: v.isActive && p.isActive })));
  return (
    <>
      <PageHeader back={{ href: '/admin/productos', label: 'Productos' }} eyebrow="Catálogo" title="Inventario rápido" description="Edita el stock en línea: Enter o salir del campo guarda. Las variantes con 5 o menos se resaltan." />
      <Panel>
        <InventoryGrid rows={items} />
      </Panel>
    </>
  );
}
