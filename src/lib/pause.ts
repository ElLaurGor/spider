// Sick or away: paused days ask for less (one quest, no gym or water nagging), and the boss, your pace,
// S.P.I.D.E.R.'s respect and league demotion leave them out. At most 7 paused days per calendar month,
// so it can't be used to dodge everything.
import { addDays, dayKey } from './dates';
import type { Pause, State } from './types';

export const PAUSE_DAYS_PER_MONTH = 7;
const KEEP_DAYS = 120; // older pauses are dropped: nothing reads that far back

const pausesOf = (s: State) => s.pauses ?? [];
const noonOf = (key: string) => new Date(`${key}T12:00`);

/** The pause covering a day, if any. */
export const pauseOn = (s: State, key = dayKey()): Pause | null => pausesOf(s).find((p) => p.from <= key && key <= p.to) ?? null;
export const pausedOn = (s: State, key = dayKey()) => pauseOn(s, key) != null;

/** Paused days in the calendar month of `key`. */
export function pausedDaysInMonth(s: State, key = dayKey()) {
  const month = key.slice(0, 7);
  const days = new Set<string>();
  for (const p of pausesOf(s)) {
    for (let d = noonOf(p.from); dayKey(d) <= p.to; d = addDays(d, 1)) {
      if (dayKey(d).startsWith(month)) days.add(dayKey(d));
    }
  }
  return days.size;
}

/** Paused days in the week that starts on `monday`. */
export const pausedInWeek = (s: State, monday: Date) =>
  Array.from({ length: 7 }, (_, i) => dayKey(addDays(monday, i))).filter((k) => pausedOn(s, k)).length;

/** The last day a pause of `days` days from `from` can reach before a month's cap runs out, or null. */
export function pauseEnd(s: State, from: string, days: number): string | null {
  let last: string | null = null;
  const used: Record<string, number> = {};
  for (let i = 0; i < days; i++) {
    const k = dayKey(addDays(noonOf(from), i));
    if (!pausedOn(s, k)) {
      const month = k.slice(0, 7);
      used[month] ??= pausedDaysInMonth(s, k);
      if (used[month] >= PAUSE_DAYS_PER_MONTH) break;
      used[month]++;
    }
    last = k;
  }
  return last;
}

/** Starts (or changes) the pause covering today. Unchanged state when the month's cap is used up. */
export function startPause(s: State, kind: Pause['kind'], days: number, today = dayKey()): State {
  const current = pauseOn(s, today);
  const yesterday = dayKey(addDays(noonOf(today), -1));
  const oldest = dayKey(addDays(noonOf(today), -KEEP_DAYS));
  // Old pauses stay; the current one is re-measured from today, and a planned later one is replaced.
  const rest = pausesOf(s).filter((p) => p !== current && p.from <= today && p.to >= oldest);
  const past = current && current.from <= yesterday ? [{ ...current, to: yesterday }] : [];
  const to = pauseEnd({ ...s, pauses: [...rest, ...past] }, today, days);
  if (!to) return s;
  return { ...s, pauses: [...rest, { from: current?.from ?? today, to, kind }] };
}

/** Ends the pause covering today: today and later count normally again. */
export function endPause(s: State, today = dayKey()): State {
  const current = pauseOn(s, today);
  if (!current) return s;
  const yesterday = dayKey(addDays(noonOf(today), -1));
  const others = pausesOf(s).filter((p) => p !== current);
  return { ...s, pauses: current.from > yesterday ? others : [...others, { ...current, to: yesterday }] };
}
