'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Check, Plus } from 'lucide-react';
import type { ProductDTO } from '@travesia/shared';
import { cart } from '@/components/cart/cart-store';
import { cn } from '@/lib/cn';

/** Botón "Agregar" rápido desde una tarjeta: usa la primera variante disponible. */
export function QuickAdd({ product, className }: { product: Pick<ProductDTO, 'id' | 'slug' | 'name' | 'kind' | 'imageUrl' | 'themeColor' | 'variants'>; className?: string }) {
  const [done, setDone] = useState(false);
  const v = product.variants.find((x) => x.inStock) ?? null;
  if (product.kind === 'experience' || product.variants.filter((x) => x.inStock).length > 1 && product.kind !== 'coffee') {
    return (
      <Link href={`/tienda/${product.slug}`} className={cn('btn-outline btn-sm', className)}>
        {product.kind === 'experience' ? 'Elegir fecha' : 'Elegir opción'}
      </Link>
    );
  }
  if (!v) return <span className={cn('chip opacity-70', className)}>Agotado</span>;
  return (
    <button
      type="button"
      className={cn('btn-primary btn-sm', className)}
      aria-label={`Agregar ${product.name} (${v.name}) al carrito`}
      onClick={() => {
        cart.add({ kind: 'product', id: product.id, variantId: v.id, quantity: 1, name: product.name, variantName: v.name, imageUrl: product.imageUrl, slug: product.slug, unitPriceCop: v.priceCop, themeColor: product.kind === 'coffee' ? product.themeColor : null });
        setDone(true);
        setTimeout(() => setDone(false), 1600);
      }}
    >
      {done ? <Check className="size-3.5" aria-hidden /> : <Plus className="size-3.5" aria-hidden />}
      {done ? 'Agregado' : product.kind === 'coffee' ? `Agregar ${v.weightG ?? ''} g` : 'Agregar'}
    </button>
  );
}

/** Agregar un curso de la Academia al carrito (kind 'course'). */
export function AddCourseButton({ course, className }: { course: { id: string; slug: string; title: string; priceCop: number; coverUrl: string | null }; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={cn('btn-ambar btn-sm', className)}
      onClick={() => {
        cart.add({ kind: 'course', id: course.id, quantity: 1, name: course.title, variantName: 'Curso en línea · acceso de por vida', imageUrl: course.coverUrl, slug: course.slug, unitPriceCop: course.priceCop });
        setDone(true);
        setTimeout(() => setDone(false), 1600);
      }}
    >
      {done ? <Check className="size-3.5" aria-hidden /> : <Plus className="size-3.5" aria-hidden />} {done ? 'Agregado' : 'Agregar al carrito'}
    </button>
  );
}
