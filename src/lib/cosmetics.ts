// The spider's wardrobe: things to wear, bought with coins, found in season or dropped by legendary
// chests. Purely for looks: nothing here changes XP, the boss or the league.
import { seasonOn, type SeasonId } from './seasons';
import type { State } from './types';
import { levelForXp, titleFor } from './xp';

export type Slot = 'hat' | 'held' | 'aura';
export type Cosmetic = {
  id: string;
  slot: Slot;
  name: string;
  emoji: string;
  source: 'shop' | 'season' | 'legendary';
  price?: number;
  season?: SeasonId;
  ring?: string; // auras recolor the avatar's ring
};

export const SLOTS: { id: Slot; name: string }[] = [
  { id: 'hat', name: 'Hats' },
  { id: 'held', name: 'Held' },
  { id: 'aura', name: 'Auras' },
];

export const COSMETICS: Cosmetic[] = [
  { id: 'cap', slot: 'hat', name: 'Cap', emoji: '🧢', source: 'shop', price: 250 },
  { id: 'top_hat', slot: 'hat', name: 'Top hat', emoji: '🎩', source: 'shop', price: 300 },
  { id: 'grad_cap', slot: 'hat', name: 'Graduation cap', emoji: '🎓', source: 'shop', price: 600 },
  { id: 'crown', slot: 'hat', name: 'Gold crown', emoji: '👑', source: 'shop', price: 2000 },
  { id: 'coffee', slot: 'held', name: 'Tiny coffee', emoji: '☕', source: 'shop', price: 200 },
  { id: 'rose', slot: 'held', name: 'Rose', emoji: '🌹', source: 'shop', price: 350 },
  { id: 'controller', slot: 'held', name: 'Controller', emoji: '🎮', source: 'shop', price: 400 },
  { id: 'shades', slot: 'held', name: 'Shades', emoji: '🕶️', source: 'shop', price: 500 },
  { id: 'dagger', slot: 'held', name: 'Dagger', emoji: '🗡️', source: 'shop', price: 750 },
  // only while the season is on
  { id: 'pumpkin', slot: 'hat', name: 'Pumpkin hat', emoji: '🎃', source: 'season', season: 'halloween', price: 400 },
  { id: 'lucia_candle', slot: 'held', name: 'Lucia candle', emoji: '🕯️', source: 'season', season: 'lucia', price: 300 },
  { id: 'solstice_moon', slot: 'held', name: 'Solstice moon', emoji: '🌙', source: 'season', season: 'solstice', price: 300 },
  // legendary chests only
  { id: 'aura_cosmic', slot: 'aura', name: 'Cosmic aura', emoji: '🌌', source: 'legendary', ring: '#9B6BFF' },
  { id: 'aura_flame', slot: 'aura', name: 'Flame aura', emoji: '🔥', source: 'legendary', ring: '#FF7A1A' },
  { id: 'aura_toxic', slot: 'aura', name: 'Toxic aura', emoji: '☢️', source: 'legendary', ring: '#33D17A' },
  { id: 'unicorn', slot: 'held', name: 'Pocket unicorn', emoji: '🦄', source: 'legendary' },
];

export const cosmeticOf = (id: string | undefined) => (id ? COSMETICS.find((c) => c.id === id) : undefined);
export const owns = (s: State, id: string) => (s.cosmetics?.owned ?? []).includes(id);

/** Can be bought right now: shop items always, seasonal ones while their season is on, legendary ones never. */
export function buyable(c: Cosmetic, date: Date | number = new Date()) {
  if (c.source === 'shop') return true;
  if (c.source === 'season') return seasonOn(date)?.id === c.season;
  return false;
}

const SEASON_NOTE: Partial<Record<SeasonId, string>> = { halloween: 'Spooky season only', lucia: 'Lucia only', solstice: 'Winter solstice only' };

/** Where to find an item you can't buy right now. */
export function whereToGet(c: Cosmetic) {
  if (c.source === 'legendary') return 'Legendary chests only';
  if (c.source === 'season') return (c.season && SEASON_NOTE[c.season]) ?? 'Seasonal';
  return '';
}

/** What the spider wears now, owned items only. */
export function worn(s: State): Partial<Record<Slot, Cosmetic>> {
  const out: Partial<Record<Slot, Cosmetic>> = {};
  for (const slot of ['hat', 'held', 'aura'] as const) {
    const c = cosmeticOf(s.cosmetics?.worn[slot]);
    if (c && owns(s, c.id)) out[slot] = c;
  }
  return out;
}

/** A legendary-only item not owned yet, picked by `r` (0–1), or null when there are none left. */
export function legendaryDrop(s: State, r = Math.random()): Cosmetic | null {
  const left = COSMETICS.filter((c) => c.source === 'legendary' && !owns(s, c.id));
  return left.length ? left[Math.floor(r * left.length)] : null;
}

/** Every title earned so far: one per level reached. */
export const titlesEarned = (s: State) => [...new Set(Array.from({ length: levelForXp(s.xp) }, (_, i) => titleFor(i + 1)))];

/** The title shown on HQ: the one picked, if it's still earned, or the current level's. */
export function shownTitle(s: State) {
  const picked = s.cosmetics?.title;
  return picked && titlesEarned(s).includes(picked) ? picked : titleFor(levelForXp(s.xp));
}

const wardrobe = (s: State) => s.cosmetics ?? { owned: [], worn: {} };

/** `s` with `id` added to the wardrobe. */
export const withOwned = (s: State, id: string): State => ({ ...s, cosmetics: { ...wardrobe(s), owned: [...new Set([...wardrobe(s).owned, id])] } });

/** `s` wearing `id` in `slot` (null takes it off). */
export const withWorn = (s: State, slot: Slot, id: string | null): State => ({
  ...s,
  cosmetics: { ...wardrobe(s), worn: { ...wardrobe(s).worn, [slot]: id ?? undefined } },
});

/** `s` showing `title` on HQ (null: the current level's). */
export const withTitle = (s: State, title: string | null): State => ({ ...s, cosmetics: { ...wardrobe(s), title: title ?? undefined } });
