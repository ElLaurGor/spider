// Mini versions (step 8). A habit can have a mini version ("shoes on, 2 minutes"): doing it counts as showing
// up for that habit today (it's in the day's done habits, so quests, contracts and the all-done bonus see it)
// but pays about a third of the XP, under its own ledger ref, so an undo takes back exactly that. Once per habit
// a day. And a slipping planned workout gets a third option next to moving it: a 10-minute salvage that logs a
// short activity, once a day (`DayLog.salvage` stays even if the activity is deleted, so it can't be farmed).
// Neither is offered on a rough day: those are rest. Theme-free, so logic-test can check it.
import { dayKey } from './dates';
import { roughDay } from './day-filters';
import { habitsDone } from './habits';
import { pausedOn } from './pause';
import { dayOf, trainedOn, workoutFor } from './selectors';
import { movedFrom, slipAt } from './workout-move';
import type { DayLog, Habit, State } from './types';

/** XP for a mini version: about a third of a habit's 3. */
export const MINI_XP = 1;
export const miniRef = (id: string) => `hm:${id}`;
/** The salvage's length and kind. */
export const SALVAGE_MIN = 10;
export const SALVAGE_KIND = 'free_weights' as const;

const patchDay = (s: State, key: string, fn: (d: DayLog) => DayLog): State => ({ ...s, days: { ...s.days, [key]: fn(dayOf(s, key)) } });

export const minisDone = (s: State, key = dayKey()) => dayOf(s, key).habitsMini ?? [];
export const didMini = (s: State, id: string, key = dayKey()) => minisDone(s, key).includes(id);

/** The mini can be done: the habit has one, isn't done today (full or mini), and today isn't rough or paused. */
export function miniOffered(s: State, h: Habit, key = dayKey()) {
  if (!h.mini?.trim() || habitsDone(s, key).includes(h.id)) return false;
  return roughDay(s, key) == null && !pausedOn(s, key);
}

/** The habit done as its mini today: in the done list and the mini list. Unchanged when it isn't offered. */
export function withMini(s: State, id: string, key = dayKey()): State {
  const h = s.habits.find((x) => x.id === id);
  if (!h || !miniOffered(s, h, key)) return s;
  return patchDay(s, key, (d) => ({ ...d, habits: [...(d.habits ?? []), id], habitsMini: [...(d.habitsMini ?? []), id] }));
}

/** The mini taken back: out of both lists (its XP goes back through unreward with miniRef). */
export function withoutMini(s: State, id: string, key = dayKey()): State {
  if (!didMini(s, id, key)) return s;
  return patchDay(s, key, (d) => {
    const minis = (d.habitsMini ?? []).filter((x) => x !== id);
    return { ...d, habits: (d.habits ?? []).filter((x) => x !== id), habitsMini: minis.length ? minis : undefined };
  });
}

/**
 * The 10-minute salvage is on offer: a planned workout today that's slipping (past its slip time), not trained,
 * not moved away, not salvaged yet today, and today isn't rough or paused.
 */
export function salvageOffered(s: State, now = Date.now()) {
  const key = dayKey(now);
  const d = dayOf(s, key);
  if (!workoutFor(s, now) || trainedOn(d) || d.salvage || movedFrom(s, key)) return false;
  if (roughDay(s, key) != null || pausedOn(s, key)) return false;
  return now >= slipAt(s, key);
}
