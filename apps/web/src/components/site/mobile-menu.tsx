'use client';
import { forwardRef } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Search, X } from 'lucide-react';
import { Logo, BrandIcon } from '@/components/brand/logo';
import { MAIN_NAV, SHOP_CATEGORIES } from './nav';

/** Menú móvil a pantalla completa (<dialog> nativo: foco atrapado, Esc y fondo inerte). */
export const MobileMenu = forwardRef<HTMLDialogElement, { onNavigate: () => void; onSearch: () => void }>(function MobileMenu({ onNavigate, onSearch }, ref) {
  return (
    <dialog
      ref={ref}
      aria-label="Menú principal"
      onClose={() => (document.documentElement.style.overflow = '')}
      className="m-0 h-dvh max-h-none w-full max-w-none bg-noche p-0 text-crema backdrop:bg-noche-950/70 open:flex open:flex-col"
    >
      <div className="relative flex items-center justify-between px-5 py-3">
        <Logo variant="claro" className="w-[92px]" />
        <button type="button" onClick={onNavigate} className="grid size-11 place-items-center rounded-full border border-crema/20" aria-label="Cerrar menú" autoFocus>
          <X className="size-5" aria-hidden />
        </button>
      </div>
      <div aria-hidden className="divider-andino opacity-40" />
      <nav aria-label="Principal (móvil)" className="flex-1 overflow-y-auto px-5 pt-6 pb-10">
        <button type="button" onClick={onSearch} className="mb-8 flex w-full items-center gap-3 rounded-full border border-crema/20 bg-crema/5 px-5 py-3.5 text-left text-crema/70">
          <Search className="size-5 text-ambar" aria-hidden /> ¿Qué se te antoja hoy?
        </button>
        <p className="eyebrow mb-3 text-ambar-300">Tienda</p>
        <ul className="mb-8 grid grid-cols-2 gap-2">
          {SHOP_CATEGORIES.map((c) => (
            <li key={c.href}>
              <Link href={c.href} onClick={onNavigate} className="flex h-full flex-col gap-2 rounded-2xl border border-crema/10 bg-crema/5 p-4 transition hover:border-ambar/60">
                <BrandIcon name={c.icon} className="size-7 text-ambar" />
                <span className="text-sm font-semibold">{c.label}</span>
              </Link>
            </li>
          ))}
          <li>
            <Link href="/tienda" onClick={onNavigate} className="flex h-full items-end justify-between rounded-2xl bg-ambar p-4 text-sm font-semibold text-noche">
              Ver toda la tienda <ArrowUpRight className="size-4" aria-hidden />
            </Link>
          </li>
        </ul>
        <ul className="space-y-1">
          {MAIN_NAV.map((l) => (
            <li key={l.href}>
              <Link href={l.href} onClick={onNavigate} className="flex items-center justify-between border-b border-crema/10 py-3.5 font-display text-3xl transition hover:text-ambar-300">
                {l.label}
                <ArrowUpRight className="size-5 text-crema/30" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-8 flex flex-wrap gap-2 text-sm">
          {[
            ['Empresas', '/empresas'],
            ['Impacto', '/impacto'],
            ['Contacto', '/contacto'],
            ['Mi cuenta', '/cuenta'],
          ].map(([l, h]) => (
            <Link key={h} href={h!} onClick={onNavigate} className="rounded-full border border-crema/20 px-4 py-2 hover:bg-crema hover:text-noche">
              {l}
            </Link>
          ))}
        </div>
        <p className="mt-10 font-script text-2xl text-ambar">la esencia de lo que somos</p>
      </nav>
    </dialog>
  );
});
