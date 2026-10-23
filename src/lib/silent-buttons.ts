// Reminder buttons that work without opening the app (APK 1.5.0+). For a button tap while S.P.I.D.E.R. isn't on
// screen, expo-notifications runs this task (headless if the app was killed): it claims the tap, queues the
// action for the store, or schedules the snooze itself, and clears the notification. Defined from the app entry
// (src/background.ts): a headless start loads no route files. No theme import (see bg-config.ts).
import { requireOptionalNativeModule } from 'expo';
import { dismissNotificationAsync } from 'expo-notifications/build/dismissNotificationAsync';
import type { NotificationResponse } from 'expo-notifications/build/Notifications.types';
import { SchedulableTriggerInputTypes } from 'expo-notifications/build/Notifications.types';
import { registerTaskAsync } from 'expo-notifications/build/registerTaskAsync';
import { scheduleNotificationAsync } from 'expo-notifications/build/scheduleNotificationAsync';
import { mapNotificationResponse } from 'expo-notifications/build/utils/mapNotificationResponse';
import { Platform } from 'react-native';

import { readBgConfig } from './bg-config';
import { MIN } from './dates';
import { line } from './lines';
import { claimTap, enqueue, setSilentButtonsReady } from './pending-actions';
import { actionFromButton, SILENT_BUTTONS, tapKey } from './reminder-actions';

export const SILENT_TASK = 'spider-silent-buttons';

// The same ids as in notifications.ts (not imported: it pulls in the theme).
const SNOOZE_ID = 'snooze-water';
const STATUS_ID = 'status-line';
const WATER_CATEGORY = 'spider_water';
const REMIND_CHANNEL = 'spider-reminders';

async function handleTap(raw: NotificationResponse) {
  const r = mapNotificationResponse(raw);
  const id = r.notification.request.identifier;
  if (!SILENT_BUTTONS.has(r.actionIdentifier)) return; // the body tap and "Focus" open the app instead
  const a = actionFromButton(r.actionIdentifier, r.notification.request.content.data);
  if (!a || a.kind === 'focus') return;
  if (!(await claimTap(tapKey(id, r.actionIdentifier, r.notification.date)))) return;
  if (a.kind === 'snooze') {
    const cfg = await readBgConfig();
    await scheduleNotificationAsync({
      identifier: SNOOZE_ID,
      content: {
        title: '💧 Hydration check (snoozed)',
        body: line('waterRemind', cfg?.savage ?? 5, { name: cfg?.name || 'boss' }),
        color: cfg?.color,
        categoryIdentifier: WATER_CATEGORY,
      },
      trigger: { type: SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 30 * (MIN / 1000), channelId: REMIND_CHANNEL },
    });
  } else {
    await enqueue(a);
  }
  // The status line stays: the app refreshes it the next time it plans.
  if (id !== STATUS_ID) await dismissNotificationAsync(id).catch(() => {});
}

/** Defines and registers the task. Resolves to whether silent buttons work on this install. */
export function setUpSilentButtons() {
  const ready = (async () => {
    if (Platform.OS !== 'android' || !requireOptionalNativeModule('ExpoTaskManager')) return false;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const TaskManager = require('expo-task-manager') as typeof import('expo-task-manager');
    TaskManager.defineTask<NotificationResponse | Record<string, unknown>>(SILENT_TASK, async ({ data, error }) => {
      if (error || !data || !('actionIdentifier' in data)) return;
      try {
        await handleTap(data as NotificationResponse);
      } catch (e) {
        console.warn('[spider] silent button failed', e);
      }
    });
    await registerTaskAsync(SILENT_TASK);
    return true;
  })().catch((e) => {
    console.warn('[spider] silent buttons unavailable', e);
    return false;
  });
  setSilentButtonsReady(ready);
  return ready;
}
