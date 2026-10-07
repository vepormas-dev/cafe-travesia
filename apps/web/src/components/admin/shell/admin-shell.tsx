'use client';
import { Suspense, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronsLeft, ChevronsRight, ExternalLink, LogOut, Menu, Search, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Badges } from '@/lib/admin/types';
import { ROLE_LABEL } from '@/lib/admin/labels';
import { signOutEverywhere } from '@/lib/firebase/client';
import { Avatar } from '../ui';
import { ALL_NAV, NAV, isActive } from './nav';
import { CommandPalette } from './command-palette';
import { RangePicker } from './range-picker';

export type ShellUser = { name: string; email: string; role: 'customer' | 'editor' | 'admin'; avatarUrl: string | null };

export function AdminShell({ user, badges, demo, children }: { user: ShellUser; badges: Badges; demo: boolean; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const gPressed = useRef(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCollapsed(localStorage.getItem('ct-admin-collapsed') === '1');
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileOpen(false);
  }, [pathname]);

  // Atajos: ⌘K / Ctrl+K / "/" → búsqueda · "g" + tecla → navegación
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '/') {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }
      if (e.key === 'g') {
        gPressed.current = Date.now();
        return;
      }
      if (Date.now() - gPressed.current < 900) {
        const hit = ALL_NAV.find((n) => n.keys === `g ${e.key.toLowerCase()}`);
        if (hit) {
          e.preventDefault();
          router.push(hit.href);
        }
        gPressed.current = 0;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router]);

  const toggleCollapsed = () => {
    setCollapsed((v) => {
      localStorage.setItem('ct-admin-collapsed', v ? '0' : '1');
      return !v;
    });
  };
  const showRange = pathname === '/admin' || pathname === '/admin/analitica';
  const groups = NAV.map((g) => ({ ...g, items: g.items.filter((i) => !i.adminOnly || user.role === 'admin') })).filter((g) => g.items.length);

  const sidebar = (mobile: boolean) => (
    <nav aria-label="Panel" className="flex h-full flex-col">
      <div className={cn('flex h-[4.5rem] shrink-0 items-center gap-2 px-4 pt-1', collapsed && !mobile && 'justify-center px-2')}>
        <Link href="/admin" className="flex items-center gap-2" aria-label="Café Travesía · Panel">
          {collapsed && !mobile ? (
            <span className="grid size-9 place-items-center rounded-lg bg-ambar font-script text-xl text-noche">T</span>
          ) : (
            <Image src="/brand/logo-claro.png" alt="Café Travesía" width={1200} height={804} className="h-auto w-[92px]" priority />
          )}
        </Link>
        {mobile ? (
          <button type="button" onClick={() => setMobileOpen(false)} className="ml-auto rounded-md p-1.5 text-crema/70 hover:bg-white/10" aria-label="Cerrar menú">
            <X className="size-5" />
          </button>
        ) : null}
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-4 scrollbar-none">
        {groups.map((g) => (
          <div key={g.label} className="mt-4 first:mt-1">
            {collapsed && !mobile ? <div className="mx-auto my-2 h-px w-6 bg-white/10" /> : <p className="px-2.5 pb-1.5 text-[0.62rem] font-semibold tracking-[0.18em] text-crema/40 uppercase">{g.label}</p>}
            <ul className="space-y-0.5">
              {g.items.map((it) => {
                const active = isActive(pathname, it.href);
                const n = it.badge ? badges[it.badge] : 0;
                const Icon = it.icon;
                return (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      title={collapsed && !mobile ? it.label : undefined}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'group relative flex items-center gap-2.5 rounded-lg px-2.5 py-[0.45rem] text-[0.84rem] font-medium transition',
                        active ? 'bg-white/[0.09] text-crema shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]' : 'text-crema/65 hover:bg-white/[0.05] hover:text-crema',
                        collapsed && !mobile && 'justify-center px-0',
                      )}
                    >
                      {active ? <span className="absolute top-1.5 bottom-1.5 left-0 w-[3px] rounded-r bg-ambar" /> : null}
                      <Icon className={cn('size-[1.05rem] shrink-0', active ? 'text-ambar-300' : 'text-crema/50 group-hover:text-crema/80')} />
                      {collapsed && !mobile ? null : <span className="truncate">{it.label}</span>}
                      {n > 0 ? (
                        <span className={cn('ml-auto grid min-w-[1.25rem] place-items-center rounded-full px-1.5 text-[0.62rem] font-bold tabular-nums', it.badgeTone === 'danger' ? 'bg-cereza text-white' : 'bg-ambar text-noche', collapsed && !mobile && 'absolute -top-0.5 -right-0.5 min-w-4 px-1')}>
                          {n > 99 ? '99+' : n}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <div className={cn('border-t border-white/10 p-3', collapsed && !mobile && 'px-2')}>
        <div className={cn('flex items-center gap-2.5 rounded-lg p-1.5', collapsed && !mobile && 'justify-center')}>
          <Avatar name={user.name} src={user.avatarUrl} className="ring-2 ring-white/10" />
          {collapsed && !mobile ? null : (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-crema">{user.name}</p>
              <p className="truncate text-[0.68rem] text-crema/50">{ROLE_LABEL[user.role]}</p>
            </div>
          )}
        </div>
        {!mobile ? (
          <button type="button" onClick={toggleCollapsed} className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg py-1.5 text-[0.72rem] text-crema/45 hover:bg-white/5 hover:text-crema" aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}>
            {collapsed ? <ChevronsRight className="size-4" /> : <><ChevronsLeft className="size-4" /> Contraer</>}
          </button>
        ) : null}
      </div>
    </nav>
  );

  return (
    <div className="min-h-dvh bg-[#F6F3EE] print:bg-white">
      {demo ? (
        <div className="sticky top-0 z-[60] flex items-center justify-center gap-2 bg-[repeating-linear-gradient(135deg,#EB9A37_0_14px,#F0A84C_14px_28px)] px-4 py-1 text-center text-[0.72rem] font-semibold text-noche print:hidden">
          <span className="truncate">Modo demo · datos de ejemplo<span className="hidden sm:inline"> realistas — los cambios no se guardan hasta conectar la base de datos de cPanel</span></span>
        </div>
      ) : null}
      {/* Sidebar escritorio */}
      <aside className={cn('fixed bottom-0 left-0 z-40 hidden lg:block print:hidden', demo ? 'top-[26px]' : 'top-0', collapsed ? 'w-[68px]' : 'w-[244px]')} style={{ transition: 'width .2s ease', backgroundColor: '#111A31' }}>
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-andino opacity-[0.06]" />
        {sidebar(false)}
      </aside>
      {/* Drawer móvil */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-[70] lg:hidden print:hidden">
          <button type="button" aria-label="Cerrar menú" className="absolute inset-0 bg-noche-950/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[272px] shadow-2xl" style={{ backgroundColor: '#111A31' }}>{sidebar(true)}</aside>
        </div>
      ) : null}

      <div className={cn('flex min-h-dvh flex-col transition-[padding] duration-200', collapsed ? 'lg:pl-[68px]' : 'lg:pl-[244px]', 'print:pl-0')}>
        <header className={cn('sticky z-30 flex h-14 items-center gap-2 border-b border-noche/[0.07] bg-[#F6F3EE]/85 px-3 backdrop-blur-md sm:px-5 print:hidden', demo ? 'top-[26px]' : 'top-0')}>
          <button type="button" onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-noche hover:bg-noche/5 lg:hidden" aria-label="Abrir menú">
            <Menu className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="flex h-9 w-full min-w-0 max-w-md items-center gap-2 rounded-lg border border-noche/10 bg-white px-3 text-sm text-gris shadow-[0_1px_1px_rgba(17,26,49,0.03)] transition hover:border-noche/25"
          >
            <Search className="size-4" />
            <span className="truncate">Buscar pedidos, clientes, productos, cursos…</span>
            <kbd className="ml-auto hidden rounded border border-noche/15 bg-crema px-1.5 py-0.5 font-sans text-[0.65rem] font-semibold text-noche/60 sm:inline">⌘K</kbd>
          </button>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {showRange ? (
              <Suspense fallback={null}>
                <RangePicker />
              </Suspense>
            ) : null}
            <a href="/" target="_blank" rel="noreferrer" className="hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-noche/75 hover:bg-noche/5 hover:text-noche md:inline-flex">
              <ExternalLink className="size-4" /> Ver sitio
            </a>
            <UserMenu user={user} demo={demo} />
          </div>
        </header>
        <main id="contenido" className="mx-auto w-full max-w-[1480px] flex-1 px-3 py-6 sm:px-6 lg:px-8 print:max-w-none print:p-0">
          {children}
        </main>
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} role={user.role} />
    </div>
  );
}

function UserMenu({ user, demo }: { user: ShellUser; demo: boolean }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 rounded-full p-0.5 pr-2 hover:bg-noche/5" aria-haspopup="menu" aria-expanded={open}>
        <Avatar name={user.name} src={user.avatarUrl} />
        <span className="hidden text-left leading-tight xl:block">
          <span className="block text-xs font-semibold text-noche">{user.name.split(' ')[0]}</span>
          <span className="block text-[0.65rem] text-gris">{ROLE_LABEL[user.role]}</span>
        </span>
      </button>
      {open ? (
        <>
          <button type="button" aria-hidden tabIndex={-1} className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />
          <div role="menu" className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-noche/10 bg-white shadow-elevada">
            <div className="border-b border-noche/[0.07] px-4 py-3">
              <p className="truncate text-sm font-semibold text-noche">{user.name}</p>
              <p className="truncate text-xs text-gris">{user.email}</p>
            </div>
            <a href="/" target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2.5 text-sm text-noche hover:bg-crema/60">
              <ExternalLink className="size-4" /> Ver sitio
            </a>
            <button
              type="button"
              role="menuitem"
              onClick={async () => {
                if (!demo) await signOutEverywhere();
                router.push('/acceso');
              }}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-cereza hover:bg-rose-50"
            >
              <LogOut className="size-4" /> {demo ? 'Salir del panel demo' : 'Cerrar sesión'}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
