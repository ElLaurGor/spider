// The sealed quest card (step 8): one of the morning draft's five cards comes face down. Its quest is shown, its
// XP multiplier isn't: ×0.5, ×1 or ×2 (0.4 / 0.4 / 0.2, so on average exactly ×1), revealed only once it's done.
// Which card and which multiplier are seeded by the day, so an undo, a reroll or a re-pick can't roll it again;
// the quest pays through the ledger under its usual "q:<id>" ref, so an undo takes back exactly what it paid.
// Theme-free, so logic-test can check it.
import { dayKey } from './dates';
import { dayOf } from './selectors';
import type { State } from './types';

export const SEALED_ODDS: { mult: number; p: number }[] = [
  { mult: 0.5, p: 0.4 },
  { mult: 1, p: 0.4 },
  { mult: 2, p: 0.2 },
];

const hash = (str: string) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
};

/** The multiplier a roll in [0, 1) lands on. */
export function multFor(roll: number) {
  let acc = 0;
  for (const o of SEALED_ODDS) {
    acc += o.p;
    if (roll < acc) return o.mult;
  }
  return SEALED_ODDS[SEALED_ODDS.length - 1].mult;
}

/**
 * The day's sealed card: one of its draft's candidates and its multiplier, or null on a day without a draft or
 * a reduced one (its one gentle quest is never a gamble).
 */
export function sealedOn(s: State, key = dayKey()): { id: string; mult: number } | null {
  const d = dayOf(s, key);
  const candidates = d.questDraft?.candidates ?? [];
  if (!candidates.length || d.questReduced) return null;
  const id = candidates[hash(`${key}:sealed`) % candidates.length];
  return { id, mult: multFor((hash(`${key}:sealed:${id}:mult`) % 1000) / 1000) };
}

/** What quest `id` pays on day `key`: its XP, times the multiplier when it's the sealed card (at least 1). */
export function sealedXp(s: State, key: string, id: string, xp: number) {
  const c = sealedOn(s, key);
  return c && c.id === id ? Math.max(1, Math.round(xp * c.mult)) : xp;
}

/** Whether quest `id` is today's sealed card. */
export const isSealed = (s: State, id: string, key = dayKey()) => sealedOn(s, key)?.id === id;

/** The card face up, once its quest is done that day (the multiplier shows), or null while it's face down. */
export function revealedMult(s: State, id: string, key = dayKey()) {
  const c = sealedOn(s, key);
  return c && c.id === id && (dayOf(s, key).questsDone ?? []).includes(id) ? c.mult : null;
}
