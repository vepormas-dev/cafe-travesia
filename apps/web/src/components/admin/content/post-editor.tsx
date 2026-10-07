'use client';
import { useActionState, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ExternalLink, Loader2, Sparkles, Trash2 } from 'lucide-react';
import { readingMinutes, slugify } from '@travesia/shared';
import { cn } from '@/lib/cn';
import { initialActionState } from '@/lib/admin/action-state';
import { aiBlogDraft, aiSeo, deletePost, savePost, type PostInput } from '@/lib/admin/actions/content';
import { ChipsInput, ConfirmButton, Field, SubmitButton, Switch, useActionToast } from '../client-ui';
import { GooglePreview, MarkdownField, Section } from '../forms';
import { MediaPicker } from '../media/media-picker';
import { btn, inputCls, selectCls } from '../ui';

const CATEGORIES = ['Cultura cafetera', 'Origen', 'Preparación', 'Sostenibilidad', 'Noticias', 'Recetas'];

export function PostEditor({ initial, isNew }: { initial: PostInput; isNew: boolean }) {
  const router = useRouter();
  const [p, setP] = useState(initial);
  const [state, action] = useActionState(savePost, initialActionState);
  const [topic, setTopic] = useState('');
  const [keywords, setKeywords] = useState('');
  const [ai, startAi] = useTransition();
  useActionToast(state, (s) => {
    const id = (s.data as { id?: string } | undefined)?.id;
    if (isNew && id) router.replace(`/admin/blog/${id}`);
    else router.refresh();
  });
  const e = state.errors;
  const set = <K extends keyof PostInput>(k: K, v: PostInput[K]) => setP((x) => ({ ...x, [k]: v }));
  return (
    <form action={action} className="grid gap-5 xl:grid-cols-12">
      <input type="hidden" name="payload" value={JSON.stringify(p)} />
      <div className="space-y-5 xl:col-span-8">
        <div className="rounded-xl border border-ambar/30 bg-gradient-to-br from-ambar-100/60 to-white p-4">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-noche"><Sparkles className="size-4 text-ambar-700" /> Borrador con IA</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <input value={topic} onChange={(ev) => setTopic(ev.target.value)} placeholder="Tema: cómo elegir molienda para cada método…" className={cn(inputCls, 'min-w-[14rem] flex-[2]')} />
            <input value={keywords} onChange={(ev) => setKeywords(ev.target.value)} placeholder="Palabras clave (opcional)" className={cn(inputCls, 'min-w-[10rem] flex-1')} />
            <button type="button" disabled={ai} className={btn.ai} onClick={() => startAi(async () => { const r = await aiBlogDraft(topic, p.category ?? '', keywords); if (!r.ok || !r.data) return void toast.error(r.message); const d = r.data; setP((x) => ({ ...x, title: d.title, slug: isNew ? slugify(d.title) : x.slug, excerpt: d.excerpt, content: d.content, tags: d.tags ?? x.tags, seoTitle: d.seoTitle, seoDescription: d.seoDescription })); toast.success('Borrador listo: revísalo antes de publicar'); })}>
              {ai ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4 text-ambar-700" />} Redactar
            </button>
          </div>
        </div>
        <Section title="Artículo">
          <Field label="Título" name="title" errors={e}><input value={p.title} onChange={(ev) => { set('title', ev.target.value); if (isNew) set('slug', slugify(ev.target.value)); }} className={cn(inputCls, 'font-display text-lg')} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Slug" name="slug" errors={e} hint={`/blog/${p.slug}`}><input value={p.slug} onChange={(ev) => set('slug', ev.target.value)} className={cn(inputCls, 'font-mono text-xs')} /></Field>
            <Field label="Autor" name="authorName" errors={e}><input value={p.authorName ?? ''} onChange={(ev) => set('authorName', ev.target.value)} className={inputCls} /></Field>
          </div>
          <Field label="Extracto" name="excerpt" errors={e} counter={{ value: (p.excerpt ?? '').length, max: 400 }}><textarea rows={2} value={p.excerpt ?? ''} onChange={(ev) => set('excerpt', ev.target.value)} className={inputCls} /></Field>
          <Field label={`Contenido · ${readingMinutes(p.content ?? '')} min de lectura`} name="content" errors={e}><MarkdownField value={p.content ?? ''} onChange={(v) => set('content', v)} rows={22} live /></Field>
        </Section>
        <Section title="SEO" actions={<button type="button" disabled={ai || !p.content} className={cn(btn.ai, btn.sm)} onClick={() => startAi(async () => { const r = await aiSeo(p.title, p.content ?? ''); if (r.ok && r.data) { setP((x) => ({ ...x, seoTitle: r.data!.seoTitle, seoDescription: r.data!.seoDescription })); toast.success('SEO sugerido'); } else toast.error(r.message); })}><Sparkles className="size-3.5 text-ambar-700" /> SEO con IA</button>}>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <Field label="Título SEO" name="seoTitle" errors={e} counter={{ value: (p.seoTitle ?? '').length, max: 60 }}><input value={p.seoTitle ?? ''} onChange={(ev) => set('seoTitle', ev.target.value)} className={inputCls} /></Field>
              <Field label="Descripción SEO" name="seoDescription" errors={e} counter={{ value: (p.seoDescription ?? '').length, max: 155 }}><textarea rows={3} value={p.seoDescription ?? ''} onChange={(ev) => set('seoDescription', ev.target.value)} className={inputCls} /></Field>
            </div>
            <GooglePreview title={p.seoTitle || p.title} description={p.seoDescription || p.excerpt || ''} path={`/blog/${p.slug}`} />
          </div>
        </Section>
      </div>
      <aside className="space-y-5 xl:col-span-4">
        <div className="space-y-5 xl:sticky xl:top-20">
          <Section title="Publicación">
            <div className="flex gap-1 rounded-lg bg-crema p-1 text-sm">
              {(['draft', 'scheduled', 'published'] as const).map((s) => (
                <button key={s} type="button" onClick={() => set('status', s)} className={cn('flex-1 rounded-md px-2 py-1.5 font-medium', p.status === s ? 'bg-white text-noche shadow-sm' : 'text-gris')}>{s === 'draft' ? 'Borrador' : s === 'scheduled' ? 'Programado' : 'Publicado'}</button>
              ))}
            </div>
            <Field label="Fecha de publicación (Bogotá)" name="publishedAt" errors={e} hint={p.status === 'published' ? 'Vacío = ahora' : undefined}><input type="datetime-local" value={p.publishedAt ?? ''} onChange={(ev) => set('publishedAt', ev.target.value)} className={inputCls} /></Field>
            <Switch checked={p.isFeatured} onChange={(v) => set('isFeatured', v)} label="Destacado en el blog" />
            <SubmitButton className="w-full">{p.status === 'published' ? 'Publicar' : p.status === 'scheduled' ? 'Programar' : 'Guardar borrador'}</SubmitButton>
            {!isNew ? (
              <div className="flex gap-2">
                <a href={`/blog/${initial.slug}`} target="_blank" rel="noreferrer" className={cn(btn.secondary, btn.sm, 'flex-1')}><ExternalLink className="size-3.5" /> Ver</a>
                <ConfirmButton className={cn(btn.danger, btn.sm)} title="¿Eliminar el artículo?" confirmLabel="Eliminar" onConfirm={async () => { const r = await deletePost(initial.id!); if (r.ok) { toast.success(r.message); router.push('/admin/blog'); } else (r.demo ? toast.info : toast.error)(r.message); }}><Trash2 className="size-3.5" /></ConfirmButton>
              </div>
            ) : null}
          </Section>
          <Section title="Portada">
            <MediaPicker value={p.coverUrl} onChange={(u) => set('coverUrl', u)} folder="blog" aspect="aspect-[16/10]" />
          </Section>
          <Section title="Clasificación">
            <Field label="Categoría" name="category" errors={e}><select value={p.category ?? ''} onChange={(ev) => set('category', ev.target.value)} className={selectCls}><option value="">Sin categoría</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Etiquetas" name="tags" errors={e}><ChipsInput value={p.tags} onChange={(v) => set('tags', v)} max={12} /></Field>
          </Section>
        </div>
      </aside>
    </form>
  );
}
