import { getApp, getApps, initializeApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';

import { createAuth } from './auth-instance';
import { env, firebaseConfigured } from './env';

let auth: Auth | null = null;

/** Instancia única de Firebase Auth, o null si faltan las variables EXPO_PUBLIC_FIREBASE_*. */
export function getFirebaseAuth(): Auth | null {
  if (!firebaseConfigured) return null;
  if (auth) return auth;
  const app = getApps().length ? getApp() : initializeApp(env.firebase);
  auth = createAuth(app);
  return auth;
}
