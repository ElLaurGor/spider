import { addDays, pad, startOfDay } from './dates';
import type { Countdown, State } from './types';

export const COUNTDOWN_EMOJIS = ['🏖️', '✈️', '🎂', '🎮', '🎄', '🎉', '🎤', '⚽', '💍', '🎓', '🏠', '📅'];

const DAY = 86_400_000;
const parse = (key: string) => new Date(`${key}T12:00`);

/** Next date the countdown happens (yearly ones roll over to next year once passed; 29 Feb is 28 Feb in other years). */
export function nextDate(c: Countdown, now = new Date()) {
  const today = startOfDay(now).getTime();
  const d = startOfDay(parse(c.date));
  if (!c.yearly) return d;
  const inYear = (y: number) => new Date(y, d.getMonth(), Math.min(d.getDate(), daysInMonth(y, d.getMonth() + 1)));
  const next = inYear(now.getFullYear());
  return next.getTime() < today ? inYear(now.getFullYear() + 1) : next;
}

export const daysLeft = (c: Countdown, now = new Date()) => Math.round((nextDate(c, now).getTime() - startOfDay(now).getTime()) / DAY);

export const daysLabel = (n: number) => (n === 0 ? 'today!' : n === 1 ? 'tomorrow' : `in ${n} days`);

/** Upcoming countdowns, soonest first (one-off ones disappear the day after). */
export const upcoming = (s: State, now = new Date()) =>
  s.countdowns.filter((c) => daysLeft(c, now) >= 0).sort((a, b) => daysLeft(a, now) - daysLeft(b, now));

export const toKey = (year: number, month: number, day: number) => `${year}-${pad(month)}-${pad(day)}`;
export const daysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();
export const defaultDate = () => addDays(new Date(), 7);
