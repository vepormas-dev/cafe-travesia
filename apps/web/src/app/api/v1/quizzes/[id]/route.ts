import { apiUser } from '@/lib/auth';
import { apiError, handle, json } from '@/lib/api';
import { getQuizForUser } from '@/lib/academy';

/** GET /api/v1/quizzes/:id → { quiz: { id, title, passScore, questions: { id, prompt, options }[] } } (sin respuestas). */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle('quizzes.get', async () => {
    const { id } = await ctx.params;
    const r = await getQuizForUser(await apiUser(), id);
    if (r.status !== 200) return apiError(r.error, r.status);
    return json({ quiz: r.quiz, lastAttempt: r.lastAttempt }, { headers: { 'Cache-Control': 'private, no-store' } });
  });
}
