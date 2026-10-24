// Step totals from Health Connect step records. Pure, so it's testable offline (health.ts does the reading).
import { ZEPP } from './sleep';

export type StepRecord = { start: number; end: number; count: number; origin?: string; modified?: number };

/**
 * One app's steps in [from, to): its records added up, with the part of a record that sticks out of the range
 * prorated (as Health Connect's own aggregate does). A record written again for the same span counts once, the
 * newest. Null when records overlap in any other way: those can't simply be added up.
 */
export function stepsIn(records: StepRecord[], from: number, to: number): number | null {
  const bySpan = new Map<string, StepRecord>();
  for (const r of records) {
    const inside = r.end > r.start ? r.end > from && r.start < to : r.start >= from && r.start < to;
    if (!inside || r.count <= 0) continue;
    const k = `${r.start}-${r.end}`;
    const prev = bySpan.get(k);
    if (!prev || (r.modified ?? 0) >= (prev.modified ?? 0)) bySpan.set(k, r);
  }
  let total = 0;
  let reached = -Infinity;
  for (const r of [...bySpan.values()].sort((a, b) => a.start - b.start || a.end - b.end)) {
    if (r.start < reached) return null;
    reached = Math.max(reached, r.end);
    const span = r.end - r.start;
    total += span > 0 ? (r.count * (Math.min(r.end, to) - Math.max(r.start, from))) / span : r.count;
  }
  return Math.round(total);
}

export type StepSource = { origin: string; name: string; steps: number | null; records: number; lastEnd: number | null; lastWritten: number | null };

const NAMES: Record<string, string> = {
  [ZEPP]: 'Zepp',
  'com.google.android.apps.fitness': 'Google Fit',
  'com.sec.android.app.shealth': 'Samsung Health',
  'com.google.android.apps.healthdata': 'This phone (Health Connect)',
  android: 'This phone',
};
export const sourceName = (origin: string) => NAMES[origin] ?? origin;

/** Each app's steps in [from, to) with when its newest record ends and was written: what the steps check shows. Zepp first. */
export function stepSources(records: StepRecord[], from: number, to: number): StepSource[] {
  const byOrigin = new Map<string, StepRecord[]>();
  for (const r of records) {
    const o = r.origin ?? 'unknown';
    byOrigin.set(o, [...(byOrigin.get(o) ?? []), r]);
  }
  return [...byOrigin.entries()]
    .map(([origin, list]) => ({
      origin,
      name: sourceName(origin),
      steps: stepsIn(list, from, to),
      records: list.length,
      lastEnd: list.length ? Math.max(...list.map((r) => r.end)) : null,
      lastWritten: list.some((r) => r.modified != null) ? Math.max(...list.map((r) => r.modified ?? 0)) : null,
    }))
    .sort((a, b) => Number(b.origin === ZEPP) - Number(a.origin === ZEPP) || (b.steps ?? 0) - (a.steps ?? 0));
}
