/**
 * Sesión con Firebase Auth (JS SDK v12): correo/contraseña, Google (id_token de expo-auth-session)
 * y Apple en iOS (expo-apple-authentication + nonce SHA-256 con expo-crypto).
 * Tras ingresar se llama GET /api/v1/me (crea/actualiza el usuario en el backend vía Bearer).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  OAuthProvider,
  onIdTokenChanged,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import type { MeDTO } from '@travesia/shared';

import { api, isDemo, useApiMode } from './api';
import { cart } from './cart';
import { demoMe } from './demo';
import { getFirebaseAuth } from './firebase';
import { queryClient } from './query';

type AuthState = {
  ready: boolean;
  user: User | null;
  /** Usuario del backend (o el de ejemplo en modo demo). */
  me: MeDTO | null;
  signedIn: boolean;
  /** true si puede ver datos de cuenta (sesión real o modo demo). */
  canUseAccount: boolean;
  configured: boolean;
  refreshMe: () => Promise<void>;
  setMe: (me: MeDTO) => void;
  signInEmail: (email: string, password: string) => Promise<void>;
  signUpEmail: (fullName: string, email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signInGoogle: (idToken: string, accessToken?: string) => Promise<void>;
  signInApple: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

function requireAuth() {
  const a = getFirebaseAuth();
  if (!a) throw new Error('El inicio de sesión no está configurado (faltan las variables EXPO_PUBLIC_FIREBASE_*).');
  return a;
}

export const firebaseErrorMessage = (e: unknown) => {
  const code = (e as { code?: string })?.code ?? '';
  const map: Record<string, string> = {
    'auth/invalid-credential': 'Correo o contraseña incorrectos.',
    'auth/wrong-password': 'Correo o contraseña incorrectos.',
    'auth/user-not-found': 'No encontramos una cuenta con ese correo.',
    'auth/email-already-in-use': 'Ya existe una cuenta con ese correo. Ingresa o recupera tu contraseña.',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
    'auth/invalid-email': 'Escribe un correo válido.',
    'auth/too-many-requests': 'Demasiados intentos. Espera un momento e intenta de nuevo.',
    'auth/network-request-failed': 'Sin conexión. Revisa tu internet.',
    ERR_REQUEST_CANCELED: '',
  };
  if (code in map) return map[code]!;
  return e instanceof Error ? e.message : 'No pudimos iniciar sesión.';
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const mode = useApiMode();
  const [ready, setReady] = useState(() => !getFirebaseAuth());
  const [user, setUser] = useState<User | null>(null);
  const [me, setMeState] = useState<MeDTO | null>(null);

  const refreshMe = useCallback(async () => {
    if (!getFirebaseAuth()?.currentUser || isDemo()) return;
    try {
      const r = await api.get<{ user: MeDTO }>('/api/v1/me');
      setMeState(r.user);
    } catch {
      /* el backend puede no estar disponible: la sesión de Firebase sigue válida */
    }
  }, []);

  useEffect(() => {
    const a = getFirebaseAuth();
    if (!a) return;
    let prevUid: string | null = null;
    return onIdTokenChanged(a, (u) => {
      setUser(u);
      setReady(true);
      if (u && u.uid !== prevUid) {
        prevUid = u.uid;
        void refreshMe();
        void cart.syncOnLogin();
        void queryClient.invalidateQueries({ queryKey: ['me'] });
      }
      if (!u) {
        prevUid = null;
        setMeState(null);
        cart.onLogout();
      }
    });
  }, [refreshMe]);

  const value = useMemo<AuthState>(() => {
    const demo = mode === 'demo';
    return {
      ready,
      user,
      me: me ?? (demo ? { ...demoMe, ...(user ? { email: user.email ?? demoMe.email, fullName: user.displayName ?? demoMe.fullName } : {}) } : null),
      signedIn: !!user,
      canUseAccount: !!user || demo,
      configured: !!getFirebaseAuth(),
      refreshMe,
      setMe: setMeState,
      async signInEmail(email, password) {
        await signInWithEmailAndPassword(requireAuth(), email.trim(), password);
      },
      async signUpEmail(fullName, email, password) {
        const cred = await createUserWithEmailAndPassword(requireAuth(), email.trim(), password);
        await updateProfile(cred.user, { displayName: fullName.trim() });
        await cred.user.getIdToken(true);
        await refreshMe();
      },
      async resetPassword(email) {
        await sendPasswordResetEmail(requireAuth(), email.trim());
      },
      async signInGoogle(idToken, accessToken) {
        await signInWithCredential(requireAuth(), GoogleAuthProvider.credential(idToken, accessToken));
      },
      async signInApple() {
        const [AppleAuthentication, Crypto] = await Promise.all([import('expo-apple-authentication'), import('expo-crypto')]);
        const rawNonce = Crypto.randomUUID();
        const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
        const apple = await AppleAuthentication.signInAsync({
          requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
          nonce: hashedNonce,
        });
        if (!apple.identityToken) throw new Error('Apple no devolvió un token de identidad.');
        const provider = new OAuthProvider('apple.com');
        const cred = await signInWithCredential(requireAuth(), provider.credential({ idToken: apple.identityToken, rawNonce }));
        const name = [apple.fullName?.givenName, apple.fullName?.familyName].filter(Boolean).join(' ');
        if (name && !cred.user.displayName) await updateProfile(cred.user, { displayName: name });
      },
      async signOut() {
        const a = getFirebaseAuth();
        if (a) await fbSignOut(a);
        queryClient.removeQueries({ queryKey: ['me'] });
      },
    };
  }, [ready, user, me, mode, refreshMe]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return v;
}
