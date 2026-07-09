import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { Text } from 'react-native';
import { useApp } from '../../src/stores/appStore';
import { unlockAudio } from '../../src/lib/audio';
import * as juice from '../../src/lib/juice';
import { colors } from '../../src/theme';

function Icon({ label, color }: { label: string; color: string }) {
  return <Text style={{ fontSize: 20, color }}>{label}</Text>;
}

export default function TabsLayout() {
  const onboarded = useApp((s) => s.onboarded);
  if (!onboarded) return <Redirect href="/onboarding" />;

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
        tabBarStyle: {
          backgroundColor: colors.bgElevated,
          borderTopColor: colors.border,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textDim,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color }) => <Icon label="📜" color={color} />,
        }}
      />
      <Tabs.Screen
        name="reviews"
        options={{
          title: 'Learn',
          tabBarIcon: ({ color }) => <Icon label="📚" color={color} />,
        }}
      />
      <Tabs.Screen
        name="dojo"
        options={{
          title: 'Tone Dojo',
          tabBarIcon: ({ color }) => <Icon label="🥋" color={color} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stats',
          tabBarIcon: ({ color }) => <Icon label="📊" color={color} />,
        }}
      />
    </Tabs>
  );
}
