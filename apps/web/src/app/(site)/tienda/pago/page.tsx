import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { PaymentResult } from '@/components/cart/payment-result';

export const metadata: Metadata = { title: 'Resultado del pago', robots: { index: false } };

export default function PagoPage() {
  return (
    <div className="container-site py-14 lg:py-20">
      <Suspense
        fallback={
          <div className="card mx-auto flex max-w-2xl flex-col items-center gap-4 px-6 py-12 text-center">
            <Loader2 className="size-10 animate-spin text-ambar" aria-hidden />
            <p className="font-display text-2xl text-noche">Verificando tu pago…</p>
          </div>
        }
      >
        <PaymentResult />
      </Suspense>
    </div>
  );
}
