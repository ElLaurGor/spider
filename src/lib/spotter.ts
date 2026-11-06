// The spotter in Web Focus (step 8 days): a league rival (this week's nemesis first) "works alongside" a session,
// set a little longer than her usual length. When her timer ends it offers the rest ("I'm doing 10 more, you
// in?"); finishing that extra round adds it to the session and earns a roast of the bot. Stopping it early costs
// nothing: no snapped web, no roast, the session before still counts. A session started from a Plan task also
// offers to tick the task off at the end. Pure, so logic-test can check it.
import { addDays, dayKey, MIN } from './dates';
import { nemesisOf, rosterName, standings } from './league';
import { dayOf } from './selectors';
import type { FocusEntry, FocusSide, Spotter, State, Task } from './types';

/** How much longer than her usual length the spotter goes, and the longest it plans. */
export const SPOTTER_EXTRA = 10;
export const SPOTTER_MAX = 120;
/** The spotter's offer stays open this long after the timer ends; the task tick-off a while longer. */
export const OFFER_MS = 15 * MIN;
export const TASK_OFFER_MS = 2 * 60 * MIN;
const LOOK_BACK = 60;

/** Her usual session length: the median of the last 10 finished sessions in the past 60 days, else `fallback`. */
export function usualFocus(s: State, fallback: number, now = new Date()): number {
  const mins: number[] = [];
  for (let i = 0; i < LOOK_BACK && mins.length < 10; i++) {
    const done = (dayOf(s, dayKey(addDays(now, -i))).focus ?? []).filter((f) => !f.snapped).reverse();
    for (const f of done) if (mins.length < 10) mins.push(f.minutes);
  }
  if (!mins.length) return fallback;
  const a = [...mins].sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : Math.round((a[mid - 1] + a[mid]) / 2);
}

/**
 * The rival who works alongside a session of `minutes`: this week's nemesis, else the one just above her in the
 * table, else the first. Plans her usual length (or this session's, if longer) plus SPOTTER_EXTRA. No league, no spotter.
 */
export function spotterFor(s: State, minutes: number, now = new Date()): Spotter | null {
  const l = s.league;
  if (!l?.rivals.length) return null;
  const table = standings(s, now);
  const me = table.findIndex((r) => r.me);
  const above = me > 0 ? l.rivals.find((r) => r.id === table[me - 1].id) : undefined;
  const nemesis = nemesisOf(s);
  const r = (nemesis && l.rivals.find((x) => x.id === nemesis.id)) ?? above ?? l.rivals[0];
  const planned = Math.min(SPOTTER_MAX, Math.max(minutes, usualFocus(s, minutes, now)) + SPOTTER_EXTRA);
  return { base: rosterName(r), name: r.name, emoji: r.emoji, minutes: Math.max(planned, minutes + 5) };
}

/** The side record for a session starting at `start`: its spotter and the Plan task it's about. */
export function sideFor(s: State, start: number, minutes: number, taskId?: string): FocusSide {
  const spotter = spotterFor(s, minutes, new Date(start));
  const task = taskId && s.tasks.some((t) => t.id === taskId && !t.done) ? taskId : undefined;
  return { start, ...(spotter ? { spotter } : {}), ...(task ? { taskId: task } : {}) };
}

/** The running session's side record, when it's the spotter's extra round. */
export function extraRound(s: State, f: { start: number } | null = s.activeFocus): FocusSide | null {
  const side = s.focusSide;
  return f && side?.start === f.start && side.extends ? side : null;
}

/** The session an extra round adds to, as logged. */
function entryOf(s: State, side: FocusSide): FocusEntry | null {
  const day = side.extends?.day ?? dayKey(side.start);
  const id = side.extends?.id;
  return (dayOf(s, day).focus ?? []).find((f) => (id ? f.id === id : f.start === side.start)) ?? null;
}

/** The finished extra round's minutes added to the session it extends (entry `id` on `day`), ending at `end`. */
export function withExtension(s: State, day: string, id: string, add: number, end: number): State {
  const d = dayOf(s, day);
  const focus = (d.focus ?? []).map((f) => (f.id === id ? { ...f, minutes: f.minutes + add, end: Math.max(f.end, end) } : f));
  return { ...s, days: { ...s.days, [day]: { ...d, focus } } };
}

export type EndOffer = {
  entry: FocusEntry;
  /** Minutes the spotter goes on for, offered as an extra round; null when there's no offer. */
  more: number | null;
  /** The spotter's extra round was done to the end. */
  outlasted: boolean;
  task: Task | null;
  spotter: Spotter | null;
};

/**
 * What the Focus screen offers once a session is over: the spotter's extra round (right after a finished
 * session only), whether she outlasted the spotter, and ticking off the Plan task the session was for.
 */
export function endOffer(s: State, now = Date.now()): EndOffer | null {
  const side = s.focusSide;
  if (!side || side.closed || s.activeFocus) return null;
  const entry = entryOf(s, side);
  if (!entry) return null;
  const ended = side.extends ? Math.max(entry.end, side.start) : entry.end;
  if (now - ended > TASK_OFFER_MS) return null;
  const sp = side.spotter ?? null;
  const more = !side.extends && sp && !entry.snapped && sp.minutes > entry.minutes && now - entry.end < OFFER_MS ? sp.minutes - entry.minutes : null;
  const outlasted = !!side.extends && !!sp && entry.minutes >= sp.minutes;
  const task = side.taskId ? (s.tasks.find((t) => t.id === side.taskId && !t.done) ?? null) : null;
  if (more == null && !outlasted && !task) return null;
  return { entry, more, outlasted, task, spotter: sp };
}
