// Away mode planned ahead (step 8 days). Besides "from today" (pause.ts startPause), a future away period can be
// set from–to, and S.P.I.D.E.R. offers one for a multi-day all-day calendar event or a trip countdown with an end
// date ("Away 12–16 Dec?"). The monthly cap (PAUSE_DAYS_PER_MONTH) still holds: a trip longer than what's left
// is planned up to where the cap runs out. Planned days are paused from the start, so their reminders are
// planned as away days (no water, gym, habit or move nagging). Pure, so logic-test can check it.
import { nextDate } from './countdowns';
import { addDays, dayKey } from './dates';
import { pauseEnd, pausedOn, pauseOn, startPause } from './pause';
import type { CalEvent, Pause, State } from './types';

/** How far ahead a trip can be planned, and the longest one taken in one go. */
export const AWAY_AHEAD_DAYS = 120;
export const AWAY_MAX_DAYS = 14;

const noon = (key: string) => new Date(`${key}T12:00`);
const daysBetween = (from: string, to: string) => Math.round((noon(to).getTime() - noon(from).getTime()) / 86_400_000) + 1;

/** "12–16 Dec", "30 Dec – 2 Jan", "12 Dec" for one day. */
export function rangeText(from: string, to: string) {
  const a = noon(from);
  const b = noon(to);
  const month = (d: Date) => d.toLocaleDateString('en-GB', { month: 'short' });
  if (from === to) return `${a.getDate()} ${month(a)}`;
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) return `${a.getDate()}–${b.getDate()} ${month(b)}`;
  return `${a.getDate()} ${month(a)} – ${b.getDate()} ${month(b)}`;
}

export type AwayResult = 'ok' | 'short' | 'cap' | 'past' | 'paused';

/**
 * Away from `from` to `to` (inclusive). From today it's a pause starting now (startPause); a day already
 * paused in the range, a past start or a range over AWAY_MAX_DAYS changes nothing. `short`: the month's cap
 * ran out first, so it ends early (`to` says where).
 */
export function planAway(s: State, from: string, to: string, today = dayKey()): { state: State; result: AwayResult; to: string | null } {
  if (from < today || to < from || to > dayKey(addDays(noon(today), AWAY_AHEAD_DAYS)) || daysBetween(from, to) > AWAY_MAX_DAYS) {
    return { state: s, result: 'past', to: null };
  }
  const days = daysBetween(from, to);
  for (let i = 0; i < days; i++) if (pausedOn(s, dayKey(addDays(noon(from), i)))) return { state: s, result: 'paused', to: null };
  if (from === today) {
    const next = startPause(s, 'away', days, today);
    const end = pauseOn(next, today)?.to ?? null;
    if (next === s || !end) return { state: s, result: 'cap', to: null };
    return { state: next, result: end < to ? 'short' : 'ok', to: end };
  }
  const end = pauseEnd(s, from, days);
  if (!end) return { state: s, result: 'cap', to: null };
  const pause: Pause = { from, to: end, kind: 'away' };
  return { state: { ...s, pauses: [...(s.pauses ?? []), pause] }, result: end < to ? 'short' : 'ok', to: end };
}

/** Away periods planned for later (starting after today), soonest first. */
export const plannedAways = (s: State, today = dayKey()) => (s.pauses ?? []).filter((p) => p.from > today).sort((a, b) => a.from.localeCompare(b.from));

/** A planned away period taken back before it starts. */
export const withoutPlannedAway = (s: State, from: string, today = dayKey()): State =>
  from > today ? { ...s, pauses: (s.pauses ?? []).filter((p) => !(p.from === from && p.kind === 'away')) } : s;

export type AwayOffer = { from: string; to: string; title: string; key: string };
export const offerKey = (from: string, to: string) => `away:${from}:${to}`;

/**
 * Trips worth offering away mode for: multi-day all-day calendar events and countdowns with an end date,
 * starting tomorrow or later (within AWAY_AHEAD_DAYS), with no day already paused, not closed with "No" (State.dismissed).
 */
export function awayOffers(s: State, events: CalEvent[], now = new Date()): AwayOffer[] {
  const today = dayKey(now);
  const last = dayKey(addDays(noon(today), AWAY_AHEAD_DAYS));
  const out = new Map<string, AwayOffer>();
  const add = (from: string, to: string, title: string) => {
    if (from <= today || to <= from || from > last || daysBetween(from, to) > AWAY_MAX_DAYS) return;
    const key = offerKey(from, to);
    if ((s.dismissed ?? []).includes(key) || out.has(key)) return;
    for (let i = 0; i < daysBetween(from, to); i++) if (pausedOn(s, dayKey(addDays(noon(from), i)))) return;
    out.set(key, { from, to, title, key });
  };
  for (const e of events) if (e.allDay && e.end > e.start) add(dayKey(e.start), dayKey(e.end - 1), e.title);
  for (const c of s.countdowns) {
    if (c.yearly || !c.until) continue;
    add(dayKey(nextDate(c, now)), c.until, `${c.emoji} ${c.title}`);
  }
  return [...out.values()].sort((a, b) => a.from.localeCompare(b.from));
}
