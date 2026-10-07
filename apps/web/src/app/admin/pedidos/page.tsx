import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Download } from 'lucide-react';
import { ORDER_STATUS_LABEL } from '@travesia/shared';
import { staffPage } from '@/lib/admin/guard';
import { listOrders } from '@/lib/admin/data/orders';
import { CHANNEL_LABEL, ORDER_KIND_LABEL } from '@/lib/admin/labels';
import { flat, pageOf, type SPromise } from '@/lib/admin/sp';
import { PageHeader, PageSkeleton, Pagination, Panel, btn, hrefWith } from '@/components/admin/ui';
import { ChipFilter, DateFilter, SearchBox, SelectFilter } from '@/components/admin/client-ui';
import { OrdersTable } from '@/components/admin/orders/orders-table';

export const metadata: Metadata = { title: 'Pedidos' };

export default function Page({ searchParams }: { searchParams: SPromise }) {
  return (
    <Suspense fallback={<PageSkeleton rows={10} />}>
      <Orders searchParams={searchParams} />
    </Suspense>
  );
}

async function Orders({ searchParams }: { searchParams: SPromise }) {
  await staffPage('/admin/pedidos');
  const sp = flat(await searchParams);
  const data = await listOrders({ ...sp, page: pageOf(sp) });
  const all = Object.values(data.counts).reduce((a, b) => a + b, 0);
  return (
    <>
      <PageHeader
        eyebrow="Ventas"
        title="Pedidos"
        description="Tienda, cursos y suscripciones. Cambia estados, registra guías y prepara despachos."
        actions={
          <a href={hrefWith('/api/admin/export', sp, { type: 'orders', page: null })} className={btn.secondary}>
            <Download className="size-4" /> Exportar CSV
          </a>
        }
      />
      <Panel bodyClassName="pb-3">
        <div className="mb-4 space-y-3">
          <ChipFilter
            param="status"
            options={[{ value: '', label: 'Todos', count: all }, ...(['paid', 'preparing', 'shipped', 'delivered', 'pending', 'failed', 'cancelled', 'refunded'] as const).map((s) => ({ value: s, label: s === 'paid' ? 'Por preparar' : ORDER_STATUS_LABEL[s]!, count: data.counts[s] ?? 0 }))]}
          />
          <div className="flex flex-wrap items-center gap-2">
            <SearchBox placeholder="Número, correo o nombre…" />
            <SelectFilter param="kind" label="Tipo" options={Object.entries(ORDER_KIND_LABEL).map(([value, label]) => ({ value, label }))} />
            <SelectFilter param="channel" label="Canal" options={Object.entries(CHANNEL_LABEL).map(([value, label]) => ({ value, label }))} />
            <DateFilter param="from" label="Desde" />
            <DateFilter param="to" label="Hasta" />
          </div>
        </div>
        <OrdersTable rows={data.rows} params={sp} />
        <Pagination page={data.page} pageSize={data.pageSize} total={data.total} base="/admin/pedidos" params={sp} />
      </Panel>
    </>
  );
}
