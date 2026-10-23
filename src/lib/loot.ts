// Which loot chest a day earns, and the shelf of chests still waiting to be opened. The chest itself
// (prizes, pity) is in economy.ts.
import { dayKey, isDayKey } from './dates';
import { bossFor, weaknessOf } from './quests';
import { dayScoreFor } from './report';
import { dayOf } from './selectors';
import type { State } from './types';

/** Day score that makes the chest gold. */
export const GOLD_SCORE = 85;

/** A gold chest: a great day (day score 85+), or a day that hit this week's boss weakness. */
export function goldChest(s: State, date = new Date()) {
  if (dayScoreFor(s, date) >= GOLD_SCORE) return true;
  const key = dayKey(date);
  return weaknessOf(bossFor(s, date).id).hit(s, dayOf(s, key), key);
}

/** Unopened chests kept for later. More than this and the oldest opens itself at the next rollover. */
export const SHELF_MAX = 3;

export type ShelvedChest = { key: string; gold: boolean };

/**
 * Chests earned and not opened yet, oldest first: they wait past midnight instead of vanishing. A past
 * day's chest keeps the gold status it had when the day ended; today's can still turn gold.
 */
export function chestShelf(s: State, now = new Date()): ShelvedChest[] {
  const today = dayKey(now);
  return Object.keys(s.days)
    .filter((k) => isDayKey(k) && k <= today && s.days[k].chestReady && !s.days[k].chest)
    .sort()
    .map((key) => ({ key, gold: key === today ? goldChest(s, now) : (s.days[key].chestGold ?? goldChest(s, new Date(`${key}T12:00`))) }));
}

/** At rollover: past days' unopened chests freeze their gold status. Unchanged state when there's nothing to do. */
export function withChestGold(s: State, today = dayKey()): State {
  let days = s.days;
  for (const [k, d] of Object.entries(s.days)) {
    if (k >= today || !isDayKey(k) || !d.chestReady || d.chest || d.chestGold != null) continue;
    if (days === s.days) days = { ...s.days };
    days[k] = { ...d, chestGold: goldChest(s, new Date(`${k}T12:00`)) };
  }
  return days === s.days ? s : { ...s, days };
}
