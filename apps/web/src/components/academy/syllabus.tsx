import Link from 'next/link';
import { ChevronDown, ClipboardCheck, Lock, PlayCircle } from 'lucide-react';
import type { CourseDTO } from '@travesia/shared';
import { formatDuration } from '@travesia/shared';
import { lessonDuration } from './course-meta';

/** Temario (módulos → lecciones con duración). Las lecciones preview quedan abiertas. */
export function Syllabus({ course }: { course: CourseDTO }) {
  const modules = course.modules ?? [];
  const total = modules.reduce((n, m) => n + m.lessons.reduce((s, l) => s + l.durationS, 0), 0);
  return (
    <div>
      <p className="text-sm text-gris">
        {modules.length} módulos · {course.lessonsCount} lecciones · {formatDuration(total)} de video
      </p>
      <div className="mt-4 divide-y divide-noche/10 overflow-hidden rounded-2xl border border-noche/10 bg-hueso">
        {modules.map((m, mi) => {
          const dur = m.lessons.reduce((s, l) => s + l.durationS, 0);
          return (
            <details key={m.id} open={mi === 0} className="group">
              <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-4 transition hover:bg-arena/50 [&::-webkit-details-marker]:hidden">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-noche font-display text-sm text-crema">{mi + 1}</span>
                <span className="flex-1">
                  <span className="block font-display text-lg text-noche">{m.title}</span>
                  <span className="text-xs text-gris">
                    {m.lessons.length} lecciones · {formatDuration(dur)}
                    {m.quizId ? ' · evaluación' : ''}
                  </span>
                </span>
                <ChevronDown className="size-5 text-noche/60 transition group-open:rotate-180" aria-hidden />
              </summary>
              <ol className="border-t border-noche/5 bg-white/60 px-5 py-2">
                {m.lessons.map((l, li) => (
                  <li key={l.id} className="flex items-center gap-3 py-2.5 text-sm">
                    {l.isPreview ? <PlayCircle className="size-4 shrink-0 text-montana" aria-hidden /> : <Lock className="size-4 shrink-0 text-noche/35" aria-hidden />}
                    <span className="w-6 shrink-0 text-xs text-gris tabular-nums">{`${mi + 1}.${li + 1}`}</span>
                    {l.isPreview ? (
                      <Link href={`/academia/aprender/${course.slug}/${l.id}`} className="flex-1 font-medium text-noche underline decoration-hoja/60 underline-offset-4 hover:decoration-hoja">
                        {l.title}
                      </Link>
                    ) : (
                      <span className="flex-1 text-noche/80">{l.title}</span>
                    )}
                    {l.isPreview ? <span className="rounded-full bg-[#e5efd3] px-2 py-0.5 text-[0.65rem] font-bold tracking-wider text-montana uppercase">Vista previa</span> : null}
                    <span className="text-xs text-gris tabular-nums">{lessonDuration(l.durationS)}</span>
                  </li>
                ))}
                {m.quizId ? (
                  <li className="flex items-center gap-3 py-2.5 text-sm text-noche/80">
                    <ClipboardCheck className="size-4 shrink-0 text-ambar-700" aria-hidden />
                    <span className="w-6 shrink-0" />
                    <span className="flex-1">Evaluación del módulo</span>
                    <span className="text-xs text-gris">Necesaria para el certificado</span>
                  </li>
                ) : null}
              </ol>
            </details>
          );
        })}
      </div>
    </div>
  );
}
