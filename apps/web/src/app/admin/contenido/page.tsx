import { Suspense } from 'react';
import type { Metadata } from 'next';
import { SITE_DEFAULTS } from '@travesia/db';
import { staffPage } from '@/lib/admin/guard';
import { getSiteSections } from '@/lib/admin/data/content';
import { listProducts } from '@/lib/admin/data/catalog';
import { SITE_KEY_LIST, type SiteKey } from '@/lib/admin/site-schemas';
import { flat, type SPromise } from '@/lib/admin/sp';
import { DemoBanner, PageHeader, PageSkeleton } from '@/components/admin/ui';
import { SiteEditor } from '@/components/admin/content/site-editor';

export const metadata: Metadata = { title: 'Páginas del sitio' };

export default function Page({ searchParams }: { searchParams: SPromise }) {
  return (
    <Suspense fallback={<PageSkeleton rows={10} />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: { searchParams: SPromise }) {
  const { demo } = await staffPage('/admin/contenido');
  const sp = flat(await searchParams);
  const active = (SITE_KEY_LIST.includes(sp.k as SiteKey) ? sp.k : 'home.hero') as SiteKey;
  const [sections, products] = await Promise.all([getSiteSections(), listProducts({})]);
  return (
    <>
      <PageHeader eyebrow="Contenido · CMS" title="Páginas del sitio" description="Edita los textos, imágenes y botones de la web y la app. Al guardar se publica de inmediato (caché invalidada por sección)." />
      {demo ? <DemoBanner /> : null}
      <SiteEditor
        key={active}
        active={active}
        defaults={SITE_DEFAULTS[active] as unknown as Record<string, unknown>}
        sections={sections.map((s) => ({ key: s.key as SiteKey, content: s.content, updatedAt: s.updatedAt?.toISOString() ?? null, updatedBy: s.updatedBy, custom: s.custom }))}
        products={products.filter((p) => p.kind === 'coffee').map((p) => ({ slug: p.slug, name: p.name, themeColor: p.themeColor }))}
      />
    </>
  );
}
