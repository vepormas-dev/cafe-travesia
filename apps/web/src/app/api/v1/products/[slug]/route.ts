import { getProduct } from '@/lib/data/catalog';
import { apiError, json } from '@/lib/api';

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const product = await getProduct(slug);
  return product ? json({ product }) : apiError('Producto no encontrado', 404);
}
