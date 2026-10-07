import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Button, EmptyState, Header, Icon, ProgressBar, Screen, Skeleton, T } from '@/components/ui';
import { api, errorMessage, isDemo } from '@/lib/api';
import { demoQuizzes } from '@/lib/demo';
import { haptic } from '@/lib/haptics';
import { openWeb } from '@/lib/links';
import { useQuiz } from '@/lib/queries';
import { C, F, R, S } from '@/theme';

type Result = { score: number; passed: boolean; results: { correct: boolean; explanation: string }[]; certificateCode?: string };

export default function QuizScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const quiz = useQuiz(id);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<Result | null>(null);

  const submit = useMutation({
    mutationFn: async (ans: number[]): Promise<Result> => {
      if (isDemo()) {
        const q = demoQuizzes.get(id!);
        const results = (q?.questions ?? []).map((x, i) => ({ correct: ans[i] === x.correctIndex, explanation: x.explanation }));
        const score = Math.round((results.filter((r) => r.correct).length / Math.max(1, results.length)) * 100);
        return { score, passed: score >= (q?.passScore ?? 70), results };
      }
      return api.post<Result>(`/api/v1/quizzes/${id}/submit`, { answers: ans });
    },
    onSuccess: (r) => {
      if (r.passed) haptic.success();
      else haptic.warning();
      setResult(r);
      void qc.invalidateQueries({ queryKey: ['me'] });
    },
  });

  const q = quiz.data;
  if (quiz.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.ink }}>
        <Header dark />
        <View style={{ padding: S.xl, gap: 12 }}>
          <Skeleton dark style={{ height: 30 }} />
          <Skeleton dark style={{ height: 200 }} />
        </View>
      </View>
    );
  }
  if (!q) {
    return (
      <View style={{ flex: 1, backgroundColor: C.ink }}>
        <Header dark title="Evaluación" />
        <EmptyState dark title="No pudimos abrir la evaluación" body={errorMessage(quiz.error)} action="Volver" onAction={() => router.back()} />
      </View>
    );
  }

  if (result) {
    return (
      <View style={{ flex: 1, backgroundColor: C.ink }}>
        <StatusBar style="light" />
        <Header dark title={q.title} />
        <Screen dark>
          <Animated.View entering={ZoomIn.springify()} style={styles.score}>
            <Icon name={result.passed ? 'trophy' : 'refresh'} size={40} color={result.passed ? C.ambar : C.lima} />
            <T v="display" color={C.crema}>
              {result.score}%
            </T>
            <T v="h3" color={result.passed ? C.lima : C.ambarClaro} center>
              {result.passed ? '¡Aprobaste! Excelente travesía.' : `Necesitas ${q.passScore}% para aprobar. ¡Inténtalo de nuevo!`}
            </T>
          </Animated.View>
          {result.certificateCode ? <Button title="Ver mi certificado" variant="lima" icon="ribbon-outline" onPress={() => void openWeb(`/api/certificates/${result.certificateCode}`)} style={{ marginBottom: 16 }} /> : null}
          <View style={{ gap: 10 }}>
            {q.questions.map((x, i) => {
              const r = result.results[i];
              return (
                <Animated.View key={x.id} entering={FadeInDown.delay(i * 80)} style={[styles.review, { borderLeftColor: r?.correct ? C.lima : C.cereza }]}>
                  <T v="bodyStrong" color={C.crema}>
                    {i + 1}. {x.prompt}
                  </T>
                  <T v="small" color={C.inkMuted}>
                    Tu respuesta: {x.options[answers[i] ?? -1] ?? '—'}
                  </T>
                  {r?.explanation ? (
                    <T v="small" color={r.correct ? C.lima : C.ambarClaro}>
                      {r.explanation}
                    </T>
                  ) : null}
                </Animated.View>
              );
            })}
          </View>
          <View style={{ gap: 10, marginTop: S.xl }}>
            {!result.passed ? (
              <Button title="Reintentar" variant="lima" onPress={() => { setResult(null); setAnswers([]); setStep(0); }} />
            ) : null}
            <Button title="Volver al curso" variant="outline" style={{ borderColor: C.inkLine }} onPress={() => router.back()} />
          </View>
        </Screen>
      </View>
    );
  }

  const question = q.questions[step]!;
  const selected = answers[step];
  const last = step === q.questions.length - 1;

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <StatusBar style="light" />
      <Header dark title={q.title} />
      <View style={{ paddingHorizontal: S.xl, gap: 8 }}>
        <T v="eyebrow" color={C.inkMuted}>
          Pregunta {step + 1} de {q.questions.length}
        </T>
        <ProgressBar pct={((step + 1) / q.questions.length) * 100} color={C.lima} track="rgba(255,255,255,0.08)" />
      </View>
      <Screen dark contentStyle={{ paddingTop: S.xl }}>
        <Animated.View key={question.id} entering={FadeIn.duration(300)} style={{ gap: 14 }}>
          <T v="h2" color={C.crema}>
            {question.prompt}
          </T>
          {question.options.map((o, i) => {
            const active = selected === i;
            return (
              <Pressable
                key={i}
                onPress={() => {
                  haptic.tap();
                  setAnswers((a) => {
                    const n = [...a];
                    n[step] = i;
                    return n;
                  });
                }}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                accessibilityLabel={o}
                style={[styles.option, active && styles.optionActive]}>
                <View style={[styles.radio, active && { borderColor: C.lima, backgroundColor: C.lima }]}>{active ? <Icon name="checkmark" size={14} color={C.ink} /> : null}</View>
                <T v="body" color={C.crema} style={[{ flex: 1 }, active && { fontFamily: F.bold }]}>
                  {o}
                </T>
              </Pressable>
            );
          })}
        </Animated.View>
        {submit.isError ? (
          <T v="small" color={C.cereza} style={{ marginTop: 12 }}>
            {errorMessage(submit.error)}
          </T>
        ) : null}
      </Screen>
      <View style={{ flexDirection: 'row', gap: 10, padding: S.xl, paddingBottom: insets.bottom + 16 }}>
        {step > 0 ? <Button title="Anterior" variant="outline" style={{ flex: 1, borderColor: C.inkLine }} onPress={() => setStep(step - 1)} /> : null}
        <Button
          title={last ? 'Enviar respuestas' : 'Siguiente'}
          variant="lima"
          style={{ flex: 1 }}
          disabled={selected === undefined}
          loading={submit.isPending}
          onPress={() => (last ? submit.mutate(q.questions.map((_, i) => answers[i] ?? 0)) : setStep(step + 1))}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: R.lg, backgroundColor: C.inkCard, borderWidth: 1, borderColor: C.inkLine },
  optionActive: { borderColor: C.lima, backgroundColor: 'rgba(201,231,166,0.08)' },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: C.inkMuted, alignItems: 'center', justifyContent: 'center' },
  score: { alignItems: 'center', gap: 8, padding: S.xl, borderRadius: R.xl, backgroundColor: C.inkCard, marginVertical: S.xl, borderWidth: 1, borderColor: C.inkLine },
  review: { padding: 14, borderRadius: R.md, backgroundColor: C.inkCard, gap: 6, borderLeftWidth: 3 },
});
