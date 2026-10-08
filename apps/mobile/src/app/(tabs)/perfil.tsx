import { useEffect, useState } from 'react';
import { Alert, Platform, StyleSheet, Switch, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { formatCOP, formatNumber, initials, LOYALTY } from '@travesia/shared';

import { AndeanPattern, Logo } from '@/components/brand';
import { Button, Card, DemoNotice, ListItem, Screen, T } from '@/components/ui';
import { api, errorMessage, useApiMode } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { env } from '@/lib/env';
import { haptic } from '@/lib/haptics';
import { openWeb } from '@/lib/links';
import { disablePush, isPushEnabled, registerPush } from '@/lib/push';
import { C, R, S } from '@/theme';

export default function Perfil() {
  const insets = useSafeAreaInsets();
  const mode = useApiMode();
  const { me, signedIn, canUseAccount, signOut } = useAuth();
  const [push, setPush] = useState(false);
  const [pushMsg, setPushMsg] = useState<string | null>(null);

  useEffect(() => {
    void isPushEnabled().then(setPush);
  }, []);

  const togglePush = async (v: boolean) => {
    haptic.tap();
    setPushMsg(null);
    if (v) {
      const r = await registerPush();
      setPush(r.ok);
      if (!r.ok) setPushMsg(r.reason);
    } else {
      await disablePush();
      setPush(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.crema }}>
      <Screen tabBar contentStyle={{ paddingTop: insets.top + 10, gap: S.lg }}>
        <T v="h1" accessibilityRole="header">
          Perfil
        </T>
        <DemoNotice compact />
        {canUseAccount && me ? (
          <Animated.View entering={FadeInDown} style={styles.hero}>
            <View style={styles.avatar}>
              <T v="h2" color={C.noche}>
                {initials(me.fullName ?? me.email)}
              </T>
            </View>
            <View style={{ flex: 1 }}>
              <T v="h3" color={C.crema} numberOfLines={1}>
                {me.fullName ?? 'Cliente Travesía'}
              </T>
              <T v="small" color="rgba(248,243,234,0.7)" numberOfLines={1}>
                {me.email}
              </T>
              <AndeanPattern width={120} height={10} style={{ marginTop: 8 }} />
            </View>
          </Animated.View>
        ) : (
          <Card style={{ alignItems: 'center', gap: 12 }}>
            <Logo width={150} />
            <T v="body" center color={C.muted}>
              Ingresa para ver tus pedidos, tu plan, tus cursos y acumular Puntos Travesía.
            </T>
            <Button title="Ingresar o crear cuenta" full onPress={() => router.push('/ingresar')} />
          </Card>
        )}

        {canUseAccount ? (
          <>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <T v="eyebrow" color={C.ambarProfundo}>
                  Puntos Travesía
                </T>
                <T v="h2">{formatNumber(me?.loyaltyPoints ?? 0)}</T>
                <T v="small" color={C.muted}>
                  ≈ {formatCOP((me?.loyaltyPoints ?? 0) * LOYALTY.valueCop)} para redimir
                </T>
              </View>
              <Button title="Ver" small variant="outline" onPress={() => router.push('/puntos')} />
            </Card>
            <Card style={{ paddingVertical: 4 }}>
              <ListItem icon="cube-outline" title="Mis pedidos" subtitle="Estado y rastreo" onPress={() => router.push('/pedidos')} />
              <ListItem icon="school-outline" title="Mis cursos" onPress={() => router.push('/academia')} />
              <ListItem icon="ribbon-outline" title="Certificados" onPress={() => router.push('/certificados')} />
              <ListItem icon="notifications-outline" title="Bandeja de notificaciones" onPress={() => router.push('/notificaciones')} />
            </Card>
            <Card style={{ paddingVertical: 4 }}>
              <ListItem icon="person-outline" title="Mis datos" onPress={() => router.push('/datos')} />
              <ListItem icon="location-outline" title="Direcciones" onPress={() => router.push('/direcciones')} />
            </Card>
          </>
        ) : null}

        <Card style={{ paddingVertical: 4 }}>
          <ListItem
            icon="notifications-circle-outline"
            title="Notificaciones push"
            subtitle={Platform.OS === 'web' ? 'Disponible en la app de iOS y Android' : 'Pedidos, envíos y novedades'}
            onPress={() => void togglePush(!push)}
            right={<Switch value={push} onValueChange={(v) => void togglePush(v)} trackColor={{ true: C.ambar, false: C.arena }} thumbColor={C.hueso} accessibilityLabel="Notificaciones push" />}
          />
          {pushMsg ? (
            <T v="small" color={C.cereza} style={{ paddingBottom: 10 }}>
              {pushMsg}
            </T>
          ) : null}
          <ListItem icon="chatbubbles-outline" title="Asistente y soporte" onPress={() => router.push('/chat')} />
        </Card>

        <Card style={{ paddingVertical: 4 }}>
          <ListItem icon="document-text-outline" title="Términos y condiciones" onPress={() => void openWeb('/terminos')} right={<View />} />
          <ListItem icon="shield-checkmark-outline" title="Política de tratamiento de datos" onPress={() => void openWeb('/privacidad')} right={<View />} />
          <ListItem icon="return-down-back-outline" title="Envíos, cambios y devoluciones" onPress={() => void openWeb('/envios-y-devoluciones')} right={<View />} />
          <ListItem icon="storefront-outline" title="Visítanos en Florida, Medellín" onPress={() => void openWeb('/tiendas')} right={<View />} />
        </Card>

        {signedIn ? (
          <Button
            title="Cerrar sesión"
            variant="danger"
            icon="log-out-outline"
            onPress={async () => {
              haptic.warning();
              await signOut();
            }}
          />
        ) : null}
        {signedIn ? (
          <ListItem
            icon="trash-outline"
            title="Eliminar mi cuenta"
            subtitle="Borra tus datos, cancela suscripciones y anula tarjetas guardadas"
            onPress={() =>
              Alert.alert(
                '¿Eliminar tu cuenta?',
                'Perderás tus cursos, certificados y puntos. Cancelaremos tus suscripciones. Conservamos solo el registro de compras que exige la ley. No se puede deshacer.',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        haptic.warning();
                        await api.del('/api/v1/me', { confirm: 'ELIMINAR' });
                        await signOut();
                        Alert.alert('Cuenta eliminada', 'Eliminamos tu cuenta y tus datos personales.');
                      } catch (e) {
                        Alert.alert('No pudimos eliminar tu cuenta', errorMessage(e));
                      }
                    },
                  },
                ],
              )
            }
          />
        ) : null}

        <View style={{ alignItems: 'center', gap: 4, marginTop: S.md }}>
          <T v="script" color={C.ambarProfundo}>
            la esencia de lo que somos
          </T>
          <T v="small" color={C.muted}>
            Café Travesía · v{env.appVersion} · {mode === 'demo' ? 'modo demo' : env.apiUrl.replace(/^https?:\/\//, '')}
          </T>
        </View>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: S.xl, borderRadius: R.xl, backgroundColor: C.noche },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: C.ambar, alignItems: 'center', justifyContent: 'center' },
});
