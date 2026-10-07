import { StyleSheet } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { router } from 'expo-router';

import { C, shadow } from '@/theme';
import { Icon, PressableScale } from './ui';
import { haptic } from '@/lib/haptics';

/** Botón flotante de soporte: abre el asistente (chat). */
export function SupportFab({ dark, bottom = 100 }: { dark?: boolean; bottom?: number }) {
  return (
    <Animated.View entering={ZoomIn.delay(300).springify()} style={[styles.wrap, { bottom }]}>
      <PressableScale
        onPress={() => {
          haptic.tap();
          router.push('/chat');
        }}
        accessibilityLabel="Abrir asistente y soporte"
        style={[styles.fab, { backgroundColor: dark ? C.lima : C.noche }]}>
        <Icon name="headset" size={26} color={dark ? C.ink : C.ambar} />
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', right: 18, zIndex: 20 },
  fab: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', ...shadow, shadowOpacity: 0.25 },
});
