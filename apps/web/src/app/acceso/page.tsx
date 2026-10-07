import { Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ShieldCheck } from 'lucide-react';
import { brand } from '@travesia/shared';
import { isDemoMode, isFirebaseClientConfigured } from '@/lib/env';
import { LoginCard } from '@/components/admin/login-card';

export const metadata: Metadata = {
  title: 'Acceso administrativo',
  robots: { index: false, follow: false },
};

type SP = Promise<Record<string, string | string[] | undefined>>;

/** Solo se permite volver a rutas internas del panel (evita redirecciones abiertas). */
const safeNext = (v: string | string[] | undefined) => {
  const s = Array.isArray(v) ? v[0] : v;
  return s && /^\/admin(\/|$|\?)/.test(s) && !s.startsWith('//') ? s : '/admin';
};

export default function AccesoPage({ searchParams }: { searchParams: SP }) {
  return (
    <div className="grid min-h-dvh bg-crema lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* Foto real con overlay azul noche */}
      <aside className="relative isolate flex min-h-[260px] overflow-hidden bg-noche lg:min-h-dvh">
        <Image src="/brand/fotos/barra-travesia.webp" alt="Barra de Café Travesía en el Parque Comercial Florida" fill priority sizes="(min-width: 1024px) 52vw, 100vw" className="-z-20 object-cover object-[50%_35%]" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-noche/80 via-noche/70 to-noche-950/95" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_20%_10%,rgba(235,154,55,0.22),transparent_55%)]" />
        <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-24 bg-andino opacity-[0.12]" />
        <div className="flex w-full flex-col justify-between p-6 sm:p-10 lg:p-14">
          <Image src="/brand/logo-claro.png" alt={brand.name} width={1200} height={804} priority className="h-auto w-[150px] sm:w-[180px]" />
          <div className="mt-10 hidden max-w-lg lg:block">
            <p className="font-script text-3xl text-ambar-300">Panel de la travesía</p>
            <h1 className="mt-3 font-display text-4xl leading-tight text-crema xl:text-5xl">
              Todo el ecosistema, <span className="italic">en una sola barra.</span>
            </h1>
            <p className="mt-4 text-base leading-relaxed text-crema/75">Pedidos, suscripciones, academia, contenido, clientes y la app: gestiona y monitorea Café Travesía desde un solo lugar.</p>
            <ul className="mt-8 grid grid-cols-3 gap-3 text-crema/80">
              {[
                ['Ventas', 'en tiempo real'],
                ['CMS', 'sin código'],
                ['IA', 'que te asiste'],
              ].map(([a, b]) => (
                <li key={a} className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-3 backdrop-blur-sm">
                  <p className="font-display text-lg text-crema">{a}</p>
                  <p className="text-xs text-crema/60">{b}</p>
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-6 hidden text-xs text-crema/50 lg:block">
            {brand.origin} · Parque Comercial Florida, Medellín — “{brand.tagline}”
          </p>
        </div>
      </aside>

      <main className="relative flex items-center justify-center px-5 py-10 sm:px-10">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-grano opacity-60" />
        <div className="relative w-full max-w-[420px]">
          <div className="mb-6 flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-ambar-700 uppercase">
            <ShieldCheck className="size-4" /> Acceso administrativo
          </div>
          <Suspense fallback={<div className="h-[440px] animate-pulse rounded-2xl border border-noche/10 bg-hueso" />}>
            <AccessForm searchParams={searchParams} />
          </Suspense>
          <p className="mt-6 text-center text-xs text-gris">
            ¿Eres cliente? <Link href="/ingresar" className="link">Ingresa a tu cuenta</Link> · <Link href="/" className="link">Volver al sitio</Link>
          </p>
        </div>
      </main>
    </div>
  );
}

async function AccessForm({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const error = Array.isArray(sp.error) ? sp.error[0] : sp.error;
  return <LoginCard next={safeNext(sp.next)} initialError={error === 'permisos' ? 'Tu cuenta no tiene permisos de administrador.' : null} demo={isDemoMode()} firebaseReady={isFirebaseClientConfigured()} />;
}
