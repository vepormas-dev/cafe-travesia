'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Check, Loader2, Search } from 'lucide-react';
import { formatCOP } from '@travesia/shared';
import { cn } from '@/lib/cn';
import { updateVariantStock } from '@/lib/admin/actions/catalog';
import { Badge, Table, inputCls, td, th, trHover } from '../ui';

type Row = { id: string; productId: string; product: string; variant: string; sku: string | null; stock: number; priceCop: number; isActive: boolean };

export function InventoryGrid({ rows }: { rows: Row[] }) {
  const [q, setQ] = useState('');
  const [onlyLow, setOnlyLow] = useState(false);
  const [values, setValues] = useState<Record<string, number>>(() => Object.fromEntries(rows.map((r) => [r.id, r.stock])));
  const [saved, setSaved] = useState<Record<string, number>>(() => Object.fromEntries(rows.map((r) => [r.id, r.stock])));
  const [busy, setBusy] = useState<string | null>(null);
  const list = useMemo(() => rows.filter((r) => (!q || `${r.product} ${r.variant} ${r.sku}`.toLowerCase().includes(q.toLowerCase())) && (!onlyLow || (values[r.id] ?? 0) <= 5)), [rows, q, onlyLow, values]);
  const save = async (id: string) => {
    const v = values[id] ?? 0;
    if (v === saved[id]) return;
    setBusy(id);
    const r = await updateVariantStock(id, v);
    setBusy(null);
    if (r.ok) {
      setSaved((s) => ({ ...s, [id]: v }));
      toast.success(r.message);
    } else {
      (r.demo ? toast.info : toast.error)(r.message);
      if (r.demo) setSaved((s) => ({ ...s, [id]: v }));
    }
  };
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[14rem] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gris" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrar por producto, variante o SKU…" className={cn(inputCls, 'pl-9')} />
        </div>
        <label className="flex items-center gap-2 text-sm text-noche">
          <input type="checkbox" checked={onlyLow} onChange={(e) => setOnlyLow(e.target.checked)} className="size-4 accent-noche" /> Solo stock bajo
        </label>
      </div>
      <Table>
        <thead>
          <tr>
            <th className={th}>Producto</th>
            <th className={th}>Variante</th>
            <th className={th}>SKU</th>
            <th className={th}>Precio</th>
            <th className={cn(th, 'w-44')}>Stock</th>
          </tr>
        </thead>
        <tbody>
          {list.map((r) => {
            const v = values[r.id] ?? 0;
            const dirty = v !== saved[r.id];
            return (
              <tr key={r.id} className={cn(trHover, !r.isActive && 'opacity-55')}>
                <td className={td}>
                  <Link href={`/admin/productos/${r.productId}`} className="font-medium text-noche hover:underline">{r.product}</Link>
                </td>
                <td className={cn(td, 'text-noche/80')}>
                  {r.variant} {!r.isActive ? <Badge className="ml-1">Inactiva</Badge> : null}
                </td>
                <td className={cn(td, 'font-mono text-xs text-gris')}>{r.sku ?? '—'}</td>
                <td className={cn(td, 'tabular-nums')}>{formatCOP(r.priceCop)}</td>
                <td className={td}>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      value={v}
                      aria-label={`Stock de ${r.product} ${r.variant}`}
                      onChange={(e) => setValues((s) => ({ ...s, [r.id]: Math.max(0, Number(e.target.value) || 0) }))}
                      onBlur={() => void save(r.id)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
                      className={cn(inputCls, 'w-24 text-right tabular-nums', v === 0 ? 'border-cereza/40 bg-rose-50' : v <= 5 ? 'border-amber-300 bg-amber-50' : '', dirty && 'ring-2 ring-ambar/40')}
                    />
                    {busy === r.id ? <Loader2 className="size-4 animate-spin text-gris" /> : !dirty && v !== r.stock ? <Check className="size-4 text-montana" /> : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </>
  );
}
