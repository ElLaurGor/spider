// Rested bonus: a missed day (or a low-battery one) fills a small pool, and the XP you earn when you're
// back gets +50 % until the pool is used up. Coming back is rewarded, never more than showing up would be:
// a missed day adds 30 XP to the pool, an ordinary day earns several times that.
import { addDays, dayKey } from './dates';
import { dayOf, lowBattery } from './selectors';
import type { State } from './types';

export const RESTED_CAP = 60;
export const RESTED_EMPTY_DAY = 30;
export const RESTED_LOW_DAY = 15;
export const RESTED_SHARE = 0.5;

/** Pool added for the days from `from` to `to` (inclusive, oldest first): empty days and low-battery days since you started. */
export function restedGain(s: State, from: string, to: string): number {
  const first = Object.keys(s.days)
    .filter((k) => (s.days[k].xpEarned ?? 0) > 0)
    .sort()[0];
  if (!first) return 0;
  let gain = 0;
  for (let d = new Date(`${from}T12:00`); dayKey(d) <= to; d = addDays(d, 1)) {
    const key = dayKey(d);
    if (key < first) continue;
    const log = dayOf(s, key);
    if ((log.xpEarned ?? 0) <= 0) gain += RESTED_EMPTY_DAY;
    else if (lowBattery(log)) gain += RESTED_LOW_DAY;
  }
  return gain;
}

/** The pool after adding a gain, capped. */
export const restedAfter = (pool: number, gain: number) => Math.min(RESTED_CAP, Math.max(0, pool) + gain);

/** Extra XP the pool pays on a positive gain of `xp`, and what's left in it. */
export function restedSplit(pool: number, xp: number) {
  const extra = xp > 0 && pool > 0 ? Math.min(pool, Math.max(1, Math.round(xp * RESTED_SHARE))) : 0;
  return { extra, left: pool - extra };
}
