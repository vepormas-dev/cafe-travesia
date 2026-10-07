import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckoutForm } from '@/components/cart/checkout-form';

export const metadata: Metadata = { title: 'Finalizar compra', robots: { index: false } };

export default function CheckoutPage() {
  return (
    <div className="container-site py-10 lg:py-14">
      <nav aria-label="Ruta de navegación" className="text-xs font-semibold tracking-[0.18em] text-gris uppercase">
        <Link href="/tienda/carrito" className="hover:text-noche">
          Carrito
        </Link>{' '}
        › <span className="text-noche">Pago</span>
      </nav>
      <h1 className="title-lg mt-3 mb-8">Finaliza tu compra</h1>
      <CheckoutForm />
    </div>
  );
}
