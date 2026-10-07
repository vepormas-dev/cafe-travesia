import { getProducts } from '@/lib/data/catalog';
import { json } from '@/lib/api';

/** GET /api/v1/products?kind=coffee&featured=1&seasonal=1 */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const kind = u.searchParams.get('kind') as 'coffee' | 'merch' | 'accessory' | 'kit' | 'experience' | null;
  const products = await getProducts({ kind: kind ?? undefined, featured: u.searchParams.get('featured') === '1', seasonal: u.searchParams.get('seasonal') === '1' });
  return json({ products }, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' } });
}
