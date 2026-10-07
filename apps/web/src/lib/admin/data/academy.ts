import 'server-only';
import { and, asc, desc, eq, inArray, isNull, like, or, sql } from 'drizzle-orm';
import { seedCourses } from '@travesia/db';
import { getDb, t } from '@/lib/db';
import { isDemoMode } from '@/lib/env';
import { demoCourseTree, demoDataset } from '../demo-data';

export type CourseRow = typeof t.courses.$inferSelect;
const epoch = new Date('2026-08-01T12:00:00Z');

export const demoCourseRows = (): CourseRow[] =>
  seedCourses.map(
    (c) =>
      ({
        id: c.id,
        compareAtCop: null,
        trailerUrl: null,
        instructorAvatarUrl: null,
        instructorBio: null,
        resources: [],
        certificateEnabled: true,
        isFree: false,
        includedInSubscription: false,
        isPublished: true,
        isFeatured: false,
        seoTitle: null,
        seoDescription: null,
        whatYouLearn: [],
        requirements: [],
        ...c.base,
        createdAt: epoch,
        updatedAt: epoch,
      }) as unknown as CourseRow,
  );

export async function listCourses() {
  if (isDemoMode()) {
    const ds = demoDataset();
    return demoCourseRows().map((c) => {
      const tree = demoCourseTree(c.id)!;
      const es = ds.enrollments.filter((e) => e.courseId === c.id);
      return { ...c, lessons: tree.modules.reduce((n, m) => n + m.lessons.length, 0), modules: tree.modules.length, students: es.length, completed: es.filter((e) => e.status === 'completed').length };
    });
  }
  const db = getDb();
  const [rows, lessons, mods, students] = await Promise.all([
    db.select().from(t.courses).orderBy(asc(t.courses.sortOrder)),
    db.select({ id: t.lessons.courseId, n: sql<number>`COUNT(*)` }).from(t.lessons).groupBy(t.lessons.courseId),
    db.select({ id: t.courseModules.courseId, n: sql<number>`COUNT(*)` }).from(t.courseModules).groupBy(t.courseModules.courseId),
    db.select({ id: t.enrollments.courseId, n: sql<number>`COUNT(*)`, done: sql<number>`SUM(${t.enrollments.status} = 'completed')` }).from(t.enrollments).where(sql`${t.enrollments.status} <> 'revoked'`).groupBy(t.enrollments.courseId),
  ]);
  return rows.map((c) => ({
    ...c,
    lessons: Number(lessons.find((x) => x.id === c.id)?.n ?? 0),
    modules: Number(mods.find((x) => x.id === c.id)?.n ?? 0),
    students: Number(students.find((x) => x.id === c.id)?.n ?? 0),
    completed: Number(students.find((x) => x.id === c.id)?.done ?? 0),
  }));
}

export type LessonEdit = { id: string; title: string; summary: string; content: string; videoUrl: string; videoProvider: 'bunny' | 'mp4' | 'hls' | 'youtube' | 'vimeo'; durationS: number; isPreview: boolean; resources: { label: string; url: string }[] };
export type QuizEdit = { id: string; title: string; passScore: number; questions: { id: string; prompt: string; options: string[]; correctIndex: number; explanation: string }[] };
export type ModuleEdit = { id: string; title: string; lessons: LessonEdit[]; quiz: QuizEdit | null };

export async function getCourseFull(id: string): Promise<{ course: CourseRow; modules: ModuleEdit[] } | null> {
  if (isDemoMode()) {
    const c = demoCourseRows().find((x) => x.id === id || x.slug === id);
    if (!c) return null;
    const tree = demoCourseTree(c.id)!;
    return { course: c, modules: tree.modules.map((m) => ({ id: m.id, title: m.title, lessons: m.lessons, quiz: m.quiz })) };
  }
  const db = getDb();
  const [c] = await db.select().from(t.courses).where(eq(t.courses.id, id)).limit(1);
  if (!c) return null;
  const [mods, less, quizzes] = await Promise.all([
    db.select().from(t.courseModules).where(eq(t.courseModules.courseId, c.id)).orderBy(asc(t.courseModules.position)),
    db.select().from(t.lessons).where(eq(t.lessons.courseId, c.id)).orderBy(asc(t.lessons.position)),
    db.select().from(t.quizzes).where(eq(t.quizzes.courseId, c.id)),
  ]);
  const questions = quizzes.length ? await db.select().from(t.quizQuestions).where(inArray(t.quizQuestions.quizId, quizzes.map((q) => q.id))).orderBy(asc(t.quizQuestions.position)) : [];
  return {
    course: c,
    modules: mods.map((m) => {
      const q = quizzes.find((x) => x.moduleId === m.id);
      return {
        id: m.id,
        title: m.title,
        lessons: less
          .filter((l) => l.moduleId === m.id)
          .map((l) => ({ id: l.id, title: l.title, summary: l.summary ?? '', content: l.content ?? '', videoUrl: l.videoUrl ?? '', videoProvider: l.videoProvider, durationS: l.durationS, isPreview: l.isPreview, resources: l.resources ?? [] })),
        quiz: q ? { id: q.id, title: q.title, passScore: q.passScore, questions: questions.filter((x) => x.quizId === q.id).map((x) => ({ id: x.id, prompt: x.prompt, options: x.options ?? [], correctIndex: x.correctIndex, explanation: x.explanation ?? '' })) } : null,
      };
    }),
  };
}

export async function listEnrollments(f: { q?: string; course?: string; status?: string; page?: number }) {
  const page = Math.max(1, f.page ?? 1);
  const pageSize = 30;
  if (isDemoMode()) {
    const ds = demoDataset();
    const q = f.q?.trim().toLowerCase();
    const rows = ds.enrollments
      .map((e) => {
        const u = ds.customers.find((c) => c.id === e.userId)!;
        return { id: e.id, userId: e.userId, name: u.fullName, email: u.email, courseId: e.courseId, course: String(seedCourses.find((c) => c.id === e.courseId)?.base.title ?? ''), source: e.source, status: e.status, progressPct: e.progressPct, createdAt: e.createdAt, updatedAt: e.updatedAt, completedAt: e.completedAt };
      })
      .filter((r) => (!f.course || r.courseId === f.course) && (!f.status || r.status === f.status) && (!q || r.email.includes(q) || r.name.toLowerCase().includes(q)))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return { rows: rows.slice((page - 1) * pageSize, page * pageSize), total: rows.length, page, pageSize };
  }
  const db = getDb();
  const conds = [];
  if (f.course) conds.push(eq(t.enrollments.courseId, f.course));
  if (f.status) conds.push(eq(t.enrollments.status, f.status as 'active'));
  if (f.q?.trim()) conds.push(or(like(t.users.email, `%${f.q.trim()}%`), like(t.users.fullName, `%${f.q.trim()}%`))!);
  const where = conds.length ? and(...conds) : undefined;
  const base = db
    .select({ id: t.enrollments.id, userId: t.enrollments.userId, name: t.users.fullName, email: t.users.email, courseId: t.enrollments.courseId, course: t.courses.title, source: t.enrollments.source, status: t.enrollments.status, progressPct: t.enrollments.progressPct, createdAt: t.enrollments.createdAt, updatedAt: t.enrollments.updatedAt, completedAt: t.enrollments.completedAt })
    .from(t.enrollments)
    .leftJoin(t.users, eq(t.users.id, t.enrollments.userId))
    .leftJoin(t.courses, eq(t.courses.id, t.enrollments.courseId))
    .where(where);
  const [rows, [{ n }]] = await Promise.all([
    base.orderBy(desc(t.enrollments.createdAt)).limit(pageSize).offset((page - 1) * pageSize),
    db.select({ n: sql<number>`COUNT(*)` }).from(t.enrollments).leftJoin(t.users, eq(t.users.id, t.enrollments.userId)).where(where),
  ]);
  return { rows: rows.map((r) => ({ ...r, name: r.name ?? r.email ?? '', email: r.email ?? '', course: r.course ?? '' })), total: Number(n), page, pageSize };
}

export async function listCertificates(f: { q?: string; status?: string }) {
  if (isDemoMode()) {
    const q = f.q?.trim().toLowerCase();
    return demoDataset()
      .certificates.filter((c) => (!q || c.code.toLowerCase().includes(q) || c.holderName.toLowerCase().includes(q)) && (!f.status || (f.status === 'revoked' ? c.revokedAt : !c.revokedAt)))
      .sort((a, b) => b.issuedAt.getTime() - a.issuedAt.getTime())
      .slice(0, 200);
  }
  const db = getDb();
  const conds = [];
  if (f.q?.trim()) conds.push(or(like(t.certificates.code, `%${f.q.trim()}%`), like(t.certificates.holderName, `%${f.q.trim()}%`))!);
  if (f.status === 'revoked') conds.push(sql`${t.certificates.revokedAt} IS NOT NULL`);
  if (f.status === 'valid') conds.push(isNull(t.certificates.revokedAt));
  return db.select().from(t.certificates).where(conds.length ? and(...conds) : undefined).orderBy(desc(t.certificates.issuedAt)).limit(200);
}
