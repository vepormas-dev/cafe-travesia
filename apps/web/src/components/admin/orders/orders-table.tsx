'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, PackageCheck, Printer, Truck } from 'lucide-react';
import { formatCOP, formatDateTime, ORDER_STATUS_LABEL } from '@travesia/shared';
import { cn } from '@/lib/cn';
import type { OrderRow } from '@/lib/admin/data/orders';
import { CHANNEL_LABEL, ORDER_KIND_LABEL, ORDER_STATUS_TONE } from '@/lib/admin/labels';
import { bulkOrderStatus } from '@/lib/admin/actions/orders';
import { Badge, Empty, SortHeader, Table, td, th, trHover } from '../ui';
import { useRunAction } from '../client-ui';

export function OrdersTable({ rows, params }: { rows: OrderRow[]; params: Record<string, string | undefined> }) {
  const [sel, setSel] = useState<Set<string>>(new Set());
  const { pending, run } = useRunAction();
  const router = useRouter();
  const toggle = (id: string) => setSel((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    return n;
  });
  if (!rows.length) return <Empty title="No hay pedidos con estos filtros" text="Prueba con otro estado, fecha o búsqueda." />;
  const allSel = rows.every((r) => sel.has(r.id));
  const bulk = (s: 'preparing' | 'shipped' | 'delivered') => run(() => bulkOrderStatus([...sel], s), { onOk: () => setSel(new Set()) });
  return (
    <>
      {sel.size ? (
        <div className="sticky top-16 z-10 mb-3 flex flex-wrap items-center gap-2 rounded-lg bg-noche px-3 py-2 text-sm text-crema shadow-lg">
          <span className="font-semibold">{sel.size} seleccionados</span>
          <span className="mx-1 h-4 w-px bg-white/20" />
          <button type="button" disabled={pending} onClick={() => bulk('preparing')} className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 hover:bg-white/10">
            <PackageCheck className="size-4" /> En preparación
          </button>
          <button type="button" disabled={pending} onClick={() => bulk('delivered')} className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 hover:bg-white/10">
            <Truck className="size-4" /> Entregados
          </button>
          <button type="button" onClick={() => router.push(`/admin/pedidos/rotulos?ids=${[...sel].join(',')}`)} className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 hover:bg-white/10">
            <Printer className="size-4" /> Imprimir rótulos
          </button>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          <button type="button" onClick={() => setSel(new Set())} className="ml-auto text-xs text-crema/70 hover:text-crema">
            Limpiar
          </button>
        </div>
      ) : null}
      <Table>
        <thead>
          <tr>
            <th className={cn(th, 'w-8')}>
              <input type="checkbox" aria-label="Seleccionar todos" checked={allSel} onChange={() => setSel(allSel ? new Set() : new Set(rows.map((r) => r.id)))} className="size-4 accent-noche" />
            </th>
            <SortHeader label="Pedido" field="number" base="/admin/pedidos" params={params} />
            <SortHeader label="Fecha" field="date" base="/admin/pedidos" params={params} />
            <SortHeader label="Cliente" field="customer" base="/admin/pedidos" params={params} />
            <th className={th}>Tipo · canal</th>
            <SortHeader label="Estado" field="status" base="/admin/pedidos" params={params} />
            <th className={th}>Ítems</th>
            <SortHeader label="Total" field="total" base="/admin/pedidos" params={params} className="text-right" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className={cn(trHover, sel.has(r.id) && 'bg-ambar-100/40')}>
              <td className={td}>
                <input type="checkbox" aria-label={`Seleccionar ${r.number}`} checked={sel.has(r.id)} onChange={() => toggle(r.id)} className="size-4 accent-noche" />
              </td>
              <td className={td}>
                <Link href={`/admin/pedidos/${r.id}`} className="font-semibold text-noche hover:underline">
                  {r.number}
                </Link>
                {r.couponCode ? <span className="ml-1.5 rounded bg-ambar-100 px-1 text-[0.62rem] font-semibold text-ambar-700">{r.couponCode}</span> : null}
              </td>
              <td className={cn(td, 'whitespace-nowrap text-gris')}>{formatDateTime(r.createdAt)}</td>
              <td className={td}>
                <span className="block font-medium text-noche">{r.customerName}</span>
                <span className="block text-xs text-gris">
                  {r.email}
                  {r.city ? ` · ${r.city}` : ''}
                </span>
              </td>
              <td className={cn(td, 'text-gris')}>
                {ORDER_KIND_LABEL[r.kind]} · {CHANNEL_LABEL[r.channel]}
              </td>
              <td className={td}>
                <Badge tone={ORDER_STATUS_TONE[r.status]} dot>
                  {ORDER_STATUS_LABEL[r.status]}
                </Badge>
              </td>
              <td className={cn(td, 'text-gris tabular-nums')}>{r.items}</td>
              <td className={cn(td, 'text-right font-semibold text-noche tabular-nums')}>{formatCOP(r.totalCop)}</td>
            </tr>
          ))}
        </tbody>
      </Table>
      <p className="mt-2 text-[0.7rem] text-gris">Tip: selecciona varios pedidos para cambiar su estado o imprimir rótulos en lote.</p>
    </>
  );
}
