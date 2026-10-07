import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { ZoomIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatCOP, ORDER_STATUS_LABEL } from '@travesia/shared';

import { AndeanPattern, BrandIcon } from '@/components/brand';
import { Button, Icon, T } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cart } from '@/lib/cart';
import { haptic } from '@/lib/haptics';
import { C, R, S } from '@/theme';

type Verify = { transactionStatus: string; order: { id: string; number: string; status: string; totalCop: number; kind: string; emailHint: string | null } };

export default function PaymentResult() {
  const { pedido, id } = useLocalSearchParams<{ pedido?: string; id?: string }>();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { signedIn } = useAuth();
  const tries = useRef(0);

  const q = useQuery({
    queryKey: ['payment', pedido, id],
    enabled: !!pedido,
    queryFn: async (): Promise<Verify> => {
      tries.current += 1;
      if (id) return api.get<Verify>(`/api/payments/verify?id=${encodeURIComponent(id)}&pedido=${encodeURIComponent(pedido!)}`);
      if (signedIn) {
        const r = await api.get<{ order: { id: string; number: string; status: string; totalCop: number; kind: string } }>(`/api/v1/orders/${encodeURIComponent(pedido!)}`);
        return { transactionStatus: r.order.status === 'paid' ? 'APPROVED' : 'PENDING', order: { ...r.order, emailHint: null } };
      }
      return { transactionStatus: 'PENDING', order: { id: pedido!, number: '', status: 'pending', totalCop: 0, kind: 'store', emailHint: null } };
    },
    refetchInterval: (query) => (query.state.data?.transactionStatus === 'PENDING' && tries.current < 8 ? 4000 : false),
  });

  const status = q.data?.transactionStatus ?? (q.isError ? 'ERROR' : 'PENDING');
  const approved = status === 'APPROVED' || q.data?.order.status === 'paid';
  const failed = ['DECLINED', 'VOIDED', 'ERROR'].includes(status) && !approved;

  useEffect(() => {
    if (approved) {
      haptic.success();
      cart.clear();
      void qc.invalidateQueries({ queryKey: ['me'] });
    } else if (failed) haptic.error();
  }, [approved, failed, qc]);

  const o = q.data?.order;
  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}>
      <Animated.View entering={ZoomIn.springify()} style={[styles.badge, { backgroundColor: approved ? C.montana : failed ? C.cereza : C.ambar }]}>
        <Icon name={approved ? 'checkmark' : failed ? 'close' : 'hourglass-outline'} size={46} color={C.crema} />
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(150)} style={{ alignItems: 'center', gap: 10 }}>
        <T v="h1" color={C.crema} center accessibilityRole="header">
          {approved ? '¡Gracias por tu compra!' : failed ? 'El pago no se completó' : 'Estamos confirmando tu pago'}
        </T>
        <T v="body" color="rgba(248,243,234,0.8)" center>
          {approved
            ? `Tu pedido ${o?.number ?? ''} quedó confirmado${o?.emailHint ? `. Enviamos el detalle a ${o.emailHint}` : ''}. Ya lo estamos preparando con cariño desde Caicedo.`
            : failed
              ? q.isError
                ? errorMessage(q.error)
                : 'Wompi rechazó o anuló la transacción. Puedes intentar de nuevo con otro medio de pago.'
              : 'Esto puede tardar unos segundos (PSE y Nequi a veces se demoran un poco más). Te avisaremos por correo y notificación.'}
        </T>
        {o?.totalCop ? (
          <T v="price" color={C.ambar}>
            {formatCOP(o.totalCop)} · {ORDER_STATUS_LABEL[o.status] ?? o.status}
          </T>
        ) : null}
      </Animated.View>
      <AndeanPattern width={220} style={{ marginVertical: S.xl }} />
      <BrandIcon name="granos" size={56} tint={C.ambar} />
      <View style={{ flex: 1 }} />
      <View style={{ gap: 10, alignSelf: 'stretch' }}>
        {approved && signedIn && o ? <Button title="Ver mi pedido" variant="ambar" onPress={() => router.replace(`/pedidos/${o.id}`)} /> : null}
        {failed ? <Button title="Volver al carrito" variant="ambar" onPress={() => router.replace('/carrito')} /> : null}
        {!approved && !failed ? <Button title="Actualizar estado" variant="ambar" loading={q.isFetching} onPress={() => void q.refetch()} /> : null}
        <Button title="Seguir explorando" variant="light" onPress={() => router.replace('/')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.noche, alignItems: 'center', paddingHorizontal: S.xl, gap: S.lg },
  badge: { width: 96, height: 96, borderRadius: R.xl, alignItems: 'center', justifyContent: 'center' },
});
