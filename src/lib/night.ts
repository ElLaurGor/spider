// Phone use after bedtime (from the usage-stats spans of modules/spider-usage), for the morning
// check-in and Insights. Pure, so it's tested offline.
import { atTime } from './dates';
import type { NightPhone } from './types';

/** Last night's window, seen from the morning: from bedtime until 05:00. A bedtime after midnight is that morning's. */
export function nightWindow(morning: Date | number, sleepHour: number) {
  const bed = atTime(morning, sleepHour < 12 ? 0 : -1, sleepHour);
  const end = atTime(morning, 0, 5);
  return { bed: bed.getTime(), end: end.getTime() };
}

/**
 * When phone time starts counting as "in bed": the target bedtime, or the watch's bedtime when that came later
 * (scrolling on the sofa before a late night isn't phone in bed).
 */
export const inBedFrom = (targetBed: number, watchBed?: number | null) => (watchBed != null ? Math.max(targetBed, watchBed) : targetBed);

/** Under this many minutes in bed with the phone isn't worth mentioning. */
export const NIGHT_MIN = 10;

export function nightPhone(spans: { label: string; start: number; end: number }[], bed: number, end: number): NightPhone {
  const time = new Map<string, number>();
  let total = 0;
  let lastAt = 0;
  for (const s of spans) {
    const a = Math.max(s.start, bed);
    const b = Math.min(s.end, end);
    if (b <= a) continue;
    total += b - a;
    lastAt = Math.max(lastAt, b);
    time.set(s.label, (time.get(s.label) ?? 0) + (b - a));
  }
  const lateMin = Math.round(total / 60_000);
  if (lateMin < NIGHT_MIN) return { lateMin, lastAt: null, top: null, from: bed };
  const top = [...time.entries()].sort((x, y) => y[1] - x[1])[0][0];
  return { lateMin, lastAt, top, from: bed };
}
