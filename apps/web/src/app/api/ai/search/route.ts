import { aiSearchSchema } from '@travesia/shared';
import { handle, json, parseBody } from '@/lib/api';
import { rateLimit } from '@/lib/rate-limit';
import { searchCatalog } from '@/lib/ai-catalog';

/** POST { query, kind? } → { summary, items: AiRecommendation[], ai } */
export async function POST(req: Request) {
  return handle('ai.search', async () => {
    const limited = await rateLimit(req, 'ai-search', 30, 60);
    if (limited) return limited;
    const [input, err] = await parseBody(req, aiSearchSchema);
    if (err) return err;
    const result = await searchCatalog(input.query, input.kind);
    return json(result, { headers: { 'Cache-Control': 'no-store' } });
  });
}
