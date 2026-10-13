// Coins, the daily loot chest and the shop.
import type { ChestPrize } from './types';

/** Coins earned for a positive XP gain: one per XP (XP was halved, so coin income stayed where it was). */
export const coinsFor = (xp: number) => (xp > 0 ? xp : 0);

/** Legendary odds: a normal chest, and a gold one (a great day: day score 85+ or the boss's weakness hit). */
export const LEGENDARY_CHANCE = { normal: 0.08, gold: 0.15 };
/** After this many chests without a legendary, the next one is legendary. Counts chests, not days. */
export const PITY_AFTER = 15;

export type ChestOpts = { gold?: boolean; pity?: boolean; luck?: number };

/** `r` picks the prize, `r2` the coin amount. Gold chests swap the gaming minutes for more coins and a bigger bomb. */
export function rollChest(r = Math.random(), opts: ChestOpts = {}, r2 = Math.random()): ChestPrize {
  const legendary = Math.min(0.5, (opts.gold ? LEGENDARY_CHANCE.gold : LEGENDARY_CHANCE.normal) + (opts.luck ?? 0));
  const gold = opts.gold ? { gold: true } : {};
  if (opts.pity || r >= 1 - legendary) return { kind: 'legendary', amount: 250, text: '🕷️ LEGENDARY: 250 coins + a rare roast', ...gold };
  const x = r / (1 - legendary); // where r falls among the other prizes, 0–1
  if (opts.gold) {
    if (x < 0.4) {
      const amount = 100 + Math.floor(r2 * 151);
      return { kind: 'coins', amount, text: `🪙 ${amount} coins`, gold: true };
    }
    if (x < 0.7) return { kind: 'double_xp', amount: 60, text: '⚡ Double XP for 1 hour', gold: true };
    return { kind: 'boss_bomb', amount: 150, text: '💣 Boss bomb: 150 damage', gold: true };
  }
  // the original table: 30 % coins, 25 % gaming, 20 % double XP, 17 % bomb (of 92 %)
  if (x < 0.3 / 0.92) {
    const amount = 50 + Math.floor(r2 * 101);
    return { kind: 'coins', amount, text: `🪙 ${amount} coins` };
  }
  if (x < 0.55 / 0.92) return { kind: 'gaming', amount: 15, text: '🎮 +15 min gaming today' };
  if (x < 0.75 / 0.92) return { kind: 'double_xp', amount: 60, text: '⚡ Double XP for 1 hour' };
  return { kind: 'boss_bomb', amount: 100, text: '💣 Boss bomb: 100 damage' };
}

/**
 * Coins for a finished day's unused bonus gaming minutes. The base budget is spent first, so only bonus
 * minutes that were still left count. `rate` coins per minute, at most `cap`.
 */
export function bankFor(bonusMin: number, budgetMin: number, usedMin: number, rate = 3, cap = 90) {
  const minutes = Math.max(0, Math.min(bonusMin, Math.floor(budgetMin - usedMin)));
  return { minutes, coins: Math.min(cap, minutes * rate) };
}

/** Built-in shop items (the user's own rewards are listed separately). */
export const SHOP_ITEMS = [
  { id: 'gaming30', title: '+30 min gaming today', emoji: '🎮', cost: 400 },
  { id: 'double_xp', title: 'Double XP for 1 hour', emoji: '⚡', cost: 500 },
  { id: 'bomb', title: 'Boss bomb: 100 damage', emoji: '💣', cost: 600 },
] as const;
export type ShopItemId = (typeof SHOP_ITEMS)[number]['id'];

/** A power-up's price for you: the Bomb Maker ability (lib/perks.ts) makes bombs cheaper. */
export const shopPrice = (id: ShopItemId, perks: readonly string[] = []) =>
  id === 'bomb' && perks.includes('bomb_maker') ? 450 : (SHOP_ITEMS.find((i) => i.id === id)?.cost ?? 0);

export const REWARD_IDEAS = [
  { title: 'Bubble tea', emoji: '🧋', cost: 300 },
  { title: 'Movie night', emoji: '🍿', cost: 600 },
  { title: 'Takeaway dinner', emoji: '🥡', cost: 900 },
  { title: 'Sleep in, no alarm', emoji: '😴', cost: 700 },
  { title: 'Treat yourself shopping', emoji: '🛍️', cost: 2000 },
  { title: 'Skip one chore', emoji: '🧹', cost: 500 },
];
