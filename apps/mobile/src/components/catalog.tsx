import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { formatCOP, formatDuration, LEVEL_LABEL, PROFILE_LABELS, type AiRecommendation, type CourseDTO, type ProductDTO, type SensoryProfile } from '@travesia/shared';

import { cart } from '@/lib/cart';
import { haptic } from '@/lib/haptics';
import { imageSource } from '@/lib/images';
import { openLink } from '@/lib/links';
import { C, F, inkOn, R, S, shadow } from '@/theme';
import { CoffeeBag } from './brand';
import { Badge, Button, Icon, PressableScale, Stars, T } from './ui';

export const productHref = (slug: string) => `/producto/${slug}` as const;

/** Agrega la primera variante disponible al carrito. */
export function quickAdd(p: ProductDTO) {
  const v = p.variants.find((x) => x.inStock) ?? p.variants[0];
  if (!v) return;
  cart.add({ kind: 'product', id: p.id, variantId: v.id, quantity: 1 });
  haptic.success();
}

/** Tarjeta en ARCO con el themeColor del producto (referente Pergamino / mockup home). */
export function ArchCard({ product, width = 230, index = 0 }: { product: ProductDTO; width?: number; index?: number }) {
  const bg = product.themeColor ?? C.noche;
  const fg = inkOn(bg);
  return (
    <Animated.View entering={FadeInDown.delay(80 * index).duration(450)}>
      <PressableScale
        onPress={() => router.push(productHref(product.slug))}
        accessibilityLabel={`${product.name}. ${product.subtitle ?? ''}. Desde ${formatCOP(product.priceFromCop)}`}
        style={[styles.arch, { width, backgroundColor: bg }]}>
        <View style={[styles.archWindow, { height: width * 1.05, borderTopLeftRadius: width / 2, borderTopRightRadius: width / 2 }]}>
          <Image source={imageSource(product.imageUrl)} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} accessible={false} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10,16,34,0.12)' }]} />
          {product.isSeasonal ? (
            <View style={{ position: 'absolute', top: width * 0.22, alignSelf: 'center' }}>
              <Badge label="Temporada" bg={C.ambar} fg={C.noche} />
            </View>
          ) : null}
        </View>
        <View style={{ padding: S.lg, gap: 4 }}>
          <T v="eyebrow" color={fg} style={{ opacity: 0.75 }} numberOfLines={1}>
            {product.originRegion ?? product.category ?? ''}
          </T>
          <T v="h3" color={fg} numberOfLines={1}>
            {product.name}
          </T>
          {product.tastingNotes.length ? (
            <T v="italic" color={fg} style={{ opacity: 0.85, fontSize: 14 }} numberOfLines={1}>
              {product.tastingNotes.join(' · ')}
            </T>
          ) : null}
          <T v="bodyStrong" color={fg === C.crema ? C.ambarClaro : C.noche} style={{ marginTop: 6 }}>
            Desde {formatCOP(product.priceFromCop)}
          </T>
        </View>
      </PressableScale>
    </Animated.View>
  );
}

/** Tarjeta grande de la tienda (mockup tienda_de_especialidad). */
export function ShopCard({ product, index = 0 }: { product: ProductDTO; index?: number }) {
  const high = (product.altitudeM ?? 0) >= 1900 || product.badges.some((b) => /altitud/i.test(b));
  const badge = high ? 'Altitud alta' : product.badges[0];
  const v = product.variants[0];
  const meta = product.kind === 'coffee' ? [v?.weightG ? `${v.weightG} g` : null, product.roastLevel ? `Tueste ${product.roastLevel.toLowerCase()}` : null].filter(Boolean).join(' • ') : (product.subtitle ?? '');
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 5) * 70).duration(420)}>
      <PressableScale onPress={() => router.push(productHref(product.slug))} accessibilityLabel={`${product.name}, ${formatCOP(product.priceFromCop)}`} style={styles.shop} scaleTo={0.985}>
        <View style={[styles.shopMedia, { backgroundColor: product.themeColor ?? C.arena }]}>
          {product.kind === 'coffee' ? (
            <>
              <Image source={imageSource(product.imageUrl)} style={[StyleSheet.absoluteFill, { opacity: 0.35 }]} contentFit="cover" accessible={false} />
              <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                <CoffeeBag color={product.themeColor} accent={product.accentColor} name={product.name} origin={product.originRegion} width={150} />
              </View>
            </>
          ) : (
            <Image source={imageSource(product.imageUrl)} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} accessible={false} />
          )}
          {badge ? (
            <View style={{ position: 'absolute', top: 16, left: 16 }}>
              <Badge label={badge} />
            </View>
          ) : null}
        </View>
        <View style={{ padding: S.xl, gap: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
            <T v="h2" style={{ flex: 1 }} numberOfLines={2}>
              {product.name}
            </T>
            <T v="price" color={C.montana}>
              {formatCOP(product.priceFromCop)}
            </T>
          </View>
          <T v="italic" color={C.muted} numberOfLines={1}>
            {product.tastingNotes.length ? `Notas de ${product.tastingNotes.slice(0, 2).join(' y ')}` : product.subtitle}
          </T>
          <View style={styles.shopFoot}>
            <T v="small" color={C.muted} style={{ flex: 1 }} numberOfLines={1}>
              {meta}
            </T>
            <Button title="Agregar" small haptics="add" accessibilityLabel={`Agregar ${product.name} al carrito`} onPress={() => quickAdd(product)} />
          </View>
        </View>
      </PressableScale>
    </Animated.View>
  );
}

/** Perfil sensorial con barras (referente Pergamino). */
export function SensoryBars({ profile, color = C.noche, accent = C.ambar }: { profile: SensoryProfile; color?: string; accent?: string }) {
  return (
    <View style={{ gap: 14 }}>
      {(Object.keys(PROFILE_LABELS) as (keyof SensoryProfile)[]).map((k) => {
        const v = profile[k] ?? 0;
        return (
          <View key={k} accessible accessibilityLabel={`${PROFILE_LABELS[k]}: ${v} de 10`}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <T v="label" color={color}>
                {PROFILE_LABELS[k]}
              </T>
              <T v="small" color={color} style={{ opacity: 0.7 }}>
                {v <= 3 ? 'Bajo' : v <= 6 ? 'Medio' : 'Alto'}
              </T>
            </View>
            <View style={{ flexDirection: 'row', gap: 3 }}>
              {Array.from({ length: 10 }).map((_, i) => (
                <View key={i} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: i < v ? accent : color, opacity: i < v ? 1 : 0.18 }} />
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** Tarjeta de curso (Academia, oscura por defecto). */
export function CourseCard({ course, width = 250, dark = true, index = 0 }: { course: CourseDTO; width?: number; dark?: boolean; index?: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 80).duration(420)}>
      <PressableScale
        onPress={() => router.push(`/curso/${course.slug}`)}
        accessibilityLabel={`Curso ${course.title}. ${LEVEL_LABEL[course.level]}. ${formatDuration(course.durationMin * 60)}`}
        style={[styles.course, { width }, dark ? { backgroundColor: C.inkCard, borderColor: C.inkLine } : { backgroundColor: C.hueso, borderColor: C.line }]}>
        <Image source={imageSource(course.coverUrl)} style={{ width: '100%', height: width * 0.62 }} contentFit="cover" transition={250} accessible={false} />
        <View style={{ padding: S.lg, gap: 8 }}>
          <T v="bodyStrong" color={dark ? C.crema : C.noche} numberOfLines={2} style={{ fontSize: 16 }}>
            {course.title}
          </T>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Stars value={course.ratingAvg} textColor={dark ? C.inkMuted : C.muted} />
            <T v="small" color={dark ? C.inkMuted : C.muted}>
              {formatDuration(course.durationMin * 60)}
            </T>
          </View>
        </View>
      </PressableScale>
    </Animated.View>
  );
}

/** Fila horizontal de curso (estilo "Tostión" del mockup). */
export function CourseRow({ course, dark = true }: { course: CourseDTO; dark?: boolean }) {
  return (
    <PressableScale
      onPress={() => router.push(`/curso/${course.slug}`)}
      accessibilityLabel={`Curso ${course.title}`}
      style={[styles.courseRow, dark ? { backgroundColor: C.inkCard, borderColor: C.inkLine } : { backgroundColor: C.hueso, borderColor: C.line }]}>
      <Image source={imageSource(course.coverUrl)} style={{ width: 96, height: 96, borderRadius: 10 }} contentFit="cover" accessible={false} />
      <View style={{ flex: 1, gap: 4 }}>
        <T v="bodyStrong" color={dark ? C.crema : C.noche} numberOfLines={2}>
          {course.title}
        </T>
        <T v="small" color={dark ? C.inkMuted : C.muted} numberOfLines={2}>
          {course.subtitle}
        </T>
        <View style={{ flexDirection: 'row', gap: 14, marginTop: 2 }}>
          <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
            <Icon name="time-outline" size={14} color={dark ? C.inkMuted : C.muted} />
            <T v="small" color={dark ? C.inkMuted : C.muted}>
              {formatDuration(course.durationMin * 60)}
            </T>
          </View>
          <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
            <Icon name="school-outline" size={14} color={dark ? C.inkMuted : C.muted} />
            <T v="small" color={dark ? C.inkMuted : C.muted}>
              {LEVEL_LABEL[course.level]}
            </T>
          </View>
        </View>
      </View>
    </PressableScale>
  );
}

/** Recomendación IA ✨ */
export function AiCard({ item, width }: { item: AiRecommendation; width?: number }) {
  return (
    <PressableScale onPress={() => void openLink(item.href)} accessibilityLabel={`${item.title}. ${item.reason}`} style={[styles.ai, width ? { width } : null]}>
      <Image source={imageSource(item.imageUrl)} style={{ width: 64, height: 80, borderRadius: 32 }} contentFit="cover" accessible={false} />
      <View style={{ flex: 1, gap: 3 }}>
        <T v="eyebrow" color={C.ambarProfundo} style={{ fontSize: 10 }}>
          {item.kind === 'course' ? 'Curso' : item.kind === 'plan' ? 'Plan' : 'Café'}
        </T>
        <T v="bodyStrong" numberOfLines={1}>
          {item.title}
        </T>
        <T v="small" color={C.muted} numberOfLines={2}>
          {item.reason}
        </T>
        <T v="label" style={{ fontFamily: F.bold, marginTop: 2 }}>
          {item.kind === 'course' || item.kind === 'plan' ? null : item.priceCop ? formatCOP(item.priceCop) : 'Gratis'}
        </T>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  arch: { borderRadius: R.xl, overflow: 'hidden', ...shadow },
  archWindow: { margin: 10, marginBottom: 0, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.1)', borderBottomLeftRadius: 6, borderBottomRightRadius: 6 },
  shop: { backgroundColor: C.hueso, borderRadius: R.lg, overflow: 'hidden', borderWidth: 1, borderColor: C.line, marginBottom: S.xl, ...shadow, shadowOpacity: 0.07 },
  shopMedia: { height: 250, overflow: 'hidden' },
  shopFoot: { flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: C.line, marginTop: 14, paddingTop: 14 },
  course: { borderRadius: R.lg, overflow: 'hidden', borderWidth: 1 },
  courseRow: { flexDirection: 'row', gap: 14, padding: 12, borderRadius: R.lg, borderWidth: 1, alignItems: 'center' },
  ai: { flexDirection: 'row', gap: 12, padding: 12, borderRadius: R.lg, backgroundColor: C.hueso, borderWidth: 1, borderColor: C.line, alignItems: 'center' },
});
