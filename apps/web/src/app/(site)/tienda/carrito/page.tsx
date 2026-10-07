import type { Metadata } from 'next';
import { CartView } from '@/components/cart/cart-view';

export const metadata: Metadata = { title: 'Tu carrito', robots: { index: false } };

export default function CarritoPage() {
  return (
    <div className="container-site py-10 lg:py-14">
      <p className="eyebrow">Tienda Travesía</p>
      <h1 className="title-lg mt-2 mb-8">Tu carrito</h1>
      <CartView />
    </div>
  );
}
