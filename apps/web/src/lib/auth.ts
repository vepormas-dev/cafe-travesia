import 'server-only';
/**
 * Autenticación: Firebase Auth (identidad) + tabla users en MySQL (perfil y rol).
 *  - Web: cookie httpOnly "__session" (Firebase session cookie, 14 días).
 *  - App móvil / API: header Authorization: Bearer <Firebase ID token>.
 * El rol vive en la BD (fuente de verdad) y se replica como custom claim "role".
 */
import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { adminAuth } from '@/lib/firebase/admin';
import { env, isDbConfigured, isFirebaseAdminConfigured } from '@/lib/env';
import { getDb, t, isDuplicateError } from '@/lib/db';

export const SESSION_COOKIE = '__session';
export const SESSION_DAYS = 14;

export type SessionUser = {
  id: string;
  firebaseUid: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  role: 'customer' | 'editor' | 'admin';
  loyaltyPoints: number;
  marketingOptIn: boolean;
  legalIdType: string | null;
  legalId: string | null;
  isDemo?: boolean;
};

/** Usuario administrador ficticio para recorrer el panel en modo demo (sin BD). */
const DEMO_ADMIN: SessionUser = {
  id: 'demo-admin',
  firebaseUid: 'demo',
  email: 'demo@cafetravesia.co',
  fullName: 'Equipo Café Travesía',
  phone: null,
  avatarUrl: null,
  role: 'admin',
  loyaltyPoints: 0,
  marketingOptIn: false,
  legalIdType: null,
  legalId: null,
  isDemo: true,
};

function toSessionUser(u: typeof t.users.$inferSelect): SessionUser {
  return {
    id: u.id,
    firebaseUid: u.firebaseUid,
    email: u.email,
    fullName: u.fullName,
    phone: u.phone,
    avatarUrl: u.avatarUrl,
    role: u.role,
    loyaltyPoints: u.loyaltyPoints,
    marketingOptIn: u.marketingOptIn,
    legalIdType: u.legalIdType ?? null,
    legalId: u.legalId,
  };
}

/** Crea o vincula el usuario de la BD a partir del token verificado de Firebase. */
export async function upsertUserFromToken(decoded: DecodedIdToken): Promise<SessionUser> {
  const db = getDb();
  const email = (decoded.email ?? '').toLowerCase();
  if (!email) throw new Error('Tu cuenta no tiene un correo asociado');
  const provider = decoded.firebase?.sign_in_provider ?? null;
  const bootstrapAdmin = env.adminEmails.includes(email);

  let [row] = await db.select().from(t.users).where(eq(t.users.firebaseUid, decoded.uid)).limit(1);
  if (!row) {
    // ¿Existe con el mismo correo (p. ej. compró como invitado o cambió de proveedor)? → vincular
    const [byEmail] = await db.select().from(t.users).where(eq(t.users.email, email)).limit(1);
    if (byEmail) {
      await db.update(t.users).set({ firebaseUid: decoded.uid, provider, emailVerified: Boolean(decoded.email_verified) }).where(eq(t.users.id, byEmail.id));
      row = { ...byEmail, firebaseUid: decoded.uid };
    } else {
      const id = crypto.randomUUID();
      try {
        await db.insert(t.users).values({
          id,
          firebaseUid: decoded.uid,
          email,
          emailVerified: Boolean(decoded.email_verified),
          fullName: (decoded.name as string | undefined) ?? null,
          avatarUrl: (decoded.picture as string | undefined) ?? null,
          provider,
          role: bootstrapAdmin ? 'admin' : 'customer',
        });
      } catch (e) {
        if (!isDuplicateError(e)) throw e; // carrera: otra petición lo creó
      }
      [row] = await db.select().from(t.users).where(eq(t.users.firebaseUid, decoded.uid)).limit(1);
    }
  }
  if (bootstrapAdmin && row.role !== 'admin') {
    await db.update(t.users).set({ role: 'admin' }).where(eq(t.users.id, row.id));
    row = { ...row, role: 'admin' };
  }
  // Replicar el rol como custom claim (útil para reglas y para la app)
  if ((decoded.role as string | undefined) !== row.role) {
    await adminAuth().setCustomUserClaims(decoded.uid, { role: row.role }).catch(() => undefined);
  }
  return toSessionUser(row);
}

async function userByFirebaseUid(uid: string) {
  const [row] = await getDb().select().from(t.users).where(eq(t.users.firebaseUid, uid)).limit(1);
  return row ? toSessionUser(row) : null;
}

/** Usuario de la petición actual (cookie web o Bearer de la app). Memoizado por request. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  if (!isFirebaseAdminConfigured() || !isDbConfigured()) return null;
  try {
    const h = await headers();
    const bearer = h.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (bearer) {
      const decoded = await adminAuth().verifyIdToken(bearer);
      return (await userByFirebaseUid(decoded.uid)) ?? (await upsertUserFromToken(decoded));
    }
    const c = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!c) return null;
    const decoded = await adminAuth().verifySessionCookie(c, false);
    return await userByFirebaseUid(decoded.uid);
  } catch {
    return null;
  }
});

export async function requireUser(next = '/cuenta'): Promise<SessionUser> {
  const u = await getSessionUser();
  if (!u) redirect(`/ingresar?next=${encodeURIComponent(next)}`);
  return u;
}

/** Panel: admin o editor (editor no gestiona usuarios, pagos ni configuración). */
export async function requireStaff(next = '/admin'): Promise<SessionUser> {
  if (!isDbConfigured()) return DEMO_ADMIN;
  const u = await getSessionUser();
  if (!u) redirect(`/acceso?next=${encodeURIComponent(next)}`);
  if (u.role !== 'admin' && u.role !== 'editor') redirect('/acceso?error=permisos');
  return u;
}

export async function requireAdmin(next = '/admin'): Promise<SessionUser> {
  const u = await requireStaff(next);
  if (u.role !== 'admin') redirect('/admin?error=solo-admin');
  return u;
}

/** Para route handlers: devuelve el usuario o null (sin redirecciones). */
export async function apiUser() {
  return getSessionUser();
}
export async function apiStaff() {
  if (!isDbConfigured()) return null;
  const u = await getSessionUser();
  return u && (u.role === 'admin' || u.role === 'editor') ? u : null;
}

export const isDemoUser = (u: SessionUser | null) => Boolean(u?.isDemo);
