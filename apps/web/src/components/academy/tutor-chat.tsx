'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowUp, BookOpen, Loader2, RotateCcw, Sparkles } from 'lucide-react';
import { Markdown } from '@/components/ui/primitives';
import { cn } from '@/lib/cn';

type Msg = { role: 'user' | 'assistant'; content: string; lessons?: { id: string; title: string }[]; ai?: boolean; error?: boolean };

/** Tutor ✨: chat con /api/ai/tutor sobre la lección actual (historial, sugerencias, lecciones citadas). */
export function TutorChat({
  lessonId,
  lessonTitle,
  courseSlug,
  instructor,
  loggedIn,
  demo,
  aiEnabled,
  loginHref,
}: {
  lessonId: string;
  lessonTitle: string;
  courseSlug: string;
  instructor: string;
  loggedIn: boolean;
  demo: boolean;
  aiEnabled: boolean;
  loginHref: string;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const storeKey = `ct-tutor:${lessonId}`;

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(storeKey);
      setMessages(saved ? (JSON.parse(saved) as Msg[]) : []);
    } catch {
      setMessages([]);
    }
  }, [storeKey]);
  useEffect(() => {
    try {
      sessionStorage.setItem(storeKey, JSON.stringify(messages.slice(-20)));
    } catch {
      /* sin almacenamiento */
    }
    endRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [messages, storeKey]);

  const suggestions = [`Explícame «${lessonTitle}» en 3 puntos`, '¿Cuál es el error más común en este tema?', '¿Cómo lo aplico en casa con lo que tengo?'];

  const ask = async (q: string) => {
    const question = q.trim();
    if (!question || busy) return;
    const history = messages.filter((m) => !m.error).slice(-8).map(({ role, content }) => ({ role, content: content.slice(0, 4000) }));
    setMessages((m) => [...m, { role: 'user', content: question }]);
    setInput('');
    setBusy(true);
    try {
      const res = await fetch('/api/ai/tutor', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ lessonId, question, history }) });
      const data = (await res.json().catch(() => ({}))) as { answer?: string; lessons?: { id: string; title: string }[]; ai?: boolean; error?: string };
      if (!res.ok || !data.answer) throw new Error(res.status === 429 ? 'Vas muy rápido: espera un momento y vuelve a preguntar.' : (data.error ?? 'El tutor no está disponible en este momento.'));
      setMessages((m) => [...m, { role: 'assistant', content: data.answer!, lessons: data.lessons, ai: data.ai }]);
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', content: e instanceof Error ? e.message : 'El tutor no está disponible.', error: true }]);
    } finally {
      setBusy(false);
    }
  };

  if (demo || !loggedIn)
    return (
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-ambar/10 to-transparent p-5">
        <p className="flex items-center gap-2 font-display text-xl text-crema">
          <Sparkles className="size-5 text-ambar-300" aria-hidden /> Tutor de {instructor}
        </p>
        <p className="mt-2 text-sm text-crema/75">
          {demo ? 'En modo demo el tutor está desactivado: se habilita al conectar la base de datos y la sesión de estudiantes.' : 'Pregúntale lo que quieras sobre esta lección: responde con el contenido del curso y te sugiere qué repasar.'}
        </p>
        {!demo ? (
          <Link href={loginHref} className="btn-ambar btn-sm mt-4">
            Ingresar para preguntar
          </Link>
        ) : null}
      </div>
    );

  return (
    <div className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03]">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-crema">
          <Sparkles className="size-4 text-ambar-300" aria-hidden /> Tutor · estilo {instructor}
        </p>
        {messages.length ? (
          <button type="button" onClick={() => setMessages([])} className="inline-flex items-center gap-1 text-xs text-crema/50 hover:text-crema">
            <RotateCcw className="size-3" aria-hidden /> Nueva conversación
          </button>
        ) : null}
      </div>
      {!aiEnabled ? (
        <p className="mx-4 mt-3 flex gap-2 rounded-lg bg-ambar/10 px-3 py-2 text-xs text-ambar-100">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden /> El tutor con IA no está activo: te respondo con los fragmentos más relevantes del curso.
        </p>
      ) : null}
      <div className="max-h-[460px] min-h-[180px] space-y-4 overflow-y-auto px-4 py-4" aria-live="polite">
        {messages.length === 0 ? (
          <div>
            <p className="text-sm text-crema/70">¿Qué te gustaría entender mejor? Algunas ideas:</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button key={s} type="button" onClick={() => ask(s)} className="rounded-full border border-white/15 px-3 py-1.5 text-left text-xs text-crema/85 transition hover:border-ambar hover:text-ambar-300">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {messages.map((m, i) => (
          <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div
              className={cn(
                'max-w-[88%] rounded-2xl px-4 py-3 text-sm',
                m.role === 'user' ? 'rounded-br-sm bg-ambar text-noche' : m.error ? 'rounded-bl-sm border border-cereza/40 bg-cereza/15 text-[#f3c3bd]' : 'rounded-bl-sm bg-white/[0.06] text-crema/90',
              )}
            >
              {m.role === 'assistant' && !m.error ? <Markdown dark className="prose-sm [&_blockquote]:text-crema/80 [&_p]:my-1.5">{m.content}</Markdown> : <p className="whitespace-pre-wrap">{m.content}</p>}
              {m.lessons?.length ? (
                <div className="mt-3 border-t border-white/10 pt-2">
                  <p className="text-[0.68rem] font-semibold tracking-wider text-crema/50 uppercase">Lecciones sugeridas</p>
                  <ul className="mt-1 space-y-1">
                    {m.lessons.map((l) => (
                      <li key={l.id}>
                        <Link href={`/academia/aprender/${courseSlug}/${l.id}`} className="inline-flex items-center gap-1.5 text-xs font-medium text-[#c9dfa4] hover:underline">
                          <BookOpen className="size-3" aria-hidden /> {l.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {m.role === 'assistant' && m.ai === false && !m.error ? <p className="mt-2 text-[0.68rem] text-crema/40">Respuesta por búsqueda en el curso</p> : null}
            </div>
          </div>
        ))}
        {busy ? (
          <p className="flex items-center gap-2 text-xs text-crema/60">
            <Loader2 className="size-3.5 animate-spin" aria-hidden /> {instructor} está pensando…
          </p>
        ) : null}
        <div ref={endRef} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void ask(input);
        }}
        className="flex items-end gap-2 border-t border-white/10 p-3"
      >
        <label htmlFor="tutor-q" className="sr-only">
          Pregunta al tutor
        </label>
        <textarea
          id="tutor-q"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void ask(input);
            }
          }}
          rows={1}
          maxLength={1000}
          placeholder="Escribe tu pregunta…"
          className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-crema placeholder:text-crema/40 focus:border-ambar focus:outline-none"
        />
        <button type="submit" disabled={busy || input.trim().length < 2} className="flex size-11 items-center justify-center rounded-xl bg-ambar text-noche transition hover:bg-ambar-300 disabled:opacity-40" aria-label="Enviar pregunta">
          <ArrowUp className="size-5" aria-hidden />
        </button>
      </form>
    </div>
  );
}
