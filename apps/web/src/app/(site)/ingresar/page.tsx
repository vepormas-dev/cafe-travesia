import type { Metadata } from 'next';
import { Suspense } from 'react';
import Image from 'next/image';
import { GraduationCap, ShoppingBag, Smartphone } from 'lucide-react';
import { isFirebaseClientConfigured } from '@/lib/env';
import { Logo } from '@/components/brand/logo';
import { DemoNotice } from '@/components/ui/primitives';
import { LoginForm } from '@/components/auth/login-form';

export const metadata: Metadata = {
  title: 'Ingresar o crear cuenta',
  description: 'Una sola cuenta para la tienda, la Academia y la app de Café Travesía.',
  robots: { index: false, follow: true },
  alternates: { canonical: '/ingresar' },
};

function FormSkeleton() {
  return (
    <div className="w-full space-y-4" aria-busy aria-label="Cargando formulario">
      <div className="h-12 animate-pulse rounded-full bg-arena" />
      <div className="h-10 w-2/3 animate-pulse rounded bg-arena" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-12 animate-pulse rounded-full bg-arena" />
        <div className="h-12 animate-pulse rounded-full bg-arena" />
      </div>
      <div className="h-12 animate-pulse rounded-xl bg-arena/70" />
      <div className="h-12 animate-pulse rounded-xl bg-arena/70" />
      <div className="h-12 animate-pulse rounded-full bg-noche/20" />
    </div>
  );
}

export default function IngresarPage() {
  const enabled = isFirebaseClientConfigured();
  return (
    <div className="grid min-h-[calc(100svh-5rem)] lg:grid-cols-[1fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-noche lg:block">
        <Image src="/brand/fotos/latte-travesia.webp" alt="Latte con arte servido en la barra de Café Travesía" fill priority sizes="50vw" className="object-cover" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-noche via-noche/40 to-noche/20" />
        <div className="relative flex h-full flex-col justify-between p-12 text-crema">
          <Logo variant="claro" className="w-[150px]" />
          <div>
            <p className="font-script text-4xl text-ambar">la esencia de lo que somos</p>
            <p className="mt-3 max-w-md font-display text-3xl leading-snug text-crema">Una sola cuenta para la tienda, la Academia y la app.</p>
            <ul className="mt-8 grid max-w-md gap-3 text-sm text-crema/85">
              <li className="flex items-center gap-3">
                <ShoppingBag className="size-4 text-ambar" aria-hidden /> Pedidos, guías de envío y Puntos Travesía
              </li>
              <li className="flex items-center gap-3">
                <GraduationCap className="size-4 text-ambar" aria-hidden /> Tus cursos, progreso y certificados
              </li>
              <li className="flex items-center gap-3">
                <Smartphone className="size-4 text-ambar" aria-hidden /> Todo sincronizado con la app
              </li>
            </ul>
          </div>
        </div>
      </aside>
      <section className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo className="w-[110px]" />
          </div>
          {!enabled ? (
            <div className="mb-6">
              <DemoNotice>El ingreso se habilita al configurar Firebase.</DemoNotice>
            </div>
          ) : null}
          <Suspense fallback={<FormSkeleton />}>
            <LoginForm />
          </Suspense>
          <p className="mt-8 text-center text-xs text-gris">
            Al continuar aceptas nuestros{' '}
            <a href="/terminos" className="underline">
              términos
            </a>{' '}
            y la{' '}
            <a href="/privacidad" className="underline">
              política de privacidad
            </a>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
