import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { formatCOP } from '@travesia/shared';

import { useCartView } from '@/lib/cart-lines';
import { C, F, R, shadow } from '@/theme';
import { PressableScale, T } from './ui';

/** Barra flotante "VER CARRITO (n items) $total" (mockup tienda). */
export function CartBar({ bottom = 90 }: { bottom?: number }) {
  const { count, subtotal } = useCartView();
  if (!count) return null;
  return (
    <Animated.View entering={FadeInDown.springify().damping(18)} exiting={FadeOutDown} style={[styles.wrap, { bottom }]}>
      <PressableScale onPress={() => router.push('/carrito')} accessibilityLabel={`Ver carrito, ${count} productos, total ${formatCOP(subtotal)}`} style={styles.bar}>
        <T v="bodyStrong" color={C.crema} style={{ fontFamily: F.displayRegular, letterSpacing: 0.5 }}>
          VER CARRITO
        </T>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
          <T v="small" color="rgba(248,243,234,0.75)">
            ({count} {count === 1 ? 'item' : 'items'})
          </T>
          <T v="price" color={C.crema}>
            {formatCOP(subtotal)}
          </T>
        </View>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 20, right: 90, zIndex: 15 },
  bar: { height: 60, borderRadius: R.md, backgroundColor: C.tostado, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, ...shadow, shadowOpacity: 0.3 },
});
