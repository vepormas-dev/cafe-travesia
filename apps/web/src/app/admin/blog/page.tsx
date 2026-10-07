import { Suspense } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Eye, Plus, Star } from 'lucide-react';
import { formatDate } from '@travesia/shared';
import { staffPage } from '@/lib/admin/guard';
import { listPosts } from '@/lib/admin/data/content';
import { POST_STATUS_LABEL, POST_STATUS_TONE } from '@/lib/admin/labels';
import { flat, type SPromise } from '@/lib/admin/sp';
import { Badge, Empty, PageHeader, PageSkeleton, Panel, Table, btn, td, th, trHover } from '@/components/admin/ui';
import { ChipFilter, SearchBox } from '@/components/admin/client-ui';
import { cn } from '@/lib/cn';

export const metadata: Metadata = { title: 'Blog' };

export default function Page({ searchParams }: { searchParams: SPromise }) {
  return (
    <Suspense fallback={<PageSkeleton rows={8} />}>
      <Posts searchParams={searchParams} />
    </Suspense>
  );
}

async function Posts({ searchParams }: { searchParams: SPromise }) {
  await staffPage('/admin/blog');
  const sp = flat(await searchParams);
  const rows = await listPosts(sp);
  return (
    <>
      <PageHeader eyebrow="Contenido" title="Blog · Notas de Café" description="Cultura cafetera, preparación, origen y noticias." actions={<Link href="/admin/blog/nuevo" className={btn.primary}><Plus className="size-4" /> Nuevo artículo</Link>} />
      <Panel>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <SearchBox placeholder="Buscar por título…" />
          <ChipFilter param="status" options={[{ value: '', label: 'Todos' }, { value: 'published', label: 'Publicados' }, { value: 'scheduled', label: 'Programados' }, { value: 'draft', label: 'Borradores' }]} />
        </div>
        {rows.length ? (
          <Table>
            <thead><tr><th className={th}>Artículo</th><th className={th}>Categoría</th><th className={th}>Estado</th><th className={th}>Publicación</th><th className={cn(th, 'text-right')}>Vistas</th></tr></thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className={trHover}>
                  <td className={td}>
                    <Link href={`/admin/blog/${p.id}`} className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <span className="size-12 shrink-0 overflow-hidden rounded-lg bg-arena">{p.coverUrl ? <img src={p.coverUrl} alt="" className="size-full object-cover" /> : null}</span>
                      <span className="min-w-0"><span className="block font-medium text-noche hover:underline">{p.title} {p.isFeatured ? <Star className="inline size-3.5 fill-ambar text-ambar" /> : null}</span><span className="block truncate text-xs text-gris">{p.authorName} · {p.readingMin} min</span></span>
                    </Link>
                  </td>
                  <td className={cn(td, 'text-gris')}>{p.category ?? '—'}</td>
                  <td className={td}><Badge tone={POST_STATUS_TONE[p.status]} dot>{POST_STATUS_LABEL[p.status]}</Badge></td>
                  <td className={cn(td, 'text-xs text-gris')}>{formatDate(p.publishedAt)}</td>
                  <td className={cn(td, 'text-right tabular-nums')}><Eye className="mr-1 inline size-3.5 text-gris" />{p.views.toLocaleString('es-CO')}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : <Empty title="Sin artículos" action={<Link href="/admin/blog/nuevo" className={btn.primary}>Escribir el primero</Link>} />}
      </Panel>
    </>
  );
}
