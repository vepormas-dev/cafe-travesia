import { getPosts } from '@/lib/data/catalog';
import { json } from '@/lib/api';

export async function GET(req: Request) {
  const u = new URL(req.url);
  const posts = await getPosts({ category: u.searchParams.get('category') ?? undefined, limit: Number(u.searchParams.get('limit') ?? 20) });
  return json({ posts }, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' } });
}
