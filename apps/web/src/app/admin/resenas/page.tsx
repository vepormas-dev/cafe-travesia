import { Suspense } from 'react';
import type { Metadata } from 'next';
import { staffPage } from '@/lib/admin/guard';
import { listReviews } from '@/lib/admin/data/catalog';
import { flat, type SPromise } from '@/lib/admin/sp';
import { PageHeader, PageSkeleton, Tabs } from '@/components/admin/ui';
import { ReviewsList } from '@/components/admin/catalog/reviews-list';

export const metadata: Metadata = { title: 'Reseñas' };

export default function Page({ searchParams }: { searchParams: SPromise }) {
  return (
    <Suspense fallback={<PageSkeleton rows={6} />}>
      <Reviews searchParams={searchParams} />
    </Suspense>
  );
}

async function Reviews({ searchParams }: { searchParams: SPromise }) {
  await staffPage('/admin/resenas');
  const sp = flat(await searchParams);
  const status = ['pending', 'approved', 'rejected'].includes(sp.status ?? '') ? sp.status : sp.status === 'all' ? undefined : 'pending';
  const [rows, all] = await Promise.all([listReviews(status), listReviews()]);
  const count = (s: string) => all.filter((r) => r.status === s).length;
  return (
    <>
      <PageHeader eyebrow="Catálogo" title="Reseñas" description="Modera las opiniones de productos y cursos. Al aprobar o rechazar se recalcula la calificación pública." />
      <Tabs active={sp.status ?? 'pending'} items={[{ key: 'pending', label: 'Pendientes', href: '/admin/resenas', count: count('pending') }, { key: 'approved', label: 'Aprobadas', href: '/admin/resenas?status=approved', count: count('approved') }, { key: 'rejected', label: 'Rechazadas', href: '/admin/resenas?status=rejected', count: count('rejected') }, { key: 'all', label: 'Todas', href: '/admin/resenas?status=all', count: all.length }]} />
      <ReviewsList rows={rows.map((r) => ({ id: r.id, target: r.target, author: r.author, rating: r.rating, title: r.title, body: r.body, status: r.status, verified: r.verified, createdAt: r.createdAt.toISOString(), kind: r.productId ? 'producto' : 'curso' }))} />
    </>
  );
}
