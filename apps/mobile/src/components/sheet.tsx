import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C, S } from '@/theme';
import { IconButton, T } from './ui';

/** Hoja inferior modal (confirmaciones y selectores; funciona también en web). */
export function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Cerrar" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]} accessibilityViewIsModal>
          <View style={styles.head}>
            <T v="h3" style={{ flex: 1 }} accessibilityRole="header">
              {title}
            </T>
            <IconButton name="close" label="Cerrar" onPress={onClose} />
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: S.xl, gap: 12 }} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(10,16,34,0.45)' },
  sheet: { maxHeight: '82%', backgroundColor: C.crema, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingTop: 12 },
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: S.xl, paddingBottom: 8 },
});
