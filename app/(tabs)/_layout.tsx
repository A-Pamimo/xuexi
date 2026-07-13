import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { Platform, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts } from '../../src/theme';
import { useApp } from '../../src/stores/appStore';
import { unlockAudio } from '../../src/lib/audio';
import * as juice from '../../src/lib/juice';
import { useTheme } from '../../src/lib/appearance';
import { ScrollRoller } from '../../src/components/ScrollRoller';
import { AmbientBackground } from '../../src/components/AmbientBackground';
import { AMBIENT_BACKGROUND } from '../../src/lib/flags';

/** A tab glyph (single hanzi) with a small cinnabar diamond under the active one. */
function TabIcon({ glyph, color, focused }: { glyph: string; color: string; focused: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 22, lineHeight: 26, color, fontFamily: fonts.serif }}>{glyph}</Text>
      <View style={{ height: 8, alignItems: 'center', justifyContent: 'center' }}>
        {focused ? (
          <View
            style={{
              width: 6,
              height: 6,
              backgroundColor: colors.primary,
              transform: [{ rotate: '45deg' }],
            }}
          />
        ) : null}
      </View>
    </View>
  );
}

const TABS: { name: string; title: string; glyph: string }[] = [
  { name: 'index', title: 'Feed', glyph: '流' },
  { name: 'reviews', title: 'Learn', glyph: '学' },
  { name: 'dojo', title: 'Dojo', glyph: '练' },
  { name: 'stats', title: 'Stats', glyph: '绩' },
];

export default function TabsLayout() {
  const onboarded = useApp((s) => s.onboarded);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  if (!onboarded) return <Redirect href="/landing" />;

  return (
    // Frame the whole app as a mounted hanging scroll: wooden rollers above and
    // below the content. The wrapper absorbs the device insets so the rollers
    // hug the visible edges (Screen's SafeAreaView measures its own frame, so
    // it won't double-pad below the top roller).
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      {/* The ONE ambient shader mount — all tabs share this single GL context
          (their scenes render transparent above it). Mounting per screen would
          keep up to four live GL contexts, since visited tabs stay mounted.
          Native only: on web react-navigation paints inactive scenes, so a
          transparent focused scene shows STALE SIBLING TABS, not the shader —
          web scenes stay opaque (below) and skip the aurora entirely. */}
      {AMBIENT_BACKGROUND && Platform.OS !== 'web' ? <AmbientBackground /> : null}
      <ScrollRoller edge="top" />
      <Tabs
        screenListeners={{
          // The tab press is exactly the gesture browsers require to unlock audio,
          // so unlock first, then the soft nav tick actually sounds on web too.
          tabPress: () => {
            unlockAudio();
            juice.nav();
          },
        }}
        screenOptions={{
          headerShown: false,
          // Native: transparent scenes so the shared ambient backdrop shows
          // through. Web: opaque paper — inactive tabs stay painted there, and
          // transparency would let them ghost through the focused scene.
          sceneStyle: { backgroundColor: Platform.OS === 'web' ? colors.bg : 'transparent' },
          tabBarStyle: {
            backgroundColor: colors.bgElevated,
            borderTopColor: colors.borderStrong,
            borderTopWidth: 2,
            height: 76,
            paddingBottom: 10,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontFamily: fonts.serif,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textDim,
        }}
      >
        {TABS.map((t) => (
          <Tabs.Screen
            key={t.name}
            name={t.name}
            options={{
              title: t.title,
              tabBarIcon: ({ color, focused }) => (
                <TabIcon glyph={t.glyph} color={color} focused={focused} />
              ),
            }}
          />
        ))}
      </Tabs>
      <ScrollRoller edge="bottom" />
    </View>
  );
}
