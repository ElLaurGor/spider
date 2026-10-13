// Which loot chest a day earns. The chest itself (prizes, pity) is in economy.ts.
import { dayKey } from './dates';
import { bossFor, WEAKNESS } from './quests';
import { dayScoreFor } from './report';
import { dayOf } from './selectors';
import type { State } from './types';

/** Day score that makes the chest gold. */
export const GOLD_SCORE = 85;

/** A gold chest: a great day (day score 85+), or a day that hit this week's boss weakness. */
export function goldChest(s: State, date = new Date()) {
  if (dayScoreFor(s, date) >= GOLD_SCORE) return true;
  const key = dayKey(date);
  const weakness = WEAKNESS[bossFor(s, date).id as keyof typeof WEAKNESS];
  return !!weakness?.hit(s, dayOf(s, key), key);
}
