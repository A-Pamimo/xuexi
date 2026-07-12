import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';
import { fonts } from '../../src/theme';
import { useApp } from '../../src/stores/appStore';
import { unlockAudio } from '../../src/lib/audio';
import * as juice from '../../src/lib/juice';
import { useTheme } from '../../src/lib/appearance';

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
  if (!onboarded) return <Redirect href="/landing" />;

  return (
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
        sceneStyle: { backgroundColor: colors.bg },
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
  );
}
