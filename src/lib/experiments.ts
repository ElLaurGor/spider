// Two-week self-experiments: "no screens after 22", "coffee only before 13"… She ticks off the days she did
// it (any days, not in a row), and at the end the outcome on those days is compared with the two weeks before.
// No XP, no penalty: it's her experiment.
import { addDays, dayKey, fmtDuration, MIN } from './dates';
import { avgMood, dayOf } from './selectors';
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
const MIN_EACH = 3;

export type ExperimentResult = {
  day: number; // 1-based day of the experiment today (capped at its length)
  ended: boolean;
  doneCount: number;
  during: number | null; // average outcome on the days she did it
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
  const during = e.done.map((k) => metricOn(s, k, e.metric)).filter((v): v is number => v != null);
  const before: number[] = [];
  for (let i = 1; i <= EXPERIMENT_DAYS; i++) {
    const key = dayKey(addDays(new Date(`${e.from}T12:00`), -i));
    if (!s.days[key]) continue;
    const v = metricOn(s, key, e.metric);
    if (v != null) before.push(v);
  }
  const a = avg(during);
  const b = avg(before);
  const step = e.metric === 'sleepMin' ? 15 : 0.3; // smallest difference worth calling
  const verdict = a == null || b == null || during.length < MIN_EACH || before.length < MIN_EACH ? 'unknown' : a - b >= step ? 'better' : b - a >= step ? 'worse' : 'same';
  return { day: Math.max(1, elapsed), ended, doneCount: e.done.length, during: a, before: b, nDuring: during.length, nBefore: before.length, verdict };
}

/** One plain sentence about the outcome. Sleep, energy and mood all count higher as better. */
export function verdictText(e: Experiment, r: ExperimentResult) {
  const m = metricInfo(e.metric);
  if (r.verdict === 'unknown') {
    return r.nBefore < MIN_EACH
      ? `Not enough ${m.label.toLowerCase()} logged in the two weeks before to compare with.`
      : `Not enough data yet: ${m.what} on at least 3 days you did it.`;
  }
  const vs = `${fmtMetric(e.metric, r.during!)} vs ${fmtMetric(e.metric, r.before!)} before`;
  if (r.verdict === 'same') return `No clear difference in ${m.label.toLowerCase()} (${vs}). Useful to know too.`;
  return `${m.label} was ${r.verdict === 'better' ? 'better' : 'worse'} on the days you did it: ${vs}.`;
}
