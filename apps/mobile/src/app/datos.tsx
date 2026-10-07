import { useState } from 'react';
import { Switch, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LEGAL_ID_TYPES, profileSchema, type MeDTO } from '@travesia/shared';

import { AccountGate } from '@/components/account-gate';
import { Field, Select } from '@/components/form';
import { Button, Card, DemoNotice, Header, Screen, T } from '@/components/ui';
import { api, errorMessage, isDemo } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { haptic } from '@/lib/haptics';
import { C, S } from '@/theme';

type IdType = 'CC' | 'CE' | 'NIT' | 'PP' | 'TI';

export default function Datos() {
  return (
    <AccountGate title="Mis datos">
      <Form />
    </AccountGate>
  );
}

function Form() {
  const { me, setMe } = useAuth();
  const qc = useQueryClient();
  const [f, setF] = useState({ fullName: '', phone: '', legalIdType: 'CC' as IdType, legalId: '', marketingOptIn: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const [seeded, setSeeded] = useState<typeof me>(null);
  if (me && seeded !== me) {
    setSeeded(me);
    setF({ fullName: me.fullName ?? '', phone: me.phone ?? '', legalIdType: (me.legalIdType as IdType) ?? 'CC', legalId: me.legalId ?? '', marketingOptIn: me.marketingOptIn });
  }

  const save = useMutation({
    mutationFn: async () => {
      const parsed = profileSchema.safeParse({ ...f, phone: f.phone || null, legalId: f.legalId || null });
      if (!parsed.success) {
        const e: Record<string, string> = {};
        parsed.error.issues.forEach((i) => (e[String(i.path[0])] ??= i.message));
        setErrors(e);
        throw new Error('Revisa los campos.');
      }
      setErrors({});
      if (isDemo()) throw new Error('Modo demo: los cambios se habilitan al conectar con cafetravesia.com.');
      return api.patch<{ user: MeDTO }>('/api/v1/me', parsed.data);
    },
    onSuccess: (r) => {
      haptic.success();
      setMe(r.user);
      setMsg({ text: 'Guardamos tus datos.', ok: true });
      void qc.invalidateQueries({ queryKey: ['me'] });
    },
    onError: (e) => setMsg({ text: errorMessage(e), ok: false }),
  });

  return (
    <View style={{ flex: 1, backgroundColor: C.crema }}>
      <Header title="Mis datos" />
      <Screen contentStyle={{ gap: S.lg, paddingTop: S.sm }}>
        <DemoNotice compact />
        <Field label="Correo" value={me?.email ?? ''} editable={false} style={{ opacity: 0.6 }} />
        <Field label="Nombre completo" value={f.fullName} onChangeText={(t) => setF({ ...f, fullName: t })} error={errors.fullName} />
        <Field label="Celular" value={f.phone} onChangeText={(t) => setF({ ...f, phone: t })} keyboardType="phone-pad" error={errors.phone} />
        <Select label="Tipo de documento" value={f.legalIdType} options={LEGAL_ID_TYPES} onChange={(v) => setF({ ...f, legalIdType: v })} />
        <Field label="Documento (para facturación)" value={f.legalId} onChangeText={(t) => setF({ ...f, legalId: t })} keyboardType="number-pad" error={errors.legalId} />
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <T v="bodyStrong">Novedades y ediciones de temporada</T>
            <T v="small" color={C.muted}>
              Recibe correos con lanzamientos y beneficios.
            </T>
          </View>
          <Switch value={f.marketingOptIn} onValueChange={(v) => setF({ ...f, marketingOptIn: v })} trackColor={{ true: C.ambar, false: C.arena }} thumbColor={C.hueso} accessibilityLabel="Recibir novedades" />
        </Card>
        {msg ? (
          <T v="small" color={msg.ok ? C.montana : C.cereza} accessibilityLiveRegion="polite">
            {msg.text}
          </T>
        ) : null}
        <Button title="Guardar cambios" loading={save.isPending} onPress={() => save.mutate()} />
      </Screen>
    </View>
  );
}
