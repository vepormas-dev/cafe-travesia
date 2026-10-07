import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { formatDate } from '@travesia/shared';

import { AccountGate } from '@/components/account-gate';
import { BrandIcon } from '@/components/brand';
import { Button, DemoNotice, EmptyState, Header, Screen, Skeleton, T } from '@/components/ui';
import { openWeb } from '@/lib/links';
import { useAcademyMe } from '@/lib/queries';
import { C, R, S } from '@/theme';

export default function Certificados() {
  return (
    <AccountGate title="Certificados">
      <Content />
    </AccountGate>
  );
}

function Content() {
  const q = useAcademyMe();
  const certs = q.data?.certificates ?? [];
  return (
    <View style={{ flex: 1, backgroundColor: C.crema }}>
      <Header title="Mis certificados" />
      <Screen contentStyle={{ gap: S.md, paddingTop: S.sm }}>
        <DemoNotice compact />
        {q.isLoading ? <Skeleton style={{ height: 120 }} /> : null}
        {!q.isLoading && !certs.length ? <EmptyState icon="ribbon-outline" title="Aún no tienes certificados" body="Completa un curso y aprueba su evaluación para obtener tu certificado." action="Ir a la Academia" onAction={() => router.replace('/academia')} /> : null}
        {certs.map((c, i) => (
          <Animated.View key={c.code} entering={FadeInDown.delay(i * 70)} style={styles.card}>
            <BrandIcon name="academia" size={44} tint={C.ambar} />
            <View style={{ flex: 1, gap: 2 }}>
              <T v="h3" color={C.crema}>
                {c.courseTitle}
              </T>
              <T v="small" color="rgba(248,243,234,0.7)">
                Emitido el {formatDate(c.issuedAt)} · Código {c.code}
              </T>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                <Button title="Abrir PDF" small variant="ambar" icon="document-outline" onPress={() => void openWeb(`/api/certificates/${encodeURIComponent(c.code)}`)} />
                <Button title="Verificar" small variant="light" onPress={() => void openWeb(`/certificados/${encodeURIComponent(c.code)}`)} />
              </View>
            </View>
          </Animated.View>
        ))}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: 14, padding: S.lg, borderRadius: R.lg, backgroundColor: C.noche },
});
