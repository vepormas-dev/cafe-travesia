import { getPost } from '@/lib/data/catalog';
import { apiError, json } from '@/lib/api';

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const post = await getPost(slug);
  return post ? json({ post }) : apiError('Artículo no encontrado', 404);
}
