// Caffeine still in the body over the day. Each cup's caffeine halves roughly every 5 hours
// (it varies a lot from person to person, so everything shown is "about").
import { addDays, dayKey, HOUR } from './dates';
import { coffeeOf, dayOf } from './selectors';
import type { State } from './types';

export const HALF_LIFE_H = 5;
/** Caffeine at bedtime above this counts as "still in you" (a bit over half a cup). */
export const BED_MG = 50;

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
