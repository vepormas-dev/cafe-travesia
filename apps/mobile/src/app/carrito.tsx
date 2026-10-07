import { StyleSheet, View } from 'react-native';
import Animated, { FadeOut, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { formatCOP, type Totals } from '@travesia/shared';

import { Stepper } from '@/components/form';
import { TotalsView } from '@/components/totals';
import { Button, Card, DemoNotice, EmptyState, Header, IconButton, Screen, Skeleton, T } from '@/components/ui';
import { cart } from '@/lib/cart';
import { useCartView } from '@/lib/cart-lines';
import { useQuote } from '@/lib/checkout';
import { haptic } from '@/lib/haptics';
import { imageSource } from '@/lib/images';
import { C, R, S } from '@/theme';

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const { items, lines, count, subtotal, loading } = useCartView();
  const quote = useQuote({ items });
  const totals: Totals | undefined = quote.data?.totals;

  return (
    <View style={{ flex: 1, backgroundColor: C.crema }}>
      <Header title={`Tu carrito${count ? ` (${count})` : ''}`} right={count ? <IconButton name="trash-outline" label="Vaciar carrito" onPress={() => { haptic.warning(); cart.clear(); }} /> : undefined} />
      {!items.length ? (
        <EmptyState icon="bag-outline" title="Tu carrito está vacío" body="Explora nuestros orígenes de Caicedo y llévate café recién tostado." action="Ir a la tienda" onAction={() => router.replace('/tienda')} />
      ) : (
        <>
          <Screen contentStyle={{ gap: S.md, paddingTop: S.md }}>
            <DemoNotice compact />
            {loading ? <Skeleton style={{ height: 100 }} /> : null}
            {lines.map((l) => (
              <Animated.View key={`${l.line.kind}-${l.line.id}-${l.line.variantId ?? ''}`} layout={LinearTransition} exiting={FadeOut} style={styles.line}>
                <View style={[styles.thumb, { backgroundColor: l.themeColor ?? C.arena }]}>
                  <Image source={imageSource(l.imageUrl)} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <T v="bodyStrong" numberOfLines={2}>
                    {l.name}
                  </T>
                  {l.variantName ? (
                    <T v="small" color={C.muted}>
                      {l.variantName}
                    </T>
                  ) : null}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                    {l.line.kind === 'course' ? (
                      <T v="small" color={C.muted}>
                        Curso digital
                      </T>
                    ) : (
                      <Stepper value={l.line.quantity} onChange={(n) => cart.setQuantity(l.line, n)} />
                    )}
                    <T v="bodyStrong">{formatCOP(l.unitPriceCop * l.line.quantity)}</T>
                  </View>
                </View>
                <IconButton name="close" label={`Quitar ${l.name}`} size={18} color={C.muted} onPress={() => { haptic.tap(); cart.remove(l.line); }} />
              </Animated.View>
            ))}
            <Card style={{ marginTop: S.md }}>
              {totals ? <TotalsView totals={totals} /> : quote.isError ? (
                <T v="small" color={C.muted}>
                  Subtotal estimado: {formatCOP(subtotal)}. Los totales finales se calculan en el pago.
                </T>
              ) : (
                <Skeleton style={{ height: 120 }} />
              )}
            </Card>
            <T v="small" color={C.muted} center>
              Envío gratis en el Valle de Aburrá desde $99.000. Cupones y puntos en el siguiente paso.
            </T>
          </Screen>
          <View style={[styles.foot, { paddingBottom: insets.bottom + 12 }]}>
            <View style={{ flex: 1 }}>
              <T v="small" color={C.muted}>
                Total
              </T>
              <T v="price">{formatCOP(totals?.totalCop ?? subtotal)}</T>
            </View>
            <Button title="Continuar al pago" iconRight="arrow-forward" onPress={() => router.push('/checkout')} style={{ flex: 1.4 }} />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', gap: 12, padding: 12, borderRadius: R.lg, backgroundColor: C.hueso, borderWidth: 1, borderColor: C.line, alignItems: 'flex-start' },
  thumb: { width: 74, height: 92, borderRadius: 12, overflow: 'hidden', borderTopLeftRadius: 37, borderTopRightRadius: 37 },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: S.xl, paddingTop: 12, backgroundColor: C.hueso, borderTopWidth: 1, borderTopColor: C.line },
});
