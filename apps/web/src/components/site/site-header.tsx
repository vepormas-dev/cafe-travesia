'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight, ChevronDown, Menu, Search, ShoppingBag } from 'lucide-react';
import { Logo, BrandIcon } from '@/components/brand/logo';
import { useCart, openCart } from '@/components/cart/cart-store';
import { cn } from '@/lib/cn';
import { MAIN_NAV, SHOP_CATEGORIES } from './nav';
import { headerIcon } from './styles';
import { SearchDialog, openSearch } from './search-dialog';
import { MobileMenu } from './mobile-menu';

/**
 * Header público. En la home arranca transparente sobre el video (logo claro) y al hacer
 * scroll pasa a crema translúcido con blur. En el resto de páginas es sólido.
 * `account` llega como server component envuelto en <Suspense> (estado de sesión).
 */
export function SiteHeader({ account }: { account: React.ReactNode }) {
  const pathname = usePathname();
  const overHero = pathname === '/';
  const [scrolled, setScrolled] = useState(false);
  const [mega, setMega] = useState(false);
  const menuRef = useRef<HTMLDialogElement>(null);
  const megaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { count } = useCart();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMega(false);
    menuRef.current?.close();
  }, [pathname]);

  useEffect(() => {
    if (!mega) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMega(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mega]);

  const transparent = overHero && !scrolled && !mega;
  const openMega = () => {
    if (megaTimer.current) clearTimeout(megaTimer.current);
    setMega(true);
  };
  const closeMega = () => {
    megaTimer.current = setTimeout(() => setMega(false), 120);
  };
  const openMenu = () => {
    menuRef.current?.showModal();
    document.documentElement.style.overflow = 'hidden';
  };
  const closeMenu = () => menuRef.current?.close();

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-40 transition-[background-color,box-shadow,color,backdrop-filter] duration-300',
          transparent ? 'bg-transparent text-crema' : 'border-b border-noche/10 bg-crema/90 text-noche shadow-[0_1px_0_rgb(17_26_49/0.04)] backdrop-blur-xl supports-[backdrop-filter]:bg-crema/80',
        )}
        onMouseLeave={closeMega}
      >
        <div className="container-site flex h-16 items-center gap-4 lg:h-20">
          <button type="button" onClick={openMenu} className={cn(headerIcon, '-ml-2 lg:hidden')} aria-label="Abrir menú">
            <Menu className="size-6" aria-hidden />
          </button>

          <Link href="/" aria-label="Café Travesía, inicio" className="relative mx-auto inline-flex shrink-0 lg:mx-0">
            <Image src="/brand/logo.png" alt="Café Travesía · la esencia de lo que somos" width={1200} height={804} priority className={cn('h-auto w-[84px] transition-opacity duration-300 lg:w-[104px]', transparent ? 'opacity-0' : 'opacity-100')} />
            <Image src="/brand/logo-claro.png" alt="" aria-hidden width={1200} height={804} priority className={cn('absolute inset-0 h-auto w-[84px] transition-opacity duration-300 lg:w-[104px]', transparent ? 'opacity-100' : 'opacity-0')} />
          </Link>

          <nav aria-label="Principal" className="hidden flex-1 justify-center lg:flex">
            <ul className="flex items-center gap-1 text-[0.92rem] font-medium">
              <li onMouseEnter={openMega}>
                <button
                  type="button"
                  aria-expanded={mega}
                  aria-controls="mega-tienda"
                  onClick={() => setMega((m) => !m)}
                  className={cn('flex items-center gap-1 rounded-full px-3.5 py-2 transition hover:bg-current/10', pathname.startsWith('/tienda') && 'font-semibold')}
                >
                  Tienda <ChevronDown className={cn('size-4 transition-transform', mega && 'rotate-180')} aria-hidden />
                </button>
              </li>
              {MAIN_NAV.map((l) => {
                const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
                return (
                  <li key={l.href} onMouseEnter={closeMega}>
                    <Link href={l.href} aria-current={active ? 'page' : undefined} className={cn('relative rounded-full px-3.5 py-2 transition hover:bg-current/10', active && 'font-semibold')}>
                      {l.label}
                      {active ? <span aria-hidden className="absolute inset-x-3.5 -bottom-0.5 h-0.5 rounded-full bg-ambar" /> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="-mr-2 flex items-center gap-0.5 lg:mr-0">
            <button type="button" onClick={openSearch} className={cn(headerIcon, 'hidden sm:inline-grid')} aria-label="Buscar (Ctrl + K)" title="Buscar">
              <Search className="size-5" aria-hidden />
            </button>
            <div className="hidden sm:block">{account}</div>
            <button type="button" onClick={openCart} className={headerIcon} aria-label={`Abrir carrito${mounted && count ? `, ${count} productos` : ''}`}>
              <ShoppingBag className="size-5" aria-hidden />
              {mounted && count > 0 ? (
                <span className="absolute -top-0.5 -right-0.5 grid min-w-5 place-items-center rounded-full bg-ambar px-1 text-[0.65rem] leading-5 font-bold text-noche tabular-nums ring-2 ring-crema">{count > 99 ? '99+' : count}</span>
              ) : null}
            </button>
          </div>
        </div>

        {/* Mega-menú de la tienda */}
        <div
          id="mega-tienda"
          onMouseEnter={openMega}
          className={cn(
            'absolute inset-x-0 top-full hidden origin-top border-b border-noche/10 bg-crema text-noche shadow-elevada transition duration-200 lg:block',
            mega ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-1 opacity-0',
          )}
        >
          <div className="container-site grid grid-cols-[1fr_1fr_1fr_1.15fr] gap-6 py-8">
            <ul className="col-span-3 grid grid-cols-3 gap-3">
              {SHOP_CATEGORIES.map((c) => (
                <li key={c.href}>
                  <Link href={c.href} tabIndex={mega ? 0 : -1} className="group flex h-full items-start gap-4 rounded-2xl p-4 transition hover:bg-arena/70">
                    <span className="grid size-12 shrink-0 place-items-center rounded-full bg-hueso text-noche shadow-suave transition group-hover:bg-noche group-hover:text-ambar">
                      <BrandIcon name={c.icon} className="size-7" />
                    </span>
                    <span>
                      <span className="block font-display text-lg leading-tight">{c.label}</span>
                      <span className="mt-1 block text-sm text-gris">{c.text}</span>
                    </span>
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/tienda" tabIndex={mega ? 0 : -1} className="flex h-full items-center gap-2 rounded-2xl border border-dashed border-noche/20 p-4 text-sm font-semibold hover:border-noche">
                  Ver toda la tienda <ArrowRight className="size-4" aria-hidden />
                </Link>
              </li>
            </ul>
            <Link href="/suscripciones" tabIndex={mega ? 0 : -1} className="group relative overflow-hidden rounded-3xl bg-noche p-6 text-crema">
              <div aria-hidden className="bg-andino absolute inset-0 opacity-15" />
              <p className="eyebrow relative text-ambar-300">Suscripción Travesía</p>
              <p className="relative mt-2 font-display text-2xl leading-tight">
                Café fresco en tu puerta, <em className="text-ambar-300">cada mes</em>
              </p>
              <p className="relative mt-2 text-sm text-crema/70">Envío gratis, hasta 15 % menos y pausas cuando quieras.</p>
              <span className="relative mt-5 inline-flex items-center gap-2 text-sm font-semibold text-ambar-300">
                Armar mi plan <ArrowRight className="size-4 transition group-hover:translate-x-1" aria-hidden />
              </span>
            </Link>
          </div>
        </div>
      </header>

      <MobileMenu
        ref={menuRef}
        onNavigate={closeMenu}
        onSearch={() => {
          closeMenu();
          openSearch();
        }}
      />
      <SearchDialog />
    </>
  );
}

/** Fallback del header mientras se resuelve la ruta (rutas con parámetros desconocidos). */
export function SiteHeaderFallback() {
  return (
    <header className="sticky top-0 z-40 border-b border-noche/10 bg-crema/90 text-noche backdrop-blur-xl">
      <div className="container-site flex h-16 items-center justify-center lg:h-20 lg:justify-start">
        <Logo className="w-[84px] lg:w-[104px]" priority />
      </div>
    </header>
  );
}
