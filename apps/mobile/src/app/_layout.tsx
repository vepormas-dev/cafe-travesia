import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { QueryClientProvider } from '@tanstack/react-query';
import { PlayfairDisplay_400Regular, PlayfairDisplay_400Regular_Italic, PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { CaveatBrush_400Regular } from '@expo-google-fonts/caveat-brush';
import * as WebBrowser from 'expo-web-browser';

import { ensureMode } from '@/lib/api';
import { AuthProvider } from '@/lib/auth';
import { cart } from '@/lib/cart';
import { refreshPushRegistration, usePushObserver } from '@/lib/push';
import { queryClient, restoreQueryCache } from '@/lib/query';
import { C } from '@/theme';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);
SplashScreen.setOptions({ duration: 350, fade: true });
// Cierra la ventana emergente de OAuth en la vista web.
if (Platform.OS === 'web') WebBrowser.maybeCompleteAuthSession();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_400Regular_Italic,
    PlayfairDisplay_700Bold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
    CaveatBrush_400Regular,
  });
  usePushObserver();

  useEffect(() => {
    void restoreQueryCache();
    void cart.load();
    void ensureMode().then(() => refreshPushRegistration());
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) void SplashScreen.hideAsync().catch(() => undefined);
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.crema }, animation: 'slide_from_right' }}>
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
          <Stack.Screen name="leccion/[id]" options={{ contentStyle: { backgroundColor: C.ink } }} />
          <Stack.Screen name="quiz/[id]" options={{ contentStyle: { backgroundColor: C.ink } }} />
          <Stack.Screen name="curso/[slug]" options={{ contentStyle: { backgroundColor: C.ink } }} />
          <Stack.Screen name="ingresar" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="chat" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="carrito" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="pago/resultado" options={{ gestureEnabled: false }} />
        </Stack>
      </AuthProvider>
    </QueryClientProvider>
  );
}
