import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { formatClock, formatCOP, formatDuration, formatNumber, LEVEL_LABEL } from '@travesia/shared';

import { Markdown } from '@/components/brand';
import { Badge, Button, EmptyState, Header, Icon, PressableScale, ProgressBar, SectionHeading, Skeleton, Stars, T } from '@/components/ui';
import { api, errorMessage, isDemo, isDemoError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cart } from '@/lib/cart';
import { haptic } from '@/lib/haptics';
import { imageSource } from '@/lib/images';
import { useCourse, useCourseAccess } from '@/lib/queries';
import { C, R, S } from '@/theme';

export default function CourseScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { signedIn } = useAuth();
  const course = useCourse(slug);
  const access = useCourseAccess(slug);
  const [notice, setNotice] = useState<string | null>(null);

  const enroll = useMutation({
    mutationFn: async () => {
      if (isDemo()) throw new Error('Modo demo: la inscripción se habilita al conectar con cafetravesia.com.');
      return api.post<{ ok: boolean; enrollmentId: string }>(`/api/courses/${course.data!.id}/enroll`);
    },
    onSuccess: () => {
      haptic.success();
      setNotice('¡Listo! Ya estás inscrito. Disfruta el curso.');
      void qc.invalidateQueries({ queryKey: ['me'] });
    },
    onError: (e) => {
      haptic.warning();
      const purchase = (e as { data?: { purchase?: boolean } }).data?.purchase;
      setNotice(purchase ? 'Este curso requiere compra. Agrégalo al carrito para continuar.' : isDemoError(e) ? errorMessage(e) : errorMessage(e));
    },
  });

  if (course.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.ink }}>
        <Header dark />
        <View style={{ padding: S.xl, gap: 14 }}>
          <Skeleton dark style={{ height: 220 }} />
          <Skeleton dark style={{ height: 28, width: '70%' }} />
          <Skeleton dark style={{ height: 160 }} />
        </View>
      </View>
    );
  }
  const c = course.data;
  if (!c) {
    return (
      <View style={{ flex: 1, backgroundColor: C.ink }}>
        <Header dark title="Curso" />
        <EmptyState dark title="No encontramos este curso" action="Volver a la Academia" onAction={() => router.replace('/academia')} />
      </View>
    );
  }

  const a = access.data;
  const lessons = c.modules?.flatMap((m) => m.lessons) ?? [];
  const firstLesson = lessons[0];
  const resumeId = a?.lastLessonId ?? firstLesson?.id;
  const enrolled = !!a?.enrolled;

  const cta = () => {
    if (enrolled) return <Button title={a?.progressPct ? 'Continuar curso' : 'Empezar curso'} variant="lima" iconRight="play" full onPress={() => resumeId && router.push(`/leccion/${resumeId}`)} />;
    if (a?.canEnrollFree && (a.reason === 'free' || a.reason === 'subscription')) {
      return (
        <Button
          title={a.reason === 'free' ? 'Inscribirme gratis' : 'Incluido en tu plan · Inscribirme'}
          variant="lima"
          full
          loading={enroll.isPending}
          onPress={() => (signedIn || isDemo() ? enroll.mutate() : router.push('/ingresar'))}
        />
      );
    }
    return (
      <View style={{ gap: 10 }}>
        <Button
          title={`Comprar · ${formatCOP(c.priceCop)}`}
          variant="lima"
          icon="bag-add-outline"
          full
          haptics="add"
          onPress={() => {
            cart.add({ kind: 'course', id: c.id, quantity: 1 });
            haptic.success();
            router.push('/carrito');
          }}
        />
        {c.includedInSubscription ? (
          <Button title="O inclúyelo con el plan Maestro Premium" variant="ghost" small onPress={() => router.push('/plan')} style={{ alignSelf: 'center' }} />
        ) : null}
        {a?.reason === 'login_required' ? <Button title="Ya lo tengo: ingresar" variant="ghost" small onPress={() => router.push('/ingresar')} style={{ alignSelf: 'center' }} /> : null}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <StatusBar style="light" />
      <Animated.ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <View style={{ height: 340 }}>
          <Image source={imageSource(c.coverUrl)} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} />
          <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
            <Defs>
              <LinearGradient id="cv" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#120A09" stopOpacity="0.5" />
                <Stop offset="0.4" stopColor="#120A09" stopOpacity="0.1" />
                <Stop offset="1" stopColor="#120A09" stopOpacity="1" />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#cv)" />
          </Svg>
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
            <Header dark transparent />
          </View>
        </View>
        <Animated.View entering={FadeInDown.duration(500)} style={{ paddingHorizontal: S.xl, marginTop: -70, gap: 10 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Badge label={LEVEL_LABEL[c.level] ?? c.level} bg="rgba(201,231,166,0.16)" fg={C.lima} />
            {c.isFree ? <Badge label="Gratis" bg={C.ambar} fg={C.noche} /> : c.includedInSubscription ? <Badge label="Incluido en Premium" bg="rgba(235,154,55,0.2)" fg={C.ambarClaro} /> : null}
          </View>
          <T v="h1" color={C.crema} accessibilityRole="header">
            {c.title}
          </T>
          {c.subtitle ? (
            <T v="italic" color={C.inkMuted}>
              {c.subtitle}
            </T>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap', marginTop: 4 }}>
            <Stars value={c.ratingAvg} count={c.ratingCount} textColor={C.inkMuted} />
            <Meta icon="time-outline" text={formatDuration(c.durationMin * 60)} />
            <Meta icon="play-circle-outline" text={`${c.lessonsCount} lecciones`} />
            <Meta icon="people-outline" text={`${formatNumber(c.studentsCount)} estudiantes`} />
          </View>
          {enrolled ? (
            <View style={{ gap: 6, marginTop: 8 }}>
              <T v="small" color={C.inkMuted}>
                Tu progreso · {a?.progressPct ?? 0}%
              </T>
              <ProgressBar pct={a?.progressPct ?? 0} color={C.lima} track="rgba(255,255,255,0.1)" />
            </View>
          ) : !c.isFree ? (
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
              <T v="h2" color={C.crema}>
                {formatCOP(c.priceCop)}
              </T>
              {c.compareAtCop ? (
                <T v="body" color={C.inkMuted} style={{ textDecorationLine: 'line-through' }}>
                  {formatCOP(c.compareAtCop)}
                </T>
              ) : null}
            </View>
          ) : null}
          <View style={{ marginTop: 10 }}>{access.isLoading ? <Skeleton dark style={{ height: 50 }} /> : cta()}</View>
          {notice ? (
            <Animated.View entering={FadeIn} style={styles.notice} accessibilityLiveRegion="polite">
              <T v="small" color={C.ambarClaro}>
                {notice}
              </T>
            </Animated.View>
          ) : null}
        </Animated.View>

        <View style={{ paddingHorizontal: S.xl }}>
          {c.description ? (
            <View style={{ marginTop: S.xxl }}>
              <Markdown text={c.description} dark />
            </View>
          ) : null}
          {c.whatYouLearn.length ? (
            <>
              <SectionHeading title="Lo que aprenderás" dark />
              <View style={{ gap: 10 }}>
                {c.whatYouLearn.map((w) => (
                  <View key={w} style={{ flexDirection: 'row', gap: 10 }}>
                    <Icon name="checkmark-circle" size={20} color={C.lima} />
                    <T v="body" color={C.crema} style={{ flex: 1 }}>
                      {w}
                    </T>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          <SectionHeading title="Temario" dark eyebrow={`${c.modules?.length ?? 0} módulos · ${c.lessonsCount} lecciones`} />
          <View style={{ gap: 18 }}>
            {(c.modules ?? []).map((m, mi) => (
              <View key={m.id} style={{ gap: 8 }}>
                <T v="eyebrow" color={C.inkMuted} style={{ letterSpacing: 3 }}>
                  Módulo {mi + 1}: {m.title}
                </T>
                {m.lessons.map((l) => {
                  const open = enrolled || l.isPreview;
                  return (
                    <PressableScale
                      key={l.id}
                      disabled={!open}
                      onPress={() => router.push(`/leccion/${l.id}`)}
                      accessibilityLabel={`${l.title}, ${formatClock(l.durationS)}${open ? '' : ', bloqueada'}${l.isPreview && !enrolled ? ', vista previa' : ''}`}
                      style={styles.lesson}>
                      <View style={[styles.lessonIcon, l.completed && { backgroundColor: 'rgba(201,231,166,0.14)' }]}>
                        <Icon name={l.completed ? 'checkmark' : open ? 'play' : 'lock-closed'} size={16} color={open ? C.lima : C.inkMuted} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <T v="bodyStrong" color={open ? C.crema : C.inkMuted} numberOfLines={2}>
                          {l.title}
                        </T>
                        <T v="small" color={C.inkMuted}>
                          {formatClock(l.durationS)}
                          {l.isPreview && !enrolled ? ' · Vista previa gratis' : ''}
                        </T>
                      </View>
                    </PressableScale>
                  );
                })}
                {m.quizId ? (
                  <PressableScale disabled={!enrolled} onPress={() => router.push(`/quiz/${m.quizId}`)} accessibilityLabel={`Evaluación del módulo ${mi + 1}${enrolled ? '' : ', bloqueada'}`} style={styles.lesson}>
                    <View style={styles.lessonIcon}>
                      <Icon name="help-circle-outline" size={18} color={enrolled ? C.ambar : C.inkMuted} />
                    </View>
                    <T v="bodyStrong" color={enrolled ? C.crema : C.inkMuted} style={{ flex: 1 }}>
                      Evaluación del módulo
                    </T>
                  </PressableScale>
                ) : null}
              </View>
            ))}
          </View>

          {c.instructorName ? (
            <>
              <SectionHeading title="Tu instructor" dark />
              <View style={styles.instructor}>
                <View style={styles.avatar}>
                  <T v="h3" color={C.ink}>
                    {c.instructorName.slice(0, 1)}
                  </T>
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <T v="bodyStrong" color={C.crema}>
                    {c.instructorName}
                  </T>
                  {c.instructorTitle ? (
                    <T v="small" color={C.lima}>
                      {c.instructorTitle}
                    </T>
                  ) : null}
                  {c.instructorBio ? (
                    <T v="small" color={C.inkMuted}>
                      {c.instructorBio}
                    </T>
                  ) : null}
                </View>
              </View>
            </>
          ) : null}
          {c.requirements.length ? (
            <View style={{ marginTop: S.xl, gap: 6 }}>
              <T v="eyebrow" color={C.inkMuted}>
                Requisitos
              </T>
              {c.requirements.map((r) => (
                <T key={r} v="body" color={C.crema}>
                  • {r}
                </T>
              ))}
            </View>
          ) : null}
        </View>
      </Animated.ScrollView>
    </View>
  );
}

function Meta({ icon, text }: { icon: 'time-outline' | 'play-circle-outline' | 'people-outline'; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Icon name={icon} size={14} color={C.inkMuted} />
      <T v="small" color={C.inkMuted}>
        {text}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  lesson: { flexDirection: 'row', gap: 14, alignItems: 'center', padding: 14, borderRadius: R.md, backgroundColor: C.inkCard, borderWidth: 1, borderColor: C.inkLine },
  lessonIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  notice: { padding: 12, borderRadius: R.md, backgroundColor: 'rgba(235,154,55,0.12)', borderWidth: 1, borderColor: 'rgba(235,154,55,0.3)' },
  instructor: { flexDirection: 'row', gap: 14, padding: S.lg, borderRadius: R.lg, backgroundColor: C.inkCard, borderWidth: 1, borderColor: C.inkLine },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: C.lima, alignItems: 'center', justifyContent: 'center' },
});
