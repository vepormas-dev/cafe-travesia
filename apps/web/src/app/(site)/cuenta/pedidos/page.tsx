import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { ChevronRight, Package } from 'lucide-react';
import { formatCOP, formatDate } from '@travesia/shared';
import { requireUser } from '@/lib/auth';
import { listOrders } from '@/lib/account';
import { EmptyState } from '@/components/ui/primitives';
import { PageTitle, SectionSkeleton, StatusPill } from '@/components/account/ui';

export const metadata: Metadata = { title: 'Pedidos' };

export default function PedidosPage() {
  return (
    <>
      <PageTitle title="Mis pedidos" intro="Sigue el estado de tus compras, descarga el detalle y rastrea tus envíos." />
      <Suspense fallback={<SectionSkeleton rows={3} />}>
        <Orders />
      </Suspense>
    </>
  );
}

async function Orders() {
  const user = await requireUser('/cuenta/pedidos');
  const orders = await listOrders(user.id);
  if (!orders.length)
    return (
      <EmptyState
        icon={<Package className="size-10" aria-hidden />}
        title="Aún no tienes pedidos"
        text="Cuando compres café, accesorios o cursos los verás aquí con su estado y su guía de envío."
        action={
          <Link href="/tienda" className="btn-primary mt-2">
            Ir a la tienda
          </Link>
        }
      />
    );
  return (
    <div className="card overflow-hidden">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Historial de pedidos</caption>
        <thead className="hidden bg-arena/70 text-xs tracking-wider text-gris uppercase md:table-header-group">
          <tr>
            <th scope="col" className="px-6 py-3 font-semibold">
              Pedido
            </th>
            <th scope="col" className="px-3 py-3 font-semibold">
              Fecha
            </th>
            <th scope="col" className="px-3 py-3 font-semibold">
              Productos
            </th>
            <th scope="col" className="px-3 py-3 font-semibold">
              Estado
            </th>
            <th scope="col" className="px-3 py-3 text-right font-semibold">
              Total
            </th>
            <th scope="col" className="w-24 px-6 py-3">
              <span className="sr-only">Acción</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-noche/10">
          {orders.map((o) => (
            <tr key={o.id} className="relative grid grid-cols-2 gap-1 p-5 transition hover:bg-arena/40 md:table-row md:p-0">
              <td className="font-semibold text-noche md:px-6 md:py-4">
                <Link href={`/cuenta/pedidos/${o.id}`} className="after:absolute after:inset-0 after:content-['']">
                  #{o.number}
                </Link>
              </td>
              <td className="text-right text-gris md:px-3 md:py-4 md:text-left">{formatDate(o.createdAt, { day: '2-digit', month: 'short', year: 'numeric' })}</td>
              <td className="col-span-2 truncate text-gris md:max-w-56 md:px-3 md:py-4">{o.items.map((i) => i.name).join(', ')}</td>
              <td className="md:px-3 md:py-4">
                <StatusPill status={o.status} />
              </td>
              <td className="text-right font-semibold text-noche tabular-nums md:px-3 md:py-4">{formatCOP(o.totalCop)}</td>
              <td className="hidden text-right md:table-cell md:px-6 md:py-4">
                <span className="inline-flex items-center gap-1 text-sm text-noche">
                  Detalles <ChevronRight className="size-4" aria-hidden />
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
