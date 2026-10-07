import { aiRecommendSchema } from '@travesia/shared';
import { apiUser } from '@/lib/auth';
import { handle, json, parseBody } from '@/lib/api';
import { rateLimit } from '@/lib/rate-limit';
import { recommend } from '@/lib/ai-catalog';

/** POST { context, productSlug?, courseSlug?, cart? } → { items: AiRecommendation[], ai } */
export async function POST(req: Request) {
  return handle('ai.recommend', async () => {
    const limited = await rateLimit(req, 'ai-recommend', 40, 60);
    if (limited) return limited;
    const [input, err] = await parseBody(req, aiRecommendSchema);
    if (err) return err;
    const user = input.context === 'account' ? await apiUser() : null;
    const result = await recommend(input, user);
    return json(result, { headers: { 'Cache-Control': 'no-store' } });
  });
}
