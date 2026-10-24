// Reminder buttons that work without opening the app (APK 1.5.0+). For a button tap while S.P.I.D.E.R. isn't on
// screen, expo-notifications runs this task (headless if the app was killed): it claims the tap, queues the
// action for the store, or schedules the snooze itself, and clears the notification. Defined from the app entry
// (src/background.ts): a headless start loads no route files. No theme import (see bg-config.ts).
import { requireOptionalNativeModule } from 'expo';
import { cancelScheduledNotificationAsync } from 'expo-notifications/build/cancelScheduledNotificationAsync';
import { dismissNotificationAsync } from 'expo-notifications/build/dismissNotificationAsync';
import { getAllScheduledNotificationsAsync } from 'expo-notifications/build/getAllScheduledNotificationsAsync';
import type { NotificationContent, NotificationResponse } from 'expo-notifications/build/Notifications.types';
import { SchedulableTriggerInputTypes } from 'expo-notifications/build/Notifications.types';
import { registerTaskAsync } from 'expo-notifications/build/registerTaskAsync';
import { scheduleNotificationAsync } from 'expo-notifications/build/scheduleNotificationAsync';
import { mapNotificationResponse } from 'expo-notifications/build/utils/mapNotificationResponse';
import { Platform } from 'react-native';

import { refreshWidget } from '@/widgets';

import { bgTone, readBgConfig } from './bg-config';
import { dayKey, MIN } from './dates';
import { line } from './lines';
import { claimTap, enqueue, setSilentButtonsReady } from './pending-actions';
import { actionFromButton, SILENT_BUTTONS, statusWithGlass, tapKey, type QueuedAction } from './reminder-actions';

export const SILENT_TASK = 'spider-silent-buttons';

// The same ids as in notifications.ts (not imported: it pulls in the theme).
const SNOOZE_ID = 'snooze-water';
const STATUS_ID = 'status-line';
const WATER_CATEGORY = 'spider_water';
const STATUS_CATEGORY = 'spider_status';
const REMIND_CHANNEL = 'spider-reminders';
const STATUS_CHANNEL = 'spider-status';

/**
 * With no app running to take a queued tap, the task tidies up after it: the habit's other reminders for that
 * day go, the widget shows the tap, and the status line is posted again (a new date, so the next "+1 glass" on
 * it has a new tap key) with the glass in its water figure. A running app does all this itself when it plans.
 */
async function afterQueuedAlone(a: QueuedAction, notificationId: string, content: NotificationContent) {
  if (a.kind === 'habit') {
    const all = await getAllScheduledNotificationsAsync();
    const same = all.filter((n) => n.content.data?.habitId === a.habitId && n.content.data?.day === a.day);
    await Promise.all(same.map((n) => cancelScheduledNotificationAsync(n.identifier)));
  }
  if (a.kind === 'glass' || a.kind === 'coffee') await refreshWidget();
  if (notificationId === STATUS_ID && a.kind === 'glass') {
    const cfg = await readBgConfig();
    await scheduleNotificationAsync({
      identifier: STATUS_ID,
      content: {
        title: content.title ?? '🕷️ S.P.I.D.E.R.',
        body: statusWithGlass(content.body ?? '', cfg?.glassMl ?? 250),
        color: cfg?.color,
        sticky: true,
        autoDismiss: false,
        categoryIdentifier: STATUS_CATEGORY,
      },
      trigger: { channelId: STATUS_CHANNEL },
    });
  }
}

async function handleTap(raw: NotificationResponse) {
  const r = mapNotificationResponse(raw);
  const id = r.notification.request.identifier;
  if (!SILENT_BUTTONS.has(r.actionIdentifier)) return; // the body tap and "Focus" open the app instead
  const a = actionFromButton(r.actionIdentifier, r.notification.request.content.data);
  if (!a || a.kind === 'focus' || a.kind === 'gymMove') return;
  if (!(await claimTap(tapKey(id, r.actionIdentifier, r.notification.date)))) return;
  if (a.kind === 'snooze') {
    const cfg = await readBgConfig();
    const due = Date.now() + 30 * MIN;
    await scheduleNotificationAsync({
      identifier: SNOOZE_ID,
      content: {
        title: '💧 Hydration check (snoozed)',
        // The tone of the day it goes off on, and never a retired line.
        body: line('waterRemind', bgTone(cfg, dayKey(due)), { name: cfg?.name || 'boss' }, cfg?.banned),
        color: cfg?.color,
        categoryIdentifier: WATER_CATEGORY,
      },
      trigger: { type: SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 30 * (MIN / 1000), channelId: REMIND_CHANNEL },
    });
  } else if (!(await enqueue(a))) {
    await afterQueuedAlone(a, id, r.notification.request.content).catch((e) => console.warn('[spider] tidying after a tap failed', e));
  }
  // The status line stays: the app (or afterQueuedAlone) posts it again.
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
