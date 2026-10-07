import { Suspense } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { formatDate } from '@travesia/shared';
import { staffPage } from '@/lib/admin/guard';
import { listCourses, listEnrollments } from '@/lib/admin/data/academy';
import { ENROLL_SOURCE_LABEL } from '@/lib/admin/labels';
import { flat, pageOf, type SPromise } from '@/lib/admin/sp';
import { Badge, Empty, PageHeader, PageSkeleton, Pagination, Panel, Table, relTime, td, th, trHover } from '@/components/admin/ui';
import { ChipFilter, SearchBox, SelectFilter } from '@/components/admin/client-ui';
import { EnrollmentToggle, GrantAccessButton } from '@/components/admin/academy/academy-actions';
import { cn } from '@/lib/cn';

export const metadata: Metadata = { title: 'Estudiantes' };

export default function Page({ searchParams }: { searchParams: SPromise }) {
  return (
    <Suspense fallback={<PageSkeleton rows={10} />}>
      <Students searchParams={searchParams} />
    </Suspense>
  );
}

async function Students({ searchParams }: { searchParams: SPromise }) {
  await staffPage('/admin/estudiantes');
  const sp = flat(await searchParams);
  const [d, courses] = await Promise.all([listEnrollments({ ...sp, page: pageOf(sp) }), listCourses()]);
  return (
    <>
      <PageHeader eyebrow="Academia" title="Estudiantes" description="Inscripciones con su progreso. Otorga o revoca acceso manualmente." actions={<GrantAccessButton courses={courses.map((c) => ({ id: c.id, title: c.title }))} />} />
      <Panel bodyClassName="pb-3">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <SearchBox placeholder="Nombre o correo…" />
          <SelectFilter param="course" label="Todos los cursos" options={courses.map((c) => ({ value: c.id, label: c.title }))} />
          <ChipFilter param="status" options={[{ value: '', label: 'Todos' }, { value: 'active', label: 'Activos' }, { value: 'completed', label: 'Completados' }, { value: 'revoked', label: 'Revocados' }]} />
        </div>
        {d.rows.length ? (
          <Table>
            <thead><tr><th className={th}>Estudiante</th><th className={th}>Curso</th><th className={th}>Origen</th><th className={th}>Progreso</th><th className={th}>Última actividad</th><th className={th}>Inscrito</th><th className={th} /></tr></thead>
            <tbody>
              {d.rows.map((r) => (
                <tr key={r.id} className={trHover}>
                  <td className={td}><Link href={`/admin/clientes/${r.userId}`} className="font-medium text-noche hover:underline">{r.name}</Link><p className="text-xs text-gris">{r.email}</p></td>
                  <td className={cn(td, 'text-noche')}>{r.course}</td>
                  <td className={td}><Badge tone={r.source === 'admin' ? 'noche' : r.source === 'purchase' ? 'ambar' : 'neutral'}>{ENROLL_SOURCE_LABEL[r.source]}</Badge></td>
                  <td className={td}>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-noche/[0.07]"><div className={cn('h-full rounded-full', r.status === 'completed' ? 'bg-montana' : 'bg-ambar')} style={{ width: `${r.progressPct}%` }} /></div>
                      <span className="text-xs tabular-nums">{r.progressPct}%</span>
                      {r.status === 'completed' ? <Badge tone="success">Completado</Badge> : r.status === 'revoked' ? <Badge tone="danger">Revocado</Badge> : null}
                    </div>
                  </td>
                  <td className={cn(td, 'text-xs text-gris')}>{relTime(r.updatedAt)}</td>
                  <td className={cn(td, 'text-xs text-gris')}>{formatDate(r.createdAt, { day: 'numeric', month: 'short' })}</td>
                  <td className={cn(td, 'text-right')}><EnrollmentToggle id={r.id} revoked={r.status === 'revoked'} /></td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : <Empty title="Sin inscripciones con estos filtros" />}
        <Pagination page={d.page} pageSize={d.pageSize} total={d.total} base="/admin/estudiantes" params={sp} />
      </Panel>
    </>
  );
}
