import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { eq } from 'drizzle-orm';
import { adminAuth } from '@/lib/firebase/admin';
import { SESSION_COOKIE, SESSION_DAYS, upsertUserFromToken } from '@/lib/auth';
import { isDbConfigured, isFirebaseAdminConfigured } from '@/lib/env';
import { getDb, t } from '@/lib/db';
import { logEvent } from '@/lib/monitor';
import { rateLimit } from '@/lib/rate-limit';

/** POST { idToken } → crea la cookie de sesión (httpOnly) y sincroniza el usuario en MySQL. */
export async function POST(req: Request) {
  if (!isFirebaseAdminConfigured() || !isDbConfigured()) {
    return NextResponse.json({ error: 'El inicio de sesión no está disponible en modo demo.' }, { status: 503 });
  }
  const limited = await rateLimit(req, 'auth-session', 20, 60);
  if (limited) return limited;
  const { idToken } = (await req.json().catch(() => ({}))) as { idToken?: string };
  if (!idToken) return NextResponse.json({ error: 'Falta el token' }, { status: 400 });
  try {
    const auth = adminAuth();
    const decoded = await auth.verifyIdToken(idToken, true);
    // Exigir un inicio de sesión reciente (mitiga robo de ID tokens)
    if (Date.now() / 1000 - decoded.auth_time > 10 * 60) {
      return NextResponse.json({ error: 'Vuelve a iniciar sesión' }, { status: 401 });
    }
    const user = await upsertUserFromToken(decoded);
    const expiresIn = SESSION_DAYS * 24 * 60 * 60 * 1000;
    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });
    (await cookies()).set(SESSION_COOKIE, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: expiresIn / 1000,
    });
    await getDb().update(t.users).set({ lastSeenAt: new Date() }).where(eq(t.users.id, user.id));
    return NextResponse.json({ ok: true, role: user.role });
  } catch (e) {
    await logEvent('auth', 'session.create', 'error', { message: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ error: 'No pudimos validar tu sesión. Inténtalo de nuevo.' }, { status: 401 });
  }
}

/** DELETE → cierra la sesión y revoca los refresh tokens del usuario. */
export async function DELETE() {
  const jar = await cookies();
  const c = jar.get(SESSION_COOKIE)?.value;
  jar.delete(SESSION_COOKIE);
  if (c && isFirebaseAdminConfigured()) {
    try {
      const decoded = await adminAuth().verifySessionCookie(c);
      await adminAuth().revokeRefreshTokens(decoded.sub);
    } catch {
      /* cookie inválida o vencida */
    }
  }
  return NextResponse.json({ ok: true });
}
