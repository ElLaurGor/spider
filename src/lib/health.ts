// Reads steps, heart rate and sleep from Android Health Connect. The Zepp app
// (Amazfit watch) writes there once "Health Connect" is linked in Zepp.
import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';

import { addDays, dayKey, startOfDay } from './dates';

type HC = typeof import('react-native-health-connect');

export type HealthStatus = 'unsupported' | 'unavailable' | 'needs-permission' | 'connected';

export type HealthData = {
  steps: number;
  stepsWeek: { key: string; steps: number }[]; // oldest first, today last
  heartAvg: number | null;
  heartMin: number | null;
  heartMax: number | null;
  heartLatest: { bpm: number; at: number } | null;
  restingHr: number | null;
  sleepMin: number | null; // last night
  updatedAt: number;
};

// Loading the library touches its native module, which only exists in the installed app,
// so it's required conditionally instead of imported.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const hc: HC | null = Platform.OS === 'android' && !isRunningInExpoGo() ? (require('react-native-health-connect') as HC) : null;

export const healthSupported = hc !== null;

const PERMISSIONS = [
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'HeartRate' },
  { accessType: 'read', recordType: 'RestingHeartRate' },
  { accessType: 'read', recordType: 'SleepSession' },
] as const;

let initialized = false;

async function ready(lib: HC) {
  if (!initialized) {
    if ((await lib.getSdkStatus()) !== lib.SdkAvailabilityStatus.SDK_AVAILABLE) return false;
    initialized = await lib.initialize();
  }
  return initialized;
}

export async function healthStatus(): Promise<HealthStatus> {
  if (!hc) return 'unsupported';
  if (!(await ready(hc))) return 'unavailable';
  const granted = await hc.getGrantedPermissions();
  return granted.some((p) => 'recordType' in p && p.recordType === 'Steps') ? 'connected' : 'needs-permission';
}

export async function connectHealth(): Promise<HealthStatus> {
  if (!hc || !(await ready(hc))) return healthStatus();
  await hc.requestPermission([...PERMISSIONS]);
  return healthStatus();
}

export function openHealthSettings() {
  hc?.openHealthConnectSettings();
}

const range = (start: Date, end: Date) => ({
  operator: 'between' as const,
  startTime: start.toISOString(),
  endTime: end.toISOString(),
});

/** Runs a read and turns "no permission / no data" into null instead of an error. */
async function safe<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

export async function readHealth(now = new Date()): Promise<HealthData | null> {
  const lib = hc;
  if (!lib || !(await ready(lib))) return null;
  const today = startOfDay(now);

  const stepsOn = async (dayStart: Date) => {
    const end = dayStart.getTime() === today.getTime() ? now : addDays(dayStart, 1);
    const r = await safe(() => lib.aggregateRecord({ recordType: 'Steps', timeRangeFilter: range(dayStart, end) }));
    return r?.COUNT_TOTAL ?? 0;
  };

  const [stepsWeek, heart, resting, sleep, latest] = await Promise.all([
    Promise.all(
      Array.from({ length: 7 }, async (_, i) => {
        const d = addDays(today, i - 6);
        return { key: dayKey(d), steps: await stepsOn(d) };
      }),
    ),
    safe(() => lib.aggregateRecord({ recordType: 'HeartRate', timeRangeFilter: range(today, now) })),
    safe(() => lib.aggregateRecord({ recordType: 'RestingHeartRate', timeRangeFilter: range(addDays(now, -1), now) })),
    // "Last night": sleep that ended between 18:00 yesterday and 14:00 today.
    safe(() =>
      lib.aggregateRecord({
        recordType: 'SleepSession',
        timeRangeFilter: range(new Date(addDays(today, -1).getTime() + 18 * 3_600_000), new Date(today.getTime() + 14 * 3_600_000)),
      }),
    ),
    safe(() =>
      lib.readRecords('HeartRate', {
        timeRangeFilter: range(new Date(now.getTime() - 6 * 3_600_000), now),
        ascendingOrder: false,
        pageSize: 1,
      }),
    ),
  ]);

  const lastRecord = latest?.records[0];
  const lastSample = lastRecord?.samples.reduce((a, b) => (new Date(b.time) > new Date(a.time) ? b : a), lastRecord.samples[0]);
  const hasHeart = !!heart && heart.MEASUREMENTS_COUNT > 0;

  return {
    steps: stepsWeek[stepsWeek.length - 1].steps,
    stepsWeek,
    heartAvg: hasHeart ? Math.round(heart.BPM_AVG) : null,
    heartMin: hasHeart ? heart.BPM_MIN : null,
    heartMax: hasHeart ? heart.BPM_MAX : null,
    heartLatest: lastSample ? { bpm: lastSample.beatsPerMinute, at: new Date(lastSample.time).getTime() } : null,
    restingHr: resting && resting.BPM_AVG > 0 ? Math.round(resting.BPM_AVG) : null,
    sleepMin: sleep && sleep.SLEEP_DURATION_TOTAL > 0 ? Math.round(sleep.SLEEP_DURATION_TOTAL / 60) : null,
    updatedAt: Date.now(),
  };
}
