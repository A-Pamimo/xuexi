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
import { NotoSerifSC_500Medium } from '@expo-google-fonts/noto-serif-sc/500Medium';
import { MaShanZheng_400Regular } from '@expo-google-fonts/ma-shan-zheng/400Regular';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Body, Loading, Screen } from '../src/components/ui';
import { BootScreen } from '../src/components/BootScreen';
import { BrushFilter, PAPER_TEXTURE_URI } from '../src/components/StampIcon';
import { useApp } from '../src/stores/appStore';
import { useWebFocusRing } from '../src/lib/motion';
import { useTheme } from '../src/lib/appearance';

export default function RootLayout() {
  const ready = useApp((s) => s.ready);
  const initError = useApp((s) => s.initError);
  const init = useApp((s) => s.init);
  const [booting, setBooting] = React.useState(true);
  const { colors, scheme } = useTheme();

  // Gate first paint ONLY on the small Inter UI set (~1 MB) so the app boots fast.
  // The big CJK families (Noto Serif SC ~15 MB, Ma Shan Zheng ~5.9 MB) would add
  // ~20 s to a cold WEB load if gated, so they stream in the background instead:
  // hanzi/wordmarks render in the system CJK fallback for a beat, then swap in
  // when ready. On native the fonts are bundled, so there's no swap either way.
  const [uiFontsLoaded, uiFontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });
  // Fire-and-forget the heavy display fonts (not part of the boot gate).
  useFonts({ NotoSerifSC_500Medium, MaShanZheng_400Regular });
  const fontsReady = uiFontsLoaded || !!uiFontError;

  useWebFocusRing(); // web-only keyboard :focus-visible ring (no-op on native)

  // Web: keep the global chrome (focus ring + document background) in sync with
  // the theme so the ring recolors and there's no wrong-mode background flash
  // behind the app root. No-op on native.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const root = document.documentElement;
    root.style.setProperty('--xuexi-focus', colors.primary);
    root.style.backgroundColor = colors.bg;
    if (document.body) {
      document.body.style.backgroundColor = colors.bg;
      // Subtle rice-paper grain over the base color (imperial texture). The noise
      // is a tiny inline SVG data-URI; opacity differs by mode. No-op on native.
      document.body.style.backgroundImage = PAPER_TEXTURE_URI(scheme === 'dark');
    }
  }, [colors.primary, colors.bg, scheme]);

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
        <BrushFilter />
        {ready && fontsReady ? (
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.bg },
              animation: 'fade',
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="landing" />
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
