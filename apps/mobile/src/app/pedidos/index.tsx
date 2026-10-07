import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { formatCOP, formatDate, ORDER_STATUS_LABEL } from '@travesia/shared';

import { AccountGate } from '@/components/account-gate';
import { DemoNotice, EmptyState, Header, Icon, PressableScale, Screen, Skeleton, T } from '@/components/ui';
import { imageSource } from '@/lib/images';
import { useOrders } from '@/lib/queries';
import { C, R, S } from '@/theme';

const statusColor = (s: string) => (s === 'delivered' ? C.montana : s === 'shipped' || s === 'preparing' || s === 'paid' ? C.ambarProfundo : s === 'pending' ? C.muted : C.cereza);

export default function Orders() {
  return (
    <AccountGate title="Mis pedidos">
      <OrdersList />
    </AccountGate>
  );
}

function OrdersList() {
  const orders = useOrders();
  return (
    <View style={{ flex: 1, backgroundColor: C.crema }}>
      <Header title="Mis pedidos" />
      <Screen contentStyle={{ gap: S.md, paddingTop: S.sm }}>
        <DemoNotice compact />
        {orders.isLoading ? <Skeleton style={{ height: 100 }} /> : null}
        {orders.data?.orders.length === 0 ? <EmptyState icon="cube-outline" title="Aún no tienes pedidos" body="Cuando compres, aquí verás el estado y el rastreo." action="Ir a la tienda" onAction={() => router.replace('/tienda')} /> : null}
        {(orders.data?.orders ?? []).map((o, i) => (
          <Animated.View key={o.id} entering={FadeInDown.delay(i * 60)}>
            <PressableScale onPress={() => router.push(`/pedidos/${o.id}`)} accessibilityLabel={`Pedido ${o.number}, ${ORDER_STATUS_LABEL[o.status] ?? o.status}, ${formatCOP(o.totalCop)}`} style={styles.card}>
              <View style={{ flexDirection: 'row' }}>
                {o.items.slice(0, 3).map((it, j) => (
                  <Image key={it.id} source={imageSource(it.imageUrl)} style={[styles.thumb, { marginLeft: j ? -14 : 0 }]} contentFit="cover" accessible={false} />
                ))}
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <T v="bodyStrong">{o.number}</T>
                <T v="small" color={C.muted}>
                  {formatDate(o.createdAt)} · {o.items.length} {o.items.length === 1 ? 'producto' : 'productos'}
                </T>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: statusColor(o.status) }} />
                  <T v="label" color={statusColor(o.status)}>
                    {ORDER_STATUS_LABEL[o.status] ?? o.status}
                  </T>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <T v="bodyStrong">{formatCOP(o.totalCop)}</T>
                <Icon name="chevron-forward" size={18} color={C.muted} />
              </View>
            </PressableScale>
          </Animated.View>
        ))}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: R.lg, backgroundColor: C.hueso, borderWidth: 1, borderColor: C.line },
  thumb: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: C.hueso },
});
