'use client';
import { useActionState, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, ExternalLink, MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { slugify } from '@travesia/shared';
import { cn } from '@/lib/cn';
import { initialActionState } from '@/lib/admin/action-state';
import { deleteStore, saveStore, type StoreInput } from '@/lib/admin/actions/content';
import { ChipsInput, ConfirmButton, Dialog, Field, SubmitButton, Switch, useActionToast, useRunAction } from '../client-ui';
import { MediaPicker } from '../media/media-picker';
import { Badge, btn, inputCls, selectCls } from '../ui';

const KIND = { cafe: 'Café / tienda', finca: 'Finca', aliado: 'Aliado' } as const;
const EMPTY: StoreInput = { id: null, slug: '', name: '', kind: 'cafe', address: '', city: 'Medellín', hours: [], phone: '', mapUrl: null, menuUrl: null, imageUrl: null, description: '', lat: null, lng: null, isActive: true, sortOrder: 10 };

export function StoresManager({ stores }: { stores: StoreInput[] }) {
  const [edit, setEdit] = useState<StoreInput | null>(null);
  const { run } = useRunAction();
  return (
    <>
      <div className="mb-4 flex justify-end"><button type="button" className={btn.primary} onClick={() => setEdit({ ...EMPTY })}><Plus className="size-4" /> Nuevo punto</button></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {stores.map((s) => (
          <article key={s.id} className={cn('overflow-hidden rounded-2xl border border-noche/[0.08] bg-white', !s.isActive && 'opacity-60')}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <div className="aspect-[16/9] bg-arena">{s.imageUrl ? <img src={s.imageUrl} alt="" className="size-full object-cover" /> : null}</div>
            <div className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-2"><h3 className="font-display text-lg text-noche">{s.name}</h3><Badge tone={s.kind === 'cafe' ? 'ambar' : s.kind === 'finca' ? 'success' : 'neutral'}>{KIND[s.kind]}</Badge></div>
              <p className="flex items-start gap-1.5 text-sm text-gris"><MapPin className="mt-0.5 size-3.5 shrink-0" />{s.address}</p>
              {s.hours.map((h) => <p key={h} className="flex items-start gap-1.5 text-xs text-gris"><Clock className="mt-0.5 size-3 shrink-0" />{h}</p>)}
              <div className="flex gap-1 border-t border-noche/[0.06] pt-3">
                <button type="button" className={cn(btn.ghost, btn.sm)} onClick={() => setEdit(s)}><Pencil className="size-3.5" /> Editar</button>
                {s.mapUrl ? <a href={s.mapUrl} target="_blank" rel="noreferrer" className={cn(btn.ghost, btn.sm)}><ExternalLink className="size-3.5" /> Mapa</a> : null}
                <ConfirmButton className={cn(btn.ghost, btn.sm, 'ml-auto text-cereza')} title={`¿Eliminar ${s.name}?`} confirmLabel="Eliminar" onConfirm={() => run(() => deleteStore(s.id!))}><Trash2 className="size-3.5" /></ConfirmButton>
              </div>
            </div>
          </article>
        ))}
      </div>
      {edit ? <StoreDialog key={edit.id ?? 'new'} initial={edit} onClose={() => setEdit(null)} /> : null}
    </>
  );
}

function StoreDialog({ initial, onClose }: { initial: StoreInput; onClose: () => void }) {
  const router = useRouter();
  const [s, setS] = useState(initial);
  const [state, action] = useActionState(saveStore, initialActionState);
  useActionToast(state, () => { router.refresh(); onClose(); });
  const e = state.errors;
  const set = <K extends keyof StoreInput>(k: K, v: StoreInput[K]) => setS((x) => ({ ...x, [k]: v }));
  return (
    <Dialog open onClose={onClose} title={initial.id ? `Editar ${initial.name}` : 'Nuevo punto físico'} wide>
      <form action={action} className="space-y-4">
        <input type="hidden" name="payload" value={JSON.stringify(s)} />
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Nombre" name="name" errors={e} className="sm:col-span-2"><input value={s.name} onChange={(ev) => { set('name', ev.target.value); if (!initial.id) set('slug', slugify(ev.target.value)); }} className={inputCls} /></Field>
          <Field label="Tipo" name="kind" errors={e}><select value={s.kind} onChange={(ev) => set('kind', ev.target.value as StoreInput['kind'])} className={selectCls}>{Object.entries(KIND).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
          <Field label="Slug" name="slug" errors={e}><input value={s.slug} onChange={(ev) => set('slug', ev.target.value)} className={cn(inputCls, 'font-mono text-xs')} /></Field>
          <Field label="Ciudad" name="city" errors={e}><input value={s.city} onChange={(ev) => set('city', ev.target.value)} className={inputCls} /></Field>
          <Field label="Teléfono" name="phone" errors={e}><input value={s.phone ?? ''} onChange={(ev) => set('phone', ev.target.value)} className={inputCls} /></Field>
          <Field label="Dirección" name="address" errors={e} className="sm:col-span-3"><input value={s.address} onChange={(ev) => set('address', ev.target.value)} className={inputCls} /></Field>
          <Field label="Enlace de Google Maps" name="mapUrl" errors={e} className="sm:col-span-2"><input value={s.mapUrl ?? ''} onChange={(ev) => set('mapUrl', ev.target.value)} className={inputCls} /></Field>
          <Field label="Carta / menú (URL)" name="menuUrl" errors={e}><input value={s.menuUrl ?? ''} onChange={(ev) => set('menuUrl', ev.target.value)} className={inputCls} /></Field>
          <Field label="Latitud" name="lat" errors={e}><input type="number" step="any" value={s.lat ?? ''} onChange={(ev) => set('lat', ev.target.value === '' ? null : Number(ev.target.value))} className={inputCls} /></Field>
          <Field label="Longitud" name="lng" errors={e}><input type="number" step="any" value={s.lng ?? ''} onChange={(ev) => set('lng', ev.target.value === '' ? null : Number(ev.target.value))} className={inputCls} /></Field>
          <Field label="Orden" name="sortOrder" errors={e}><input type="number" value={s.sortOrder} onChange={(ev) => set('sortOrder', Number(ev.target.value))} className={inputCls} /></Field>
        </div>
        <Field label="Horarios (una línea por horario)" name="hours" errors={e}><ChipsInput value={s.hours} onChange={(v) => set('hours', v)} placeholder="Lunes a sábado · 9:00 a. m. – 8:00 p. m." max={10} /></Field>
        <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
          <MediaPicker value={s.imageUrl} onChange={(u) => set('imageUrl', u)} folder="sitio" aspect="aspect-video" />
          <div className="space-y-3">
            <Field label="Descripción" name="description" errors={e}><textarea rows={3} value={s.description ?? ''} onChange={(ev) => set('description', ev.target.value)} className={inputCls} /></Field>
            <Switch checked={s.isActive} onChange={(v) => set('isActive', v)} label="Visible en el sitio y la app" />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-noche/[0.06] pt-4"><button type="button" className={btn.secondary} onClick={onClose}>Cancelar</button><SubmitButton>Guardar</SubmitButton></div>
      </form>
    </Dialog>
  );
}
