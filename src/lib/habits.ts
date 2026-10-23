import { addDays, dayKey, startOfDay, startOfWeek } from './dates';
import { pausedOn } from './pause';
import { dayOf } from './selectors';
import type { Habit, State, Weekday } from './types';

export const HABIT_IDEAS: { name: string; emoji: string }[] = [
  { name: 'Vitamins', emoji: '💊' },
  { name: 'Stretch 10 min', emoji: '🧘' },
  { name: 'Read 20 min', emoji: '📖' },
  { name: 'Walk 20 min', emoji: '🚶' },
  { name: 'Skincare', emoji: '🧴' },
  { name: 'Floss', emoji: '🦷' },
  { name: 'No phone in bed', emoji: '📵' },
  { name: 'Learn something', emoji: '🧠' },
];

export const HABIT_EMOJIS = ['✅', '💊', '🧘', '📖', '🚶', '🧴', '🦷', '📵', '🧠', '💧', '🛏️', '🥗', '✍️', '🎸', '🧹', '🌱'];

export const isScheduled = (h: Habit, date: Date | number) =>
  h.days.length === 0 || h.days.includes(new Date(date).getDay() as Weekday);

/**
 * Habits due on a day: a finished day's snapshot (lib/goals.ts), else the ones scheduled that weekday that
 * existed by its end, so adding a habit today doesn't turn earlier days into misses.
 */
export function habitsFor(s: State, date: Date | number = new Date()) {
  const frozen = s.days[dayKey(date)]?.goals?.habits;
  if (frozen) return s.habits.filter((h) => frozen.includes(h.id));
  const end = startOfDay(addDays(date, 1)).getTime();
  return s.habits.filter((h) => (h.createdAt ?? 0) < end && (h.perWeek ? rangeDueOn(s, h, date) : isScheduled(h, date)));
}

/** Habits to list on a day: the ones due, plus range habits that can be done any day of the week. */
export function habitsShownOn(s: State, date: Date | number = new Date()) {
  const due = habitsFor(s, date);
  const end = startOfDay(addDays(date, 1)).getTime();
  return s.habits.filter((h) => due.includes(h) || (!!h.perWeek && (h.createdAt ?? 0) < end));
}

export const habitsDone = (s: State, key = dayKey()) => dayOf(s, key).habits ?? [];

// ---------- weekly range habits ("2–4× this week, any days") ----------
// A range habit is never a daily chore. It's due (for day scores, quests, contracts) only on a day it was
// done, or on a day it has to be done because what's left of the low end needs every open day until Sunday.
// So doing it always counts, skipping it only counts once there's no slack left, and nothing chains days.

const weekOf = (date: Date | number) => Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(date), i));
const doneOn = (s: State, h: Habit, key: string) => habitsDone(s, key).includes(h.id);
/** A day a range habit can be done on: it existed by then, and the day isn't paused (sick or away). */
const openOn = (s: State, h: Habit, d: Date) => (h.createdAt ?? 0) < startOfDay(addDays(d, 1)).getTime() && !pausedOn(s, dayKey(d));

export type RangeWeek = { min: number; max: number; target: number; done: number };

/** XP for reaching the top of a range in a week (paid once that week). */
export const RANGE_TOP_XP = 10;

/**
 * A range habit's week: days done so far, and the low end it has to reach (`target`). The target shrinks
 * with the open days: a sick week or a habit added on Thursday asks for less, never for more.
 */
export function rangeWeek(s: State, h: Habit, date: Date | number = new Date()): RangeWeek | null {
  if (!h.perWeek) return null;
  const days = weekOf(date);
  const open = days.filter((d) => openOn(s, h, d)).length;
  const { min, max } = h.perWeek;
  return { min, max, target: open ? Math.min(min, Math.ceil((min * open) / 7)) : 0, done: days.filter((d) => doneOn(s, h, dayKey(d))).length };
}

/** What's still needed of the low end before `date`, and the open days from `date` to Sunday (both counted). */
function slack(s: State, h: Habit, date: Date | number) {
  const w = rangeWeek(s, h, date);
  if (!w || !openOn(s, h, new Date(date))) return null;
  const key = dayKey(date);
  const days = weekOf(date);
  const before = days.filter((d) => dayKey(d) < key && doneOn(s, h, dayKey(d))).length;
  return { needed: w.target - before, left: days.filter((d) => dayKey(d) >= key && openOn(s, h, d)).length };
}

/** Needed that day: what's left of the low end takes every open day from here to Sunday. */
export function rangeNeededOn(s: State, h: Habit, date: Date | number = new Date()) {
  const x = slack(s, h, date);
  return !!x && x.needed > 0 && x.left <= x.needed;
}

/** Due that day: done, or needed. */
export const rangeDueOn = (s: State, h: Habit, date: Date | number = new Date()) => doneOn(s, h, dayKey(date)) || rangeNeededOn(s, h, date);

/** A reminder day: not done yet, and the low end is down to one spare day or none (no daily nagging). */
export function rangeRemindOn(s: State, h: Habit, date: Date | number = new Date()) {
  if (doneOn(s, h, dayKey(date))) return false;
  const x = slack(s, h, date);
  return !!x && x.needed > 0 && x.left <= x.needed + 1;
}

/** "2/2–4 this week" (the low end as this week asks it: lower after paused days). */
export const rangeText = (w: RangeWeek) =>
  w.target === 0 ? `${w.done} this week` : `${w.done}/${w.target >= w.max ? w.max : `${w.target}–${w.max}`} this week`;

