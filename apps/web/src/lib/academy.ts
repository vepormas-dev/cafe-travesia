import 'server-only';
/**
 * Academia Travesía (LMS): acceso, inscripción, lecciones, progreso, quizzes y certificados.
 * Todas las lecturas/escrituras de usuario se filtran por user.id.
 * Modo demo (sin BD): lecturas con seed-data; escrituras → { demo: true } (el route handler responde demoBlocked()).
 */
import { randomInt } from 'node:crypto';
import { cacheLife, cacheTag } from 'next/cache';
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { childId, seedCourses, seedIds } from '@travesia/db';
import type { CourseAccessDTO, CourseDTO, LessonDTO } from '@travesia/shared';
import { brand, slugify } from '@travesia/shared';
import { getDb, isDuplicateError, t } from '@/lib/db';
import { env, isDbConfigured, isDemoMode } from '@/lib/env';
import { getCourse, getCourses } from '@/lib/data/catalog';
import { TAGS } from '@/lib/data/tags';
import type { SessionUser } from '@/lib/auth';
import { notifyUser } from '@/lib/push';
import { escapeHtml, layout, sendEmail } from '@/lib/email';
import { logEvent } from '@/lib/monitor';

type U = Pick<SessionUser, 'id' | 'email' | 'fullName'> | null;

// ---------------------------------------------------------------------------
// Estructura completa del curso (contenido protegido: nunca se devuelve sin control de acceso)
// ---------------------------------------------------------------------------
export type FullLesson = {
  id: string;
  courseId: string;
  moduleId: string;
  title: string;
  summary: string | null;
  content: string | null;
  videoUrl: string | null;
  videoProvider: LessonDTO['videoProvider'];
  durationS: number;
  isPreview: boolean;
  resources: { label: string; url: string }[];
  position: number;
};
export type QuizFull = {
  id: string;
  courseId: string;
  moduleId: string | null;
  title: string;
  passScore: number;
  questions: { id: string; prompt: string; options: string[]; correctIndex: number; explanation: string | null }[];
};
type CourseContent = { courseId: string; certificateEnabled: boolean; lessons: FullLesson[]; quizzes: QuizFull[] };

const demoContent = (courseId: string): CourseContent | null => {
  const c = seedCourses.find((x) => x.id === courseId);
  if (!c) return null;
  const lessons: FullLesson[] = [];
  const quizzes: QuizFull[] = [];
  c.modules.forEach((m, mi) => {
    const moduleId = childId(c.id, 2, mi);
    m.lessons.forEach((l, li) =>
      lessons.push({
        id: childId(c.id, 3, mi, li),
        courseId: c.id,
        moduleId,
        title: l.title,
        summary: l.summary,
        content: l.content ?? `${l.summary}\n\n_Contenido de la lección: el equipo de la Academia cargará el video y el material desde el CMS._`,
        videoUrl: null,
        videoProvider: 'mp4',
        durationS: l.durationS,
        isPreview: Boolean(l.isPreview),
        resources: [],
        position: li,
      }),
    );
    if (m.quiz)
      quizzes.push({
        id: childId(c.id, 4, mi),
        courseId: c.id,
        moduleId,
        title: m.quiz.title,
        passScore: 70,
        questions: m.quiz.questions.map((q, qi) => ({ id: childId(c.id, 5, mi, qi), prompt: q.prompt, options: q.options, correctIndex: q.correctIndex, explanation: q.explanation })),
      });
  });
  return { courseId: c.id, certificateEnabled: true, lessons, quizzes };
};

/** Contenido completo del curso, cacheado en servidor (se invalida con TAGS.courses desde el CMS). */
async function getCourseContent(courseId: string): Promise<CourseContent | null> {
  'use cache';
  cacheLife('hours');
  cacheTag(TAGS.courses, `course-content:${courseId}`);
  if (!isDbConfigured()) return demoContent(courseId);
  const db = getDb();
  const [course] = await db
    .select({ id: t.courses.id, certificateEnabled: t.courses.certificateEnabled, isPublished: t.courses.isPublished })
    .from(t.courses)
    .where(eq(t.courses.id, courseId))
    .limit(1);
  if (!course || !course.isPublished) return null;
  const [mods, rows, qz] = await Promise.all([
    db.select({ id: t.courseModules.id, position: t.courseModules.position }).from(t.courseModules).where(eq(t.courseModules.courseId, courseId)),
    db.select().from(t.lessons).where(eq(t.lessons.courseId, courseId)),
    db.select().from(t.quizzes).where(eq(t.quizzes.courseId, courseId)).orderBy(asc(t.quizzes.position)),
  ]);
  const modPos = new Map(mods.map((m) => [m.id, m.position]));
  const lessons: FullLesson[] = rows
    .filter((l) => modPos.has(l.moduleId))
    .sort((a, b) => modPos.get(a.moduleId)! - modPos.get(b.moduleId)! || a.position - b.position)
    .map((l) => ({
      id: l.id,
      courseId: l.courseId,
      moduleId: l.moduleId,
      title: l.title,
      summary: l.summary,
      content: l.content,
      videoUrl: l.videoUrl,
      videoProvider: l.videoProvider,
      durationS: l.durationS,
      isPreview: l.isPreview,
      resources: l.resources ?? [],
      position: l.position,
    }));
  const questions = qz.length
    ? await db.select().from(t.quizQuestions).where(inArray(t.quizQuestions.quizId, qz.map((q) => q.id))).orderBy(asc(t.quizQuestions.position))
    : [];
  const quizzes: QuizFull[] = qz.map((q) => ({
    id: q.id,
    courseId: q.courseId,
    moduleId: q.moduleId,
    title: q.title,
    passScore: q.passScore,
    questions: questions
      .filter((x) => x.quizId === q.id)
      .map((x) => ({ id: x.id, prompt: x.prompt, options: x.options ?? [], correctIndex: x.correctIndex, explanation: x.explanation })),
  }));
  return { courseId, certificateEnabled: course.certificateEnabled, lessons, quizzes };
}

/** Busca el curso al que pertenece una lección o quiz (solo cursos publicados). */
async function locate(kind: 'lesson' | 'quiz', id: string): Promise<{ course: CourseDTO; content: CourseContent } | null> {
  if (!/^[\w-]{1,64}$/.test(id)) return null;
  let courseId: string | undefined;
  if (!isDbConfigured()) {
    courseId = seedCourses.find((c) => {
      const dc = demoContent(c.id)!;
      return kind === 'lesson' ? dc.lessons.some((l) => l.id === id) : dc.quizzes.some((q) => q.id === id);
    })?.id;
  } else {
    const db = getDb();
    const [row] =
      kind === 'lesson'
        ? await db.select({ courseId: t.lessons.courseId }).from(t.lessons).where(eq(t.lessons.id, id)).limit(1)
        : await db.select({ courseId: t.quizzes.courseId }).from(t.quizzes).where(eq(t.quizzes.id, id)).limit(1);
    courseId = row?.courseId;
  }
  if (!courseId) return null;
  const course = await getCourseById(courseId);
  const content = course ? await getCourseContent(course.id) : null;
  return course && content ? { course, content } : null;
}

/** Curso (con módulos) por id o slug. */
export async function getCourseById(idOrSlug: string): Promise<CourseDTO | null> {
  const list = await getCourses();
  const summary = list.find((c) => c.id === idOrSlug || c.slug === idOrSlug);
  return summary ? getCourse(summary.slug) : null;
}

// ---------------------------------------------------------------------------
// Acceso e inscripción
// ---------------------------------------------------------------------------
export async function hasAcademySubscription(userId: string): Promise<boolean> {
  if (!isDbConfigured()) return false;
  const rows = await getDb()
    .select({ id: t.subscriptions.id })
    .from(t.subscriptions)
    .innerJoin(t.subscriptionPlans, eq(t.subscriptionPlans.id, t.subscriptions.planId))
    .where(and(eq(t.subscriptions.userId, userId), eq(t.subscriptions.status, 'active'), eq(t.subscriptionPlans.includesAcademy, true)))
    .limit(1);
  return rows.length > 0;
}

type EnrollmentRow = typeof t.enrollments.$inferSelect;
async function getEnrollment(userId: string, courseId: string): Promise<EnrollmentRow | null> {
  if (!isDbConfigured()) return null;
  const [row] = await getDb()
    .select()
    .from(t.enrollments)
    .where(and(eq(t.enrollments.userId, userId), eq(t.enrollments.courseId, courseId)))
    .limit(1);
  return row ?? null;
}

/**
 * Inscripción vigente: no revocada y, si vino de la suscripción, con la suscripción aún activa
 * (los cursos gratis siguen abiertos aunque la suscripción termine; el progreso nunca se borra).
 */
async function activeEnrollment(user: NonNullable<U>, course: CourseDTO) {
  const e = await getEnrollment(user.id, course.id);
  if (!e || e.status === 'revoked') return null;
  if (e.source === 'subscription' && !course.isFree && !(await hasAcademySubscription(user.id))) return null;
  return e;
}

async function certificateCodeFor(userId: string, courseId: string) {
  if (!isDbConfigured()) return null;
  const [c] = await getDb()
    .select({ code: t.certificates.code, revokedAt: t.certificates.revokedAt })
    .from(t.certificates)
    .where(and(eq(t.certificates.userId, userId), eq(t.certificates.courseId, courseId)))
    .limit(1);
  return c && !c.revokedAt ? c.code : null;
}

export async function getAccess(user: U, course: CourseDTO): Promise<CourseAccessDTO> {
  const base = { enrolled: false, progressPct: 0, lastLessonId: null, completed: false, certificateCode: null } as const;
  if (!user) return { ...base, canEnrollFree: course.isFree, reason: course.isFree ? 'login_required' : 'purchase_required' };
  const e = await activeEnrollment(user, course);
  if (e) {
    return {
      enrolled: true,
      canEnrollFree: false,
      reason: 'enrolled',
      progressPct: e.progressPct,
      lastLessonId: e.lastLessonId,
      completed: e.status === 'completed',
      certificateCode: e.status === 'completed' ? await certificateCodeFor(user.id, course.id) : null,
    };
  }
  if (course.isFree) return { ...base, canEnrollFree: true, reason: 'free' };
  if (course.includedInSubscription && (await hasAcademySubscription(user.id))) return { ...base, canEnrollFree: true, reason: 'subscription' };
  return { ...base, canEnrollFree: false, reason: 'purchase_required' };
}

export type EnrollResult =
  | { ok: true; enrollmentId: string; firstLessonId: string | null }
  | { ok: false; status: 401 | 402 | 403 | 404 | 503; error: string; purchase?: boolean };

export async function enroll(user: U, idOrSlug: string): Promise<EnrollResult> {
  const course = await getCourseById(idOrSlug);
  if (!course) return { ok: false, status: 404, error: 'Curso no encontrado' };
  const firstLessonId = course.modules?.[0]?.lessons[0]?.id ?? null;
  if (isDemoMode()) return { ok: false, status: 503, error: 'demo' };
  if (!user) return { ok: false, status: 401, error: 'Inicia sesión para inscribirte' };
  const existing = await getEnrollment(user.id, course.id);
  if (existing?.status === 'revoked') return { ok: false, status: 403, error: 'Tu acceso a este curso fue revocado. Escríbenos si crees que es un error.' };
  const access = await getAccess(user, course);
  if (access.enrolled && existing) return { ok: true, enrollmentId: existing.id, firstLessonId };
  if (!access.canEnrollFree) return { ok: false, status: 402, error: 'Este curso requiere compra o la suscripción Maestro Premium', purchase: true };
  const source = access.reason === 'free' ? 'free' : 'subscription';
  const db = getDb();
  if (existing) {
    // Inscripción por suscripción vencida que vuelve a activarse (o curso que pasó a gratis)
    await db.update(t.enrollments).set({ source }).where(and(eq(t.enrollments.id, existing.id), eq(t.enrollments.userId, user.id)));
    return { ok: true, enrollmentId: existing.id, firstLessonId };
  }
  const id = crypto.randomUUID();
  try {
    await db.insert(t.enrollments).values({ id, userId: user.id, courseId: course.id, source });
  } catch (e) {
    if (!isDuplicateError(e)) throw e;
    const again = await getEnrollment(user.id, course.id);
    return { ok: true, enrollmentId: again?.id ?? id, firstLessonId };
  }
  return { ok: true, enrollmentId: id, firstLessonId };
}

// ---------------------------------------------------------------------------
// Lecciones
// ---------------------------------------------------------------------------
type ProgressRow = { lessonId: string; positionS: number; completed: boolean };
async function progressFor(userId: string, courseId: string): Promise<ProgressRow[]> {
  if (!isDbConfigured()) return [];
  return getDb()
    .select({ lessonId: t.lessonProgress.lessonId, positionS: t.lessonProgress.positionS, completed: t.lessonProgress.completed })
    .from(t.lessonProgress)
    .where(and(eq(t.lessonProgress.userId, userId), eq(t.lessonProgress.courseId, courseId)));
}

function toLessonDTO(l: FullLesson, course: CourseDTO, content: CourseContent, p?: ProgressRow): LessonDTO {
  const i = content.lessons.findIndex((x) => x.id === l.id);
  return {
    id: l.id,
    courseId: l.courseId,
    courseSlug: course.slug,
    moduleId: l.moduleId,
    title: l.title,
    summary: l.summary,
    content: l.content,
    videoUrl: l.videoUrl,
    videoProvider: l.videoProvider,
    durationS: l.durationS,
    isPreview: l.isPreview,
    resources: l.resources,
    positionS: p?.positionS ?? 0,
    completed: p?.completed ?? false,
    prevLessonId: content.lessons[i - 1]?.id ?? null,
    nextLessonId: content.lessons[i + 1]?.id ?? null,
  };
}

export type LessonResult =
  | { status: 200; lesson: LessonDTO; course: CourseDTO; content: CourseContent; access: CourseAccessDTO; progress: ProgressRow[] }
  | { status: 401 | 403 | 404; error: string; course?: CourseDTO; access?: CourseAccessDTO; lessonTitle?: string };

/** Lección con contenido SOLO si el usuario está inscrito o la lección es preview. */
export async function getLessonForUser(user: U, lessonId: string): Promise<LessonResult> {
  const found = await locate('lesson', lessonId);
  if (!found) return { status: 404, error: 'Lección no encontrada' };
  const { course, content } = found;
  const lesson = content.lessons.find((l) => l.id === lessonId)!;
  const access = await getAccess(user, course);
  if (!lesson.isPreview && !access.enrolled) {
    return user
      ? { status: 403, error: 'Inscríbete en el curso para ver esta lección', course, access, lessonTitle: lesson.title }
      : { status: 401, error: 'Inicia sesión para ver esta lección', course, access, lessonTitle: lesson.title };
  }
  const progress = user && access.enrolled ? await progressFor(user.id, course.id) : [];
  return { status: 200, lesson: toLessonDTO(lesson, course, content, progress.find((p) => p.lessonId === lessonId)), course, content, access, progress };
}

/** IDs de quizzes del curso aprobados por el usuario. */
export async function getPassedQuizIds(user: U, quizIds: string[]): Promise<string[]> {
  if (!user || !quizIds.length || !isDbConfigured()) return [];
  const rows = await getDb()
    .selectDistinct({ quizId: t.quizAttempts.quizId })
    .from(t.quizAttempts)
    .where(and(eq(t.quizAttempts.userId, user.id), eq(t.quizAttempts.passed, true), inArray(t.quizAttempts.quizId, quizIds)));
  return rows.map((r) => r.quizId);
}

// ---------------------------------------------------------------------------
// Progreso, completitud y certificados
// ---------------------------------------------------------------------------
export type ProgressResult = { ok: true; progressPct: number; courseCompleted: boolean; certificateCode?: string } | { ok: false; status: 401 | 403 | 404 | 503; error: string };

export async function saveProgress(user: U, input: { lessonId: string; positionS: number; completed?: boolean }): Promise<ProgressResult> {
  if (isDemoMode()) return { ok: false, status: 503, error: 'demo' };
  if (!user) return { ok: false, status: 401, error: 'Inicia sesión para guardar tu progreso' };
  const found = await locate('lesson', input.lessonId);
  if (!found) return { ok: false, status: 404, error: 'Lección no encontrada' };
  const { course, content } = found;
  let access = await getAccess(user, course);
  if (!access.enrolled && access.canEnrollFree) {
    // Lección preview de un curso gratis/incluido: inscribimos automáticamente para no perder el avance
    const r = await enroll(user, course.id);
    if (r.ok) access = { ...access, enrolled: true };
  }
  if (!access.enrolled) return { ok: false, status: 403, error: 'Inscríbete en el curso para guardar tu progreso' };
  const lesson = content.lessons.find((l) => l.id === input.lessonId)!;
  const positionS = input.positionS;
  const completed = Boolean(input.completed);
  const now = new Date();
  await getDb()
    .insert(t.lessonProgress)
    .values({ userId: user.id, lessonId: lesson.id, courseId: course.id, positionS, completed, completedAt: completed ? now : null })
    .onDuplicateKeyUpdate({
      set: {
        positionS,
        completed: sql`(${t.lessonProgress.completed} OR ${completed ? 1 : 0})`,
        completedAt: sql`COALESCE(${t.lessonProgress.completedAt}, ${completed ? now : null})`,
      },
    });
  const r = await recomputeCompletion(user, course, content, lesson.id);
  return { ok: true, ...r };
}

/** Recalcula progressPct/lastLessonId y emite el certificado al completar lecciones + quizzes aprobados. */
async function recomputeCompletion(user: NonNullable<U>, course: CourseDTO, content: CourseContent, lastLessonId?: string) {
  const db = getDb();
  const progress = await progressFor(user.id, course.id);
  const done = new Set(progress.filter((p) => p.completed).map((p) => p.lessonId));
  const total = content.lessons.length;
  const completedLessons = content.lessons.filter((l) => done.has(l.id)).length;
  const progressPct = total ? Math.round((completedLessons / total) * 100) : 0;
  let quizzesPassed = true;
  if (content.quizzes.length) {
    const passed = await db
      .selectDistinct({ quizId: t.quizAttempts.quizId })
      .from(t.quizAttempts)
      .where(and(eq(t.quizAttempts.userId, user.id), eq(t.quizAttempts.passed, true), inArray(t.quizAttempts.quizId, content.quizzes.map((q) => q.id))));
    quizzesPassed = passed.length >= content.quizzes.length;
  }
  const allDone = total > 0 && completedLessons === total && quizzesPassed;
  const enrollment = await getEnrollment(user.id, course.id);
  if (!enrollment) return { progressPct, courseCompleted: false };
  const wasCompleted = enrollment.status === 'completed';
  await db
    .update(t.enrollments)
    .set({
      progressPct: allDone ? 100 : Math.min(progressPct, 99),
      ...(lastLessonId ? { lastLessonId } : {}),
      ...(allDone && !wasCompleted ? { status: 'completed' as const, completedAt: new Date() } : {}),
    })
    .where(and(eq(t.enrollments.id, enrollment.id), eq(t.enrollments.userId, user.id)));
  if (!allDone) return { progressPct: Math.min(progressPct, 99), courseCompleted: false };
  const certificateCode = content.certificateEnabled ? await issueCertificate(user, course) : undefined;
  return { progressPct: 100, courseCompleted: true, ...(certificateCode ? { certificateCode } : {}) };
}

const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const STOP = new Set(['de', 'del', 'la', 'el', 'en', 'los', 'las', 'y', 'a', 'al', 'para', 'casa', 'perfecto']);
export function certificatePrefix(title: string) {
  const words = slugify(title).split('-').filter((w) => w.length > 2 && !STOP.has(w));
  return (words.at(-1) ?? 'cur').slice(0, 3).toUpperCase().padEnd(3, 'X');
}
const randomCode = (prefix: string) => `CT-${prefix}-${Array.from({ length: 5 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('')}`;

async function issueCertificate(user: NonNullable<U>, course: CourseDTO): Promise<string | undefined> {
  const db = getDb();
  const existing = await certificateCodeFor(user.id, course.id);
  if (existing) return existing;
  const [profile] = await db.select({ fullName: t.users.fullName, email: t.users.email }).from(t.users).where(eq(t.users.id, user.id)).limit(1);
  const holderName = (profile?.fullName || user.fullName || (profile?.email ?? user.email).split('@')[0] || 'Estudiante').slice(0, 160);
  const hours = Math.max(1, Math.round(course.durationMin / 60));
  const prefix = certificatePrefix(course.title);
  let code: string | null = null;
  for (let i = 0; i < 6 && !code; i++) {
    const candidate = randomCode(prefix);
    try {
      await db.insert(t.certificates).values({ code: candidate, userId: user.id, courseId: course.id, holderName, courseTitle: course.title, hours });
      code = candidate;
    } catch (e) {
      if (!isDuplicateError(e)) throw e;
      const other = await certificateCodeFor(user.id, course.id); // carrera: otra petición lo emitió
      if (other) return other;
    }
  }
  if (!code) return undefined;
  const url = `${env.siteUrl}/certificados/${code}`;
  await logEvent('system', 'academy.certificate', 'ok', { externalId: code, message: course.title });
  await notifyUser(user.id, { title: '🎓 ¡Certificado listo!', body: `Completaste «${course.title}». Descarga tu certificado.`, deepLink: '/cuenta/cursos' }, 'certificate');
  await sendEmail(
    profile?.email ?? user.email,
    `Tu certificado: ${course.title}`,
    layout({
      title: '¡Lo lograste! 🎓',
      preheader: `Tu certificado de ${course.title} ya está disponible`,
      body: `<p>${escapeHtml(holderName.split(' ')[0] ?? '')}, completaste el curso <strong>${escapeHtml(course.title)}</strong> de la Academia ${brand.name}.</p>
<p>Tu certificado (${hours} h) tiene el código <strong>${code}</strong> y cualquiera puede verificarlo en <a href="${url}">${url.replace(/^https?:\/\//, '')}</a>.</p>
<p>Gracias por aprender con nosotros. Ahora sí: que el próximo café sea de verdad.</p>`,
      cta: { label: 'Ver mi certificado', href: url },
    }),
  );
  return code;
}

// ---------------------------------------------------------------------------
// Quizzes
// ---------------------------------------------------------------------------
export type PublicQuiz = { id: string; title: string; passScore: number; questions: { id: string; prompt: string; options: string[] }[] };
export type QuizResult =
  | { status: 200; quiz: PublicQuiz; course: CourseDTO; access: CourseAccessDTO; lastAttempt: { score: number; passed: boolean } | null }
  | { status: 401 | 403 | 404; error: string; course?: CourseDTO };

/** Quiz sin respuestas correctas. Requiere inscripción (en demo es legible para recorrer la experiencia). */
export async function getQuizForUser(user: U, quizId: string): Promise<QuizResult> {
  const found = await locate('quiz', quizId);
  if (!found) return { status: 404, error: 'Evaluación no encontrada' };
  const { course, content } = found;
  const q = content.quizzes.find((x) => x.id === quizId)!;
  const access = await getAccess(user, course);
  if (!isDemoMode() && !access.enrolled) return user ? { status: 403, error: 'Inscríbete en el curso para presentar la evaluación', course } : { status: 401, error: 'Inicia sesión para presentar la evaluación', course };
  let lastAttempt: { score: number; passed: boolean } | null = null;
  if (user && isDbConfigured()) {
    const [a] = await getDb()
      .select({ score: t.quizAttempts.score, passed: t.quizAttempts.passed })
      .from(t.quizAttempts)
      .where(and(eq(t.quizAttempts.userId, user.id), eq(t.quizAttempts.quizId, quizId)))
      .orderBy(desc(t.quizAttempts.createdAt))
      .limit(1);
    lastAttempt = a ?? null;
  }
  return {
    status: 200,
    quiz: { id: q.id, title: q.title, passScore: q.passScore, questions: q.questions.map(({ id, prompt, options }) => ({ id, prompt, options })) },
    course,
    access,
    lastAttempt,
  };
}

export type GradeResult =
  | { ok: true; score: number; passed: boolean; passScore: number; results: { correct: boolean; explanation: string | null }[]; certificateCode?: string; courseCompleted: boolean }
  | { ok: false; status: 401 | 403 | 404 | 422 | 503; error: string };

/** Califica en el servidor, guarda el intento y re-evalúa la completitud del curso. */
export async function gradeQuiz(user: U, quizId: string, answers: number[]): Promise<GradeResult> {
  if (isDemoMode()) return { ok: false, status: 503, error: 'demo' };
  if (!user) return { ok: false, status: 401, error: 'Inicia sesión para presentar la evaluación' };
  const found = await locate('quiz', quizId);
  if (!found) return { ok: false, status: 404, error: 'Evaluación no encontrada' };
  const { course, content } = found;
  const access = await getAccess(user, course);
  if (!access.enrolled) return { ok: false, status: 403, error: 'Inscríbete en el curso para presentar la evaluación' };
  const q = content.quizzes.find((x) => x.id === quizId)!;
  if (answers.length !== q.questions.length) return { ok: false, status: 422, error: 'Responde todas las preguntas antes de enviar' };
  // Solo se revela si acertó y la explicación, después de enviar (correctIndex nunca sale del servidor)
  const results = q.questions.map((qq, i) => ({ correct: answers[i] === qq.correctIndex, explanation: qq.explanation }));
  const score = q.questions.length ? Math.round((results.filter((r) => r.correct).length / q.questions.length) * 100) : 0;
  const passed = score >= q.passScore;
  await getDb().insert(t.quizAttempts).values({ userId: user.id, quizId, score, passed, answers });
  const r = passed ? await recomputeCompletion(user, course, content) : { courseCompleted: false as const };
  return { ok: true, score, passed, passScore: q.passScore, results, courseCompleted: r.courseCompleted, ...('certificateCode' in r && r.certificateCode ? { certificateCode: r.certificateCode } : {}) };
}

// ---------------------------------------------------------------------------
// Notas
// ---------------------------------------------------------------------------
export type NoteDTO = { id: string; atS: number; body: string; createdAt: string };

async function assertLessonAccess(user: U, lessonId: string) {
  if (isDemoMode()) return { ok: false as const, status: 503 as const, error: 'demo' };
  if (!user) return { ok: false as const, status: 401 as const, error: 'Inicia sesión para usar tus notas' };
  const r = await getLessonForUser(user, lessonId);
  if (r.status !== 200) return { ok: false as const, status: r.status, error: r.error };
  return { ok: true as const };
}

export async function listNotes(user: U, lessonId: string) {
  const a = await assertLessonAccess(user, lessonId);
  if (!a.ok) return a;
  const rows = await getDb()
    .select({ id: t.lessonNotes.id, atS: t.lessonNotes.atS, body: t.lessonNotes.body, createdAt: t.lessonNotes.createdAt })
    .from(t.lessonNotes)
    .where(and(eq(t.lessonNotes.userId, user!.id), eq(t.lessonNotes.lessonId, lessonId)))
    .orderBy(asc(t.lessonNotes.atS), asc(t.lessonNotes.createdAt));
  return { ok: true as const, notes: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })) satisfies NoteDTO[] };
}

export async function addNote(user: U, lessonId: string, input: { atS: number; body: string }) {
  const a = await assertLessonAccess(user, lessonId);
  if (!a.ok) return a;
  const id = crypto.randomUUID();
  await getDb().insert(t.lessonNotes).values({ id, userId: user!.id, lessonId, atS: input.atS, body: input.body });
  return { ok: true as const, note: { id, atS: input.atS, body: input.body, createdAt: new Date().toISOString() } satisfies NoteDTO };
}

export async function updateNote(user: U, lessonId: string, noteId: string, body: string) {
  const a = await assertLessonAccess(user, lessonId);
  if (!a.ok) return a;
  await getDb()
    .update(t.lessonNotes)
    .set({ body })
    .where(and(eq(t.lessonNotes.id, noteId), eq(t.lessonNotes.userId, user!.id), eq(t.lessonNotes.lessonId, lessonId)));
  return { ok: true as const };
}

export async function deleteNote(user: U, lessonId: string, noteId: string) {
  const a = await assertLessonAccess(user, lessonId);
  if (!a.ok) return a;
  await getDb()
    .delete(t.lessonNotes)
    .where(and(eq(t.lessonNotes.id, noteId), eq(t.lessonNotes.userId, user!.id), eq(t.lessonNotes.lessonId, lessonId)));
  return { ok: true as const };
}

// ---------------------------------------------------------------------------
// Mi aprendizaje
// ---------------------------------------------------------------------------
export type MyEnrollment = { course: CourseDTO; progressPct: number; lastLessonId: string | null; status: 'active' | 'completed' | 'revoked'; completedAt: string | null; source: string };
export type MyCertificate = { code: string; courseTitle: string; courseSlug: string | null; hours: number; issuedAt: string; url: string; pdfUrl: string };

export async function listMyLearning(user: U): Promise<{ enrollments: MyEnrollment[]; certificates: MyCertificate[] }> {
  if (!user || !isDbConfigured()) return { enrollments: [], certificates: [] };
  const db = getDb();
  const [rows, certs, courses] = await Promise.all([
    db.select().from(t.enrollments).where(and(eq(t.enrollments.userId, user.id))).orderBy(desc(t.enrollments.updatedAt)),
    db.select().from(t.certificates).where(eq(t.certificates.userId, user.id)).orderBy(desc(t.certificates.issuedAt)),
    getCourses(),
  ]);
  const byId = new Map(courses.map((c) => [c.id, c]));
  return {
    enrollments: rows
      .filter((r) => r.status !== 'revoked' && byId.has(r.courseId))
      .map((r) => ({
        course: byId.get(r.courseId)!,
        progressPct: r.progressPct,
        lastLessonId: r.lastLessonId,
        status: r.status,
        completedAt: r.completedAt?.toISOString() ?? null,
        source: r.source,
      })),
    certificates: certs
      .filter((c) => !c.revokedAt)
      .map((c) => ({
        code: c.code,
        courseTitle: c.courseTitle,
        courseSlug: byId.get(c.courseId)?.slug ?? null,
        hours: c.hours,
        issuedAt: c.issuedAt.toISOString(),
        url: `${env.siteUrl}/certificados/${c.code}`,
        pdfUrl: `/api/certificates/${c.code}`,
      })),
  };
}

// ---------------------------------------------------------------------------
// Certificados (público) y reseñas
// ---------------------------------------------------------------------------
export type CertificateView = {
  code: string;
  holderName: string;
  courseTitle: string;
  courseSlug: string | null;
  instructorName: string | null;
  hours: number;
  issuedAt: string;
  revokedAt: string | null;
  sample?: boolean;
};

export async function getCertificate(code: string): Promise<CertificateView | null> {
  const c = code.trim().toUpperCase();
  if (!/^[A-Z0-9-]{3,24}$/.test(c)) return null;
  if (c === 'DEMO' && isDemoMode()) {
    const course = seedCourses.find((x) => x.id === seedIds.cEspresso) ?? seedCourses[0]!;
    return {
      code: 'DEMO',
      holderName: 'Valentina Restrepo',
      courseTitle: String(course.base.title),
      courseSlug: String(course.base.slug),
      instructorName: String(course.base.instructorName ?? 'Academia Travesía'),
      hours: Math.max(1, Math.round(Number(course.base.durationMin ?? 60) / 60)),
      issuedAt: new Date('2026-09-12T15:00:00Z').toISOString(),
      revokedAt: null,
      sample: true,
    };
  }
  if (!isDbConfigured()) return null;
  const [row] = await getDb()
    .select({
      code: t.certificates.code,
      holderName: t.certificates.holderName,
      courseTitle: t.certificates.courseTitle,
      hours: t.certificates.hours,
      issuedAt: t.certificates.issuedAt,
      revokedAt: t.certificates.revokedAt,
      courseSlug: t.courses.slug,
      instructorName: t.courses.instructorName,
    })
    .from(t.certificates)
    .leftJoin(t.courses, eq(t.courses.id, t.certificates.courseId))
    .where(eq(t.certificates.code, c))
    .limit(1);
  if (!row) return null;
  return { ...row, issuedAt: row.issuedAt.toISOString(), revokedAt: row.revokedAt?.toISOString() ?? null };
}

export type CourseReview = { id: string; rating: number; title: string | null; body: string | null; author: string; verified: boolean; createdAt: string };

export async function getCourseReviews(courseId: string, slug: string): Promise<CourseReview[]> {
  'use cache';
  cacheLife('hours');
  cacheTag(TAGS.courses, TAGS.course(slug), `course-reviews:${courseId}`);
  if (!isDbConfigured()) return [];
  const rows = await getDb()
    .select({
      id: t.productReviews.id,
      rating: t.productReviews.rating,
      title: t.productReviews.title,
      body: t.productReviews.body,
      verified: t.productReviews.verified,
      createdAt: t.productReviews.createdAt,
      fullName: t.users.fullName,
    })
    .from(t.productReviews)
    .leftJoin(t.users, eq(t.users.id, t.productReviews.userId))
    .where(and(eq(t.productReviews.courseId, courseId), eq(t.productReviews.status, 'approved')))
    .orderBy(desc(t.productReviews.createdAt))
    .limit(12);
  return rows.map((r) => {
    const parts = (r.fullName ?? 'Estudiante').trim().split(/\s+/);
    return {
      id: r.id,
      rating: r.rating,
      title: r.title,
      body: r.body,
      verified: r.verified,
      createdAt: r.createdAt.toISOString(),
      author: parts.length > 1 ? `${parts[0]} ${parts[1]![0]}.` : parts[0]!,
    };
  });
}

// ---------------------------------------------------------------------------
// Tutor: contexto del curso y respaldo por reglas
// ---------------------------------------------------------------------------
export function instructorPersona(course: CourseDTO) {
  const n = (course.instructorName ?? '').toLowerCase();
  if (n.includes('alex')) return { name: 'Alex', role: 'barista líder de nuestra barra en el Parque Comercial Florida (Medellín), experto en espresso, leche y métodos de filtrado' };
  return { name: 'Gabo', role: 'Gabriel "Gabo", fundador, caficultor y tostador de Café Travesía en Caicedo, Antioquia, experto en origen, procesos y tueste' };
}

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
const STOP_Q = new Set(['que', 'como', 'cual', 'para', 'por', 'con', 'una', 'uno', 'los', 'las', 'del', 'esto', 'esta', 'este', 'porque', 'cuando', 'donde', 'mas', 'muy', 'hay', 'es', 'el', 'la', 'de', 'en', 'y', 'un', 'se', 'me', 'mi', 'lo', 'al', 'si', 'no']);
const tokens = (s: string) => norm(s).split(/[^a-z0-9ñ]+/).filter((w) => w.length > 2 && !STOP_Q.has(w));

/** Respuesta por reglas: párrafos más relevantes del curso + lecciones sugeridas. */
export function ruleBasedTutor(question: string, lessons: FullLesson[], currentId: string, canReadAll: boolean) {
  const q = new Set(tokens(question));
  const stem = (w: string) => w.slice(0, 5);
  const qs = new Set([...q].map(stem));
  const scored: { lesson: FullLesson; text: string; score: number }[] = [];
  for (const l of lessons) {
    const readable = canReadAll || l.isPreview || l.id === currentId;
    const paragraphs = [l.title, l.summary ?? '', ...(readable ? (l.content ?? '').split(/\n{2,}/) : [])].map((p) => p.replace(/[*_#>`]/g, '').trim()).filter(Boolean);
    for (const p of paragraphs) {
      const words = tokens(p);
      let score = 0;
      for (const w of words) if (q.has(w)) score += 2;
      else if (qs.has(stem(w))) score += 1;
      if (l.id === currentId) score += 0.5;
      if (score > 0.5) scored.push({ lesson: l, text: p, score: score / Math.sqrt(words.length + 4) });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  const top = scored.filter((s) => s.text.length > 25).slice(0, 3);
  const lessonsOut: { id: string; title: string }[] = [];
  for (const s of scored) if (!lessonsOut.some((x) => x.id === s.lesson.id) && lessonsOut.length < 3) lessonsOut.push({ id: s.lesson.id, title: s.lesson.title });
  const answer = top.length
    ? `Esto es lo que dice el curso sobre tu pregunta:\n\n${top.map((s) => `> ${s.text}\n> — _${s.lesson.title}_`).join('\n\n')}\n\nRevisa las lecciones sugeridas para profundizar. Si te queda la duda, escríbenos y un barista del equipo te ayuda.`
    : 'No encontré ese tema en el contenido de este curso. Intenta con otras palabras (por ejemplo «molienda», «ratio» o «temperatura») o revisa el temario. Si quieres, también puedes escribirle a nuestro equipo desde el asistente.';
  return { answer, lessons: lessonsOut };
}

export async function getCourseContentForTutor(lessonId: string) {
  return locate('lesson', lessonId);
}
