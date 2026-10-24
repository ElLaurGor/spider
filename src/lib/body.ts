// Training activities, sleep ratings and the menstrual cycle.
import { addDays, dayKey, isDayKey, startOfDay } from './dates';
import { dayOf, onPeriod } from './selectors';
import { realFlow } from './tone';
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
const daysBetween = (a: string, b: string) => Math.round((noon(b).getTime() - noon(a).getTime()) / DAY); // noon to noon: DST-proof

/** One period: `start` is its first day of real flow, `lastFlow` its last, `end` its last logged day (trailing spotting too). */
export type PeriodRun = { start: string; lastFlow: string; end: string };

/**
 * Every period, oldest first: a run of logged flow days (up to 3 unlogged days inside don't split it) with
 * real flow in it. Spotting before the first real day doesn't move the start, and a run of spotting only
 * (mid-cycle spotting) isn't a period at all, so it can't restart the cycle or shift the prediction.
 */
export function periodRuns(s: State): PeriodRun[] {
  const keys = Object.keys(s.days)
    .filter((k) => isDayKey(k) && onPeriod(s.days[k]))
    .sort();
  const runs: string[][] = [];
  for (const k of keys) {
    const prev = runs.at(-1);
    if (prev && daysBetween(prev[prev.length - 1], k) <= 3) prev.push(k);
    else runs.push([k]);
  }
  return runs.flatMap((run) => {
    const real = run.filter((k) => realFlow(s.days[k]));
    return real.length ? [{ start: real[0], lastFlow: real[real.length - 1], end: run[run.length - 1] }] : [];
  });
}

/** First day of each period, oldest first. */
export const periodStarts = (s: State): string[] => periodRuns(s).map((r) => r.start);

/** Cycle lengths between starts that look like real cycles (15–60 days), the latest six. */
const cycleLengths = (starts: string[]) =>
  starts
    .slice(1)
    .map((k, i) => daysBetween(starts[i], k))
    .filter((n) => n >= 15 && n <= 60)
    .slice(-6);
const averageLength = (lengths: number[]) => (lengths.length ? Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length) : 28);

/** The periods and the usual cycle length: what phaseOn() needs, worked out once for a whole screen. */
export function cycleMap(s: State) {
  const runs = periodRuns(s);
  return { runs, avgLength: averageLength(cycleLengths(runs.map((r) => r.start))) };
}
export type CycleMap = ReturnType<typeof cycleMap>;

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
  const runs = periodRuns(s);
  if (!runs.length) return null;
  const lengths = cycleLengths(runs.map((r) => r.start));
  const avgLength = averageLength(lengths);
  // How many days each period lasted (first to last real flow), to shade the predicted days.
  const avgPeriodDays = Math.round(runs.reduce((a, r) => a + daysBetween(r.start, r.lastFlow) + 1, 0) / runs.length);

  const latest = runs[runs.length - 1];
  const today = dayKey(now);
  const cycleDay = daysBetween(latest.start, today) + 1;
  const nextStart = addDays(startOfDay(noon(latest.start)), avgLength);
  const daysUntil = Math.round((nextStart.getTime() - startOfDay(now).getTime()) / DAY); // round: a 23-hour day isn't a short day
  return {
    cycleDay,
    // Spotting mid-cycle isn't a period day; flow inside the latest period is.
    periodDay: onPeriod(dayOf(s, today)) && today >= latest.start && today <= latest.end ? cycleDay : null,
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
  const start = startOfDay(info.nextStart);
  return t >= start.getTime() && t < addDays(start, info.avgPeriodDays).getTime(); // whole days, so DST can't add one
}

// ---- cluster D: cycle phases ----

export type CyclePhase = 'period' | 'follicular' | 'ovulation' | 'luteal';
export const PHASES: CyclePhase[] = ['period', 'follicular', 'ovulation', 'luteal'];
export const PHASE_NAMES: Record<CyclePhase, string> = {
  period: 'your period',
  follicular: 'the days after your period',
  ovulation: 'mid-cycle',
  luteal: 'the week before your period',
};

/**
 * Where a logged day falls in the cycle, counted back from the next period (the one that came, or the predicted
 * one): its last 7 days are the week before it, 12–16 days before it is mid-cycle (ovulation is about 14 days
 * before a period, whatever the cycle length), and the days after a period until then are follicular. The days
 * in between (8–11 before) aren't named. Null before the first logged period, and for days past a predicted
 * start that hasn't come: a late period isn't "the week before" forever.
 */
export function phaseOn(s: State, key: string, map = cycleMap(s)): CyclePhase | null {
  const { runs, avgLength } = map;
  let i = -1;
  for (let j = 0; j < runs.length && runs[j].start <= key; j++) i = j;
  if (i < 0) return null;
  const run = runs[i];
  if (key <= run.end) return 'period';
  const next = runs[i + 1]?.start ?? dayKey(addDays(noon(run.start), avgLength));
  const until = daysBetween(key, next);
  if (until <= 0) return null;
  if (until <= 7) return 'luteal';
  if (until >= 12 && until <= 16) return 'ovulation';
  return until > 16 ? 'follicular' : null;
}
