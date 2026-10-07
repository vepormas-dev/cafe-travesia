'use client';
/**
 * Firebase Auth en el navegador. La sesión del servidor se crea intercambiando
 * el ID token por una cookie httpOnly (POST /api/auth/session).
 */
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  signOut,
  browserLocalPersistence,
  setPersistence,
  type Auth,
  type User,
} from 'firebase/auth';

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseEnabled = Boolean(config.apiKey && config.authDomain && config.projectId);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

export function firebaseAuth(): Auth {
  if (!firebaseEnabled) throw new Error('Firebase no está configurado');
  if (!auth) {
    app = getApps().length ? getApp() : initializeApp(config);
    auth = getAuth(app);
    auth.languageCode = 'es';
    void setPersistence(auth, browserLocalPersistence);
  }
  return auth;
}

/** Intercambia el ID token por la cookie de sesión del servidor. */
async function createServerSession(user: User) {
  const idToken = await user.getIdToken(true);
  const res = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? 'No pudimos iniciar tu sesión');
  }
  return (await res.json()) as { ok: true; role: 'customer' | 'editor' | 'admin' };
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const cred = await signInWithPopup(firebaseAuth(), provider);
  return createServerSession(cred.user);
}

export async function signInWithApple() {
  const provider = new OAuthProvider('apple.com');
  provider.addScope('email');
  provider.addScope('name');
  provider.setCustomParameters({ locale: 'es_CO' });
  const cred = await signInWithPopup(firebaseAuth(), provider);
  return createServerSession(cred.user);
}

export async function signInWithEmail(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(firebaseAuth(), email, password);
  return createServerSession(cred.user);
}

export async function registerWithEmail(email: string, password: string, fullName: string) {
  const cred = await createUserWithEmailAndPassword(firebaseAuth(), email, password);
  await updateProfile(cred.user, { displayName: fullName });
  void sendEmailVerification(cred.user).catch(() => undefined);
  return createServerSession(cred.user);
}

export const resetPassword = (email: string) => sendPasswordResetEmail(firebaseAuth(), email);

export async function signOutEverywhere() {
  await fetch('/api/auth/session', { method: 'DELETE' }).catch(() => undefined);
  if (firebaseEnabled) await signOut(firebaseAuth()).catch(() => undefined);
}

/** Traduce los códigos de error de Firebase a mensajes claros en español. */
export function authErrorMessage(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  const map: Record<string, string> = {
    'auth/invalid-credential': 'Correo o contraseña incorrectos.',
    'auth/wrong-password': 'Correo o contraseña incorrectos.',
    'auth/user-not-found': 'No encontramos una cuenta con ese correo.',
    'auth/email-already-in-use': 'Ya existe una cuenta con ese correo. Inicia sesión.',
    'auth/weak-password': 'La contraseña debe tener al menos 8 caracteres.',
    'auth/invalid-email': 'Escribe un correo válido.',
    'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
    'auth/popup-closed-by-user': 'Cerraste la ventana antes de terminar.',
    'auth/popup-blocked': 'Tu navegador bloqueó la ventana emergente. Permítela e inténtalo otra vez.',
    'auth/account-exists-with-different-credential': 'Ese correo ya está registrado con otro método de ingreso.',
    'auth/network-request-failed': 'Sin conexión. Revisa tu internet.',
  };
  return map[code] ?? (e instanceof Error && !code ? e.message : 'No pudimos completar el ingreso. Inténtalo de nuevo.');
}
