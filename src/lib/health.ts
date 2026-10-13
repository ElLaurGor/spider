// Reads steps, heart rate and sleep from Android Health Connect. The Zepp app
// (Amazfit watch) writes there once "Health Connect" is linked in Zepp.
import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';

import { addDays, dayKey, startOfDay } from './dates';
import { nightOf, nightWindow, type Night, type RawSession } from './sleep';

type HC = typeof import('react-native-health-connect');

export type HealthStatus = 'unsupported' | 'unavailable' | 'needs-permission' | 'connected';

export type HealthData = {
  steps: number;
  stepsWeek: { key: string; steps: number }[]; // oldest first, today last
  sleepWeek: { key: string; sleepMin: number | null }[]; // the night before each of those days
  heartAvg: number | null;
  heartMin: number | null;
  heartMax: number | null;
  heartLatest: { bpm: number; at: number } | null;
  restingHr: number | null;
  sleepMin: number | null; // last night
  nights: { key: string; night: Night | null }[]; // bed/wake times and stages of the nights before stepsWeek's days
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

/** Sleep sessions overlapping [from, to), with their stages. */
async function readSessions(lib: HC, from: Date, to: Date): Promise<RawSession[]> {
  const out: RawSession[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < 5; page++) {
    const token = pageToken;
    const r = await safe(() =>
      lib.readRecords('SleepSession', { timeRangeFilter: range(from, to), ascendingOrder: true, pageSize: 200, ...(token ? { pageToken: token } : {}) }),
    );
    if (!r) break;
    for (const rec of r.records) {
      out.push({
        start: new Date(rec.startTime).getTime(),
        end: new Date(rec.endTime).getTime(),
        stages: (rec.stages ?? []).map((st) => ({ start: new Date(st.startTime).getTime(), end: new Date(st.endTime).getTime(), stage: st.stage })),
      });
    }
    pageToken = r.pageToken || undefined;
    if (!pageToken) break;
  }
  return out;
}

/** The night before `key` with every stage, for the sleep screen. Null without data or outside the installed app. */
export async function readSleepNight(key: string): Promise<Night | null> {
  const lib = hc;
  if (!lib || !(await ready(lib))) return null;
  const { from, to } = nightWindow(key);
  const end = Math.min(to, Date.now());
  if (end <= from) return null;
  return nightOf(await readSessions(lib, new Date(from), new Date(end)), key);
}

export type HeartSample = { at: number; bpm: number };

/** Every heart rate sample of one day (oldest first) and that day's resting rate. Empty outside the installed app. */
export async function readHeartDay(key: string, now = new Date()): Promise<{ samples: HeartSample[]; resting: number | null }> {
  const lib = hc;
  if (!lib || !(await ready(lib))) return { samples: [], resting: null };
  const start = new Date(`${key}T00:00`);
  const end = key === dayKey(now) ? now : addDays(start, 1);
  if (end <= start) return { samples: [], resting: null };
  const filter = range(start, end);

  const samples: HeartSample[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < 20; page++) {
    const token = pageToken;
    const r = await safe(() =>
      lib.readRecords('HeartRate', { timeRangeFilter: filter, ascendingOrder: true, pageSize: 1000, ...(token ? { pageToken: token } : {}) }),
    );
    if (!r) break;
    for (const rec of r.records) {
      for (const x of rec.samples) {
        const at = new Date(x.time).getTime();
        if (at >= start.getTime() && at < end.getTime() && x.beatsPerMinute > 0) samples.push({ at, bpm: Math.round(x.beatsPerMinute) });
      }
    }
    pageToken = r.pageToken || undefined;
    if (!pageToken) break;
  }
  samples.sort((a, b) => a.at - b.at);

  const resting = await safe(() => lib.aggregateRecord({ recordType: 'RestingHeartRate', timeRangeFilter: filter }));
  return { samples, resting: resting && resting.BPM_AVG > 0 ? Math.round(resting.BPM_AVG) : null };
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

  // "The night before a day": sleep between 18:00 the day before and 14:00 that day.
  const sleepBefore = async (dayStart: Date) => {
    const r = await safe(() =>
      lib.aggregateRecord({
        recordType: 'SleepSession',
        timeRangeFilter: range(new Date(addDays(dayStart, -1).getTime() + 18 * 3_600_000), new Date(dayStart.getTime() + 14 * 3_600_000)),
      }),
    );
    return r && r.SLEEP_DURATION_TOTAL > 0 ? Math.round(r.SLEEP_DURATION_TOTAL / 60) : null;
  };
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));

  const [stepsWeek, sleepWeek, heart, resting, latest, sessions] = await Promise.all([
    Promise.all(week.map(async (d) => ({ key: dayKey(d), steps: await stepsOn(d) }))),
    Promise.all(week.map(async (d) => ({ key: dayKey(d), sleepMin: await sleepBefore(d) }))),
    safe(() => lib.aggregateRecord({ recordType: 'HeartRate', timeRangeFilter: range(today, now) })),
    safe(() => lib.aggregateRecord({ recordType: 'RestingHeartRate', timeRangeFilter: range(addDays(now, -1), now) })),
    safe(() =>
      lib.readRecords('HeartRate', {
        timeRangeFilter: range(new Date(now.getTime() - 6 * 3_600_000), now),
        ascendingOrder: false,
        pageSize: 1,
      }),
    ),
    readSessions(lib, new Date(nightWindow(dayKey(week[0])).from), now),
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
    sleepMin: sleepWeek[sleepWeek.length - 1].sleepMin,
    sleepWeek,
    nights: week.map((d) => ({ key: dayKey(d), night: nightOf(sessions, dayKey(d)) })),
    updatedAt: Date.now(),
  };
}
