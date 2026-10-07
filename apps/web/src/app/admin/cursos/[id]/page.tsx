import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { staffPage } from '@/lib/admin/guard';
import { getCourseFull } from '@/lib/admin/data/academy';
import type { CourseInput } from '@/lib/admin/actions/academy';
import { Badge, PageHeader, PageSkeleton } from '@/components/admin/ui';
import { CourseEditor } from '@/components/admin/academy/course-editor';

export const metadata: Metadata = { title: 'Editar curso' };

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<PageSkeleton rows={12} />}>
      <Editor params={params} />
    </Suspense>
  );
}

const EMPTY: CourseInput = {
  id: null, slug: '', title: '', subtitle: '', description: '', coverUrl: null, trailerUrl: null, level: 'principiante', category: '', instructorName: 'Alex Travesía', instructorTitle: 'Barista líder · Florida', instructorBio: '', instructorAvatarUrl: null,
  priceCop: 0, compareAtCop: null, isFree: false, includedInSubscription: true, whatYouLearn: [], requirements: [], resources: [], durationMin: 0, certificateEnabled: true, isPublished: false, isFeatured: false, sortOrder: 10, seoTitle: '', seoDescription: '', modules: [],
};

async function Editor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { demo } = await staffPage(`/admin/cursos/${id}`);
  const isNew = id === 'nuevo';
  let initial = EMPTY;
  if (!isNew) {
    const d = await getCourseFull(id);
    if (!d) notFound();
    const c = d.course;
    initial = {
      id: c.id, slug: c.slug, title: c.title, subtitle: c.subtitle ?? '', description: c.description ?? '', coverUrl: c.coverUrl, trailerUrl: c.trailerUrl, level: c.level, category: c.category ?? '', instructorName: c.instructorName ?? '', instructorTitle: c.instructorTitle ?? '', instructorBio: c.instructorBio ?? '', instructorAvatarUrl: c.instructorAvatarUrl,
      priceCop: c.priceCop, compareAtCop: c.compareAtCop, isFree: c.isFree, includedInSubscription: c.includedInSubscription, whatYouLearn: c.whatYouLearn ?? [], requirements: c.requirements ?? [], resources: c.resources ?? [], durationMin: c.durationMin, certificateEnabled: c.certificateEnabled, isPublished: c.isPublished, isFeatured: c.isFeatured, sortOrder: c.sortOrder, seoTitle: c.seoTitle ?? '', seoDescription: c.seoDescription ?? '',
      modules: d.modules,
    };
  }
  return (
    <>
      <PageHeader back={{ href: '/admin/cursos', label: 'Cursos' }} eyebrow="Academia" title={isNew ? 'Nuevo curso' : <span className="flex flex-wrap items-center gap-3">{initial.title} {initial.isPublished ? <Badge tone="success" dot>Publicado</Badge> : <Badge>Borrador</Badge>}</span>} description={isNew ? 'Escribe el título y genera el temario con IA, o créalo a mano.' : `${initial.modules.length} módulos · ${initial.modules.reduce((n, m) => n + m.lessons.length, 0)} lecciones`} />
      <CourseEditor initial={initial} isNew={isNew} demo={demo} />
    </>
  );
}
