// Caffeine still in the body over the day. Each cup's caffeine halves roughly every 5 hours
// (it varies a lot from person to person, so everything shown is "about").
import { addDays, dayKey, fmtTime, HOUR, MIN, pad } from './dates';
import { coffeeOf, dayOf } from './selectors';
import type { State } from './types';

export const HALF_LIFE_H = 5;
/**
 * Caffeine at bedtime above this counts as "still in you" (about a third of a cup). Gardiner et al. 2023
 * (Sleep Medicine Reviews, 24 studies): a 107 mg coffee should be had at least 8.8 hours before bed to spare
 * sleep, which with the 5-hour half-life used here leaves about 32 mg at bedtime. Last call, the curve, the
 * detective and the insights all use this one threshold.
 */
export const BED_MG = 30;

type Cup = { mg: number; at: number };

/** mg of caffeine left at time `t` from the cups drunk before it. */
export function caffeineLeft(cups: Cup[], t: number) {
  let mg = 0;
  for (const c of cups) if (c.at <= t) mg += c.mg * 0.5 ** ((t - c.at) / (HALF_LIFE_H * HOUR));
  return mg;
}

/** The cups that matter on day `key`: its own plus the evening before (a late cup still lingers after midnight). */
export function cupsAround(s: State, key: string): Cup[] {
  const prev = dayKey(addDays(new Date(`${key}T12:00`), -1));
  return [...coffeeOf(dayOf(s, prev)), ...coffeeOf(dayOf(s, key))];
}

/** Bedtime on day `key`: settings.sleepHour, the next morning when it's after midnight. */
export function bedtimeOn(key: string, sleepHour: number) {
  const d = new Date(`${key}T00:00`);
  d.setHours(sleepHour < 12 ? sleepHour + 24 : sleepHour, 0, 0, 0);
  return d.getTime();
}

/** Caffeine left at bedtime on day `key`. */
export const bedtimeCaffeine = (s: State, key: string) => caffeineLeft(cupsAround(s, key), bedtimeOn(key, s.settings.sleepHour));

const FIVE_MIN = 5 * MIN;

/**
 * Last call on day `key`: the latest time a cup of `mg` still leaves caffeine at bedtime at or under BED_MG,
 * counting the cups already had. Null when those leave no room at all. Rounded down to 5 minutes.
 */
export function lastCallOn(s: State, key: string, mg = s.settings.caffeinePerCupMg): number | null {
  const bed = bedtimeOn(key, s.settings.sleepHour);
  const room = BED_MG - caffeineLeft(cupsAround(s, key), bed);
  if (room <= 0) return null;
  const hours = mg <= room ? 0 : HALF_LIFE_H * Math.log2(mg / room);
  return Math.floor((bed - hours * HOUR) / FIVE_MIN) * FIVE_MIN;
}

/** Fuel's line for today: until when the next cup is fine, or that last call has passed. Null once it's bedtime. */
export function lastCallText(s: State, key: string, now = Date.now()): string | null {
  const bed = bedtimeOn(key, s.settings.sleepHour);
  if (now >= bed) return null;
  const t = lastCallOn(s, key);
  if (t == null) return 'Last call has passed. Decaf from here.';
  if (t <= now) return `Last call was ${fmtTime(t)}. Decaf from here.`;
  if (t >= bed - FIVE_MIN) return "A cup is fine: it's gone by bedtime.";
  return `Next cup fine until ${fmtTime(t)}.`;
}

/** Last call on a day with no coffee yet, as a clock time ("15:05"), from the bedtime and cup size in settings. */
export function lastCallClock(sleepHour: number, mg: number) {
  const bedMin = (sleepHour < 12 ? sleepHour + 24 : sleepHour) * 60;
  const min = Math.floor((bedMin - (mg <= BED_MG ? 0 : HALF_LIFE_H * Math.log2(mg / BED_MG) * 60)) / 5) * 5;
  return `${pad(Math.floor(min / 60) % 24)}:${pad(min % 60)}`;
}

/** `hour` o'clock on day `key` (24+ is after midnight), on the clock: right on the days the clocks change too. */
const clockOn = (key: string, hour: number) => {
  const d = new Date(`${key}T00:00`);
  d.setHours(hour, 0, 0, 0);
  return d.getTime();
};

/** The day's curve, one point per `stepMin` from `fromHour` to `toHour` o'clock (24+ means after midnight). */
export function caffeineCurve(s: State, key: string, fromHour: number, toHour: number, stepMin = 15) {
  const cups = cupsAround(s, key);
  const end = clockOn(key, toHour);
  const points: { t: number; mg: number }[] = [];
  for (let t = clockOn(key, fromHour); t <= end; t += stepMin * 60_000) points.push({ t, mg: caffeineLeft(cups, t) });
  return points;
}
