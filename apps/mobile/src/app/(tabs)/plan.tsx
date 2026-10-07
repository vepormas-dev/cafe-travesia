import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { formatCOP, formatDate, FREQUENCY_LABEL, GRIND_LABEL, ORDER_STATUS_LABEL, SUBSCRIPTION_STATUS_LABEL, type PlanDTO, type SubscriptionDTO } from '@travesia/shared';

import { AndeanPattern } from '@/components/brand';
import { Field, Segmented } from '@/components/form';
import { Sheet } from '@/components/sheet';
import { Badge, Button, Chip, DemoNotice, EmptyState, Icon, PressableScale, Screen, SectionHeading, Skeleton, T } from '@/components/ui';
import { api, errorMessage, isDemo } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { haptic } from '@/lib/haptics';
import { imageSource, PHOTOS } from '@/lib/images';
import { useOrders, usePlans, useProducts, useSubscriptions } from '@/lib/queries';
import { C, R, S, shadow } from '@/theme';

type Action = { action: 'pause'; until?: string } | { action: 'resume' } | { action: 'skip' } | { action: 'cancel'; reason?: string } | { action: 'change_coffee'; productId: string; grind?: 'grano' | 'fina' | 'media' | 'gruesa' };

export default function PlanTab() {
  const insets = useSafeAreaInsets();
  const { canUseAccount } = useAuth();
  const subs = useSubscriptions();
  const sub = subs.data?.subscriptions.find((s) => s.status !== 'cancelled');

  return (
    <View style={{ flex: 1, backgroundColor: C.crema }}>
      <Screen tabBar contentStyle={{ paddingTop: insets.top + 10 }}>
        <T v="eyebrow" color={C.ambarProfundo}>
          Suscripción Travesía
        </T>
        <T v="h1" accessibilityRole="header" style={{ marginBottom: S.lg }}>
          {sub ? 'Mi plan' : 'Café fresco, cada mes'}
        </T>
        <DemoNotice compact />
        {subs.isLoading && canUseAccount ? <Skeleton style={{ height: 200, marginTop: 16 }} /> : sub ? <ActivePlan sub={sub} /> : <Plans />}
        <AssistantCard />
      </Screen>
    </View>
  );
}

function ActivePlan({ sub }: { sub: SubscriptionDTO }) {
  const qc = useQueryClient();
  const orders = useOrders();
  const coffees = useProducts({ kind: 'coffee' });
  const [sheet, setSheet] = useState<null | 'cancel' | 'coffee' | 'pause' | 'skip'>(null);
  const [reason, setReason] = useState('');
  const [coffee, setCoffee] = useState(sub.product?.id ?? '');
  const [grind, setGrind] = useState<'grano' | 'fina' | 'media' | 'gruesa'>((sub.grind as 'grano') ?? 'grano');
  const [msg, setMsg] = useState<string | null>(null);

  const patch = useMutation({
    mutationFn: async (body: Action) => {
      if (isDemo()) throw new Error('Modo demo: los cambios de suscripción se habilitan al conectar con cafetravesia.com.');
      return api.patch<{ subscription: SubscriptionDTO }>(`/api/subscriptions/${sub.id}`, body);
    },
    onSuccess: (_r, body) => {
      haptic.success();
      setSheet(null);
      setMsg(body.action === 'pause' ? 'Tu plan quedó en pausa.' : body.action === 'resume' ? '¡Tu plan está activo de nuevo!' : body.action === 'skip' ? 'Saltamos tu próxima entrega.' : body.action === 'cancel' ? 'Cancelamos tu suscripción. ¡Gracias por la travesía!' : 'Actualizamos tu café.');
      void qc.invalidateQueries({ queryKey: ['me'] });
    },
    onError: (e) => {
      haptic.warning();
      setSheet(null);
      setMsg(errorMessage(e));
    },
  });

  const paused = sub.status === 'paused';
  const history = (orders.data?.orders ?? []).filter((o) => o.kind === 'subscription' || o.items.some((i) => i.itemKind === 'plan'));
  const [fourWeeks] = useState(() => new Date(Date.now() + 28 * 86_400_000).toISOString().slice(0, 10));

  return (
    <Animated.View entering={FadeInDown.duration(450)} style={{ gap: S.lg, marginTop: S.lg }}>
      <View style={styles.planCard}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ gap: 4, flex: 1 }}>
            <T v="eyebrow" color={C.muted}>
              Plan activo
            </T>
            <T v="h1">{sub.plan.name}</T>
          </View>
          <View style={styles.premium}>
            <T v="label" color={C.montana}>
              {SUBSCRIPTION_STATUS_LABEL[sub.status] ?? sub.status}
            </T>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={styles.cal}>
            <Icon name="calendar-outline" size={22} color={C.cereza} />
          </View>
          <View>
            <T v="small" color={C.muted}>
              {paused ? 'En pausa hasta' : 'Próxima entrega'}
            </T>
            <T v="bodyStrong" style={{ fontSize: 17 }}>
              {formatDate(paused ? sub.pausedUntil : sub.nextBillingAt)}
            </T>
          </View>
        </View>
        <View style={{ gap: 6, marginTop: 4 }}>
          <Info icon="cafe-outline" text={`${sub.product?.name ?? 'Selección del tostador'} · ${GRIND_LABEL[sub.grind] ?? sub.grind}`} />
          <Info icon="repeat-outline" text={`${FREQUENCY_LABEL(sub.plan.frequencyWeeks)} · ${sub.plan.bagsPerDelivery} × ${sub.plan.bagWeightG} g · ${formatCOP(sub.priceCop)}`} />
          {sub.cardLast4 ? <Info icon="card-outline" text={`${sub.cardBrand ?? 'Tarjeta'} •••• ${sub.cardLast4}`} /> : null}
          {sub.address ? <Info icon="location-outline" text={`${sub.address.line1}, ${sub.address.city}`} /> : null}
          {sub.plan.includesAcademy ? <Info icon="school-outline" text="Incluye todos los cursos de la Academia" /> : null}
        </View>
      </View>

      {msg ? (
        <View style={styles.msg} accessibilityLiveRegion="polite">
          <T v="small" color={C.tostado}>
            {msg}
          </T>
        </View>
      ) : null}

      <View style={styles.actions}>
        {paused ? (
          <ActionBtn icon="play-outline" label="Reanudar" onPress={() => patch.mutate({ action: 'resume' })} />
        ) : (
          <ActionBtn icon="pause-outline" label="Pausar" onPress={() => setSheet('pause')} />
        )}
        <ActionBtn icon="play-skip-forward-outline" label="Saltar entrega" onPress={() => setSheet('skip')} />
        <ActionBtn icon="swap-horizontal-outline" label="Cambiar café" onPress={() => setSheet('coffee')} />
        <ActionBtn icon="close-circle-outline" label="Cancelar" danger onPress={() => setSheet('cancel')} />
      </View>

      <SectionHeading title="Historial de entregas" />
      {history.length ? (
        history.map((o) => (
          <PressableScale key={o.id} onPress={() => router.push(`/pedidos/${o.id}`)} accessibilityLabel={`Entrega ${o.number}`} style={styles.hist}>
            <Icon name="cube-outline" size={20} />
            <View style={{ flex: 1 }}>
              <T v="bodyStrong">{formatDate(o.createdAt)}</T>
              <T v="small" color={C.muted}>
                {o.number} · {ORDER_STATUS_LABEL[o.status] ?? o.status}
              </T>
            </View>
            <T v="label">{formatCOP(o.totalCop)}</T>
          </PressableScale>
        ))
      ) : (
        <T v="small" color={C.muted}>
          Aquí verás cada entrega de tu plan. {sub.startedAt ? `Suscrito desde ${formatDate(sub.startedAt)}.` : ''}
        </T>
      )}

      <Sheet visible={sheet === 'pause'} onClose={() => setSheet(null)} title="Pausar mi plan">
        <T v="body" color={C.muted}>
          Pausamos tus entregas y cobros por 4 semanas (hasta el {formatDate(fourWeeks)}). Puedes reanudar cuando quieras.
        </T>
        <Button title="Pausar 4 semanas" loading={patch.isPending} onPress={() => patch.mutate({ action: 'pause', until: fourWeeks })} />
      </Sheet>
      <Sheet visible={sheet === 'skip'} onClose={() => setSheet(null)} title="Saltar próxima entrega">
        <T v="body" color={C.muted}>
          No cobraremos ni enviaremos la entrega del {formatDate(sub.nextBillingAt)}. La siguiente llega en el ciclo normal.
        </T>
        <Button title="Saltar esta entrega" loading={patch.isPending} onPress={() => patch.mutate({ action: 'skip' })} />
      </Sheet>
      <Sheet visible={sheet === 'coffee'} onClose={() => setSheet(null)} title="Cambiar mi café">
        {(coffees.data ?? []).filter((p) => p.subscriptionEligible).map((p) => (
          <Chip key={p.id} label={`${p.name}${p.tastingNotes.length ? ` · ${p.tastingNotes.slice(0, 2).join(', ')}` : ''}`} active={coffee === p.id} onPress={() => setCoffee(p.id)} />
        ))}
        <T v="label" style={{ marginTop: 6 }}>
          Molienda
        </T>
        <Segmented options={(['grano', 'fina', 'media', 'gruesa'] as const).map((g) => ({ value: g, label: g === 'grano' ? 'En grano' : g[0]!.toUpperCase() + g.slice(1) }))} value={grind} onChange={setGrind} />
        <Button title="Guardar cambio" disabled={!coffee} loading={patch.isPending} onPress={() => patch.mutate({ action: 'change_coffee', productId: coffee, grind })} />
      </Sheet>
      <Sheet visible={sheet === 'cancel'} onClose={() => setSheet(null)} title="¿Cancelar tu suscripción?">
        <T v="body" color={C.muted}>
          Si es por un tema de cantidad o frecuencia, también puedes pausar o cambiar de plan. ¿Nos cuentas por qué te vas?
        </T>
        <Field label="Motivo (opcional)" value={reason} onChangeText={setReason} multiline style={{ minHeight: 80, textAlignVertical: 'top', paddingTop: 12 }} />
        <Button title="Mejor pausar" variant="outline" onPress={() => setSheet('pause')} />
        <Button title="Cancelar suscripción" variant="danger" loading={patch.isPending} onPress={() => patch.mutate({ action: 'cancel', reason: reason.trim() || undefined })} />
      </Sheet>
    </Animated.View>
  );
}

function Plans() {
  const [audience, setAudience] = useState<'personal' | 'empresa'>('personal');
  const plans = usePlans(audience);
  return (
    <View style={{ gap: S.lg, marginTop: S.lg }}>
      <T v="body" color={C.muted}>
        Recibe café recién tostado de Caicedo en tu puerta. Envío gratis, pausa o cancela cuando quieras.
      </T>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Chip label="Para mí" active={audience === 'personal'} onPress={() => setAudience('personal')} />
        <Chip label="Para empresas" active={audience === 'empresa'} onPress={() => setAudience('empresa')} />
      </View>
      {plans.isLoading ? <Skeleton style={{ height: 260 }} /> : null}
      {plans.data?.length === 0 ? <EmptyState title="Pronto tendremos planes aquí" /> : null}
      {(plans.data ?? []).map((p, i) => (
        <PlanCard key={p.id} plan={p} index={i} />
      ))}
    </View>
  );
}

function PlanCard({ plan, index }: { plan: PlanDTO; index: number }) {
  const hi = plan.isHighlighted;
  const fg = hi ? C.crema : C.noche;
  return (
    <Animated.View entering={FadeInDown.delay(index * 90)}>
      <PressableScale onPress={() => router.push(`/suscribir/${plan.slug}`)} accessibilityLabel={`Plan ${plan.name}, ${formatCOP(plan.priceCop)} ${FREQUENCY_LABEL(plan.frequencyWeeks).toLowerCase()}`} style={[styles.plan, hi && { backgroundColor: C.noche, borderColor: C.noche }]}>
        <View style={{ flexDirection: 'row', gap: 14 }}>
          <Image source={imageSource(plan.imageUrl)} style={styles.planArch} contentFit="cover" accessible={false} />
          <View style={{ flex: 1, gap: 4 }}>
            {hi ? <Badge label="Recomendado" bg={C.ambar} fg={C.noche} /> : null}
            <T v="h2" color={fg}>
              {plan.name}
            </T>
            <T v="italic" color={hi ? C.ambarClaro : C.muted}>
              {plan.tagline}
            </T>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
              <T v="price" color={fg}>
                {formatCOP(plan.priceCop)}
              </T>
              <T v="small" color={hi ? 'rgba(248,243,234,0.7)' : C.muted}>
                / {FREQUENCY_LABEL(plan.frequencyWeeks).toLowerCase()}
              </T>
            </View>
          </View>
        </View>
        <View style={{ gap: 6, marginTop: 14 }}>
          {plan.benefits.map((b) => (
            <View key={b} style={{ flexDirection: 'row', gap: 8 }}>
              <Icon name="checkmark" size={16} color={hi ? C.ambar : C.montana} />
              <T v="small" color={fg} style={{ flex: 1 }}>
                {b}
              </T>
            </View>
          ))}
        </View>
        <Button title="Suscribirme" variant={hi ? 'ambar' : 'primary'} style={{ marginTop: 16 }} onPress={() => router.push(`/suscribir/${plan.slug}`)} />
      </PressableScale>
    </Animated.View>
  );
}

function AssistantCard() {
  return (
    <>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: S.xxl + 4, marginBottom: S.lg }}>
        <T v="h2">Asistente Travesía</T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.montana }} />
          <T v="label" color={C.montana}>
            En línea
          </T>
        </View>
      </View>
      <PressableScale onPress={() => router.push('/chat')} accessibilityLabel="Abrir el asistente Travesía" style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
          <Image source={PHOTOS['barra-travesia']} style={{ width: 34, height: 34, borderRadius: 17 }} contentFit="cover" accessible={false} />
          <View style={styles.bubble}>
            <T v="body">¡Hola! Soy el asistente de Café Travesía. ¿Te ayudo a elegir tu café, gestionar tu plan o rastrear un pedido? ☕</T>
          </View>
        </View>
        <AndeanPattern width={140} height={10} style={{ alignSelf: 'center', marginTop: 6 }} />
        <Button title="Escribir al asistente" variant="outline" icon="chatbubbles-outline" onPress={() => router.push('/chat')} />
      </PressableScale>
    </>
  );
}

function ActionBtn({ icon, label, onPress, danger }: { icon: 'pause-outline' | 'play-outline' | 'play-skip-forward-outline' | 'swap-horizontal-outline' | 'close-circle-outline'; label: string; onPress: () => void; danger?: boolean }) {
  return (
    <PressableScale onPress={() => { haptic.tap(); onPress(); }} accessibilityLabel={label} style={styles.action}>
      <Icon name={icon} size={22} color={danger ? C.cereza : C.noche} />
      <T v="label" color={danger ? C.cereza : C.noche} center>
        {label}
      </T>
    </PressableScale>
  );
}

function Info({ icon, text }: { icon: 'cafe-outline' | 'repeat-outline' | 'card-outline' | 'location-outline' | 'school-outline'; text: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
      <Icon name={icon} size={16} color={C.muted} />
      <T v="small" color={C.muted} style={{ flex: 1 }}>
        {text}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  planCard: { padding: S.xl, borderRadius: R.lg, backgroundColor: C.hueso, borderWidth: 1, borderColor: C.line, gap: 12, overflow: 'hidden', ...shadow, shadowOpacity: 0.06 },
  premium: { backgroundColor: '#E4E9DA', borderColor: '#C5CFB4', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  divider: { height: 1, backgroundColor: C.line, marginVertical: 4 },
  cal: { width: 50, height: 50, borderRadius: 14, backgroundColor: '#F9DCD4', alignItems: 'center', justifyContent: 'center' },
  msg: { padding: 12, borderRadius: R.md, backgroundColor: '#FBEBD3', borderWidth: 1, borderColor: '#F0CF9E' },
  actions: { flexDirection: 'row', gap: 8 },
  action: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 14, paddingHorizontal: 4, borderRadius: R.md, backgroundColor: C.hueso, borderWidth: 1, borderColor: C.line },
  hist: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: R.md, backgroundColor: C.hueso, borderWidth: 1, borderColor: C.line, marginBottom: 8 },
  plan: { padding: S.xl, borderRadius: R.xl, backgroundColor: C.hueso, borderWidth: 1, borderColor: C.line, ...shadow, shadowOpacity: 0.06 },
  planArch: { width: 84, height: 108, borderTopLeftRadius: 42, borderTopRightRadius: 42, borderRadius: 10 },
  bubble: { flex: 1, padding: 14, borderRadius: 18, borderBottomLeftRadius: 4, backgroundColor: '#ECE7DD' },
});
