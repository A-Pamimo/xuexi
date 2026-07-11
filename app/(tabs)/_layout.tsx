import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { BarChart2, BookOpen, Layers, Mic2 } from 'lucide-react-native';
import { fonts } from '../../src/theme';
import { useApp } from '../../src/stores/appStore';
import { unlockAudio } from '../../src/lib/audio';
import * as juice from '../../src/lib/juice';
import { useTheme } from '../../src/lib/appearance';

export default function TabsLayout() {
  const onboarded = useApp((s) => s.onboarded);
  const { colors } = useTheme();
  if (!onboarded) return <Redirect href="/onboarding" />;

  return (
    // Scenes keep an opaque base so inactive tabs never bleed through; each tab
    // screen renders its own ambient backdrop (behind content, in front of this
    // base). Cards / the tab bar stay opaque for text legibility.
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
          borderTopColor: colors.border,
          height: 68,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: fonts.sansBold,
          letterSpacing: 0.6,
          textTransform: 'uppercase',
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textDim,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color }) => <Layers size={22} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="reviews"
        options={{
          title: 'Learn',
          tabBarIcon: ({ color }) => <BookOpen size={22} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="dojo"
        options={{
          title: 'Tone Dojo',
          tabBarIcon: ({ color }) => <Mic2 size={22} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stats',
          tabBarIcon: ({ color }) => <BarChart2 size={22} color={color} strokeWidth={2} />,
        }}
      />
    </Tabs>
  );
}
