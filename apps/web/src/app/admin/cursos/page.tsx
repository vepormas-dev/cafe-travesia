import { Suspense } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Plus, Star, Users } from 'lucide-react';
import { formatCOP, formatDuration, LEVEL_LABEL } from '@travesia/shared';
import { staffPage } from '@/lib/admin/guard';
import { listCourses } from '@/lib/admin/data/academy';
import { Badge, PageHeader, PageSkeleton, btn } from '@/components/admin/ui';

export const metadata: Metadata = { title: 'Cursos' };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton rows={6} />}>
      <Courses />
    </Suspense>
  );
}

async function Courses() {
  await staffPage('/admin/cursos');
  const rows = await listCourses();
  return (
    <>
      <PageHeader eyebrow="Academia" title="Cursos" description="Barismo, origen, tueste y preparación. Edita el temario, las lecciones y las evaluaciones." actions={<Link href="/admin/cursos/nuevo" className={btn.primary}><Plus className="size-4" /> Nuevo curso</Link>} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((c) => (
          <Link key={c.id} href={`/admin/cursos/${c.id}`} className="group overflow-hidden rounded-2xl border border-noche/[0.08] bg-white transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-24px_rgba(17,26,49,0.45)]">
            <div className="relative aspect-[16/8] bg-noche">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {c.coverUrl ? <img src={c.coverUrl} alt="" className="size-full object-cover opacity-80 transition group-hover:scale-[1.03]" /> : null}
              <div className="absolute inset-0 bg-gradient-to-t from-noche/80 to-transparent" />
              <div className="absolute top-3 left-3 flex gap-1">{c.isPublished ? <Badge tone="success" dot>Publicado</Badge> : <Badge>Borrador</Badge>}{c.isFeatured ? <Badge tone="ambar">Destacado</Badge> : null}</div>
              <p className="absolute bottom-3 left-4 text-xs font-semibold tracking-wider text-ambar-300 uppercase">{LEVEL_LABEL[c.level]} · {c.category}</p>
            </div>
            <div className="p-4">
              <h3 className="font-display text-lg leading-snug text-noche">{c.title}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-gris">{c.subtitle}</p>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gris">
                <span>{c.modules} módulos · {c.lessons} lecciones</span>
                <span>{formatDuration(c.durationMin * 60)}</span>
                <span className="inline-flex items-center gap-1"><Users className="size-3" /> {c.students}</span>
                {c.ratingCount ? <span className="inline-flex items-center gap-1"><Star className="size-3 fill-ambar text-ambar" /> {c.ratingAvg.toFixed(1)}</span> : null}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-noche/[0.06] pt-3">
                <span className="font-semibold text-noche">{c.isFree || !c.priceCop ? 'Gratis' : formatCOP(c.priceCop)}</span>
                <span className="text-xs text-gris">{c.students ? Math.round((c.completed / c.students) * 100) : 0}% completan</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
