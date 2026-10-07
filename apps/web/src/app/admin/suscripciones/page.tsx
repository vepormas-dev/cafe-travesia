import { Suspense } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { formatCOP, formatDate, SUBSCRIPTION_STATUS_LABEL } from '@travesia/shared';
import { staffPage } from '@/lib/admin/guard';
import { listSubscriptions } from '@/lib/admin/data/ops';
import { listPlans } from '@/lib/admin/data/catalog';
import { SUB_STATUS_TONE } from '@/lib/admin/labels';
import { flat, pageOf, type SPromise } from '@/lib/admin/sp';
import { Badge, Empty, PageHeader, PageSkeleton, Pagination, Panel, Table, td, th, trHover } from '@/components/admin/ui';
import { ChipFilter, SearchBox, SelectFilter } from '@/components/admin/client-ui';
import { cn } from '@/lib/cn';

export const metadata: Metadata = { title: 'Suscripciones' };

export default function Page({ searchParams }: { searchParams: SPromise }) {
  return (
    <Suspense fallback={<PageSkeleton rows={10} />}>
      <Subs searchParams={searchParams} />
    </Suspense>
  );
}

async function Subs({ searchParams }: { searchParams: SPromise }) {
  await staffPage('/admin/suscripciones');
  const sp = flat(await searchParams);
  const [d, plans] = await Promise.all([listSubscriptions({ ...sp, page: pageOf(sp) }), listPlans()]);
  const total = Object.values(d.counts).reduce((a, b) => a + b, 0);
  return (
    <>
      <PageHeader eyebrow="Ventas" title="Suscripciones" description="Cobro recurrente con tarjeta tokenizada en Wompi. Pausa, salta, cancela o cobra desde el detalle." />
      <Panel bodyClassName="pb-3">
        <div className="mb-4 space-y-3">
          <ChipFilter param="status" options={[{ value: '', label: 'Todas', count: total }, ...['active', 'past_due', 'paused', 'pending', 'cancelled'].map((s) => ({ value: s, label: SUBSCRIPTION_STATUS_LABEL[s]!, count: d.counts[s] ?? 0 }))]} />
          <div className="flex flex-wrap gap-2">
            <SearchBox placeholder="Correo o nombre del suscriptor…" />
            <SelectFilter param="plan" label="Todos los planes" options={plans.map((p) => ({ value: p.id, label: p.name }))} />
          </div>
        </div>
        {d.rows.length ? (
          <Table>
            <thead>
              <tr>
                <th className={th}>Suscriptor</th>
                <th className={th}>Plan · café</th>
                <th className={th}>Estado</th>
                <th className={th}>Próximo cobro</th>
                <th className={th}>Tarjeta</th>
                <th className={cn(th, 'text-right')}>Precio</th>
              </tr>
            </thead>
            <tbody>
              {d.rows.map((s) => (
                <tr key={s.id} className={trHover}>
                  <td className={td}>
                    <Link href={`/admin/suscripciones/${s.id}`} className="font-medium text-noche hover:underline">{s.name}</Link>
                    <p className="text-xs text-gris">{s.email}</p>
                  </td>
                  <td className={td}>
                    <p className="text-noche">{s.plan}</p>
                    <p className="text-xs text-gris">{s.product ?? 'Selección del tostador'} · {s.grind}</p>
                  </td>
                  <td className={td}>
                    <Badge tone={SUB_STATUS_TONE[s.status]} dot>{SUBSCRIPTION_STATUS_LABEL[s.status]}</Badge>
                    {s.failedAttempts ? <p className="mt-0.5 text-[0.68rem] text-cereza">{s.failedAttempts} intento(s) fallido(s)</p> : null}
                  </td>
                  <td className={cn(td, 'text-gris')}>{s.status === 'cancelled' ? '—' : formatDate(s.nextBillingAt, { day: 'numeric', month: 'short' })}</td>
                  <td className={cn(td, 'text-xs text-gris')}>{s.cardBrand ? `${s.cardBrand} •••• ${s.cardLast4}` : '—'}</td>
                  <td className={cn(td, 'text-right font-semibold text-noche tabular-nums')}>{formatCOP(s.priceCop)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <Empty title="Sin suscripciones con estos filtros" />
        )}
        <Pagination page={d.page} pageSize={d.pageSize} total={d.total} base="/admin/suscripciones" params={sp} />
      </Panel>
    </>
  );
}
