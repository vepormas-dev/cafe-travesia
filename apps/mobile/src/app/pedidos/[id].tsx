import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { formatCOP, formatDateTime, ORDER_FLOW, ORDER_STATUS_LABEL } from '@travesia/shared';

import { AccountGate } from '@/components/account-gate';
import { Button, Card, EmptyState, Header, Icon, Screen, Skeleton, T } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { imageSource } from '@/lib/images';
import { openLink } from '@/lib/links';
import { useOrder } from '@/lib/queries';
import { C, R, S } from '@/theme';

const STEP_ICON = { paid: 'card-outline', preparing: 'flame-outline', shipped: 'car-outline', delivered: 'home-outline' } as const;

export default function OrderDetail() {
  return (
    <AccountGate title="Pedido">
      <Detail />
    </AccountGate>
  );
}

function Detail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useOrder(id);
  const o = q.data?.order;
  if (q.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.crema }}>
        <Header title="Pedido" />
        <Skeleton style={{ height: 300, margin: S.xl }} />
      </View>
    );
  }
  if (!o) {
    return (
      <View style={{ flex: 1, backgroundColor: C.crema }}>
        <Header title="Pedido" />
        <EmptyState title="No encontramos este pedido" body={errorMessage(q.error)} />
      </View>
    );
  }
  const reached = ORDER_FLOW.indexOf(o.status as (typeof ORDER_FLOW)[number]);
  const dates: Record<string, string | null> = { paid: o.paidAt, preparing: o.paidAt, shipped: o.shippedAt, delivered: o.deliveredAt };
  const cancelled = ['cancelled', 'refunded', 'failed'].includes(o.status);

  return (
    <View style={{ flex: 1, backgroundColor: C.crema }}>
      <Header title={o.number} />
      <Screen contentStyle={{ gap: S.lg, paddingTop: S.sm }}>
        <Card style={{ gap: 4 }}>
          <T v="eyebrow" color={C.muted}>
            Estado
          </T>
          <T v="h2">{ORDER_STATUS_LABEL[o.status] ?? o.status}</T>
          <T v="small" color={C.muted}>
            Pedido realizado el {formatDateTime(o.createdAt)}
          </T>
        </Card>

        {!cancelled ? (
          <Card style={{ gap: 0 }}>
            {ORDER_FLOW.map((s, i) => {
              const done = reached >= i;
              return (
                <Animated.View key={s} entering={FadeInDown.delay(i * 90)} style={styles.step} accessible accessibilityLabel={`${ORDER_STATUS_LABEL[s]}${done ? ', completado' : ', pendiente'}`}>
                  <View style={{ alignItems: 'center' }}>
                    <View style={[styles.dot, done && { backgroundColor: C.montana, borderColor: C.montana }]}>
                      <Icon name={STEP_ICON[s]} size={16} color={done ? C.crema : C.muted} />
                    </View>
                    {i < ORDER_FLOW.length - 1 ? <View style={[styles.bar, reached > i && { backgroundColor: C.montana }]} /> : null}
                  </View>
                  <View style={{ flex: 1, paddingBottom: 18 }}>
                    <T v="bodyStrong" color={done ? C.noche : C.muted}>
                      {ORDER_STATUS_LABEL[s]}
                    </T>
                    {done && dates[s] ? (
                      <T v="small" color={C.muted}>
                        {formatDateTime(dates[s])}
                      </T>
                    ) : null}
                  </View>
                </Animated.View>
              );
            })}
            {o.trackingNumber || o.trackingUrl ? (
              <View style={styles.track}>
                <View style={{ flex: 1 }}>
                  <T v="small" color={C.muted}>
                    {o.carrier ?? 'Transportadora'}
                  </T>
                  <T v="bodyStrong" selectable>
                    {o.trackingNumber ?? 'Guía disponible'}
                  </T>
                </View>
                {o.trackingUrl ? <Button title="Rastrear" small icon="navigate-outline" onPress={() => void openLink(o.trackingUrl!)} /> : null}
              </View>
            ) : null}
          </Card>
        ) : null}

        <Card style={{ gap: 12 }}>
          <T v="h3">Productos</T>
          {o.items.map((it) => (
            <View key={it.id} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <Image source={imageSource(it.imageUrl)} style={styles.thumb} contentFit="cover" accessible={false} />
              <View style={{ flex: 1 }}>
                <T v="bodyStrong">{it.name}</T>
                <T v="small" color={C.muted}>
                  {[it.variantName, `× ${it.quantity}`].filter(Boolean).join(' · ')}
                </T>
              </View>
              <T v="label">{formatCOP(it.totalCop)}</T>
            </View>
          ))}
          <View style={{ height: 1, backgroundColor: C.line }} />
          <Row label="Subtotal" value={formatCOP(o.subtotalCop)} />
          {o.discountCop ? <Row label={`Descuento${o.couponCode ? ` (${o.couponCode})` : ''}`} value={`−${formatCOP(o.discountCop)}`} /> : null}
          <Row label="Envío" value={o.shippingCop ? formatCOP(o.shippingCop) : 'Gratis'} />
          <Row label="Total" value={formatCOP(o.totalCop)} strong />
          {o.pointsEarned ? (
            <T v="small" color={C.ambarProfundo}>
              Ganaste {o.pointsEarned} Puntos Travesía
            </T>
          ) : null}
        </Card>

        {o.shippingAddress ? (
          <Card style={{ gap: 4 }}>
            <T v="h3">Envío a</T>
            <T v="body">{o.shippingAddress.recipient}</T>
            <T v="small" color={C.muted}>
              {o.shippingAddress.line1}, {o.shippingAddress.city}, {o.shippingAddress.region}
            </T>
          </Card>
        ) : null}
        <Button title="¿Necesitas ayuda con este pedido?" variant="outline" icon="chatbubbles-outline" onPress={() => void openLink('/chat')} />
      </Screen>
    </View>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <T v={strong ? 'bodyStrong' : 'body'} color={strong ? C.noche : C.muted}>
        {label}
      </T>
      <T v={strong ? 'price' : 'bodyStrong'}>{value}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  step: { flexDirection: 'row', gap: 14 },
  dot: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.crema, alignItems: 'center', justifyContent: 'center' },
  bar: { width: 2, flex: 1, minHeight: 18, backgroundColor: C.line },
  track: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: R.md, backgroundColor: C.arena },
  thumb: { width: 52, height: 52, borderRadius: 12 },
});
