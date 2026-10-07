import { Suspense } from 'react';
import type { Metadata } from 'next';
import { staffPage } from '@/lib/admin/guard';
import { listPlans } from '@/lib/admin/data/catalog';
import { PageHeader, PageSkeleton } from '@/components/admin/ui';
import { PlansManager } from '@/components/admin/catalog/plans-zones';

export const metadata: Metadata = { title: 'Planes' };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton rows={6} />}>
      <Plans />
    </Suspense>
  );
}

async function Plans() {
  await staffPage('/admin/planes');
  const plans = await listPlans();
  return (
    <>
      <PageHeader eyebrow="Catálogo" title="Planes de suscripción" description="Planes personales y para empresas. Cambiar el precio aplica a nuevas suscripciones; las actuales conservan el suyo." />
      <PlansManager plans={plans.map((p) => ({ id: p.id, slug: p.slug, name: p.name, tagline: p.tagline, description: p.description, audience: p.audience, frequencyWeeks: p.frequencyWeeks, bagsPerDelivery: p.bagsPerDelivery, bagWeightG: p.bagWeightG, priceCop: p.priceCop, compareAtCop: p.compareAtCop, includesAcademy: p.includesAcademy, benefits: p.benefits ?? [], imageUrl: p.imageUrl, isHighlighted: p.isHighlighted, isActive: p.isActive, sortOrder: p.sortOrder, subscribers: p.subscribers }))} />
    </>
  );
}
