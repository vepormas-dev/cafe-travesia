import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { staffPage } from '@/lib/admin/guard';
import { getPostRow } from '@/lib/admin/data/content';
import { toBogotaLocal } from '@/lib/admin/range';
import type { PostInput } from '@/lib/admin/actions/content';
import { PageHeader, PageSkeleton } from '@/components/admin/ui';
import { PostEditor } from '@/components/admin/content/post-editor';

export const metadata: Metadata = { title: 'Editar artículo' };

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<PageSkeleton rows={12} />}>
      <Editor params={params} />
    </Suspense>
  );
}

async function Editor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await staffPage(`/admin/blog/${id}`);
  const isNew = id === 'nuevo';
  let initial: PostInput = { id: null, slug: '', title: '', excerpt: '', content: '', coverUrl: null, category: 'Cultura cafetera', tags: [], authorName: 'Equipo Travesía', status: 'draft', publishedAt: '', isFeatured: false, seoTitle: '', seoDescription: '' };
  if (!isNew) {
    const p = await getPostRow(id);
    if (!p) notFound();
    initial = { id: p.id, slug: p.slug, title: p.title, excerpt: p.excerpt ?? '', content: p.content ?? '', coverUrl: p.coverUrl, category: p.category ?? '', tags: p.tags ?? [], authorName: p.authorName ?? '', status: p.status, publishedAt: toBogotaLocal(p.publishedAt), isFeatured: p.isFeatured, seoTitle: p.seoTitle ?? '', seoDescription: p.seoDescription ?? '' };
  }
  return (
    <>
      <PageHeader back={{ href: '/admin/blog', label: 'Blog' }} eyebrow="Contenido" title={isNew ? 'Nuevo artículo' : initial.title} />
      <PostEditor initial={initial} isNew={isNew} />
    </>
  );
}
