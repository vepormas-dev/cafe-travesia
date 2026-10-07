'use client';
import { useActionState, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, ExternalLink, HelpCircle, Loader2, Plus, PlayCircle, Sparkles, Trash2 } from 'lucide-react';
import { formatCOP, formatDuration, LEVEL_LABEL, slugify } from '@travesia/shared';
import { cn } from '@/lib/cn';
import { initialActionState } from '@/lib/admin/action-state';
import { aiCourseOutline, saveCourse, type CourseInput } from '@/lib/admin/actions/academy';
import { VIDEO_PROVIDERS } from '@/lib/admin/labels';
import { ChipsInput, Field, SubmitButton, Switch, useActionToast } from '../client-ui';
import { GooglePreview, MarkdownField, Section } from '../forms';
import { MediaPicker } from '../media/media-picker';
import { btn, inputCls, selectCls } from '../ui';

type C = CourseInput;
type Mod = C['modules'][number];
type Lesson = Mod['lessons'][number];
const uid = () => crypto.randomUUID();
const newLesson = (title = 'Nueva lección', summary = ''): Lesson => ({ id: uid(), title, summary, content: '', videoUrl: '', videoProvider: 'mp4', durationS: 0, isPreview: false, resources: [] });
function move<T>(a: T[], i: number, d: -1 | 1) {
  const j = i + d;
  if (j < 0 || j >= a.length) return a;
  const n = [...a];
  [n[i], n[j]] = [n[j]!, n[i]!];
  return n;
}

export function CourseEditor({ initial, isNew, demo }: { initial: C; isNew: boolean; demo: boolean }) {
  const [c, setC] = useState<C>(initial);
  const [tab, setTab] = useState<'info' | 'temario' | 'seo'>('info');
  const [open, setOpen] = useState<string | null>(null);
  const [state, action] = useActionState(saveCourse, initialActionState);
  const [aiPending, startAi] = useTransition();
  useActionToast(state);
  const e = state.errors;
  const set = <K extends keyof C>(k: K, v: C[K]) => setC((x) => ({ ...x, [k]: v }));
  const setMod = (mi: number, patch: Partial<Mod>) => setC((x) => ({ ...x, modules: x.modules.map((m, j) => (j === mi ? { ...m, ...patch } : m)) }));
  const setLesson = (mi: number, li: number, patch: Partial<Lesson>) => setMod(mi, { lessons: c.modules[mi]!.lessons.map((l, j) => (j === li ? { ...l, ...patch } : l)) });
  const lessons = c.modules.reduce((n, m) => n + m.lessons.length, 0);
  const seconds = c.modules.reduce((n, m) => n + m.lessons.reduce((a, l) => a + l.durationS, 0), 0);

  const runAi = () =>
    startAi(async () => {
      const r = await aiCourseOutline(c.title, c.level, c.subtitle ?? '');
      if (!r.ok || !r.data) return void toast.error(r.message);
      const o = r.data;
      setC((x) => ({
        ...x,
        subtitle: x.subtitle || o.subtitle,
        description: x.description || o.description,
        whatYouLearn: x.whatYouLearn.length ? x.whatYouLearn : o.whatYouLearn,
        modules: [...x.modules, ...o.modules.map((m) => ({ id: uid(), title: m.title, quiz: null, lessons: m.lessons.map((l) => newLesson(l.title, l.summary)) }))],
      }));
      setTab('temario');
      toast.success(`Temario agregado: ${o.modules.length} módulos con lecciones vacías ✨`);
    });

  const errCount = Object.keys(e ?? {}).length;
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="payload" value={JSON.stringify(c)} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg bg-white p-1 text-sm shadow-sm">
          {(
            [
              ['info', 'Información'],
              ['temario', `Temario (${c.modules.length} · ${lessons})`],
              ['seo', 'SEO'],
            ] as const
          ).map(([k, l]) => (
            <button key={k} type="button" onClick={() => setTab(k)} className={cn('rounded-md px-3 py-1.5 font-medium', tab === k ? 'bg-noche text-crema' : 'text-gris hover:text-noche')}>{l}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={runAi} disabled={aiPending || !c.title} className={btn.ai}>{aiPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4 text-ambar-700" />} Generar temario con IA</button>
          {!isNew ? <a href={`/academia/cursos/${initial.slug}`} target="_blank" rel="noreferrer" className={btn.secondary}><ExternalLink className="size-4" /> Ver</a> : null}
          <SubmitButton>{isNew ? 'Crear curso' : 'Guardar curso'}</SubmitButton>
        </div>
      </div>
      {errCount ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900"><strong>Revisa {errCount} campo(s):</strong> {Object.entries(e!).slice(0, 3).map(([k, v]) => `${k}: ${v[0]}`).join(' · ')}</div> : null}
      {demo ? <p className="text-xs text-gris">Modo demo: puedes editar el temario completo, pero no se guardará.</p> : null}

      {tab === 'info' ? (
        <div className="grid gap-5 xl:grid-cols-12">
          <div className="space-y-5 xl:col-span-8">
            <Section title="Curso">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Título" name="title" errors={e} className="sm:col-span-2"><input value={c.title} onChange={(ev) => { set('title', ev.target.value); if (isNew) set('slug', slugify(ev.target.value)); }} className={cn(inputCls, 'text-base font-medium')} /></Field>
                <Field label="Slug" name="slug" errors={e} hint={`/academia/cursos/${c.slug}`}><input value={c.slug} onChange={(ev) => set('slug', ev.target.value)} className={cn(inputCls, 'font-mono text-xs')} /></Field>
                <Field label="Nivel" name="level" errors={e}><select value={c.level} onChange={(ev) => set('level', ev.target.value as C['level'])} className={selectCls}>{Object.entries(LEVEL_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
                <Field label="Subtítulo" name="subtitle" errors={e} className="sm:col-span-2"><input value={c.subtitle ?? ''} onChange={(ev) => set('subtitle', ev.target.value)} className={inputCls} /></Field>
                <Field label="Categoría" name="category" errors={e}><input value={c.category ?? ''} onChange={(ev) => set('category', ev.target.value)} className={inputCls} placeholder="Barismo, Origen, Tueste…" /></Field>
                <Field label="Duración (min)" name="durationMin" errors={e} hint={`Lecciones suman ${formatDuration(seconds)} (0 = automático)`}><input type="number" value={c.durationMin} onChange={(ev) => set('durationMin', Number(ev.target.value))} className={inputCls} /></Field>
              </div>
              <Field label="Descripción" name="description" errors={e}><MarkdownField value={c.description ?? ''} onChange={(v) => set('description', v)} rows={6} /></Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Lo que vas a aprender" name="whatYouLearn" errors={e}><ChipsInput value={c.whatYouLearn} onChange={(v) => set('whatYouLearn', v)} max={20} /></Field>
                <Field label="Requisitos" name="requirements" errors={e}><ChipsInput value={c.requirements} onChange={(v) => set('requirements', v)} max={20} /></Field>
              </div>
            </Section>
            <Section title="Instructor">
              <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
                <MediaPicker value={c.instructorAvatarUrl} onChange={(u) => set('instructorAvatarUrl', u)} folder="academia" aspect="aspect-square" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Nombre" name="instructorName" errors={e}><input value={c.instructorName ?? ''} onChange={(ev) => set('instructorName', ev.target.value)} className={inputCls} /></Field>
                  <Field label="Cargo" name="instructorTitle" errors={e}><input value={c.instructorTitle ?? ''} onChange={(ev) => set('instructorTitle', ev.target.value)} className={inputCls} /></Field>
                  <Field label="Biografía" name="instructorBio" errors={e} className="sm:col-span-2"><textarea rows={3} value={c.instructorBio ?? ''} onChange={(ev) => set('instructorBio', ev.target.value)} className={inputCls} /></Field>
                </div>
              </div>
            </Section>
          </div>
          <div className="space-y-5 xl:col-span-4">
            <Section title="Precio y acceso">
              <Field label="Precio (COP)" name="priceCop" errors={e} hint={c.priceCop ? formatCOP(c.priceCop) : 'Gratis'}><input type="number" value={c.priceCop} onChange={(ev) => set('priceCop', Number(ev.target.value))} className={inputCls} /></Field>
              <Field label="Precio antes" name="compareAtCop" errors={e}><input type="number" value={c.compareAtCop ?? ''} onChange={(ev) => set('compareAtCop', ev.target.value === '' ? null : Number(ev.target.value))} className={inputCls} /></Field>
              <Switch checked={c.isFree} onChange={(v) => set('isFree', v)} label="Curso gratuito" />
              <Switch checked={c.includedInSubscription} onChange={(v) => set('includedInSubscription', v)} label="Incluido en planes con Academia" />
              <Switch checked={c.certificateEnabled} onChange={(v) => set('certificateEnabled', v)} label="Emite certificado" />
            </Section>
            <Section title="Publicación">
              <Switch checked={c.isPublished} onChange={(v) => set('isPublished', v)} label="Publicado" description="Visible en la Academia y la app" />
              <Switch checked={c.isFeatured} onChange={(v) => set('isFeatured', v)} label="Destacado" />
              <Field label="Orden" name="sortOrder" errors={e}><input type="number" value={c.sortOrder} onChange={(ev) => set('sortOrder', Number(ev.target.value))} className={cn(inputCls, 'w-24')} /></Field>
            </Section>
            <Section title="Portada y tráiler">
              <MediaPicker value={c.coverUrl} onChange={(u) => set('coverUrl', u)} folder="academia" aspect="aspect-video" />
              <Field label="URL del tráiler (opcional)" name="trailerUrl" errors={e}><input value={c.trailerUrl ?? ''} onChange={(ev) => set('trailerUrl', ev.target.value)} className={inputCls} placeholder="https://…/trailer.m3u8" /></Field>
            </Section>
          </div>
        </div>
      ) : null}

      {tab === 'temario' ? (
        <div className="space-y-3">
          {c.modules.map((m, mi) => (
            <div key={m.id} className="rounded-xl border border-noche/[0.08] bg-white">
              <div className="flex items-center gap-2 border-b border-noche/[0.06] px-4 py-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-noche text-xs font-bold text-ambar-300">{mi + 1}</span>
                <input value={m.title} onChange={(ev) => setMod(mi, { title: ev.target.value })} className={cn(inputCls, 'flex-1 font-semibold', e?.[`modules.${mi}.title`] && 'border-cereza')} placeholder="Título del módulo" aria-label="Título del módulo" />
                <span className="hidden text-xs text-gris sm:inline">{m.lessons.length} lecciones · {formatDuration(m.lessons.reduce((a, l) => a + l.durationS, 0))}</span>
                <button type="button" aria-label="Subir módulo" onClick={() => set('modules', move(c.modules, mi, -1))} className={cn(btn.ghost, btn.icon)}><ArrowUp className="size-4" /></button>
                <button type="button" aria-label="Bajar módulo" onClick={() => set('modules', move(c.modules, mi, 1))} className={cn(btn.ghost, btn.icon)}><ArrowDown className="size-4" /></button>
                <button type="button" aria-label="Eliminar módulo" onClick={() => confirm('¿Eliminar el módulo y sus lecciones?') && set('modules', c.modules.filter((_, j) => j !== mi))} className={cn(btn.ghost, btn.icon, 'text-cereza')}><Trash2 className="size-4" /></button>
              </div>
              <ul className="divide-y divide-noche/[0.05]">
                {m.lessons.map((l, li) => {
                  const isOpen = open === l.id;
                  const errL = (f: string) => e?.[`modules.${mi}.lessons.${li}.${f}`]?.[0];
                  return (
                    <li key={l.id} className={cn(isOpen && 'bg-crema/30')}>
                      <div className="flex items-center gap-2 px-4 py-2">
                        <button type="button" onClick={() => setOpen(isOpen ? null : l.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left" aria-expanded={isOpen}>
                          {isOpen ? <ChevronDown className="size-4 text-gris" /> : <ChevronRight className="size-4 text-gris" />}
                          <PlayCircle className={cn('size-4', l.videoUrl ? 'text-montana' : 'text-noche/25')} />
                          <span className={cn('truncate text-sm', errL('title') ? 'text-cereza' : 'text-noche')}>{l.title || 'Sin título'}</span>
                          {l.isPreview ? <span className="rounded bg-ambar-100 px-1.5 text-[0.62rem] font-semibold text-ambar-700">Vista previa</span> : null}
                          {!l.content && !l.videoUrl ? <span className="text-[0.65rem] text-gris">vacía</span> : null}
                        </button>
                        <span className="text-xs text-gris tabular-nums">{formatDuration(l.durationS)}</span>
                        <button type="button" aria-label="Subir lección" onClick={() => setMod(mi, { lessons: move(m.lessons, li, -1) })} className={cn(btn.ghost, btn.icon)}><ArrowUp className="size-3.5" /></button>
                        <button type="button" aria-label="Bajar lección" onClick={() => setMod(mi, { lessons: move(m.lessons, li, 1) })} className={cn(btn.ghost, btn.icon)}><ArrowDown className="size-3.5" /></button>
                        <button type="button" aria-label="Eliminar lección" onClick={() => setMod(mi, { lessons: m.lessons.filter((_, j) => j !== li) })} className={cn(btn.ghost, btn.icon, 'text-cereza')}><Trash2 className="size-3.5" /></button>
                      </div>
                      {isOpen ? (
                        <div className="space-y-3 px-4 pt-1 pb-4 pl-12">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <Field label="Título" name={`modules.${mi}.lessons.${li}.title`} errors={e}><input value={l.title} onChange={(ev) => setLesson(mi, li, { title: ev.target.value })} className={inputCls} /></Field>
                            <Field label="Resumen"><input value={l.summary} onChange={(ev) => setLesson(mi, li, { summary: ev.target.value })} className={inputCls} /></Field>
                            <Field label="Video (URL)" className="sm:col-span-2" hint="Recomendado: Bunny Stream (HLS). También MP4, YouTube o Vimeo."><input value={l.videoUrl} onChange={(ev) => setLesson(mi, li, { videoUrl: ev.target.value })} className={inputCls} placeholder="https://vz-xxxx.b-cdn.net/…/playlist.m3u8" /></Field>
                            <Field label="Proveedor"><select value={l.videoProvider} onChange={(ev) => setLesson(mi, li, { videoProvider: ev.target.value as Lesson['videoProvider'] })} className={selectCls}>{VIDEO_PROVIDERS.map((v) => <option key={v}>{v}</option>)}</select></Field>
                            <Field label="Duración (min : seg)">
                              <div className="flex items-center gap-1">
                                <input type="number" min={0} value={Math.floor(l.durationS / 60)} onChange={(ev) => setLesson(mi, li, { durationS: Number(ev.target.value) * 60 + (l.durationS % 60) })} className={cn(inputCls, 'w-20')} aria-label="Minutos" />:
                                <input type="number" min={0} max={59} value={l.durationS % 60} onChange={(ev) => setLesson(mi, li, { durationS: Math.floor(l.durationS / 60) * 60 + Math.min(59, Number(ev.target.value)) })} className={cn(inputCls, 'w-20')} aria-label="Segundos" />
                              </div>
                            </Field>
                          </div>
                          <Switch checked={l.isPreview} onChange={(v) => setLesson(mi, li, { isPreview: v })} label="Lección de vista previa (gratis para todos)" />
                          <Field label="Contenido (Markdown)"><MarkdownField value={l.content} onChange={(v) => setLesson(mi, li, { content: v })} rows={8} live /></Field>
                          <div>
                            <div className="mb-1 flex items-center justify-between"><p className="text-[0.8rem] font-medium text-noche/80">Recursos descargables</p><button type="button" className={cn(btn.ghost, btn.sm)} onClick={() => setLesson(mi, li, { resources: [...l.resources, { label: '', url: '' }] })}><Plus className="size-3.5" /> Recurso</button></div>
                            {l.resources.map((r, ri) => (
                              <div key={ri} className="mb-1.5 flex gap-2">
                                <input value={r.label} onChange={(ev) => setLesson(mi, li, { resources: l.resources.map((x, j) => (j === ri ? { ...x, label: ev.target.value } : x)) })} className={inputCls} placeholder="Guía de recetas (PDF)" />
                                <input value={r.url} onChange={(ev) => setLesson(mi, li, { resources: l.resources.map((x, j) => (j === ri ? { ...x, url: ev.target.value } : x)) })} className={inputCls} placeholder="https://media.cafetravesia.co/…" />
                                <button type="button" aria-label="Quitar recurso" onClick={() => setLesson(mi, li, { resources: l.resources.filter((_, j) => j !== ri) })} className={cn(btn.ghost, btn.icon, 'text-cereza')}><Trash2 className="size-3.5" /></button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
              <div className="flex flex-wrap gap-2 border-t border-noche/[0.06] px-4 py-2.5">
                <button type="button" className={cn(btn.ghost, btn.sm)} onClick={() => { const l = newLesson(); setMod(mi, { lessons: [...m.lessons, l] }); setOpen(l.id); }}><Plus className="size-3.5" /> Lección</button>
                {!m.quiz ? <button type="button" className={cn(btn.ghost, btn.sm)} onClick={() => setMod(mi, { quiz: { id: uid(), title: `Evaluación: ${m.title}`, passScore: 70, questions: [{ id: uid(), prompt: '', options: ['', ''], correctIndex: 0, explanation: '' }] } })}><HelpCircle className="size-3.5" /> Agregar quiz</button> : null}
              </div>
              {m.quiz ? <QuizEditor quiz={m.quiz} onChange={(q) => setMod(mi, { quiz: q })} errors={e} prefix={`modules.${mi}.quiz`} /> : null}
            </div>
          ))}
          <button type="button" onClick={() => set('modules', [...c.modules, { id: uid(), title: `Módulo ${c.modules.length + 1}`, lessons: [newLesson()], quiz: null }])} className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-noche/15 py-4 text-sm font-medium text-gris hover:border-noche/30 hover:text-noche"><Plus className="size-4" /> Agregar módulo</button>
        </div>
      ) : null}

      {tab === 'seo' ? (
        <Section title="SEO">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <Field label="Título SEO" name="seoTitle" errors={e} counter={{ value: (c.seoTitle ?? '').length, max: 60 }}><input value={c.seoTitle ?? ''} onChange={(ev) => set('seoTitle', ev.target.value)} className={inputCls} /></Field>
              <Field label="Descripción SEO" name="seoDescription" errors={e} counter={{ value: (c.seoDescription ?? '').length, max: 155 }}><textarea rows={3} value={c.seoDescription ?? ''} onChange={(ev) => set('seoDescription', ev.target.value)} className={inputCls} /></Field>
            </div>
            <GooglePreview title={c.seoTitle || `${c.title} | Academia Travesía`} description={c.seoDescription || c.subtitle || ''} path={`/academia/cursos/${c.slug}`} />
          </div>
        </Section>
      ) : null}
    </form>
  );
}

function QuizEditor({ quiz, onChange, errors, prefix }: { quiz: NonNullable<Mod['quiz']>; onChange: (q: Mod['quiz']) => void; errors?: Record<string, string[]>; prefix: string }) {
  const setQ = (qi: number, patch: Partial<(typeof quiz.questions)[number]>) => onChange({ ...quiz, questions: quiz.questions.map((q, j) => (j === qi ? { ...q, ...patch } : q)) });
  return (
    <div className="border-t border-noche/[0.06] bg-ambar-100/25 px-4 py-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <HelpCircle className="size-4 text-ambar-700" />
        <input value={quiz.title} onChange={(e) => onChange({ ...quiz, title: e.target.value })} className={cn(inputCls, 'max-w-sm flex-1 font-medium')} aria-label="Título del quiz" />
        <label className="flex items-center gap-1.5 text-xs text-gris">Aprueba con <input type="number" min={1} max={100} value={quiz.passScore} onChange={(e) => onChange({ ...quiz, passScore: Number(e.target.value) })} className={cn(inputCls, 'w-16')} /> %</label>
        <button type="button" onClick={() => onChange(null)} className={cn(btn.ghost, btn.sm, 'ml-auto text-cereza')}><Trash2 className="size-3.5" /> Quitar quiz</button>
      </div>
      {errors?.[`${prefix}.questions`] ? <p className="mb-2 text-xs text-cereza">{errors[`${prefix}.questions`]![0]}</p> : null}
      <ol className="space-y-3">
        {quiz.questions.map((q, qi) => (
          <li key={q.id} className="rounded-lg border border-noche/10 bg-white p-3">
            <div className="flex gap-2">
              <span className="mt-2 text-xs font-bold text-gris">{qi + 1}.</span>
              <textarea rows={2} value={q.prompt} onChange={(e) => setQ(qi, { prompt: e.target.value })} className={cn(inputCls, errors?.[`${prefix}.questions.${qi}.prompt`] && 'border-cereza')} placeholder="Escribe la pregunta" />
              <button type="button" aria-label="Eliminar pregunta" onClick={() => onChange({ ...quiz, questions: quiz.questions.filter((_, j) => j !== qi) })} className={cn(btn.ghost, btn.icon, 'text-cereza')}><Trash2 className="size-3.5" /></button>
            </div>
            <div className="mt-2 space-y-1.5 pl-5">
              {q.options.map((o, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <input type="radio" name={`correct-${q.id}`} checked={q.correctIndex === oi} onChange={() => setQ(qi, { correctIndex: oi })} className="size-4 accent-montana" aria-label={`Marcar opción ${oi + 1} como correcta`} />
                  <input value={o} onChange={(e) => setQ(qi, { options: q.options.map((x, j) => (j === oi ? e.target.value : x)) })} className={cn(inputCls, q.correctIndex === oi && 'border-montana/50 bg-emerald-50/50')} placeholder={`Opción ${oi + 1}`} />
                  <button type="button" aria-label="Quitar opción" disabled={q.options.length <= 2} onClick={() => setQ(qi, { options: q.options.filter((_, j) => j !== oi), correctIndex: q.correctIndex >= oi && q.correctIndex > 0 ? q.correctIndex - 1 : q.correctIndex })} className={cn(btn.ghost, btn.icon)}><Trash2 className="size-3" /></button>
                </div>
              ))}
              {q.options.length < 8 ? <button type="button" onClick={() => setQ(qi, { options: [...q.options, ''] })} className="text-xs font-medium text-ambar-700 hover:underline">+ Opción</button> : null}
              <input value={q.explanation} onChange={(e) => setQ(qi, { explanation: e.target.value })} className={cn(inputCls, 'mt-1 text-xs')} placeholder="Explicación que ve el estudiante al responder" />
            </div>
          </li>
        ))}
      </ol>
      <button type="button" onClick={() => onChange({ ...quiz, questions: [...quiz.questions, { id: uid(), prompt: '', options: ['', ''], correctIndex: 0, explanation: '' }] })} className={cn(btn.secondary, btn.sm, 'mt-3')}><Plus className="size-3.5" /> Pregunta</button>
    </div>
  );
}
