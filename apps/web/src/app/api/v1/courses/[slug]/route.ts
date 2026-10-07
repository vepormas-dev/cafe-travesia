import { getCourse } from '@/lib/data/catalog';
import { apiError, json } from '@/lib/api';

/** GET /api/v1/courses/:slug → curso con módulos y lecciones (sin contenido protegido). */
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const course = await getCourse(slug);
  return course ? json({ course }) : apiError('Curso no encontrado', 404);
}
