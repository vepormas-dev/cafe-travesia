import { getPlans } from '@/lib/data/catalog';
import { json } from '@/lib/api';

/** GET /api/v1/plans?audience=personal|empresa */
export async function GET(req: Request) {
  const a = new URL(req.url).searchParams.get('audience');
  const plans = await getPlans(a === 'empresa' || a === 'personal' ? a : undefined);
  return json({ plans }, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' } });
}
