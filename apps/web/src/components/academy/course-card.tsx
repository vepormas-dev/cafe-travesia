import Image from 'next/image';
import Link from 'next/link';
import { BookOpen, Clock } from 'lucide-react';
import type { CourseDTO } from '@travesia/shared';
import { Rating } from '@/components/ui/primitives';
import { cn } from '@/lib/cn';
import { CoursePrice, courseDuration, InstructorAvatar, LevelBadge } from './course-meta';

/** Tarjeta editorial de curso (portada, categoría, nivel, rating, lecciones, duración, instructor y precio). */
export function CourseCard({ course, dark, priority, className }: { course: CourseDTO; dark?: boolean; priority?: boolean; className?: string }) {
  return (
    <article
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-2xl border transition duration-300 hover:-translate-y-1',
        dark ? 'border-white/10 bg-white/[0.04] hover:border-ambar/40 hover:bg-white/[0.07]' : 'border-noche/10 bg-hueso shadow-suave hover:shadow-elevada',
        className,
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-noche-800">
        {course.coverUrl ? (
          <Image src={course.coverUrl} alt="" fill priority={priority} sizes="(min-width: 1280px) 380px, (min-width: 768px) 45vw, 92vw" className="object-cover transition duration-700 group-hover:scale-105" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-noche-950/70 via-transparent to-transparent" aria-hidden />
        {course.category ? <span className="absolute top-3 left-3 rounded-sm bg-noche-950/90 px-2.5 py-1 text-[0.65rem] font-bold tracking-[0.14em] text-crema uppercase">{course.category}</span> : null}
        <LevelBadge level={course.level} className="absolute bottom-3 left-3" />
        <span className="absolute right-3 bottom-3 inline-flex items-center gap-1 text-xs font-semibold text-crema">
          <Clock className="size-3.5" aria-hidden /> {courseDuration(course.durationMin)}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <Rating value={course.ratingAvg} count={course.ratingCount} className={cn('text-xs', dark && 'text-crema/80 [&_.text-gris]:text-crema/50')} />
        <h3 className={cn('mt-2 font-display text-xl leading-snug', dark ? 'text-crema' : 'text-noche')}>
          <Link href={`/academia/cursos/${course.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {course.title}
          </Link>
        </h3>
        {course.subtitle ? <p className={cn('mt-1.5 line-clamp-2 text-sm', dark ? 'text-crema/65' : 'text-gris')}>{course.subtitle}</p> : null}
        <div className={cn('mt-auto pt-4', dark ? 'border-white/10' : 'border-noche/10')}>
          <div className={cn('flex items-end justify-between gap-3 border-t pt-4', dark ? 'border-white/10' : 'border-noche/10')}>
            <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', dark ? 'text-crema/70' : 'text-noche/70')}>
              <BookOpen className={cn('size-4', dark ? 'text-[#a9c97a]' : 'text-montana')} aria-hidden /> {course.lessonsCount} lecciones
            </span>
            <CoursePrice course={course} dark={dark} className="text-sm" />
          </div>
          {course.instructorName ? (
            <p className={cn('mt-3 flex items-center gap-2 text-xs font-medium', dark ? 'text-crema/75' : 'text-noche/75')}>
              <InstructorAvatar name={course.instructorName} className="size-7 text-[0.6rem]" />
              {course.instructorName}
              {course.instructorTitle ? <span className={cn('truncate font-normal', dark ? 'text-crema/65' : 'text-gris')}>· {course.instructorTitle}</span> : null}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function CourseCardSkeleton({ dark }: { dark?: boolean }) {
  return (
    <div className={cn('animate-pulse overflow-hidden rounded-2xl border', dark ? 'border-white/10 bg-white/[0.04]' : 'border-noche/10 bg-hueso')}>
      <div className={cn('aspect-[4/3]', dark ? 'bg-white/10' : 'bg-arena')} />
      <div className="space-y-3 p-5">
        <div className={cn('h-3 w-16 rounded', dark ? 'bg-white/10' : 'bg-arena')} />
        <div className={cn('h-5 w-4/5 rounded', dark ? 'bg-white/10' : 'bg-arena')} />
        <div className={cn('h-3 w-full rounded', dark ? 'bg-white/10' : 'bg-arena')} />
      </div>
    </div>
  );
}
