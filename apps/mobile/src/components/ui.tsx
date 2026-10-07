import { useEffect, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type ScrollViewProps,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { formatCOP } from '@travesia/shared';

import { haptic } from '@/lib/haptics';
import { retryOnline, useApiMode } from '@/lib/api';
import { C, F, R, S, shadow } from '@/theme';

export type IconName = keyof typeof Ionicons.glyphMap;
export const Icon = ({ name, size = 22, color = C.noche }: { name: IconName; size?: number; color?: string }) => (
  <Ionicons name={name} size={size} color={color} />
);

/* ---------------- Tipografía ---------------- */
type Variant = 'display' | 'h1' | 'h2' | 'h3' | 'italic' | 'body' | 'bodyStrong' | 'small' | 'eyebrow' | 'label' | 'script' | 'price';
const variants: Record<Variant, TextStyle> = {
  display: { fontFamily: F.display, fontSize: 40, lineHeight: 46, letterSpacing: -0.5 },
  h1: { fontFamily: F.display, fontSize: 30, lineHeight: 36 },
  h2: { fontFamily: F.display, fontSize: 24, lineHeight: 30 },
  h3: { fontFamily: F.display, fontSize: 19, lineHeight: 24 },
  italic: { fontFamily: F.displayItalic, fontSize: 16, lineHeight: 22 },
  body: { fontFamily: F.body, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: F.bold, fontSize: 15, lineHeight: 22 },
  small: { fontFamily: F.body, fontSize: 13, lineHeight: 18 },
  eyebrow: { fontFamily: F.bold, fontSize: 11, lineHeight: 14, letterSpacing: 1.6, textTransform: 'uppercase' },
  label: { fontFamily: F.medium, fontSize: 13, lineHeight: 18 },
  script: { fontFamily: F.script, fontSize: 24, lineHeight: 28 },
  price: { fontFamily: F.bold, fontSize: 20, lineHeight: 24 },
};

export function T({
  v = 'body',
  color = C.noche,
  center,
  style,
  children,
  ...rest
}: TextProps & { v?: Variant; color?: string; center?: boolean; children?: ReactNode }) {
  return (
    <Text maxFontSizeMultiplier={1.5} {...rest} style={[variants[v], { color }, center && { textAlign: 'center' }, style]}>
      {children}
    </Text>
  );
}

/* ---------------- Interacción ---------------- */
const APressable = Animated.createAnimatedComponent(Pressable);

/** Pressable con escala sutil al presionar (reanimated). */
export function PressableScale({ style, children, onPressIn, onPressOut, scaleTo = 0.97, ...rest }: PressableProps & { style?: StyleProp<ViewStyle>; scaleTo?: number; children?: ReactNode }) {
  const scale = useSharedValue(1);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return (
    <APressable
      accessibilityRole="button"
      {...rest}
      onPressIn={(e) => {
        scale.set(withSpring(scaleTo, { damping: 20, stiffness: 400 }));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(withSpring(1, { damping: 16, stiffness: 300 }));
        onPressOut?.(e);
      }}
      style={[style, a]}>
      {children}
    </APressable>
  );
}

type BtnVariant = 'primary' | 'ambar' | 'outline' | 'ghost' | 'light' | 'lima' | 'danger';
const btnColors: Record<BtnVariant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: C.noche, fg: C.crema },
  ambar: { bg: C.ambar, fg: C.noche },
  outline: { bg: 'transparent', fg: C.noche, border: C.noche },
  ghost: { bg: 'transparent', fg: C.noche },
  light: { bg: C.hueso, fg: C.noche },
  lima: { bg: C.lima, fg: C.ink },
  danger: { bg: 'transparent', fg: C.cereza, border: C.cereza },
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  iconRight,
  loading,
  disabled,
  small,
  full,
  style,
  accessibilityLabel,
  haptics = 'tap',
}: {
  title: string;
  onPress?: () => void;
  variant?: BtnVariant;
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
  full?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  haptics?: 'tap' | 'add' | 'none';
}) {
  const c = btnColors[variant];
  const off = disabled || loading;
  return (
    <PressableScale
      onPress={() => {
        if (off) return;
        if (haptics === 'add') haptic.add();
        else if (haptics === 'tap') haptic.tap();
        onPress?.();
      }}
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      style={[
        styles.btn,
        small && styles.btnSmall,
        full && { alignSelf: 'stretch' },
        { backgroundColor: c.bg, borderColor: c.border ?? 'transparent', opacity: off ? 0.55 : 1 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={c.fg} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={small ? 16 : 18} color={c.fg} /> : null}
          <T v="bodyStrong" color={c.fg} style={[small && { fontSize: 13 }, { letterSpacing: 0.3 }]} numberOfLines={1}>
            {title}
          </T>
          {iconRight ? <Icon name={iconRight} size={small ? 16 : 18} color={c.fg} /> : null}
        </>
      )}
    </PressableScale>
  );
}

export function IconButton({ name, onPress, label, color = C.noche, bg = 'transparent', size = 22, badge }: { name: IconName; onPress: () => void; label: string; color?: string; bg?: string; size?: number; badge?: number }) {
  return (
    <PressableScale
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      accessibilityLabel={label}
      hitSlop={8}
      style={[styles.iconBtn, { backgroundColor: bg }]}>
      <Icon name={name} size={size} color={color} />
      {badge ? (
        <View style={styles.badge}>
          <T v="eyebrow" color={C.noche} style={{ fontSize: 10, letterSpacing: 0 }}>
            {badge > 9 ? '9+' : String(badge)}
          </T>
        </View>
      ) : null}
    </PressableScale>
  );
}

export function Chip({ label, active, onPress, dark }: { label: string; active?: boolean; onPress?: () => void; dark?: boolean }) {
  const fg = active ? (dark ? C.ink : C.crema) : dark ? C.crema : C.noche;
  const bg = active ? (dark ? C.lima : C.noche) : 'transparent';
  return (
    <PressableScale
      onPress={() => {
        haptic.tap();
        onPress?.();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      accessibilityLabel={label}
      style={[styles.chip, { backgroundColor: bg, borderColor: active ? bg : dark ? C.inkLine : 'rgba(17,26,49,0.22)' }]}>
      <T v="label" color={fg} style={{ fontFamily: active ? F.bold : F.medium }}>
        {label}
      </T>
    </PressableScale>
  );
}

/* ---------------- Contenedores ---------------- */
export function Card({ children, style, dark }: { children: ReactNode; style?: StyleProp<ViewStyle>; dark?: boolean }) {
  return <View style={[styles.card, dark && styles.cardDark, style]}>{children}</View>;
}

export function Screen({
  children,
  dark,
  bg,
  padded = true,
  tabBar,
  contentStyle,
  ...rest
}: ScrollViewProps & { children: ReactNode; dark?: boolean; bg?: string; padded?: boolean; tabBar?: boolean; contentStyle?: StyleProp<ViewStyle> }) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: bg ?? (dark ? C.ink : C.crema) }}
      contentContainerStyle={[{ paddingBottom: insets.bottom + (tabBar ? 110 : 40) }, padded && { paddingHorizontal: S.xl }, contentStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      {...rest}>
      {children}
    </ScrollView>
  );
}

/** Encabezado de pantallas apiladas: volver + título (+ acción). */
export function Header({ title, dark, right, transparent, onBack }: { title?: string; dark?: boolean; right?: ReactNode; transparent?: boolean; onBack?: () => void }) {
  const insets = useSafeAreaInsets();
  const fg = dark ? C.crema : C.noche;
  return (
    <View style={[styles.header, { paddingTop: insets.top + 6, backgroundColor: transparent ? 'transparent' : dark ? C.ink : C.crema }]}>
      <IconButton
        name="chevron-back"
        label="Volver"
        color={fg}
        bg={dark ? 'rgba(255,255,255,0.08)' : 'rgba(17,26,49,0.06)'}
        onPress={() => (onBack ? onBack() : router.canGoBack() ? router.back() : router.replace('/'))}
      />
      <T v="h3" color={fg} numberOfLines={1} style={{ flex: 1, textAlign: 'center' }} accessibilityRole="header">
        {title ?? ''}
      </T>
      <View style={{ minWidth: 40, alignItems: 'flex-end' }}>{right}</View>
    </View>
  );
}

export function SectionHeading({ title, action, onAction, dark, eyebrow }: { title: string; action?: string; onAction?: () => void; dark?: boolean; eyebrow?: string }) {
  return (
    <View style={styles.section}>
      <View style={{ flex: 1 }}>
        {eyebrow ? (
          <T v="eyebrow" color={dark ? C.inkMuted : C.ambarProfundo} style={{ marginBottom: 4 }}>
            {eyebrow}
          </T>
        ) : null}
        <T v="h2" color={dark ? C.crema : C.noche} accessibilityRole="header" style={{ fontSize: 22, lineHeight: 28 }}>
          {title}
        </T>
      </View>
      {action ? (
        <Pressable onPress={onAction} accessibilityRole="link" accessibilityLabel={`${action}: ${title}`} hitSlop={10}>
          <T v="eyebrow" color={dark ? C.lima : C.montana}>
            {action}
          </T>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Price({ value, compareAt, color = C.noche, size = 20 }: { value: number; compareAt?: number | null; color?: string; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
      <T v="price" color={color} style={{ fontSize: size, lineHeight: size + 4 }}>
        {value === 0 ? 'Gratis' : formatCOP(value)}
      </T>
      {compareAt && compareAt > value ? (
        <T v="small" color={C.muted} style={{ textDecorationLine: 'line-through' }}>
          {formatCOP(compareAt)}
        </T>
      ) : null}
    </View>
  );
}

export function Stars({ value, count, color = C.ambar, textColor = C.muted }: { value: number; count?: number; color?: string; textColor?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }} accessibilityLabel={`Calificación ${value.toFixed(1)} de 5`}>
      <Icon name="star" size={13} color={color} />
      <T v="small" color={textColor}>
        {value.toFixed(1)}
        {count != null ? ` (${count})` : ''}
      </T>
    </View>
  );
}

export function Badge({ label, bg = C.montana, fg = C.crema }: { label: string; bg?: string; fg?: string }) {
  return (
    <View style={{ backgroundColor: bg, borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 5, alignSelf: 'flex-start' }}>
      <T v="eyebrow" color={fg} style={{ fontSize: 10, letterSpacing: 1.2 }}>
        {label}
      </T>
    </View>
  );
}

export function ProgressBar({ pct, color = C.montana, track = 'rgba(17,26,49,0.1)', height = 6 }: { pct: number; color?: string; track?: string; height?: number }) {
  const w = useSharedValue(0);
  useEffect(() => {
    w.set(withTiming(Math.max(0, Math.min(100, pct)), { duration: 700 }));
  }, [pct, w]);
  const a = useAnimatedStyle(() => ({ width: `${w.get()}%` }));
  return (
    <View style={{ height, borderRadius: height, backgroundColor: track, overflow: 'hidden' }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}>
      <Animated.View style={[{ height, borderRadius: height, backgroundColor: color }, a]} />
    </View>
  );
}

export function Skeleton({ style, dark }: { style?: StyleProp<ViewStyle>; dark?: boolean }) {
  const o = useSharedValue(0.5);
  useEffect(() => {
    o.set(withRepeat(withSequence(withTiming(1, { duration: 700 }), withTiming(0.5, { duration: 700 })), -1));
  }, [o]);
  const a = useAnimatedStyle(() => ({ opacity: o.get() }));
  return <Animated.View accessibilityLabel="Cargando" style={[{ backgroundColor: dark ? C.inkCard : C.arena, borderRadius: R.md }, style, a]} />;
}

export function EmptyState({ icon = 'cafe-outline', title, body, action, onAction, dark }: { icon?: IconName; title: string; body?: string; action?: string; onAction?: () => void; dark?: boolean }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20, gap: 10 }}>
      <View style={[styles.emptyIcon, dark && { backgroundColor: C.inkCard }]}>
        <Icon name={icon} size={28} color={dark ? C.lima : C.ambarProfundo} />
      </View>
      <T v="h3" center color={dark ? C.crema : C.noche}>
        {title}
      </T>
      {body ? (
        <T v="body" center color={dark ? C.inkMuted : C.muted}>
          {body}
        </T>
      ) : null}
      {action ? <Button title={action} onPress={onAction} style={{ marginTop: 8 }} variant={dark ? 'lima' : 'primary'} /> : null}
    </View>
  );
}

/** Aviso de modo demo (la API no responde): lecturas de ejemplo y escrituras bloqueadas. */
export function DemoNotice({ dark, compact }: { dark?: boolean; compact?: boolean }) {
  const mode = useApiMode();
  if (mode !== 'demo') return null;
  return (
    <Pressable
      onPress={() => void retryOnline()}
      accessibilityRole="button"
      accessibilityLabel="Modo demo. Toca para reintentar la conexión"
      style={[styles.demo, dark && { backgroundColor: 'rgba(235,154,55,0.14)', borderColor: 'rgba(235,154,55,0.35)' }, compact && { paddingVertical: 8 }]}>
      <Icon name="flask-outline" size={16} color={C.ambarProfundo} />
      <T v="small" color={dark ? C.ambarClaro : C.tostado} style={{ flex: 1 }}>
        <T v="small" color={dark ? C.ambarClaro : C.tostado} style={{ fontFamily: F.bold }}>
          Modo demo.{' '}
        </T>
        Datos de ejemplo; las compras y cambios se habilitan al conectar con cafetravesia.co. Toca para reintentar.
      </T>
    </Pressable>
  );
}

export function Row({ children, style, gap = S.sm }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function ListItem({ icon, title, subtitle, onPress, right, danger }: { icon?: IconName; title: string; subtitle?: string; onPress?: () => void; right?: ReactNode; danger?: boolean }) {
  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        onPress?.();
      }}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      style={({ pressed }) => [styles.listItem, pressed && { backgroundColor: 'rgba(17,26,49,0.04)' }]}>
      {icon ? (
        <View style={styles.listIcon}>
          <Icon name={icon} size={19} color={danger ? C.cereza : C.noche} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <T v="bodyStrong" color={danger ? C.cereza : C.noche}>
          {title}
        </T>
        {subtitle ? (
          <T v="small" color={C.muted}>
            {subtitle}
          </T>
        ) : null}
      </View>
      {right ?? <Icon name="chevron-forward" size={18} color={C.muted} />}
    </Pressable>
  );
}

export const styles = StyleSheet.create({
  btn: {
    minHeight: 50,
    paddingHorizontal: 22,
    borderRadius: R.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
  },
  btnSmall: { minHeight: 40, paddingHorizontal: 16, borderRadius: 10 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 2, right: 0, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: C.ambar, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  chip: { paddingHorizontal: 16, height: 38, borderRadius: R.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: C.hueso, borderRadius: R.lg, padding: S.lg, borderWidth: 1, borderColor: C.line, ...shadow, shadowOpacity: 0.06 },
  cardDark: { backgroundColor: C.inkCard, borderColor: C.inkLine, shadowOpacity: 0 },
  header: { flexDirection: 'row', alignItems: 'center', gap: S.sm, paddingHorizontal: S.lg, paddingBottom: S.sm },
  section: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: S.md, marginTop: S.xxl + 4, marginBottom: S.lg },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: C.arena, alignItems: 'center', justifyContent: 'center' },
  demo: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: '#FBEBD3', borderColor: '#F0CF9E', borderWidth: 1, padding: 12, borderRadius: R.md },
  listItem: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingVertical: 14, paddingHorizontal: 4 },
  listIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.arena, alignItems: 'center', justifyContent: 'center' },
});
