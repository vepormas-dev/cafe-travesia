import { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as Crypto from 'expo-crypto';
import type { ChatReplyDTO } from '@travesia/shared';

import { inline } from '@/components/brand';
import { Button, DemoNotice, Header, IconButton, T } from '@/components/ui';
import { api, errorMessage, isDemo, request } from '@/lib/api';
import { haptic } from '@/lib/haptics';
import { PHOTOS } from '@/lib/images';
import { isSubscriptionLink, openLink } from '@/lib/links';
import { KEYS, readJSON, removeKey, writeJSON } from '@/lib/storage';
import { C, F, R, S } from '@/theme';

type Msg = ChatReplyDTO['messages'][number];
type Status = ChatReplyDTO['status'];

const WELCOME: Msg = {
  id: 'welcome',
  role: 'assistant',
  content: '¡Hola! Soy el **Asistente Travesía** ☕. Te ayudo a elegir tu café, con tu suscripción, tus pedidos o los cursos de la Academia. ¿Qué necesitas?',
  actions: [
    { type: 'link', label: 'Recomiéndame un café', href: '/tienda' },
    { type: 'link', label: 'Mis pedidos', href: '/cuenta/pedidos' },
    { type: 'human', label: 'Hablar con un asesor' },
  ],
  createdAt: new Date().toISOString(),
};

/** Respuestas por reglas en modo demo (sin API). */
function demoReply(text: string): Msg {
  const t = text.toLowerCase();
  const now = new Date().toISOString();
  if (/asesor|humano|persona/.test(t)) return { id: `d${Date.now()}`, role: 'system', content: 'En modo demo no podemos conectar con un asesor. Escríbenos por WhatsApp o a info@cafetravesia.co.', actions: null, createdAt: now };
  if (/pedido|env[ií]o|rastre/.test(t)) return { id: `d${Date.now()}`, role: 'assistant', content: 'Puedes ver el estado y el rastreo de tus pedidos en **Mis pedidos**. Los envíos en el Valle de Aburrá llegan en 1-2 días hábiles.', actions: [{ type: 'link', label: 'Ver mis pedidos', href: '/cuenta/pedidos' }], createdAt: now };
  if (/suscrip|plan|pausa/.test(t)) return { id: `d${Date.now()}`, role: 'assistant', content: 'Con la suscripción recibes café fresco con **envío gratis**, y puedes pausar o cancelar cuando quieras.', actions: null, createdAt: now };
  if (/curso|academia|aprender/.test(t)) return { id: `d${Date.now()}`, role: 'assistant', content: 'Te recomiendo empezar con **Fundamentos del Grano**: es gratis y dura 45 minutos.', actions: [{ type: 'link', label: 'Ver curso', href: '/academia/cursos/fundamentos-del-grano' }], createdAt: now };
  return { id: `d${Date.now()}`, role: 'assistant', content: 'Si te gustan los cafés dulces y achocolatados, prueba **Travesía Caicedo**. Si prefieres algo floral y brillante, **Cima del Viento** es nuestra edición de temporada.', actions: [{ type: 'link', label: 'Travesía Caicedo', href: '/tienda/travesia-caicedo' }, { type: 'link', label: 'Cima del Viento', href: '/tienda/cima-del-viento' }], createdAt: now };
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [status, setStatus] = useState<Status>('bot');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const session = useRef<string | null>(null);
  const visitor = useRef<string | null>(null);
  const list = useRef<FlatList<Msg>>(null);

  const apply = (r: ChatReplyDTO) => {
    session.current = r.sessionId;
    void writeJSON(KEYS.chatSession, r.sessionId);
    setStatus(r.status);
    if (r.messages.length) setMessages([WELCOME, ...r.messages]);
  };

  // Carga la conversación previa.
  useEffect(() => {
    (async () => {
      visitor.current = await readJSON<string | null>(KEYS.visitor, null);
      if (!visitor.current) {
        visitor.current = Crypto.randomUUID();
        await writeJSON(KEYS.visitor, visitor.current);
      }
      const sid = await readJSON<string | null>(KEYS.chatSession, null);
      if (!sid || isDemo()) return;
      session.current = sid;
      try {
        apply(await request<ChatReplyDTO>(`/api/chat?sessionId=${encodeURIComponent(sid)}`));
      } catch {
        /* sesión expirada: empieza una nueva */
      }
    })();
  }, []);

  // Polling cuando un asesor humano atiende.
  useEffect(() => {
    if (status !== 'human' && status !== 'human_requested') return;
    const t = setInterval(async () => {
      if (!session.current) return;
      try {
        apply(await request<ChatReplyDTO>(`/api/chat?sessionId=${encodeURIComponent(session.current)}`));
      } catch {
        /* reintenta en el siguiente ciclo */
      }
    }, 5000);
    return () => clearInterval(t);
  }, [status]);

  const send = async (message: string) => {
    const m = message.trim();
    if (!m || sending) return;
    haptic.tap();
    setError(null);
    setText('');
    const mine: Msg = { id: `u${Date.now()}`, role: 'user', content: m, actions: null, createdAt: new Date().toISOString() };
    setMessages((x) => [...x, mine]);
    setSending(true);
    try {
      if (isDemo()) {
        await new Promise((r) => setTimeout(r, 600));
        setMessages((x) => [...x, demoReply(m)]);
      } else {
        apply(await api.post<ChatReplyDTO>('/api/chat', { sessionId: session.current, visitorId: visitor.current, message: m, channel: 'app', page: 'app/chat' }));
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSending(false);
    }
  };

  const escalate = () => void send('Quiero hablar con un asesor, por favor.');
  const reset = async () => {
    await removeKey(KEYS.chatSession);
    session.current = null;
    setStatus('bot');
    setMessages([WELCOME]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.crema }}>
      <Header title="Asistente Travesía" right={<IconButton name="refresh" label="Nueva conversación" onPress={() => void reset()} />} />
      <View style={styles.statusRow}>
        <View style={[styles.dot, { backgroundColor: status === 'human' ? C.ambar : C.montana }]} />
        <T v="label" color={C.montana}>
          {status === 'human' ? 'Te atiende un asesor' : status === 'human_requested' ? 'Buscando un asesor…' : status === 'closed' ? 'Conversación cerrada' : 'En línea'}
        </T>
        <View style={{ flex: 1 }} />
        {status === 'bot' ? <Button title="Asesor" small variant="outline" icon="person-outline" onPress={escalate} /> : null}
      </View>
      <View style={{ paddingHorizontal: S.xl }}>
        <DemoNotice compact />
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        <FlatList
          ref={list}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: S.xl, gap: 12 }}
          onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => <Bubble m={item} onAction={(a) => (a.type === 'human' ? escalate() : a.href ? void openLink(a.href) : void send(a.label))} />}
          ListFooterComponent={
            sending ? (
              <T v="small" color={C.muted} style={{ marginLeft: 44 }}>
                Escribiendo…
              </T>
            ) : error ? (
              <T v="small" color={C.cereza}>
                {error}
              </T>
            ) : null
          }
        />
        <View style={[styles.composer, { paddingBottom: insets.bottom + 10 }]}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Escribe tu mensaje…"
            placeholderTextColor="rgba(17,26,49,0.4)"
            style={styles.input}
            multiline
            maxLength={1500}
            accessibilityLabel="Mensaje para el asistente"
            onSubmitEditing={() => void send(text)}
            editable={status !== 'closed'}
          />
          <IconButton name="send" label="Enviar" color={C.crema} bg={C.noche} onPress={() => void send(text)} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function Bubble({ m, onAction }: { m: Msg; onAction: (a: { type: string; label: string; href?: string }) => void }) {
  const mine = m.role === 'user';
  if (m.role === 'system') {
    return (
      <T v="small" color={C.muted} center style={{ paddingHorizontal: 20 }}>
        {m.content}
      </T>
    );
  }
  return (
    <Animated.View entering={FadeInUp.duration(250)} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
      {!mine ? <Image source={PHOTOS['barra-travesia']} style={styles.avatar} contentFit="cover" accessibilityLabel={m.role === 'agent' ? 'Asesor' : 'Asistente'} /> : null}
      <View style={{ maxWidth: '82%', gap: 8 }}>
        <View style={[styles.bubble, mine ? styles.mine : m.role === 'agent' ? styles.agent : null]}>
          {m.role === 'agent' ? (
            <T v="eyebrow" color={C.ambarProfundo} style={{ marginBottom: 4, fontSize: 10 }}>
              Asesor Travesía
            </T>
          ) : null}
          <T v="body" color={mine ? C.crema : C.noche}>
            {inline(m.content, mine ? C.crema : C.noche)}
          </T>
        </View>
        {m.actions?.some((a) => !isSubscriptionLink(a.href)) ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {m.actions.filter((a) => !isSubscriptionLink(a.href)).map((a, i) => (
              <Button key={i} title={a.label} small variant={a.type === 'human' ? 'outline' : 'light'} icon={a.type === 'human' ? 'person-outline' : a.href && /^https?:/.test(a.href) ? 'open-outline' : 'arrow-forward'} onPress={() => onAction(a)} style={{ borderColor: a.type === 'human' ? C.noche : C.line }} />
            ))}
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: S.xl, paddingBottom: 10 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  avatar: { width: 34, height: 34, borderRadius: 17 },
  bubble: { padding: 14, borderRadius: 20, borderBottomLeftRadius: 6, backgroundColor: '#ECE7DD' },
  mine: { backgroundColor: C.noche, borderBottomLeftRadius: 20, borderBottomRightRadius: 6 },
  agent: { backgroundColor: '#FBEBD3' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: S.lg, paddingTop: 10, backgroundColor: C.hueso, borderTopWidth: 1, borderTopColor: C.line },
  input: { flex: 1, minHeight: 44, maxHeight: 120, borderRadius: R.lg, backgroundColor: C.crema, paddingHorizontal: 14, paddingTop: 11, paddingBottom: 11, fontFamily: F.body, fontSize: 16, color: C.noche, borderWidth: 1, borderColor: C.line },
});
