// Big days: one-off calendar events (not part of a repeating series) that look like a big deal by their title,
// in English or Swedish: the dentist, an interview, an exam, a flight, a party. The morning brief wishes luck, and
// the evening debrief asks how it went with one tap: Nailed it / Survived / Rough. The answer is kept by kind only
// (never the event's title, so nothing private ends up in a backup) and comes back the next time a similar event
// is on: "Last time: 'survived'. Low bar." A rough one gets a kind reply and is never brought up again: it feeds no
// tone, stat, roast, recap, share or background config. Pure, so it's tested in logic-test.ts.
import { dayKey, fmtTime } from './dates';
import type { LineKey } from './lines';
import type { BigAnswer, BigDayAnswer, BigKind, CalEvent, State } from './types';

export type { BigAnswer, BigKind } from './types';

type KindInfo = { label: string; emoji: string; words: string[] };
/**
 * Keywords are matched inside words too (Swedish compounds: "tandläkartid", "flygresa"), except that a leading space
 * means "starts a word" and a trailing one "ends a word" ("exam" isn't "example", "tenta" isn't "tentative").
 * The first kind that matches wins.
 */
export const BIG_KINDS: Record<BigKind, KindInfo> = {
  dentist: { label: 'the dentist', emoji: '🦷', words: ['dentist', 'tandläk', 'tandvård', 'tandhygien', 'orthodont', 'tandreglering'] },
  driving: { label: 'the driving test', emoji: '🚗', words: ['driving test', 'uppkörning', 'körprov', 'kunskapsprov'] },
  doctor: { label: 'the doctor', emoji: '🩺', words: ['doctor', 'läkar', 'vårdcentral', 'hospital', 'sjukhus', 'clinic', 'klinik', 'specialist', ' gp '] },
  interview: { label: 'the interview', emoji: '💼', words: ['interview', 'intervju'] },
  exam: { label: 'the exam', emoji: '📝', words: [' exam ', ' exams ', ' examen', ' examination', ' tenta ', ' tentan ', 'omtenta', ' tentamen'] },
  presentation: { label: 'the presentation', emoji: '🎤', words: ['presentation', 'presentera', 'pitch', 'keynote', 'föredrag', 'disputation'] },
  flight: { label: 'the flight', emoji: '✈️', words: ['flight', ' flyg', 'airport', 'arlanda', 'boarding'] },
  wedding: { label: 'the wedding', emoji: '💍', words: ['wedding', 'bröllop'] },
  moving: { label: 'moving day', emoji: '📦', words: ['moving day', 'flytt', 'move house'] },
  date: { label: 'the date', emoji: '🌹', words: ['date night', 'first date', ' dejt'] },
  concert: { label: 'the concert', emoji: '🎶', words: ['concert', 'konsert', ' gig '] },
  race: { label: 'the race', emoji: '🏁', words: ['marathon', 'maraton', 'halvmara', 'tjejmilen', 'midnattsloppet', 'vasalopp', 'race day'] },
  party: { label: 'the party', emoji: '🎉', words: ['party', 'fest', 'kalas', 'celebration'] },
  haircut: { label: 'the haircut', emoji: '💇', words: ['hairdresser', 'haircut', 'frisör', 'barber'] },
};
const ORDER = Object.keys(BIG_KINDS) as BigKind[];
/** False friends: titles that contain a keyword without being a big day ("manifest" has a fest in it). */
const NOT_BIG = ['manifest', 'flygplansläge'];

export const ANSWERS: { id: BigAnswer; label: string; emoji: string }[] = [
  { id: 'nailed', label: 'Nailed it', emoji: '💪' },
  { id: 'survived', label: 'Survived', emoji: '😮‍💨' },
  { id: 'rough', label: 'Rough', emoji: '🫂' },
];

/** The kept answers, the newest 120 (kind and answer only). */
export const BIG_KEEP = 120;

/** What kind of big day a title is, or null. Case and accents as typed; matched in lower case. */
export function bigKindOf(title: string): BigKind | null {
  const t = ` ${title.toLowerCase().replace(/[^a-z0-9åäöéüæø]+/g, ' ').trim()} `;
  if (NOT_BIG.some((w) => t.includes(w))) return null;
  return ORDER.find((k) => BIG_KINDS[k].words.some((w) => t.includes(w))) ?? null;
}

/** A stable id for an event that never carries its title: the calendar's key, hashed. */
export function eventId(e: Pick<CalEvent, 'key'>) {
  let h = 0x811c9dc5;
  for (let i = 0; i < e.key.length; i++) {
    h ^= e.key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

const norm = (title: string) => title.trim().toLowerCase();

export type BigDay = { event: CalEvent; kind: BigKind; id: string; label: string; emoji: string };

/**
 * The day's big events: one-off events whose title says what they are. A repeating series is left out (the
 * calendar says so, or the same title turns up on another day of the loaded week, which calendars without the
 * repeat flag give away).
 */
export function bigDaysOn(events: CalEvent[], day: string): BigDay[] {
  const days = new Map<string, Set<string>>();
  for (const e of events) {
    const t = norm(e.title);
    days.set(t, (days.get(t) ?? new Set()).add(dayKey(e.start)));
  }
  const out: BigDay[] = [];
  for (const e of events) {
    if (dayKey(e.start) !== day || e.recurring || (days.get(norm(e.title))?.size ?? 0) > 1) continue;
    const kind = bigKindOf(e.title);
    if (!kind) continue;
    out.push({ event: e, kind, id: eventId(e), label: BIG_KINDS[kind].label, emoji: BIG_KINDS[kind].emoji });
  }
  return out;
}

/** How the last big day of this kind went, before `day` (rough ones too: callers keep those to themselves). */
export function lastAnswer(s: State, kind: BigKind, day: string): BigDayAnswer | null {
  return (s.bigDays ?? []).filter((a) => a.kind === kind && a.day < day).at(-1) ?? null;
}
export const answerOf = (s: State, id: string) => (s.bigDays ?? []).find((a) => a.id === id) ?? null;

/** `s` with a big day's answer, once per event (a new tap replaces it). */
export function withBigAnswer(s: State, b: Pick<BigDay, 'id' | 'kind'>, day: string, answer: BigAnswer, now = Date.now()): State {
  const kept = (s.bigDays ?? []).filter((a) => a.id !== b.id);
  return { ...s, bigDays: [...kept, { id: b.id, kind: b.kind, day, answer, at: now }].slice(-BIG_KEEP) };
}

/** The line keys and vars for the morning brief: luck for the day's first big event, and how the last one went. */
export function briefParts(s: State, events: CalEvent[], day: string): { key: 'bigDayLuck' | 'bigDayLuckAllDay'; vars: Record<string, string>; last: 'bigDayLastNailed' | 'bigDayLastSurvived' | null } | null {
  const b = bigDaysOn(events, day)[0];
  if (!b) return null;
  const last = lastAnswer(s, b.kind, day);
  // A rough last time is never mentioned: the luck stands on its own.
  const said = last?.answer === 'nailed' ? 'bigDayLastNailed' : last?.answer === 'survived' ? 'bigDayLastSurvived' : null;
  return {
    key: b.event.allDay ? 'bigDayLuckAllDay' : 'bigDayLuck',
    vars: { title: b.label, time: fmtTime(b.event.start) },
    last: said,
  };
}

/** The debrief's question for the evening: the day's big events that have begun and weren't answered yet. */
export const askTonight = (s: State, events: CalEvent[], day: string, now = Date.now()) => bigDaysOn(events, day).filter((b) => b.event.start <= now && !answerOf(s, b.id));

/** The morning brief's extra: luck for the day's big event and how the last one like it went (never a rough one). */
export function bigDayBrief(s: State, events: CalEvent[], day: string, say: (key: LineKey, vars: Record<string, string>) => string): string {
  const b = briefParts(s, events, day);
  if (!b) return '';
  return ` ${BIG_KINDS[bigDaysOn(events, day)[0].kind].emoji} ${say(b.key, b.vars)}${b.last ? ` ${say(b.last, b.vars)}` : ''}`;
}
