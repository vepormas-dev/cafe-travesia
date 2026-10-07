import { progressSchema } from '@travesia/shared';
import { apiUser } from '@/lib/auth';
import { apiError, demoBlocked, handle, json, parseBody } from '@/lib/api';
import { rateLimit } from '@/lib/rate-limit';
import { saveProgress } from '@/lib/academy';

/** POST /api/v1/progress → { ok, progressPct, courseCompleted, certificateCode? } (también vía navigator.sendBeacon). */
export async function POST(req: Request) {
  return handle('academy.progress', async () => {
    const limited = await rateLimit(req, 'progress', 240, 600);
    if (limited) return limited;
    const [data, err] = await parseBody(req, progressSchema);
    if (err) return err;
    const r = await saveProgress(await apiUser(), data);
    if (!r.ok) return r.status === 503 ? demoBlocked() : apiError(r.error, r.status);
    return json(r);
  });
}
