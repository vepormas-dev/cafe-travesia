import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { formatCOP, formatDate, formatNumber, LOYALTY } from '@travesia/shared';

import { AccountGate } from '@/components/account-gate';
import { AndeanPattern, BrandIcon } from '@/components/brand';
import { Button, Card, DemoNotice, Header, Screen, Skeleton, T } from '@/components/ui';
import { useLoyalty } from '@/lib/queries';
import { C, R, S } from '@/theme';

export default function Points() {
  return (
    <AccountGate title="Puntos Travesía">
      <Content />
    </AccountGate>
  );
}

function Content() {
  const q = useLoyalty();
  const points = q.data?.points ?? 0;
  return (
    <View style={{ flex: 1, backgroundColor: C.crema }}>
      <Header title="Puntos Travesía" />
      <Screen contentStyle={{ gap: S.lg, paddingTop: S.sm }}>
        <DemoNotice compact />
        <Animated.View entering={FadeInDown} style={styles.hero}>
          <BrandIcon name="cosecha" size={56} tint={C.ambar} />
          <T v="display" color={C.crema}>
            {formatNumber(points)}
          </T>
          <T v="body" color="rgba(248,243,234,0.8)">
            puntos disponibles ≈ {formatCOP(points * LOYALTY.valueCop)}
          </T>
          <AndeanPattern width={200} style={{ marginTop: 10 }} />
        </Animated.View>
        <Card style={{ gap: 8 }}>
          <T v="h3">¿Cómo funcionan?</T>
          <T v="body" color={C.muted}>
            • Ganas 1 punto por cada {formatCOP(LOYALTY.earnPer)} en café, accesorios y cursos.{'\n'}• Cada punto vale {formatCOP(LOYALTY.valueCop)} al pagar.{'\n'}• Puedes redimir hasta el {LOYALTY.maxRedeemPct}% de tu pedido.
          </T>
          <Button title="Usar mis puntos en la tienda" variant="ambar" onPress={() => router.push('/tienda')} />
        </Card>
        <T v="h3">Movimientos</T>
        {q.isLoading ? <Skeleton style={{ height: 120 }} /> : null}
        {(q.data?.ledger ?? []).map((l, i) => (
          <View key={i} style={styles.row}>
            <View style={{ flex: 1 }}>
              <T v="bodyStrong">{l.reason}</T>
              <T v="small" color={C.muted}>
                {formatDate(l.createdAt)}
              </T>
            </View>
            <T v="bodyStrong" color={l.points >= 0 ? C.montana : C.cereza}>
              {l.points >= 0 ? '+' : ''}
              {formatNumber(l.points)}
            </T>
          </View>
        ))}
        {q.data && !q.data.ledger.length ? (
          <T v="small" color={C.muted}>
            Aún no tienes movimientos.
          </T>
        ) : null}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 6, padding: S.xxl, borderRadius: R.xl, backgroundColor: C.noche },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: R.md, backgroundColor: C.hueso, borderWidth: 1, borderColor: C.line },
});
