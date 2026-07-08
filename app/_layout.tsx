import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Body, Loading, Screen } from '../src/components/ui';
import { useApp } from '../src/stores/appStore';
import { colors } from '../src/theme';

export default function RootLayout() {
  const ready = useApp((s) => s.ready);
  const initError = useApp((s) => s.initError);
  const init = useApp((s) => s.init);

  useEffect(() => {
    void init();
  }, [init]);

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
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
