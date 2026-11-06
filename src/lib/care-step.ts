// Name it, then one matched step (step 9 care). Once a low check-in carries emotion words ("Want to name it?"
// on HQ, or the Mood screen), the words point at one small tool, offered once for that check-in:
// stressed/overwhelmed/restless → two minutes of breathing or a walk, anxious → park the worry, lonely → a
// social item from the joy menu (or a gentle "message someone you like"), sad/numb/bored → the joy menu,
// tired → permission to rest (low-battery mode), angry/irritable → ten minutes of moving. A low check-in with
// no words gets the joy menu's offer instead. Keyed on the saved EMOTIONS names (mood.ts: never renamed).
// Offers only: "Not now" closes it silently, nothing is tracked but the joy menu's own follow-up, no XP.
// Pure (no expo, no theme), so logic-test can check it.
import { dayKey, MIN } from './dates';
import { joyPick } from './joy';
import { nameItFor } from './mood';
import { dayOf, moodsOf } from './selectors';
import type { MoodEntry, State } from './types';

export type CareStep = 'breathe' | 'park' | 'social' | 'joy' | 'rest' | 'move';

/** Each low emotion's tool. Words not listed here (the good ones) point at nothing. */
export const STEP_OF: Readonly<Record<string, CareStep>> = {
  Stressed: 'breathe',
  Overwhelmed: 'breathe',
  Restless: 'breathe',
  Anxious: 'park',
  Lonely: 'social',
  Sad: 'joy',
  Numb: 'joy',
  Bored: 'joy',
  Tired: 'rest',
  Angry: 'move',
  Irritable: 'move',
};
/** With several words, the one tool offered: the lightest lift first (writing a worry down, resting). */
const PRIORITY: readonly CareStep[] = ['park', 'rest', 'breathe', 'social', 'move', 'joy'];

/** The one tool a check-in's words point at, or null. */
export function stepFor(emotions: readonly string[]): CareStep | null {
  const steps = new Set(emotions.map((e) => STEP_OF[e]).filter((x): x is CareStep => !!x));
  return PRIORITY.find((p) => steps.has(p)) ?? null;
}

/** A check-in older than this gets no offer any more: by then it's a different moment. */
export const OFFER_FOR_MS = 6 * 60 * MIN;
/** Care offers remembered as answered (careSeen). */
const SEEN_KEEP = 120;

export const careSeenOf = (s: State) => s.careSeen ?? [];
export const seenCare = (s: State, key: string) => careSeenOf(s).includes(key);
export function withCareSeen(s: State, ...keys: string[]): State {
  const fresh = keys.filter((k) => !seenCare(s, k));
  return fresh.length ? { ...s, careSeen: [...careSeenOf(s), ...fresh].slice(-SEEN_KEEP) } : s;
}

/**
 * The offer for today's latest check-in, or null. `step`: the tool its words point at (a check-in of Okay or
 * lower); null with a `joy` item: a low one (Meh or Awful) without words, once "Want to name it?" was answered
 * or skipped, when the joy menu has something that fits today's energy. Once per check-in, within 6 hours.
 */
export function careOffer(s: State, now = Date.now()): { key: string; mood: MoodEntry; step: CareStep | null } | null {
  const m = moodsOf(dayOf(s, dayKey(now))).at(-1);
  if (!m || m.late || now - m.at > OFFER_FOR_MS || now < m.at - MIN) return null;
  if (nameItFor([m])) return null; // "Want to name it?" comes first
  const step = stepFor(m.emotions);
  if (step) {
    const key = `step:${m.id}`;
    return m.level <= 3 && !seenCare(s, key) ? { key, mood: m, step } : null;
  }
  const key = `joy:${m.id}`;
  if (m.level > 2 || seenCare(s, key) || !joyPick(s, { key: dayKey(now), seed: key })) return null;
  return { key, mood: m, step: null };
}
