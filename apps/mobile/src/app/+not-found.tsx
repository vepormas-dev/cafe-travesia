import { View } from 'react-native';
import { router } from 'expo-router';

import { EmptyState, Header } from '@/components/ui';
import { C } from '@/theme';

export default function NotFound() {
  return (
    <View style={{ flex: 1, backgroundColor: C.crema }}>
      <Header title="" />
      <EmptyState icon="compass-outline" title="Esta página se perdió en la montaña" body="No encontramos lo que buscabas." action="Volver al inicio" onAction={() => router.replace('/')} />
    </View>
  );
}
