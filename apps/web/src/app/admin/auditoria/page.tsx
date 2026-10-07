import { Suspense } from 'react';
import type { Metadata } from 'next';
import { formatDateTime } from '@travesia/shared';
import { staffPage } from '@/lib/admin/guard';
import { listAudit } from '@/lib/admin/data/ops';
import { flat, type SPromise } from '@/lib/admin/sp';
import { Empty, PageHeader, PageSkeleton, Panel, Table, relTime, td, th, trHover } from '@/components/admin/ui';
import { SearchBox, SelectFilter } from '@/components/admin/client-ui';
import { cn } from '@/lib/cn';

export const metadata: Metadata = { title: 'Auditoría' };

const ENTITIES = ['order', 'product', 'product_variant', 'plan', 'coupon', 'subscription', 'user', 'course', 'enrollment', 'certificate', 'site_content', 'blog_post', 'media', 'store', 'shipping_zone', 'review', 'push_campaign', 'lead', 'chat', 'newsletter'];

export default function Page({ searchParams }: { searchParams: SPromise }) {
  return (
    <Suspense fallback={<PageSkeleton rows={10} />}>
      <Audit searchParams={searchParams} />
    </Suspense>
  );
}

async function Audit({ searchParams }: { searchParams: SPromise }) {
  await staffPage('/admin/auditoria');
  const sp = flat(await searchParams);
  const rows = await listAudit(sp);
  return (
    <>
      <PageHeader eyebrow="Configuración" title="Auditoría" description="Registro de cada cambio hecho desde el panel: quién, qué y cuándo." />
      <Panel>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <SearchBox placeholder="Acción, id o correo…" />
          <SelectFilter param="entity" label="Todas las entidades" options={ENTITIES.map((e) => ({ value: e, label: e }))} />
        </div>
        {rows.length ? (
          <Table>
            <thead><tr><th className={th}>Cuándo</th><th className={th}>Quién</th><th className={th}>Acción</th><th className={th}>Entidad</th><th className={th}>Detalle</th></tr></thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} className={trHover}>
                  <td className={cn(td, 'whitespace-nowrap text-xs text-gris')} title={formatDateTime(a.createdAt)}>{relTime(a.createdAt)}</td>
                  <td className={cn(td, 'text-noche')}>{a.userEmail ?? 'sistema'}</td>
                  <td className={td}><code className="rounded bg-noche/5 px-1.5 py-0.5 text-xs text-noche">{a.action}</code></td>
                  <td className={cn(td, 'text-xs text-gris')}>{a.entity}{a.entityId ? <span className="block font-mono text-[0.65rem] text-noche/70">{a.entityId}</span> : null}</td>
                  <td className={cn(td, 'max-w-md font-mono text-[0.68rem] break-all text-gris')}>{a.meta ? JSON.stringify(a.meta).slice(0, 220) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : <Empty title="Sin registros" />}
      </Panel>
    </>
  );
}
