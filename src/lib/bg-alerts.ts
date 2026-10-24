// The warnings check while S.P.I.D.E.R. isn't running (APK 1.5.0+). Android's WorkManager starts this task about
// every 30 minutes (only while the app is in the background, and only with a network). It fetches SMHI warnings
// and VMAs for the county in bg-config.ts and announces new ones, triaged like the app does (triageAlerts). The
// app and this task share the seen-list below, so a warning is announced once whichever sees it first.
// No theme import: a headless start should stay small.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requireOptionalNativeModule } from 'expo';
import { getPermissionsAsync } from 'expo-notifications/build/NotificationPermissions';
import { SchedulableTriggerInputTypes } from 'expo-notifications/build/Notifications.types';
import { scheduleNotificationAsync } from 'expo-notifications/build/scheduleNotificationAsync';
import { Platform } from 'react-native';

import { readBgConfig } from './bg-config';
import { ALERT_LABEL, fetchSmhi, fetchVma, mergeSeen, triageAlerts, type Alert } from './outside';
import { locked } from './pending-actions';

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
