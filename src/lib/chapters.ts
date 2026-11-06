// Fresh-start chapters (step 8). Personal landmarks make new beginnings feel real (the "fresh start effect",
// Dai, Milkman & Riis 2014): the owner's birthday, the day after a break (sick or away) ends, payday, the first
// day of a season and the first workday of August. On one, HQ offers "Chapter N begins": the owner names it and
// picks one thing to restart, and the spider seals the old chapter with a line. One offer per landmark (for the
// landmark day and the two after it), and it can be waved off (State.dismissed). Chapter titles show in the
// diary and in Wrapped. Never a "days since" counter. Theme-free, so logic-test can check it.
import { addDays, dayKey } from './dates';
import { pausedOn } from './pause';
import { isDayOff, paydayOf } from './swedish-days';
import type { Chapter, State } from './types';

export type LandmarkKind = 'birthday' | 'back' | 'payday' | 'season' | 'august';
/** `id` is unique per landmark ("payday:2026-11"): one offer each. */
export type Landmark = { id: string; kind: LandmarkKind; day: string; label: string; emoji: string };

/** Days an offer stays up: the landmark day and the two after it. */
export const OFFER_DAYS = 3;
/** Chapters kept. */
const KEEP = 60;

const noon = (key: string) => new Date(`${key}T12:00`);
const SEASON_STARTS: Record<number, { name: string; emoji: string }> = {
  2: { name: 'spring', emoji: '🌱' },
  5: { name: 'summer', emoji: '☀️' },
  8: { name: 'autumn', emoji: '🍂' },
  11: { name: 'winter', emoji: '❄️' },
};

/** The first workday of August (not a weekend or a red day). */
export function firstAugustWorkday(year: number) {
  let d = new Date(year, 7, 1, 12);
  while (isDayOff(d)) d = addDays(d, 1);
  return d;
}

/** 'MM-DD', or null for anything that isn't a real date. */
export function cleanBirthday(raw: string | null | undefined): string | null {
  const m = raw?.trim().match(/^(\d{1,2})[-/.](\d{1,2})$/);
  if (!m) return null;
  const month = Number(m[1]);
  const day = Number(m[2]);
  const d = new Date(2024, month - 1, day); // a leap year: 29 February is a birthday too
  return d.getMonth() === month - 1 && d.getDate() === day ? `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null;
}

/** The landmarks that fall on a day. */
export function landmarksOn(s: State, date: Date | number): Landmark[] {
  const d = new Date(date);
  const key = dayKey(d);
  const year = d.getFullYear();
  const out: Landmark[] = [];
  const bd = cleanBirthday(s.settings.birthday);
  // 29 February in a year without one: the 28th.
  if (bd && (key.slice(5) === bd || (bd === '02-29' && key.slice(5) === '02-28' && new Date(year, 1, 29).getMonth() !== 1))) {
    out.push({ id: `birthday:${year}`, kind: 'birthday', day: key, label: 'your birthday', emoji: '🎂' });
  }
  const yesterday = dayKey(addDays(d, -1));
  if (!pausedOn(s, key) && (s.pauses ?? []).some((p) => p.to === yesterday)) {
    out.push({ id: `back:${key}`, kind: 'back', day: key, label: 'the first day back after a break', emoji: '🌤️' });
  }
  if (dayKey(paydayOf(year, d.getMonth() + 1)) === key) out.push({ id: `payday:${key.slice(0, 7)}`, kind: 'payday', day: key, label: 'payday', emoji: '💸' });
  const season = SEASON_STARTS[d.getMonth()];
  if (season && d.getDate() === 1) out.push({ id: `season:${season.name}:${year}`, kind: 'season', day: key, label: `the first day of ${season.name}`, emoji: season.emoji });
  if (dayKey(firstAugustWorkday(year)) === key) out.push({ id: `august:${year}`, kind: 'august', day: key, label: 'the first workday of August', emoji: '💼' });
  return out;
}

export const chaptersOf = (s: State) => s.chapters ?? [];
export const dismissKey = (l: Landmark) => `chapter:${l.id}`;
const taken = (s: State, id: string) => chaptersOf(s).some((c) => c.landmark === id);

/**
 * The landmark HQ offers a new chapter on now: today's, or one from the two days before, newest first, not
 * taken and not waved off. None on a paused day, or the day a chapter already began.
 */
export function landmarkOffer(s: State, now = new Date()): Landmark | null {
  const today = dayKey(now);
  if (!s.onboarded || pausedOn(s, today) || chaptersOf(s).some((c) => c.from === today)) return null;
  const dismissed = s.dismissed ?? [];
  for (let i = 0; i < OFFER_DAYS; i++) {
    const hit = landmarksOn(s, addDays(noon(today), -i)).find((l) => !taken(s, l.id) && !dismissed.includes(dismissKey(l)));
    if (hit) return hit;
  }
  return null;
}

/** The next chapter's number. */
export const nextChapter = (s: State) => (chaptersOf(s).at(-1)?.n ?? 0) + 1;

/** A chapter's title: what the owner typed (tidied, short), or "Chapter N". */
export const chapterTitle = (raw: string, n: number) => raw.replace(/\s+/g, ' ').trim().slice(0, 40) || `Chapter ${n}`;

/**
 * A new chapter begun today on landmark `l`, with one thing to restart (free text, or a habit by id). Unchanged
 * when that landmark isn't on offer now.
 */
export function withChapter(s: State, l: Landmark, raw: string, restart: Chapter['restart'] | null, now = new Date()): State {
  const offer = landmarkOffer(s, now);
  if (!offer || offer.id !== l.id) return s;
  const n = nextChapter(s);
  const text = restart?.text.replace(/\s+/g, ' ').trim().slice(0, 60);
  const chapter: Chapter = { n, title: chapterTitle(raw, n), from: dayKey(now), landmark: l.id, at: now.getTime(), ...(text ? { restart: { ...restart, text } } : {}) };
  return { ...s, chapters: [...chaptersOf(s), chapter].slice(-KEEP) };
}

/** The chapter a day belongs to: the newest one begun on or before it. */
export function chapterOn(s: State, key: string): Chapter | null {
  return chaptersOf(s).filter((c) => c.from <= key).at(-1) ?? null;
}

/** Chapters begun between two days, both included (for Wrapped). */
export const chaptersBetween = (s: State, from: string, to: string) => chaptersOf(s).filter((c) => c.from >= from && c.from <= to);
