// Where focus went (step 8 days): a week's or month's Web Focus by session label ("thesis 3h 20m, taxes 50m"),
// and the app that snapped the most webs. Minutes are the time actually spent: a snapped web counts until it
// snapped. Pure, so logic-test can check it.
import { addDays, dayKey, MIN, startOfWeek } from './dates';
import { dayOf } from './selectors';
import type { FocusEntry, State } from './types';

export type FocusRange = 'week' | 'month';
export type FocusRow = { label: string; min: number; n: number };
export const NO_LABEL = 'No label';

/** The minutes a session really took: all of them when finished, up to the snap otherwise. */
export const focusMinutes = (f: FocusEntry) => (f.snapped ? Math.max(0, Math.round((f.end - f.start) / MIN)) : f.minutes);

/** The days of this week (from Monday) or this month, up to today. */
export function rangeDays(range: FocusRange, now = new Date()): string[] {
  const first = range === 'week' ? startOfWeek(now) : new Date(now.getFullYear(), now.getMonth(), 1, 12);
  const today = dayKey(now);
  const out: string[] = [];
  for (let d = new Date(first.getFullYear(), first.getMonth(), first.getDate(), 12); dayKey(d) <= today; d = addDays(d, 1)) out.push(dayKey(d));
  return out;
}

/**
 * The range's focus by label (case and spacing ignored, the latest spelling shown), most minutes first, and the
 * app that snapped the most webs ("gave up" isn't an app).
 */
export function focusBreakdown(s: State, range: FocusRange, now = new Date()) {
  const rows = new Map<string, FocusRow>();
  const snaps = new Map<string, number>();
  let total = 0;
  let sessions = 0;
  for (const key of rangeDays(range, now)) {
    for (const f of dayOf(s, key).focus ?? []) {
      const min = focusMinutes(f);
      const label = f.label?.trim() || NO_LABEL;
      const id = label.toLowerCase().replace(/\s+/g, ' ');
      const row = rows.get(id) ?? { label, min: 0, n: 0 };
      rows.set(id, { label, min: row.min + min, n: row.n + 1 });
      total += min;
      sessions++;
      if (f.snapped && f.snapped !== 'gave up') snaps.set(f.snapped, (snaps.get(f.snapped) ?? 0) + 1);
    }
  }
  const top = [...snaps.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  return {
    rows: [...rows.values()].filter((r) => r.min > 0).sort((a, b) => b.min - a.min || a.label.localeCompare(b.label)),
    total,
    sessions,
    snapper: top ? { app: top[0], n: top[1] } : null,
  };
}
