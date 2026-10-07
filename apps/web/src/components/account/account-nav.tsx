'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Bell, Coins, GraduationCap, LayoutDashboard, Loader2, LogOut, Package, Repeat, ShieldCheck, UserRound } from 'lucide-react';
import { initials } from '@travesia/shared';
import { signOutEverywhere } from '@/lib/firebase/client';
import { cn } from '@/lib/cn';

const ITEMS = [
  { href: '/cuenta', label: 'Resumen', icon: LayoutDashboard, exact: true },
  { href: '/cuenta/pedidos', label: 'Pedidos', icon: Package },
  { href: '/cuenta/suscripcion', label: 'Suscripción', icon: Repeat },
  { href: '/cuenta/cursos', label: 'Mis cursos y certificados', short: 'Mis cursos', icon: GraduationCap },
  { href: '/cuenta/puntos', label: 'Puntos Travesía', short: 'Puntos', icon: Coins },
  { href: '/cuenta/perfil', label: 'Perfil y direcciones', short: 'Perfil', icon: UserRound },
  { href: '/cuenta/notificaciones', label: 'Notificaciones', icon: Bell },
];

export function AccountNav({ name, email, avatarUrl, points, unread, isStaff }: { name: string | null; email: string; avatarUrl: string | null; points: number; unread: number; isStaff: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [out, setOut] = useState(false);
  const active = (h: string, exact?: boolean) => (exact ? pathname === h : pathname === h || pathname.startsWith(`${h}/`));

  async function logout() {
    setOut(true);
    await signOutEverywhere();
    router.replace('/');
    router.refresh();
  }

  return (
    <>
      {/* Escritorio */}
      <aside className="hidden lg:block" aria-label="Mi cuenta">
        <div className="sticky top-26 space-y-6">
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="size-12 rounded-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <span className="grid size-12 place-items-center rounded-full bg-noche font-display text-lg text-crema">{initials(name ?? email)}</span>
            )}
            <div className="min-w-0">
              <p className="truncate font-display text-lg text-noche">Hola, {(name ?? '').split(' ')[0] || 'viajero'}</p>
              <p className="truncate text-xs text-gris">{points.toLocaleString('es-CO')} Puntos Travesía</p>
            </div>
          </div>
          <nav>
            <ul className="space-y-1">
              {ITEMS.map(({ href, label, icon: Icon, exact }) => (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active(href, exact) ? 'page' : undefined}
                    className={cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.95rem] transition', active(href, exact) ? 'bg-noche text-crema' : 'text-noche/80 hover:bg-noche/5 hover:text-noche')}
                  >
                    <Icon className="size-4.5 shrink-0" aria-hidden />
                    <span className="flex-1">{label}</span>
                    {href === '/cuenta/notificaciones' && unread > 0 ? <span className="rounded-full bg-ambar px-1.5 text-[0.65rem] font-bold text-noche tabular-nums">{unread}</span> : null}
                  </Link>
                </li>
              ))}
              {isStaff ? (
                <li className="pt-2">
                  <Link href="/admin" className="flex items-center gap-3 rounded-xl border border-dashed border-noche/20 px-3 py-2.5 text-[0.95rem] text-noche/80 hover:border-noche hover:text-noche">
                    <ShieldCheck className="size-4.5" aria-hidden /> Panel administrativo
                  </Link>
                </li>
              ) : null}
            </ul>
          </nav>
          <Link href="/tienda" className="btn-ambar w-full">
            Explorar nuevos cafés
          </Link>
          <button type="button" onClick={logout} disabled={out} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[0.95rem] text-cereza hover:bg-cereza/5">
            {out ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <LogOut className="size-4" aria-hidden />} Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Móvil: pestañas horizontales */}
      <nav aria-label="Mi cuenta" className="scrollbar-none -mx-5 overflow-x-auto border-b border-noche/10 px-5 sm:-mx-8 sm:px-8 lg:hidden">
        <ul className="flex min-w-max gap-1">
          {ITEMS.map(({ href, label, short, icon: Icon, exact }) => (
            <li key={href}>
              <Link
                href={href}
                aria-current={active(href, exact) ? 'page' : undefined}
                className={cn('flex items-center gap-2 border-b-2 px-3 py-3 text-sm whitespace-nowrap transition', active(href, exact) ? 'border-noche font-semibold text-noche' : 'border-transparent text-noche/60')}
              >
                <Icon className="size-4" aria-hidden /> {short ?? label}
                {href === '/cuenta/notificaciones' && unread > 0 ? <span className="rounded-full bg-ambar px-1.5 text-[0.6rem] font-bold text-noche">{unread}</span> : null}
              </Link>
            </li>
          ))}
          {isStaff ? (
            <li>
              <Link href="/admin" className="flex items-center gap-2 px-3 py-3 text-sm whitespace-nowrap text-noche/60">
                <ShieldCheck className="size-4" aria-hidden /> Admin
              </Link>
            </li>
          ) : null}
          <li>
            <button type="button" onClick={logout} className="flex items-center gap-2 px-3 py-3 text-sm whitespace-nowrap text-cereza">
              <LogOut className="size-4" aria-hidden /> Salir
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}

/** Respaldo: si una página de /cuenta no se protege sola, enviar al ingreso conservando la ruta. */
export function LoginRedirect() {
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    router.replace(`/ingresar?next=${encodeURIComponent(pathname)}`);
  }, [router, pathname]);
  return null;
}
