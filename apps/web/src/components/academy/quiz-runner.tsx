'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Award, CheckCircle2, LayoutList, Loader2, RotateCcw, Square, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/cn';

type Quiz = { id: string; title: string; passScore: number; questions: { id: string; prompt: string; options: string[] }[] };
type Result = { score: number; passed: boolean; passScore: number; results: { correct: boolean; explanation: string | null }[]; certificateCode?: string; courseCompleted?: boolean };

/** Evaluación: una pregunta a la vez o todas, envío al servidor y resultados con explicación. */
export function QuizRunner({ quiz, courseSlug, backHref, demo, lastAttempt }: { quiz: Quiz; courseSlug: string; backHref: string; demo: boolean; lastAttempt: { score: number; passed: boolean } | null }) {
  const router = useRouter();
  const n = quiz.questions.length;
  const [answers, setAnswers] = useState<(number | null)[]>(() => Array(n).fill(null));
  const [i, setI] = useState(0);
  const [all, setAll] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const answered = answers.filter((a) => a !== null).length;

  const submit = async () => {
    if (answered < n) {
      toast.info('Responde todas las preguntas antes de enviar');
      const first = answers.findIndex((a) => a === null);
      if (first >= 0) setI(first);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/v1/quizzes/${quiz.id}/submit`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ answers }) });
      const data = (await res.json().catch(() => ({}))) as Result & { error?: string };
      if (res.status === 503) throw new Error('Modo demo: la calificación se habilita al conectar la base de datos.');
      if (!res.ok) throw new Error(data.error ?? 'No pudimos calificar tu evaluación');
      setResult(data);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No pudimos calificar tu evaluación');
    } finally {
      setBusy(false);
    }
  };
  const retry = () => {
    setAnswers(Array(n).fill(null));
    setResult(null);
    setI(0);
  };

  const question = (qi: number) => {
    const q = quiz.questions[qi]!;
    const r = result?.results[qi];
    return (
      <fieldset key={quiz.questions[qi]!.id} className={cn('rounded-2xl border p-5 sm:p-7', r ? (r.correct ? 'border-[#c9dfa4]/40 bg-[#c9dfa4]/[0.06]' : 'border-cereza/40 bg-cereza/[0.08]') : 'border-white/10 bg-white/[0.03]')}>
        <legend className="sr-only">Pregunta {qi + 1}</legend>
        <p className="text-[0.7rem] font-semibold tracking-[0.18em] text-crema/50 uppercase">
          Pregunta {qi + 1} de {n}
        </p>
        <p className="mt-2 font-display text-xl leading-snug text-crema sm:text-2xl">{q.prompt}</p>
        <div className="mt-5 grid gap-2.5" role="radiogroup">
          {q.options.map((o, oi) => {
            const selected = answers[qi] === oi;
            return (
              <label
                key={oi}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3.5 text-sm transition',
                  selected ? 'border-ambar bg-ambar/15 text-crema' : 'border-white/10 text-crema/85 hover:border-white/30',
                  result && 'cursor-default',
                )}
              >
                <input
                  type="radio"
                  name={`q-${q.id}`}
                  className="sr-only"
                  checked={selected}
                  disabled={Boolean(result)}
                  onChange={() => setAnswers((a) => a.map((x, k) => (k === qi ? oi : x)))}
                />
                <span className={cn('flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold', selected ? 'border-ambar bg-ambar text-noche' : 'border-white/25 text-crema/60')}>{String.fromCharCode(65 + oi)}</span>
                {o}
              </label>
            );
          })}
        </div>
        {r ? (
          <p className={cn('mt-4 flex gap-2 text-sm', r.correct ? 'text-[#c9dfa4]' : 'text-[#f3b0a8]')}>
            {r.correct ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden /> : <XCircle className="mt-0.5 size-4 shrink-0" aria-hidden />}
            <span>
              <strong>{r.correct ? 'Correcto.' : 'Incorrecto.'}</strong> {r.explanation}
            </span>
          </p>
        ) : null}
      </fieldset>
    );
  };

  return (
    <div>
      {result ? (
        <div className={cn('mb-8 overflow-hidden rounded-3xl border p-7 text-center sm:p-10', result.passed ? 'border-[#c9dfa4]/30 bg-gradient-to-br from-montana/40 to-transparent' : 'border-cereza/30 bg-gradient-to-br from-cereza/25 to-transparent')} role="status">
          <div className="mx-auto flex size-28 items-center justify-center rounded-full border-4 border-current/20" style={{ background: `conic-gradient(${result.passed ? '#c9dfa4' : '#eb9a37'} ${result.score * 3.6}deg, rgb(255 255 255 / 0.08) 0)` }}>
            <span className="flex size-[5.5rem] items-center justify-center rounded-full bg-[#120c0a] font-display text-3xl text-crema">{result.score}%</span>
          </div>
          <h2 className="mt-5 font-display text-3xl text-crema">{result.passed ? '¡Aprobaste!' : 'Casi, casi'}</h2>
          <p className="mt-2 text-crema/70">
            {result.results.filter((r) => r.correct).length} de {n} correctas · Nota mínima {result.passScore}%
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {result.certificateCode ? (
              <Link href={`/certificados/${result.certificateCode}`} className="btn-ambar">
                <Award className="size-4" aria-hidden /> ¡Curso completo! Ver mi certificado
              </Link>
            ) : null}
            {!result.passed ? (
              <button type="button" onClick={retry} className="btn-ambar">
                <RotateCcw className="size-4" aria-hidden /> Reintentar
              </button>
            ) : null}
            <Link href={backHref} className="btn-light">
              Volver al curso
            </Link>
          </div>
        </div>
      ) : (
        <div className="mb-6">
          {lastAttempt ? (
            <p className="mb-4 text-sm text-crema/60">
              Último intento: {lastAttempt.score}% · {lastAttempt.passed ? 'aprobado' : 'no aprobado'}
            </p>
          ) : null}
          {demo ? <p className="mb-4 rounded-xl border border-ambar/30 bg-ambar/10 px-4 py-3 text-sm text-crema/85"><strong className="text-ambar-300">Modo demo.</strong> Puedes responder, pero la calificación se habilita al conectar la base de datos.</p> : null}
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-crema/60">
              {answered}/{n} respondidas
            </span>
            <button type="button" onClick={() => setAll((v) => !v)} className="inline-flex items-center gap-1.5 text-sm text-crema/70 hover:text-crema">
              {all ? <Square className="size-4" aria-hidden /> : <LayoutList className="size-4" aria-hidden />} {all ? 'Una a la vez' : 'Ver todas'}
            </button>
          </div>
          <div className="mt-3 flex gap-1.5" aria-hidden>
            {quiz.questions.map((q, k) => (
              <button key={q.id} type="button" tabIndex={-1} onClick={() => setI(k)} className={cn('h-1.5 flex-1 rounded-full transition', answers[k] !== null ? 'bg-ambar' : 'bg-white/15', !all && k === i && 'ring-2 ring-crema/60 ring-offset-2 ring-offset-[#120c0a]')} />
            ))}
          </div>
        </div>
      )}

      <div className="space-y-5">{all || result ? quiz.questions.map((_q, qi) => question(qi)) : question(i)}</div>

      {!result ? (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {!all ? (
            <>
              <button type="button" onClick={() => setI((v) => Math.max(0, v - 1))} disabled={i === 0} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-crema/85 hover:bg-white/5 disabled:opacity-40">
                <ArrowLeft className="size-4" aria-hidden /> Anterior
              </button>
              {i < n - 1 ? (
                <button type="button" onClick={() => setI((v) => Math.min(n - 1, v + 1))} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-crema hover:bg-white/5">
                  Siguiente <ArrowRight className="size-4" aria-hidden />
                </button>
              ) : null}
            </>
          ) : null}
          {all || i === n - 1 ? (
            <button type="button" onClick={submit} disabled={busy} className="btn-ambar ml-auto">
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null} Enviar respuestas
            </button>
          ) : null}
        </div>
      ) : null}
      <p className="mt-10 text-center text-xs text-crema/40">
        <Link href={`/academia/cursos/${courseSlug}`} className="hover:text-crema/70">
          Ver temario del curso
        </Link>
      </p>
    </div>
  );
}
