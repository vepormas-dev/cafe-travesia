import { apiUser } from '@/lib/auth';
import { apiError, demoBlocked, handle, json } from '@/lib/api';
import { rateLimit } from '@/lib/rate-limit';
import { enroll } from '@/lib/academy';
import { invalidate, TAGS } from '@/lib/data/revalidate';

/** POST /api/courses/:id/enroll → { ok, enrollmentId } · 402 { error, purchase: true } si debe comprarse. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle('courses.enroll', async () => {
    const limited = await rateLimit(req, 'enroll', 20, 600);
    if (limited) return limited;
    const { id } = await ctx.params;
    const user = await apiUser();
    const r = await enroll(user, id);
    if (!r.ok) {
      if (r.status === 503) return demoBlocked();
      return r.purchase ? json({ error: r.error, purchase: true }, 402) : apiError(r.error, r.status);
    }
    invalidate([TAGS.courses], 'route'); // contador de estudiantes
    return json({ ok: true, enrollmentId: r.enrollmentId, firstLessonId: r.firstLessonId });
  });
}
