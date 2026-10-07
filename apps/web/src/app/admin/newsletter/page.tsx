import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Download } from 'lucide-react';
import { formatDate } from '@travesia/shared';
import { staffPage } from '@/lib/admin/guard';
import { listNewsletter } from '@/lib/admin/data/ops';
import { flat, type SPromise } from '@/lib/admin/sp';
import { Badge, Empty, PageHeader, PageSkeleton, Panel, Stat, Table, btn, hrefWith, td, th, trHover } from '@/components/admin/ui';
import { ChipFilter, SearchBox } from '@/components/admin/client-ui';
import { UnsubscribeButton } from '@/components/admin/marketing/newsletter-actions';
import { cn } from '@/lib/cn';

export const metadata: Metadata = { title: 'Newsletter' };

export default function Page({ searchParams }: { searchParams: SPromise }) {
  return (
    <Suspense fallback={<PageSkeleton rows={10} />}>
      <News searchParams={searchParams} />
    </Suspense>
  );
}

async function News({ searchParams }: { searchParams: SPromise }) {
  await staffPage('/admin/newsletter');
  const sp = flat(await searchParams);
  const [rows, all] = await Promise.all([listNewsletter(sp), listNewsletter({})]);
  const active = all.filter((s) => !s.unsubscribedAt).length;
  const sources = Object.entries(all.reduce<Record<string, number>>((m, s) => ({ ...m, [s.source]: (m[s.source] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1]);
  return (
    <>
      <PageHeader eyebrow="Marketing" title="Newsletter" description="Suscriptores del boletín (footer, blog, checkout y app). Exporta para tu herramienta de email marketing." actions={<a href={hrefWith('/api/admin/export', sp, { type: 'newsletter' })} className={btn.secondary}><Download className="size-4" /> Exportar CSV</a>} />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Panel><Stat label="Suscriptores activos" value={active.toLocaleString('es-CO')} /></Panel>
        <Panel><Stat label="Bajas" value={all.length - active} /></Panel>
        <Panel className="col-span-2"><p className="mb-2 text-xs font-medium text-gris">Por fuente</p><div className="flex flex-wrap gap-1.5">{sources.map(([s, n]) => <Badge key={s}>{s} · {n}</Badge>)}</div></Panel>
      </div>
      <Panel>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <SearchBox placeholder="Buscar correo…" />
          <ChipFilter param="status" options={[{ value: '', label: 'Todos' }, { value: 'active', label: 'Activos' }, { value: 'unsub', label: 'Bajas' }]} />
        </div>
        {rows.length ? (
          <Table>
            <thead><tr><th className={th}>Correo</th><th className={th}>Fuente</th><th className={th}>Suscrito</th><th className={th}>Estado</th><th className={th} /></tr></thead>
            <tbody>
              {rows.slice(0, 300).map((s) => (
                <tr key={s.email} className={trHover}>
                  <td className={cn(td, 'font-medium text-noche')}>{s.email}</td>
                  <td className={cn(td, 'text-gris')}>{s.source}</td>
                  <td className={cn(td, 'text-xs text-gris')}>{formatDate(s.createdAt)}</td>
                  <td className={td}>{s.unsubscribedAt ? <Badge>Baja {formatDate(s.unsubscribedAt, { day: 'numeric', month: 'short' })}</Badge> : <Badge tone="success" dot>Activo</Badge>}</td>
                  <td className={cn(td, 'text-right')}>{s.unsubscribedAt ? null : <UnsubscribeButton email={s.email} />}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : <Empty title="Sin suscriptores" />}
      </Panel>
    </>
  );
}
