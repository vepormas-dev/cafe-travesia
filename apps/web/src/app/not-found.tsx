import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Logo, BrandIcon } from '@/components/brand/logo';

export const metadata: Metadata = { title: 'Página no encontrada', robots: { index: false } };

const LINKS = [
  { href: '/tienda', label: 'Tienda', icon: 'granos' },
  { href: '/suscripciones', label: 'Suscripciones', icon: 'tienda-online' },
  { href: '/academia', label: 'Academia', icon: 'academia' },
  { href: '/blog', label: 'Notas de café', icon: 'libro' },
];

export default function NotFound() {
  return (
    <main className="relative flex min-h-svh flex-col overflow-hidden bg-noche text-crema">
      <div aria-hidden className="bg-andino absolute inset-0 opacity-[0.06]" />
      <div aria-hidden className="divider-andino relative h-4 opacity-90" />
      <div className="container-site relative flex items-center justify-between py-6">
        <Logo variant="claro" className="w-[100px]" />
        <Link href="/" className="btn-light btn-sm">
          Volver al inicio
        </Link>
      </div>
      <div className="container-site relative flex flex-1 flex-col items-center justify-center py-16 text-center">
        <div className="relative">
          <p aria-hidden className="font-display text-[9rem] leading-none font-black text-crema/[0.07] sm:text-[16rem]">
            404
          </p>
          {/* Grano de café rodando */}
          <svg viewBox="0 0 64 80" aria-hidden className="absolute top-1/2 left-1/2 w-16 -translate-x-1/2 -translate-y-1/2 rotate-[-18deg] text-ambar sm:w-24">
            <ellipse cx="32" cy="40" rx="26" ry="36" fill="currentColor" />
            <path d="M32 6c-10 14 10 22 0 34s10 22 0 34" fill="none" stroke="#111A31" strokeWidth="4" strokeLinecap="round" />
          </svg>
        </div>
        <p className="font-script text-3xl text-ambar">¡Ay, qué pena!</p>
        <h1 className="mt-2 max-w-2xl font-display text-4xl leading-tight text-crema sm:text-6xl">
          Este grano se perdió <em className="font-normal text-ambar-300">en el camino</em>
        </h1>
        <p className="mt-5 max-w-lg text-lg text-crema/70">La página que buscas no existe o cambió de lugar. Pero el café sigue aquí, recién tostado.</p>
        <ul className="mt-10 grid w-full max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="group flex flex-col items-center gap-2 rounded-2xl border border-crema/10 bg-crema/5 p-5 transition hover:border-ambar hover:bg-crema/10">
                <BrandIcon name={l.icon} className="size-8 text-ambar transition group-hover:scale-110" />
                <span className="text-sm font-semibold">{l.label}</span>
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/" className="btn-ambar mt-10">
          Volver al inicio <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </main>
  );
}
