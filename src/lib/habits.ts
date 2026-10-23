import { addDays, dayKey, startOfDay } from './dates';
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
  return s.habits.filter((h) => isScheduled(h, date) && (h.createdAt ?? 0) < end);
}

export const habitsDone = (s: State, key = dayKey()) => dayOf(s, key).habits ?? [];

