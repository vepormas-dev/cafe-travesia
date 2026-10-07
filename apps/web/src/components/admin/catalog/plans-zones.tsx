'use client';
import { useActionState, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calculator, Pencil, Plus, Star, Trash2, Truck } from 'lucide-react';
import { COLOMBIA_REGIONS, FREQUENCY_LABEL, findShippingZone, formatCOP, monthlyValue, slugify } from '@travesia/shared';
import { cn } from '@/lib/cn';
import { initialActionState } from '@/lib/admin/action-state';
import { deleteZone, savePlan, saveZone, type PlanInput, type ZoneInput } from '@/lib/admin/actions/catalog';
import { ChipsInput, ConfirmButton, Dialog, Field, SubmitButton, Switch, useActionToast, useRunAction } from '../client-ui';
import { MediaPicker } from '../media/media-picker';
import { Badge, btn, inputCls, selectCls } from '../ui';

// ------------------------------- Planes -------------------------------
export type PlanUI = PlanInput & { subscribers: number };
const EMPTY_PLAN: PlanUI = { id: null, slug: '', name: '', tagline: '', description: '', audience: 'personal', frequencyWeeks: 4, bagsPerDelivery: 1, bagWeightG: 340, priceCop: 39900, compareAtCop: null, includesAcademy: false, benefits: [], imageUrl: null, isHighlighted: false, isActive: true, sortOrder: 20, subscribers: 0 };

export function PlansManager({ plans }: { plans: PlanUI[] }) {
  const [edit, setEdit] = useState<PlanUI | null>(null);
  return (
    <>
      <div className="mb-4 flex justify-end"><button type="button" className={btn.primary} onClick={() => setEdit({ ...EMPTY_PLAN })}><Plus className="size-4" /> Nuevo plan</button></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((p) => (
          <article key={p.id} className={cn('relative flex flex-col rounded-2xl border bg-white p-5', p.isHighlighted ? 'border-ambar shadow-[0_0_0_3px_rgba(235,154,55,0.15)]' : 'border-noche/[0.08]', !p.isActive && 'opacity-60')}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[0.65rem] font-semibold tracking-[0.18em] text-ambar-700 uppercase">{p.audience === 'empresa' ? 'Empresas' : 'Personal'} · {FREQUENCY_LABEL(p.frequencyWeeks)}</p>
                <h3 className="mt-1 font-display text-xl text-noche">{p.name}</h3>
                <p className="text-sm text-gris">{p.tagline}</p>
              </div>
              {p.isHighlighted ? <Star className="size-4 fill-ambar text-ambar" /> : null}
            </div>
            <p className="mt-3 text-2xl font-semibold text-noche tabular-nums">{formatCOP(p.priceCop)} {p.compareAtCop ? <s className="text-sm font-normal text-gris">{formatCOP(p.compareAtCop)}</s> : null}</p>
            <p className="text-xs text-gris">{p.bagsPerDelivery} × {p.bagWeightG} g · MRR por suscriptor {formatCOP(monthlyValue(p.priceCop, p.frequencyWeeks))}</p>
            <ul className="mt-3 flex-1 space-y-1 text-sm text-noche/80">{p.benefits.map((b) => <li key={b}>· {b}</li>)}</ul>
            <div className="mt-4 flex items-center justify-between border-t border-noche/[0.06] pt-3">
              <span className="text-sm"><strong className="tabular-nums">{p.subscribers}</strong> <span className="text-gris">suscriptores · MRR {formatCOP(p.subscribers * monthlyValue(p.priceCop, p.frequencyWeeks))}</span></span>
              <button type="button" className={cn(btn.ghost, btn.sm)} onClick={() => setEdit(p)}><Pencil className="size-3.5" /> Editar</button>
            </div>
            <div className="absolute top-4 right-10 flex gap-1">{p.includesAcademy ? <Badge tone="success">+ Academia</Badge> : null}{!p.isActive ? <Badge>Inactivo</Badge> : null}</div>
          </article>
        ))}
      </div>
      {edit ? <PlanDialog key={edit.id ?? 'new'} initial={edit} onClose={() => setEdit(null)} /> : null}
    </>
  );
}

function PlanDialog({ initial, onClose }: { initial: PlanUI; onClose: () => void }) {
  const router = useRouter();
  const [p, setP] = useState(initial);
  const [state, action] = useActionState(savePlan, initialActionState);
  useActionToast(state, () => { router.refresh(); onClose(); });
  const e = state.errors;
  const set = <K extends keyof PlanUI>(k: K, v: PlanUI[K]) => setP((x) => ({ ...x, [k]: v }));
  const { subscribers: _s, ...payload } = p;
  return (
    <Dialog open onClose={onClose} title={initial.id ? `Editar ${initial.name}` : 'Nuevo plan'} wide>
      <form action={action} className="space-y-4">
        <input type="hidden" name="payload" value={JSON.stringify(payload)} />
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Nombre" name="name" errors={e}><input value={p.name} onChange={(ev) => { set('name', ev.target.value); if (!initial.id) set('slug', slugify(ev.target.value)); }} className={inputCls} /></Field>
          <Field label="Slug" name="slug" errors={e}><input value={p.slug} onChange={(ev) => set('slug', ev.target.value)} className={cn(inputCls, 'font-mono text-xs')} /></Field>
          <Field label="Audiencia" name="audience" errors={e}><select value={p.audience} onChange={(ev) => set('audience', ev.target.value as PlanUI['audience'])} className={selectCls}><option value="personal">Personal</option><option value="empresa">Empresa</option></select></Field>
          <Field label="Frase corta" name="tagline" errors={e} className="sm:col-span-3"><input value={p.tagline ?? ''} onChange={(ev) => set('tagline', ev.target.value)} className={inputCls} /></Field>
          <Field label="Descripción" name="description" errors={e} className="sm:col-span-3"><textarea rows={2} value={p.description ?? ''} onChange={(ev) => set('description', ev.target.value)} className={inputCls} /></Field>
          <Field label="Frecuencia (semanas)" name="frequencyWeeks" errors={e} hint={FREQUENCY_LABEL(p.frequencyWeeks)}><input type="number" value={p.frequencyWeeks} onChange={(ev) => set('frequencyWeeks', Number(ev.target.value))} className={inputCls} /></Field>
          <Field label="Bolsas por envío" name="bagsPerDelivery" errors={e}><input type="number" value={p.bagsPerDelivery} onChange={(ev) => set('bagsPerDelivery', Number(ev.target.value))} className={inputCls} /></Field>
          <Field label="Gramos por bolsa" name="bagWeightG" errors={e}><input type="number" value={p.bagWeightG} onChange={(ev) => set('bagWeightG', Number(ev.target.value))} className={inputCls} /></Field>
          <Field label="Precio por ciclo (COP)" name="priceCop" errors={e} hint={`MRR ${formatCOP(monthlyValue(p.priceCop, p.frequencyWeeks))}`}><input type="number" value={p.priceCop} onChange={(ev) => set('priceCop', Number(ev.target.value))} className={inputCls} /></Field>
          <Field label="Precio de referencia" name="compareAtCop" errors={e}><input type="number" value={p.compareAtCop ?? ''} onChange={(ev) => set('compareAtCop', ev.target.value === '' ? null : Number(ev.target.value))} className={inputCls} /></Field>
          <Field label="Orden" name="sortOrder" errors={e}><input type="number" value={p.sortOrder} onChange={(ev) => set('sortOrder', Number(ev.target.value))} className={inputCls} /></Field>
        </div>
        <Field label="Beneficios" name="benefits" errors={e}><ChipsInput value={p.benefits} onChange={(v) => set('benefits', v)} placeholder="Envío gratis, 15 % menos…" /></Field>
        <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
          <MediaPicker value={p.imageUrl} onChange={(u) => set('imageUrl', u)} folder="planes" aspect="aspect-square" />
          <div className="space-y-3">
            <Switch checked={p.includesAcademy} onChange={(v) => set('includesAcademy', v)} label="Incluye la Academia" description="Inscribe al suscriptor en los cursos marcados como incluidos" />
            <Switch checked={p.isHighlighted} onChange={(v) => set('isHighlighted', v)} label="Destacado" />
            <Switch checked={p.isActive} onChange={(v) => set('isActive', v)} label="Activo (visible para nuevas suscripciones)" />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-noche/[0.06] pt-4"><button type="button" className={btn.secondary} onClick={onClose}>Cancelar</button><SubmitButton>Guardar plan</SubmitButton></div>
      </form>
    </Dialog>
  );
}

// ------------------------------- Zonas -------------------------------
export type ZoneUI = ZoneInput & { id: string };
const EMPTY_ZONE: ZoneUI = { id: '', name: '', regions: [], cities: [], rateCop: 12000, freeFromCop: null, etaDays: '2-4 días hábiles', isDefault: false, sortOrder: 5 };

export function ZonesManager({ zones }: { zones: ZoneUI[] }) {
  const [edit, setEdit] = useState<ZoneUI | null>(null);
  const { run } = useRunAction();
  const [sim, setSim] = useState({ region: 'Antioquia', city: 'Medellín', subtotal: 85000 });
  const rules = zones.map((z) => ({ ...z, freeFromCop: z.freeFromCop ?? null }));
  const zone = useMemo(() => findShippingZone(rules, sim.region, sim.city), [rules, sim.region, sim.city]);
  const cost = zone ? (zone.freeFromCop != null && sim.subtotal >= zone.freeFromCop ? 0 : zone.rateCop) : null;
  return (
    <div className="grid gap-5 xl:grid-cols-12">
      <div className="space-y-3 xl:col-span-8">
        <div className="flex justify-end"><button type="button" className={btn.primary} onClick={() => setEdit({ ...EMPTY_ZONE })}><Plus className="size-4" /> Nueva zona</button></div>
        {zones.map((z) => (
          <article key={z.id} className={cn('rounded-xl border bg-white p-4', zone?.id === z.id ? 'border-ambar shadow-[0_0_0_3px_rgba(235,154,55,0.15)]' : 'border-noche/[0.08]')}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 font-semibold text-noche"><Truck className="size-4 text-ambar-700" />{z.name} {z.isDefault ? <Badge tone="noche">Predeterminada</Badge> : null}</h3>
                <p className="mt-0.5 text-sm text-gris">{formatCOP(z.rateCop)} · {z.freeFromCop ? `gratis desde ${formatCOP(z.freeFromCop)}` : 'sin envío gratis'} · {z.etaDays}</p>
              </div>
              <div className="flex gap-1">
                <button type="button" className={cn(btn.ghost, btn.sm)} onClick={() => setEdit(z)}><Pencil className="size-3.5" /> Editar</button>
                <ConfirmButton className={cn(btn.ghost, btn.sm, 'text-cereza')} title={`¿Eliminar ${z.name}?`} confirmLabel="Eliminar" onConfirm={() => run(() => deleteZone(z.id))}><Trash2 className="size-3.5" /></ConfirmButton>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {z.regions.map((r) => <span key={r} className="rounded-md bg-noche/[0.07] px-2 py-0.5 text-xs font-medium text-noche">{r}</span>)}
              {z.cities.map((c) => <span key={c} className="rounded-md bg-ambar-100 px-2 py-0.5 text-xs text-ambar-700">{c}</span>)}
              {!z.regions.length && !z.cities.length ? <span className="text-xs text-gris">{z.isDefault ? 'Aplica a todo lo que no coincida con otra zona' : 'Sin cobertura definida'}</span> : null}
            </div>
          </article>
        ))}
      </div>
      <aside className="xl:col-span-4">
        <div className="rounded-xl border border-noche/[0.08] bg-white p-5 xl:sticky xl:top-20">
          <h3 className="flex items-center gap-2 font-semibold text-noche"><Calculator className="size-4 text-ambar-700" /> Simulador de cotización</h3>
          <p className="mb-4 text-xs text-gris">Misma regla que el checkout: primero ciudad, luego departamento, luego la predeterminada.</p>
          <div className="space-y-3">
            <Field label="Departamento"><select value={sim.region} onChange={(e) => setSim({ ...sim, region: e.target.value })} className={selectCls}>{COLOMBIA_REGIONS.map((r) => <option key={r}>{r}</option>)}</select></Field>
            <Field label="Ciudad o municipio"><input value={sim.city} onChange={(e) => setSim({ ...sim, city: e.target.value })} className={inputCls} /></Field>
            <Field label="Subtotal de productos"><input type="number" step={1000} value={sim.subtotal} onChange={(e) => setSim({ ...sim, subtotal: Number(e.target.value) })} className={inputCls} /></Field>
          </div>
          <div className="mt-4 rounded-xl bg-noche p-4 text-crema">
            {zone ? (
              <>
                <p className="text-xs text-crema/60">Zona aplicada</p>
                <p className="font-display text-lg">{zone.name}</p>
                <p className="mt-2 text-3xl font-semibold tabular-nums">{cost === 0 ? 'Gratis' : formatCOP(cost)}</p>
                <p className="text-xs text-crema/70">{zone.etaDays}{zone.freeFromCop && cost ? ` · faltan ${formatCOP(zone.freeFromCop - sim.subtotal)} para envío gratis` : ''}</p>
              </>
            ) : <p className="text-sm">Sin cobertura: el checkout pedirá escribir al equipo.</p>}
          </div>
        </div>
      </aside>
      {edit ? <ZoneDialog key={edit.id || 'new'} initial={edit} onClose={() => setEdit(null)} /> : null}
    </div>
  );
}

function ZoneDialog({ initial, onClose }: { initial: ZoneUI; onClose: () => void }) {
  const router = useRouter();
  const [z, setZ] = useState(initial);
  const [state, action] = useActionState(saveZone, initialActionState);
  useActionToast(state, () => { router.refresh(); onClose(); });
  const e = state.errors;
  return (
    <Dialog open onClose={onClose} title={initial.id ? `Editar ${initial.name}` : 'Nueva zona'} wide>
      <form action={action} className="space-y-4">
        <input type="hidden" name="payload" value={JSON.stringify({ ...z, id: z.id || null })} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nombre" name="name" errors={e}><input value={z.name} onChange={(ev) => setZ({ ...z, name: ev.target.value })} className={inputCls} /></Field>
          <Field label="Tiempo de entrega" name="etaDays" errors={e}><input value={z.etaDays} onChange={(ev) => setZ({ ...z, etaDays: ev.target.value })} className={inputCls} /></Field>
          <Field label="Tarifa (COP)" name="rateCop" errors={e}><input type="number" value={z.rateCop} onChange={(ev) => setZ({ ...z, rateCop: Number(ev.target.value) })} className={inputCls} /></Field>
          <Field label="Envío gratis desde (COP)" name="freeFromCop" errors={e} hint="Vacío = nunca gratis"><input type="number" value={z.freeFromCop ?? ''} onChange={(ev) => setZ({ ...z, freeFromCop: ev.target.value === '' ? null : Number(ev.target.value) })} className={inputCls} /></Field>
        </div>
        <Field label="Departamentos" name="regions" errors={e}><ChipsInput value={z.regions} onChange={(v) => setZ({ ...z, regions: v })} suggestions={COLOMBIA_REGIONS} max={40} placeholder="Escribe o elige departamentos" /></Field>
        <Field label="Ciudades (tienen prioridad sobre el departamento)" name="cities" errors={e}><ChipsInput value={z.cities} onChange={(v) => setZ({ ...z, cities: v })} max={300} placeholder="Medellín, Envigado…" /></Field>
        <div className="flex flex-wrap items-center gap-6">
          <Switch checked={z.isDefault} onChange={(v) => setZ({ ...z, isDefault: v })} label="Zona predeterminada (resto del país)" />
          <Field label="Orden" name="sortOrder" errors={e}><input type="number" value={z.sortOrder} onChange={(ev) => setZ({ ...z, sortOrder: Number(ev.target.value) })} className={cn(inputCls, 'w-24')} /></Field>
        </div>
        <div className="flex justify-end gap-2 border-t border-noche/[0.06] pt-4"><button type="button" className={btn.secondary} onClick={onClose}>Cancelar</button><SubmitButton>Guardar zona</SubmitButton></div>
      </form>
    </Dialog>
  );
}
