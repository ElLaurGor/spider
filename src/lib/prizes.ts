// The S.P.I.D.E.R. Prizes: Stockholm hands out the Nobel prizes on 10 December, and so does the spider.
// Totals over the year's counted days only (rough days are rest), so nothing here is a streak, and nothing
// is about a body, a weight or how much was eaten. The reward is a cosmetic medal, never XP.
import { owns, withOwned } from './cosmetics';
import { addDays, dayKey, MIN } from './dates';
import { countedDay, firstDataDay } from './day-filters';
import { coffeeOf, dayOf, gamingBudgetMin, gamingUsedMs, waterMl } from './selectors';
import type { State } from './types';

export type Prize = { id: string; emoji: string; field: string; stat: string; citation: string };

/** The ceremony is on 10 December; its card stays up until the 12th. */
export const PRIZE_DAY = { month: 11, day: 10 } as const;
export const isPrizeDay = (date: Date | number = new Date()) => {
  const d = new Date(date);
  return d.getMonth() === PRIZE_DAY.month && d.getDate() === PRIZE_DAY.day;
};
export const prizeCardUp = (date: Date | number = new Date()) => {
  const d = new Date(date);
  return d.getMonth() === PRIZE_DAY.month && d.getDate() >= PRIZE_DAY.day && d.getDate() <= PRIZE_DAY.day + 2;
};

const sv = (n: number) => Math.round(n).toLocaleString('sv-SE');

/** The year's counted days up to `now` (from the first day anything was logged). */
export function countedDaysOf(s: State, year: number, now = new Date()) {
  const first = firstDataDay(s);
  const end = dayKey(now) < `${year}-12-31` ? dayKey(now) : `${year}-12-31`;
  const out: string[] = [];
  for (let d = new Date(year, 0, 1, 12); dayKey(d) <= end; d = addDays(d, 1)) {
    const k = dayKey(d);
    if (first && k >= first && countedDay(s, k)) out.push(k);
  }
  return out;
}

/** This year's prizes, each only where there's something to award (no prize for a field with nothing in it). */
export function prizesFor(s: State, year: number, now = new Date()): Prize[] {
  const days = countedDaysOf(s, year, now);
  const steps = days.reduce((a, k) => a + (dayOf(s, k).steps ?? 0), 0);
  const peace = days.filter((k) => gamingUsedMs(s, k, now.getTime()) <= gamingBudgetMin(s, k) * MIN).length;
  const pages = (s.diary ?? []).filter((p) => p.day.startsWith(String(year))).length;
  const litres = days.reduce((a, k) => a + waterMl(dayOf(s, k)), 0) / 1000;
  const cups = days.reduce((a, k) => a + coffeeOf(dayOf(s, k)).length, 0);
  const all: (Prize | null)[] = [
    steps > 0 ? { id: 'physics', emoji: '👣', field: 'Physics', stat: `${sv(steps)} steps`, citation: 'For showing that an object at rest does not have to stay at rest.' } : null,
    peace > 0 ? { id: 'peace', emoji: '🕊️', field: 'Peace', stat: `${peace} day${peace === 1 ? '' : 's'} inside the gaming budget`, citation: 'For a lasting ceasefire with the controller. The controller accepts on your behalf.' } : null,
    pages > 0 ? { id: 'literature', emoji: '📜', field: 'Literature', stat: `${pages} diary page${pages === 1 ? '' : 's'}`, citation: 'For inspiring a diary I wrote about you. Shared credit. Mostly mine.' } : null,
    s.coins > 0 ? { id: 'economics', emoji: '🪙', field: 'Economics', stat: `${sv(s.coins)} coins in the vault`, citation: 'For monetary policy that is sound, give or take a chest.' } : null,
    litres > 0 ? { id: 'medicine', emoji: '💧', field: 'Medicine', stat: `${litres.toFixed(1)} L of water`, citation: 'For the steady, unglamorous work of drinking water.' } : null,
    cups > 0 ? { id: 'chemistry', emoji: '☕', field: 'Chemistry', stat: `${sv(cups)} cup${cups === 1 ? '' : 's'} of coffee`, citation: 'For a long and careful study of caffeine. Results pending.' } : null,
  ];
  return all.filter((p): p is Prize => p != null);
}

/** The ceremony's medal: a cosmetic the first year, a small purse of coins once it's in the wardrobe. */
export const PRIZE_MEDAL = 'prize_medal';
export const PRIZE_COINS = 50;
export const prizesAccepted = (s: State, year: number) => (s.prizesAccepted ?? []).includes(String(year));

/** Accepts a year's prizes once: the medal, or the coins when it's owned already. Null when already accepted. */
export function acceptPrizes(s: State, year: number): { state: State; reward: string } | null {
  if (prizesAccepted(s, year)) return null;
  const done = { ...s, prizesAccepted: [...(s.prizesAccepted ?? []), String(year)] };
  if (!owns(s, PRIZE_MEDAL)) return { state: withOwned(done, PRIZE_MEDAL), reward: '🏅 S.P.I.D.E.R. Prize medal' };
  return { state: { ...done, coins: done.coins + PRIZE_COINS, coinsEarned: done.coinsEarned + PRIZE_COINS }, reward: `+${PRIZE_COINS} 🪙` };
}
