/**
 * Reminder settings — a daily-nudge on/off switch + an hour stepper, bound to the
 * persisted `reminderPrefs` (appStore). Sits on the Stats screen beside Appearance
 * so it needs no new route. Setting a pref reconciles the on-device schedule via
 * s.setReminderPrefs (→ scheduleReminders); everything is a clean no-op on web,
 * where scheduling isn't supported — we surface that honestly with a caption.
 */
import React from 'react';
import { Platform, Pressable, StyleSheet, Switch, View } from 'react-native';
import { Body, Caption, Card } from './ui';
import { useApp } from '../stores/appStore';
import { useTheme } from '../lib/appearance';
import { radius, spacing } from '../theme';
import * as juice from '../lib/juice';

/** 24h hour → "7:00 PM" (matches spec's example format). */
function formatHour(hour: number): string {
  const h = ((hour % 24) + 24) % 24;
  const period = h < 12 ? 'AM' : 'PM';
  const twelve = h % 12 === 0 ? 12 : h % 12;
  return `${twelve}:00 ${period}`;
}

export function ReminderSettings() {
  const prefs = useApp((s) => s.reminderPrefs);
  const setReminderPrefs = useApp((s) => s.setReminderPrefs);
  const { colors } = useTheme();
  // Reminders schedule natively only; web has no worthwhile scheduling (see
  // notifications.ts), so we still persist the pref but flag the limitation.
  const nativeOnly = Platform.OS === 'web';

  const setEnabled = (enabled: boolean) => {
    juice.tap();
    setReminderPrefs({ ...prefs, enabled });
  };
  const stepHour = (delta: number) => {
    juice.tap();
    const hour = ((prefs.hour + delta) % 24 + 24) % 24;
    setReminderPrefs({ ...prefs, hour });
  };

  return (
    <Card style={{ marginTop: spacing(2) }}>
      <Caption>reminders</Caption>

      <View style={styles.row}>
        <Body style={{ fontWeight: '700' }}>Daily reminder</Body>
        <Switch
          accessibilityRole="switch"
          accessibilityLabel="Daily reminder"
          accessibilityState={{ checked: prefs.enabled }}
          value={prefs.enabled}
          onValueChange={setEnabled}
          trackColor={{ false: colors.surfaceAlt, true: colors.primarySoft }}
          thumbColor={prefs.enabled ? colors.primary : colors.borderStrong}
        />
      </View>

      <View style={[styles.row, { opacity: prefs.enabled ? 1 : 0.5 }]}>
        <Body dim>Remind me at</Body>
        <View style={styles.stepper}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Earlier hour"
            disabled={!prefs.enabled}
            onPress={() => stepHour(-1)}
            hitSlop={8}
            style={[styles.step, { borderColor: colors.border }]}
          >
            <Body style={{ fontWeight: '800' }}>−</Body>
          </Pressable>
          <Body style={[styles.hour, { fontWeight: '800' }]}>{formatHour(prefs.hour)}</Body>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Later hour"
            disabled={!prefs.enabled}
            onPress={() => stepHour(1)}
            hitSlop={8}
            style={[styles.step, { borderColor: colors.border }]}
          >
            <Body style={{ fontWeight: '800' }}>+</Body>
          </Pressable>
        </View>
      </View>

      {nativeOnly ? (
        <Caption style={{ marginTop: spacing(1) }}>
          Reminders are delivered on the mobile app — the web version can&apos;t schedule
          notifications.
        </Caption>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing(1.5),
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing(1) },
  step: {
    minWidth: 44,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hour: { minWidth: 84, textAlign: 'center' },
});
