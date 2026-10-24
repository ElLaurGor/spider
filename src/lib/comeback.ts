// The comeback bonus: the first workout after a missed planned gym day pays a visible "welcome back" (coins,
// gaming-bank minutes and a guaranteed crit on the boss). A bonus for returning works; pointing at the miss
// doesn't. Rough days (sick or away, a low mood, a period day) are never missed, days before the app was in
// use don't count, and once a workout lands, the stretch is over. Theme-free, so logic-test can check it.
import { addDays, dayKey } from './dates';
import { firstDataDay, roughDay } from './day-filters';
import { dayOf, trainedOn, workoutFor } from './selectors';
import type { State } from './types';

/** What coming back pays: XP (and as many coins), bonus gaming minutes, and a crit worth a workout's. */
export const COMEBACK = { xp: 15, min: 20 } as const;
const LOOK_BACK = 14;

/**
 * The missed planned gym day a workout today comes back from, or null. Walking back from yesterday: a day
 * that was trained means there's nothing to come back from; a rough day is rest, so it's skipped; a planned
 * day that wasn't trained is the miss.
 */
export function missedGymBefore(s: State, now = new Date()): string | null {
  const first = firstDataDay(s);
  if (first == null) return null;
  for (let i = 1; i <= LOOK_BACK; i++) {
    const date = addDays(now, -i);
    const key = dayKey(date);
    if (key < first) return null;
    if (trainedOn(dayOf(s, key))) return null;
    if (roughDay(s, key)) continue;
    if (workoutFor(s, date)) return key;
  }
  return null;
}

/** The last day trained before `now` (two months back at most), for "first workout since Monday". */
export function lastTrainedBefore(s: State, now = new Date()): string | null {
  for (let i = 1; i <= 60; i++) {
    const key = dayKey(addDays(now, -i));
    if (trainedOn(dayOf(s, key))) return key;
  }
  return null;
}
