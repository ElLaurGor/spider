// The Storm protocol: while an orange or red SMHI warning or a VMA is active for the owner's area, S.P.I.D.E.R.
// drops the jokes. The alerts that hold it are kept in State (State.storm), so toneOn sees them for every day,
// planned notifications included, and the protocol lifts by itself once they end. Pure: the store feeds it
// what each check found. Imports nothing that imports selectors.ts, since tone.ts imports this.
import { addDays, dayKey, startOfDay } from './dates';
import type { Alert } from './outside';
import type { State, StormAlert } from './types';

const STORM_LEVELS = new Set(['ORANGE', 'RED', 'VMA']);
const RANK: Record<StormAlert['level'], number> = { VMA: 3, RED: 2, ORANGE: 1 };
const ADVICE_MAX = 180;

const time = (iso?: string) => {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isNaN(t) ? null : t;
};

/** What to do, in the alert's own words: its first sentence or two, or where to read more when it says nothing. */
export function adviceOf(a: Pick<Alert, 'text' | 'url'>) {
  const text = a.text.replace(/\s+/g, ' ').trim();
  if (!text) return `Details: ${a.url.replace(/^https?:\/\//, '')}`;
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  let out = '';
  for (const s of sentences) {
    if (out && (out + s).length > ADVICE_MAX) break;
    out += s;
  }
  out = out.trim();
  return out.length > ADVICE_MAX ? `${out.slice(0, ADVICE_MAX - 1).trimEnd()}…` : out;
}

/** The alerts in a check's list that hold the protocol: orange, red and VMA, not yet over. */
export function stormAlertsOf(list: Alert[], now = Date.now()): StormAlert[] {
  return list
    .filter((a) => STORM_LEVELS.has(a.level) && !((time(a.end) ?? Infinity) <= now))
    .map((a) => ({
      id: a.id,
      source: a.source,
      level: a.level as StormAlert['level'],
      title: a.title,
      advice: adviceOf(a),
      url: a.url,
      ...(a.start ? { start: a.start } : {}),
      ...(a.end ? { end: a.end } : {}),
      seenAt: now,
    }));
}

const same = (a: StormAlert, b: StormAlert) => a.id === b.id && a.level === b.level && a.title === b.title && a.advice === b.advice && a.start === b.start && a.end === b.end;

/**
 * State.storm after a check. `smhi`/`vma` are what each source returned, or null when it couldn't be reached:
 * a failed source keeps its alerts from before (a failed check isn't an all-clear). Returns `prev` itself
 * when nothing changed, so nothing gets saved; the time an alert was last seen is only moved on once a day.
 */
export function nextStorm(prev: StormAlert[] | undefined, smhi: Alert[] | null, vma: Alert[] | null, now = Date.now()): StormAlert[] | undefined {
  const old = prev ?? [];
  const keep = (source: StormAlert['source']) => old.filter((a) => a.source === source);
  const fresh = [...(vma ? stormAlertsOf(vma, now) : keep('VMA')), ...(smhi ? stormAlertsOf(smhi, now) : keep('SMHI'))];
  const next = fresh.map((a) => {
    const was = old.find((b) => b.id === a.id);
    return was && same(was, a) && (a.seenAt === was.seenAt || dayKey(was.seenAt) === dayKey(now)) ? was : a;
  });
  const unchanged = next.length === old.length && next.every((a, i) => a === old[i]);
  if (unchanged) return prev;
  return next.length ? next : undefined;
}

/**
 * Whether an alert covers day `key`: it starts before the day ends, and (with an end) hasn't ended by the
 * start of that day (by now, for today); without an end it holds from its start through the day it was last seen.
 */
function covers(a: StormAlert, key: string, now: number) {
  const dayStart = startOfDay(new Date(`${key}T12:00`)).getTime();
  const dayEnd = addDays(dayStart, 1).getTime();
  const start = time(a.start) ?? a.seenAt;
  if (start >= dayEnd) return false;
  const end = time(a.end);
  if (end != null) return end > (key === dayKey(now) ? Math.max(now, dayStart) : dayStart);
  return key <= dayKey(a.seenAt);
}

/** The worst alert holding the Storm protocol on day `key`, or null. */
export function stormOn(s: Pick<State, 'storm'>, key: string, now = Date.now()): StormAlert | null {
  let worst: StormAlert | null = null;
  for (const a of s.storm ?? []) if (covers(a, key, now) && (!worst || RANK[a.level] > RANK[worst.level])) worst = a;
  return worst;
}
