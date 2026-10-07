import Image from 'next/image';
import Link from 'next/link';
import { Play } from 'lucide-react';
import { getSessionUser } from '@/lib/auth';
import { listMyLearning } from '@/lib/academy';
import { ProgressBar } from './course-meta';

/** "Continuar aprendiendo" (solo con sesión y cursos en progreso). Va dentro de <Suspense>. */
export async function ContinueLearning() {
  const user = await getSessionUser();
  if (!user) return null;
  const { enrollments } = await listMyLearning(user).catch(() => ({ enrollments: [] }));
  const active = enrollments.filter((e) => e.status === 'active').slice(0, 3);
  if (!active.length) return null;
  return (
    <section aria-labelledby="continuar" className="bg-noche-950 pt-12 text-crema">
      <div className="container-site">
        <p id="continuar" className="text-[0.72rem] font-semibold tracking-[0.22em] text-crema/55 uppercase">
          Continuar aprendiendo{user.fullName ? ` · Hola, ${user.fullName.split(' ')[0]}` : ''}
        </p>
        <ul className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {active.map((e) => {
            const next = e.lastLessonId ?? '';
            const href = next ? `/academia/aprender/${e.course.slug}/${next}` : `/academia/cursos/${e.course.slug}`;
            return (
              <li key={e.course.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
                <div className="relative h-40">
                  {e.course.coverUrl ? <Image src={e.course.coverUrl} alt="" fill sizes="(min-width: 1024px) 30vw, 90vw" className="object-cover" /> : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-noche-950 via-noche-950/40 to-transparent" aria-hidden />
                  <div className="absolute right-4 bottom-3 left-4">
                    <span className="rounded-full bg-montana px-2 py-0.5 text-[0.65rem] font-semibold text-white">En curso</span>
                    <span className="ml-2 text-xs text-crema/70">{e.progressPct}% completado</span>
                    <h3 className="mt-1.5 font-display text-xl text-crema">{e.course.title}</h3>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4">
                  <ProgressBar value={e.progressPct} className="flex-1 text-crema" label={`Progreso en ${e.course.title}`} />
                  <Link href={href} className="btn btn-sm bg-crema text-noche hover:bg-white">
                    Continuar <Play className="size-3 fill-current" aria-hidden />
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
