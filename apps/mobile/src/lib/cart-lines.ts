import type { CartLineInput, CourseDTO, ProductDTO } from '@travesia/shared';

import { useCart } from './cart';
import { useCourses, useProducts } from './queries';

export type CartView = {
  line: CartLineInput;
  name: string;
  variantName: string | null;
  imageUrl: string | null;
  unitPriceCop: number;
  themeColor: string | null;
  product?: ProductDTO;
  course?: CourseDTO;
  requiresShipping: boolean;
};

/** Une las líneas del carrito con el catálogo (para mostrar nombre, foto y precio estimado). */
export function useCartView() {
  const items = useCart();
  const products = useProducts();
  const courses = useCourses();
  const lines: CartView[] = items.map((line) => {
    if (line.kind === 'course') {
      const c = courses.data?.find((x) => x.id === line.id);
      return { line, name: c?.title ?? 'Curso', variantName: 'Acceso de por vida', imageUrl: c?.coverUrl ?? null, unitPriceCop: c?.priceCop ?? 0, themeColor: null, course: c, requiresShipping: false };
    }
    const p = products.data?.find((x) => x.id === line.id);
    const v = p?.variants.find((x) => x.id === line.variantId) ?? p?.variants[0];
    return {
      line,
      name: p?.name ?? 'Producto',
      variantName: v?.name ?? null,
      imageUrl: p?.imageUrl ?? null,
      unitPriceCop: v?.priceCop ?? p?.priceFromCop ?? 0,
      themeColor: p?.themeColor ?? null,
      product: p,
      requiresShipping: p ? p.kind !== 'experience' : true,
    };
  });
  const count = items.reduce((s, l) => s + l.quantity, 0);
  const subtotal = lines.reduce((s, l) => s + l.unitPriceCop * l.line.quantity, 0);
  return { items, lines, count, subtotal, loading: products.isLoading || courses.isLoading };
}
