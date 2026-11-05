import { Platform } from 'react-native';

import { getLanguage, t, type Lang } from '@/i18n';
import type { PlannedReminder } from '@/utils/reminders';

/**
 * Thin wrapper around expo-notifications. Everything here is LOCAL (scheduled on the phone), so it needs no
 * server and no push token. Every function is safe to call anywhere: on web, or when the native module
 * misbehaves, it quietly does nothing instead of throwing.
 */

const CHANNEL_ID = 'reminders';

type NotificationsModule = typeof import('expo-notifications');

// expo-notifications throws the moment it is imported on Android inside Expo Go (SDK 53+ removed it there).
// Loading it lazily inside try/catch keeps the whole app from crashing: reminders then simply do nothing in Expo Go,
// and work normally in a development build or the real app.
let loaded: NotificationsModule | null | undefined;
function lib(): NotificationsModule | null {
  if (loaded === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      loaded = require('expo-notifications') as NotificationsModule;
    } catch {
      loaded = null;
    }
  }
  return loaded;
}

const supported = Platform.OS !== 'web';

export type PermissionState = 'granted' | 'denied' | 'undetermined' | 'unsupported';

let configured: Promise<void> | null = null;
// The Android channel name is user-visible (system settings), so it follows the app language.
let channelLang: Lang | null = null;

async function ensureChannel(Notifications: NotificationsModule) {
  const lang = getLanguage();
  if (Platform.OS !== 'android' || channelLang === lang) return;
  channelLang = lang;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: t('plan.notif.channel'),
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function configureNotifications(): Promise<void> {
  if (!supported) return;
  try {
    const Notifications = lib();
    if (Notifications) await ensureChannel(Notifications);
  } catch {
    // Not available in this environment.
  }
  if (!configured) {
    configured = (async () => {
      try {
        const Notifications = lib();
        if (!Notifications) return;
        // Show the banner even while the app is open (e.g. a budget alert right after you add an expense).
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldPlaySound: false,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });
      } catch {
        // Not available in this environment.
      }
    })();
  }
  return configured;
}

function toState(status: string): PermissionState {
  return status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined';
}

export async function getPermission(): Promise<PermissionState> {
  if (!supported) return 'unsupported';
  try {
    const Notifications = lib();
    if (!Notifications) return 'unsupported';
    const res = await Notifications.getPermissionsAsync();
    // iOS only asks once: after a "Don't allow" the system will not show the prompt again.
    if (res.status !== 'granted' && res.canAskAgain === false) return 'denied';
    return toState(res.status);
  } catch {
    return 'unsupported';
  }
}

export async function requestPermission(): Promise<PermissionState> {
  if (!supported) return 'unsupported';
  try {
    await configureNotifications();
    const Notifications = lib();
    if (!Notifications) return 'unsupported';
    const res = await Notifications.requestPermissionsAsync();
    return toState(res.status);
  } catch {
    return 'unsupported';
  }
}

// Scheduling is serialised so two quick changes can never interleave "cancel everything" with "schedule".
let queue: Promise<unknown> = Promise.resolve();
function enqueue(work: () => Promise<void>) {
  queue = queue.then(work, work).catch(() => {});
  return queue;
}

/** Replaces every scheduled reminder with `reminders` (the app owns all of its scheduled notifications). */
export function replaceScheduled(reminders: PlannedReminder[]) {
  if (!supported) return Promise.resolve();
  return enqueue(async () => {
    await configureNotifications();
    const Notifications = lib();
    if (!Notifications) return;
    await Notifications.cancelAllScheduledNotificationsAsync();
    for (const r of reminders) {
      await Notifications.scheduleNotificationAsync({
        identifier: r.id,
        content: { title: r.title, body: r.body },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.fireAt, channelId: CHANNEL_ID },
      });
    }
  });
}

export function cancelAllReminders() {
  if (!supported) return Promise.resolve();
  return enqueue(async () => {
    await lib()?.cancelAllScheduledNotificationsAsync();
  });
}

/** Shows a notification immediately. */
export function notifyNow(title: string, body: string) {
  if (!supported) return Promise.resolve();
  return enqueue(async () => {
    await configureNotifications();
    await lib()?.scheduleNotificationAsync({ content: { title, body }, trigger: null });
  });
}
