import { Suspense } from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { connection } from 'next/server';
import { Award, BadgeCheck, Download, ExternalLink, GraduationCap, PlayCircle } from 'lucide-react';
import { formatDate } from '@travesia/shared';
import { requireUser } from '@/lib/auth';
import { listMyLearning, type MyEnrollment } from '@/lib/academy';
import { isDemoMode } from '@/lib/env';
import { BrandIcon } from '@/components/brand/logo';
import { DemoNotice } from '@/components/ui/primitives';
import { LevelBadge, ProgressBar } from '@/components/academy/course-meta';
import { RecommendedCourses } from '@/components/academy/recommended-courses';

export const metadata: Metadata = { title: 'Mis cursos y certificados', robots: { index: false, follow: false } };

export default function MisCursosPage() {
  return (
    <div>
      <header className="max-w-2xl">
        <h1 className="title-lg">Mis cursos</h1>
        <p className="mt-3 text-noche/70">Continúa tu viaje hacia la taza perfecta. Aquí están tus cursos activos y los certificados que has ganado.</p>
      </header>
      <Suspense fallback={<MyCoursesSkeleton />}>
        <MyCourses />
      </Suspense>
    </div>
  );
}

async function MyCourses() {
  await connection();
  if (isDemoMode()) {
    return (
      <div className="mt-8 space-y-6">
        <DemoNotice>Tus cursos, progreso y certificados aparecen aquí cuando la base de datos está conectada.</DemoNotice>
        <div className="card flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center">
          <Award className="size-10 text-ambar-700" aria-hidden />
          <p className="flex-1 text-sm text-noche/80">Mira cómo luce un certificado de la Academia, con su código de verificación pública.</p>
          <Link href="/certificados/DEMO" className="btn-outline btn-sm">
            Ver certificado de muestra
          </Link>
        </div>
        <EmptyCourses />
      </div>
    );
  }
  const user = await requireUser('/cuenta/cursos');
  const { enrollments, certificates } = await listMyLearning(user);
  const active = enrollments.filter((e) => e.status === 'active');
  const done = enrollments.filter((e) => e.status === 'completed');
  const certBySlug = new Map(certificates.map((c) => [c.courseSlug, c]));

  return (
    <div className="mt-10 space-y-14">
      <section aria-labelledby="en-curso">
        <h2 id="en-curso" className="font-display text-2xl">Cursos en curso</h2>
        {active.length ? (
          <ul className="mt-5 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {active.map((e) => (
              <li key={e.course.id}>
                <CourseProgressCard e={e} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-5">
            <EmptyCourses />
          </div>
        )}
      </section>

      {done.length ? (
        <section aria-labelledby="completados">
          <h2 id="completados" className="font-display text-2xl">Completados</h2>
          <ul className="mt-5 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {done.map((e) => {
              const cert = certBySlug.get(e.course.slug);
              return (
                <li key={e.course.id} className="flex h-full flex-col overflow-hidden rounded-2xl border border-noche/10 bg-arena/60">
                  <div className="relative aspect-[16/9]">
                    {e.course.coverUrl ? <Image src={e.course.coverUrl} alt="" fill sizes="(min-width: 1280px) 30vw, 45vw" className="object-cover grayscale" /> : null}
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-display text-lg leading-snug">{e.course.title}</h3>
                      <BadgeCheck className="size-6 shrink-0 text-montana" aria-label="Completado" />
                    </div>
                    <p className="mt-2 text-sm text-gris">Completado el {formatDate(e.completedAt)}</p>
                    <div className="mt-auto flex flex-wrap gap-2 pt-5">
                      {cert ? (
                        <a href={`/api/certificates/${cert.code}?descargar=1`} className="btn btn-sm border border-montana text-montana hover:bg-montana hover:text-white">
                          <Download className="size-4" aria-hidden /> Descargar certificado
                        </a>
                      ) : null}
                      <Link href={`/academia/cursos/${e.course.slug}`} className="btn-ghost btn-sm">
                        Repasar
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="certificados">
        <h2 id="certificados" className="font-display text-2xl">Mis certificados</h2>
        {certificates.length ? (
          <ul className="mt-5 divide-y divide-noche/10 overflow-hidden rounded-2xl border border-noche/10 bg-hueso">
            {certificates.map((c) => (
              <li key={c.code} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
                <Award className="size-8 shrink-0 text-ambar-700" aria-hidden />
                <div className="flex-1">
                  <p className="font-semibold text-noche">{c.courseTitle}</p>
                  <p className="text-sm text-gris">
                    {c.hours} h · Emitido el {formatDate(c.issuedAt)} · <span className="font-mono">{c.code}</span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a href={`${c.pdfUrl}?descargar=1`} className="btn-primary btn-sm">
                    <Download className="size-4" aria-hidden /> PDF
                  </a>
                  <Link href={`/certificados/${c.code}`} className="btn-outline btn-sm">
                    <ExternalLink className="size-4" aria-hidden /> Verificación
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-gris">Completa todas las lecciones y evaluaciones de un curso para recibir tu certificado verificable.</p>
        )}
      </section>

      <RecommendedCourses exclude={enrollments.map((e) => e.course.id)} />
    </div>
  );
}

function CourseProgressCard({ e }: { e: MyEnrollment }) {
  const lessonsDone = Math.round((e.progressPct / 100) * e.course.lessonsCount);
  const href = e.lastLessonId ? `/academia/aprender/${e.course.slug}/${e.lastLessonId}` : `/academia/cursos/${e.course.slug}`;
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-noche/10 bg-hueso shadow-suave">
      <div className="relative aspect-[16/9]">
        {e.course.coverUrl ? <Image src={e.course.coverUrl} alt="" fill sizes="(min-width: 1280px) 30vw, 45vw" className="object-cover" /> : null}
        <div className="absolute inset-0 bg-gradient-to-t from-noche-950/70 to-transparent" aria-hidden />
        <LevelBadge level={e.course.level} className="absolute bottom-3 left-3" />
        <span className="absolute right-3 bottom-3 font-semibold text-crema tabular-nums">{e.progressPct}%</span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-lg leading-snug">{e.course.title}</h3>
        <ProgressBar value={e.progressPct} className="mt-4 text-noche" label={`Progreso en ${e.course.title}`} />
        <div className="mt-auto flex items-center justify-between pt-5 text-sm">
          <span className="inline-flex items-center gap-1.5 text-gris">
            <PlayCircle className="size-4" aria-hidden /> {lessonsDone}/{e.course.lessonsCount} lecciones
          </span>
          <Link href={href} className="font-semibold text-noche underline decoration-ambar decoration-2 underline-offset-4 hover:text-ambar-700">
            Continuar
          </Link>
        </div>
      </div>
    </article>
  );
}

function EmptyCourses() {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
      <BrandIcon name="academia" className="size-14 text-ambar-700" />
      <h3 className="text-xl">Aún no tienes cursos activos</h3>
      <p className="max-w-md text-gris">Empieza con Fundamentos del Grano: es gratis y en 45 minutos vas a entender por qué no todos los cafés son iguales.</p>
      <Link href="/academia/cursos" className="btn-primary mt-2">
        <GraduationCap className="size-4" aria-hidden /> Explorar cursos
      </Link>
    </div>
  );
}

function MyCoursesSkeleton() {
  return (
    <div className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-noche/10 bg-hueso">
          <div className="aspect-[16/9] animate-pulse bg-arena" />
          <div className="space-y-3 p-5">
            <div className="h-5 w-3/4 animate-pulse rounded bg-arena" />
            <div className="h-1.5 w-full animate-pulse rounded bg-arena" />
          </div>
        </div>
      ))}
    </div>
  );
}
