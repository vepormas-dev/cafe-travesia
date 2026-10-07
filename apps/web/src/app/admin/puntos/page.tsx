import { Suspense } from 'react';
import type { Metadata } from 'next';
import { staffPage } from '@/lib/admin/guard';
import { listStoresAdmin } from '@/lib/admin/data/content';
import { PageHeader, PageSkeleton } from '@/components/admin/ui';
import { StoresManager } from '@/components/admin/content/stores-manager';

export const metadata: Metadata = { title: 'Puntos físicos' };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton rows={6} />}>
      <Stores />
    </Suspense>
  );
}

async function Stores() {
  await staffPage('/admin/puntos');
  const rows = await listStoresAdmin();
  return (
    <>
      <PageHeader eyebrow="Contenido" title="Puntos físicos" description="Florida Parque Comercial, la finca en Caicedo y aliados. Aparecen en «Nuestras tiendas» y en la app." />
      <StoresManager stores={rows.map((s) => ({ id: s.id, slug: s.slug, name: s.name, kind: s.kind, address: s.address, city: s.city, hours: s.hours ?? [], phone: s.phone, mapUrl: s.mapUrl, menuUrl: s.menuUrl, imageUrl: s.imageUrl, description: s.description, lat: s.lat, lng: s.lng, isActive: s.isActive, sortOrder: s.sortOrder }))} />
    </>
  );
}
