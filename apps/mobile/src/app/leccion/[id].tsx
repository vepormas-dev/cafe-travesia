import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatClock, type LessonDTO } from '@travesia/shared';

import { inline, Markdown } from '@/components/brand';
import { LessonPlayer } from '@/components/lesson-player';
import { Button, Chip, DemoNotice, EmptyState, Icon, IconButton, PressableScale, ProgressBar, Skeleton, T } from '@/components/ui';
import { api, ApiError, errorMessage, isDemo } from '@/lib/api';
import { haptic } from '@/lib/haptics';
import { openWeb } from '@/lib/links';
import { useCourse, useCourseAccess, useLesson } from '@/lib/queries';
import { KEYS, readJSON, writeJSON } from '@/lib/storage';
import { C, F, R, S } from '@/theme';

type Tab = 'resumen' | 'notas' | 'tutor';
type Note = { id?: string; atS: number; body: string; createdAt?: string };

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const qc = useQueryClient();
  const lesson = useLesson(id);
  const course = useCourse(lesson.data?.courseSlug);
  const access = useCourseAccess(lesson.data?.courseSlug);
  const [tab, setTab] = useState<Tab>('resumen');
  const [doneId, setDoneId] = useState<string | null>(null);
  const pos = useRef(0);
  const sent = useRef(-1);

  const l = lesson.data;
  const done = !!l && (l.completed || doneId === l.id);
  useEffect(() => {
    if (l) pos.current = l.positionS;
  }, [l]);

  // Progreso: cada 15 s y al salir de la pantalla.
  useEffect(() => {
    if (!l) return;
    const send = (completed?: boolean) => {
      const positionS = Math.floor(pos.current);
      if (isDemo() || (!completed && Math.abs(positionS - sent.current) < 2)) return;
      sent.current = positionS;
      api.post('/api/v1/progress', { lessonId: l.id, positionS, ...(completed ? { completed: true } : {}) }).catch(() => undefined);
    };
    const t = setInterval(() => send(), 15000);
    return () => {
      clearInterval(t);
      send();
      void qc.invalidateQueries({ queryKey: ['me', 'academy'] });
    };
  }, [l, qc]);

  const complete = useMutation({
    mutationFn: async () => {
      if (isDemo()) return { ok: true, progressPct: Math.min(100, (access.data?.progressPct ?? 0) + 10), courseCompleted: false } as { ok: boolean; progressPct: number; courseCompleted: boolean; certificateCode?: string };
      return api.post<{ ok: boolean; progressPct: number; courseCompleted: boolean; certificateCode?: string }>('/api/v1/progress', { lessonId: l!.id, positionS: Math.floor(pos.current), completed: true });
    },
    onSuccess: () => {
      haptic.success();
      setDoneId(l?.id ?? null);
      void qc.invalidateQueries({ queryKey: ['me'] });
    },
  });

  const videoH = Math.round((width * 9) / 16) + insets.top;

  if (lesson.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.ink }}>
        <Skeleton dark style={{ height: videoH, borderRadius: 0 }} />
        <View style={{ padding: S.xl, gap: 14 }}>
          <Skeleton dark style={{ height: 30, width: '70%' }} />
          <Skeleton dark style={{ height: 90 }} />
        </View>
      </View>
    );
  }
  if (!l) {
    const status = lesson.error instanceof ApiError ? lesson.error.status : 0;
    return (
      <View style={{ flex: 1, backgroundColor: C.ink, paddingTop: insets.top + 10 }}>
        <View style={{ paddingHorizontal: S.lg }}>
          <IconButton name="chevron-back" label="Volver" color={C.crema} bg="rgba(255,255,255,0.08)" onPress={() => router.back()} />
        </View>
        <EmptyState
          dark
          icon="lock-closed-outline"
          title={status === 401 ? 'Ingresa para ver esta lección' : status === 403 ? 'Inscríbete para ver esta lección' : 'No pudimos abrir la lección'}
          body={status === 403 ? 'Esta lección es parte de un curso. Inscríbete o cómpralo para continuar.' : errorMessage(lesson.error)}
          action={status === 401 ? 'Ingresar' : 'Volver'}
          onAction={() => (status === 401 ? router.push('/ingresar') : router.back())}
        />
      </View>
    );
  }

  const mods = course.data?.modules ?? [];
  const mod = mods.find((m) => m.id === l.moduleId);
  const flat = mods.flatMap((m) => m.lessons);
  const idx = flat.findIndex((x) => x.id === l.id);

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <StatusBar style="light" />
      <View style={{ paddingTop: insets.top, backgroundColor: '#000' }}>
        <LessonPlayer
          key={l.id}
          lesson={l}
          cover={course.data?.coverUrl}
          height={videoH - insets.top}
          onTime={(s) => (pos.current = s)}
          onEnd={() => {
            if (!done) complete.mutate();
          }}
        />
        <View style={{ position: 'absolute', top: insets.top + 10, left: 14 }}>
          <IconButton name="chevron-back" label="Volver" color={C.crema} bg="rgba(0,0,0,0.45)" onPress={() => (router.canGoBack() ? router.back() : router.replace(`/curso/${l.courseSlug}`))} />
        </View>
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: S.xl, paddingBottom: insets.bottom + 40, gap: S.lg }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(450)} style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={styles.lessonTag}>
                <T v="eyebrow" color={C.lima}>
                  Lección {String(idx + 1).padStart(2, '0')}
                </T>
              </View>
              <T v="eyebrow" color={C.inkMuted}>
                • {Math.max(1, Math.round(l.durationS / 60))} min
              </T>
              {done ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Icon name="checkmark-circle" size={14} color={C.lima} />
                  <T v="eyebrow" color={C.lima}>
                    Completada
                  </T>
                </View>
              ) : null}
            </View>
            <T v="h1" color={C.crema} style={{ fontSize: 32, lineHeight: 38 }} accessibilityRole="header">
              {l.title}
            </T>
            {l.summary ? (
              <T v="body" color={C.inkMuted} style={{ fontSize: 17, lineHeight: 26 }}>
                {l.summary}
              </T>
            ) : null}
          </Animated.View>
          <DemoNotice dark compact />

          <View style={styles.progressCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <T v="label" color={C.inkMuted} style={{ letterSpacing: 1, textTransform: 'uppercase' }}>
                Progreso del curso
              </T>
              <T v="h3" color={C.lima} style={{ fontFamily: F.displayItalic }}>
                {access.data?.progressPct ?? 0}%
              </T>
            </View>
            <ProgressBar pct={access.data?.progressPct ?? 0} color={C.lima} track="rgba(255,255,255,0.08)" height={8} />
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Chip dark label="Resumen" active={tab === 'resumen'} onPress={() => setTab('resumen')} />
            <Chip dark label="Notas" active={tab === 'notas'} onPress={() => setTab('notas')} />
            <Chip dark label="Tutor ✨" active={tab === 'tutor'} onPress={() => setTab('tutor')} />
          </View>
          {tab === 'resumen' ? <Summary lesson={l} /> : tab === 'notas' ? <Notes lesson={l} pos={pos} /> : <Tutor lesson={l} />}

          <Button
            title={done ? 'Lección completada' : 'Marcar como completada'}
            variant={done ? 'outline' : 'lima'}
            icon={done ? 'checkmark-done' : 'checkmark'}
            disabled={done}
            loading={complete.isPending}
            onPress={() => complete.mutate()}
            style={done ? { borderColor: C.inkLine } : undefined}
          />
          {complete.isError ? (
            <T v="small" color={C.cereza}>
              {errorMessage(complete.error)}
            </T>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {l.prevLessonId ? <Button title="Anterior" variant="outline" small icon="chevron-back" style={{ flex: 1, borderColor: C.inkLine }} onPress={() => router.replace(`/leccion/${l.prevLessonId}`)} /> : null}
            {l.nextLessonId ? <Button title="Siguiente" variant="light" small iconRight="chevron-forward" style={{ flex: 1 }} onPress={() => router.replace(`/leccion/${l.nextLessonId}`)} /> : null}
          </View>

          {mod ? (
            <View style={{ gap: 10, marginTop: S.lg }}>
              <T v="eyebrow" color={C.inkMuted} style={{ letterSpacing: 4, fontSize: 13 }}>
                Módulo {mod.position}: {mod.title}
              </T>
              {mod.lessons.map((x) => {
                const current = x.id === l.id;
                const completed = x.completed || (current && done);
                return (
                  <PressableScale key={x.id} onPress={() => !current && router.replace(`/leccion/${x.id}`)} accessibilityLabel={`${x.title}${completed ? ', completada' : ''}${current ? ', en reproducción' : ''}`} style={[styles.row, current && { borderColor: 'rgba(201,231,166,0.4)' }]}>
                    <View style={[styles.rowIcon, completed && { backgroundColor: 'rgba(201,231,166,0.12)' }]}>
                      <Icon name={completed ? 'checkmark' : current ? 'volume-high-outline' : 'play'} size={18} color={C.lima} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <T v="bodyStrong" color={C.crema} numberOfLines={2}>
                        {x.title}
                      </T>
                      <T v="small" color={C.inkMuted}>
                        {formatClock(x.durationS)}
                        {completed ? ' • Completado' : current ? ' • Reproduciendo' : ''}
                      </T>
                    </View>
                  </PressableScale>
                );
              })}
              {mod.quizId ? <Button title="Presentar evaluación del módulo" variant="outline" icon="help-circle-outline" style={{ borderColor: C.inkLine }} onPress={() => router.push(`/quiz/${mod.quizId}`)} /> : null}
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Summary({ lesson }: { lesson: LessonDTO }) {
  return (
    <Animated.View entering={FadeIn} style={{ gap: 14 }}>
      <Markdown text={lesson.content ?? lesson.summary ?? 'Sin resumen para esta lección.'} dark />
      {lesson.resources.length ? (
        <View style={{ gap: 8 }}>
          <T v="eyebrow" color={C.inkMuted}>
            Recursos
          </T>
          {lesson.resources.map((r) => (
            <Button key={r.url} title={r.label} variant="outline" small icon="document-text-outline" style={{ borderColor: C.inkLine, alignSelf: 'flex-start' }} onPress={() => void openWeb(r.url)} />
          ))}
        </View>
      ) : null}
    </Animated.View>
  );
}

function Notes({ lesson, pos }: { lesson: LessonDTO; pos: { current: number } }) {
  const qc = useQueryClient();
  const [body, setBody] = useState('');
  const key = ['me', 'notes', lesson.id];
  const notes = useQuery({
    queryKey: key,
    queryFn: async () => (isDemo() ? readJSON<Note[]>(KEYS.notes(lesson.id), []) : (await api.get<{ notes: Note[] }>(`/api/v1/lessons/${lesson.id}/notes`)).notes),
  });
  const save = useMutation({
    mutationFn: async () => {
      const note: Note = { atS: Math.floor(pos.current), body: body.trim(), createdAt: new Date().toISOString() };
      if (isDemo()) {
        const prev = await readJSON<Note[]>(KEYS.notes(lesson.id), []);
        await writeJSON(KEYS.notes(lesson.id), [note, ...prev]);
        return;
      }
      await api.post(`/api/v1/lessons/${lesson.id}/notes`, { atS: note.atS, body: note.body });
    },
    onSuccess: () => {
      haptic.success();
      setBody('');
      void qc.invalidateQueries({ queryKey: key });
    },
  });
  return (
    <Animated.View entering={FadeIn} style={{ gap: 12 }}>
      <TextInput
        value={body}
        onChangeText={setBody}
        placeholder={`Nota en ${formatClock(pos.current)}…`}
        placeholderTextColor="rgba(248,243,234,0.4)"
        multiline
        style={styles.textarea}
        accessibilityLabel="Escribir nota"
        maxLength={2000}
      />
      <Button title="Guardar nota" variant="lima" small icon="bookmark-outline" disabled={body.trim().length < 2} loading={save.isPending} onPress={() => save.mutate()} style={{ alignSelf: 'flex-start' }} />
      {save.isError ? (
        <T v="small" color={C.cereza}>
          {errorMessage(save.error)}
        </T>
      ) : null}
      {(notes.data ?? []).map((n, i) => (
        <View key={n.id ?? i} style={styles.note}>
          <T v="eyebrow" color={C.lima}>
            {formatClock(n.atS)}
          </T>
          <T v="body" color={C.crema}>
            {n.body}
          </T>
        </View>
      ))}
      {notes.data && !notes.data.length ? (
        <T v="small" color={C.inkMuted}>
          Aún no tienes notas en esta lección. Se guardan con el minuto del video.
        </T>
      ) : null}
    </Animated.View>
  );
}

type Msg = { role: 'user' | 'assistant'; content: string; lessons?: { id: string; title: string }[] };
function Tutor({ lesson }: { lesson: LessonDTO }) {
  const [q, setQ] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>([{ role: 'assistant', content: `¡Hola! Soy tu tutor de **${lesson.title}**. Pregúntame lo que quieras sobre esta lección.` }]);
  const ask = useMutation({
    mutationFn: async (question: string) => {
      if (isDemo()) {
        return { answer: `Buena pregunta. En esta lección (“${lesson.title}”) la clave es: ${lesson.summary ?? 'practicar con atención'}. Cuando la app se conecte con cafetravesia.co te responderé con IA y con el contenido completo del curso.`, lessons: [], ai: false };
      }
      return api.post<{ answer: string; lessons: { id: string; title: string }[]; ai: boolean }>('/api/ai/tutor', {
        lessonId: lesson.id,
        question,
        history: msgs.slice(-10).map((m) => ({ role: m.role, content: m.content.slice(0, 4000) })),
      });
    },
    onMutate: (question) => setMsgs((m) => [...m, { role: 'user', content: question }]),
    onSuccess: (r) => setMsgs((m) => [...m, { role: 'assistant', content: r.answer, lessons: r.lessons }]),
    onError: (e) => setMsgs((m) => [...m, { role: 'assistant', content: errorMessage(e) }]),
  });
  return (
    <Animated.View entering={FadeIn} style={{ gap: 10 }}>
      {msgs.map((m, i) => (
        <View key={i} style={[styles.bubble, m.role === 'user' ? styles.bubbleUser : null]}>
          <T v="body" color={m.role === 'user' ? C.ink : C.crema}>
            {inline(m.content, m.role === 'user' ? C.ink : C.crema)}
          </T>
          {m.lessons?.length ? (
            <View style={{ gap: 6, marginTop: 8 }}>
              {m.lessons.map((x) => (
                <Button key={x.id} title={x.title} small variant="outline" icon="play-circle-outline" style={{ borderColor: C.inkLine, alignSelf: 'flex-start' }} onPress={() => router.replace(`/leccion/${x.id}`)} />
              ))}
            </View>
          ) : null}
        </View>
      ))}
      {ask.isPending ? (
        <T v="small" color={C.inkMuted}>
          El tutor está escribiendo…
        </T>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
        <TextInput value={q} onChangeText={setQ} placeholder="Pregunta al tutor…" placeholderTextColor="rgba(248,243,234,0.4)" style={[styles.textarea, { flex: 1, minHeight: 48 }]} multiline accessibilityLabel="Pregunta al tutor" maxLength={1000} />
        <IconButton
          name="send"
          label="Enviar pregunta"
          color={C.ink}
          bg={C.lima}
          onPress={() => {
            const v = q.trim();
            if (v.length < 2 || ask.isPending) return;
            setQ('');
            ask.mutate(v);
          }}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  lessonTag: { backgroundColor: 'rgba(201,231,166,0.1)', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  progressCard: { padding: S.xl, gap: 14, borderRadius: R.xl, backgroundColor: C.inkCard, borderWidth: 1, borderColor: C.inkLine },
  row: { flexDirection: 'row', gap: 14, alignItems: 'center', padding: 14, borderRadius: R.lg, backgroundColor: C.inkCard, borderWidth: 1, borderColor: C.inkLine },
  rowIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  textarea: { minHeight: 90, borderRadius: R.md, backgroundColor: C.inkCard, color: C.crema, padding: 12, fontFamily: F.body, fontSize: 16, borderWidth: 1, borderColor: C.inkLine, textAlignVertical: 'top' },
  note: { padding: 12, borderRadius: R.md, backgroundColor: C.inkCard, gap: 4, borderLeftWidth: 3, borderLeftColor: C.lima },
  bubble: { padding: 12, borderRadius: 16, backgroundColor: C.inkCard, borderWidth: 1, borderColor: C.inkLine, maxWidth: '92%' },
  bubbleUser: { alignSelf: 'flex-end', backgroundColor: C.lima, borderColor: C.lima },
});
