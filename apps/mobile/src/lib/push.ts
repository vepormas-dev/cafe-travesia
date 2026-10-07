/**
 * Notificaciones push (expo-notifications, SDK 57): permisos, canal Android 'default',
 * token Expo con projectId de EAS, registro en POST /api/push/register y manejo de toques (data.url).
 */
import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

import { api, isDemo } from './api';
import { env } from './env';
import { openLink } from './links';
import { KEYS, readJSON, removeKey, writeJSON } from './storage';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: true, shouldShowBanner: true, shouldShowList: true }),
  });
}

export type PushResult = { ok: true; token: string } | { ok: false; reason: string };

async function ensureChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Café Travesía',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 120, 200],
      lightColor: '#EB9A37',
    });
  }
}

/** Pide permiso (si hace falta), obtiene el token Expo y lo registra en el backend. */
export async function registerPush(opts: { prompt?: boolean } = { prompt: true }): Promise<PushResult> {
  if (Platform.OS === 'web') return { ok: false, reason: 'Las notificaciones push solo están disponibles en la app de iOS y Android.' };
  if (!Device.isDevice) return { ok: false, reason: 'Las notificaciones push requieren un dispositivo físico.' };
  await ensureChannel();
  const current = await Notifications.getPermissionsAsync();
  let status = current.status;
  if (status !== 'granted' && opts.prompt !== false) status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return { ok: false, reason: 'Activa las notificaciones de Café Travesía en los ajustes del teléfono.' };
  if (!env.easProjectId) return { ok: false, reason: 'Falta extra.eas.projectId en app.json (ejecuta eas init).' };
  const token = (await Notifications.getExpoPushTokenAsync({ projectId: env.easProjectId })).data;
  await writeJSON(KEYS.pushToken, token);
  await writeJSON(KEYS.pushEnabled, true);
  if (!isDemo()) {
    try {
      await api.post('/api/push/register', { token, platform: Platform.OS === 'ios' ? 'ios' : 'android', appVersion: env.appVersion });
    } catch {
      /* se reintenta en el próximo arranque */
    }
  }
  return { ok: true, token };
}

export async function disablePush() {
  const token = await readJSON<string | null>(KEYS.pushToken, null);
  await writeJSON(KEYS.pushEnabled, false);
  if (token && !isDemo()) await api.del('/api/push/register', { token }).catch(() => undefined);
  await removeKey(KEYS.pushToken);
}

export const isPushEnabled = () => readJSON<boolean>(KEYS.pushEnabled, false);

/** Re-registra en silencio al arrancar/iniciar sesión si el usuario ya lo había activado. */
export async function refreshPushRegistration() {
  if (Platform.OS === 'web') return;
  if (await isPushEnabled()) await registerPush({ prompt: false }).catch(() => undefined);
}

/** Abre la pantalla equivalente a data.url al tocar una notificación (también en arranque en frío). */
export function usePushObserver() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const go = (n: Notifications.Notification) => {
      const url = n.request.content.data?.url;
      if (typeof url === 'string') setTimeout(() => void openLink(url), 50);
    };
    const last = Notifications.getLastNotificationResponse();
    if (last?.notification) {
      go(last.notification);
      Notifications.clearLastNotificationResponse();
    }
    const sub = Notifications.addNotificationResponseReceivedListener((r) => go(r.notification));
    return () => sub.remove();
  }, []);
}
