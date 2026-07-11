import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import React, { useEffect } from 'react';
import { useFonts } from 'expo-font';
// Import each weight from its own subpath, NOT the package root — importing from
// the index pulls EVERY weight into the bundle (Noto Serif SC is ~15 MB/weight,
// so the full family is >100 MB). Subpaths bundle only the weights we load.
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { Inter_800ExtraBold } from '@expo-google-fonts/inter/800ExtraBold';
import { SpaceGrotesk_500Medium } from '@expo-google-fonts/space-grotesk/500Medium';
import { SpaceGrotesk_600SemiBold } from '@expo-google-fonts/space-grotesk/600SemiBold';
import { SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk/700Bold';
import { NotoSerifSC_500Medium } from '@expo-google-fonts/noto-serif-sc/500Medium';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Body, Loading, Screen } from '../src/components/ui';
import { BootScreen } from '../src/components/BootScreen';
import { useApp } from '../src/stores/appStore';
import { useWebFocusRing } from '../src/lib/motion';
import { useTheme } from '../src/lib/appearance';

export default function RootLayout() {
  const ready = useApp((s) => s.ready);
  const initError = useApp((s) => s.initError);
  const init = useApp((s) => s.init);
  const [booting, setBooting] = React.useState(true);
  const { colors, scheme } = useTheme();

  // The literary type system (Inter / Space Grotesk / Noto Serif SC). We gate the
  // app render on this so first paint isn't a flash of the system font; the
  // BootScreen covers the load. On a font error we proceed anyway (system
  // fallback) rather than trap the user behind a spinner.
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    NotoSerifSC_500Medium,
  });
  const fontsReady = fontsLoaded || !!fontError;

  useWebFocusRing(); // web-only keyboard :focus-visible ring (no-op on native)

  // Web: keep the global chrome (focus ring + document background) in sync with
  // the theme so the ring recolors and there's no wrong-mode background flash
  // behind the app root. No-op on native.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const root = document.documentElement;
    root.style.setProperty('--xuexi-focus', colors.primary);
    root.style.backgroundColor = colors.bg;
    if (document.body) document.body.style.backgroundColor = colors.bg;
  }, [colors.primary, colors.bg]);

  useEffect(() => {
    void init();
  }, [init]);

  // The arcade boot overlay dismisses once the store AND fonts are ready, or on
  // initError, so a failed init never leaves it stuck masking the error screen.
  const settled = (ready && fontsReady) || initError;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        {ready && fontsReady ? (
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.bg },
              animation: 'fade',
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="onboarding" options={{ presentation: 'modal' }} />
          </Stack>
        ) : initError ? (
          <Screen center>
            <Body style={{ fontSize: 40 }}>😕</Body>
            <Body style={{ textAlign: 'center', marginTop: 12 }}>
              Couldn&apos;t load xuexi. Please reload the app.
            </Body>
          </Screen>
        ) : (
          <Loading label="Loading xuexi…" />
        )}
        {booting ? <BootScreen settled={settled} onFinish={() => setBooting(false)} /> : null}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
