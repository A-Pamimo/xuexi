import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import React, { useEffect } from 'react';
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

  // The arcade boot overlay dismisses on ready OR initError, so a failed init
  // never leaves it stuck masking the error screen.
  const settled = ready || initError;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        {ready ? (
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
