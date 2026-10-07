import type { ProductDTO } from '@travesia/shared';
import { ProductCard } from './product-card';

export function ProductGrid({ products }: { products: ProductDTO[] }) {
  return (
    <ul className="grid grid-cols-1 gap-x-6 gap-y-12 min-[520px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((p, i) => (
        <li key={p.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
          <ProductCard product={p} priority={i < 2} />
        </li>
      ))}
    </ul>
  );
}

