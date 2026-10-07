import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { COLOMBIA_REGIONS, formatCOP, FREQUENCY_LABEL, LEGAL_ID_TYPES, subscribeSchema } from '@travesia/shared';

import { Field, Segmented, Select } from '@/components/form';
import { Button, Chip, DemoNotice, EmptyState, Header, Icon, Screen, Skeleton, T } from '@/components/ui';
import { api, ApiError, errorMessage, isDemo, request } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { haptic } from '@/lib/haptics';
import { imageSource } from '@/lib/images';
import { openLink } from '@/lib/links';
import { useAddresses, usePlans, useProducts } from '@/lib/queries';
import { C, R, S } from '@/theme';

type Acceptance = { publicKey: string; acceptanceToken: string; termsUrl: string; personalAuthToken: string; personalDataUrl: string; env: string };
type Region = (typeof COLOMBIA_REGIONS)[number];
type Grind = 'grano' | 'fina' | 'media' | 'gruesa';
const REGION_OPTIONS = COLOMBIA_REGIONS.map((r) => ({ value: r, label: r }));
const draftSchema = subscribeSchema.omit({ cardToken: true, acceptanceToken: true, personalAuthToken: true });

export default function SubscribeScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { me, signedIn } = useAuth();
  const plans = usePlans();
  const coffees = useProducts({ kind: 'coffee' });
  const addresses = useAddresses();
  const plan = plans.data?.find((p) => p.slug === slug);

  const acceptance = useQuery({
    queryKey: ['wompi', 'acceptance'],
    enabled: !isDemo(),
    queryFn: () => request<Acceptance>('/api/wompi/acceptance'),
    staleTime: 1000 * 60 * 10,
  });

  /** undefined = aún sin elegir (se usa el primer café elegible); null = sorpresa del tostador */
  const [productChoice, setProductId] = useState<string | null | undefined>(undefined);
  const productId = productChoice === undefined ? (coffees.data?.find((p) => p.subscriptionEligible)?.id ?? null) : productChoice;
  const [grind, setGrind] = useState<Grind>('grano');
  const [customer, setCustomer] = useState({ email: '', fullName: '', phone: '', legalIdType: 'CC' as 'CC' | 'CE' | 'NIT' | 'PP' | 'TI', legalId: '' });
  const [addr, setAddr] = useState({ recipient: '', phone: '', region: 'Antioquia' as Region, city: 'Medellín', line1: '', line2: '' });
  const [card, setCard] = useState({ number: '', exp: '', cvc: '', holder: '' });
  const [accept, setAccept] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState<{ chargeStatus: string } | null>(null);

  const [seededMe, setSeededMe] = useState<string | null>(null);
  if (me && seededMe !== me.id) {
    setSeededMe(me.id);
    setCustomer((c) => ({ ...c, email: c.email || me.email, fullName: c.fullName || (me.fullName ?? ''), phone: c.phone || (me.phone ?? ''), legalId: c.legalId || (me.legalId ?? '') }));
    setCard((k) => ({ ...k, holder: k.holder || (me.fullName ?? '') }));
  }
  const defaultAddr = addresses.data?.addresses.find((a) => a.isDefault) ?? addresses.data?.addresses[0];
  const [seededAddr, setSeededAddr] = useState<string | null>(null);
  if (defaultAddr && seededAddr !== defaultAddr.id) {
    setSeededAddr(defaultAddr.id);
    const d = defaultAddr;
    setAddr((a) => (a.line1 ? a : { recipient: d.recipient, phone: d.phone, region: d.region as Region, city: d.city, line1: d.line1, line2: d.line2 ?? '' }));
  }

  const subscribe = useMutation({
    mutationFn: async () => {
      const draft = { planId: plan!.id, productId, grind, address: { ...addr, line2: addr.line2 || null }, customer, channel: 'app' as const };
      const parsed = draftSchema.safeParse(draft);
      const e: Record<string, string> = {};
      if (!parsed.success) parsed.error.issues.forEach((i) => (e[i.path.join('.')] ??= i.message));
      const digits = card.number.replace(/\D/g, '');
      const [mm, yy] = card.exp.split('/').map((x) => x.trim());
      if (digits.length < 13) e.cardNumber = 'Número de tarjeta inválido';
      if (!mm || !yy || Number(mm) < 1 || Number(mm) > 12) e.cardExp = 'Usa el formato MM/AA';
      if (!/^\d{3,4}$/.test(card.cvc)) e.cardCvc = 'CVC inválido';
      if (card.holder.trim().length < 5) e.cardHolder = 'Escribe el nombre como aparece en la tarjeta';
      if (!accept) e.accept = 'Debes aceptar los términos de Wompi y el tratamiento de datos';
      setErrors(e);
      if (Object.keys(e).length) throw new Error('Revisa los campos marcados.');
      if (isDemo()) throw new Error('Modo demo: la suscripción se habilita cuando la app se conecta con cafetravesia.com.');
      if (!signedIn) throw new ApiError(401, 'Ingresa para suscribirte.');
      const acc = acceptance.data ?? (await request<Acceptance>('/api/wompi/acceptance'));
      const wompiApi = acc.env === 'production' ? 'https://production.wompi.co/v1' : 'https://sandbox.wompi.co/v1';
      // Tokenización de tarjeta directo contra Wompi con la llave pública (la tarjeta nunca pasa por nuestro servidor).
      const res = await fetch(`${wompiApi}/tokens/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${acc.publicKey}` },
        body: JSON.stringify({ number: digits, cvc: card.cvc, exp_month: mm!.padStart(2, '0'), exp_year: yy!.slice(-2), card_holder: card.holder.trim() }),
      });
      const tok = (await res.json().catch(() => null)) as { data?: { id?: string }; error?: { messages?: Record<string, string[]>; reason?: string } } | null;
      if (!res.ok || !tok?.data?.id) throw new Error(tok?.error?.reason ?? 'Wompi no pudo validar la tarjeta. Revisa los datos.');
      return api.post<{ subscriptionId: string; chargeStatus: string }>('/api/subscriptions', {
        ...parsed.data!,
        cardToken: tok.data.id,
        acceptanceToken: acc.acceptanceToken,
        personalAuthToken: acc.personalAuthToken,
      });
    },
    onSuccess: (r) => {
      haptic.success();
      setDone(r);
      void qc.invalidateQueries({ queryKey: ['me'] });
    },
    onError: () => haptic.error(),
  });

  if (plans.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.crema }}>
        <Header title="Suscripción" />
        <Skeleton style={{ height: 200, margin: S.xl }} />
      </View>
    );
  }
  if (!plan) {
    return (
      <View style={{ flex: 1, backgroundColor: C.crema }}>
        <Header title="Suscripción" />
        <EmptyState title="No encontramos ese plan" action="Ver planes" onAction={() => router.replace('/plan')} />
      </View>
    );
  }
  if (done) {
    return (
      <View style={[styles.done, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 24 }]}>
        <Animated.View entering={ZoomIn.springify()} style={styles.doneIcon}>
          <Icon name="checkmark" size={46} color={C.crema} />
        </Animated.View>
        <T v="h1" color={C.crema} center>
          ¡Bienvenido al plan {plan.name}!
        </T>
        <T v="body" color="rgba(248,243,234,0.8)" center>
          {done.chargeStatus === 'APPROVED' ? 'Tu primer cobro fue aprobado. Preparamos tu primera entrega.' : 'Estamos confirmando el primer cobro con tu banco. Te avisaremos por correo.'}
        </T>
        <View style={{ flex: 1 }} />
        <Button title="Ver mi plan" variant="ambar" full onPress={() => router.replace('/plan')} />
      </View>
    );
  }

  const setC = (k: keyof typeof customer) => (v: string) => setCustomer((c) => ({ ...c, [k]: v }));
  const setA = (k: keyof typeof addr) => (v: string) => setAddr((a) => ({ ...a, [k]: v }));

  return (
    <View style={{ flex: 1, backgroundColor: C.crema }}>
      <Header title="Configura tu suscripción" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Screen contentStyle={{ gap: S.lg, paddingTop: S.sm }}>
          <DemoNotice compact />
          <View style={styles.summary}>
            <Image source={imageSource(plan.imageUrl)} style={styles.arch} contentFit="cover" accessible={false} />
            <View style={{ flex: 1, gap: 4 }}>
              <T v="h2" color={C.crema}>
                {plan.name}
              </T>
              <T v="italic" color={C.ambarClaro}>
                {plan.tagline}
              </T>
              <T v="price" color={C.crema} style={{ marginTop: 6 }}>
                {formatCOP(plan.priceCop)}
              </T>
              <T v="small" color="rgba(248,243,234,0.7)">
                {FREQUENCY_LABEL(plan.frequencyWeeks)} · {plan.bagsPerDelivery} × {plan.bagWeightG} g · envío gratis
              </T>
            </View>
          </View>
          {!signedIn && !isDemo() ? (
            <Button title="Ingresa para suscribirte" variant="outline" icon="person-circle-outline" onPress={() => router.push('/ingresar')} />
          ) : null}

          <T v="h3">Tu café</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {(coffees.data ?? []).filter((p) => p.subscriptionEligible).map((p) => (
              <Chip key={p.id} label={p.name} active={productId === p.id} onPress={() => setProductId(p.id)} />
            ))}
            <Chip label="Sorpréndeme" active={productId === null} onPress={() => setProductId(null)} />
          </View>
          <Segmented<Grind> options={[{ value: 'grano', label: 'En grano' }, { value: 'fina', label: 'Fina' }, { value: 'media', label: 'Media' }, { value: 'gruesa', label: 'Gruesa' }]} value={grind} onChange={setGrind} />

          <T v="h3">Tus datos</T>
          <Field label="Correo" value={customer.email} onChangeText={setC('email')} keyboardType="email-address" autoCapitalize="none" error={errors['customer.email']} />
          <Field label="Nombre completo" value={customer.fullName} onChangeText={setC('fullName')} error={errors['customer.fullName']} />
          <Field label="Celular" value={customer.phone} onChangeText={setC('phone')} keyboardType="phone-pad" error={errors['customer.phone']} />
          <Select label="Tipo de documento" value={customer.legalIdType} options={LEGAL_ID_TYPES} onChange={(v) => setCustomer((c) => ({ ...c, legalIdType: v }))} />
          <Field label="Documento" value={customer.legalId} onChangeText={setC('legalId')} keyboardType="number-pad" error={errors['customer.legalId']} />

          <T v="h3">Dirección de entrega</T>
          <Field label="Quién recibe" value={addr.recipient} onChangeText={setA('recipient')} error={errors['address.recipient']} />
          <Field label="Teléfono" value={addr.phone} onChangeText={setA('phone')} keyboardType="phone-pad" error={errors['address.phone']} />
          <Select label="Departamento" value={addr.region} options={REGION_OPTIONS} onChange={(v) => setAddr((a) => ({ ...a, region: v }))} error={errors['address.region']} />
          <Field label="Ciudad" value={addr.city} onChangeText={setA('city')} error={errors['address.city']} />
          <Field label="Dirección" value={addr.line1} onChangeText={setA('line1')} error={errors['address.line1']} />
          <Field label="Apto, torre, barrio (opcional)" value={addr.line2} onChangeText={setA('line2')} />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="lock-closed" size={16} color={C.montana} />
            <T v="h3">Tarjeta</T>
          </View>
          <T v="small" color={C.muted}>
            Tokenizamos tu tarjeta de forma segura con Wompi (Bancolombia). Café Travesía nunca guarda el número completo.
          </T>
          <Field label="Número de tarjeta" value={card.number} onChangeText={(t) => setCard((k) => ({ ...k, number: t.replace(/[^\d ]/g, '').slice(0, 23) }))} keyboardType="number-pad" autoComplete="cc-number" placeholder="4242 4242 4242 4242" error={errors.cardNumber} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Field
                label="Vence (MM/AA)"
                value={card.exp}
                onChangeText={(t) => {
                  const d = t.replace(/\D/g, '').slice(0, 4);
                  setCard((k) => ({ ...k, exp: d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d }));
                }}
                keyboardType="number-pad"
                autoComplete="cc-exp"
                placeholder="08/29"
                error={errors.cardExp}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="CVC" value={card.cvc} onChangeText={(t) => setCard((k) => ({ ...k, cvc: t.replace(/\D/g, '').slice(0, 4) }))} keyboardType="number-pad" secureTextEntry autoComplete="cc-csc" error={errors.cardCvc} />
            </View>
          </View>
          <Field label="Nombre en la tarjeta" value={card.holder} onChangeText={(t) => setCard((k) => ({ ...k, holder: t }))} autoCapitalize="characters" error={errors.cardHolder} />

          <Pressable onPress={() => setAccept((a) => !a)} accessibilityRole="checkbox" accessibilityState={{ checked: accept }} style={{ flexDirection: 'row', gap: 10 }}>
            <View style={[styles.check, accept && { backgroundColor: C.noche, borderColor: C.noche }]}>{accept ? <Icon name="checkmark" size={14} color={C.crema} /> : null}</View>
            <T v="small" style={{ flex: 1 }}>
              Acepto el{' '}
              <T v="small" style={{ textDecorationLine: 'underline' }} onPress={() => void openLink(acceptance.data?.termsUrl ?? 'https://wompi.com/es/co/terminos-y-condiciones')}>
                reglamento de Wompi
              </T>
              , la{' '}
              <T v="small" style={{ textDecorationLine: 'underline' }} onPress={() => void openLink(acceptance.data?.personalDataUrl ?? '/privacidad')}>
                autorización de datos personales
              </T>{' '}
              y el cobro recurrente {FREQUENCY_LABEL(plan.frequencyWeeks).toLowerCase()} de {formatCOP(plan.priceCop)} hasta que cancele.
            </T>
          </Pressable>
          {errors.accept ? (
            <T v="small" color={C.cereza}>
              {errors.accept}
            </T>
          ) : null}
          {subscribe.isError ? (
            <Animated.View entering={FadeIn} style={styles.notice}>
              <T v="small" color={C.tostado}>
                {errorMessage(subscribe.error)}
              </T>
            </Animated.View>
          ) : null}
        </Screen>
      </KeyboardAvoidingView>
      <View style={[styles.foot, { paddingBottom: insets.bottom + 12 }]}>
        <Button title={`Suscribirme · ${formatCOP(plan.priceCop)}`} variant="ambar" icon="lock-closed" full loading={subscribe.isPending} onPress={() => subscribe.mutate()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', gap: 14, padding: S.lg, borderRadius: R.xl, backgroundColor: C.noche },
  arch: { width: 90, height: 116, borderTopLeftRadius: 45, borderTopRightRadius: 45, borderRadius: 10 },
  check: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: C.muted, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  notice: { padding: 12, borderRadius: R.md, backgroundColor: '#FBEBD3', borderWidth: 1, borderColor: '#F0CF9E' },
  foot: { paddingHorizontal: S.xl, paddingTop: 12, backgroundColor: C.hueso, borderTopWidth: 1, borderTopColor: C.line },
  done: { flex: 1, backgroundColor: C.noche, alignItems: 'center', paddingHorizontal: S.xl, gap: S.lg },
  doneIcon: { width: 96, height: 96, borderRadius: R.xl, backgroundColor: C.montana, alignItems: 'center', justifyContent: 'center' },
});
