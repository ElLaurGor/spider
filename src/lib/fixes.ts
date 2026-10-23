// One-time repairs to saved data. hydrate() runs each one that isn't in State.fixes yet, then lists it,
// so a repair happens once per save (a restored backup from before it gets it too).
import { levelForXp, xpForLevel } from './levels';
import type { State } from './types';

export const FIXES = ['coffee-gremlin'] as const;

/** What a secret achievement paid before the limit-breaking ones became badges with no prize (XP.secret, SECRET_COINS). */
const SECRET_PAID = { xp: 50, coins: 100 };

/**
 * Coffee Gremlin (6+ cups in a day) could unlock from the junk "[object Object]" day that the HQ coffee
 * tile filled for a while; step 1 put those cups back on the days they were drunk. If no real day has 6+
 * cups now, the badge goes and so does what it paid: never below 0 coins, and never below the XP of the
 * highest level reached. If a real day qualifies, it stays.
 */
export function recheckCoffeeGremlin(s: State): State {
  if (!s.secrets?.s_coffee_gremlin) return s;
  if (Object.values(s.days).some((d) => (d.coffee ?? []).length >= 6)) return s;
  const secrets = { ...s.secrets };
  delete secrets.s_coffee_gremlin;
  const peak = Math.max(levelForXp(s.xp), s.maxLevel ?? 1);
  return {
    ...s,
    secrets,
    xp: Math.max(Math.min(s.xp, xpForLevel(peak)), s.xp - SECRET_PAID.xp),
    coins: Math.max(0, s.coins - SECRET_PAID.coins),
    coinsEarned: Math.max(0, s.coinsEarned - SECRET_PAID.coins),
  };
}

/** Runs the repairs this save hasn't had yet. */
export function applyFixes(s: State): State {
  const done = s.fixes ?? [];
  let next = s;
  if (!done.includes('coffee-gremlin')) next = recheckCoffeeGremlin(next);
  return FIXES.every((f) => done.includes(f)) ? next : { ...next, fixes: [...new Set([...done, ...FIXES])] };
}
