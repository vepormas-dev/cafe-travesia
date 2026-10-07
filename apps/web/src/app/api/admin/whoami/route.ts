import { NextResponse } from 'next/server';
import { apiUser } from '@/lib/auth';
import { isDemoMode } from '@/lib/env';

/** GET → rol del usuario de la sesión (lo usa /acceso para decidir la redirección). */
export async function GET() {
  if (isDemoMode()) return NextResponse.json({ demo: true, staff: true, user: { email: 'demo@cafetravesia.co', fullName: 'Equipo Café Travesía', role: 'admin' } }, { headers: { 'cache-control': 'no-store' } });
  const u = await apiUser();
  if (!u) return NextResponse.json({ demo: false, staff: false, user: null }, { status: 401, headers: { 'cache-control': 'no-store' } });
  return NextResponse.json(
    { demo: false, staff: u.role === 'admin' || u.role === 'editor', user: { email: u.email, fullName: u.fullName, role: u.role, avatarUrl: u.avatarUrl } },
    { headers: { 'cache-control': 'no-store' } },
  );
}
