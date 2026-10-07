import { newsletterSchema } from '@travesia/shared';
import { getDb, t } from '@/lib/db';
import { demoBlocked, handle, json, parseBody } from '@/lib/api';
import { isDemoMode } from '@/lib/env';
import { rateLimit } from '@/lib/rate-limit';

/** POST { email, source? } → { ok }. Re-suscribe si se había dado de baja. */
export async function POST(req: Request) {
  return handle('newsletter', async () => {
    const limited = await rateLimit(req, 'newsletter', 5, 600);
    if (limited) return limited;
    const [input, err] = await parseBody(req, newsletterSchema);
    if (err) return err;
    if (isDemoMode()) return demoBlocked();
    const source = (input.source ?? 'web').slice(0, 60);
    await getDb()
      .insert(t.newsletterSubscribers)
      .values({ email: input.email.toLowerCase(), source })
      .onDuplicateKeyUpdate({ set: { unsubscribedAt: null } });
    return json({ ok: true });
  });
}
