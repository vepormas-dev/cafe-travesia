'use client';
import { useActionState, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { formatCOP, formatDate } from '@travesia/shared';
import { cn } from '@/lib/cn';
import { initialActionState } from '@/lib/admin/action-state';
import { deleteCoupon, saveCoupon, type CouponInput } from '@/lib/admin/actions/catalog';
import { ConfirmButton, Dialog, Field, SubmitButton, Switch, useActionToast, useRunAction } from '../client-ui';
import { Badge, Empty, Table, btn, inputCls, selectCls, td, th, trHover } from '../ui';

export type CouponRowUI = Omit<CouponInput, 'startsAt' | 'endsAt'> & { id: string; startsAt: string; endsAt: string; uses: number; state: string; discountTotal: number };
const STATE_TONE = { vigente: 'success', programado: 'ambar', vencido: 'neutral', agotado: 'danger', inactivo: 'neutral' } as const;
const EMPTY: CouponRowUI = { id: '', code: '', description: '', kind: 'percent', value: 10, scope: 'all', minSubtotalCop: 0, maxUses: null, maxUsesPerUser: 1, isActive: true, startsAt: '', endsAt: '', uses: 0, state: 'vigente', discountTotal: 0 };

export function CouponsManager({ rows }: { rows: CouponRowUI[] }) {
  const [edit, setEdit] = useState<CouponRowUI | null>(null);
  const { run } = useRunAction();
  return (
    <>
      <div className="mb-4 flex justify-end">
        <button type="button" className={btn.primary} onClick={() => setEdit({ ...EMPTY })}><Plus className="size-4" /> Nuevo cupón</button>
      </div>
      {rows.length ? (
        <Table>
          <thead><tr><th className={th}>Código</th><th className={th}>Descuento</th><th className={th}>Estado</th><th className={th}>Vigencia</th><th className={th}>Uso</th><th className={cn(th, 'text-right')}>Descontado</th><th className={th} /></tr></thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className={trHover}>
                <td className={td}><code className="rounded bg-ambar-100 px-2 py-0.5 font-semibold text-ambar-700">{c.code}</code><p className="mt-1 text-xs text-gris">{c.description}</p></td>
                <td className={cn(td, 'text-noche')}>{c.kind === 'percent' ? `${c.value} %` : c.kind === 'fixed' ? formatCOP(c.value) : 'Envío gratis'}<p className="text-xs text-gris">{c.scope === 'all' ? 'Todo' : c.scope === 'products' ? 'Productos' : 'Cursos'}{c.minSubtotalCop ? ` · desde ${formatCOP(c.minSubtotalCop)}` : ''}</p></td>
                <td className={td}><Badge tone={STATE_TONE[c.state as keyof typeof STATE_TONE]} dot>{c.state}</Badge></td>
                <td className={cn(td, 'text-xs text-gris')}>{c.startsAt || c.endsAt ? `${c.startsAt ? formatDate(c.startsAt, { day: 'numeric', month: 'short' }) : '—'} → ${c.endsAt ? formatDate(c.endsAt, { day: 'numeric', month: 'short' }) : 'sin fin'}` : 'Siempre'}</td>
                <td className={td}>
                  <span className="tabular-nums">{c.uses}{c.maxUses ? ` / ${c.maxUses}` : ''}</span>
                  {c.maxUses ? <div className="mt-1 h-1 w-20 overflow-hidden rounded-full bg-noche/10"><div className="h-full bg-ambar" style={{ width: `${Math.min(100, (c.uses / c.maxUses) * 100)}%` }} /></div> : null}
                </td>
                <td className={cn(td, 'text-right tabular-nums')}>{formatCOP(c.discountTotal)}</td>
                <td className={cn(td, 'text-right whitespace-nowrap')}>
                  <button type="button" className={cn(btn.ghost, btn.sm)} onClick={() => setEdit(c)} aria-label={`Editar ${c.code}`}><Pencil className="size-3.5" /></button>
                  <ConfirmButton className={cn(btn.ghost, btn.sm, 'text-cereza')} title={`¿Eliminar ${c.code}?`} description="Si ya se usó, se desactiva para conservar el historial." confirmLabel="Eliminar" onConfirm={() => run(() => deleteCoupon(c.id))}><Trash2 className="size-3.5" /></ConfirmButton>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : <Empty title="Aún no hay cupones" />}
      {edit ? <CouponDialog key={edit.id || 'new'} initial={edit} onClose={() => setEdit(null)} /> : null}
    </>
  );
}

function CouponDialog({ initial, onClose }: { initial: CouponRowUI; onClose: () => void }) {
  const router = useRouter();
  const [c, setC] = useState(initial);
  const [state, action] = useActionState(saveCoupon, initialActionState);
  useActionToast(state, () => { router.refresh(); onClose(); });
  const e = state.errors;
  const set = <K extends keyof CouponRowUI>(k: K, v: CouponRowUI[K]) => setC((x) => ({ ...x, [k]: v }));
  return (
    <Dialog open onClose={onClose} title={initial.id ? `Editar ${initial.code}` : 'Nuevo cupón'}>
      <form action={action} className="space-y-4">
        <input type="hidden" name="payload" value={JSON.stringify({ ...c, id: c.id || null })} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Código" name="code" errors={e}><input value={c.code} onChange={(ev) => set('code', ev.target.value.toUpperCase())} className={cn(inputCls, 'font-mono uppercase')} placeholder="QUINCENA15" /></Field>
          <Field label="Tipo" name="kind" errors={e}>
            <select value={c.kind} onChange={(ev) => set('kind', ev.target.value as CouponRowUI['kind'])} className={selectCls}><option value="percent">Porcentaje</option><option value="fixed">Valor fijo (COP)</option><option value="free_shipping">Envío gratis</option></select>
          </Field>
          <Field label="Descripción" name="description" errors={e} className="sm:col-span-2"><input value={c.description ?? ''} onChange={(ev) => set('description', ev.target.value)} className={inputCls} /></Field>
          {c.kind !== 'free_shipping' ? <Field label={c.kind === 'percent' ? 'Porcentaje' : 'Valor (COP)'} name="value" errors={e}><input type="number" value={c.value} onChange={(ev) => set('value', Number(ev.target.value))} className={inputCls} /></Field> : null}
          <Field label="Aplica a" name="scope" errors={e}><select value={c.scope} onChange={(ev) => set('scope', ev.target.value as CouponRowUI['scope'])} className={selectCls}><option value="all">Todo el carrito</option><option value="products">Solo productos</option><option value="courses">Solo cursos</option></select></Field>
          <Field label="Compra mínima (COP)" name="minSubtotalCop" errors={e}><input type="number" value={c.minSubtotalCop} onChange={(ev) => set('minSubtotalCop', Number(ev.target.value))} className={inputCls} /></Field>
          <Field label="Usos máximos (total)" name="maxUses" errors={e} hint="Vacío = ilimitado"><input type="number" value={c.maxUses ?? ''} onChange={(ev) => set('maxUses', ev.target.value === '' ? null : Number(ev.target.value))} className={inputCls} /></Field>
          <Field label="Usos por cliente" name="maxUsesPerUser" errors={e}><input type="number" value={c.maxUsesPerUser ?? ''} onChange={(ev) => set('maxUsesPerUser', ev.target.value === '' ? null : Number(ev.target.value))} className={inputCls} /></Field>
          <Field label="Inicia (Bogotá)" name="startsAt" errors={e}><input type="datetime-local" value={c.startsAt} onChange={(ev) => set('startsAt', ev.target.value)} className={inputCls} /></Field>
          <Field label="Termina (Bogotá)" name="endsAt" errors={e}><input type="datetime-local" value={c.endsAt} onChange={(ev) => set('endsAt', ev.target.value)} className={inputCls} /></Field>
        </div>
        <Switch checked={c.isActive} onChange={(v) => set('isActive', v)} label="Activo" />
        <div className="flex justify-end gap-2 border-t border-noche/[0.06] pt-4">
          <button type="button" className={btn.secondary} onClick={onClose}>Cancelar</button>
          <SubmitButton>{initial.id ? 'Guardar' : 'Crear cupón'}</SubmitButton>
        </div>
      </form>
    </Dialog>
  );
}
