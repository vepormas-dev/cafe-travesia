import type { ReactNode } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';

import { useAuth } from '@/lib/auth';
import { C } from '@/theme';
import { EmptyState, Header } from './ui';

/** Muestra el contenido solo con sesión (o en modo demo). */
export function AccountGate({ title, children }: { title: string; children: ReactNode }) {
  const { canUseAccount, ready } = useAuth();
  if (!ready) return <View style={{ flex: 1, backgroundColor: C.crema }} />;
  if (!canUseAccount) {
    return (
      <View style={{ flex: 1, backgroundColor: C.crema }}>
        <Header title={title} />
        <EmptyState icon="person-circle-outline" title="Ingresa a tu cuenta" body="Necesitas iniciar sesión para ver esta sección." action="Ingresar" onAction={() => router.push('/ingresar')} />
      </View>
    );
  }
  return <>{children}</>;
}
