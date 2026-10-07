import { Award, BookOpen, Clock, MessageCircleQuestion, Smartphone, Sparkles } from 'lucide-react';
import type { CourseAccessDTO, CourseDTO } from '@travesia/shared';
import { getSessionUser } from '@/lib/auth';
import { getAccess } from '@/lib/academy';
import { CoursePrice, courseDuration, ProgressBar } from './course-meta';
import { AccessActions, type CourseLite } from './enroll-actions';

export const courseLite = (c: CourseDTO): CourseLite => ({ id: c.id, slug: c.slug, title: c.title, coverUrl: c.coverUrl, priceCop: c.priceCop, includedInSubscription: c.includedInSubscription, isFree: c.isFree });
export const firstLessonOf = (c: CourseDTO) => c.modules?.[0]?.lessons[0]?.id ?? null;
export const previewLessonOf = (c: CourseDTO) => c.modules?.flatMap((m) => m.lessons).find((l) => l.isPreview)?.id ?? null;

const REASON_NOTE: Record<CourseAccessDTO['reason'], string | null> = {
  enrolled: null,
  free: 'Curso gratuito: inscríbete y empieza ya.',
  subscription: 'Incluido en tu suscripción Maestro Premium.',
  login_required: 'Curso gratuito: crea tu cuenta o ingresa para inscribirte.',
  purchase_required: null,
};

function Includes({ course }: { course: CourseDTO }) {
  const items = [
    { icon: BookOpen, text: `${course.lessonsCount} lecciones en video` },
    { icon: Clock, text: `${courseDuration(course.durationMin)} de contenido` },
    { icon: Sparkles, text: 'Tutor con IA en cada lección' },
    { icon: Award, text: 'Certificado verificable al finalizar' },
    { icon: Smartphone, text: 'Aprende en la web y en la app' },
    { icon: MessageCircleQuestion, text: 'Evaluaciones con retroalimentación' },
  ];
  return (
    <ul className="mt-6 space-y-2.5 border-t border-white/10 pt-5 text-sm text-crema/75">
      {items.map(({ icon: I, text }) => (
        <li key={text} className="flex items-center gap-2.5">
          <I className="size-4 text-[#a9c97a]" aria-hidden /> {text}
        </li>
      ))}
    </ul>
  );
}

/** Panel de precio + CTA según acceso del usuario (lee la sesión: va dentro de <Suspense>). */
export async function AccessPanel({ course }: { course: CourseDTO }) {
  const user = await getSessionUser();
  const access = await getAccess(user, course);
  return <AccessPanelView course={course} access={access} />;
}

export function AccessPanelView({ course, access }: { course: CourseDTO; access: CourseAccessDTO | null }) {
  const note = access ? REASON_NOTE[access.reason] : null;
  return (
    <div className="rounded-3xl border border-white/10 bg-noche-950 p-6 text-crema shadow-elevada sm:p-7">
      {access?.enrolled ? (
        <div>
          <p className="eyebrow text-[#a9c97a]">{access.completed ? 'Curso completado' : 'Estás inscrito'}</p>
          <p className="mt-2 font-display text-3xl">{access.progressPct}%</p>
          <ProgressBar value={access.progressPct} className="mt-3 text-crema" label="Progreso del curso" />
        </div>
      ) : (
        <div>
          <p className="eyebrow text-ambar-300">{course.isFree ? 'Acceso libre' : 'Inversión'}</p>
          <CoursePrice course={course} dark className="mt-2 items-start text-3xl [&_s]:text-base" showIncluded={false} />
          {course.includedInSubscription && !course.isFree ? <p className="mt-2 text-sm text-ambar-300">o incluido en Maestro Premium</p> : null}
        </div>
      )}
      {note ? <p className="mt-3 text-sm text-crema/70">{note}</p> : null}
      <div className="mt-6">
        {access ? (
          <AccessActions course={courseLite(course)} access={access} firstLessonId={firstLessonOf(course)} previewLessonId={previewLessonOf(course)} />
        ) : (
          <div className="grid gap-2.5" aria-hidden>
            <div className="h-12 animate-pulse rounded-full bg-white/15" />
            <div className="h-11 animate-pulse rounded-full bg-white/10" />
          </div>
        )}
      </div>
      <Includes course={course} />
    </div>
  );
}
