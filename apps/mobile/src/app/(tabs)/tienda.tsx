import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { normalizePlace, PRODUCT_KIND_LABEL, type AiRecommendation, type ProductDTO } from '@travesia/shared';

import { CartBar } from '@/components/cart-bar';
import { AiCard, ShopCard } from '@/components/catalog';
import { Button, Chip, DemoNotice, EmptyState, Icon, IconButton, Skeleton, T } from '@/components/ui';
import { api, isDemo } from '@/lib/api';
import { useCartCount } from '@/lib/cart';
import { demoSearch } from '@/lib/demo';
import { haptic } from '@/lib/haptics';
import { useProducts } from '@/lib/queries';
import { C, F, R, S } from '@/theme';

type Dim = 'todo' | 'origen' | 'intensidad' | 'tostion';
const DIMS: { value: Dim; label: string }[] = [
  { value: 'todo', label: 'Todo' },
  { value: 'origen', label: 'Origen' },
  { value: 'intensidad', label: 'Intensidad' },
  { value: 'tostion', label: 'Tostión' },
];
const KINDS = ['coffee', 'accessory', 'merch', 'kit', 'experience'] as const;

const intensity = (p: ProductDTO) => {
  if (!p.profile) return null;
  const v = (p.profile.cuerpo + p.profile.amargor + p.profile.tueste) / 3;
  return v < 4.5 ? 'Suave' : v < 6 ? 'Media' : 'Intensa';
};
const roast = (p: ProductDTO) => {
  const r = normalizePlace(p.roastLevel ?? '');
  if (!r) return null;
  return r.includes('oscuro') ? 'Oscuro' : r.includes('claro') ? 'Claro' : 'Medio';
};
const facet = (p: ProductDTO, d: Dim) => (d === 'origen' ? p.originRegion : d === 'intensidad' ? intensity(p) : d === 'tostion' ? roast(p) : null);

export default function Tienda() {
  const insets = useSafeAreaInsets();
  const count = useCartCount();
  const products = useProducts();
  const [q, setQ] = useState('');
  const [dim, setDim] = useState<Dim>('todo');
  const [value, setValue] = useState<string | null>(null);
  const [kind, setKind] = useState<string | null>(null);
  const [ai, setAi] = useState<{ summary: string; items: AiRecommendation[]; ai: boolean } | null>(null);

  const search = useMutation({
    mutationFn: async (query: string) => {
      if (isDemo()) {
        const items = demoSearch(query);
        return { summary: items.length ? `Encontramos ${items.length} opciones para "${query}".` : 'No encontramos coincidencias. Prueba con notas como "chocolate" o métodos como "V60".', items, ai: false };
      }
      return api.post<{ summary: string; items: AiRecommendation[]; ai: boolean }>('/api/ai/search', { query, kind: 'all' });
    },
    onSuccess: (r) => {
      haptic.success();
      setAi(r);
    },
  });

  const facets = useMemo(() => {
    if (dim === 'todo') return [];
    const set = new Set<string>();
    (products.data ?? []).forEach((p) => {
      const f = facet(p, dim);
      if (f) set.add(f);
    });
    return [...set];
  }, [products.data, dim]);

  const list = useMemo(() => {
    const words = normalizePlace(q).split(' ').filter(Boolean);
    return (products.data ?? []).filter((p) => {
      if (kind && p.kind !== kind) return false;
      if (dim !== 'todo') {
        const f = facet(p, dim);
        if (!f || (value && f !== value)) return false;
      }
      if (!words.length) return true;
      const hay = normalizePlace([p.name, p.subtitle, p.originRegion, p.tastingNotes.join(' '), p.process, p.category].join(' '));
      return words.every((w) => hay.includes(w));
    });
  }, [products.data, q, kind, dim, value]);

  const header = (
    <View>
      <View style={[styles.top, { paddingTop: insets.top + 10 }]}>
        <T v="h1" accessibilityRole="header">
          Tienda
        </T>
        <IconButton name="cart-outline" label={`Carrito, ${count} productos`} badge={count} size={26} onPress={() => router.push('/carrito')} />
      </View>
      <View style={{ paddingHorizontal: S.xl, gap: 12 }}>
        <View style={styles.search}>
          <Icon name="search" size={20} color={C.muted} />
          <TextInput
            value={q}
            onChangeText={(t) => {
              setQ(t);
              if (!t) setAi(null);
            }}
            placeholder="Buscar granos de origen…"
            placeholderTextColor="rgba(17,26,49,0.45)"
            accessibilityLabel="Buscar en la tienda"
            returnKeyType="search"
            onSubmitEditing={() => q.trim().length >= 2 && search.mutate(q.trim())}
            style={styles.searchInput}
            maxFontSizeMultiplier={1.4}
          />
          {q ? <IconButton name="close-circle" label="Borrar búsqueda" color={C.muted} size={18} onPress={() => { setQ(''); setAi(null); }} /> : null}
        </View>
        {q.trim().length >= 2 ? (
          <Animated.View entering={FadeIn}>
            <Button title="Buscar con IA ✨" variant="outline" small icon="sparkles-outline" loading={search.isPending} onPress={() => search.mutate(q.trim())} accessibilityLabel="Buscar con inteligencia artificial" />
          </Animated.View>
        ) : null}
        <DemoNotice compact />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {DIMS.map((d) => (
          <Chip key={d.value} label={d.label} active={dim === d.value} onPress={() => { setDim(d.value); setValue(null); }} />
        ))}
      </ScrollView>
      {facets.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.chips, { paddingTop: 0 }]}>
          {facets.map((f) => (
            <Chip key={f} label={f} active={value === f} onPress={() => setValue(value === f ? null : f)} />
          ))}
        </ScrollView>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.chips, { paddingTop: 0 }]}>
        {KINDS.map((k) => (
          <Chip key={k} label={PRODUCT_KIND_LABEL[k] ?? k} active={kind === k} onPress={() => setKind(kind === k ? null : k)} />
        ))}
      </ScrollView>
      <View style={styles.divider} />
      {search.isError ? (
        <T v="small" color={C.cereza} style={{ paddingHorizontal: S.xl, marginBottom: 12 }}>
          No pudimos buscar con IA ahora. Mostramos resultados por texto.
        </T>
      ) : null}
      {ai ? (
        <Animated.View entering={FadeIn} style={styles.aiBox}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="sparkles" size={18} color={C.ambarProfundo} />
            <T v="bodyStrong" style={{ flex: 1 }}>
              {ai.ai ? 'Sugerencias con IA' : 'Sugerencias'}
            </T>
            <IconButton name="close" label="Cerrar sugerencias" size={18} onPress={() => setAi(null)} />
          </View>
          <T v="body" color={C.muted}>
            {ai.summary}
          </T>
          <View style={{ gap: 10 }}>
            {ai.items.map((it) => (
              <AiCard key={`${it.kind}-${it.id}`} item={it} />
            ))}
          </View>
        </Animated.View>
      ) : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.crema }}>
      <FlatList
        data={products.isLoading ? [] : list}
        keyExtractor={(p) => p.id}
        ListHeaderComponent={header}
        renderItem={({ item, index }) => (
          <View style={{ paddingHorizontal: S.xl }}>
            <ShopCard product={item} index={index} />
          </View>
        )}
        ListEmptyComponent={
          products.isLoading ? (
            <View style={{ paddingHorizontal: S.xl, gap: 16 }}>
              <Skeleton style={{ height: 380, borderRadius: R.lg }} />
              <Skeleton style={{ height: 380, borderRadius: R.lg }} />
            </View>
          ) : products.isError ? (
            <EmptyState icon="cloud-offline-outline" title="No pudimos cargar la tienda" body="Revisa tu conexión e intenta de nuevo." action="Reintentar" onAction={() => void products.refetch()} />
          ) : (
            <EmptyState icon="search-outline" title="Sin resultados" body="Prueba otra búsqueda o quita los filtros." action="Ver todo" onAction={() => { setQ(''); setDim('todo'); setKind(null); setValue(null); }} />
          )
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 180 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshing={products.isRefetching}
        onRefresh={() => void products.refetch()}
      />
      {products.isFetching && !products.isLoading ? <ActivityIndicator style={{ position: 'absolute', top: insets.top + 18, alignSelf: 'center' }} color={C.ambar} /> : null}
      <CartBar bottom={insets.bottom + 78} />
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: S.xl, paddingBottom: 14 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 54, borderRadius: R.md, backgroundColor: '#ECE7DD', paddingHorizontal: 16 },
  searchInput: { flex: 1, fontFamily: F.body, fontSize: 17, color: C.noche, height: 54 },
  chips: { gap: 8, paddingHorizontal: S.xl, paddingVertical: 12 },
  divider: { height: 1, backgroundColor: C.line, marginBottom: S.lg },
  aiBox: { marginHorizontal: S.xl, marginBottom: S.xl, padding: S.lg, gap: 10, borderRadius: R.lg, backgroundColor: '#FBEBD3', borderWidth: 1, borderColor: '#F0CF9E' },
});
