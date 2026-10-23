// Which days scores and recaps count. A day counts when something was logged on it (not only data the
// watch, the weather or the phone filled in) and it wasn't a rough one: sick or away, a low mood or a
// period day. Rough days are left out of the denominators instead of counting as failures.
import { isDayKey } from './dates';
import { pausedOn } from './pause';
import { avgMood, onPeriod } from './selectors';
import type { DayLog, State } from './types';

/** Something the user logged that day, as opposed to steps, sleep, screen time or weather filled in for them. */
export function usedOn(d: DayLog | undefined): boolean {
  if (!d) return false;
  return (
    d.water.length > 0 ||
    d.food.length > 0 ||
    d.sets.length > 0 ||
    d.games.length > 0 ||
    !!d.coffee?.length ||
    !!d.activities?.length ||
    !!d.moods?.length ||
    !!d.period ||
    d.sleepRating != null ||
    d.energy != null ||
    !!d.sleepManual ||
    !!d.focus?.length ||
    !!d.breaths ||
    !!d.windDown?.length ||
    !!d.windDownDone ||
    !!d.habits?.length ||
    Object.keys(d.tracks ?? {}).length > 0 ||
    !!d.questsDone?.length ||
    (d.xpEarned ?? 0) > 0
  );
}

/** The first day anything was logged: recaps start there, so days before the app was in use don't count. */
export function firstDataDay(s: State): string | null {
  let first: string | null = null;
  for (const [k, d] of Object.entries(s.days)) if (isDayKey(k) && usedOn(d) && (first == null || k < first)) first = k;
  return first;
}

export type RoughKind = 'paused' | 'low' | 'period';

/** Why a day is a rough one (sick or away, a mood that averaged Meh or worse, a period day), or null. */
export function roughDay(s: State, key: string): RoughKind | null {
  if (pausedOn(s, key)) return 'paused';
  const d = s.days[key];
  if (!d) return null;
  const m = avgMood(d);
  if (m != null && m < 2.5) return 'low';
  if (onPeriod(d)) return 'period';
  return null;
}

/** A day that scores and recaps judge: something was logged, and it wasn't a rough one. */
export const countedDay = (s: State, key: string) => usedOn(s.days[key]) && roughDay(s, key) == null;
