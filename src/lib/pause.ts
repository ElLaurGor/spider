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

/**
 * Starts (or changes) the pause covering today. Unchanged state when the month's cap is used up.
 * Its days so far keep their kind (sick days stay sick when it turns into away; a switch to sick makes them
 * sick too), and a pause planned for later (Julfrid's) keeps the days the new one doesn't cover.
 */
export function startPause(s: State, kind: Pause['kind'], days: number, today = dayKey()): State {
  const current = pauseOn(s, today);
  const yesterday = dayKey(addDays(noonOf(today), -1));
  const oldest = dayKey(addDays(noonOf(today), -KEEP_DAYS));
  const rest = pausesOf(s).filter((p) => p !== current && p.from <= today && p.to >= oldest);
  const later = pausesOf(s).filter((p) => p !== current && p.from > today);
  const pastKind = kind === 'sick' ? 'sick' : current?.kind;
  const past = current && current.from <= yesterday ? [{ ...current, to: yesterday, kind: pastKind ?? current.kind }] : [];
  const to = pauseEnd({ ...s, pauses: [...rest, ...past, ...later] }, today, days);
  if (!to) return s;
  const after = dayKey(addDays(noonOf(to), 1));
  const kept = later.filter((p) => p.to > to).map((p) => (p.from > to ? p : { ...p, from: after }));
  // One pause when the kind carries on; the days so far as their own when it changed.
  const merged = past.length && past[0].kind === kind;
  const head = merged ? [] : past;
  return { ...s, pauses: [...rest, ...head, { from: merged ? past[0].from : today, to, kind }, ...kept] };
}

/**
 * Ends the pause covering today from tomorrow on. Today stays paused: it already got the one gentle quest
 * and the smaller boss, and taking that back after the fact (or handing a chest out for it) isn't fair
 * either way. `endedAt` tells the screens it's over.
 */
export function endPause(s: State, today = dayKey(), now = Date.now()): State {
  const current = pauseOn(s, today);
  if (!current || current.endedAt) return s;
  const others = pausesOf(s).filter((p) => p !== current);
  return { ...s, pauses: [...others, { ...current, to: today, endedAt: now }] };
}

/** A pause that still lies ahead of you (today's, unless "I'm back" was tapped). */
export const activePause = (s: State, key = dayKey()) => {
  const p = pauseOn(s, key);
  return p && !p.endedAt ? p : null;
};
