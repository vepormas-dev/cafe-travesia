import { Suspense } from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, Lock } from 'lucide-react';
import { getSessionUser } from '@/lib/auth';
import { getLessonForUser, getPassedQuizIds, instructorPersona } from '@/lib/academy';
import { isAiConfigured, isDemoMode } from '@/lib/env';
import { BrandIcon } from '@/components/brand/logo';
import { LessonPlayer, type PlayerCourse } from '@/components/academy/lesson-player';
import { AccessActions } from '@/components/academy/enroll-actions';
import { courseLite, firstLessonOf, previewLessonOf } from '@/components/academy/access-panel';

type Props = { params: Promise<{ slug: string; lessonId: string }> };

export const metadata: Metadata = { title: 'Reproductor · Academia', robots: { index: false, follow: false } };

export default function LessonPage({ params }: Props) {
  return (
    <Suspense fallback={<PlayerSkeleton />}>
      <Player params={params} />
    </Suspense>
  );
}

async function Player({ params }: Props) {
  const { slug, lessonId } = await params;
  const user = await getSessionUser();
  const r = await getLessonForUser(user, lessonId);
  if (r.status === 404) notFound();
  if (r.course && r.course.slug !== slug) redirect(`/academia/aprender/${r.course.slug}/${lessonId}`);

  if (r.status !== 200) {
    const course = r.course!;
    return (
      <div className="relative isolate flex min-h-[80vh] items-center overflow-hidden bg-[#120c0a] py-20 text-crema">
        {course.coverUrl ? <Image src={course.coverUrl} alt="" fill sizes="100vw" className="-z-20 object-cover opacity-25 blur-sm" /> : null}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#120c0a]/70 to-[#120c0a]" aria-hidden />
        <div className="container-site max-w-xl text-center">
          <span className="mx-auto flex size-16 items-center justify-center rounded-2xl border border-white/15 bg-white/5">
            <Lock className="size-7 text-ambar-300" aria-hidden />
          </span>
          <p className="mt-6 text-[0.72rem] font-semibold tracking-[0.2em] text-crema/55 uppercase">{course.title}</p>
          <h1 className="mt-3 font-display text-3xl text-crema sm:text-4xl">{r.lessonTitle}</h1>
          <p className="mt-4 text-crema/70">{r.status === 401 ? 'Esta lección es parte del curso completo. Ingresa con tu cuenta para continuar o inscribirte.' : 'Esta lección está disponible para los estudiantes inscritos en el curso.'}</p>
          <div className="mx-auto mt-8 max-w-sm text-left">
            {r.status === 401 && !course.isFree ? (
              <Link href={`/ingresar?next=${encodeURIComponent(`/academia/aprender/${slug}/${lessonId}`)}`} className="btn-ambar mb-3 w-full py-3.5">
                Ingresar
              </Link>
            ) : null}
            {r.access ? <AccessActions course={courseLite(course)} access={r.access} firstLessonId={firstLessonOf(course)} previewLessonId={previewLessonOf(course)} /> : null}
          </div>
          <Link href={`/academia/cursos/${course.slug}`} className="mt-8 inline-flex items-center gap-2 text-sm text-crema/60 hover:text-crema">
            <ArrowLeft className="size-4" aria-hidden /> Ver el temario del curso
          </Link>
        </div>
      </div>
    );
  }

  const { lesson, course, content, access, progress } = r;
  const quizIds = content.quizzes.map((q) => q.id);
  const passed = await getPassedQuizIds(user, quizIds);
  const playerCourse: PlayerCourse = {
    id: course.id,
    slug: course.slug,
    title: course.title,
    coverUrl: course.coverUrl,
    instructorName: course.instructorName,
    modules: (course.modules ?? []).map((m) => ({
      id: m.id,
      title: m.title,
      quizId: m.quizId ?? null,
      lessons: m.lessons.map((l) => ({ id: l.id, title: l.title, durationS: l.durationS, isPreview: l.isPreview })),
    })),
  };
  return (
    <LessonPlayer
      key={lesson.id}
      course={playerCourse}
      lesson={lesson}
      state={{
        loggedIn: Boolean(user),
        enrolled: access.enrolled,
        canTrack: Boolean(user) && !isDemoMode() && (access.enrolled || access.canEnrollFree),
        demo: isDemoMode(),
        ai: isAiConfigured(),
        instructor: instructorPersona(course).name,
        completedIds: progress.filter((p) => p.completed).map((p) => p.lessonId),
        passedQuizIds: passed,
        courseCompleted: access.completed,
        certificateCode: access.certificateCode,
      }}
    />
  );
}

function PlayerSkeleton() {
  return (
    <div className="min-h-screen bg-[#120c0a]" aria-busy="true" aria-label="Cargando lección">
      <div className="mx-auto grid max-w-[1500px] lg:grid-cols-[340px_1fr]">
        <div className="hidden space-y-3 border-r border-white/10 p-6 lg:block">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-white/5" />
          ))}
        </div>
        <div className="lg:p-8">
          <div className="flex aspect-video items-center justify-center bg-black/60 lg:rounded-2xl">
            <BrandIcon name="maquina-espresso" className="size-14 animate-pulse text-ambar/60" />
          </div>
          <div className="space-y-3 p-6">
            <div className="h-4 w-32 animate-pulse rounded bg-white/10" />
            <div className="h-9 w-2/3 animate-pulse rounded bg-white/10" />
          </div>
        </div>
      </div>
    </div>
  );
}
