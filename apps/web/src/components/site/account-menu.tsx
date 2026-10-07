'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { LayoutDashboard, LogOut, UserRound } from 'lucide-react';
import { initials } from '@travesia/shared';
import { cn } from '@/lib/cn';
import { ACCOUNT_LINKS } from './nav';
import { headerIcon } from './styles';

export type HeaderUser = { name: string | null; email: string; role: 'customer' | 'editor' | 'admin'; points: number; avatarUrl: string | null } | null;

export function AccountMenu({ user, className }: { user: HeaderUser; className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user)
    return (
      <Link href="/ingresar" className={cn(headerIcon, className)} aria-label="Ingresar a tu cuenta" title="Ingresar">
        <UserRound className="size-5" aria-hidden />
      </Link>
    );

  const staff = user.role === 'admin' || user.role === 'editor';
  const signOut = async () => {
    const { signOutEverywhere } = await import('@/lib/firebase/client');
    await signOutEverywhere();
    window.location.href = '/';
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Tu cuenta: ${user.name ?? user.email}`}
        className={cn(headerIcon, className)}
      >
        <span className="grid size-7 place-items-center rounded-full bg-ambar text-[0.7rem] font-bold text-noche">{initials(user.name ?? user.email)}</span>
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 top-full z-50 mt-3 w-64 origin-top-right animate-fade-up overflow-hidden rounded-2xl border border-noche/10 bg-hueso text-noche shadow-elevada">
          <div className="border-b border-noche/10 bg-arena/60 px-4 py-3">
            <p className="truncate text-sm font-semibold">{user.name ?? 'Hola'}</p>
            <p className="truncate text-xs text-gris">{user.email}</p>
            <p className="mt-1 text-xs font-medium text-ambar-700">{user.points.toLocaleString('es-CO')} Puntos Travesía</p>
          </div>
          <ul className="py-1.5">
            {ACCOUNT_LINKS.map((l) => (
              <li key={l.href}>
                <Link role="menuitem" href={l.href} onClick={() => setOpen(false)} className="block px-4 py-2 text-sm hover:bg-arena/70 focus-visible:bg-arena/70">
                  {l.label}
                </Link>
              </li>
            ))}
            {staff ? (
              <li className="mt-1 border-t border-noche/10 pt-1">
                <Link role="menuitem" href="/admin" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-noche hover:bg-arena/70">
                  <LayoutDashboard className="size-4 text-ambar-700" aria-hidden /> Panel administrativo
                </Link>
              </li>
            ) : null}
            <li className="border-t border-noche/10 pt-1">
              <button role="menuitem" type="button" onClick={signOut} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gris hover:bg-arena/70 hover:text-noche">
                <LogOut className="size-4" aria-hidden /> Cerrar sesión
              </button>
            </li>
          </ul>
        </div>
      ) : null}
    </div>
  );
}
