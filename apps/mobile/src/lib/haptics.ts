import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

const native = Platform.OS === 'ios' || Platform.OS === 'android';

/** Háptica en acciones clave (silenciosa en web). */
export const haptic = {
  tap: () => native && void Haptics.selectionAsync().catch(() => undefined),
  add: () => native && void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined),
  success: () => native && void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined),
  warning: () => native && void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined),
  error: () => native && void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined),
};
