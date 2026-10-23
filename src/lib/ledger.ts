// The XP ledger. Each day keeps what it earned (xpEarned: the boss and league damage), what gaming
// penalties took (xpLost) and what undos took back (xpUndone); today also keeps what each entry was paid
// (xpBy), so undoing that entry takes back exactly that, Double XP and rested share included. reward() in
// store.tsx works out what a gain is worth and announces levels; these do the bookkeeping. Theme-free, so
// logic-test can check them.
import { dayKey } from './dates';
import { coinsFor } from './economy';
import { dayOf } from './selectors';
import type { DayLog, State } from './types';

const patchDay = (s: State, key: string, fn: (d: DayLog) => DayLog): State => ({ ...s, days: { ...s.days, [key]: fn(dayOf(s, key)) } });

/** Credits `xp` (multipliers already applied) to day `key`: coins, earned bonus minutes, and the entry's record under `ref`. */
export function credit(s: State, key: string, xp: number, bonusMin = 0, ref?: string): State {
  const coins = coinsFor(xp);
  return patchDay({ ...s, xp: s.xp + xp, coins: s.coins + coins, coinsEarned: s.coinsEarned + coins }, key, (d) => ({
    ...d,
    xpEarned: (d.xpEarned ?? 0) + xp,
    ...(ref && xp > 0 ? { xpBy: { ...d.xpBy, [ref]: (d.xpBy?.[ref] ?? 0) + xp } } : {}),
    ...(bonusMin > 0 ? { bonusGameMin: d.bonusGameMin + bonusMin, bonusEarnedMin: (d.bonusEarnedMin ?? 0) + bonusMin } : {}),
  }));
}

/**
 * Takes back what entry `ref` got on day `key`, with its coins and bonus minutes. Entries from before that
 * was recorded (or from an earlier day) fall back to `xp`, the plain amount. Never below zero.
 */
export function unreward(s: State, key: string, ref: string | null, xp: number, bonusMin = 0): State {
  const recorded = ref != null ? dayOf(s, key).xpBy?.[ref] : undefined;
  const taken = recorded ?? xp;
  const coins = coinsFor(taken);
  const next: State = { ...s, xp: Math.max(0, s.xp - taken), coins: Math.max(0, s.coins - coins), coinsEarned: Math.max(0, s.coinsEarned - coins) };
  return patchDay(next, key, (d) => {
    const xpBy = { ...d.xpBy };
    if (ref != null) delete xpBy[ref];
    return {
      ...d,
      xpBy: Object.keys(xpBy).length ? xpBy : undefined,
      xpEarned: Math.max(0, (d.xpEarned ?? 0) - taken),
      xpUndone: (d.xpUndone ?? 0) + taken,
      bonusGameMin: Math.max(0, d.bonusGameMin - bonusMin),
      ...(bonusMin > 0 ? { bonusEarnedMin: Math.max(0, (d.bonusEarnedMin ?? 0) - bonusMin) } : {}),
    };
  });
}

/** Over-budget gaming: XP off the total, kept out of the day's earned XP so the boss and the league aren't hit. */
export const penalize = (s: State, key: string, xp: number): State =>
  patchDay({ ...s, xp: Math.max(0, s.xp - xp) }, key, (d) => ({ ...d, xpLost: (d.xpLost ?? 0) + xp }));

/** Gives back gaming penalties that no longer apply, on the day that paid them. */
export const refundPenalty = (s: State, key: string, xp: number): State =>
  patchDay({ ...s, xp: s.xp + xp }, key, (d) => ({ ...d, xpLost: Math.max(0, (d.xpLost ?? 0) - xp) }));

/** Bonus gaming minutes earned on day `key` without XP (what the "earn 30 bonus minutes" quest counts). */
export const earnBonus = (s: State, key: string, min: number): State =>
  patchDay(s, key, (d) => ({ ...d, bonusGameMin: d.bonusGameMin + min, bonusEarnedMin: (d.bonusEarnedMin ?? 0) + min }));

/** Per-entry XP and crit records only serve undos of today's entries: past days drop them at rollover. */
export function withoutUndoRecords(s: State, today = dayKey()): State {
  let days = s.days;
  for (const [k, d] of Object.entries(s.days)) {
    if (k >= today || (!d.xpBy && !d.critBy)) continue;
    if (days === s.days) days = { ...s.days };
    days[k] = { ...d, xpBy: undefined, critBy: undefined };
  }
  return days === s.days ? s : { ...s, days };
}

/** A day's XP account (for an XP history later): earned, lost to gaming penalties, and taken back by undos. */
export const ledgerOn = (s: State, key = dayKey()) => {
  const d = dayOf(s, key);
  return { earned: d.xpEarned ?? 0, lost: d.xpLost ?? 0, undone: d.xpUndone ?? 0 };
};
