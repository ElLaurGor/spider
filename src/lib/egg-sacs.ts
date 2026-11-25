// Egg sacs: a gold chest or a boss kill sometimes drops one, and walking hatches it. It needs 2, 5 or 10 km of
// watch steps from the day it dropped (at the trek's step length, as trek.ts counts), a total: a day without steps
// just leaves it waiting, and nothing is lost on rough days. It hatches into a spiderling that lives in the
// terrarium (a few at most are shown) and pays coins, never XP. Rolls are seeded by what dropped it, so there's
// nothing to farm.
import { roll } from './critters';
import { dayKey } from './dates';
import { dayOf } from './selectors';
import { DEFAULT_STEP_M } from './trek';
import type { EggSac, Spiderling, State } from './types';

export const EGG_CHANCE = { chest: 0.25, boss: 0.4 } as const;
export const EGG_KMS = [2, 5, 10] as const;
/** What a hatching pays, by the distance it took. */
export const EGG_COINS: Record<number, number> = { 2: 30, 5: 60, 10: 120 };
/** Egg sacs waiting at once: a drop beyond this doesn't happen. */
export const MAX_EGGS = 3;
/** A spiderling grows up in the tank for this many days, then moves out (its postcard comes in the mailbox, mail.ts). */
export const GROW_UP_DAYS = 21;
/** Spiderlings living in the tank at once (the oldest at home move out first). */
export const LINGS_SHOWN = 3;

/** The spiderlings still at home (not moved out), oldest first. */
export const lingsAtHome = (s: State) => (s.spiderlings ?? []).filter((x) => !x.movedAt);
/** The ones in the tank: the newest LINGS_SHOWN at home. */
export const tankLings = (s: State) => lingsAtHome(s).slice(-LINGS_SHOWN);
/** How grown a spiderling is, 0 just hatched … 1 grown up (GROW_UP_DAYS). */
export const lingAge = (x: Spiderling, now = Date.now()) => Math.round(Math.min(1, Math.max(0, (now - x.hatchedAt) / (GROW_UP_DAYS * 86_400_000))) * 100) / 100;
/** The oldest spiderling at home that has grown up: it moves out with the next free letter (mail.ts). */
export const grownLing = (s: State, now = Date.now()) => lingsAtHome(s).find((x) => lingAge(x, now) >= 1) ?? null;

/** Kilometres walked toward an egg sac: every day's watch steps from the day it dropped (that day's earlier steps left out), at its step length. */
export function eggKm(s: State, e: EggSac, now = new Date()): number {
  const today = dayKey(now);
  let steps = 0;
  for (const [k, d] of Object.entries(s.days)) if (k >= e.since && k <= today) steps += d.steps ?? 0;
  return Math.min(e.km, (Math.max(0, steps - e.skip) * e.stepM) / 1000);
}

/** The sources that may drop an egg between two states: a gold chest just opened, a boss just beaten. */
function dropsBetween(prev: State, next: State): { from: EggSac['from']; key: string }[] {
  const out: { from: EggSac['from']; key: string }[] = [];
  for (const [k, d] of Object.entries(next.days)) {
    if (d === prev.days[k] || !d.chest?.gold || prev.days[k]?.chest) continue;
    out.push({ from: 'chest', key: `chest:${k}` });
  }
  for (const week of Object.keys(next.bossesDefeated)) if (!prev.bossesDefeated[week]) out.push({ from: 'boss', key: `boss:${week}` });
  return out;
}

/** Egg sacs dropped by what happened between `prev` and `next` (at most MAX_EGGS waiting, one per source ever). */
export function eggDrops(prev: State, next: State, now = new Date()): { state: State; laid: EggSac[] } {
  if (!next.onboarded || (next.bossesDefeated === prev.bossesDefeated && next.days === prev.days)) return { state: next, laid: [] };
  const laid: EggSac[] = [];
  let eggs = next.eggSacs ?? [];
  const known = new Set([...eggs.map((e) => e.key), ...(next.spiderlings ?? []).map((x) => x.key)]);
  const today = dayKey(now);
  for (const d of dropsBetween(prev, next)) {
    if (eggs.length >= MAX_EGGS || known.has(d.key) || roll(`egg:${d.key}`) >= EGG_CHANCE[d.from]) continue;
    const km = EGG_KMS[Math.min(EGG_KMS.length - 1, Math.floor(roll(`eggkm:${d.key}`) * EGG_KMS.length))];
    const egg: EggSac = { id: `egg-${d.key}`, from: d.from, key: d.key, at: now.getTime(), since: today, skip: dayOf(next, today).steps ?? 0, km, stepM: next.trek?.stepM ?? DEFAULT_STEP_M };
    eggs = [...eggs, egg];
    known.add(d.key);
    laid.push(egg);
  }
  return laid.length ? { state: { ...next, eggSacs: eggs }, laid } : { state: next, laid };
}

/** Egg sacs walked far enough hatch: each a spiderling and its coins. */
export function hatchEggs(s: State, now = new Date()): { state: State; hatched: Spiderling[] } {
  const eggs = s.eggSacs ?? [];
  const ready = eggs.filter((e) => eggKm(s, e, now) >= e.km);
  if (!ready.length) return { state: s, hatched: [] };
  const t = now.getTime();
  const hatched: Spiderling[] = ready.map((e) => ({ id: `ling-${e.key}`, from: e.from, key: e.key, laidAt: e.at, hatchedAt: t, km: e.km, coins: EGG_COINS[e.km] ?? 30 }));
  const coins = hatched.reduce((a, x) => a + x.coins, 0);
  return {
    state: { ...s, eggSacs: eggs.filter((e) => !ready.includes(e)), spiderlings: [...(s.spiderlings ?? []), ...hatched], coins: s.coins + coins, coinsEarned: s.coinsEarned + coins },
    hatched,
  };
}
