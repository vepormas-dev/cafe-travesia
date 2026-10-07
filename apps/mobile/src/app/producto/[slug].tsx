import { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { formatCOP, formatDate, GRIND_LABEL, formatNumber } from '@travesia/shared';

import { AndeanPattern, CoffeeBag, Markdown } from '@/components/brand';
import { CartBar } from '@/components/cart-bar';
import { AiCard, SensoryBars } from '@/components/catalog';
import { Segmented, Stepper } from '@/components/form';
import { Button, EmptyState, Header, Icon, IconButton, Price, SectionHeading, Skeleton, Stars, T } from '@/components/ui';
import { cart, useCartCount } from '@/lib/cart';
import { haptic } from '@/lib/haptics';
import { imageSource } from '@/lib/images';
import { useProduct, useRecommend } from '@/lib/queries';
import { C, inkOn, isLight, R, S } from '@/theme';

export default function ProductScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const insets = useSafeAreaInsets();
  const { data: p, isLoading, isError, refetch } = useProduct(slug);
  const recs = useRecommend('product', { productSlug: slug });
  const count = useCartCount();

  const weights = useMemo(() => [...new Set((p?.variants ?? []).map((v) => v.weightG).filter((w): w is number => !!w))], [p]);
  const grinds = useMemo(() => [...new Set((p?.variants ?? []).map((v) => v.grind).filter((g): g is string => !!g))], [p]);
  const [weight, setWeight] = useState<number | null>(null);
  const [grind, setGrind] = useState<string | null>(null);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 2200);
    return () => clearTimeout(t);
  }, [added]);

  if (isLoading || (!p && !isError)) {
    return (
      <View style={{ flex: 1, backgroundColor: C.crema }}>
        <Header />
        <View style={{ padding: S.xl, gap: 16 }}>
          <Skeleton style={{ height: 360, borderRadius: R.xl }} />
          <Skeleton style={{ height: 24, width: '60%' }} />
          <Skeleton style={{ height: 120 }} />
        </View>
      </View>
    );
  }
  if (!p) {
    return (
      <View style={{ flex: 1, backgroundColor: C.crema }}>
        <Header title="Producto" />
        <EmptyState icon="cafe-outline" title="No encontramos este producto" body="Puede que ya no esté disponible." action="Reintentar" onAction={() => void refetch()} />
      </View>
    );
  }

  const bg = p.themeColor ?? C.noche;
  const fg = inkOn(bg);
  const accent = isLight(bg) ? C.ambarProfundo : (p.accentColor ?? C.ambar);
  const isCoffee = p.kind === 'coffee' && weights.length > 0;
  const selWeight = weight ?? weights[0] ?? null;
  const selGrind = grind ?? grinds[0] ?? null;
  const selVariant = variantId ?? p.variants[0]?.id ?? null;
  const variant = isCoffee ? (p.variants.find((v) => v.weightG === selWeight && v.grind === selGrind) ?? p.variants.find((v) => v.weightG === selWeight)) : p.variants.find((v) => v.id === selVariant);
  const price = variant?.priceCop ?? p.priceFromCop;
  const soldOut = variant ? !variant.inStock : false;

  const add = () => {
    if (!variant) return;
    cart.add({ kind: 'product', id: p.id, variantId: variant.id, quantity: qty });
    haptic.success();
    setAdded(true);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.crema }}>
      <StatusBar style={isLight(bg) ? 'dark' : 'light'} />
      <Animated.ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 140 }}>
        {/* Bloque con color de origen */}
        <View style={{ backgroundColor: bg, paddingBottom: S.xxl }}>
          <Header transparent dark={!isLight(bg)} right={<IconButton name="bag-outline" label={`Carrito, ${count}`} color={fg} badge={count} onPress={() => router.push('/carrito')} />} />
          <Animated.View entering={FadeInUp.duration(600)} style={{ alignItems: 'center', paddingTop: 4 }}>
            {isCoffee ? (
              <CoffeeBag color={bg === C.noche ? C.nocheSuave : bg} accent={p.accentColor} name={p.name} origin={p.originRegion} width={210} />
            ) : (
              <View style={styles.archPhoto}>
                <Image source={imageSource(p.imageUrl)} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityLabel={p.name} />
              </View>
            )}
          </Animated.View>
          <View style={{ paddingHorizontal: S.xl, marginTop: S.xl, gap: 6 }}>
            {p.badges.length ? (
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                {p.badges.map((b) => (
                  <View key={b} style={[styles.pill, { borderColor: fg }]}>
                    <T v="eyebrow" color={fg} style={{ fontSize: 10 }}>
                      {b}
                    </T>
                  </View>
                ))}
              </View>
            ) : null}
            <T v="h1" color={fg} accessibilityRole="header">
              {p.name}
            </T>
            {p.subtitle ? (
              <T v="italic" color={fg} style={{ opacity: 0.85 }}>
                {p.subtitle}
              </T>
            ) : null}
            <Stars value={p.ratingAvg} count={p.ratingCount} color={accent} textColor={fg} />
            {(p.process || p.variety || p.altitudeM) && (
              <View style={styles.facts}>
                {p.process ? <Fact label="Proceso" value={p.process} color={fg} /> : null}
                {p.variety ? <Fact label="Variedad" value={p.variety} color={fg} /> : null}
                {p.altitudeM ? <Fact label="Altitud" value={`${formatNumber(p.altitudeM)} m`} color={fg} /> : null}
              </View>
            )}

            {/* Selectores */}
            <View style={{ gap: 14, marginTop: S.lg }}>
              {isCoffee ? (
                <>
                  <T v="eyebrow" color={fg}>
                    Gramaje
                  </T>
                  <Segmented options={weights.map((w) => ({ value: w, label: `${w} g` }))} value={selWeight!} onChange={setWeight} color={fg} accent={C.ambar} />
                  {grinds.length > 1 ? (
                    <>
                      <T v="eyebrow" color={fg}>
                        Molienda
                      </T>
                      <Segmented options={grinds.map((g) => ({ value: g, label: g === 'grano' ? 'En grano' : (GRIND_LABEL[g]?.split(' (')[0] ?? g) }))} value={selGrind!} onChange={setGrind} color={fg} accent={C.ambar} />
                    </>
                  ) : null}
                </>
              ) : p.variants.length > 1 ? (
                <>
                  <T v="eyebrow" color={fg}>
                    {p.kind === 'experience' ? 'Fecha' : 'Opción'}
                  </T>
                  <Segmented options={p.variants.map((v) => ({ value: v.id, label: v.eventAt ? `${v.name}` : v.name, disabled: !v.inStock }))} value={selVariant!} onChange={setVariantId} color={fg} accent={C.ambar} />
                </>
              ) : null}
              <View style={styles.buyRow}>
                <Stepper value={qty} onChange={setQty} color={fg} max={Math.min(50, variant?.stock || 50)} />
                <View style={{ alignItems: 'flex-end' }}>
                  <T v="small" color={fg} style={{ opacity: 0.7 }}>
                    Precio · IVA incluido
                  </T>
                  <Price value={price * qty} compareAt={variant?.compareAtCop ? variant.compareAtCop * qty : null} color={fg} size={24} />
                </View>
              </View>
              <Button title={soldOut ? 'Agotado' : 'Agregar al carrito'} variant="ambar" icon="bag-add-outline" disabled={soldOut || !variant} onPress={add} haptics="add" full />
              {added ? (
                <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.added} accessibilityLiveRegion="polite">
                  <Icon name="checkmark-circle" size={18} color={C.montana} />
                  <T v="label" style={{ flex: 1 }}>
                    Agregado al carrito
                  </T>
                  <Button title="Ver carrito" small variant="ghost" onPress={() => router.push('/carrito')} />
                </Animated.View>
              ) : null}
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: S.xl }}>
          {p.profile ? (
            <Animated.View entering={FadeInDown.delay(150)}>
              <SectionHeading title="Perfil sensorial" eyebrow="Así se siente en taza" />
              <View style={styles.profileCard}>
                <SensoryBars profile={p.profile} accent={C.ambar} />
              </View>
            </Animated.View>
          ) : null}
          {p.tastingNotes.length ? (
            <>
              <SectionHeading title="Notas de cata" />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {p.tastingNotes.map((n) => (
                  <View key={n} style={styles.note}>
                    <T v="italic" style={{ fontSize: 15 }}>
                      {n}
                    </T>
                  </View>
                ))}
              </View>
            </>
          ) : null}
          {p.description ? (
            <View style={{ marginTop: S.xxl }}>
              <Markdown text={p.description} />
            </View>
          ) : null}
          {p.brewMethods.length ? (
            <View style={{ marginTop: S.xl, gap: 8 }}>
              <T v="eyebrow" color={C.ambarProfundo}>
                Ideal para
              </T>
              <T v="body">{p.brewMethods.join(' · ')}</T>
            </View>
          ) : null}
          {p.variants.some((v) => v.eventAt) ? (
            <View style={{ marginTop: S.xl, gap: 6 }}>
              <T v="eyebrow" color={C.ambarProfundo}>
                Próximas fechas
              </T>
              {p.variants.filter((v) => v.eventAt).map((v) => (
                <T key={v.id} v="body">
                  {formatDate(v.eventAt, { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' })}
                </T>
              ))}
            </View>
          ) : null}

          {p.story ? (
            <>
              <SectionHeading title="Historia de origen" eyebrow={p.originRegion ?? undefined} />
              <View style={{ flexDirection: 'row', gap: 16, alignItems: 'flex-end' }}>
                <View style={styles.storyArch}>
                  <Image source={imageSource(p.gallery[0] ?? p.imageUrl)} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityLabel={`Origen de ${p.name}`} />
                </View>
                <View style={{ flex: 1, gap: 10 }}>
                  {p.producer ? (
                    <View>
                      <T v="small" color={C.muted}>
                        Productor(es)
                      </T>
                      <T v="h3">{p.producer}</T>
                    </View>
                  ) : null}
                  {p.altitudeM ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Icon name="triangle-outline" size={18} color={C.montana} />
                      <View>
                        <T v="small" color={C.muted}>
                          Altitud
                        </T>
                        <T v="bodyStrong">{formatNumber(p.altitudeM)} m</T>
                      </View>
                    </View>
                  ) : null}
                  {p.originFarm ? (
                    <T v="small" color={C.muted}>
                      {p.originFarm}
                    </T>
                  ) : null}
                </View>
              </View>
              <AndeanPattern width={330} style={{ marginVertical: S.xl }} />
              <Markdown text={p.story} />
            </>
          ) : null}

          <SectionHeading title="Combina con ✨" eyebrow={recs.data?.ai ? 'Sugerido con IA' : 'Sugerencias'} />
        </View>
        <FlatList
          horizontal
          data={(recs.data?.items ?? []).filter((r) => r.slug !== p.slug)}
          keyExtractor={(r) => `${r.kind}-${r.id}`}
          renderItem={({ item }) => <AiCard item={item} width={270} />}
          contentContainerStyle={{ paddingHorizontal: S.xl, gap: 12 }}
          showsHorizontalScrollIndicator={false}
          ListEmptyComponent={<Skeleton style={{ width: 270, height: 104 }} />}
        />
        <View style={{ paddingHorizontal: S.xl, marginTop: S.xl }}>
          <T v="small" color={C.muted} center>
            Envíos a toda Colombia · {formatCOP(99000)} o más: envío gratis en el Valle de Aburrá
          </T>
        </View>
      </Animated.ScrollView>
      <CartBar bottom={insets.bottom + 16} />
    </View>
  );
}

function Fact({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={{ flex: 1, minWidth: 90 }}>
      <T v="small" color={color} style={{ opacity: 0.7 }}>
        {label}
      </T>
      <T v="label" color={color} numberOfLines={2}>
        {value}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  archPhoto: { width: 230, height: 290, borderTopLeftRadius: 115, borderTopRightRadius: 115, borderRadius: 16, overflow: 'hidden' },
  pill: { borderWidth: 1, borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 4 },
  facts: { flexDirection: 'row', gap: 12, marginTop: 12, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.3)' },
  buyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  added: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.hueso, borderRadius: R.md, paddingLeft: 12 },
  profileCard: { backgroundColor: C.hueso, borderRadius: R.lg, padding: S.xl, borderWidth: 1, borderColor: C.line },
  note: { borderRadius: R.pill, borderWidth: 1, borderColor: C.ambar, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: '#FBEBD3' },
  storyArch: { width: 140, height: 180, borderTopLeftRadius: 70, borderTopRightRadius: 70, overflow: 'hidden', borderRadius: 10 },
});
