import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addressSchema, COLOMBIA_REGIONS } from '@travesia/shared';

import { AccountGate } from '@/components/account-gate';
import { Field, Select } from '@/components/form';
import { Sheet } from '@/components/sheet';
import { Badge, Button, DemoNotice, EmptyState, Header, IconButton, Screen, Skeleton, T } from '@/components/ui';
import { api, errorMessage, isDemo } from '@/lib/api';
import { haptic } from '@/lib/haptics';
import { useAddresses, type Address } from '@/lib/queries';
import { C, R, S } from '@/theme';

type Region = (typeof COLOMBIA_REGIONS)[number];
const REGION_OPTIONS = COLOMBIA_REGIONS.map((r) => ({ value: r, label: r }));
const empty = { label: '', recipient: '', phone: '', region: 'Antioquia' as Region, city: '', line1: '', line2: '', notes: '', isDefault: false };

export default function Direcciones() {
  return (
    <AccountGate title="Direcciones">
      <Content />
    </AccountGate>
  );
}

function Content() {
  const qc = useQueryClient();
  const q = useAddresses();
  const [editing, setEditing] = useState<{ id?: string; v: typeof empty } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: async () => {
      const v = editing!.v;
      const parsed = addressSchema.safeParse({ ...v, line2: v.line2 || null, notes: v.notes || null });
      if (!parsed.success) {
        const e: Record<string, string> = {};
        parsed.error.issues.forEach((i) => (e[String(i.path[0])] ??= i.message));
        setErrors(e);
        throw new Error('Revisa los campos.');
      }
      setErrors({});
      if (isDemo()) throw new Error('Modo demo: las direcciones se guardan al conectar con cafetravesia.co.');
      const body = { ...parsed.data, label: v.label || null, isDefault: v.isDefault };
      return editing!.id ? api.patch(`/api/v1/addresses/${editing!.id}`, body) : api.post('/api/v1/addresses', body);
    },
    onSuccess: () => {
      haptic.success();
      setEditing(null);
      void qc.invalidateQueries({ queryKey: ['me', 'addresses'] });
    },
    onError: (e) => setMsg(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      if (isDemo()) throw new Error('Modo demo: no se pueden eliminar direcciones.');
      return api.del(`/api/v1/addresses/${id}`);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['me', 'addresses'] }),
    onError: (e) => setMsg(errorMessage(e)),
  });

  const open = (a?: Address) => {
    setMsg(null);
    setErrors({});
    setEditing(a ? { id: a.id, v: { label: a.label ?? '', recipient: a.recipient, phone: a.phone, region: a.region as Region, city: a.city, line1: a.line1, line2: a.line2 ?? '', notes: a.notes ?? '', isDefault: !!a.isDefault } } : { v: { ...empty } });
  };
  const set = (k: keyof typeof empty) => (t: string) => setEditing((e) => (e ? { ...e, v: { ...e.v, [k]: t } } : e));

  return (
    <View style={{ flex: 1, backgroundColor: C.crema }}>
      <Header title="Direcciones" right={<IconButton name="add" label="Agregar dirección" onPress={() => open()} />} />
      <Screen contentStyle={{ gap: S.md, paddingTop: S.sm }}>
        <DemoNotice compact />
        {msg && !editing ? (
          <T v="small" color={C.cereza}>
            {msg}
          </T>
        ) : null}
        {q.isLoading ? <Skeleton style={{ height: 100 }} /> : null}
        {q.data?.addresses.length === 0 ? <EmptyState icon="location-outline" title="Sin direcciones guardadas" action="Agregar dirección" onAction={() => open()} /> : null}
        {(q.data?.addresses ?? []).map((a, i) => (
          <Animated.View key={a.id} entering={FadeInDown.delay(i * 60)} style={styles.card}>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <T v="bodyStrong">{a.label ?? a.city}</T>
                {a.isDefault ? <Badge label="Principal" /> : null}
              </View>
              <T v="small" color={C.muted}>
                {a.recipient} · {a.phone}
              </T>
              <T v="small" color={C.muted}>
                {a.line1}
                {a.line2 ? `, ${a.line2}` : ''} · {a.city}, {a.region}
              </T>
            </View>
            <IconButton name="create-outline" label={`Editar ${a.label ?? a.city}`} onPress={() => open(a)} />
            <IconButton name="trash-outline" label={`Eliminar ${a.label ?? a.city}`} color={C.cereza} onPress={() => remove.mutate(a.id)} />
          </Animated.View>
        ))}
        <Button title="Agregar dirección" variant="outline" icon="add" onPress={() => open()} />
      </Screen>
      <Sheet visible={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Editar dirección' : 'Nueva dirección'}>
        {editing ? (
          <>
            <Field label="Nombre (Casa, Oficina…)" value={editing.v.label} onChangeText={set('label')} />
            <Field label="Quién recibe" value={editing.v.recipient} onChangeText={set('recipient')} error={errors.recipient} />
            <Field label="Teléfono" value={editing.v.phone} onChangeText={set('phone')} keyboardType="phone-pad" error={errors.phone} />
            <Select label="Departamento" value={editing.v.region} options={REGION_OPTIONS} onChange={(v) => setEditing((e) => (e ? { ...e, v: { ...e.v, region: v } } : e))} error={errors.region} />
            <Field label="Ciudad o municipio" value={editing.v.city} onChangeText={set('city')} error={errors.city} />
            <Field label="Dirección" value={editing.v.line1} onChangeText={set('line1')} error={errors.line1} />
            <Field label="Apto, torre, barrio" value={editing.v.line2} onChangeText={set('line2')} />
            <Field label="Indicaciones" value={editing.v.notes} onChangeText={set('notes')} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <T v="bodyStrong">Usar como principal</T>
              <Switch value={editing.v.isDefault} onValueChange={(v) => setEditing((e) => (e ? { ...e, v: { ...e.v, isDefault: v } } : e))} trackColor={{ true: C.ambar, false: C.arena }} thumbColor={C.hueso} accessibilityLabel="Usar como principal" />
            </View>
            {msg ? (
              <T v="small" color={C.cereza}>
                {msg}
              </T>
            ) : null}
            <Button title="Guardar" loading={save.isPending} onPress={() => save.mutate()} />
          </>
        ) : null}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 14, borderRadius: R.lg, backgroundColor: C.hueso, borderWidth: 1, borderColor: C.line },
});
