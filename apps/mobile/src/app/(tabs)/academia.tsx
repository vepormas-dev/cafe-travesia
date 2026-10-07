import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Image } from 'expo-image';
import { router, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { normalizePlace } from '@travesia/shared';

import { CourseCard, CourseRow } from '@/components/catalog';
import { Badge, Button, DemoNotice, EmptyState, IconButton, PressableScale, ProgressBar, SectionHeading, Skeleton, T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { imageSource } from '@/lib/images';
import { useAcademyMe, useCourses, useNotifications } from '@/lib/queries';
import { C, F, R, S } from '@/theme';

export default function Academia() {
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const { canUseAccount } = useAuth();
  const courses = useCourses();
  const academy = useAcademyMe();
  const notif = useNotifications();
  const [searching, setSearching] = useState(false);
  const [q, setQ] = useState('');

  const current = academy.data?.enrollments.find((e) => !e.completedAt);
  const lessons = current?.course.modules?.flatMap((m) => m.lessons) ?? [];
  const next = lessons.find((l) => l.id === current?.lastLessonId) ?? lessons[0];

  const filtered = useMemo(() => {
    const w = normalizePlace(q);
    return (courses.data ?? []).filter((c) => !w || normalizePlace([c.title, c.subtitle, c.category, c.instructorName].join(' ')).includes(w));
  }, [courses.data, q]);
  const byCategory = useMemo(() => {
    const m = new Map<string, typeof filtered>();
    filtered.forEach((c) => {
      const k = c.category ?? 'Más cursos';
      m.set(k, [...(m.get(k) ?? []), c]);
    });
    return [...m.entries()];
  }, [filtered]);
  const featured = filtered.filter((c) => c.isFeatured);

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      {focused ? <StatusBar style="light" /> : null}
      <Animated.ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 130 }} keyboardShouldPersistTaps="handled">
        <View style={[styles.top, { paddingTop: insets.top + 10 }]}>
          <T v="h1" color={C.crema} accessibilityRole="header">
            Academia
          </T>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <IconButton name="search" label="Buscar cursos" color={C.crema} onPress={() => setSearching((s) => !s)} />
            <IconButton name="notifications-outline" label="Notificaciones" color={C.crema} badge={notif.data?.unread} onPress={() => router.push('/notificaciones')} />
          </View>
        </View>
        {searching ? (
          <Animated.View entering={FadeIn} style={{ paddingHorizontal: S.xl, marginBottom: 8 }}>
            <TextInput value={q} onChangeText={setQ} autoFocus placeholder="Buscar cursos, temas o instructores" placeholderTextColor="rgba(248,243,234,0.4)" style={styles.search} accessibilityLabel="Buscar cursos" />
          </Animated.View>
        ) : null}
        <View style={{ paddingHorizontal: S.xl, gap: S.lg }}>
          <DemoNotice dark compact />
          <T v="eyebrow" color={C.inkMuted} style={{ marginTop: 8 }}>
            Continuar aprendiendo
          </T>
          {academy.isLoading ? (
            <Skeleton dark style={{ height: 300, borderRadius: R.lg }} />
          ) : current ? (
            <Animated.View entering={FadeInDown.duration(500)} style={styles.hero}>
              <View style={{ height: 210 }}>
                <Image source={imageSource(current.course.coverUrl)} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} />
                <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
                  <Defs>
                    <LinearGradient id="ac" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0.2" stopColor="#120A09" stopOpacity="0.1" />
                      <Stop offset="1" stopColor="#120A09" stopOpacity="0.95" />
                    </LinearGradient>
                  </Defs>
                  <Rect width="100%" height="100%" fill="url(#ac)" />
                </Svg>
                <View style={{ position: 'absolute', left: 18, right: 18, bottom: 14, gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Badge label="En curso" bg={C.montana} />
                    <T v="small" color={C.inkMuted}>
                      {current.progressPct}% completado
                    </T>
                  </View>
                  <T v="h2" color={C.crema} numberOfLines={2}>
                    {current.course.title}
                  </T>
                </View>
              </View>
              <View style={styles.heroFoot}>
                <View style={{ flex: 1, gap: 8 }}>
                  <T v="small" color={C.inkMuted} numberOfLines={2}>
                    Siguiente: <T v="small" color={C.crema} style={{ fontFamily: F.bold }}>{next?.title ?? 'Primera lección'}</T>
                  </T>
                  <ProgressBar pct={current.progressPct} color={C.montana} track="rgba(255,255,255,0.1)" height={4} />
                </View>
                <Button title="CONTINUAR" variant="light" iconRight="play" onPress={() => router.push(next ? `/leccion/${next.id}` : `/curso/${current.course.slug}`)} accessibilityLabel={`Continuar ${current.course.title}`} />
              </View>
            </Animated.View>
          ) : (
            <View style={[styles.hero, { padding: S.xl, gap: 12 }]}>
              <T v="h3" color={C.crema}>
                {canUseAccount ? 'Empieza tu primer curso' : 'Aprende de café con Gabo y Alex'}
              </T>
              <T v="body" color={C.inkMuted}>
                {canUseAccount ? 'Fundamentos del Grano es gratis: ideal para arrancar.' : 'Ingresa para guardar tu progreso, tomar notas y obtener certificados.'}
              </T>
              <Button title={canUseAccount ? 'Ver cursos gratis' : 'Ingresar'} variant="lima" onPress={() => router.push(canUseAccount ? '/curso/fundamentos-del-grano' : '/ingresar')} />
            </View>
          )}
        </View>

        {featured.length ? (
          <>
            <View style={{ paddingHorizontal: S.xl }}>
              <SectionHeading title="Fundamentos de Barismo" dark action="Ver todos" onAction={() => setSearching(true)} />
            </View>
            <FlatList
              horizontal
              data={featured}
              keyExtractor={(c) => c.id}
              renderItem={({ item, index }) => <CourseCard course={item} index={index} />}
              contentContainerStyle={{ paddingHorizontal: S.xl, gap: 14 }}
              showsHorizontalScrollIndicator={false}
            />
          </>
        ) : courses.isLoading ? (
          <View style={{ flexDirection: 'row', gap: 14, paddingHorizontal: S.xl, marginTop: 30 }}>
            <Skeleton dark style={{ width: 250, height: 230 }} />
            <Skeleton dark style={{ width: 250, height: 230 }} />
          </View>
        ) : null}

        <View style={{ paddingHorizontal: S.xl }}>
          {byCategory.map(([cat, list]) => (
            <View key={cat}>
              <SectionHeading title={cat} dark />
              <View style={{ gap: 12 }}>
                {list.map((c) => (
                  <CourseRow key={c.id} course={c} />
                ))}
              </View>
            </View>
          ))}
          {!courses.isLoading && !filtered.length ? <EmptyState dark icon="school-outline" title="Sin cursos para esa búsqueda" action="Limpiar" onAction={() => setQ('')} /> : null}

          {academy.data?.certificates.length ? (
            <PressableScale onPress={() => router.push('/certificados')} accessibilityLabel="Mis certificados" style={[styles.hero, { flexDirection: 'row', alignItems: 'center', padding: S.lg, gap: 12, marginTop: S.xxl }]}>
              <IconButton name="ribbon-outline" label="Certificados" color={C.lima} bg="rgba(201,231,166,0.12)" onPress={() => router.push('/certificados')} />
              <View style={{ flex: 1 }}>
                <T v="bodyStrong" color={C.crema}>
                  Mis certificados
                </T>
                <T v="small" color={C.inkMuted}>
                  {academy.data.certificates.length} obtenido(s)
                </T>
              </View>
            </PressableScale>
          ) : null}
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: S.xl, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.inkLine, marginBottom: 12 },
  search: { height: 48, borderRadius: R.md, backgroundColor: C.inkCard, color: C.crema, paddingHorizontal: 14, fontFamily: F.body, fontSize: 16, borderWidth: 1, borderColor: C.inkLine },
  hero: { borderRadius: R.lg, overflow: 'hidden', backgroundColor: C.inkCard, borderWidth: 1, borderColor: C.inkLine },
  heroFoot: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: S.lg },
});
