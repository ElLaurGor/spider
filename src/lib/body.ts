// Training activities, sleep ratings and the menstrual cycle.
import { addDays, dayKey, startOfDay } from './dates';
import { dayOf, onPeriod } from './selectors';
import type { ActivityKind, PeriodFlow, Rating, State } from './types';

export const ACTIVITIES: { kind: ActivityKind; label: string; emoji: string }[] = [
  { kind: 'machines', label: 'Maskiner', emoji: '⚙️' },
  { kind: 'cardio', label: 'Kondition', emoji: '🏃' },
  { kind: 'free_weights', label: 'Fria vikter', emoji: '🏋️' },
];
export const activityInfo = (kind: ActivityKind) => ACTIVITIES.find((a) => a.kind === kind) ?? ACTIVITIES[0];

export const SLEEP_RATINGS: { rating: Rating; emoji: string; label: string }[] = [
  { rating: 1, emoji: '😫', label: 'Terrible' },
  { rating: 2, emoji: '😴', label: 'Bad' },
  { rating: 3, emoji: '😐', label: 'OK' },
  { rating: 4, emoji: '🙂', label: 'Good' },
  { rating: 5, emoji: '🤩', label: 'Great' },
];
export const sleepInfo = (r: number) => SLEEP_RATINGS[Math.min(5, Math.max(1, Math.round(r))) - 1];

export const FLOWS: { flow: PeriodFlow; label: string; color: string }[] = [
  { flow: 'spotting', label: 'Spotting', color: '#F2A7B8' },
  { flow: 'light', label: 'Light', color: '#E86A8A' },
  { flow: 'medium', label: 'Medium', color: '#D6335E' },
  { flow: 'heavy', label: 'Heavy', color: '#A1123A' },
];
export const flowColor = (flow: PeriodFlow) => FLOWS.find((f) => f.flow === flow)?.color ?? '#D6335E';

export const SYMPTOMS = ['Cramps', 'Headache', 'Bloating', 'Tired', 'Mood swings', 'Cravings', 'Back pain', 'Acne', 'Tender breasts', 'Nausea'];

const noon = (key: string) => new Date(`${key}T12:00`);
const DAY = 86_400_000;

/** First day of each period, oldest first. Up to 3 unlogged days inside a period don't split it. */
export function periodStarts(s: State): string[] {
  const keys = Object.keys(s.days)
    .filter((k) => onPeriod(s.days[k]))
    .sort();
  return keys.filter((k) => {
    for (let back = 1; back <= 3; back++) {
      const prev = s.days[dayKey(addDays(noon(k), -back))];
      if (prev && onPeriod(prev)) return false;
    }
    return true;
  });
}

export type CycleInfo = {
  cycleDay: number; // 1 = first day of the latest period
  periodDay: number | null; // set while today is a period day
  avgLength: number; // days, 28 until two cycles are known
  cycles: number; // completed cycles the average is based on
  avgPeriodDays: number;
  nextStart: Date;
  daysUntil: number; // negative = late
};

export function cycleInfo(s: State, now = new Date()): CycleInfo | null {
  const starts = periodStarts(s);
  if (!starts.length) return null;
  const startDates = starts.map(noon);
  const lengths = startDates
    .slice(1)
    .map((d, i) => Math.round((d.getTime() - startDates[i].getTime()) / DAY))
    .filter((n) => n >= 15 && n <= 60)
    .slice(-6);
  const avgLength = lengths.length ? Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length) : 28;

  // How many days each period lasted, to shade the predicted days.
  const durations = starts.map((k) => {
    let n = 0;
    while (onPeriod(dayOf(s, dayKey(addDays(noon(k), n))))) n++;
    return Math.max(1, n);
  });
  const avgPeriodDays = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);

  const last = startDates[startDates.length - 1];
  const today = startOfDay(now).getTime();
  const cycleDay = Math.floor((today - startOfDay(last).getTime()) / DAY) + 1;
  const nextStart = addDays(startOfDay(last), avgLength);
  const daysUntil = Math.round((nextStart.getTime() - today) / DAY);
  return {
    cycleDay,
    periodDay: onPeriod(dayOf(s, dayKey(now))) ? cycleDay : null,
    avgLength,
    cycles: lengths.length,
    avgPeriodDays,
    nextStart,
    daysUntil,
  };
}

/** Whether a future day falls inside the predicted next period. */
export function isPredictedPeriod(info: CycleInfo | null, date: Date) {
  if (!info) return false;
  const t = startOfDay(date).getTime();
  const start = startOfDay(info.nextStart).getTime();
  return t >= start && t < start + info.avgPeriodDays * DAY;
}
