import { Suspense } from 'react';
import type { Metadata } from 'next';
import { staffPage } from '@/lib/admin/guard';
import { listZones } from '@/lib/admin/data/catalog';
import { PageHeader, PageSkeleton } from '@/components/admin/ui';
import { ZonesManager } from '@/components/admin/catalog/plans-zones';

export const metadata: Metadata = { title: 'Envíos' };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton rows={6} />}>
      <Zones />
    </Suspense>
  );
}

async function Zones() {
  await staffPage('/admin/envios');
  const zones = await listZones();
  return (
    <>
      <PageHeader eyebrow="Catálogo" title="Zonas de envío" description="Tarifas por ciudad y departamento, envío gratis desde un monto y tiempos de entrega." />
      <ZonesManager zones={zones.map((z) => ({ id: z.id, name: z.name, regions: z.regions ?? [], cities: z.cities ?? [], rateCop: z.rateCop, freeFromCop: z.freeFromCop, etaDays: z.etaDays, isDefault: z.isDefault, sortOrder: z.sortOrder }))} />
    </>
  );
}
