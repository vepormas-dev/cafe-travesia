import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';

import { Field } from '@/components/form';
import { Button, Chip, IconButton, T } from '@/components/ui';
import { firebaseErrorMessage, useAuth } from '@/lib/auth';
import { env } from '@/lib/env';
import { haptic } from '@/lib/haptics';
import { LOGO_CLARO, PHOTOS } from '@/lib/images';
import { openWeb } from '@/lib/links';
import { C, R, S } from '@/theme';

const googleClientId = Platform.select({ ios: env.google.iosClientId, android: env.google.androidClientId, default: env.google.webClientId });

export default function Ingresar() {
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok?: boolean } | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'ios') void AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
  }, []);
  useEffect(() => {
    if (auth.signedIn) {
      haptic.success();
      router.replace('/academia');
    }
  }, [auth.signedIn]);

  const run = async (key: string, fn: () => Promise<void>) => {
    setMsg(null);
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      const t = firebaseErrorMessage(e);
      if (t) {
        haptic.error();
        setMsg({ text: t });
      }
    } finally {
      setBusy(null);
    }
  };

  const submit = () =>
    run('email', async () => {
      if (!email.trim() || password.length < 6) throw new Error('Escribe tu correo y una contraseña de al menos 6 caracteres.');
      if (mode === 'signup') {
        if (name.trim().length < 3) throw new Error('Escribe tu nombre completo.');
        await auth.signUpEmail(name, email, password);
      } else await auth.signInEmail(email, password);
    });

  return (
    <View style={{ flex: 1, backgroundColor: C.noche }}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
          <View style={{ height: 320 }}>
            <Image source={PHOTOS['latte-travesia']} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityLabel="Latte con arte en la barra de Café Travesía" />
            <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
              <Defs>
                <LinearGradient id="ing" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#111A31" stopOpacity="0.35" />
                  <Stop offset="1" stopColor="#111A31" stopOpacity="1" />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#ing)" />
            </Svg>
            <View style={{ position: 'absolute', top: insets.top + 8, right: 16 }}>
              <IconButton name="close" label="Cerrar" color={C.crema} bg="rgba(0,0,0,0.3)" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
            </View>
            <Animated.View entering={FadeInDown.duration(600)} style={{ position: 'absolute', bottom: 10, alignSelf: 'center', alignItems: 'center' }}>
              <Image source={LOGO_CLARO} style={{ width: 210, height: 140 }} contentFit="contain" accessibilityLabel="Café Travesía, la esencia de lo que somos" />
            </Animated.View>
          </View>

          <View style={[styles.panel, { paddingBottom: insets.bottom + 24 }]}>
            <T v="h2" center>
              {mode === 'login' ? 'Qué bueno verte de nuevo' : 'Únete a la travesía'}
            </T>
            <T v="body" center color={C.muted}>
              Tus pedidos, tu plan, tus cursos y tus Puntos Travesía en un solo lugar.
            </T>
            <View style={{ flexDirection: 'row', gap: 8, alignSelf: 'center' }}>
              <Chip label="Ingresar" active={mode === 'login'} onPress={() => setMode('login')} />
              <Chip label="Crear cuenta" active={mode === 'signup'} onPress={() => setMode('signup')} />
            </View>

            {!auth.configured ? (
              <View style={styles.msg}>
                <T v="small" color={C.tostado}>
                  El inicio de sesión aún no está configurado en esta versión (faltan las variables EXPO_PUBLIC_FIREBASE_*). Puedes explorar la app como invitado.
                </T>
              </View>
            ) : null}

            {mode === 'signup' ? <Field label="Nombre completo" value={name} onChangeText={setName} autoComplete="name" textContentType="name" /> : null}
            <Field label="Correo" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" />
            <Field label="Contraseña" value={password} onChangeText={setPassword} secureTextEntry autoComplete={mode === 'login' ? 'current-password' : 'new-password'} textContentType={mode === 'login' ? 'password' : 'newPassword'} onSubmitEditing={() => void submit()} />
            {msg ? (
              <View style={[styles.msg, msg.ok && { backgroundColor: '#E4E9DA', borderColor: '#C5CFB4' }]} accessibilityLiveRegion="polite">
                <T v="small" color={msg.ok ? C.montana : C.tostado}>
                  {msg.text}
                </T>
              </View>
            ) : null}
            <Button title={mode === 'login' ? 'Ingresar' : 'Crear mi cuenta'} full loading={busy === 'email'} disabled={!auth.configured} onPress={() => void submit()} />
            {mode === 'login' ? (
              <Button
                title="Olvidé mi contraseña"
                variant="ghost"
                small
                disabled={!auth.configured}
                onPress={() =>
                  void run('reset', async () => {
                    if (!email.trim()) throw new Error('Escribe tu correo para enviarte el enlace.');
                    await auth.resetPassword(email);
                    setMsg({ text: 'Te enviamos un correo para restablecer tu contraseña.', ok: true });
                  })
                }
              />
            ) : null}

            <View style={styles.or}>
              <View style={styles.line} />
              <T v="small" color={C.muted}>
                o continúa con
              </T>
              <View style={styles.line} />
            </View>

            {appleAvailable && auth.configured ? (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={mode === 'login' ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN : AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={R.md}
                style={{ height: 50 }}
                onPress={() => void run('apple', auth.signInApple)}
              />
            ) : null}
            {googleClientId && auth.configured ? (
              <GoogleButton onToken={(id, at) => run('google', () => auth.signInGoogle(id, at))} loading={busy === 'google'} />
            ) : (
              <Button title="Google (no configurado)" variant="outline" icon="logo-google" disabled full />
            )}

            <T v="small" color={C.muted} center style={{ marginTop: 8 }}>
              Al continuar aceptas los{' '}
              <T v="small" style={{ textDecorationLine: 'underline' }} onPress={() => void openWeb('/terminos')}>
                términos
              </T>{' '}
              y la{' '}
              <T v="small" style={{ textDecorationLine: 'underline' }} onPress={() => void openWeb('/privacidad')}>
                política de datos
              </T>
              .
            </T>
            <Button title="Explorar la Academia" variant="ghost" small onPress={() => router.replace('/academia')} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/** Google con expo-auth-session: obtiene id_token y lo cambia por credencial de Firebase. */
function GoogleButton({ onToken, loading }: { onToken: (idToken: string, accessToken?: string) => Promise<void> | void; loading: boolean }) {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: env.google.iosClientId || undefined,
    androidClientId: env.google.androidClientId || undefined,
    webClientId: env.google.webClientId || undefined,
  });
  const handled = useRef<unknown>(null);
  useEffect(() => {
    if (response?.type === 'success' && handled.current !== response) {
      handled.current = response;
      const idToken = response.params.id_token ?? response.authentication?.idToken;
      if (idToken) void onToken(idToken, response.authentication?.accessToken);
    }
  }, [response, onToken]);
  return <Button title="Continuar con Google" variant="outline" icon="logo-google" full loading={loading} disabled={!request} onPress={() => void promptAsync()} />;
}

const styles = StyleSheet.create({
  panel: { flex: 1, backgroundColor: C.crema, borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -24, padding: S.xl, gap: 14 },
  msg: { padding: 12, borderRadius: R.md, backgroundColor: '#FBEBD3', borderWidth: 1, borderColor: '#F0CF9E' },
  or: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 4 },
  line: { flex: 1, height: 1, backgroundColor: C.line },
});
