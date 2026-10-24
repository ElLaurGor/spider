// The warnings check while S.P.I.D.E.R. isn't running (APK 1.5.0+). Android's WorkManager starts this task about
// every 30 minutes (only while the app is in the background, and only with a network). It fetches SMHI warnings
// and VMAs for the county in bg-config.ts and announces new ones, triaged like the app does (triageAlerts). The
// app and this task share the seen-list below, so a warning is announced once whichever sees it first.
// A storm (orange, red, VMA) that starts meanwhile also calms what's already planned for its days (calmPlanned).
// No theme import: a headless start should stay small.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requireOptionalNativeModule } from 'expo';
import { cancelScheduledNotificationAsync } from 'expo-notifications/build/cancelScheduledNotificationAsync';
import { getAllScheduledNotificationsAsync } from 'expo-notifications/build/getAllScheduledNotificationsAsync';
import { getPermissionsAsync } from 'expo-notifications/build/NotificationPermissions';
import { SchedulableTriggerInputTypes } from 'expo-notifications/build/Notifications.types';
import { scheduleNotificationAsync } from 'expo-notifications/build/scheduleNotificationAsync';
import { Platform } from 'react-native';

import { bgTone, markStormWaiting, readBgConfig, writeBgConfig, type BgConfig } from './bg-config';
import { line } from './lines';
import { ALERT_LABEL, fetchSmhi, fetchVma, mergeSeen, triageAlerts, type Alert } from './outside';
import { locked } from './pending-actions';
import { stormPlan } from './reminder-times';
import { stormDays } from './storm';

export const ALERT_TASK = 'spider-warnings-check';
const SEEN_KEY = 'spider:bg:seen';
const INTERVAL_MIN = 30;
const WARN_CHANNEL = 'spider-warnings'; // notifications.ts CH.warn, made when the app starts (not imported: it pulls in the theme)

export async function readSeenLedger(): Promise<Record<string, number>> {
  try {
    const raw = await AsyncStorage.getItem(SEEN_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

/**
 * Adds to the shared seen-list (mergeSeen: the later time wins, 30-day-old entries go). One writer at a time: the
 * app and this task share a JS runtime, and an entry lost between them would announce a warning again.
 */
export function addToSeenLedger(seen: Record<string, number>) {
  return locked(async () => {
    await AsyncStorage.setItem(SEEN_KEY, JSON.stringify(mergeSeen(await readSeenLedger(), seen)));
  });
}

/** One check. A source that fails is skipped this time: nothing is announced from a guess. */
export async function checkWarnings(now = Date.now()) {
  const cfg = await readBgConfig();
  if (!cfg?.county || (!cfg.notifySmhi && !cfg.notifyVma)) return;
  if (!(await getPermissionsAsync()).granted) return;
  const [vma, smhi] = await Promise.all([
    cfg.notifyVma ? fetchVma(cfg.county, cfg.town, cfg.municipality).catch(() => null) : null,
    cfg.notifySmhi ? fetchSmhi(cfg.county).catch(() => null) : null,
  ]);
  const list: Alert[] = [...(vma ?? []), ...(smhi ?? [])];
  if (!list.length) return;
  const { fresh, seen, changed } = triageAlerts(list, await readSeenLedger(), now);
  for (const x of fresh) {
    const head = x.source === 'VMA' ? '🚨 VMA' : `⚠️ ${ALERT_LABEL[x.level]}`;
    await scheduleNotificationAsync({
      identifier: `alert-${x.id}`, // the same as the app's: an escalation replaces it; opens Outside
      content: { title: `${head}: ${x.title}`, body: x.text.slice(0, 200), color: cfg.color },
      trigger: { type: SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1, channelId: WARN_CHANNEL },
    });
  }
  if (changed) await addToSeenLedger(seen);
  // Days the app planned in a normal tone (it didn't know): they go kind now. Already kind means the app saw it.
  const calm = stormDays(list, now).filter((k) => bgTone(cfg, k) > 1);
  if (calm.length) await calmPlanned(cfg, calm);
}

/**
 * The Storm protocol while the app is closed: the roasts already planned for `days` are taken back and their water
 * reminders get kind words (stormPlan), lines written in the background use the kind tone, and the app checks
 * the warnings as soon as it's opened. The app's next replan then plans those days kind itself.
 */
export async function calmPlanned(cfg: BgConfig, days: string[]) {
  const scheduled = await getAllScheduledNotificationsAsync();
  const { cancel, soften } = stormPlan(
    scheduled.map((n) => n.identifier),
    days,
  );
  await Promise.all(cancel.map((id) => cancelScheduledNotificationAsync(id).catch(() => {})));
  for (const n of scheduled.filter((x) => soften.includes(x.identifier))) {
    const trigger = n.trigger as { value?: unknown; channelId?: string | null } | null;
    if (typeof trigger?.value !== 'number' || trigger.value <= Date.now()) continue;
    const progress = n.content.body?.match(/ \(\d+\/\d+ ml\)$/)?.[0] ?? '';
    await scheduleNotificationAsync({
      identifier: n.identifier, // replaces it, at the same time
      content: {
        title: n.content.title ?? '💧 Hydration check',
        body: line('waterRemind', 1, { name: cfg.name }, cfg.banned) + progress,
        color: cfg.color,
        categoryIdentifier: n.content.categoryIdentifier ?? undefined,
        data: n.content.data ?? undefined,
      },
      trigger: { type: SchedulableTriggerInputTypes.DATE, date: trigger.value, channelId: trigger.channelId ?? undefined },
    }).catch(() => {});
  }
  await writeBgConfig({ ...cfg, tones: { ...cfg.tones, ...Object.fromEntries(days.map((k) => [k, 1])) } });
  await markStormWaiting();
}

/** Defines the task and asks WorkManager to run it. Skipped in Expo Go and on installs without the modules. */
export function setUpWarningsCheck() {
  if (Platform.OS !== 'android' || !requireOptionalNativeModule('ExpoTaskManager') || !requireOptionalNativeModule('ExpoBackgroundTask')) return;
  /* eslint-disable @typescript-eslint/no-require-imports */
  const TaskManager = require('expo-task-manager') as typeof import('expo-task-manager');
  const BackgroundTask = require('expo-background-task') as typeof import('expo-background-task');
  /* eslint-enable @typescript-eslint/no-require-imports */
  TaskManager.defineTask(ALERT_TASK, async () => {
    try {
      await checkWarnings();
      return BackgroundTask.BackgroundTaskResult.Success;
    } catch (e) {
      console.warn('[spider] background warnings check failed', e);
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  });
  // Registering again on every start keeps an already-scheduled run (BackgroundTaskScheduler skips it).
  BackgroundTask.registerTaskAsync(ALERT_TASK, { minimumInterval: INTERVAL_MIN }).catch((e) =>
    console.warn('[spider] background warnings check unavailable', e),
  );
}
