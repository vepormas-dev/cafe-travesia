import { quizSubmitSchema } from '@travesia/shared';
import { apiUser } from '@/lib/auth';
import { apiError, demoBlocked, handle, json, parseBody } from '@/lib/api';
import { rateLimit } from '@/lib/rate-limit';
import { gradeQuiz } from '@/lib/academy';

/** POST /api/v1/quizzes/:id/submit { answers } → { score, passed, passScore, results: { correct, explanation }[], certificateCode? } */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle('quizzes.submit', async () => {
    const limited = await rateLimit(req, 'quiz', 20, 600);
    if (limited) return limited;
    const [data, err] = await parseBody(req, quizSubmitSchema);
    if (err) return err;
    const { id } = await ctx.params;
    const r = await gradeQuiz(await apiUser(), id, data.answers);
    if (!r.ok) return r.status === 503 ? demoBlocked() : apiError(r.error, r.status);
    const { ok: _ok, ...body } = r;
    return json(body);
  });
}
