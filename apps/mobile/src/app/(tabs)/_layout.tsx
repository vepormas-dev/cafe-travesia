import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tabs } from 'expo-router';

import { SupportFab } from '@/components/support-fab';
import { Icon, T, type IconName } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { C, F } from '@/theme';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const TABS: Record<string, { label: string; icon: IconName; active: IconName }> = {
  index: { label: 'Inicio', icon: 'home-outline', active: 'home' },
  tienda: { label: 'Tienda', icon: 'bag-handle-outline', active: 'bag-handle' },
  academia: { label: 'Academia', icon: 'school-outline', active: 'school' },
  plan: { label: 'Plan', icon: 'repeat-outline', active: 'repeat' },
  perfil: { label: 'Perfil', icon: 'person-outline', active: 'person' },
};

function TabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const current = state.routes[state.index]?.name;
  const dark = current === 'academia';
  return (
    <>
      <SupportFab dark={dark} bottom={insets.bottom + 78} />
      <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }, dark ? styles.barDark : null]} accessibilityRole="tablist">
        {state.routes.map((route, i) => {
          const t = TABS[route.name];
          if (!t) return null;
          const focused = state.index === i;
          const fg = focused ? (dark ? C.crema : C.noche) : dark ? 'rgba(248,243,234,0.45)' : 'rgba(17,26,49,0.5)';
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={t.label}
              onPress={() => {
                const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !e.defaultPrevented) {
                  haptic.tap();
                  navigation.navigate(route.name);
                }
              }}
              style={styles.item}>
              <Icon name={focused ? t.active : t.icon} size={23} color={fg} />
              <T v="small" color={fg} style={{ fontSize: 11, fontFamily: focused ? F.bold : F.medium }} maxFontSizeMultiplier={1.2}>
                {t.label}
              </T>
              <Dot visible={focused} color={dark ? C.lima : C.ambar} />
            </Pressable>
          );
        })}
      </View>
    </>
  );
}

function Dot({ visible, color }: { visible: boolean; color: string }) {
  const a = useAnimatedStyle(() => ({ opacity: withTiming(visible ? 1 : 0, { duration: 200 }), transform: [{ scale: withTiming(visible ? 1 : 0.2, { duration: 200 }) }] }));
  return <Animated.View style={[styles.dot, { backgroundColor: color }, a]} />;
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="tienda" options={{ href: null }} />
      <Tabs.Screen name="academia" options={{ title: 'Academia' }} />
      <Tabs.Screen name="plan" options={{ href: null }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    paddingTop: 10,
    backgroundColor: 'rgba(248,243,234,0.97)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(17,26,49,0.12)',
    shadowColor: '#111A31',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -6 },
    elevation: 12,
  },
  barDark: { backgroundColor: 'rgba(18,10,9,0.97)', borderTopColor: C.inkLine },
  item: { flex: 1, alignItems: 'center', gap: 3, minHeight: 48 },
  dot: { width: 4, height: 4, borderRadius: 2 },
});
