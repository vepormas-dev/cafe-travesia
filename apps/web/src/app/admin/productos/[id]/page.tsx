import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { staffPage } from '@/lib/admin/guard';
import { getProductFull } from '@/lib/admin/data/catalog';
import { Badge, PageHeader, PageSkeleton } from '@/components/admin/ui';
import { toBogotaLocal } from '@/lib/admin/range';
import { ProductEditor, type ProductFormValue } from '@/components/admin/catalog/product-editor';

export const metadata: Metadata = { title: 'Editar producto' };

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<PageSkeleton rows={12} />}>
      <Editor params={params} />
    </Suspense>
  );
}

const EMPTY: ProductFormValue = {
  id: null, slug: '', name: '', subtitle: '', kind: 'coffee', category: '', description: '', story: '', originRegion: 'Caicedo, Antioquia', originFarm: '', producer: '', altitudeM: null, variety: '', process: '', roastLevel: '',
  profile: { tueste: 5, acidez: 5, cuerpo: 6, dulzor: 7, amargor: 3, complejidad: 6 }, tastingNotes: [], brewMethods: [], themeColor: '#111A31', accentColor: '#EB9A37', imageUrl: null, gallery: [], badges: [],
  isActive: false, isFeatured: false, isSeasonal: false, subscriptionEligible: false, sortOrder: 50, seoTitle: '', seoDescription: '',
  variants: [
    { key: 'v1', id: null, name: '340 g · En grano', weightG: 340, grind: 'grano', priceCop: 42900, compareAtCop: null, stock: 0, sku: '', eventAt: '', isActive: true },
    { key: 'v2', id: null, name: '340 g · Molido', weightG: 340, grind: 'media', priceCop: 42900, compareAtCop: null, stock: 0, sku: '', eventAt: '', isActive: true },
  ],
};

async function Editor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { isAdmin, demo } = await staffPage(`/admin/productos/${id}`);
  const isNew = id === 'nuevo';
  let initial = EMPTY;
  if (!isNew) {
    const d = await getProductFull(id);
    if (!d) notFound();
    const p = d.product;
    initial = {
      id: p.id, slug: p.slug, name: p.name, subtitle: p.subtitle ?? '', kind: p.kind, category: p.category ?? '', description: p.description ?? '', story: p.story ?? '', originRegion: p.originRegion ?? '', originFarm: p.originFarm ?? '', producer: p.producer ?? '', altitudeM: p.altitudeM, variety: p.variety ?? '', process: p.process ?? '', roastLevel: p.roastLevel ?? '',
      profile: p.profile ?? null, tastingNotes: p.tastingNotes ?? [], brewMethods: p.brewMethods ?? [], themeColor: p.themeColor ?? '', accentColor: p.accentColor ?? '', imageUrl: p.imageUrl, gallery: p.gallery ?? [], badges: p.badges ?? [],
      isActive: p.isActive, isFeatured: p.isFeatured, isSeasonal: p.isSeasonal, subscriptionEligible: p.subscriptionEligible, sortOrder: p.sortOrder, seoTitle: p.seoTitle ?? '', seoDescription: p.seoDescription ?? '',
      variants: d.variants.map((v) => ({ key: v.id, id: v.id, name: v.name, weightG: v.weightG, grind: v.grind, priceCop: v.priceCop, compareAtCop: v.compareAtCop, stock: v.stock, sku: v.sku ?? '', eventAt: toBogotaLocal(v.eventAt), isActive: v.isActive })),
    };
  }
  return (
    <>
      <PageHeader
        back={{ href: '/admin/productos', label: 'Productos' }}
        eyebrow="Catálogo"
        title={isNew ? 'Nuevo producto' : <span className="flex flex-wrap items-center gap-3">{initial.name} {initial.isActive ? <Badge tone="success" dot>Activo</Badge> : <Badge>Inactivo</Badge>}</span>}
        description={isNew ? 'Completa la ficha, agrega variantes con precio y publícalo cuando esté listo.' : `/${initial.slug} · ${initial.variants.length} variantes`}
      />
      <ProductEditor initial={initial} isNew={isNew} isAdmin={isAdmin} demo={demo} />
    </>
  );
}
