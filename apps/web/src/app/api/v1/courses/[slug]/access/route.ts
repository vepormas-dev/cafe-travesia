import { apiUser } from '@/lib/auth';
import { apiError, handle, json } from '@/lib/api';
import { getAccess } from '@/lib/academy';
import { getCourse } from '@/lib/data/catalog';

/** GET /api/v1/courses/:slug/access → CourseAccessDTO (con o sin sesión). */
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  return handle('courses.access', async () => {
    const { slug } = await ctx.params;
    const course = await getCourse(slug);
    if (!course) return apiError('Curso no encontrado', 404);
    const user = await apiUser();
    return json(await getAccess(user, course), { headers: { 'Cache-Control': 'private, no-store' } });
  });
}
