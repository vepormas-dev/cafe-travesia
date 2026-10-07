import type { ProductDTO } from '@travesia/shared';

export function filterProducts(products: ProductDTO[], sp: { tipo?: string | null; metodo?: string | null; proceso?: string | null; nota?: string | null; orden?: string | null }) {
  let list = products.filter(
    (p) =>
      (!sp.tipo || p.kind === sp.tipo) &&
      (!sp.metodo || p.brewMethods.includes(sp.metodo)) &&
      (!sp.proceso || p.process === sp.proceso) &&
      (!sp.nota || p.tastingNotes.includes(sp.nota)),
  );
  const o = sp.orden;
  if (o === 'precio-asc') list = [...list].sort((a, b) => a.priceFromCop - b.priceFromCop);
  else if (o === 'precio-desc') list = [...list].sort((a, b) => b.priceFromCop - a.priceFromCop);
  else if (o === 'nombre') list = [...list].sort((a, b) => a.name.localeCompare(b.name, 'es'));
  else if (o === 'rating') list = [...list].sort((a, b) => b.ratingAvg - a.ratingAvg || b.ratingCount - a.ratingCount);
  else list = [...list].sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));
  return list;
}

