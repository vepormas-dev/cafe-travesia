import { FlatList, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { formatCOP, formatDate, formatNumber, LOYALTY, ORDER_STATUS_LABEL, SUBSCRIPTION_STATUS_LABEL } from '@travesia/shared';

import { AndeanPattern, BrandIcon } from '@/components/brand';
import { AiCard, ArchCard } from '@/components/catalog';
import { Button, Card, DemoNotice, Icon, IconButton, PressableScale, ProgressBar, SectionHeading, Skeleton, T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useCartCount } from '@/lib/cart';
import { imageSource, LOGO_CLARO, PHOTOS, type BrandIconName } from '@/lib/images';
import { useAcademyMe, useNotifications, useOrders, useProducts, useRecommend, useSubscriptions } from '@/lib/queries';
import { C, R, S, shadow } from '@/theme';

const HERO = 470;

const QUICK: { icon: BrandIconName; label: string; href: string }[] = [
  { icon: 'tienda-online', label: 'Tienda', href: '/tienda' },
  { icon: 'academia', label: 'Academia', href: '/academia' },
  { icon: 'granos', label: 'Suscripción', href: '/plan' },
  { icon: 'pregunta', label: 'Asistente', href: '/chat' },
];

export default function Home() {
  const insets = useSafeAreaInsets();
  const { me, canUseAccount } = useAuth();
  const count = useCartCount();
  const featured = useProducts({ featured: true });
  const academy = useAcademyMe();
  const subs = useSubscriptions();
  const orders = useOrders();
  const notifications = useNotifications();
  const recs = useRecommend('home');

  const y = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    y.set(e.contentOffset.y);
  });
  const heroImg = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(y.get(), [-200, 0, HERO], [-60, 0, HERO * 0.35]) }, { scale: interpolate(y.get(), [-200, 0], [1.25, 1], 'clamp') }],
  }));

  const seasonal = [...(featured.data ?? [])].sort((a, b) => Number(b.isSeasonal) - Number(a.isSeasonal)).filter((p) => p.kind === 'coffee' || p.isSeasonal);
  const firstName = (me?.fullName ?? '').split(' ')[0];
  const enrollment = academy.data?.enrollments.find((e) => !e.completedAt) ?? academy.data?.enrollments[0];
  const sub = subs.data?.subscriptions.find((s) => s.status !== 'cancelled');
  const lastOrder = orders.data?.orders[0];
  const nextLesson = enrollment?.course.modules?.flatMap((m) => m.lessons).find((l) => l.id === enrollment.lastLessonId);

  return (
    <View style={{ flex: 1, backgroundColor: C.crema }}>
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}>
        {/* HERO */}
        <View style={{ height: HERO, overflow: 'hidden', backgroundColor: C.noche }}>
          <Animated.View style={[StyleSheet.absoluteFill, heroImg]}>
            <Image source={PHOTOS['manos-cafe-caicedo']} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="top" accessibilityLabel="Manos de caficultor con café de Caicedo" />
          </Animated.View>
          <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
            <Defs>
              <LinearGradient id="hero" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#0A1022" stopOpacity="0.55" />
                <Stop offset="0.35" stopColor="#0A1022" stopOpacity="0.1" />
                <Stop offset="1" stopColor="#0A1022" stopOpacity="0.92" />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#hero)" />
          </Svg>
          <View style={[styles.heroTop, { paddingTop: insets.top + 8 }]}>
            <Image source={LOGO_CLARO} style={{ width: 92, height: 60 }} contentFit="contain" accessibilityLabel="Café Travesía" />
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <IconButton name="notifications-outline" label="Notificaciones" color={C.crema} bg="rgba(255,255,255,0.12)" badge={notifications.data?.unread} onPress={() => router.push('/notificaciones')} />
              <IconButton name="bag-outline" label={`Carrito, ${count} productos`} color={C.crema} bg="rgba(255,255,255,0.12)" badge={count} onPress={() => router.push('/carrito')} />
            </View>
          </View>
          <Animated.View entering={FadeInDown.duration(700)} style={styles.heroText}>
            <T v="script" color={C.ambar} style={{ fontSize: 26 }}>
              {firstName ? `Hola, ${firstName}` : 'Bienvenido a la travesía'}
            </T>
            <T v="display" color={C.crema} accessibilityRole="header">
              Travesía de{'\n'}Sabor
            </T>
            <T v="body" color="rgba(248,243,234,0.88)" style={{ fontSize: 17, lineHeight: 25, maxWidth: 320 }}>
              Explora el origen de la excelencia en cada grano, desde Caicedo, Antioquia.
            </T>
            <AndeanPattern width={180} height={12} style={{ marginTop: 14 }} />
          </Animated.View>
        </View>

        <View style={{ paddingHorizontal: S.xl, marginTop: S.xl, gap: S.lg }}>
          <DemoNotice />
          {/* Accesos rápidos */}
          <View style={styles.quick}>
            {QUICK.map((q, i) => (
              <Animated.View key={q.href} entering={FadeIn.delay(120 + i * 70)} style={{ flex: 1 }}>
                <PressableScale onPress={() => router.push(q.href as never)} accessibilityLabel={q.label} style={styles.quickItem}>
                  <View style={styles.quickIcon}>
                    <BrandIcon name={q.icon} size={30} />
                  </View>
                  <T v="label" style={{ fontSize: 12 }} numberOfLines={1}>
                    {q.label}
                  </T>
                </PressableScale>
              </Animated.View>
            ))}
          </View>
        </View>

        {/* Orígenes de temporada */}
        <View style={{ paddingHorizontal: S.xl }}>
          <SectionHeading title="Orígenes de Temporada" action="Ver todos" onAction={() => router.push('/tienda')} />
        </View>
        {featured.isLoading ? (
          <View style={{ flexDirection: 'row', gap: 16, paddingHorizontal: S.xl }}>
            <Skeleton style={{ width: 230, height: 360, borderRadius: R.xl }} />
            <Skeleton style={{ width: 230, height: 360, borderRadius: R.xl }} />
          </View>
        ) : (
          <FlatList
            horizontal
            data={seasonal}
            keyExtractor={(p) => p.id}
            renderItem={({ item, index }) => <ArchCard product={item} index={index} />}
            contentContainerStyle={{ paddingHorizontal: S.xl, gap: 16, paddingBottom: 18 }}
            showsHorizontalScrollIndicator={false}
            snapToInterval={246}
            decelerationRate="fast"
          />
        )}

        <View style={{ paddingHorizontal: S.xl }}>
          {/* Continuar aprendiendo */}
          {enrollment ? (
            <>
              <SectionHeading title="Continuar aprendiendo" action="Academia" onAction={() => router.push('/academia')} />
              <PressableScale
                onPress={() => router.push(enrollment.lastLessonId ? `/leccion/${enrollment.lastLessonId}` : `/curso/${enrollment.course.slug}`)}
                accessibilityLabel={`Continuar ${enrollment.course.title}, ${enrollment.progressPct}% completado`}
                style={styles.learn}>
                <Image source={imageSource(enrollment.course.coverUrl)} style={{ width: 92, height: 112, borderRadius: 14 }} contentFit="cover" accessible={false} />
                <View style={{ flex: 1, gap: 6 }}>
                  <T v="eyebrow" color={C.lima} style={{ fontSize: 10 }}>
                    En curso · {enrollment.progressPct}%
                  </T>
                  <T v="h3" color={C.crema} numberOfLines={2}>
                    {enrollment.course.title}
                  </T>
                  {nextLesson ? (
                    <T v="small" color={C.inkMuted} numberOfLines={1}>
                      Siguiente: {nextLesson.title}
                    </T>
                  ) : null}
                  <ProgressBar pct={enrollment.progressPct} color={C.lima} track="rgba(255,255,255,0.12)" />
                </View>
                <View style={styles.play}>
                  <Icon name="play" size={18} color={C.ink} />
                </View>
              </PressableScale>
            </>
          ) : null}

          {/* Suscripción */}
          <SectionHeading title="Tu café en casa" />
          {sub ? (
            <PressableScale onPress={() => router.push('/plan')} accessibilityLabel={`Plan ${sub.plan.name}, próxima entrega ${formatDate(sub.nextBillingAt)}`} style={styles.subCard}>
              <View style={{ flex: 1, gap: 4 }}>
                <T v="eyebrow" color={C.muted}>
                  Plan activo · {SUBSCRIPTION_STATUS_LABEL[sub.status] ?? sub.status}
                </T>
                <T v="h2">{sub.plan.name}</T>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 }}>
                  <View style={styles.calIcon}>
                    <Icon name="calendar-outline" size={20} color={C.cereza} />
                  </View>
                  <View>
                    <T v="small" color={C.muted}>
                      Próxima entrega
                    </T>
                    <T v="bodyStrong">{formatDate(sub.nextBillingAt, { day: 'numeric', month: 'long' })}</T>
                  </View>
                </View>
              </View>
              {sub.product ? <Image source={imageSource(sub.product.imageUrl)} style={{ width: 78, height: 104, borderTopLeftRadius: 39, borderTopRightRadius: 39, borderRadius: 10 }} contentFit="cover" accessible={false} /> : null}
            </PressableScale>
          ) : (
            <Card style={{ gap: 10 }}>
              <T v="h3">Nunca te quedes sin café</T>
              <T v="body" color={C.muted}>
                Recibe café recién tostado de Caicedo cada mes, con envío gratis. Pausa o cancela cuando quieras.
              </T>
              <Button title="Ver planes" variant="ambar" onPress={() => router.push('/plan')} iconRight="arrow-forward" />
            </Card>
          )}

          {/* Último pedido */}
          {lastOrder ? (
            <>
              <SectionHeading title="Tu último pedido" action="Ver pedidos" onAction={() => router.push('/pedidos')} />
              <PressableScale onPress={() => router.push(`/pedidos/${lastOrder.id}`)} accessibilityLabel={`Pedido ${lastOrder.number}, ${ORDER_STATUS_LABEL[lastOrder.status]}`} style={[styles.order]}>
                <View style={styles.orderIcon}>
                  <Icon name={lastOrder.status === 'shipped' ? 'car-outline' : 'cube-outline'} size={22} color={C.noche} />
                </View>
                <View style={{ flex: 1 }}>
                  <T v="bodyStrong">{lastOrder.number}</T>
                  <T v="small" color={C.muted}>
                    {ORDER_STATUS_LABEL[lastOrder.status] ?? lastOrder.status} · {formatCOP(lastOrder.totalCop)}
                  </T>
                </View>
                <Icon name="chevron-forward" size={18} color={C.muted} />
              </PressableScale>
            </>
          ) : null}

          {/* Recomendado */}
          <SectionHeading title="Recomendado para ti ✨" eyebrow={recs.data?.ai ? 'Con IA' : 'Para tu paladar'} />
        </View>
        <FlatList
          horizontal
          data={recs.data?.items ?? []}
          keyExtractor={(r) => `${r.kind}-${r.id}`}
          renderItem={({ item }) => <AiCard item={item} width={270} />}
          contentContainerStyle={{ paddingHorizontal: S.xl, gap: 12 }}
          showsHorizontalScrollIndicator={false}
          ListEmptyComponent={<Skeleton style={{ width: 260, height: 104 }} />}
        />

        {/* Puntos */}
        <View style={{ paddingHorizontal: S.xl, marginTop: S.xxl }}>
          <PressableScale onPress={() => router.push(canUseAccount ? '/puntos' : '/ingresar')} accessibilityLabel={`Puntos Travesía: ${me?.loyaltyPoints ?? 0}`} style={styles.points}>
            <View style={{ flex: 1, gap: 4 }}>
              <T v="eyebrow" color={C.ambar}>
                Puntos Travesía
              </T>
              <T v="h1" color={C.crema}>
                {formatNumber(me?.loyaltyPoints ?? 0)}
              </T>
              <T v="small" color="rgba(248,243,234,0.7)">
                {canUseAccount ? `Equivalen a ${formatCOP((me?.loyaltyPoints ?? 0) * LOYALTY.valueCop)} en tu próxima compra.` : 'Ingresa y gana 1 punto por cada $1.000.'}
              </T>
            </View>
            <BrandIcon name="cosecha" size={54} tint={C.ambar} />
          </PressableScale>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  heroTop: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: S.xl, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroText: { position: 'absolute', left: S.xl, right: S.xl, bottom: 34, gap: 6 },
  quick: { flexDirection: 'row', gap: 10 },
  quickItem: { alignItems: 'center', gap: 8, paddingVertical: 14, borderRadius: R.lg, backgroundColor: C.hueso, borderWidth: 1, borderColor: C.line },
  quickIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.arena, alignItems: 'center', justifyContent: 'center' },
  learn: { flexDirection: 'row', gap: 14, alignItems: 'center', padding: 14, borderRadius: R.lg, backgroundColor: C.ink, ...shadow },
  play: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.lima, alignItems: 'center', justifyContent: 'center' },
  subCard: { flexDirection: 'row', gap: 12, padding: S.xl, borderRadius: R.lg, backgroundColor: C.hueso, borderWidth: 1, borderColor: C.line, alignItems: 'center' },
  calIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F9DCD4', alignItems: 'center', justifyContent: 'center' },
  order: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: S.lg, borderRadius: R.lg, backgroundColor: C.hueso, borderWidth: 1, borderColor: C.line },
  orderIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.arena, alignItems: 'center', justifyContent: 'center' },
  points: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: S.xl, borderRadius: R.xl, backgroundColor: C.noche, ...shadow },
});
