import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, ClipboardCheck, Lock } from 'lucide-react';
import { getSessionUser } from '@/lib/auth';
import { getQuizForUser } from '@/lib/academy';
import { isDemoMode } from '@/lib/env';
import { QuizRunner } from '@/components/academy/quiz-runner';

type Props = { params: Promise<{ slug: string; quizId: string }> };

export const metadata: Metadata = { title: 'Evaluación · Academia', robots: { index: false, follow: false } };

export default function QuizPage({ params }: Props) {
  return (
    <div className="min-h-[80vh] bg-[#120c0a] py-10 text-crema sm:py-14">
      <div className="mx-auto w-full max-w-3xl px-5">
        <Suspense
          fallback={
            <div className="space-y-4" aria-busy="true">
              <div className="h-5 w-40 animate-pulse rounded bg-white/10" />
              <div className="h-10 w-2/3 animate-pulse rounded bg-white/10" />
              <div className="h-64 animate-pulse rounded-2xl bg-white/5" />
            </div>
          }
        >
          <Quiz params={params} />
        </Suspense>
      </div>
    </div>
  );
}

async function Quiz({ params }: Props) {
  const { slug, quizId } = await params;
  const user = await getSessionUser();
  const r = await getQuizForUser(user, quizId);
  if (r.status === 404) notFound();
  if (r.course && r.course.slug !== slug) redirect(`/academia/aprender/${r.course.slug}/evaluacion/${quizId}`);
  const course = r.course!;
  const mod = course.modules?.find((m) => m.quizId === quizId);
  const lastLesson = mod?.lessons.at(-1);
  const backHref = lastLesson ? `/academia/aprender/${course.slug}/${lastLesson.id}` : `/academia/cursos/${course.slug}`;

  if (r.status !== 200) {
    return (
      <div className="py-16 text-center">
        <Lock className="mx-auto size-10 text-ambar-300" aria-hidden />
        <h1 className="mt-5 font-display text-3xl text-crema">Evaluación de «{course.title}»</h1>
        <p className="mt-3 text-crema/70">{r.error}.</p>
        <Link href={r.status === 401 ? `/ingresar?next=${encodeURIComponent(`/academia/aprender/${slug}/evaluacion/${quizId}`)}` : `/academia/cursos/${course.slug}`} className="btn-ambar mt-8">
          {r.status === 401 ? 'Ingresar' : 'Ver el curso'}
        </Link>
      </div>
    );
  }

  return (
    <>
      <Link href={backHref} className="inline-flex items-center gap-2 text-sm text-crema/60 hover:text-crema">
        <ArrowLeft className="size-4" aria-hidden /> {course.title}
      </Link>
      <div className="mt-6 mb-8 flex items-start gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-ambar/15 text-ambar-300">
          <ClipboardCheck className="size-6" aria-hidden />
        </span>
        <div>
          <p className="text-[0.72rem] font-semibold tracking-[0.18em] text-[#c9dfa4] uppercase">{mod ? `Módulo · ${mod.title}` : 'Evaluación'}</p>
          <h1 className="mt-1 font-display text-3xl text-crema sm:text-4xl">{r.quiz.title}</h1>
          <p className="mt-2 text-sm text-crema/60">
            {r.quiz.questions.length} preguntas · Apruebas con {r.quiz.passScore}% · Puedes reintentarla las veces que quieras
          </p>
        </div>
      </div>
      <QuizRunner quiz={r.quiz} courseSlug={course.slug} backHref={backHref} demo={isDemoMode()} lastAttempt={r.lastAttempt} />
    </>
  );
}
