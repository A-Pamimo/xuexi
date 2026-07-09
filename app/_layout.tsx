import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Body, Loading, Screen } from '../src/components/ui';
import { BootScreen } from '../src/components/BootScreen';
import { useApp } from '../src/stores/appStore';
import { useWebFocusRing } from '../src/lib/motion';
import { colors } from '../src/theme';

export default function RootLayout() {
  const ready = useApp((s) => s.ready);
  const initError = useApp((s) => s.initError);
  const init = useApp((s) => s.init);
  const [booting, setBooting] = React.useState(true);

  useWebFocusRing(); // web-only keyboard :focus-visible ring (no-op on native)

  useEffect(() => {
    void init();
  }, [init]);

  // The arcade boot overlay dismisses on ready OR initError, so a failed init
  // never leaves it stuck masking the error screen.
  const settled = ready || initError;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
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
