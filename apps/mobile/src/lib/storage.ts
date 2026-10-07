import AsyncStorage from '@react-native-async-storage/async-storage';

/** Claves de almacenamiento local (AsyncStorage). */
export const KEYS = {
  cart: 'ct.cart.v1',
  query: 'ct.query.v1',
  chatSession: 'ct.chat.session',
  visitor: 'ct.visitor',
  pushToken: 'ct.push.token',
  pushEnabled: 'ct.push.enabled',
  notes: (lessonId: string) => `ct.notes.${lessonId}`,
} as const;

export async function readJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function writeJSON(key: string, value: unknown) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* almacenamiento lleno o no disponible: no bloquea la app */
  }
}

export const removeKey = (key: string) => AsyncStorage.removeItem(key).catch(() => undefined);
