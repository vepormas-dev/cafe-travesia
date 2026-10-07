'use client';
import { useState } from 'react';
import { Loader2, MapPin, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { addressSchema } from '@travesia/shared';
import { RegionSelect } from '@/components/cart/region-select';
import { api } from '@/components/shop/fetcher';
import type { AddressLite } from './use-me';
import { cn } from '@/lib/cn';

const EMPTY = { label: 'Casa', recipient: '', phone: '', region: '', city: '', line1: '', line2: '', notes: '', isDefault: false };

export function AddressesManager({ initial }: { initial: AddressLite[] }) {
  const [list, setList] = useState(initial);
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [f, setF] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const open = (a?: AddressLite) => {
    setErrors({});
    setEditing(a ? a.id : 'new');
    setF(a ? { label: a.label, recipient: a.recipient, phone: a.phone, region: a.region, city: a.city, line1: a.line1, line2: a.line2 ?? '', notes: a.notes ?? '', isDefault: a.isDefault } : { ...EMPTY, isDefault: list.length === 0 });
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const r = addressSchema.safeParse({ ...f, line2: f.line2 || null, notes: f.notes || null });
    if (!r.success) {
      const errs: Record<string, string> = {};
      for (const i of r.error.issues) errs[String(i.path[0])] ??= i.message;
      return setErrors(errs);
    }
    setBusy('save');
    const body = { ...r.data, label: f.label || 'Casa', isDefault: f.isDefault };
    const res = editing === 'new' ? await api<{ addresses: AddressLite[] }>('/api/v1/addresses', { body }) : await api<{ addresses: AddressLite[] }>(`/api/v1/addresses/${editing}`, { method: 'PATCH', body });
    setBusy(null);
    if (!res.ok) return void toast.error(res.error);
    setList(res.data.addresses);
    setEditing(null);
    toast.success('Dirección guardada');
  }

  async function remove(id: string) {
    if (!window.confirm('¿Eliminar esta dirección?')) return;
    setBusy(id);
    const res = await api<{ addresses: AddressLite[] }>(`/api/v1/addresses/${id}`, { method: 'DELETE' });
    setBusy(null);
    if (!res.ok) return void toast.error(res.error);
    setList(res.data.addresses);
  }

  async function makeDefault(id: string) {
    setBusy(`d-${id}`);
    const res = await api<{ addresses: AddressLite[] }>(`/api/v1/addresses/${id}`, { method: 'PATCH', body: { isDefault: true } });
    setBusy(null);
    if (!res.ok) return void toast.error(res.error);
    setList(res.data.addresses);
  }

  const input = (k: keyof typeof EMPTY, label: string, extra?: { span?: boolean; type?: string; auto?: string }) => (
    <div className={extra?.span ? 'sm:col-span-2' : undefined}>
      <label htmlFor={`ad-${k}`} className="label">
        {label}
      </label>
      <input id={`ad-${k}`} type={extra?.type ?? 'text'} autoComplete={extra?.auto} className={cn('input', errors[k] && 'input-error')} value={String(f[k])} onChange={(e) => setF({ ...f, [k]: e.target.value })} aria-invalid={Boolean(errors[k])} />
      {errors[k] ? <p className="field-error">{errors[k]}</p> : null}
    </div>
  );

  return (
    <div className="space-y-4">
      {list.length ? (
        <ul className="grid gap-3 md:grid-cols-2">
          {list.map((a) => (
            <li key={a.id} className={cn('rounded-2xl border bg-hueso p-4', a.isDefault ? 'border-noche' : 'border-noche/10')}>
              <div className="flex items-start justify-between gap-3">
                <p className="flex items-center gap-2 font-semibold text-noche">
                  <MapPin className="size-4 text-ambar-700" aria-hidden /> {a.label}
                  {a.isDefault ? <span className="rounded-full bg-noche px-2 py-0.5 text-[0.6rem] font-bold tracking-wider text-crema uppercase">Predeterminada</span> : null}
                </p>
                <div className="flex gap-1">
                  <button type="button" onClick={() => open(a)} className="grid size-8 place-items-center rounded-full hover:bg-noche/5" aria-label={`Editar ${a.label}`}>
                    <Pencil className="size-3.5" aria-hidden />
                  </button>
                  <button type="button" onClick={() => remove(a.id)} disabled={busy === a.id} className="grid size-8 place-items-center rounded-full text-cereza hover:bg-cereza/10" aria-label={`Eliminar ${a.label}`}>
                    {busy === a.id ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Trash2 className="size-3.5" aria-hidden />}
                  </button>
                </div>
              </div>
              <address className="mt-2 text-sm text-noche/80 not-italic">
                {a.recipient} · {a.phone}
                <br />
                {a.line1}
                {a.line2 ? `, ${a.line2}` : ''}
                <br />
                {a.city}, {a.region}
              </address>
              {!a.isDefault ? (
                <button type="button" onClick={() => makeDefault(a.id)} disabled={busy === `d-${a.id}`} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-noche hover:text-ambar-700">
                  <Star className="size-3.5" aria-hidden /> Usar como predeterminada
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gris">Aún no tienes direcciones guardadas. Agrégala una vez y tu checkout será más rápido.</p>
      )}

      {editing ? (
        <form onSubmit={save} className="animate-fade-up rounded-2xl border border-noche/10 bg-crema/60 p-5" noValidate>
          <h3 className="mb-4 text-xl">{editing === 'new' ? 'Nueva dirección' : 'Editar dirección'}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {input('label', 'Nombre (Casa, Oficina…)')}
            {input('recipient', 'Quién recibe', { auto: 'name' })}
            {input('phone', 'Teléfono', { type: 'tel', auto: 'tel' })}
            <div>
              <label htmlFor="ad-region" className="label">
                Departamento
              </label>
              <RegionSelect id="ad-region" value={f.region} onChange={(v) => setF({ ...f, region: v })} error={errors.region} />
              {errors.region ? <p className="field-error">{errors.region}</p> : null}
            </div>
            {input('city', 'Ciudad o municipio', { auto: 'address-level2' })}
            {input('line1', 'Dirección', { auto: 'address-line1' })}
            {input('line2', 'Apto, torre, barrio (opcional)', { span: true, auto: 'address-line2' })}
            {input('notes', 'Indicaciones (opcional)', { span: true })}
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={f.isDefault} onChange={(e) => setF({ ...f, isDefault: e.target.checked })} className="accent-noche" /> Usar como dirección predeterminada
          </label>
          <div className="mt-5 flex gap-3">
            <button type="submit" className="btn-primary btn-sm" disabled={busy === 'save'}>
              {busy === 'save' ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null} Guardar
            </button>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setEditing(null)}>
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className="btn-outline btn-sm" onClick={() => open()}>
          <Plus className="size-3.5" aria-hidden /> Agregar dirección
        </button>
      )}
    </div>
  );
}
