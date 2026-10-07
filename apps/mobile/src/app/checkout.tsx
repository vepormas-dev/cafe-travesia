import { useMemo, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Switch, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useMutation } from '@tanstack/react-query';
import { checkoutSchema, COLOMBIA_REGIONS, formatCOP, LEGAL_ID_TYPES, LOYALTY, type CheckoutResultDTO } from '@travesia/shared';

import { Field, Select } from '@/components/form';
import { TotalsView } from '@/components/totals';
import { Button, Card, Chip, DemoNotice, EmptyState, Header, Icon, Screen, Skeleton, T } from '@/components/ui';
import { api, errorMessage, isDemo } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cart } from '@/lib/cart';
import { useCartView } from '@/lib/cart-lines';
import { useQuote } from '@/lib/checkout';
import { haptic } from '@/lib/haptics';
import { openWeb, paramsFromUrl } from '@/lib/links';
import { useAddresses } from '@/lib/queries';
import { C, R, S } from '@/theme';

const REGION_OPTIONS = COLOMBIA_REGIONS.map((r) => ({ value: r, label: r }));
type Region = (typeof COLOMBIA_REGIONS)[number];
type Errors = Record<string, string>;

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const { me, signedIn } = useAuth();
  const { items, lines } = useCartView();
  const addresses = useAddresses();
  const requiresShipping = lines.some((l) => l.requiresShipping);

  const [customer, setCustomer] = useState({ email: '', fullName: '', phone: '', legalIdType: 'CC' as 'CC' | 'CE' | 'NIT' | 'PP' | 'TI', legalId: '' });
  const [addr, setAddr] = useState({ recipient: '', phone: '', region: 'Antioquia' as Region, city: 'Medellín', line1: '', line2: '', notes: '' });
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState<string | undefined>();
  const [usePoints, setUsePoints] = useState(false);
  const [accept, setAccept] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [notice, setNotice] = useState<string | null>(null);

  // Prefill con el perfil y la dirección predeterminada (ajuste de estado durante el render).
  const [seededMe, setSeededMe] = useState<string | null>(null);
  if (me && seededMe !== me.id) {
    setSeededMe(me.id);
    setCustomer((c) => ({
      ...c,
      email: c.email || me.email,
      fullName: c.fullName || (me.fullName ?? ''),
      phone: c.phone || (me.phone ?? ''),
      legalIdType: (me.legalIdType as typeof c.legalIdType) || c.legalIdType,
      legalId: c.legalId || (me.legalId ?? ''),
    }));
  }
  const defaultAddr = addresses.data?.addresses.find((a) => a.isDefault) ?? addresses.data?.addresses[0];
  const [seededAddr, setSeededAddr] = useState<string | null>(null);
  if (defaultAddr && seededAddr !== defaultAddr.id) {
    setSeededAddr(defaultAddr.id);
    const d = defaultAddr;
    setAddr((a) => (a.line1 ? a : { recipient: d.recipient, phone: d.phone, region: d.region as Region, city: d.city, line1: d.line1, line2: d.line2 ?? '', notes: d.notes ?? '' }));
  }

  const quoteInput = useMemo(
    () => ({ items, region: requiresShipping ? addr.region : undefined, city: requiresShipping ? addr.city : undefined, couponCode: coupon, email: customer.email || undefined, redeemPoints: usePoints ? (me?.loyaltyPoints ?? 0) : 0 }),
    [items, requiresShipping, addr.region, addr.city, coupon, customer.email, usePoints, me?.loyaltyPoints],
  );
  const quote = useQuote(quoteInput);
  const available = quote.data?.availablePoints ?? me?.loyaltyPoints ?? 0;

  const pay = useMutation({
    mutationFn: async () => {
      setNotice(null);
      const body = {
        items,
        customer,
        address: requiresShipping ? { ...addr, line2: addr.line2 || null, notes: addr.notes || null } : null,
        couponCode: coupon ?? null,
        redeemPoints: usePoints ? available : 0,
        channel: 'app' as const,
        acceptTerms: accept,
      };
      const parsed = checkoutSchema.safeParse(body);
      if (!parsed.success) {
        const e: Errors = {};
        parsed.error.issues.forEach((i) => {
          const k = i.path.join('.');
          if (!e[k]) e[k] = i.message;
        });
        setErrors(e);
        throw new Error('Revisa los campos marcados.');
      }
      setErrors({});
      if (isDemo()) throw new Error('Modo demo: el pago se habilita cuando la app se conecta con cafetravesia.com.');
      return api.post<CheckoutResultDTO>('/api/checkout', parsed.data);
    },
    onSuccess: async (r) => {
      if (r.paid || !r.wompi) {
        haptic.success();
        cart.clear();
        router.replace({ pathname: '/pago/resultado', params: { pedido: r.orderId } });
        return;
      }
      const res = await WebBrowser.openAuthSessionAsync(r.wompi.checkoutUrl, 'cafetravesia://pago');
      const p = res.type === 'success' ? paramsFromUrl(res.url) : {};
      router.replace({ pathname: '/pago/resultado', params: { pedido: p.pedido ?? r.orderId, ...(p.id ? { id: p.id } : {}) } });
    },
    onError: (e) => {
      haptic.error();
      setNotice(errorMessage(e));
    },
  });

  if (!items.length) {
    return (
      <View style={{ flex: 1, backgroundColor: C.crema }}>
        <Header title="Pago" />
        <EmptyState icon="bag-outline" title="Tu carrito está vacío" action="Ir a la tienda" onAction={() => router.replace('/tienda')} />
      </View>
    );
  }

  const setC = (k: keyof typeof customer) => (v: string) => setCustomer((c) => ({ ...c, [k]: v }));
  const setA = (k: keyof typeof addr) => (v: string) => setAddr((a) => ({ ...a, [k]: v }));

  return (
    <View style={{ flex: 1, backgroundColor: C.crema }}>
      <Header title="Finalizar compra" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Screen contentStyle={{ gap: S.lg, paddingTop: S.sm }}>
          <DemoNotice compact />
          {!signedIn ? (
            <Pressable onPress={() => router.push('/ingresar')} accessibilityRole="link" style={styles.login}>
              <Icon name="person-circle-outline" size={20} color={C.noche} />
              <T v="small" style={{ flex: 1 }}>
                ¿Ya tienes cuenta? <T v="small" style={{ textDecorationLine: 'underline' }}>Ingresa</T> para usar tus puntos y direcciones.
              </T>
            </Pressable>
          ) : null}

          <Section title="Tus datos" icon="person-outline">
            <Field label="Correo" value={customer.email} onChangeText={setC('email')} keyboardType="email-address" autoCapitalize="none" autoComplete="email" error={errors['customer.email']} />
            <Field label="Nombre completo" value={customer.fullName} onChangeText={setC('fullName')} autoComplete="name" error={errors['customer.fullName']} />
            <Field label="Celular" value={customer.phone} onChangeText={setC('phone')} keyboardType="phone-pad" autoComplete="tel" error={errors['customer.phone']} />
            <Select label="Tipo de documento" value={customer.legalIdType} options={LEGAL_ID_TYPES} onChange={(v) => setCustomer((c) => ({ ...c, legalIdType: v }))} />
            <Field label="Número de documento" value={customer.legalId} onChangeText={setC('legalId')} keyboardType="number-pad" error={errors['customer.legalId']} />
          </Section>

          {requiresShipping ? (
            <Section title="Dirección de envío" icon="location-outline">
              {addresses.data?.addresses.length ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {addresses.data.addresses.map((a) => (
                    <Chip key={a.id} label={a.label ?? a.city} active={a.line1 === addr.line1} onPress={() => setAddr({ recipient: a.recipient, phone: a.phone, region: a.region as Region, city: a.city, line1: a.line1, line2: a.line2 ?? '', notes: a.notes ?? '' })} />
                  ))}
                </View>
              ) : null}
              <Field label="Quién recibe" value={addr.recipient} onChangeText={setA('recipient')} error={errors['address.recipient']} />
              <Field label="Teléfono de contacto" value={addr.phone} onChangeText={setA('phone')} keyboardType="phone-pad" error={errors['address.phone']} />
              <Select label="Departamento" value={addr.region} options={REGION_OPTIONS} onChange={(v) => setAddr((a) => ({ ...a, region: v }))} error={errors['address.region']} />
              <Field label="Ciudad o municipio" value={addr.city} onChangeText={setA('city')} error={errors['address.city']} />
              <Field label="Dirección" value={addr.line1} onChangeText={setA('line1')} placeholder="Calle 10 # 40-20" autoComplete="street-address" error={errors['address.line1']} />
              <Field label="Apto, torre, barrio (opcional)" value={addr.line2} onChangeText={setA('line2')} />
              <Field label="Indicaciones (opcional)" value={addr.notes} onChangeText={setA('notes')} />
            </Section>
          ) : null}

          <Section title="Cupón y puntos" icon="pricetag-outline">
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
              <View style={{ flex: 1 }}>
                <Field label="Cupón" value={couponInput} onChangeText={(t) => setCouponInput(t.toUpperCase())} autoCapitalize="characters" placeholder="BIENVENIDA10" />
              </View>
              <Button title={coupon ? 'Quitar' : 'Aplicar'} variant="outline" onPress={() => (coupon ? (setCoupon(undefined), setCouponInput('')) : setCoupon(couponInput.trim() || undefined))} />
            </View>
            {quote.data?.coupon ? (
              <T v="small" color={quote.data.coupon.ok ? C.montana : C.cereza}>
                {quote.data.coupon.ok ? `✓ ${quote.data.coupon.description}` : quote.data.coupon.error}
              </T>
            ) : null}
            {signedIn || isDemo() ? (
              <View style={styles.points}>
                <View style={{ flex: 1 }}>
                  <T v="bodyStrong">Usar mis Puntos Travesía</T>
                  <T v="small" color={C.muted}>
                    Tienes {available} puntos ({formatCOP(available * LOYALTY.valueCop)}). Máximo {LOYALTY.maxRedeemPct}% del pedido.
                  </T>
                </View>
                <Switch value={usePoints} onValueChange={(v) => { haptic.tap(); setUsePoints(v); }} disabled={!available} trackColor={{ true: C.ambar, false: C.arena }} thumbColor={C.hueso} accessibilityLabel="Usar mis puntos" />
              </View>
            ) : null}
          </Section>

          <Card>
            {quote.data ? <TotalsView totals={quote.data.totals} /> : <Skeleton style={{ height: 120 }} />}
          </Card>

          <Pressable onPress={() => { haptic.tap(); setAccept((a) => !a); }} accessibilityRole="checkbox" accessibilityState={{ checked: accept }} style={styles.accept}>
            <View style={[styles.check, accept && { backgroundColor: C.noche, borderColor: C.noche }]}>{accept ? <Icon name="checkmark" size={14} color={C.crema} /> : null}</View>
            <T v="small" style={{ flex: 1 }}>
              Acepto los{' '}
              <T v="small" style={{ textDecorationLine: 'underline' }} onPress={() => void openWeb('/terminos')}>
                términos y condiciones
              </T>{' '}
              y la{' '}
              <T v="small" style={{ textDecorationLine: 'underline' }} onPress={() => void openWeb('/privacidad')}>
                política de datos
              </T>
              .
            </T>
          </Pressable>
          {errors.acceptTerms ? (
            <T v="small" color={C.cereza}>
              {errors.acceptTerms}
            </T>
          ) : null}
          {notice ? (
            <Animated.View entering={FadeIn} style={styles.notice} accessibilityLiveRegion="assertive">
              <T v="small" color={C.tostado}>
                {notice}
              </T>
            </Animated.View>
          ) : null}
        </Screen>
      </KeyboardAvoidingView>
      <View style={[styles.foot, { paddingBottom: insets.bottom + 12 }]}>
        <View style={{ flex: 1 }}>
          <T v="small" color={C.muted}>
            Total a pagar
          </T>
          <T v="price">{quote.data ? formatCOP(quote.data.totals.totalCop) : '—'}</T>
        </View>
        <Button title="Pagar con Wompi" icon="lock-closed" variant="ambar" loading={pay.isPending} onPress={() => pay.mutate()} style={{ flex: 1.4 }} />
      </View>
    </View>
  );
}

function Section({ title, icon, children }: { title: string; icon: 'person-outline' | 'location-outline' | 'pricetag-outline'; children: ReactNode }) {
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: S.sm }}>
        <Icon name={icon} size={18} color={C.ambarProfundo} />
        <T v="h3" accessibilityRole="header">
          {title}
        </T>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  login: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: R.md, backgroundColor: C.arena },
  points: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: R.md, backgroundColor: C.hueso, borderWidth: 1, borderColor: C.line },
  accept: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  check: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: C.muted, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  notice: { padding: 12, borderRadius: R.md, backgroundColor: '#FBEBD3', borderWidth: 1, borderColor: '#F0CF9E' },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: S.xl, paddingTop: 12, backgroundColor: C.hueso, borderTopWidth: 1, borderTopColor: C.line },
});
