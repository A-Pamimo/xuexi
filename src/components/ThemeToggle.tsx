/**
 * Appearance control — a System / Light / Dark segmented control bound to the
 * persisted `themeMode` (appStore). Lives on the Stats screen (the "about you"
 * surface) so it needs no new route. 'system' follows the OS; the resolved
 * palette updates live via useTheme().
 */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Body, Caption, Card } from './ui';
import { useApp } from '../stores/appStore';
import { useTheme } from '../lib/appearance';
import type { ThemeMode } from '../lib/types';
import { radius, spacing } from '../theme';
import * as juice from '../lib/juice';

const OPTIONS: { mode: ThemeMode; label: string }[] = [
  { mode: 'system', label: 'System' },
  { mode: 'light', label: 'Light' },
  { mode: 'dark', label: 'Dark' },
];

export function ThemeToggle() {
  const mode = useApp((s) => s.themeMode);
  const setThemeMode = useApp((s) => s.setThemeMode);
  const { colors } = useTheme();
  return (
    <Card style={{ marginTop: spacing(2) }}>
      <Caption>appearance</Caption>
      <View
        style={styles.row}
        accessibilityRole="radiogroup"
        accessibilityLabel="Theme"
      >
        {OPTIONS.map((o) => {
          const active = mode === o.mode;
          return (
            <Pressable
              key={o.mode}
              accessibilityRole="radio"
              accessibilityState={{ selected: active, checked: active }}
              accessibilityLabel={`${o.label} theme`}
              onPress={() => {
                juice.tap();
                setThemeMode(o.mode);
              }}
              style={[
                styles.seg,
                {
                  borderColor: active ? colors.primary : colors.border,
                  backgroundColor: active ? colors.primarySoft : 'transparent',
                },
              ]}
            >
              <Body style={{ fontWeight: '700', color: active ? colors.text : colors.textDim }}>
                {o.label}
              </Body>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing(1), marginTop: spacing(1) },
  seg: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(1),
  },
});
