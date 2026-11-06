// Notes from past you (step 8 days). After a good moment (a finished workout, a won contract, a good mood
// check-in) S.P.I.D.E.R. asks, at most once a week, for one line "for the you who's about to skip"; the evening
// debrief can take one "glad I did this" win a night. Those words come back inside messages that already go
// out: the gym reminder's shame slot, the workout-move prompt, the comeback bonus and the rough-patch card. No
// new pings. On a kind day only the wins come back: a skip note there would read as a nudge. Pure, so
// logic-test can check it.
import { dayKey, startOfWeek, uid } from './dates';
import { pauseOn } from './pause';
import { dayOf, moodsOf } from './selectors';
import { quietDay } from './tone';
import type { PastNote, PastYou, State } from './types';

/** Notes kept (the newest), and the longest line taken. */
export const PAST_NOTES_MAX = 40;
export const PAST_NOTE_CHARS = 140;
/** An ask waits this long for its line, then lets go. */
export const ASK_OPEN_MS = 3 * 86_400_000;

type Why = NonNullable<PastYou['ask']>['why'];
export type PastSlot = 'gym' | 'move' | 'comeback' | 'rough';

const weekOf = (at: number) => dayKey(startOfWeek(new Date(at)));
const pastOf = (s: State): PastYou => s.pastYou ?? { notes: [] };

/** The good moment between `prev` and `next` today, if any: a workout counted, a contract won, a check-in of 4 or 5. */
export function goodMoment(prev: State, next: State, now = Date.now()): Why | null {
  const key = dayKey(now);
  if (!dayOf(prev, key).workoutCounted && dayOf(next, key).workoutCounted) return 'workout';
  if (prev.contract?.status === 'open' && next.contract?.status === 'won' && prev.contract.week === next.contract.week) return 'contract';
  const seen = new Set(moodsOf(dayOf(prev, key)).map((m) => m.id));
  if (moodsOf(dayOf(next, key)).some((m) => !seen.has(m.id) && m.level >= 4)) return 'mood';
  return null;
}

/**
 * `next` with a waiting ask when it brought a good moment and this week hasn't been asked yet. Never on a sick
 * day (that's not the day for homework).
 */
export function withPastYouAsk(prev: State, next: State, now = Date.now()): State {
  if (!next.onboarded) return next;
  const past = pastOf(next);
  const week = weekOf(now);
  if (past.askedWeek === week || pauseOn(next, dayKey(now))?.kind === 'sick') return next;
  const why = goodMoment(prev, next, now);
  if (!why) return next;
  return { ...next, pastYou: { ...past, askedWeek: week, ask: { why, at: now } } };
}

/** The ask waiting for its line, while it's fresh. */
export function openAsk(s: State, now = Date.now()) {
  const ask = s.pastYou?.ask;
  if (!ask || now - ask.at >= ASK_OPEN_MS) return null;
  // Asked on a good day, but today is sick or otherwise rough: it waits, unasked, until a better one (or expires).
  const today = dayKey(now);
  return pauseOn(s, today)?.kind === 'sick' || quietDay(s, today, new Date(now)) ? null : ask;
}

const clean = (text: string) => text.replace(/\s+/g, ' ').trim().slice(0, PAST_NOTE_CHARS);

/** One line for the you who's about to skip (the ask is answered with it). Empty text changes nothing. */
export function withSkipNote(s: State, text: string, now = Date.now(), id = uid()): State {
  const t = clean(text);
  if (!t) return s;
  const past = pastOf(s);
  const note: PastNote = { id, text: t, at: now, day: dayKey(now), kind: 'skip', ...(past.ask ? { after: past.ask.why } : {}) };
  return { ...s, pastYou: { ...past, ask: null, notes: [...past.notes, note].slice(-PAST_NOTES_MAX) } };
}

/** The ask waved off: it doesn't come back this week. */
export const withoutAsk = (s: State): State => (s.pastYou?.ask ? { ...s, pastYou: { ...pastOf(s), ask: null } } : s);

/** Tonight's "glad I did this" (one a night: a second one replaces it; empty text takes it back). */
export function withWin(s: State, day: string, text: string, now = Date.now(), id = uid()): State {
  const past = pastOf(s);
  const others = past.notes.filter((n) => !(n.kind === 'win' && n.day === day));
  const t = clean(text);
  const notes = t ? [...others, { id, text: t, at: now, day, kind: 'win' as const, after: 'debrief' as const }] : others;
  return { ...s, pastYou: { ...past, notes: notes.slice(-PAST_NOTES_MAX) } };
}

export const winOn = (s: State, day: string) => pastOf(s).notes.find((n) => n.kind === 'win' && n.day === day) ?? null;

export const withoutNote = (s: State, id: string): State => ({ ...s, pastYou: { ...pastOf(s), notes: pastOf(s).notes.filter((n) => n.id !== id) } });

const hash = (str: string) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
};

/**
 * The note past you left for slot `slot` on day `key`: on a kind day (quietDay) and in the rough-patch card only
 * the wins; elsewhere the lines for the you who's about to skip first, the wins when there are none. Written
 * before that day. The same note for a slot all day (seeded by day and slot), different slots usually differ.
 */
export function pastYouFor(s: State, key: string, slot: PastSlot, now = new Date(), kind = false): PastNote | null {
  const notes = pastOf(s).notes.filter((n) => n.day < key || (n.day === key && n.at < now.getTime()));
  // `kind`: the caller already knows the day is kind (notifications plan with the cycle forecast, which quietDay can't see).
  const winsOnly = kind || slot === 'rough' || quietDay(s, key, now);
  const wins = notes.filter((n) => n.kind === 'win');
  const skips = notes.filter((n) => n.kind === 'skip');
  const pool = winsOnly ? wins : skips.length ? skips : wins;
  if (!pool.length) return null;
  return pool[hash(`${key}|${slot}`) % pool.length];
}

/** How a note reads inside a message. */
export const pastYouText = (n: PastNote) => (n.kind === 'win' ? `📝 Past you, glad they did it: "${n.text}"` : `📝 Past you left this: "${n.text}"`);

/** A message's tail with past you's note for that slot (a leading space), or ''. */
export function pastYouTail(s: State, key: string, slot: PastSlot, now = new Date(), kind = false) {
  const n = pastYouFor(s, key, slot, now, kind);
  return n ? ` ${pastYouText(n)}` : '';
}
