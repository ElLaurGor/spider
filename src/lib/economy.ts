// Coins, the daily loot chest and the shop.
import type { ChestPrize } from './types';

/** Coins earned for a positive XP gain: one per XP (XP was halved, so coin income stayed where it was). */
export const coinsFor = (xp: number) => (xp > 0 ? xp : 0);

export function rollChest(r = Math.random()): ChestPrize {
  if (r < 0.3) {
    const amount = 50 + Math.floor(Math.random() * 101);
    return { kind: 'coins', amount, text: `🪙 ${amount} coins` };
  }
  if (r < 0.55) return { kind: 'gaming', amount: 15, text: '🎮 +15 min gaming today' };
  if (r < 0.75) return { kind: 'double_xp', amount: 60, text: '⚡ Double XP for 1 hour' };
  if (r < 0.92) return { kind: 'boss_bomb', amount: 100, text: '💣 Boss bomb: 100 damage' };
  return { kind: 'legendary', amount: 250, text: '🕷️ LEGENDARY: 250 coins + a rare roast' };
}

/** Built-in shop items (the user's own rewards are listed separately). */
export const SHOP_ITEMS = [
  { id: 'gaming30', title: '+30 min gaming today', emoji: '🎮', cost: 400 },
  { id: 'double_xp', title: 'Double XP for 1 hour', emoji: '⚡', cost: 500 },
  { id: 'bomb', title: 'Boss bomb: 100 damage', emoji: '💣', cost: 600 },
] as const;
export type ShopItemId = (typeof SHOP_ITEMS)[number]['id'];

export const REWARD_IDEAS = [
  { title: 'Bubble tea', emoji: '🧋', cost: 300 },
  { title: 'Movie night', emoji: '🍿', cost: 600 },
  { title: 'Takeaway dinner', emoji: '🥡', cost: 900 },
  { title: 'Sleep in, no alarm', emoji: '😴', cost: 700 },
  { title: 'Treat yourself shopping', emoji: '🛍️', cost: 2000 },
  { title: 'Skip one chore', emoji: '🧹', cost: 500 },
];
