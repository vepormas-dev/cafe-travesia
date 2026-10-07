import { getCourses } from '@/lib/data/catalog';
import { json } from '@/lib/api';

/** GET /api/v1/courses?featured=1 */
export async function GET(req: Request) {
  const courses = await getCourses({ featured: new URL(req.url).searchParams.get('featured') === '1' });
  return json({ courses }, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' } });
}
