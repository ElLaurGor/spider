// Spider abilities: one point per level above 1, spent in three short branches. Each perk is a small
// nudge (gaming minutes, coins, boss damage), never an XP multiplier, so levels stay earned.
import type { State } from './types';
import { BONUS_MIN, levelForXp } from './xp';

export type Branch = 'body' | 'mind' | 'discipline';
export type PerkId = 'strong_silk' | 'hydro_glands' | 'second_wind' | 'focus_silk' | 'thick_silk' | 'treasure_sense' | 'bomb_maker' | 'coin_spinner' | 'time_lord';
export type Perk = { id: PerkId; branch: Branch; tier: 1 | 2 | 3; cost: number; name: string; emoji: string; desc: string };

export const BRANCHES: { id: Branch; name: string; emoji: string }[] = [
  { id: 'body', name: 'Body', emoji: '💪' },
  { id: 'mind', name: 'Mind', emoji: '🧠' },
  { id: 'discipline', name: 'Discipline', emoji: '🎯' },
];

// Tier n costs n points and needs tier n-1 of the same branch.
export const PERKS: Perk[] = [
  { id: 'strong_silk', branch: 'body', tier: 1, cost: 1, name: 'Strong Silk', emoji: '🏋️', desc: 'The first workout of the day gives +10 min gaming time.' },
  { id: 'hydro_glands', branch: 'body', tier: 2, cost: 2, name: 'Hydro Glands', emoji: '💧', desc: 'Hitting your water goal pays 25 🪙.' },
  { id: 'second_wind', branch: 'body', tier: 3, cost: 3, name: 'Second Wind', emoji: '👣', desc: 'Hitting your step goal drops a 50-damage bomb on the boss.' },
  { id: 'focus_silk', branch: 'mind', tier: 1, cost: 1, name: 'Focus Silk', emoji: '🕸️', desc: 'Finished Web Focus sessions give 50 % more gaming time.' },
  { id: 'thick_silk', branch: 'mind', tier: 2, cost: 2, name: 'Thick Silk', emoji: '🛡️', desc: 'Doomscrolling heals the boss half as much.' },
  { id: 'treasure_sense', branch: 'mind', tier: 3, cost: 3, name: 'Treasure Sense', emoji: '🔮', desc: 'Loot chests turn up legendary 4 % more often.' },
  { id: 'bomb_maker', branch: 'discipline', tier: 1, cost: 1, name: 'Bomb Maker', emoji: '💣', desc: 'Boss bombs cost 450 🪙 in the shop instead of 600.' },
  { id: 'coin_spinner', branch: 'discipline', tier: 2, cost: 2, name: 'Coin Spinner', emoji: '📜', desc: 'Won weekly contracts pay 25 % more.' },
  { id: 'time_lord', branch: 'discipline', tier: 3, cost: 3, name: 'Time Lord', emoji: '⏳', desc: 'Banked gaming minutes pay 4 🪙 each instead of 3, up to 120 a day.' },
];

export const RESPEC_COST = 300;

export const perkOf = (id: string) => PERKS.find((p) => p.id === id);
export const hasPerk = (s: Pick<State, 'perks'>, id: PerkId) => (s.perks ?? []).includes(id);

/** Points earned so far: one for every level above 1. */
export const perkPointsEarned = (s: State) => levelForXp(s.xp) - 1;
export const perkPointsSpent = (s: Pick<State, 'perks'>) => (s.perks ?? []).reduce((a, id) => a + (perkOf(id)?.cost ?? 0), 0);
/** Unspent points. Never negative, even if a penalty dropped a level after spending. */
export const perkPoints = (s: State) => Math.max(0, perkPointsEarned(s) - perkPointsSpent(s));

/** Why a perk can't be taken right now, or null when it can. */
export function perkBlocker(s: State, id: PerkId): string | null {
  const p = perkOf(id);
  if (!p) return 'Unknown ability';
  if (hasPerk(s, id)) return 'Unlocked';
  const before = PERKS.find((x) => x.branch === p.branch && x.tier === p.tier - 1);
  if (before && !hasPerk(s, before.id)) return `Needs ${before.name} first`;
  if (perkPoints(s) < p.cost) return `Needs ${p.cost} point${p.cost > 1 ? 's' : ''}`;
  return null;
}

// ---- the effects, in one place ----

/** Bonus gaming minutes for the day's first workout. */
export const workoutBonusMin = (s: State) => BONUS_MIN.workout + (hasPerk(s, 'strong_silk') ? 10 : 0);
/** Gaming minutes for a finished Web Focus session. */
export const focusBonusMin = (s: State, minutes: number) => Math.floor((Math.floor(minutes / 5) * (hasPerk(s, 'focus_silk') ? 3 : 2)) / 2);
/** Share of doomscroll healing the boss actually gets. */
export const healShare = (s: Pick<State, 'perks'>) => (hasPerk(s, 'thick_silk') ? 0.5 : 1);
/** Extra legendary chance on loot chests. */
export const chestLuck = (s: State) => (hasPerk(s, 'treasure_sense') ? 0.04 : 0);
/** Extra share on top of a won contract's payout. */
export const contractBonus = (s: State) => (hasPerk(s, 'coin_spinner') ? 0.25 : 0);
/** Coins per banked gaming minute, and the daily cap. */
export const bankRate = (s: State) => (hasPerk(s, 'time_lord') ? { rate: 4, cap: 120 } : { rate: 3, cap: 90 });
