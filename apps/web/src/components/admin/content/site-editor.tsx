'use client';
import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, Check, ExternalLink, Loader2, Plus, RotateCcw, Sparkles, Trash2, X } from 'lucide-react';
import { BrandIcon } from '@/components/brand/logo';
import { cn } from '@/lib/cn';
import { aiImproveSection, resetSiteSection, saveSiteSection } from '@/lib/admin/actions/content';
import { BRAND_ICONS, SITE_KEY_LIST, SITE_META, SITE_SCHEMAS, type SiteKey } from '@/lib/admin/site-schemas';
import { zodErrorsClient } from '@/lib/admin/zod-client';
import { ConfirmButton, Field, Switch } from '../client-ui';
import { ColorField, GooglePreview, Swatches } from '../forms';
import { MediaPicker } from '../media/media-picker';
import { Badge, btn, inputCls, relTime, selectCls } from '../ui';

type Json = Record<string, unknown>;
type SectionData = { key: SiteKey; content: Json; updatedAt: string | null; updatedBy: string | null; custom: boolean };
type ProductOpt = { slug: string; name: string; themeColor: string | null };

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
function setIn(obj: Json, path: (string | number)[], value: unknown): Json {
  const out = clone(obj);
  let cur: Record<string | number, unknown> = out;
  path.slice(0, -1).forEach((p) => {
    cur = cur[p] as Record<string | number, unknown>;
  });
  cur[path[path.length - 1]!] = value;
  return out;
}

export function SiteEditor({ sections, products, active, defaults }: { sections: SectionData[]; products: ProductOpt[]; active: SiteKey; defaults: Json }) {
  const router = useRouter();
  const current = sections.find((s) => s.key === active) ?? sections[0]!;
  const [draft, setDraft] = useState<Json>(() => clone(current.content));
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [proposal, setProposal] = useState<Json | null>(null);
  const [instructions, setInstructions] = useState('');
  const [pending, start] = useTransition();
  const [aiPending, startAi] = useTransition();
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(current.content), [draft, current.content]);
  const set = (path: (string | number)[], v: unknown) => setDraft((d) => setIn(d, path, v));
  const e = errors;
  const k = current.key;
  const meta = SITE_META[k];

  const save = () => {
    const r = SITE_SCHEMAS[k].safeParse(draft);
    if (!r.success) {
      setErrors(zodErrorsClient(r.error));
      toast.error('Revisa los campos marcados');
      return;
    }
    setErrors({});
    start(async () => {
      const s = await saveSiteSection(k, r.data);
      if (s.ok) {
        toast.success(s.message);
        router.refresh();
      } else (s.demo ? toast.info : toast.error)(s.message);
    });
  };
  const improve = () =>
    startAi(async () => {
      const s = await aiImproveSection(k, draft, instructions);
      if (s.ok && s.data) setProposal(s.data);
      else toast.error(s.message);
    });

  const T = ({ label, path, max, ph, area, rows = 3 }: { label: string; path: (string | number)[]; max?: number; ph?: string; area?: boolean; rows?: number }) => {
    const name = path.join('.');
    const val = String(path.reduce<unknown>((o, p) => (o as Record<string | number, unknown>)?.[p], draft) ?? '');
    return (
      <Field label={label} name={name} errors={e} counter={max ? { value: val.length, max } : undefined}>
        {area ? <textarea rows={rows} value={val} onChange={(ev) => set(path, ev.target.value)} className={inputCls} placeholder={ph} /> : <input value={val} onChange={(ev) => set(path, ev.target.value)} className={inputCls} placeholder={ph} />}
      </Field>
    );
  };
  const Img = ({ label, path, folder = 'sitio', aspect }: { label: string; path: string[]; folder?: string; aspect?: string }) => (
    <div>
      <p className="mb-1 text-[0.8rem] font-medium text-noche/80">{label}</p>
      <MediaPicker value={String(draft[path[0]!] ?? '') || null} onChange={(u) => set(path, u ?? '')} folder={folder} aspect={aspect} />
      {e[path.join('.')] ? <p className="mt-1 text-xs text-cereza">{e[path.join('.')]![0]}</p> : null}
    </div>
  );
  const rows = (path: string) => (draft[path] as Json[]) ?? [];
  const RowTools = ({ path, i, n }: { path: string; i: number; n: number }) => (
    <div className="flex shrink-0 flex-col gap-1">
      <button type="button" aria-label="Subir" disabled={i === 0} onClick={() => { const a = [...rows(path)]; [a[i - 1], a[i]] = [a[i]!, a[i - 1]!]; set([path], a); }} className="rounded p-1 text-gris hover:bg-noche/5 hover:text-noche disabled:opacity-30"><ArrowUp className="size-3.5" /></button>
      <button type="button" aria-label="Bajar" disabled={i === n - 1} onClick={() => { const a = [...rows(path)]; [a[i + 1], a[i]] = [a[i]!, a[i + 1]!]; set([path], a); }} className="rounded p-1 text-gris hover:bg-noche/5 hover:text-noche disabled:opacity-30"><ArrowDown className="size-3.5" /></button>
      <button type="button" aria-label="Quitar" onClick={() => set([path], rows(path).filter((_, j) => j !== i))} className="rounded p-1 text-cereza/70 hover:bg-rose-50 hover:text-cereza"><Trash2 className="size-3.5" /></button>
    </div>
  );

  const editor = () => {
    switch (k) {
      case 'home.hero': {
        const d = draft as { eyebrow: string; title: string; subtitle: string; posterUrl: string; imageUrl: string; primaryCta?: { label: string }; secondaryCta?: { label: string } };
        return (
          <>
            <div className="relative isolate overflow-hidden rounded-2xl bg-noche p-8 text-crema">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {d.posterUrl || d.imageUrl ? <img src={d.posterUrl || d.imageUrl} alt="" className="absolute inset-0 -z-10 size-full object-cover opacity-50" /> : null}
              <div className="absolute inset-0 -z-10 bg-gradient-to-r from-noche via-noche/70 to-transparent" />
              <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-ambar-300 uppercase">{d.eyebrow}</p>
              <p className="mt-2 max-w-md font-display text-3xl leading-tight">{d.title}</p>
              <p className="mt-2 max-w-md text-sm text-crema/80">{d.subtitle}</p>
              <div className="mt-4 flex gap-2">
                <span className="rounded-full bg-ambar px-4 py-2 text-xs font-semibold text-noche">{d.primaryCta?.label}</span>
                <span className="rounded-full border border-crema/40 px-4 py-2 text-xs font-semibold">{d.secondaryCta?.label}</span>
              </div>
              <p className="absolute top-3 right-3 rounded bg-black/30 px-2 py-0.5 text-[0.6rem]">Vista previa</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {T({ label: 'Antetítulo', path: ['eyebrow'], max: 120 })}
              {T({ label: 'Título', path: ['title'], max: 120 })}
              <div className="sm:col-span-2">{T({ label: 'Subtítulo', path: ['subtitle'], max: 300, area: true, rows: 2 })}</div>
              {T({ label: 'Botón principal · texto', path: ['primaryCta', 'label'], max: 40 })}
              {T({ label: 'Botón principal · enlace', path: ['primaryCta', 'href'], ph: '/tienda' })}
              {T({ label: 'Botón secundario · texto', path: ['secondaryCta', 'label'], max: 40 })}
              {T({ label: 'Botón secundario · enlace', path: ['secondaryCta', 'href'], ph: '/suscripciones' })}
              <div className="sm:col-span-2">{T({ label: 'Video (MP4/HLS, vertical u horizontal)', path: ['videoUrl'], ph: '/brand/video/caicedo-origen.mp4' })}</div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {Img({ label: 'Póster del video', path: ['posterUrl'], aspect: 'aspect-video' })}
              {Img({ label: 'Imagen (respaldo sin video)', path: ['imageUrl'], aspect: 'aspect-video' })}
            </div>
          </>
        );
      }
      case 'home.seasonal': {
        const d = draft as { enabled: boolean; eyebrow: string; title: string; subtitle: string; productSlug: string; color: string };
        const prod = products.find((p) => p.slug === d.productSlug);
        return (
          <>
            <div className="rounded-2xl p-8" style={{ background: d.color }}>
              <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-ambar-300 uppercase">{d.eyebrow}</p>
              <p className="mt-2 font-display text-3xl text-crema">{d.title}</p>
              <p className="mt-1 text-sm text-crema/80">{d.subtitle}</p>
              <p className="mt-3 text-xs text-crema/70">Enlaza a: /tienda/{d.productSlug} {prod ? `· ${prod.name}` : '· (producto no encontrado)'}</p>
            </div>
            <Switch checked={d.enabled} onChange={(v) => set(['enabled'], v)} label="Mostrar en la home" />
            <div className="grid gap-4 sm:grid-cols-2">
              {T({ label: 'Antetítulo', path: ['eyebrow'], max: 60 })}
              {T({ label: 'Título', path: ['title'], max: 120 })}
              <div className="sm:col-span-2">{T({ label: 'Subtítulo', path: ['subtitle'], max: 200 })}</div>
              <Field label="Producto" name="productSlug" errors={e}>
                <select value={d.productSlug} onChange={(ev) => { set(['productSlug'], ev.target.value); const p = products.find((x) => x.slug === ev.target.value); if (p?.themeColor) set(['color'], p.themeColor); }} className={selectCls}>
                  {products.map((p) => (
                    <option key={p.slug} value={p.slug}>{p.name}</option>
                  ))}
                </select>
              </Field>
              <div>
                <ColorField label="Color de fondo" value={d.color} onChange={(v) => set(['color'], v)} />
                <div className="mt-2"><Swatches onPick={(c) => set(['color'], c)} /></div>
                {e.color ? <p className="mt-1 text-xs text-cereza">{e.color[0]}</p> : null}
              </div>
            </div>
          </>
        );
      }
      case 'home.banner': {
        const d = draft as { enabled: boolean; text: string; href: string };
        return (
          <>
            <div className="rounded-lg bg-noche px-4 py-2.5 text-center text-xs font-medium text-crema">{d.text}</div>
            <Switch checked={d.enabled} onChange={(v) => set(['enabled'], v)} label="Mostrar la franja" />
            {T({ label: 'Texto', path: ['text'], max: 200 })}
            {T({ label: 'Enlace (opcional)', path: ['href'], ph: '/tienda' })}
          </>
        );
      }
      case 'home.story':
        return (
          <>
            {T({ label: 'Título', path: ['title'], max: 120 })}
            {T({ label: 'Texto', path: ['body'], max: 800, area: true, rows: 4 })}
            <ListHeader title="Pilares" onAdd={() => set(['pillars'], [...rows('pillars'), { icon: 'granos', title: '', text: '' }])} />
            {rows('pillars').map((p, i, a) => (
              <div key={i} className="flex gap-3 rounded-xl border border-noche/10 p-3">
                <div className="flex flex-col items-center gap-2">
                  <span className="grid size-14 place-items-center rounded-xl bg-crema text-noche"><BrandIcon name={String(p.icon)} className="size-9" /></span>
                  <select value={String(p.icon)} onChange={(ev) => set(['pillars', i, 'icon'], ev.target.value)} className={cn(selectCls, 'w-28 text-xs')}>
                    {BRAND_ICONS.map((ic) => <option key={ic}>{ic}</option>)}
                  </select>
                </div>
                <div className="grid flex-1 gap-2">
                  {T({ label: 'Título', path: ['pillars', i, 'title'], max: 60 })}
                  {T({ label: 'Texto', path: ['pillars', i, 'text'], max: 200, area: true, rows: 2 })}
                </div>
                <RowTools path="pillars" i={i} n={a.length} />
              </div>
            ))}
          </>
        );
      case 'about':
        return (
          <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
            <div className="space-y-4">
              {T({ label: 'Título', path: ['title'], max: 120 })}
              {T({ label: 'Introducción', path: ['intro'], max: 600, area: true, rows: 3 })}
              {T({ label: 'Texto', path: ['body'], max: 3000, area: true, rows: 6 })}
            </div>
            {Img({ label: 'Imagen', path: ['imageUrl'], aspect: 'aspect-[3/4]' })}
          </div>
        );
      case 'impact':
        return (
          <>
            {T({ label: 'Título', path: ['title'], max: 160 })}
            {T({ label: 'Introducción', path: ['intro'], max: 600, area: true, rows: 2 })}
            <ListHeader title="Cifras" onAdd={() => set(['stats'], [...rows('stats'), { value: '', label: '' }])} />
            <div className="grid gap-2 sm:grid-cols-2">
              {rows('stats').map((s, i, a) => (
                <div key={i} className="flex gap-2 rounded-xl border border-noche/10 bg-crema/30 p-3">
                  <div className="grid flex-1 grid-cols-[6rem_1fr] gap-2">
                    {T({ label: 'Cifra', path: ['stats', i, 'value'], ph: '+30 %' })}
                    {T({ label: 'Descripción', path: ['stats', i, 'label'] })}
                    <p className="col-span-2 font-display text-2xl text-noche">{String(s.value || '—')}</p>
                  </div>
                  <RowTools path="stats" i={i} n={a.length} />
                </div>
              ))}
            </div>
            <ListHeader title="Pilares" onAdd={() => set(['pillars'], [...rows('pillars'), { title: '', text: '' }])} />
            {rows('pillars').map((_, i, a) => (
              <div key={i} className="flex gap-2 rounded-xl border border-noche/10 p-3">
                <div className="grid flex-1 gap-2 sm:grid-cols-[14rem_1fr]">
                  {T({ label: 'Título', path: ['pillars', i, 'title'], max: 60 })}
                  {T({ label: 'Texto', path: ['pillars', i, 'text'], max: 300 })}
                </div>
                <RowTools path="pillars" i={i} n={a.length} />
              </div>
            ))}
          </>
        );
      case 'faq':
        return (
          <>
            <ListHeader title={`Preguntas (${rows('items').length})`} onAdd={() => set(['items'], [...rows('items'), { q: '', a: '' }])} />
            {rows('items').map((_, i, a) => (
              <div key={i} className="flex gap-2 rounded-xl border border-noche/10 p-3">
                <span className="mt-7 grid size-6 shrink-0 place-items-center rounded-full bg-noche text-[0.65rem] font-bold text-crema">{i + 1}</span>
                <div className="grid flex-1 gap-2">
                  {T({ label: 'Pregunta', path: ['items', i, 'q'], max: 200 })}
                  {T({ label: 'Respuesta', path: ['items', i, 'a'], max: 1500, area: true, rows: 2 })}
                </div>
                <RowTools path="items" i={i} n={a.length} />
              </div>
            ))}
          </>
        );
      case 'contact':
        return (
          <div className="grid gap-4 sm:grid-cols-2">
            {T({ label: 'Correo', path: ['email'] })}
            {T({ label: 'Teléfono', path: ['phone'] })}
            {T({ label: 'WhatsApp (con indicativo, solo números)', path: ['whatsapp'], ph: '573001234567' })}
            {T({ label: 'Horario', path: ['hours'] })}
            <div className="sm:col-span-2">{T({ label: 'Dirección', path: ['address'] })}</div>
            {T({ label: 'Instagram', path: ['instagram'] })}
            {T({ label: 'Facebook', path: ['facebook'] })}
            {T({ label: 'TikTok', path: ['tiktok'] })}
          </div>
        );
      case 'app_links':
        return (
          <div className="grid gap-4 sm:grid-cols-2">
            {T({ label: 'App Store (iOS)', path: ['ios'], ph: 'https://apps.apple.com/co/app/…' })}
            {T({ label: 'Google Play (Android)', path: ['android'], ph: 'https://play.google.com/store/apps/details?id=…' })}
            <p className="text-xs text-gris sm:col-span-2">Si están vacíos, el sitio oculta los botones de descarga.</p>
          </div>
        );
      case 'seo': {
        const d = draft as { title: string; description: string; ogImage: string };
        return (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-4">
              {T({ label: 'Título del sitio', path: ['title'], max: 60 })}
              {T({ label: 'Descripción', path: ['description'], max: 155, area: true, rows: 3 })}
              {Img({ label: 'Imagen para compartir (Open Graph, 1200×630)', path: ['ogImage'], aspect: 'aspect-[1200/630]' })}
            </div>
            <div className="space-y-3">
              <GooglePreview title={d.title} description={d.description} path="/" />
              <div className="overflow-hidden rounded-xl border border-noche/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {d.ogImage ? <img src={d.ogImage} alt="" className="aspect-[1200/630] w-full object-cover" /> : <div className="aspect-[1200/630] bg-crema" />}
                <div className="bg-[#f0f2f5] p-3 text-xs">
                  <p className="text-[#65676b] uppercase">cafetravesia.co</p>
                  <p className="font-semibold text-[#050505]">{d.title}</p>
                </div>
              </div>
            </div>
          </div>
        );
      }
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
      <nav aria-label="Secciones" className="space-y-1 lg:sticky lg:top-20 lg:self-start">
        {SITE_KEY_LIST.map((key) => {
          const s = sections.find((x) => x.key === key);
          return (
            <Link key={key} href={`/admin/contenido?k=${key}`} scroll={false} className={cn('block rounded-lg border px-3 py-2.5 transition', key === k ? 'border-noche bg-noche text-crema shadow' : 'border-transparent hover:border-noche/10 hover:bg-white')}>
              <span className="flex items-center justify-between gap-2 text-sm font-medium">
                {SITE_META[key].label}
                {s?.custom ? <span className={cn('size-1.5 rounded-full', key === k ? 'bg-ambar-300' : 'bg-ambar')} title="Personalizado" /> : null}
              </span>
              <span className={cn('block text-[0.7rem]', key === k ? 'text-crema/60' : 'text-gris')}>{SITE_META[key].description}</span>
            </Link>
          );
        })}
      </nav>
      <div className="min-w-0 space-y-4">
        <div className="rounded-xl border border-noche/[0.08] bg-white shadow-[0_1px_2px_rgba(17,26,49,0.04)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-noche/[0.06] px-5 py-3.5">
            <div>
              <h2 className="flex items-center gap-2 font-sans text-base font-semibold text-noche">
                {meta.label} {current.custom ? <Badge tone="ambar">Personalizado</Badge> : <Badge>Por defecto</Badge>} {dirty ? <Badge tone="warning">Sin guardar</Badge> : null}
              </h2>
              <p className="text-xs text-gris">
                Clave <code>{k}</code>
                {current.updatedAt ? ` · editado ${relTime(current.updatedAt)}${current.updatedBy ? ` por ${current.updatedBy}` : ''}` : ''}
              </p>
            </div>
            <a href={meta.path} target="_blank" rel="noreferrer" className={cn(btn.ghost, btn.sm)}>
              Ver página <ExternalLink className="size-3.5" />
            </a>
          </div>
          <div className="space-y-4 p-5">{editor()}</div>
          <div className="flex flex-wrap items-center gap-2 border-t border-noche/[0.06] bg-crema/30 px-5 py-3">
            <ConfirmButton className={cn(btn.ghost, btn.sm)} danger={false} title="¿Restablecer la sección?" description="Se borra la versión personalizada y el sitio vuelve a los textos por defecto." confirmLabel="Restablecer" onConfirm={async () => { const s = await resetSiteSection(k); if (s.ok) { toast.success(s.message); setDraft(clone(defaults)); router.refresh(); } else (s.demo ? toast.info : toast.error)(s.message); }}>
              <RotateCcw className="size-3.5" /> Restablecer
            </ConfirmButton>
            {dirty ? (
              <button type="button" className={cn(btn.ghost, btn.sm)} onClick={() => setDraft(clone(current.content))}>
                <X className="size-3.5" /> Descartar cambios
              </button>
            ) : null}
            <button type="button" onClick={save} disabled={pending || !dirty} className={cn(btn.primary, 'ml-auto')}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Guardar y publicar
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-ambar/30 bg-gradient-to-br from-ambar-100/60 to-white p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-noche">
            <Sparkles className="size-4 text-ambar-700" /> Mejorar con IA
          </p>
          <p className="mt-0.5 text-xs text-gris">Reescribe solo los textos de esta sección conservando enlaces, imágenes y estructura. Revisa la propuesta antes de aplicarla.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input value={instructions} onChange={(ev) => setInstructions(ev.target.value)} placeholder="Ej.: más cálido y paisa, menciona la cosecha nueva…" className={cn(inputCls, 'min-w-[16rem] flex-1')} />
            <button type="button" onClick={improve} disabled={aiPending} className={btn.ai}>
              {aiPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4 text-ambar-700" />} Proponer textos
            </button>
          </div>
          {proposal ? (
            <div className="mt-4 rounded-lg border border-noche/10 bg-white p-4">
              <p className="mb-2 text-xs font-semibold text-noche">Propuesta de la IA</p>
              <Diff before={draft} after={proposal} />
              <div className="mt-3 flex gap-2">
                <button type="button" className={cn(btn.primary, btn.sm)} onClick={() => { setDraft(proposal); setProposal(null); toast.success('Propuesta aplicada: guarda para publicar'); }}>
                  <Check className="size-3.5" /> Aplicar
                </button>
                <button type="button" className={cn(btn.secondary, btn.sm)} onClick={() => setProposal(null)}>Descartar</button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ListHeader({ title, onAdd }: { title: string; onAdd: () => void }) {
  return (
    <div className="flex items-center justify-between border-t border-noche/[0.06] pt-4">
      <p className="text-sm font-semibold text-noche">{title}</p>
      <button type="button" onClick={onAdd} className={cn(btn.secondary, btn.sm)}>
        <Plus className="size-3.5" /> Agregar
      </button>
    </div>
  );
}

function flatten(o: unknown, prefix = ''): Record<string, string> {
  if (o == null || typeof o !== 'object') return { [prefix]: String(o ?? '') };
  return Object.entries(o as Json).reduce<Record<string, string>>((acc, [k, v]) => ({ ...acc, ...flatten(v, prefix ? `${prefix}.${k}` : k) }), {});
}
function Diff({ before, after }: { before: Json; after: Json }) {
  const a = flatten(before);
  const b = flatten(after);
  const changed = Object.keys(b).filter((k) => a[k] !== b[k]);
  if (!changed.length) return <p className="text-xs text-gris">La IA no propuso cambios.</p>;
  return (
    <ul className="max-h-80 space-y-2 overflow-y-auto text-xs">
      {changed.map((k) => (
        <li key={k} className="rounded-md bg-crema/50 p-2">
          <p className="font-mono text-[0.65rem] text-gris">{k}</p>
          <p className="text-rose-800 line-through decoration-rose-300">{a[k]}</p>
          <p className="text-emerald-800">{b[k]}</p>
        </li>
      ))}
    </ul>
  );
}
