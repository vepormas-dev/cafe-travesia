import { apiUser } from '@/lib/auth';
import { apiError, handle, json } from '@/lib/api';
import { getLessonForUser } from '@/lib/academy';

/** GET /api/v1/lessons/:id → LessonDTO. Requiere inscripción salvo isPreview (401 sin sesión / 403 sin inscripción). */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle('lessons.get', async () => {
    const { id } = await ctx.params;
    const user = await apiUser();
    const r = await getLessonForUser(user, id);
    if (r.status !== 200) return apiError(r.error, r.status);
    return json(r.lesson, { headers: { 'Cache-Control': 'private, no-store' } });
  });
}
