// Weight & measurement helpers. Neutral by design: numbers and trends, no judgement.
import type { BodyEntry, State } from './types';

export type BodyField = { key: Exclude<keyof BodyEntry, 'id' | 'at'>; label: string; unit: string; step: number; min: number; max: number; fallback: number };

export const BODY_FIELDS: BodyField[] = [
  { key: 'weight', label: 'Weight', unit: 'kg', step: 0.1, min: 20, max: 300, fallback: 70 },
  { key: 'waist', label: 'Waist', unit: 'cm', step: 0.5, min: 30, max: 200, fallback: 80 },
  { key: 'chest', label: 'Chest', unit: 'cm', step: 0.5, min: 50, max: 200, fallback: 95 },
  { key: 'hips', label: 'Hips', unit: 'cm', step: 0.5, min: 50, max: 200, fallback: 100 },
  { key: 'arm', label: 'Upper arm', unit: 'cm', step: 0.5, min: 15, max: 70, fallback: 32 },
  { key: 'thigh', label: 'Thigh', unit: 'cm', step: 0.5, min: 30, max: 100, fallback: 55 },
  { key: 'bodyFat', label: 'Body fat', unit: '%', step: 0.5, min: 3, max: 60, fallback: 25 },
];

const DAY = 86_400_000;
const sorted = (s: State) => [...s.bodyLog].sort((a, b) => a.at - b.at);

/** Entries that have a value for `key`, oldest first. */
export const series = (s: State, key: BodyField['key']) =>
  sorted(s)
    .filter((e) => e[key] != null)
    .map((e) => ({ at: e.at, v: e[key] as number }));

export const latest = (s: State, key: BodyField['key']) => series(s, key).at(-1)?.v;

/** Average of the values logged in the last `days` days (smooths daily ups and downs). */
export function recentAverage(s: State, key: BodyField['key'], days = 7, now = Date.now()) {
  const vals = series(s, key).filter((p) => p.at >= now - days * DAY);
  return vals.length ? vals.reduce((a, p) => a + p.v, 0) / vals.length : null;
}

/** Change between the first value at least `days` ago (or the first ever) and the latest. */
export function changeOver(s: State, key: BodyField['key'], days: number | null, now = Date.now()) {
  const pts = series(s, key);
  if (pts.length < 2) return null;
  const from = days == null ? pts[0] : ([...pts].reverse().find((p) => p.at <= now - days * DAY) ?? pts[0]);
  const to = pts[pts.length - 1];
  if (from === to) return null;
  return Math.round((to.v - from.v) * 10) / 10;
}

/** Rolling average of the previous `window` entries, for the trend line. */
export function rolling(points: { at: number; v: number }[], window = 7) {
  return points.map((p, i) => {
    const slice = points.slice(Math.max(0, i - window + 1), i + 1);
    return { at: p.at, v: slice.reduce((a, x) => a + x.v, 0) / slice.length };
  });
}

export const fmtChange = (n: number | null, unit: string) => (n == null ? '–' : `${n > 0 ? '+' : n < 0 ? '−' : '±'}${Math.abs(n).toFixed(1)} ${unit}`);
