/**
 * Local learning reminders over expo-notifications — a single daily nudge to keep
 * the streak alive, scheduled entirely on-device (no push server, no network),
 * per the offline-first / no-runtime-network constraints.
 *
 * Web has no notification scheduling worth the native code weight, so every entry
 * point feature-detects and no-ops cleanly there — it never throws. The native
 * module is lazy-required (never on web) so web bundles don't pull native
 * scheduling code, mirroring how juice/persistence gate their platform APIs.
 */
import { Platform } from 'react-native';

/** User-facing reminder settings (mirrors appStore reminderPrefs). */
export interface ReminderPrefs {
  enabled: boolean;
  hour: number; // 0..23, local time
}

// Lazy-required so web bundles don't pull native notifications in.
type Notifications = typeof import('expo-notifications');
let notifs: Notifications | null = null;
function getNotifs(): Notifications | null {
  if (Platform.OS === 'web') return null;
  if (!notifs) {
    try {
      notifs = require('expo-notifications') as Notifications;
    } catch {
      return null; // native module missing from this build
    }
  }
  return notifs;
}

/**
 * Request OS permission to post notifications. Resolves `true` only when already-
 * or newly-granted; `false` on web, on denial, or if anything throws (callers
 * degrade to "reminders unavailable" rather than failing).
 */
export async function ensurePermission(): Promise<boolean> {
  const N = getNotifs();
  if (!N) return false;
  try {
    const current = await N.getPermissionsAsync();
    if (current.granted) return true;
    const asked = await N.requestPermissionsAsync();
    return asked.granted;
  } catch {
    return false; // permission API unavailable/unsupported — treat as no reminders
  }
}

/**
 * Reconcile scheduled reminders with `prefs`: always clear the previously-scheduled
 * ones first (so toggling off / changing the hour never leaves a stale trigger),
 * then, when enabled and permitted, schedule a single daily reminder at
 * `prefs.hour` local time. That one daily nudge doubles as the streak-danger
 * reminder — deliberately one trigger, kept simple. No-op on web.
 */
export async function scheduleReminders(prefs: ReminderPrefs): Promise<void> {
  const N = getNotifs();
  if (!N) return;
  try {
    await N.cancelAllScheduledNotificationsAsync();
    if (!prefs.enabled) return;
    if (!(await ensurePermission())) return;

    const hour = Math.max(0, Math.min(23, Math.floor(prefs.hour)));
    await N.scheduleNotificationAsync({
      content: {
        title: 'Time to learn Chinese',
        body: 'Keep your streak alive — a few minutes counts.',
      },
      trigger: {
        type: N.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute: 0,
      },
    });
  } catch {
    /* scheduling unsupported on this device/build — leave reminders off */
  }
}
