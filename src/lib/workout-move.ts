// Moving a slipping workout instead of missing it (step 6). A planned workout that isn't going to happen can
// go to another free day of the same week, once. The day it left is a rest day then, not a miss: comeback,
// medals, the weekly report, quests and the day's frozen goals all go by workoutFor, which follows the moves.
// Afterwards an optional "what got in the way?" can become a coping if-then plan for that weekday (if-then.ts).
// Flexible plans beat rigid ones for gym visits (Beshears et al. 2021), and action plus coping plans beat action
// plans alone (Sniehotta et al. 2006). Pure, so logic-test can check it.
import { addDays, atTime, dayKey, MIN, startOfWeek, WEEKDAYS_LONG } from './dates';
import { pausedOn } from './pause';
import { dayOf, trainedOn, workoutFor } from './selectors';
import { holidayOn } from './swedish-days';
import type { IfThen, MoveWhy, State, Weekday, WorkoutMove } from './types';

/** How many free days are offered. */
export const MOVE_CHOICES = 3;
/** A workout starts slipping this long after gym time (sooner when bedtime is close). */
export const SLIP_AFTER_MIN = 120;
/** Moves older than this are dropped: the days they touched are long frozen. */
const KEEP_DAYS = 56;

const noon = (key: string) => new Date(`${key}T12:00`);
const weekOf = (key: string) => dayKey(startOfWeek(noon(key)));
const movesOf = (s: State) => s.workoutMoves ?? [];

export const movedFrom = (s: State, key: string): WorkoutMove | null => movesOf(s).find((m) => m.from === key) ?? null;
export const movedTo = (s: State, key: string): WorkoutMove | null => movesOf(s).find((m) => m.to === key) ?? null;

/** "today", "tomorrow" or the weekday ("Friday"), for buttons and lines. */
export function moveDayName(key: string, today = dayKey()) {
  if (key === today) return 'today';
  if (key === dayKey(addDays(noon(today), 1))) return 'tomorrow';
  return WEEKDAYS_LONG[noon(key).getDay()];
}

/** Whether the workout planned on `key` can move: this week, today or later, not trained or paused, and never moved before. */
export function canMove(s: State, key: string, today = dayKey()) {
  if (key < today || weekOf(key) !== weekOf(today) || s.days[key]?.goals) return false;
  if (movedTo(s, key) || movedFrom(s, key)) return false;
  return !!workoutFor(s, noon(key)) && !trainedOn(dayOf(s, key)) && !pausedOn(s, key);
}

/**
 * The days the workout on `from` could go to: free days of the same week from today on (no workout, nothing
 * trained yet, not paused, not a red day off, not a day another workout left). The ones after it come first,
 * nearest first, then the earlier ones.
 */
export function moveTargets(s: State, from: string, today = dayKey()): string[] {
  if (!canMove(s, from, today)) return [];
  const monday = startOfWeek(noon(from));
  const free = Array.from({ length: 7 }, (_, i) => dayKey(addDays(monday, i))).filter(
    (k) =>
      k !== from &&
      k >= today &&
      !s.days[k]?.goals &&
      !workoutFor(s, noon(k)) &&
      !movedFrom(s, k) &&
      !trainedOn(dayOf(s, k)) &&
      !pausedOn(s, k) &&
      !(s.settings.redDaysOff && holidayOn(noon(k))?.red),
  );
  const later = free.filter((k) => k > from);
  const earlier = free.filter((k) => k < from).reverse();
  return [...later, ...earlier].slice(0, MOVE_CHOICES);
}

/** The workout on `from` moved to `to`. Unchanged state when that isn't one of the offered moves. */
export function withMove(s: State, from: string, to: string, at = Date.now()): State {
  const today = dayKey(at);
  if (!moveTargets(s, from, today).includes(to)) return s;
  const name = workoutFor(s, noon(from))?.name ?? 'Workout';
  const keep = dayKey(addDays(noon(today), -KEEP_DAYS));
  return { ...s, workoutMoves: [...movesOf(s).filter((m) => m.from >= keep), { from, to, name, at }] };
}

/** A move can be taken back while the day it left hasn't passed and the day it went to hasn't been trained. */
export function canUnmove(s: State, from: string, today = dayKey()) {
  const m = movedFrom(s, from);
  return !!m && from >= today && !s.days[m.to]?.goals && !trainedOn(dayOf(s, m.to));
}

export function withoutMove(s: State, from: string, today = dayKey()): State {
  if (!canUnmove(s, from, today)) return s;
  return { ...s, workoutMoves: movesOf(s).filter((m) => m.from !== from) };
}

/** When today's workout counts as slipping: two hours after gym time, or an hour before bedtime if that's sooner. */
export function slipAt(s: State, key: string) {
  const { gymHour, gymMinute, sleepHour } = s.settings;
  const gymAt = atTime(noon(key), 0, gymHour, gymMinute).getTime();
  const bed = atTime(noon(key), sleepHour < 12 ? 1 : 0, sleepHour).getTime();
  return Math.max(gymAt, Math.min(gymAt + SLIP_AFTER_MIN * MIN, bed - 60 * MIN));
}

/** Today's workout is slipping: still planned, not started, past its slip time, with somewhere to move it. */
export function slipping(s: State, now = Date.now()) {
  const key = dayKey(now);
  return now >= slipAt(s, key) && moveTargets(s, key, key).length > 0;
}

export const MOVE_WHYS: { why: Exclude<MoveWhy, 'skip'>; label: string }[] = [
  { why: 'late', label: 'Work ran late' },
  { why: 'tired', label: 'Too tired' },
  { why: 'sick', label: 'Feeling sick-ish' },
  { why: 'social', label: 'Plans came up' },
  { why: 'other', label: 'Something else' },
];

/** The move made today that still waits for its "what got in the way?" (answered or waved off, it's done). */
export function pendingWhy(s: State, today = dayKey()): WorkoutMove | null {
  return (
    movesOf(s)
      .filter((m) => m.why == null && dayKey(m.at) === today)
      .at(-1) ?? null
  );
}

export function withWhy(s: State, from: string, why: MoveWhy): State {
  if (!movedFrom(s, from)) return s;
  return { ...s, workoutMoves: movesOf(s).map((m) => (m.from === from ? { ...m, why } : m)) };
}

/** A coping plan for the reasons one helps with. Feeling sick and "something else" get none: rest is the plan there. */
export function copingPlan(s: State, why: MoveWhy): IfThen | null {
  if (why === 'late') return { cue: { kind: 'calendar', match: '' }, then: 'go straight to the gym, even for 30 minutes' };
  if (why === 'tired') return { cue: { kind: 'time', hour: s.settings.gymHour, minute: s.settings.gymMinute }, then: 'start the short version: 20 minutes, then decide' };
  if (why === 'social') return { cue: { kind: 'event', event: 'checkin' }, then: "check tonight's plans and train earlier if they clash" };
  return null;
}

/** The weekday a coping plan would go on: the moved workout's own, while it has no if-then plan of its own. */
export function copingWeekday(s: State, from: string): Weekday | null {
  const d = noon(from).getDay() as Weekday;
  const w = s.plan[d];
  return w && !w.plan ? d : null;
}
