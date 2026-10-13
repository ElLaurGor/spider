// Heart rate during training: when a day's workouts happened (from logged sets and timed activities)
// and how hard the heart worked in them. Pure; the samples come from health.ts readHeartDay().
import { activityInfo } from './body';
import { MIN } from './dates';
import { activitiesOf } from './selectors';
import type { DayLog } from './types';

export type Sample = { at: number; bpm: number };
export type TrainWindow = { start: number; end: number; label: string };

const GAP = 30 * MIN; // sets further apart than this are separate sessions
const MARGIN = 5 * MIN;

/**
 * The day's training windows: logged sets grouped into sessions (5 minutes of margin around them) and
 * each timed activity, which is logged when it ends. Overlapping windows merge.
 */
export function workoutWindows(d: DayLog): TrainWindow[] {
  const raw: TrainWindow[] = [];
  const sets = [...d.sets].sort((a, b) => a.at - b.at);
  for (const set of sets) {
    const last = raw[raw.length - 1];
    if (last && set.at - (last.end - MARGIN) <= GAP) last.end = set.at + MARGIN;
    else raw.push({ start: set.at - MARGIN, end: set.at + MARGIN, label: 'Gym' });
  }
  for (const a of activitiesOf(d)) raw.push({ start: a.at - a.minutes * MIN, end: a.at, label: activityInfo(a.kind).label });
  raw.sort((a, b) => a.start - b.start);
  const merged: TrainWindow[] = [];
  for (const w of raw) {
    const last = merged[merged.length - 1];
    if (last && w.start <= last.end) {
      last.end = Math.max(last.end, w.end);
      if (last.label !== w.label) last.label = 'Gym';
    } else merged.push({ ...w });
  }
  return merged;
}

/** Heart rate zones as shares of max heart rate: Z1 50–60 % up to Z5 90 %+. */
export const ZONES = [
  { label: 'Z1', from: 0.5, name: 'easy' },
  { label: 'Z2', from: 0.6, name: 'steady' },
  { label: 'Z3', from: 0.7, name: 'tempo' },
  { label: 'Z4', from: 0.8, name: 'hard' },
  { label: 'Z5', from: 0.9, name: 'max' },
] as const;

export const DEFAULT_MAX_HR = 190;

/**
 * Average and highest bpm inside a window and minutes per zone. Each sample stands for the time until
 * the next one (at most 2 minutes, so a gap in the data isn't counted). Null with under 3 samples.
 */
export function heartIn(samples: Sample[], w: { start: number; end: number }, maxHr: number) {
  const inside = samples.filter((x) => x.at >= w.start && x.at <= w.end);
  if (inside.length < 3) return null;
  const zoneMs = ZONES.map(() => 0);
  for (let i = 0; i < inside.length; i++) {
    const next = inside[i + 1]?.at ?? Math.min(w.end, inside[i].at + MIN);
    const ms = Math.min(2 * MIN, Math.max(0, next - inside[i].at));
    const share = inside[i].bpm / maxHr;
    let z = -1;
    for (let k = 0; k < ZONES.length; k++) if (share >= ZONES[k].from) z = k;
    if (z >= 0) zoneMs[z] += ms;
  }
  return {
    avg: Math.round(inside.reduce((a, x) => a + x.bpm, 0) / inside.length),
    max: Math.max(...inside.map((x) => x.bpm)),
    zoneMin: zoneMs.map((ms) => Math.round(ms / MIN)),
    samples: inside.length,
  };
}
