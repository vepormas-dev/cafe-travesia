import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ExternalLink, FileText } from 'lucide-react';
import { formatDate } from '@travesia/shared';
import { staffPage } from '@/lib/admin/guard';
import { listCertificates } from '@/lib/admin/data/academy';
import { flat, type SPromise } from '@/lib/admin/sp';
import { Badge, Empty, PageHeader, PageSkeleton, Panel, Table, btn, td, th, trHover } from '@/components/admin/ui';
import { ChipFilter, SearchBox } from '@/components/admin/client-ui';
import { CertificateToggle } from '@/components/admin/academy/academy-actions';
import { cn } from '@/lib/cn';

export const metadata: Metadata = { title: 'Certificados' };

export default function Page({ searchParams }: { searchParams: SPromise }) {
  return (
    <Suspense fallback={<PageSkeleton rows={8} />}>
      <Certs searchParams={searchParams} />
    </Suspense>
  );
}

async function Certs({ searchParams }: { searchParams: SPromise }) {
  const { isAdmin } = await staffPage('/admin/certificados');
  const sp = flat(await searchParams);
  const rows = await listCertificates(sp);
  return (
    <>
      <PageHeader eyebrow="Academia" title="Certificados" description="Certificados emitidos al completar cursos. Cada uno tiene una página pública de verificación." />
      <Panel>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <SearchBox placeholder="Código o nombre…" />
          <ChipFilter param="status" options={[{ value: '', label: 'Todos' }, { value: 'valid', label: 'Válidos' }, { value: 'revoked', label: 'Revocados' }]} />
        </div>
        {rows.length ? (
          <Table>
            <thead><tr><th className={th}>Código</th><th className={th}>Titular</th><th className={th}>Curso</th><th className={th}>Horas</th><th className={th}>Emitido</th><th className={th}>Estado</th><th className={th} /></tr></thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className={trHover}>
                  <td className={td}><code className="font-semibold text-noche">{c.code}</code></td>
                  <td className={cn(td, 'text-noche')}>{c.holderName}</td>
                  <td className={cn(td, 'text-gris')}>{c.courseTitle}</td>
                  <td className={cn(td, 'tabular-nums')}>{c.hours} h</td>
                  <td className={cn(td, 'text-xs text-gris')}>{formatDate(c.issuedAt)}</td>
                  <td className={td}>{c.revokedAt ? <Badge tone="danger">Revocado</Badge> : <Badge tone="success" dot>Válido</Badge>}</td>
                  <td className={cn(td, 'text-right whitespace-nowrap')}>
                    <a href={`/api/certificates/${c.code}`} target="_blank" rel="noreferrer" className={cn(btn.ghost, btn.sm)}><FileText className="size-3.5" /> PDF</a>
                    <a href={`/certificados/${c.code}`} target="_blank" rel="noreferrer" className={cn(btn.ghost, btn.sm)}><ExternalLink className="size-3.5" /></a>
                    {isAdmin ? <CertificateToggle id={c.id} revoked={Boolean(c.revokedAt)} /> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : <Empty title="Aún no hay certificados" />}
      </Panel>
    </>
  );
}
