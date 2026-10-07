import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useQueryClient } from '@tanstack/react-query';
import { formatDateTime } from '@travesia/shared';

import { AccountGate } from '@/components/account-gate';
import { Button, DemoNotice, EmptyState, Header, Icon, PressableScale, Screen, Skeleton, T, type IconName } from '@/components/ui';
import { api, isDemo } from '@/lib/api';
import { openLink } from '@/lib/links';
import { useNotifications } from '@/lib/queries';
import { C, R, S } from '@/theme';

const KIND_ICON: Record<string, IconName> = { order: 'cube-outline', subscription: 'repeat-outline', academy: 'school-outline', campaign: 'megaphone-outline', chat: 'chatbubbles-outline' };

export default function Notificaciones() {
  return (
    <AccountGate title="Notificaciones">
      <Inbox />
    </AccountGate>
  );
}

function Inbox() {
  const qc = useQueryClient();
  const q = useNotifications();
  const unread = q.data?.unread ?? 0;
  const markAll = async (ids?: string[]) => {
    if (isDemo()) return;
    await api.post('/api/v1/notifications/read', ids ? { ids } : {}).catch(() => undefined);
    void qc.invalidateQueries({ queryKey: ['me', 'notifications'] });
  };
  useEffect(() => {
    // Al abrir la bandeja, marca como leídas tras unos segundos.
    if (!unread) return;
    const t = setTimeout(() => void markAll(), 2500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unread]);

  return (
    <View style={{ flex: 1, backgroundColor: C.crema }}>
      <Header title="Notificaciones" right={unread ? <Button title="Leídas" small variant="ghost" onPress={() => void markAll()} /> : undefined} />
      <Screen contentStyle={{ gap: S.md, paddingTop: S.sm }}>
        <DemoNotice compact />
        {q.isLoading ? <Skeleton style={{ height: 90 }} /> : null}
        {q.data?.notifications.length === 0 ? <EmptyState icon="notifications-outline" title="Todo al día" body="Aquí verás novedades de tus pedidos, tu plan y la Academia." /> : null}
        {(q.data?.notifications ?? []).map((n, i) => (
          <Animated.View key={n.id} entering={FadeInDown.delay(i * 50)}>
            <PressableScale
              onPress={() => {
                if (!n.readAt) void markAll([n.id]);
                void openLink(n.deepLink);
              }}
              accessibilityLabel={`${n.readAt ? '' : 'Sin leer. '}${n.title}. ${n.body}`}
              style={[styles.card, !n.readAt && { borderColor: C.ambar, backgroundColor: '#FFF8EE' }]}>
              <View style={styles.icon}>
                <Icon name={KIND_ICON[n.kind] ?? 'notifications-outline'} size={20} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <T v="bodyStrong">{n.title}</T>
                <T v="small" color={C.muted}>
                  {n.body}
                </T>
                <T v="small" color={C.muted} style={{ fontSize: 11, marginTop: 2 }}>
                  {formatDateTime(n.createdAt)}
                </T>
              </View>
              {!n.readAt ? <View style={styles.dot} /> : null}
            </PressableScale>
          </Animated.View>
        ))}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: R.lg, backgroundColor: C.hueso, borderWidth: 1, borderColor: C.line },
  icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.arena, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: C.ambar, marginTop: 6 },
});
