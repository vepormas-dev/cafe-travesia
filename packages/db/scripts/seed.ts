/**
 * Carga el contenido inicial (catálogo, planes, cursos, blog, puntos, envíos, cupones, CMS).
 * Idempotente: usa INSERT IGNORE, no sobrescribe lo que el cliente ya editó.
 *   npm run db:seed
 */
import { fileURLToPath } from 'node:url';
import { getDb, isDbConfigured } from '../src/client';
import * as s from '../src/schema';
import {
  childId,
  seedCoupons,
  seedCourses,
  seedPlans,
  seedPosts,
  seedProducts,
  seedShippingZones,
  seedStores,
  seedVariants,
  SITE_DEFAULTS,
} from '../src/seed-data';

export async function seed(log = console.log) {
  if (!isDbConfigured()) throw new Error('Configura la base de datos antes de cargar datos.');
  const db = getDb();
  await db.insert(s.products).ignore().values(seedProducts);
  await db.insert(s.productVariants).ignore().values(seedVariants);
  await db.insert(s.subscriptionPlans).ignore().values(seedPlans);
  for (const c of seedCourses) {
    const lessonsCount = c.modules.reduce((n, m) => n + m.lessons.length, 0);
    await db
      .insert(s.courses)
      .ignore()
      .values({ ...(c.base as unknown as typeof s.courses.$inferInsert), id: c.id, durationMin: (c.base.durationMin as number | undefined) ?? lessonsCount * 10 });
    for (const [mi, m] of c.modules.entries()) {
      const moduleId = childId(c.id, 2, mi);
      await db.insert(s.courseModules).ignore().values({ id: moduleId, courseId: c.id, title: m.title, position: mi });
      await db.insert(s.lessons).ignore().values(
        m.lessons.map((l, li) => ({
          id: childId(c.id, 3, mi, li),
          courseId: c.id,
          moduleId,
          title: l.title,
          summary: l.summary,
          content: l.content ?? `${l.summary}\n\n_Contenido de la lección: el equipo de la Academia cargará el video y el material desde el CMS._`,
          videoUrl: null,
          videoProvider: 'mp4' as const,
          durationS: l.durationS,
          isPreview: Boolean(l.isPreview),
          position: li,
        })),
      );
      if (m.quiz) {
        const quizId = childId(c.id, 4, mi);
        await db.insert(s.quizzes).ignore().values({ id: quizId, courseId: c.id, moduleId, title: m.quiz.title, passScore: 70, position: mi });
        await db.insert(s.quizQuestions).ignore().values(m.quiz.questions.map((q, qi) => ({ id: childId(c.id, 5, mi, qi), quizId, position: qi, ...q })));
      }
    }
  }
  await db.insert(s.blogPosts).ignore().values(seedPosts.map((p) => ({ ...p, status: 'published' as const })));
  await db.insert(s.stores).ignore().values(seedStores);
  const zones = await db.select({ id: s.shippingZones.id }).from(s.shippingZones).limit(1);
  if (zones.length === 0) await db.insert(s.shippingZones).values(seedShippingZones);
  await db.insert(s.coupons).ignore().values(seedCoupons);
  await db
    .insert(s.siteContent)
    .ignore()
    .values(Object.entries(SITE_DEFAULTS).map(([key, content]) => ({ key, content: content as unknown as Record<string, unknown> })));
  log('✓ Contenido inicial cargado');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  seed().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
