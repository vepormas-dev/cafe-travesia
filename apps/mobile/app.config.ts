import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Extiende app.json con valores que dependen del entorno:
 * - Esquema invertido del Client ID de Google para iOS (redirección OAuth nativa de Google).
 * - projectId de EAS (EAS_PROJECT_ID) si no está fijado en app.json.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';
  const reversed = iosClientId ? iosClientId.split('.').reverse().join('.') : null;
  const baseScheme = (config.scheme as string | undefined) ?? 'cafetravesia';
  const projectId = (config.extra?.eas?.projectId as string | undefined) || process.env.EAS_PROJECT_ID || undefined;
  return {
    ...(config as ExpoConfig),
    scheme: reversed ? [baseScheme, reversed] : baseScheme,
    extra: { ...config.extra, eas: { ...config.extra?.eas, ...(projectId ? { projectId } : {}) } },
  };
};
