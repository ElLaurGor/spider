// Two-week self-experiments: "no screens after 22", "coffee only before 13"… The owner ticks off the days it
// was done (any days, not in a row), and at the end the outcome on those days is compared with the two weeks
// before. "Looks like it helped" needs 7+ days on each side and a difference chance alone rarely gives (a
// permutation test, stats.ts); paused (sick, away) days don't count on either side. No XP, no penalty.
import { addDays, dayKey, fmtDuration, MIN } from './dates';
import { pausedOn } from './pause';
import { avgMood, dayOf } from './selectors';
import { permP } from './stats';
import type { Experiment, ExperimentMetric, State } from './types';

export const EXPERIMENT_DAYS = 14;

export const METRICS: { id: ExperimentMetric; label: string; what: string }[] = [
  { id: 'sleepMin', label: 'Sleep length', what: 'how long you sleep that night' },
  { id: 'sleepRating', label: 'Sleep quality', what: 'how you rate that night' },
  { id: 'energy', label: 'Morning energy', what: 'your energy the next morning' },
  { id: 'mood', label: 'Mood', what: 'your mood that day' },
];
export const metricInfo = (m: ExperimentMetric) => METRICS.find((x) => x.id === m) ?? METRICS[0];

export const PRESETS: { emoji: string; title: string; metric: ExperimentMetric }[] = [
  { emoji: '📵', title: 'No screens after 22:00', metric: 'sleepRating' },
  { emoji: '☕', title: 'Coffee only before 13:00', metric: 'sleepMin' },
  { emoji: '🎮', title: 'No gaming after 22:00', metric: 'sleepMin' },
  { emoji: '🌙', title: 'Wind-down every evening', metric: 'sleepRating' },
  { emoji: '🚶', title: 'A 10-minute walk after lunch', metric: 'mood' },
  { emoji: '💧', title: 'A glass of water first thing', metric: 'energy' },
];

const next = (key: string) => dayKey(addDays(new Date(`${key}T12:00`), 1));

/** The outcome that belongs to day `key`: that night's sleep and the next morning's energy, or that day's mood. */
export function metricOn(s: State, key: string, metric: ExperimentMetric): number | null {
  if (metric === 'mood') return avgMood(dayOf(s, key));
  const d = s.days[next(key)];
  if (!d) return null;
  return metric === 'sleepMin' ? (d.sleepMin ?? null) : metric === 'sleepRating' ? (d.sleepRating ?? null) : (d.energy ?? null);
}

export const fmtMetric = (metric: ExperimentMetric, v: number) => (metric === 'sleepMin' ? fmtDuration(v * MIN) : `${v.toFixed(1)}/5`);

/** The running (or finished but not yet closed) experiment, if any. */
export const activeExperiment = (s: State) => (s.experiments ?? []).find((e) => !e.closedAt) ?? null;

/** The days an experiment covers, oldest first. */
export const experimentDays = (e: Experiment) => Array.from({ length: e.days }, (_, i) => dayKey(addDays(new Date(`${e.from}T12:00`), i)));

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const MIN_EACH = 7; // days needed on each side
/** One planned comparison, not a search through many, so a looser bar than Insights' is fair. */
const P_EXPERIMENT = 0.1;

export type ExperimentResult = {
  day: number; // 1-based day of the experiment today (capped at its length)
  ended: boolean;
  doneCount: number;
  during: number | null; // average outcome on the days it was done
  before: number | null; // average outcome in the two weeks before it started
  nDuring: number;
  nBefore: number;
  verdict: 'better' | 'worse' | 'same' | 'unknown';
};

export function experimentResult(s: State, e: Experiment, now = new Date()): ExperimentResult {
  const today = dayKey(now);
  const days = experimentDays(e);
  const elapsed = days.filter((k) => k <= today).length;
  const ended = today > days[days.length - 1];
  const during = e.done
    .filter((k) => !pausedOn(s, k))
    .map((k) => metricOn(s, k, e.metric))
    .filter((v): v is number => v != null);
  const before: number[] = [];
  for (let i = 1; i <= EXPERIMENT_DAYS; i++) {
    const key = dayKey(addDays(new Date(`${e.from}T12:00`), -i));
    if (!s.days[key] || pausedOn(s, key)) continue;
    const v = metricOn(s, key, e.metric);
    if (v != null) before.push(v);
  }
  const a = avg(during);
  const b = avg(before);
  const step = e.metric === 'sleepMin' ? 15 : 0.3; // smallest difference worth calling
  const clear = () => permP(during, before) < P_EXPERIMENT;
  const verdict =
    a == null || b == null || during.length < MIN_EACH || before.length < MIN_EACH
      ? 'unknown'
      : a - b >= step && clear()
        ? 'better'
        : b - a >= step && clear()
          ? 'worse'
          : 'same';
  return { day: Math.max(1, elapsed), ended, doneCount: e.done.length, during: a, before: b, nDuring: during.length, nBefore: before.length, verdict };
}

/** One plain sentence about the outcome. Sleep, energy and mood all count higher as better. */
export function verdictText(e: Experiment, r: ExperimentResult) {
  const m = metricInfo(e.metric);
  if (r.verdict === 'unknown') {
    return r.nBefore < MIN_EACH
      ? `Not enough yet: ${m.label.toLowerCase()} on at least ${MIN_EACH} days in the two weeks before is needed to compare with.`
      : `Not enough yet: ${m.what} on at least ${MIN_EACH} days you did it.`;
  }
  const vs = `${fmtMetric(e.metric, r.during!)} vs ${fmtMetric(e.metric, r.before!)} before`;
  if (r.verdict === 'same') return `No clear difference in ${m.label.toLowerCase()} (${vs}). Useful to know too.`;
  const what = m.label.toLowerCase();
  return r.verdict === 'better'
    ? `Looks like it helped: ${what} was better on the days you did it (${vs}).`
    : `Looks like it didn't help: ${what} was worse on the days you did it (${vs}).`;
}
