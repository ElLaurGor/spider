// Sleep timing from the watch: each night's main sleep (bed and wake time, stages) and how regular
// bedtimes are. Pure, so it's tested offline; health.ts reads the sessions from Health Connect.
import { addDays, atTime, dayKey, HOUR } from './dates';
import type { DayLog, SleepStages, State } from './types';

export type StageKind = 'awake' | 'light' | 'deep' | 'rem' | 'asleep';
export type StageSegment = { start: number; end: number; stage: StageKind };
/**
 * A sleep session as Health Connect stores it, times in ms. `stage` uses Health Connect's SleepStageType;
 * `origin` is the app that wrote it (Zepp, the phone, another tracker).
 */
export type RawSession = { start: number; end: number; origin?: string; stages: { start: number; end: number; stage: number }[] };
export type Night = { bedAt: number; wakeAt: number; stages: SleepStages | null; segments: StageSegment[] };

/** The Zepp app's package (Amazfit watch). Its own records go first, so the numbers match what Zepp shows. */
export const ZEPP = 'com.huami.watch.hmwatchmanager';

// SleepStageType: 0 unknown, 1 awake, 2 sleeping, 3 out of bed, 4 light, 5 deep, 6 REM, 7 awake in bed (Android 14+).
const KIND: Record<number, StageKind> = { 1: 'awake', 2: 'asleep', 3: 'awake', 4: 'light', 5: 'deep', 6: 'rem', 7: 'awake' };

/** "The night before" a day, like the sleep total: 18:00 the evening before until 14:00 that day (clock times, so a 23- or 25-hour night is fine). */
export function nightWindow(key: string) {
  const noon = new Date(`${key}T12:00`);
  return { from: atTime(noon, -1, 18).getTime(), to: atTime(noon, 0, 14).getTime() };
}

/**
 * The night before `key`: its longest session plus any that start or end within an hour of it (a split night).
 * One source only: Zepp's sessions if it wrote any, else the app with the longest session. Two trackers
 * recording the same night would otherwise add up to more sleep than there was night.
 */
export function nightOf(sessions: RawSession[], key: string): Night | null {
  const { from, to } = nightWindow(key);
  const all = sessions.filter((x) => x.end > x.start && x.end > from && x.start < to);
  if (!all.length) return null;
  const longest = all.reduce((a, b) => (b.end - b.start > a.end - a.start ? b : a));
  const origin = all.some((x) => x.origin === ZEPP) ? ZEPP : longest.origin;
  const inWindow = all.filter((x) => x.origin === origin);
  const main = inWindow.reduce((a, b) => (b.end - b.start > a.end - a.start ? b : a));
  const parts = [main];
  let bedAt = main.start;
  let wakeAt = main.end;
  for (let grew = true; grew; ) {
    grew = false;
    for (const x of inWindow) {
      if (parts.includes(x) || x.start > wakeAt + HOUR || x.end < bedAt - HOUR) continue;
      parts.push(x);
      bedAt = Math.min(bedAt, x.start);
      wakeAt = Math.max(wakeAt, x.end);
      grew = true;
    }
  }
  const segments: StageSegment[] = parts
    .flatMap((p) =>
      p.stages.map((st) => ({ start: Math.max(st.start, p.start), end: Math.min(st.end, p.end), stage: KIND[st.stage] })),
    )
    .filter((x): x is StageSegment => !!x.stage && x.end > x.start)
    .sort((a, b) => a.start - b.start);
  const mins = (k: StageKind) => Math.round(segments.filter((x) => x.stage === k).reduce((a, x) => a + x.end - x.start, 0) / 60_000);
  const detailed = segments.some((x) => x.stage === 'light' || x.stage === 'deep' || x.stage === 'rem');
  return {
    bedAt,
    wakeAt,
    stages: detailed ? { deep: mins('deep'), light: mins('light'), rem: mins('rem'), awake: mins('awake') } : null,
    segments,
  };
}

/**
 * Writes the watch's bed and wake times (and stages) onto each morning's day. Days you never opened
 * the app stay empty, except today; hours typed in by hand keep the watch out of that night.
 */
export function withNights(s: State, nights: { key: string; night: Night | null }[], today = dayKey()): State {
  let days = s.days;
  for (const { key, night } of nights) {
    const d: DayLog | undefined = days[key];
    if (!night || (!d && key !== today) || d?.sleepManual) continue;
    const stages = night.stages ?? undefined;
    if (d && d.bedAt === night.bedAt && d.wakeAt === night.wakeAt && JSON.stringify(d.sleepStages) === JSON.stringify(stages)) continue;
    const base: DayLog = d ?? { water: [], food: [], sets: [], games: [], bonusGameMin: 0 };
    days = { ...days, [key]: { ...base, bedAt: night.bedAt, wakeAt: night.wakeAt, sleepStages: stages } };
  }
  return days === s.days ? s : { ...s, days };
}

/**
 * The clock time of `t` in minutes, counted from the morning `key`: 23:30 the evening before is -30, 00:45
 * is 45. Read off the clock, not elapsed time, so a wake-up at 08:00 on a DST morning stays 08:00 (480).
 */
export function nightClock(t: number, key: string) {
  const d = new Date(t);
  const days = Math.round((new Date(`${dayKey(d)}T12:00`).getTime() - new Date(`${key}T12:00`).getTime()) / (24 * HOUR));
  return Math.round(days * 1440 + d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60);
}

/** "23:30" for -30, "00:45" for 45. */
export function clockLabel(minutes: number) {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

const median = (xs: number[]) => {
  const a = [...xs].sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
};
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

export type RhythmNight = { key: string; bed: number; wake: number; weekend: boolean };

/**
 * How regular the last `n` nights were (from the watch's times): the usual bedtime, how far a typical
 * night strays from it, and how much later weekend nights sit than weekday ones. Null under 5 nights.
 */
export function rhythmOf(s: State, now = new Date(), n = 14) {
  const nights: RhythmNight[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const date = addDays(now, -i);
    const key = dayKey(date);
    const d = s.days[key];
    if (d?.bedAt == null || d.wakeAt == null) continue;
    // Saturday and Sunday mornings: the nights after Friday and Saturday.
    nights.push({ key, bed: nightClock(d.bedAt, key), wake: nightClock(d.wakeAt, key), weekend: date.getDay() === 6 || date.getDay() === 0 });
  }
  if (nights.length < 5) return null;
  const bedMedian = median(nights.map((x) => x.bed));
  const spread = Math.round(median(nights.map((x) => Math.abs(x.bed - bedMedian))));
  const mid = (x: RhythmNight) => (x.bed + x.wake) / 2;
  const weekday = nights.filter((x) => !x.weekend).map(mid);
  const weekend = nights.filter((x) => x.weekend).map(mid);
  const jetlag = weekday.length >= 2 && weekend.length >= 2 ? Math.round(avg(weekend) - avg(weekday)) : null;
  return { nights, bedMedian: Math.round(bedMedian), spread, jetlag };
}
