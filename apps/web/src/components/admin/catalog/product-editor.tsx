'use client';
import { useActionState, useState, useTransition } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, Copy, ExternalLink, GripVertical, Loader2, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { formatCOP, PRODUCT_KIND_LABEL, PROFILE_LABELS, slugify, GRIND_LABEL } from '@travesia/shared';
import { CoffeeBag } from '@/components/brand/coffee-bag';
import { cn } from '@/lib/cn';
import { initialActionState } from '@/lib/admin/action-state';
import { aiProductCopy, deleteProduct, duplicateProduct, saveProduct, type ProductInput, type VariantInput } from '@/lib/admin/actions/catalog';
import { PRODUCT_KINDS } from '@/lib/admin/labels';
import { ChipsInput, ConfirmButton, Field, SubmitButton, Switch, useActionToast } from '../client-ui';
import { ColorField, GooglePreview, MarkdownField, Section, Swatches } from '../forms';
import { MediaDialog, MediaPicker } from '../media/media-picker';
import { btn, inputCls, selectCls } from '../ui';

type Profile = { tueste: number; acidez: number; cuerpo: number; dulzor: number; amargor: number; complejidad: number };
export type ProductFormValue = Omit<ProductInput, 'variants' | 'profile'> & { profile: Profile | null; variants: (VariantInput & { key: string })[] };

const NOTE_SUGGESTIONS = ['Chocolate', 'Panela', 'Caramelo', 'Nuez', 'Frutos rojos', 'Mandarina', 'Jazmín', 'Durazno', 'Miel', 'Cacao', 'Vainilla', 'Limonaria'];
const METHOD_SUGGESTIONS = ['Espresso', 'V60', 'Chemex', 'Prensa francesa', 'AeroPress', 'Greca', 'Moka', 'Cold brew'];
const BADGE_SUGGESTIONS = ['Más vendido', 'Nuevo', 'Edición limitada', 'Altitud alta', 'Favorito del barista', 'Regalo ideal'];
const DEFAULT_PROFILE: Profile = { tueste: 5, acidez: 5, cuerpo: 5, dulzor: 5, amargor: 3, complejidad: 5 };

export function ProductEditor({ initial, isNew, isAdmin, demo }: { initial: ProductFormValue; isNew: boolean; isAdmin: boolean; demo: boolean }) {
  const [p, setP] = useState<ProductFormValue>(initial);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [state, action] = useActionState(saveProduct, initialActionState);
  const [aiPending, startAi] = useTransition();
  const [galleryOpen, setGalleryOpen] = useState(false);
  useActionToast(state);
  const e = state.errors;
  const set = <K extends keyof ProductFormValue>(k: K, v: ProductFormValue[K]) => setP((x) => ({ ...x, [k]: v }));
  const setVar = (i: number, patch: Partial<VariantInput>) => setP((x) => ({ ...x, variants: x.variants.map((v, j) => (j === i ? { ...v, ...patch } : v)) }));
  const moveVar = (i: number, d: -1 | 1) =>
    setP((x) => {
      const j = i + d;
      if (j < 0 || j >= x.variants.length) return x;
      const vs = [...x.variants];
      [vs[i], vs[j]] = [vs[j]!, vs[i]!];
      return { ...x, variants: vs };
    });
  const isCoffee = p.kind === 'coffee';
  const payload = JSON.stringify({ ...p, variants: p.variants.map(({ key: _k, ...v }) => v) });

  const runAi = () =>
    startAi(async () => {
      const r = await aiProductCopy({ name: p.name, kind: p.kind, origin: p.originRegion, farm: p.originFarm, producer: p.producer, altitudeM: p.altitudeM, variety: p.variety, process: p.process, roast: p.roastLevel, profile: p.profile, notes: p.tastingNotes, methods: p.brewMethods, current: { subtitle: p.subtitle, description: p.description } });
      if (!r.ok || !r.data) return void toast.error(r.message);
      const c = r.data;
      setP((x) => ({ ...x, subtitle: c.subtitle || x.subtitle, description: c.description || x.description, story: c.story || x.story, tastingNotes: c.tastingNotes?.length ? c.tastingNotes : x.tastingNotes, seoTitle: c.seoTitle || x.seoTitle, seoDescription: c.seoDescription || x.seoDescription }));
      toast.success('Textos redactados con IA ✨ — revisa antes de guardar');
    });

  const minPrice = Math.min(...p.variants.filter((v) => v.isActive !== false).map((v) => Number(v.priceCop) || 0));
  return (
    <form action={action} className="grid gap-5 xl:grid-cols-12">
      <input type="hidden" name="payload" value={payload} />
      <div className="space-y-5 xl:col-span-8">
        {state.errors && Object.keys(state.errors).length ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            <strong>Revisa {Object.keys(state.errors).length} campo(s):</strong> {Object.values(state.errors).flat().slice(0, 3).join(' · ')}
          </div>
        ) : null}
        <Section title="Información general" description="Lo esencial que ve el cliente en la tienda y la app">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre" name="name" errors={e} className="sm:col-span-2">
              <input
                value={p.name}
                onChange={(ev) => {
                  set('name', ev.target.value);
                  if (!slugTouched) set('slug', slugify(ev.target.value));
                }}
                className={cn(inputCls, 'text-base font-medium')}
                placeholder="Travesía Caicedo"
              />
            </Field>
            <Field label="Slug (URL)" name="slug" errors={e} hint={`cafetravesia.co/tienda/${p.slug || '…'}`}>
              <input value={p.slug} onChange={(ev) => { setSlugTouched(true); set('slug', ev.target.value.toLowerCase()); }} className={cn(inputCls, 'font-mono text-[0.82rem]')} />
            </Field>
            <Field label="Tipo" name="kind" errors={e}>
              <select value={p.kind} onChange={(ev) => set('kind', ev.target.value as ProductFormValue['kind'])} className={selectCls}>
                {PRODUCT_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {PRODUCT_KIND_LABEL[k]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Subtítulo" name="subtitle" errors={e} className="sm:col-span-2" counter={{ value: (p.subtitle ?? '').length, max: 240 }}>
              <input value={p.subtitle ?? ''} onChange={(ev) => set('subtitle', ev.target.value)} className={inputCls} placeholder="Nuestro origen · Caicedo, Antioquia" />
            </Field>
            <Field label="Categoría" name="category" errors={e}>
              <input value={p.category ?? ''} onChange={(ev) => set('category', ev.target.value)} className={inputCls} placeholder="Origen único, Edición limitada…" />
            </Field>
            <Field label="Etiquetas (badges)" name="badges" errors={e}>
              <ChipsInput value={p.badges ?? []} onChange={(v) => set('badges', v)} suggestions={BADGE_SUGGESTIONS} max={8} />
            </Field>
          </div>
        </Section>

        <Section
          title="Descripción e historia"
          description="Markdown con vista previa · la historia de origen aparece en la ficha editorial"
          actions={
            <button type="button" onClick={runAi} disabled={aiPending || !p.name} className={btn.ai}>
              {aiPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4 text-ambar-700" />} Redactar con IA
            </button>
          }
        >
          <Field label="Descripción" name="description" errors={e}>
            <MarkdownField value={p.description ?? ''} onChange={(v) => set('description', v)} rows={7} />
          </Field>
          <Field label="Historia de origen" name="story" errors={e}>
            <MarkdownField value={p.story ?? ''} onChange={(v) => set('story', v)} rows={6} />
          </Field>
        </Section>

        {isCoffee ? (
          <Section title="Origen y perfil sensorial" description="Datos de finca y barras de perfil (1–10), como en la ficha de la tienda">
            <div className="grid gap-4 sm:grid-cols-3">
              {(
                [
                  ['originRegion', 'Región de origen', 'Caicedo, Antioquia'],
                  ['originFarm', 'Finca', 'Finca La Cima'],
                  ['producer', 'Productor', 'Familia aliada'],
                  ['variety', 'Variedad', 'Castillo y Caturra'],
                  ['process', 'Proceso', 'Lavado'],
                  ['roastLevel', 'Nivel de tueste', 'Medio'],
                ] as const
              ).map(([k, l, ph]) => (
                <Field key={k} label={l} name={k} errors={e}>
                  <input value={(p[k] as string | null) ?? ''} onChange={(ev) => set(k, ev.target.value)} className={inputCls} placeholder={ph} />
                </Field>
              ))}
              <Field label="Altitud (msnm)" name="altitudeM" errors={e}>
                <input type="number" value={p.altitudeM ?? ''} onChange={(ev) => set('altitudeM', ev.target.value === '' ? null : Number(ev.target.value))} className={inputCls} placeholder="1900" />
              </Field>
            </div>
            <div className="grid gap-6 rounded-xl bg-crema/50 p-4 lg:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-noche">Perfil sensorial</p>
                  <Switch checked={Boolean(p.profile)} onChange={(v) => set('profile', v ? (p.profile ?? DEFAULT_PROFILE) : null)} label="Mostrar" />
                </div>
                {p.profile
                  ? (Object.keys(DEFAULT_PROFILE) as (keyof Profile)[]).map((k) => (
                      <label key={k} className="block">
                        <span className="mb-1 flex justify-between text-xs text-noche/80">
                          {PROFILE_LABELS[k]} <strong className="tabular-nums">{p.profile![k]}/10</strong>
                        </span>
                        <input type="range" min={1} max={10} value={p.profile![k]} onChange={(ev) => set('profile', { ...p.profile!, [k]: Number(ev.target.value) })} className="w-full accent-ambar" />
                      </label>
                    ))
                  : <p className="text-xs text-gris">Sin perfil (no se muestra en la ficha).</p>}
              </div>
              <div className="rounded-xl p-4" style={{ background: p.themeColor || '#111A31' }}>
                <p className="mb-3 text-[0.65rem] font-semibold tracking-[0.18em] uppercase" style={{ color: p.accentColor || '#EB9A37' }}>
                  Vista previa en la ficha
                </p>
                {p.profile ? (
                  <ul className="space-y-2.5">
                    {(Object.keys(DEFAULT_PROFILE) as (keyof Profile)[]).map((k) => (
                      <li key={k}>
                        <span className="mb-1 block text-xs" style={{ color: isLight(p.themeColor) ? '#111A31' : '#F8F3EA' }}>{PROFILE_LABELS[k]}</span>
                        <span className="flex gap-1">
                          {Array.from({ length: 10 }, (_, i) => (
                            <span key={i} className="h-1.5 flex-1 rounded-full transition-colors" style={{ background: i < p.profile![k] ? p.accentColor || '#EB9A37' : isLight(p.themeColor) ? 'rgba(17,26,49,.15)' : 'rgba(255,255,255,.18)' }} />
                          ))}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {p.tastingNotes?.length ? <p className="mt-4 font-display text-lg italic" style={{ color: isLight(p.themeColor) ? '#111A31' : '#F8F3EA' }}>{p.tastingNotes.join(' · ')}</p> : null}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Notas de cata" name="tastingNotes" errors={e}>
                <ChipsInput value={p.tastingNotes ?? []} onChange={(v) => set('tastingNotes', v)} suggestions={NOTE_SUGGESTIONS} max={12} />
              </Field>
              <Field label="Métodos recomendados" name="brewMethods" errors={e}>
                <ChipsInput value={p.brewMethods ?? []} onChange={(v) => set('brewMethods', v)} suggestions={METHOD_SUGGESTIONS} max={12} />
              </Field>
            </div>
          </Section>
        ) : null}

        <Section title="Imágenes" description="Imagen principal y galería (se suben directo a tu hosting cPanel)">
          <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
            <div>
              <p className="mb-1 text-[0.8rem] font-medium text-noche/80">Principal</p>
              <MediaPicker value={p.imageUrl} onChange={(v) => set('imageUrl', v)} folder="productos" aspect="aspect-[3/4]" />
              {e?.imageUrl ? <p className="mt-1 text-xs text-cereza">{e.imageUrl[0]}</p> : null}
            </div>
            <div>
              <p className="mb-1 text-[0.8rem] font-medium text-noche/80">Galería ({p.gallery?.length ?? 0})</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {(p.gallery ?? []).map((g, i) => (
                  <div key={`${g}-${i}`} className="group relative aspect-square overflow-hidden rounded-lg border border-noche/10 bg-crema">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={g} alt="" className="size-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-noche/70 p-1 opacity-0 transition group-hover:opacity-100">
                      <button type="button" aria-label="Mover a la izquierda" onClick={() => { const g2 = [...(p.gallery ?? [])]; if (i > 0) [g2[i - 1], g2[i]] = [g2[i]!, g2[i - 1]!]; set('gallery', g2); }} className="rounded bg-white/90 p-0.5"><ArrowUp className="size-3 -rotate-90" /></button>
                      <button type="button" aria-label="Quitar" onClick={() => set('gallery', (p.gallery ?? []).filter((_, j) => j !== i))} className="rounded bg-white/90 p-0.5 text-cereza"><X className="size-3" /></button>
                    </div>
                  </div>
                ))}
                <button type="button" onClick={() => setGalleryOpen(true)} className="grid aspect-square place-items-center rounded-lg border border-dashed border-noche/20 text-gris hover:border-noche/40 hover:text-noche">
                  <Plus className="size-5" />
                </button>
              </div>
              <MediaDialog open={galleryOpen} onClose={() => setGalleryOpen(false)} folder="productos" onPick={(u) => { set('gallery', [...(p.gallery ?? []), u]); setGalleryOpen(false); }} />
            </div>
          </div>
        </Section>

        <Section
          title="Variantes, precios e inventario"
          description="Peso y molienda para café; fecha para catas y tours. Las variantes con pedidos se desactivan en lugar de borrarse."
          actions={
            <button type="button" className={cn(btn.secondary, btn.sm)} onClick={() => setP((x) => ({ ...x, variants: [...x.variants, { key: crypto.randomUUID(), id: null, name: '', weightG: isCoffee ? 340 : null, grind: isCoffee ? 'grano' : null, priceCop: 0, compareAtCop: null, stock: 0, sku: '', eventAt: '', isActive: true }] }))}>
              <Plus className="size-3.5" /> Variante
            </button>
          }
        >
          {e?.variants ? <p className="text-xs text-cereza">{e.variants[0]}</p> : null}
          <div className="space-y-2.5">
            {p.variants.map((v, i) => {
              const err = (f: string) => e?.[`variants.${i}.${f}`]?.[0];
              return (
                <div key={v.key} className={cn('rounded-xl border p-3 transition', v.isActive === false ? 'border-dashed border-noche/15 bg-crema/30 opacity-70' : 'border-noche/10 bg-white')}>
                  <div className="flex items-start gap-2">
                    <div className="flex flex-col items-center gap-0.5 pt-6 text-gris">
                      <button type="button" aria-label="Subir" onClick={() => moveVar(i, -1)} className="hover:text-noche"><ArrowUp className="size-3.5" /></button>
                      <GripVertical className="size-3.5 opacity-40" />
                      <button type="button" aria-label="Bajar" onClick={() => moveVar(i, 1)} className="hover:text-noche"><ArrowDown className="size-3.5" /></button>
                    </div>
                    <div className="grid flex-1 grid-cols-2 gap-2.5 md:grid-cols-12">
                      <label className="col-span-2 md:col-span-4">
                        <span className="mb-1 block text-[0.68rem] font-medium text-gris">Nombre</span>
                        <input value={v.name} onChange={(ev) => setVar(i, { name: ev.target.value })} className={cn(inputCls, err('name') && 'border-cereza')} placeholder="340 g · En grano" />
                      </label>
                      {isCoffee ? (
                        <>
                          <label className="md:col-span-2">
                            <span className="mb-1 block text-[0.68rem] font-medium text-gris">Peso (g)</span>
                            <input type="number" value={v.weightG ?? ''} onChange={(ev) => setVar(i, { weightG: ev.target.value === '' ? null : Number(ev.target.value) })} className={inputCls} />
                          </label>
                          <label className="md:col-span-2">
                            <span className="mb-1 block text-[0.68rem] font-medium text-gris">Molienda</span>
                            <select value={v.grind ?? ''} onChange={(ev) => setVar(i, { grind: ev.target.value || null })} className={selectCls}>
                              <option value="">—</option>
                              {Object.keys(GRIND_LABEL).map((g) => (
                                <option key={g} value={g}>{g}</option>
                              ))}
                            </select>
                          </label>
                        </>
                      ) : (
                        <label className="col-span-2 md:col-span-4">
                          <span className="mb-1 block text-[0.68rem] font-medium text-gris">Fecha del evento (Bogotá)</span>
                          <input type="datetime-local" value={v.eventAt ?? ''} onChange={(ev) => setVar(i, { eventAt: ev.target.value })} className={inputCls} />
                        </label>
                      )}
                      <label className="md:col-span-2">
                        <span className="mb-1 block text-[0.68rem] font-medium text-gris">SKU</span>
                        <input value={v.sku ?? ''} onChange={(ev) => setVar(i, { sku: ev.target.value.toUpperCase() })} className={cn(inputCls, 'font-mono text-xs')} />
                      </label>
                      <label className="md:col-span-2">
                        <span className="mb-1 block text-[0.68rem] font-medium text-gris">Stock</span>
                        <input type="number" min={0} value={v.stock} onChange={(ev) => setVar(i, { stock: Number(ev.target.value) })} className={cn(inputCls, Number(v.stock) <= 5 && 'border-amber-300 bg-amber-50')} />
                      </label>
                      <label className="md:col-span-3">
                        <span className="mb-1 block text-[0.68rem] font-medium text-gris">Precio (COP)</span>
                        <input type="number" min={0} step={100} value={v.priceCop} onChange={(ev) => setVar(i, { priceCop: Number(ev.target.value) })} className={cn(inputCls, err('priceCop') && 'border-cereza')} />
                        <span className="mt-0.5 block text-[0.65rem] text-gris">{formatCOP(Number(v.priceCop))}</span>
                      </label>
                      <label className="md:col-span-3">
                        <span className="mb-1 block text-[0.68rem] font-medium text-gris">Precio antes (opcional)</span>
                        <input type="number" min={0} step={100} value={v.compareAtCop ?? ''} onChange={(ev) => setVar(i, { compareAtCop: ev.target.value === '' ? null : Number(ev.target.value) })} className={cn(inputCls, err('compareAtCop') && 'border-cereza')} />
                        {err('compareAtCop') ? <span className="mt-0.5 block text-[0.65rem] text-cereza">{err('compareAtCop')}</span> : v.compareAtCop ? <span className="mt-0.5 block text-[0.65rem] text-montana">−{Math.round((1 - Number(v.priceCop) / Number(v.compareAtCop)) * 100)} %</span> : null}
                      </label>
                      {isCoffee ? null : <span className="hidden md:col-span-2 md:block" />}
                      <div className="col-span-2 flex items-end justify-between gap-2 md:col-span-6 md:justify-end">
                        <Switch checked={v.isActive !== false} onChange={(val) => setVar(i, { isActive: val })} label="Activa" />
                        <button type="button" onClick={() => setP((x) => ({ ...x, variants: x.variants.filter((_, j) => j !== i) }))} className={cn(btn.ghost, btn.sm, 'text-cereza')} disabled={p.variants.length <= 1}>
                          <Trash2 className="size-3.5" /> Quitar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        <Section title="SEO" description="Cómo aparece en Google">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <Field label="Título SEO" name="seoTitle" errors={e} counter={{ value: (p.seoTitle ?? '').length, max: 60 }}>
                <input value={p.seoTitle ?? ''} onChange={(ev) => set('seoTitle', ev.target.value)} className={inputCls} placeholder={`${p.name} | Café Travesía`} />
              </Field>
              <Field label="Descripción SEO" name="seoDescription" errors={e} counter={{ value: (p.seoDescription ?? '').length, max: 155 }}>
                <textarea rows={3} value={p.seoDescription ?? ''} onChange={(ev) => set('seoDescription', ev.target.value)} className={inputCls} />
              </Field>
            </div>
            <GooglePreview title={p.seoTitle || `${p.name} | Café Travesía`} description={p.seoDescription || p.subtitle || ''} path={`/tienda/${p.slug}`} />
          </div>
        </Section>
      </div>

      {/* Columna lateral */}
      <aside className="space-y-5 xl:col-span-4">
        <div className="space-y-5 xl:sticky xl:top-20">
          <Section title="Publicación">
            <div className="space-y-3">
              <Switch checked={p.isActive} onChange={(v) => set('isActive', v)} label="Activo" description="Visible en la tienda, la app y la API" />
              <Switch checked={p.isFeatured} onChange={(v) => set('isFeatured', v)} label="Destacado" description="Aparece en la home y en recomendaciones" />
              <Switch checked={p.isSeasonal} onChange={(v) => set('isSeasonal', v)} label="Edición de temporada" />
              <Switch checked={p.subscriptionEligible} onChange={(v) => set('subscriptionEligible', v)} label="Elegible para suscripción" />
              <Field label="Orden en listados" name="sortOrder" errors={e} hint="Menor = primero">
                <input type="number" value={p.sortOrder} onChange={(ev) => set('sortOrder', Number(ev.target.value))} className={cn(inputCls, 'w-28')} />
              </Field>
            </div>
            <div className="flex flex-col gap-2 border-t border-noche/[0.06] pt-4">
              <SubmitButton className="w-full" disabled={demo && false}>{isNew ? 'Crear producto' : 'Guardar cambios'}</SubmitButton>
              {demo ? <p className="text-center text-[0.7rem] text-gris">Modo demo: puedes editar todo, pero no se guardará.</p> : null}
              {!isNew ? (
                <div className="flex flex-wrap gap-2">
                  <a href={`/tienda/${initial.slug}`} target="_blank" rel="noreferrer" className={cn(btn.secondary, btn.sm, 'flex-1')}>
                    <ExternalLink className="size-3.5" /> Ver en tienda
                  </a>
                  <button type="button" onClick={async () => { const r = await duplicateProduct(initial.id!); if (r && !r.ok) (r.demo ? toast.info : toast.error)(r.message); }} className={cn(btn.secondary, btn.sm, 'flex-1')}>
                    <Copy className="size-3.5" /> Duplicar
                  </button>
                  {isAdmin ? (
                    <ConfirmButton className={cn(btn.danger, btn.sm, 'w-full')} title="¿Eliminar producto?" description="Si tiene pedidos se desactiva para conservar el historial." confirmLabel="Eliminar" onConfirm={async () => { const r = await deleteProduct(initial.id!); if (r && !r.ok) (r.demo ? toast.info : toast.error)(r.message); }}>
                      <Trash2 className="size-3.5" /> Eliminar
                    </ConfirmButton>
                  ) : null}
                </div>
              ) : null}
            </div>
          </Section>
          <Section title="Color de origen" description="Fondo de la ficha y color de la bolsa (como Pergamino)">
            <div className="grid grid-cols-2 gap-3">
              <ColorField label="Color principal" value={p.themeColor ?? ''} onChange={(v) => set('themeColor', v)} />
              <ColorField label="Acento" value={p.accentColor ?? ''} onChange={(v) => set('accentColor', v)} />
            </div>
            <Swatches onPick={(c) => set('themeColor', c)} />
            {e?.themeColor || e?.accentColor ? <p className="text-xs text-cereza">{(e.themeColor ?? e.accentColor)![0]}</p> : null}
            <div className="relative overflow-hidden rounded-2xl p-6" style={{ background: `linear-gradient(160deg, ${p.themeColor || '#111A31'} 0%, ${p.themeColor || '#111A31'}dd 100%)` }}>
              <div aria-hidden className="absolute inset-0 bg-andino opacity-10" />
              <div className="relative mx-auto w-40">
                <CoffeeBag color={p.themeColor} accent={p.accentColor} name={p.name || 'Nuevo café'} origin={p.originRegion} />
              </div>
              <div className="relative mt-3 text-center" style={{ color: isLight(p.themeColor) ? '#111A31' : '#F8F3EA' }}>
                <p className="font-display text-lg">{p.name || 'Nombre del producto'}</p>
                <p className="text-xs opacity-75">{p.subtitle || PRODUCT_KIND_LABEL[p.kind]}</p>
                <p className="mt-1 text-sm font-semibold">{Number.isFinite(minPrice) ? `Desde ${formatCOP(minPrice)}` : ''}</p>
              </div>
            </div>
          </Section>
          {!isNew ? (
            <p className="text-center text-xs text-gris">
              <Link href="/admin/productos/inventario" className="hover:underline">Inventario rápido de todos los productos</Link>
            </p>
          ) : null}
        </div>
      </aside>
    </form>
  );
}

function isLight(hex: string | null | undefined) {
  const h = (hex ?? '#111A31').replace('#', '');
  if (h.length < 6) return false;
  const n = parseInt(h.slice(0, 6), 16);
  return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 165;
}
