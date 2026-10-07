'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  ClipboardCheck,
  Download,
  FileText,
  Keyboard,
  ListVideo,
  Lock,
  PartyPopper,
  PlayCircle,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import type { LessonDTO } from '@travesia/shared';
import { Markdown } from '@/components/ui/primitives';
import { cn } from '@/lib/cn';
import { lessonDuration } from './course-meta';
import { LessonNotes } from './lesson-notes';
import { TutorChat } from './tutor-chat';
import { VideoPlayer, type PlayerControls } from './video-player';

export type PlayerModule = { id: string; title: string; quizId: string | null; lessons: { id: string; title: string; durationS: number; isPreview: boolean }[] };
export type PlayerCourse = { id: string; slug: string; title: string; coverUrl: string | null; instructorName: string | null; modules: PlayerModule[] };
export type PlayerState = {
  loggedIn: boolean;
  enrolled: boolean;
  canTrack: boolean;
  demo: boolean;
  ai: boolean;
  instructor: string;
  completedIds: string[];
  passedQuizIds: string[];
  courseCompleted: boolean;
  certificateCode: string | null;
};

type Tab = 'resumen' | 'recursos' | 'notas' | 'tutor';
const TABS: { id: Tab; label: string }[] = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'recursos', label: 'Recursos' },
  { id: 'notas', label: 'Notas' },
  { id: 'tutor', label: 'Tutor ✨' },
];

export function LessonPlayer({ course, lesson, state }: { course: PlayerCourse; lesson: LessonDTO; state: PlayerState }) {
  const router = useRouter();
  const controls = useRef<PlayerControls | null>(null);
  const [completed, setCompleted] = useState(() => new Set(state.completedIds));
  const [tab, setTab] = useState<Tab>('resumen');
  const [drawer, setDrawer] = useState(false);
  const [celebrate, setCelebrate] = useState<{ code: string | null } | null>(null);
  const [saving, setSaving] = useState(false);
  const lastSaved = useRef(lesson.positionS);
  const position = useRef(lesson.positionS);
  const playing = useRef(false);
  const autoDone = useRef(lesson.completed);
  const loginHref = `/ingresar?next=${encodeURIComponent(`/academia/aprender/${course.slug}/${lesson.id}`)}`;

  const all = useMemo(() => course.modules.flatMap((m) => m.lessons), [course.modules]);
  const idx = all.findIndex((l) => l.id === lesson.id);
  const mod = course.modules.find((m) => m.lessons.some((l) => l.id === lesson.id)) ?? course.modules[0]!;
  const modIndex = course.modules.indexOf(mod);
  const modPct = mod.lessons.length ? Math.round((mod.lessons.filter((l) => completed.has(l.id)).length / mod.lessons.length) * 100) : 0;
  const coursePct = all.length ? Math.round((all.filter((l) => completed.has(l.id)).length / all.length) * 100) : 0;
  const isLastOfModule = mod.lessons.at(-1)?.id === lesson.id;
  const quizHref = (id: string) => `/academia/aprender/${course.slug}/evaluacion/${id}`;
  const canOpen = (l: { isPreview: boolean }) => state.enrolled || l.isPreview;
  const href = (id: string | null) => (id ? `/academia/aprender/${course.slug}/${id}` : null);
  const prev = href(lesson.prevLessonId);
  const next = href(lesson.nextLessonId);
  const nextLesson = all[idx + 1];

  // ------------------------------------------------------------------ progreso
  const send = useCallback(
    async (body: { positionS: number; completed?: boolean }, beacon = false) => {
      if (!state.canTrack) return null;
      const payload = JSON.stringify({ lessonId: lesson.id, positionS: Math.max(0, Math.floor(body.positionS)), ...(body.completed ? { completed: true } : {}) });
      lastSaved.current = body.positionS;
      if (beacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon('/api/v1/progress', new Blob([payload], { type: 'application/json' }));
        return null;
      }
      try {
        const res = await fetch('/api/v1/progress', { method: 'POST', headers: { 'content-type': 'application/json' }, body: payload, keepalive: true });
        if (!res.ok) return null;
        return (await res.json()) as { progressPct: number; courseCompleted: boolean; certificateCode?: string };
      } catch {
        return null;
      }
    },
    [lesson.id, state.canTrack],
  );

  const markComplete = useCallback(
    async (auto = false) => {
      if (completed.has(lesson.id) && !auto) return;
      if (!state.canTrack) {
        if (!auto) toast.info(state.demo ? 'Modo demo: el progreso no se guarda.' : state.loggedIn ? 'Inscríbete en el curso para guardar tu progreso.' : 'Ingresa para guardar tu progreso.');
        return;
      }
      setSaving(true);
      const r = await send({ positionS: position.current, completed: true });
      setSaving(false);
      if (!r) {
        if (!auto) toast.error('No pudimos guardar tu progreso. Inténtalo de nuevo.');
        return;
      }
      autoDone.current = true;
      setCompleted((s) => new Set(s).add(lesson.id));
      if (r.courseCompleted) setCelebrate({ code: r.certificateCode ?? state.certificateCode });
      else if (!auto) toast.success(isLastOfModule && mod.quizId && !state.passedQuizIds.includes(mod.quizId) ? '¡Lección completada! Te espera la evaluación del módulo.' : '¡Lección completada! ☕');
      router.refresh();
    },
    [completed, lesson.id, state, send, isLastOfModule, mod.quizId, router],
  );

  useEffect(() => {
    const iv = window.setInterval(() => {
      if (playing.current && Math.abs(position.current - lastSaved.current) >= 3) void send({ positionS: position.current });
    }, 15_000);
    const flush = () => {
      if (Math.abs(position.current - lastSaved.current) >= 2) void send({ positionS: position.current }, true);
    };
    const onVis = () => document.visibilityState === 'hidden' && flush();
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(iv);
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVis);
      flush(); // navegación interna a otra lección
    };
  }, [send]);

  // ------------------------------------------------------------------ teclado
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el || el.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON|A|IFRAME)$/.test(el.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (!controls.current?.hasVideo) return;
      if (e.key === ' ' || e.key === 'k') {
        e.preventDefault();
        controls.current.toggle();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        controls.current.skip(-10);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        controls.current.skip(10);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = drawer ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawer]);

  const isDone = completed.has(lesson.id);

  // ------------------------------------------------------------------ temario
  const syllabus = (
    <nav aria-label="Temario del curso" className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <div className="flex items-baseline justify-between">
          <p className="text-[0.72rem] font-semibold tracking-[0.16em] text-crema/70 uppercase">Progreso del módulo</p>
          <p className="font-display text-2xl text-[#c9dfa4]">{modPct}%</p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={modPct} aria-valuemin={0} aria-valuemax={100} aria-label="Progreso del módulo">
          <div className="h-full rounded-full bg-[#c9dfa4] transition-[width] duration-700" style={{ width: `${modPct}%` }} />
        </div>
        <p className="mt-3 text-xs text-crema/50">Curso completo: {coursePct}%</p>
      </div>
      {course.modules.map((m, mi) => {
        const done = m.lessons.filter((l) => completed.has(l.id)).length;
        return (
          <details key={m.id} open={m.id === mod.id} className="group">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-1 py-1.5 text-crema/80 hover:text-crema [&::-webkit-details-marker]:hidden">
              <ChevronDown className="size-4 shrink-0 transition group-open:rotate-0 -rotate-90" aria-hidden />
              <span className="flex-1 text-[0.72rem] font-semibold tracking-[0.18em] uppercase">
                Módulo {mi + 1}: {m.title}
              </span>
              <span className="text-xs text-crema/45 tabular-nums">
                {done}/{m.lessons.length}
              </span>
            </summary>
            <ol className="mt-2 space-y-1.5">
              {m.lessons.map((l) => {
                const current = l.id === lesson.id;
                const open = canOpen(l);
                const Icon = completed.has(l.id) ? CheckCircle2 : current ? PlayCircle : open ? Circle : Lock;
                const inner = (
                  <>
                    <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-xl', completed.has(l.id) ? 'bg-[#c9dfa4]/15 text-[#c9dfa4]' : current ? 'bg-ambar/20 text-ambar-300' : 'bg-white/5 text-crema/45')}>
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn('block truncate text-sm', current ? 'font-semibold text-crema' : 'text-crema/85')}>{l.title}</span>
                      <span className="text-xs text-crema/45">
                        {lessonDuration(l.durationS)}
                        {completed.has(l.id) ? ' · Completada' : !open ? ' · Bloqueada' : l.isPreview && !state.enrolled ? ' · Gratis' : ''}
                      </span>
                    </span>
                  </>
                );
                return (
                  <li key={l.id}>
                    {open && !current ? (
                      <Link href={`/academia/aprender/${course.slug}/${l.id}`} onClick={() => setDrawer(false)} className="flex items-center gap-3 rounded-xl border border-transparent p-2 transition hover:border-white/10 hover:bg-white/[0.04]">
                        {inner}
                      </Link>
                    ) : (
                      <div aria-current={current ? 'page' : undefined} className={cn('flex items-center gap-3 rounded-xl border p-2', current ? 'border-white/10 bg-white/[0.07]' : 'border-transparent opacity-70')}>
                        {inner}
                      </div>
                    )}
                  </li>
                );
              })}
              {m.quizId ? (
                <li>
                  {state.enrolled || state.demo ? (
                    <Link href={quizHref(m.quizId)} onClick={() => setDrawer(false)} className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-white/[0.04]">
                      <span className={cn('flex size-9 items-center justify-center rounded-xl', state.passedQuizIds.includes(m.quizId) ? 'bg-[#c9dfa4]/15 text-[#c9dfa4]' : 'bg-ambar/15 text-ambar-300')}>
                        <ClipboardCheck className="size-4" aria-hidden />
                      </span>
                      <span className="text-sm text-crema/85">
                        Evaluación del módulo
                        <span className="block text-xs text-crema/45">{state.passedQuizIds.includes(m.quizId) ? 'Aprobada' : 'Necesaria para el certificado'}</span>
                      </span>
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 p-2 opacity-60">
                      <span className="flex size-9 items-center justify-center rounded-xl bg-white/5 text-crema/45">
                        <Lock className="size-4" aria-hidden />
                      </span>
                      <span className="text-sm text-crema/70">Evaluación del módulo</span>
                    </div>
                  )}
                </li>
              ) : null}
            </ol>
          </details>
        );
      })}
      {!state.enrolled ? (
        <div className="rounded-2xl border border-ambar/30 bg-gradient-to-br from-tostado to-[#120c0a] p-5">
          <p className="text-sm text-crema/85">Estás viendo una lección gratuita. Inscríbete para desbloquear todo el curso, el tutor y tu certificado.</p>
          <Link href={`/academia/cursos/${course.slug}`} className="mt-4 inline-flex w-full items-center justify-center rounded-md bg-[#c9dfa4] px-4 py-2.5 text-xs font-bold tracking-[0.14em] text-noche uppercase hover:bg-[#dcebc1]">
            Inscribirme ahora
          </Link>
        </div>
      ) : null}
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#120c0a] text-crema">
      {/* Barra superior */}
      <div className="sticky top-16 z-30 border-b border-white/10 bg-[#120c0a]/90 backdrop-blur-md lg:top-20">
        <div className="mx-auto flex max-w-[1500px] items-center gap-3 px-4 py-3 sm:px-6">
          <Link href={`/academia/cursos/${course.slug}`} className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10" aria-label="Volver al curso">
            <ArrowLeft className="size-4" aria-hidden />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.68rem] font-semibold tracking-[0.18em] text-crema/50 uppercase">Academia Travesía</p>
            <p className="truncate font-display text-base text-crema sm:text-lg">{course.title}</p>
          </div>
          <div className="hidden w-40 items-center gap-2 sm:flex" title="Progreso del curso">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-[#c9dfa4]" style={{ width: `${coursePct}%` }} />
            </div>
            <span className="text-xs text-crema/60 tabular-nums">{coursePct}%</span>
          </div>
          <button type="button" onClick={() => setDrawer(true)} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold lg:hidden" aria-expanded={drawer} aria-controls="temario-drawer">
            <ListVideo className="size-4" aria-hidden /> Temario
          </button>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1500px] lg:grid-cols-[340px_1fr]">
        <aside className="hidden border-r border-white/10 lg:block">
          <div className="sticky top-[141px] max-h-[calc(100vh-141px)] overflow-y-auto px-5 py-6">
            <p className="text-[0.68rem] font-semibold tracking-[0.18em] text-crema/45 uppercase">Curso</p>
            <p className="mt-1 font-display text-xl leading-snug">{course.title}</p>
            {course.instructorName ? <p className="mt-1 text-xs text-crema/55">con {course.instructorName}</p> : null}
            <div className="mt-6">{syllabus}</div>
          </div>
        </aside>

        <div className="min-w-0 pb-24">
          <div className="lg:px-8 lg:pt-6">
            <div className="overflow-hidden lg:rounded-2xl lg:border lg:border-white/10">
              <VideoPlayer
                src={lesson.videoUrl}
                provider={lesson.videoProvider}
                poster={course.coverUrl}
                title={lesson.title}
                startAt={lesson.positionS}
                controlsRef={controls}
                onTime={(t, d) => {
                  position.current = t;
                  if (d > 0 && t / d >= 0.9 && !autoDone.current) {
                    autoDone.current = true;
                    void markComplete(true);
                  }
                }}
                onPlayChange={(p) => (playing.current = p)}
                onPause={(t) => {
                  position.current = t;
                  if (Math.abs(t - lastSaved.current) >= 2) void send({ positionS: t });
                }}
                onEnded={() => !completed.has(lesson.id) && void markComplete(true)}
              />
            </div>
          </div>

          <div className="px-5 pt-7 sm:px-8">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="rounded-md bg-[#c9dfa4]/10 px-2.5 py-1 font-semibold tracking-[0.16em] text-[#c9dfa4] uppercase">Lección {String(idx + 1).padStart(2, '0')}</span>
              <span className="tracking-[0.12em] text-crema/55 uppercase">
                Módulo {modIndex + 1} · {lessonDuration(lesson.durationS)}
              </span>
              {isDone ? (
                <span className="inline-flex items-center gap-1 text-[#c9dfa4]">
                  <CheckCircle2 className="size-3.5" aria-hidden /> Completada
                </span>
              ) : null}
            </div>
            <h1 className="mt-4 font-display text-3xl leading-tight text-crema sm:text-4xl lg:text-5xl">{lesson.title}</h1>
            {lesson.summary ? <p className="mt-3 max-w-3xl text-lg leading-relaxed text-crema/70">{lesson.summary}</p> : null}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {prev ? (
                <Link href={prev} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-crema/85 hover:bg-white/5">
                  <ChevronLeft className="size-4" aria-hidden /> Anterior
                </Link>
              ) : null}
              <button
                type="button"
                onClick={() => void markComplete()}
                disabled={isDone || saving}
                className={cn('inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition', isDone ? 'bg-[#c9dfa4]/15 text-[#c9dfa4]' : 'bg-[#c9dfa4] text-noche hover:bg-[#dcebc1]')}
              >
                <CheckCircle2 className="size-4" aria-hidden /> {isDone ? 'Lección completada' : saving ? 'Guardando…' : 'Marcar como completada'}
              </button>
              {isLastOfModule && mod.quizId && (state.enrolled || state.demo) ? (
                <Link href={quizHref(mod.quizId)} className="inline-flex items-center gap-1.5 rounded-xl bg-ambar px-4 py-2.5 text-sm font-semibold text-noche hover:bg-ambar-300">
                  <ClipboardCheck className="size-4" aria-hidden /> Evaluación del módulo
                </Link>
              ) : null}
              {next ? (
                canOpen(nextLesson ?? { isPreview: false }) ? (
                  <Link href={next} className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-crema hover:bg-white/5">
                    Siguiente <ChevronRight className="size-4" aria-hidden />
                  </Link>
                ) : (
                  <Link href={`/academia/cursos/${course.slug}`} className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-crema/70 hover:bg-white/5">
                    <Lock className="size-3.5" aria-hidden /> Siguiente lección
                  </Link>
                )
              ) : null}
            </div>
            {!state.canTrack && !state.demo ? (
              <p className="mt-4 text-xs text-crema/50">
                {state.loggedIn ? 'Inscríbete para guardar tu progreso.' : (
                  <>
                    <Link href={loginHref} className="text-ambar-300 underline underline-offset-2">Ingresa</Link> para guardar tu progreso y retomar donde quedaste.
                  </>
                )}
              </p>
            ) : null}

            {/* Pestañas */}
            <div className="mt-10">
              <div role="tablist" aria-label="Contenido de la lección" className="scrollbar-none flex gap-1 overflow-x-auto border-b border-white/10">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    id={`tab-${t.id}`}
                    role="tab"
                    type="button"
                    aria-selected={tab === t.id}
                    aria-controls={`panel-${t.id}`}
                    tabIndex={tab === t.id ? 0 : -1}
                    onClick={() => setTab(t.id)}
                    onKeyDown={(e) => {
                      const i = TABS.findIndex((x) => x.id === tab);
                      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                        e.preventDefault();
                        const n = TABS[(i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length]!;
                        setTab(n.id);
                        document.getElementById(`tab-${n.id}`)?.focus();
                      }
                    }}
                    className={cn('relative shrink-0 px-4 py-3 text-sm font-semibold tracking-wide transition', tab === t.id ? 'text-[#c9dfa4]' : 'text-crema/55 hover:text-crema')}
                  >
                    {t.label}
                    {tab === t.id ? <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-[#c9dfa4]" aria-hidden /> : null}
                  </button>
                ))}
              </div>
              <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} className="max-w-3xl py-7">
                {tab === 'resumen' ? (
                  lesson.content ? (
                    <Markdown dark className="prose-p:text-crema/80 prose-strong:text-crema">{lesson.content}</Markdown>
                  ) : (
                    <p className="text-crema/60">Esta lección no tiene resumen escrito.</p>
                  )
                ) : null}
                {tab === 'recursos' ? (
                  lesson.resources.length ? (
                    <ul className="grid gap-3 sm:grid-cols-2">
                      {lesson.resources.map((r) => (
                        <li key={r.url}>
                          <a href={r.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-[#c9dfa4]/40">
                            <FileText className="size-5 text-[#c9dfa4]" aria-hidden />
                            <span className="flex-1 text-sm text-crema/90">{r.label}</span>
                            <Download className="size-4 text-crema/50" aria-hidden />
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-crema/60">Esta lección no tiene material descargable. Cuando el equipo publique guías o fichas, aparecerán aquí.</p>
                  )
                ) : null}
                {tab === 'notas' ? <LessonNotes lessonId={lesson.id} controls={controls} loggedIn={state.loggedIn} demo={state.demo} loginHref={loginHref} /> : null}
                {tab === 'tutor' ? (
                  <TutorChat lessonId={lesson.id} lessonTitle={lesson.title} courseSlug={course.slug} instructor={state.instructor} loggedIn={state.loggedIn} demo={state.demo} aiEnabled={state.ai} loginHref={loginHref} />
                ) : null}
              </div>
              <p className="hidden items-center gap-2 text-xs text-crema/40 lg:flex">
                <Keyboard className="size-3.5" aria-hidden /> Atajos: <kbd className="rounded border border-white/15 px-1">Espacio</kbd> reproducir/pausar · <kbd className="rounded border border-white/15 px-1">←</kbd>
                <kbd className="rounded border border-white/15 px-1">→</kbd> 10 s
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Drawer móvil */}
      <div className={cn('fixed inset-0 z-50 lg:hidden', drawer ? '' : 'pointer-events-none')} aria-hidden={!drawer}>
        <div className={cn('absolute inset-0 bg-black/60 transition-opacity', drawer ? 'opacity-100' : 'opacity-0')} onClick={() => setDrawer(false)} />
        <div
          id="temario-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Temario"
          className={cn('absolute inset-y-0 right-0 w-[min(380px,92vw)] overflow-y-auto bg-[#120c0a] px-5 py-5 shadow-elevada transition-transform duration-300', drawer ? 'translate-x-0' : 'translate-x-full')}
        >
          <div className="mb-5 flex items-center justify-between">
            <p className="font-display text-xl">Temario</p>
            <button type="button" onClick={() => setDrawer(false)} className="rounded-lg p-2 hover:bg-white/10" aria-label="Cerrar temario" tabIndex={drawer ? 0 : -1}>
              <X className="size-5" aria-hidden />
            </button>
          </div>
          {drawer ? syllabus : null}
        </div>
      </div>

      {celebrate ? <Celebration courseTitle={course.title} code={celebrate.code} onClose={() => setCelebrate(null)} /> : null}
    </div>
  );
}

function Celebration({ courseTitle, code, onClose }: { courseTitle: string; code: string | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog ref={ref} onClose={onClose} className="m-auto w-[min(520px,92vw)] overflow-hidden rounded-3xl bg-crema p-0 text-noche backdrop:bg-noche-950/80">
      <div className="relative bg-noche px-8 pt-10 pb-8 text-center text-crema">
        <div className="bg-andino absolute inset-0 opacity-20" aria-hidden />
        <style>{`@keyframes ct-confetti{0%{transform:translateY(-20px) rotate(0);opacity:0}15%{opacity:1}100%{transform:translateY(260px) rotate(540deg);opacity:0}}`}</style>
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden">
          {Array.from({ length: 22 }, (_, i) => (
            <span
              key={i}
              className="absolute top-0 block size-2"
              style={{ left: `${(i * 47) % 100}%`, background: ['#EB9A37', '#C9DFA4', '#F8F3EA'][i % 3], animation: `ct-confetti ${1.8 + (i % 4) * 0.35}s ${(i % 7) * 0.15}s ease-in infinite` }}
            />
          ))}
        </div>
        <PartyPopper className="relative mx-auto size-12 text-ambar" aria-hidden />
        <h2 className="relative mt-4 font-display text-3xl text-crema">¡Completaste el curso!</h2>
        <p className="relative mt-2 text-crema/75">«{courseTitle}» ya es parte de tu travesía. Ahora sí: que el próximo café sea de verdad.</p>
      </div>
      <div className="space-y-3 p-7">
        {code ? (
          <>
            <Link href={`/certificados/${code}`} className="btn-primary w-full py-3.5">
              <Award className="size-4" aria-hidden /> Ver mi certificado
            </Link>
            <a href={`/api/certificates/${code}`} target="_blank" rel="noopener" className="btn-outline w-full">
              <Download className="size-4" aria-hidden /> Descargar PDF
            </a>
          </>
        ) : (
          <Link href="/cuenta/cursos" className="btn-primary w-full py-3.5">
            Ir a mis cursos
          </Link>
        )}
        <button type="button" onClick={onClose} className="btn-ghost w-full">
          Seguir repasando
        </button>
      </div>
    </dialog>
  );
}
