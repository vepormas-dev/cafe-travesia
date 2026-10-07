'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { and, eq, inArray, notInArray } from 'drizzle-orm';
import { z } from 'zod';
import { atomic, getDb, t, type AtomicQuery } from '@/lib/db';
import { audit } from '@/lib/monitor';
import { aiEnabled, generateCourseOutline, type CourseOutline } from '@/lib/ai';
import { invalidate, TAGS } from '@/lib/data/revalidate';
import { ActionError, ok, parsePayload, runAction, zs } from '../guard';
import { VIDEO_PROVIDERS } from '../labels';
import { findUserByEmail } from '../data/customers';

const resource = z.object({ label: zs.req('El nombre del recurso', 120), url: z.string().trim().min(1).max(600) });
const lessonSchema = z.object({
  id: z.string().max(36),
  title: zs.req('El título de la lección', 200),
  summary: zs.str(500).default(''),
  content: zs.str(200000).default(''),
  videoUrl: zs.str(600).default(''),
  videoProvider: z.enum(VIDEO_PROVIDERS),
  durationS: zs.int(0, 86400),
  isPreview: z.boolean(),
  resources: z.array(resource).max(20).default([]),
});
const quizSchema = z.object({
  id: z.string().max(36),
  title: zs.req('El título del quiz', 200),
  passScore: zs.int(1, 100),
  questions: z
    .array(
      z.object({
        id: z.string().max(36),
        prompt: zs.req('La pregunta', 2000),
        options: z.array(z.string().trim().min(1, 'Opción vacía').max(300)).min(2, 'Mínimo 2 opciones').max(8),
        correctIndex: zs.int(0, 7),
        explanation: zs.str(2000).default(''),
      }),
    )
    .min(1, 'Agrega al menos una pregunta')
    .max(60),
});
const courseSchema = z
  .object({
    id: z.string().max(36).optional().nullable(),
    slug: zs.slug(),
    title: zs.req('El título', 200),
    subtitle: zs.opt(300),
    description: zs.opt(60000),
    coverUrl: zs.url(),
    trailerUrl: zs.url(),
    level: z.enum(['principiante', 'intermedio', 'avanzado']),
    category: zs.opt(80),
    instructorName: zs.opt(160),
    instructorTitle: zs.opt(160),
    instructorBio: zs.opt(3000),
    instructorAvatarUrl: zs.url(),
    priceCop: zs.int(0, 100_000_000),
    compareAtCop: zs.intN(0, 100_000_000),
    isFree: z.boolean(),
    includedInSubscription: z.boolean(),
    whatYouLearn: z.array(z.string().trim().min(1).max(200)).max(20).default([]),
    requirements: z.array(z.string().trim().min(1).max(200)).max(20).default([]),
    resources: z.array(resource).max(20).default([]),
    durationMin: zs.int(0, 100000),
    certificateEnabled: z.boolean(),
    isPublished: z.boolean(),
    isFeatured: z.boolean(),
    sortOrder: zs.int(-1000, 100000),
    seoTitle: zs.opt(200),
    seoDescription: zs.opt(320),
    modules: z.array(z.object({ id: z.string().max(36), title: zs.req('El título del módulo', 200), lessons: z.array(lessonSchema).max(80), quiz: quizSchema.nullable() })).max(40),
  })
  .superRefine((c, ctx) => {
    if (!c.isFree && c.priceCop === 0 && !c.includedInSubscription) ctx.addIssue({ code: 'custom', path: ['priceCop'], message: 'Define un precio, márcalo gratis o inclúyelo en la suscripción' });
    c.modules.forEach((m, mi) => m.quiz?.questions.forEach((q, qi) => q.correctIndex >= q.options.length && ctx.addIssue({ code: 'custom', path: ['modules', mi, 'quiz', 'questions', qi, 'correctIndex'], message: 'Elige la respuesta correcta' })));
  });
export type CourseInput = z.infer<typeof courseSchema>;

export async function saveCourse(_prev: unknown, fd: FormData) {
  const r = await runAction<{ id: string; created: boolean }>({}, async ({ user }) => {
    const { id: maybeId, modules, ...c } = parsePayload(courseSchema, fd);
    const db = getDb();
    const id = maybeId || crypto.randomUUID();
    const ops: AtomicQuery[] = [];
    let oldSlug: string | null = null;
    const lessonsTotal = modules.reduce((s, m) => s + m.lessons.reduce((a, l) => a + l.durationS, 0), 0);
    const row = { ...c, isFree: c.isFree || c.priceCop === 0, durationMin: c.durationMin || Math.round(lessonsTotal / 60) };
    if (maybeId) {
      const [cur] = await db.select({ slug: t.courses.slug }).from(t.courses).where(eq(t.courses.id, id)).limit(1);
      if (!cur) throw new ActionError('El curso ya no existe');
      oldSlug = cur.slug;
      ops.push(db.update(t.courses).set(row).where(eq(t.courses.id, id)));
      const moduleIds = modules.map((m) => m.id);
      const lessonIds = modules.flatMap((m) => m.lessons.map((l) => l.id));
      const quizIds = modules.flatMap((m) => (m.quiz ? [m.quiz.id] : []));
      const questionIds = modules.flatMap((m) => m.quiz?.questions.map((q) => q.id) ?? []);
      const del = <T extends Parameters<typeof db.delete>[0]>(table: T, col: Parameters<typeof eq>[0], ids: string[], scope: ReturnType<typeof eq>) =>
        db.delete(table).where(ids.length ? and(scope, notInArray(col, ids)) : scope) as unknown as AtomicQuery;
      ops.push(del(t.lessons, t.lessons.id, lessonIds, eq(t.lessons.courseId, id)));
      ops.push(del(t.courseModules, t.courseModules.id, moduleIds, eq(t.courseModules.courseId, id)));
      const existingQuizzes = (await db.select({ id: t.quizzes.id }).from(t.quizzes).where(eq(t.quizzes.courseId, id))).map((q) => q.id);
      if (existingQuizzes.length) ops.push(db.delete(t.quizQuestions).where(questionIds.length ? and(inArray(t.quizQuestions.quizId, existingQuizzes), notInArray(t.quizQuestions.id, questionIds)) : inArray(t.quizQuestions.quizId, existingQuizzes)) as unknown as AtomicQuery);
      ops.push(del(t.quizzes, t.quizzes.id, quizIds, eq(t.quizzes.courseId, id)));
    } else ops.push(db.insert(t.courses).values({ id, ...row }));
    modules.forEach((m, mi) => {
      ops.push(db.insert(t.courseModules).values({ id: m.id, courseId: id, title: m.title, position: mi }).onDuplicateKeyUpdate({ set: { title: m.title, position: mi } }));
      m.lessons.forEach((l, li) => {
        const v = { title: l.title, summary: l.summary || null, content: l.content || null, videoUrl: l.videoUrl || null, videoProvider: l.videoProvider, durationS: l.durationS, isPreview: l.isPreview, resources: l.resources, position: li, moduleId: m.id };
        ops.push(db.insert(t.lessons).values({ id: l.id, courseId: id, ...v }).onDuplicateKeyUpdate({ set: v }));
      });
      if (m.quiz) {
        const q = m.quiz;
        ops.push(db.insert(t.quizzes).values({ id: q.id, courseId: id, moduleId: m.id, title: q.title, passScore: q.passScore, position: mi }).onDuplicateKeyUpdate({ set: { title: q.title, passScore: q.passScore, moduleId: m.id, position: mi } }));
        q.questions.forEach((x, xi) => {
          const v = { prompt: x.prompt, options: x.options, correctIndex: x.correctIndex, explanation: x.explanation || null, position: xi };
          ops.push(db.insert(t.quizQuestions).values({ id: x.id, quizId: q.id, ...v }).onDuplicateKeyUpdate({ set: v }));
        });
      }
    });
    await atomic(ops);
    await audit(user.id, maybeId ? 'course.update' : 'course.create', 'course', id, { slug: c.slug, modules: modules.length });
    invalidate([TAGS.courses, TAGS.course(c.slug), ...(oldSlug && oldSlug !== c.slug ? [TAGS.course(oldSlug)] : [])]);
    revalidatePath('/admin/cursos');
    return ok(maybeId ? 'Curso guardado' : 'Curso creado', { id, created: !maybeId });
  });
  if (r.ok && r.data?.created) redirect(`/admin/cursos/${r.data.id}`);
  return r;
}

export async function aiCourseOutline(title: string, level: string, notes: string) {
  return runAction<CourseOutline>({ allowDemo: true }, async () => {
    if (!aiEnabled()) throw new ActionError('La IA no está configurada (OPENAI_API_KEY).');
    const r = await generateCourseOutline({ title: zs.req('El título', 200).parse(title), level, notes });
    if (!r?.modules?.length) throw new ActionError('La IA no respondió.');
    return ok('Temario propuesto: revísalo y guarda', r);
  });
}

export async function grantCourseAccess(email: string, courseId: string) {
  return runAction({}, async ({ user }) => {
    const u = await findUserByEmail(z.email('Correo inválido').parse(email.trim().toLowerCase()));
    if (!u) throw new ActionError('Ese correo no tiene cuenta. Pídele que se registre primero.');
    await getDb().insert(t.enrollments).values({ userId: u.id, courseId, source: 'admin' }).onDuplicateKeyUpdate({ set: { status: 'active', source: 'admin' } });
    await audit(user.id, 'enrollment.grant', 'enrollment', `${u.id}:${courseId}`, { email });
    revalidatePath('/admin/estudiantes');
    return ok(`Acceso otorgado a ${email}`);
  });
}

export async function revokeEnrollment(id: string, restore = false) {
  return runAction({}, async ({ user }) => {
    await getDb().update(t.enrollments).set({ status: restore ? 'active' : 'revoked' }).where(eq(t.enrollments.id, id));
    await audit(user.id, restore ? 'enrollment.restore' : 'enrollment.revoke', 'enrollment', id);
    revalidatePath('/admin/estudiantes');
    return ok(restore ? 'Acceso restaurado' : 'Acceso revocado');
  });
}

export async function revokeCertificate(id: string, restore = false) {
  return runAction({ admin: true }, async ({ user }) => {
    await getDb().update(t.certificates).set({ revokedAt: restore ? null : new Date() }).where(eq(t.certificates.id, id));
    await audit(user.id, restore ? 'certificate.restore' : 'certificate.revoke', 'certificate', id);
    revalidatePath('/admin/certificados');
    return ok(restore ? 'Certificado restaurado' : 'Certificado revocado: la verificación pública lo mostrará como inválido');
  });
}
