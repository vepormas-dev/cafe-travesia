import { Suspense } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Download } from 'lucide-react';
import { formatCOP } from '@travesia/shared';
import { staffPage } from '@/lib/admin/guard';
import { listCustomers } from '@/lib/admin/data/customers';
import { flat, pageOf, type SPromise } from '@/lib/admin/sp';
import { Avatar, Badge, Empty, PageHeader, PageSkeleton, Pagination, Panel, SortHeader, Table, btn, hrefWith, relTime, td, th, trHover } from '@/components/admin/ui';
import { ChipFilter, SearchBox } from '@/components/admin/client-ui';
import { cn } from '@/lib/cn';

export const metadata: Metadata = { title: 'Clientes' };

export default function Page({ searchParams }: { searchParams: SPromise }) {
  return (
    <Suspense fallback={<PageSkeleton rows={10} />}>
      <Customers searchParams={searchParams} />
    </Suspense>
  );
}

async function Customers({ searchParams }: { searchParams: SPromise }) {
  await staffPage('/admin/clientes');
  const sp = flat(await searchParams);
  const d = await listCustomers({ ...sp, page: pageOf(sp) });
  const base = '/admin/clientes';
  return (
    <>
      <PageHeader eyebrow="Ventas" title="Clientes" description="Valor de vida (LTV), compras, suscripción, cursos y puntos de cada cliente." actions={<a href={hrefWith('/api/admin/export', sp, { type: 'customers', page: null })} className={btn.secondary}><Download className="size-4" /> Exportar CSV</a>} />
      <Panel bodyClassName="pb-3">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <SearchBox placeholder="Nombre, correo o teléfono…" />
          <ChipFilter param="seg" options={[{ value: '', label: 'Todos' }, { value: 'vip', label: 'VIP (LTV ≥ $400 mil)' }, { value: 'subs', label: 'Suscriptores' }, { value: 'students', label: 'Estudiantes' }, { value: 'sin-compras', label: 'Sin compras' }]} />
        </div>
        {d.rows.length ? (
          <Table>
            <thead>
              <tr>
                <SortHeader label="Cliente" field="name" base={base} params={sp} />
                <SortHeader label="LTV" field="ltv" base={base} params={sp} />
                <SortHeader label="Pedidos" field="orders" base={base} params={sp} />
                <th className={th}>Suscripción · cursos</th>
                <SortHeader label="Puntos" field="points" base={base} params={sp} />
                <SortHeader label="Último acceso" field="seen" base={base} params={sp} />
                <SortHeader label="Registro" field="created" base={base} params={sp} />
              </tr>
            </thead>
            <tbody>
              {d.rows.map((c) => (
                <tr key={c.id} className={trHover}>
                  <td className={td}>
                    <Link href={`/admin/clientes/${c.id}`} className="flex items-center gap-3">
                      <Avatar name={c.fullName ?? c.email} />
                      <span className="min-w-0">
                        <span className="block font-medium text-noche hover:underline">{c.fullName ?? '—'} {c.role !== 'customer' ? <Badge tone="noche" className="ml-1">{c.role}</Badge> : null}</span>
                        <span className="block text-xs text-gris">{c.email}</span>
                      </span>
                    </Link>
                  </td>
                  <td className={cn(td, 'font-semibold text-noche tabular-nums')}>{formatCOP(c.ltv)}</td>
                  <td className={cn(td, 'tabular-nums')}>{c.orders}{c.lastOrderAt ? <span className="block text-[0.68rem] text-gris">últ. {relTime(c.lastOrderAt)}</span> : null}</td>
                  <td className={td}>
                    <div className="flex flex-wrap gap-1">
                      {c.subs ? <Badge tone="ambar">Suscriptor</Badge> : null}
                      {c.courses ? <Badge tone="success">{c.courses} curso(s)</Badge> : null}
                      {!c.subs && !c.courses ? <span className="text-xs text-gris">—</span> : null}
                    </div>
                  </td>
                  <td className={cn(td, 'tabular-nums')}>{c.loyaltyPoints.toLocaleString('es-CO')}</td>
                  <td className={cn(td, 'text-xs text-gris')}>{relTime(c.lastSeenAt)}</td>
                  <td className={cn(td, 'text-xs text-gris')}>{relTime(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : <Empty title="Sin clientes con estos filtros" />}
        <Pagination page={d.page} pageSize={d.pageSize} total={d.total} base={base} params={sp} />
      </Panel>
    </>
  );
}
