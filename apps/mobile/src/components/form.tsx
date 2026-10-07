import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptic } from '@/lib/haptics';
import { C, F, R, S } from '@/theme';
import { Icon, T } from './ui';

export function Field({ label, error, dark, style, ...rest }: TextInputProps & { label: string; error?: string | null; dark?: boolean }) {
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <T v="label" color={dark ? C.inkMuted : C.noche}>
        {label}
      </T>
      <TextInput
        placeholderTextColor={dark ? 'rgba(248,243,234,0.4)' : 'rgba(17,26,49,0.4)'}
        accessibilityLabel={label}
        maxFontSizeMultiplier={1.4}
        {...rest}
        onFocus={(e) => {
          setFocus(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocus(false);
          rest.onBlur?.(e);
        }}
        style={[
          styles.input,
          dark && { backgroundColor: C.inkCard, color: C.crema, borderColor: C.inkLine },
          focus && { borderColor: dark ? C.lima : C.ambar },
          !!error && { borderColor: C.cereza },
          style,
        ]}
      />
      {error ? (
        <T v="small" color={C.cereza} accessibilityLiveRegion="polite">
          {error}
        </T>
      ) : null}
    </View>
  );
}

/** Selector en hoja modal (departamentos, tipo de documento…). */
export function Select<V extends string>({ label, value, options, onChange, error, placeholder = 'Elegir' }: { label: string; value: V | null | undefined; options: readonly { value: V; label: string }[]; onChange: (v: V) => void; error?: string | null; placeholder?: string }) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const current = options.find((o) => o.value === value);
  return (
    <View style={{ gap: 6 }}>
      <T v="label">{label}</T>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${current?.label ?? placeholder}`}
        style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, !!error && { borderColor: C.cereza }]}>
        <T v="body" color={current ? C.noche : 'rgba(17,26,49,0.4)'}>
          {current?.label ?? placeholder}
        </T>
        <Icon name="chevron-down" size={18} color={C.muted} />
      </Pressable>
      {error ? (
        <T v="small" color={C.cereza}>
          {error}
        </T>
      ) : null}
      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} accessibilityLabel="Cerrar selector" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.grab} />
          <T v="h3" style={{ paddingHorizontal: S.xl, marginBottom: 8 }}>
            {label}
          </T>
          <FlatList
            data={options as { value: V; label: string }[]}
            keyExtractor={(o) => o.value}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  haptic.tap();
                  onChange(item.value);
                  setOpen(false);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: item.value === value }}
                style={({ pressed }) => [styles.option, pressed && { backgroundColor: C.arena }]}>
                <T v="body" style={item.value === value ? { fontFamily: F.bold } : undefined}>
                  {item.label}
                </T>
                {item.value === value ? <Icon name="checkmark" size={18} color={C.montana} /> : null}
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

/** Selector segmentado (peso, molienda…). */
export function Segmented<V extends string | number>({ options, value, onChange, color = C.noche, accent = C.ambar }: { options: { value: V; label: string; disabled?: boolean }[]; value: V; onChange: (v: V) => void; color?: string; accent?: string }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            disabled={o.disabled}
            onPress={() => {
              haptic.tap();
              onChange(o.value);
            }}
            accessibilityRole="radio"
            accessibilityState={{ checked: active, disabled: o.disabled }}
            accessibilityLabel={o.label}
            style={[styles.seg, { borderColor: active ? accent : color, backgroundColor: active ? accent : 'transparent', opacity: o.disabled ? 0.4 : 1 }]}>
            <T v="label" color={active ? C.noche : color} style={active ? { fontFamily: F.bold } : undefined}>
              {o.label}
            </T>
            {active ? <Icon name="checkmark-circle" size={16} color={C.noche} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export function Stepper({ value, onChange, min = 1, max = 50, color = C.noche }: { value: number; onChange: (n: number) => void; min?: number; max?: number; color?: string }) {
  return (
    <View style={[styles.stepper, { borderColor: color }]}>
      <Pressable onPress={() => { haptic.tap(); onChange(Math.max(min, value - 1)); }} accessibilityRole="button" accessibilityLabel="Disminuir cantidad" style={styles.stepBtn} hitSlop={6}>
        <Icon name="remove" size={18} color={color} />
      </Pressable>
      <T v="bodyStrong" color={color} style={{ minWidth: 28, textAlign: 'center' }} accessibilityLabel={`Cantidad ${value}`}>
        {value}
      </T>
      <Pressable onPress={() => { haptic.tap(); onChange(Math.min(max, value + 1)); }} accessibilityRole="button" accessibilityLabel="Aumentar cantidad" style={styles.stepBtn} hitSlop={6}>
        <Icon name="add" size={18} color={color} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  input: { minHeight: 50, borderRadius: R.md, borderWidth: 1, borderColor: 'rgba(17,26,49,0.16)', backgroundColor: C.hueso, paddingHorizontal: 14, fontFamily: F.body, fontSize: 16, color: C.noche },
  backdrop: { flex: 1, backgroundColor: 'rgba(10,16,34,0.45)' },
  sheet: { maxHeight: '70%', backgroundColor: C.crema, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 10 },
  grab: { width: 44, height: 5, borderRadius: 3, backgroundColor: 'rgba(17,26,49,0.2)', alignSelf: 'center', marginBottom: 12 },
  option: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: S.xl, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  seg: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.2, borderRadius: 10, paddingHorizontal: 14, height: 40 },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.2, borderRadius: 12, height: 44 },
  stepBtn: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
});
