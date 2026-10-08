import { dayKey } from './dates';
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

export const habitsFor = (s: State, date: Date | number = new Date()) => s.habits.filter((h) => isScheduled(h, date));

export const habitsDone = (s: State, key = dayKey()) => dayOf(s, key).habits ?? [];

