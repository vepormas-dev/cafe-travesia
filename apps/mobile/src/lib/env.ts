import Constants from 'expo-constants';

const trim = (s?: string) => (s ?? '').trim().replace(/\/+$/, '');

export const env = {
  apiUrl: trim(process.env.EXPO_PUBLIC_API_URL) || 'https://cafetravesia.com',
  /** Fuerza el modo demo (útil para capturas y desarrollo sin backend). */
  forceDemo: process.env.EXPO_PUBLIC_DEMO === '1',
  firebase: {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  },
  google: {
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '',
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
  },
  appVersion: Constants.expoConfig?.version ?? '1.0.0',
  easProjectId: (Constants.expoConfig?.extra?.eas?.projectId as string | undefined) ?? Constants.easConfig?.projectId ?? '',
} as const;

export const firebaseConfigured = Boolean(env.firebase.apiKey && env.firebase.projectId && env.firebase.appId);

/** Convierte rutas relativas de la API (/brand/..., /media/...) en absolutas. */
export const absoluteUrl = (u: string) => (/^https?:\/\//.test(u) ? u : `${env.apiUrl}${u.startsWith('/') ? '' : '/'}${u}`);
