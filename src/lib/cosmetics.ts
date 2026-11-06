// The spider's wardrobe: things to wear, bought with coins, found in season, dropped by legendary
// chests, unlocked on the monthly Silk Track, earned in co-op weeks and on the trek, or handed out by an event (Advent Web doors, the Prizes).
// Pets are the flies of the collection (critters.ts): one caught at least once can be adopted. Purely for looks:
// nothing here changes XP, the boss or the league.
import { FLIES, type Rarity } from './critters';
import { seasonOn, type SeasonId } from './seasons';
import { SILK_ITEMS, silkTitles } from './silk-track';
import type { State } from './types';
import { levelForXp, titleFor } from './xp';

export type Slot = 'hat' | 'held' | 'aura' | 'pet';
/** What the avatar shows besides the worn items: the evolution stage's badge and its opinion of you (respect.ts). */
export type AvatarExtra = 'badge' | 'respect';
export type Cosmetic = {
  id: string;
  slot: Slot;
  name: string;
  emoji: string;
  source: 'shop' | 'season' | 'legendary' | 'silk' | 'reward' | 'gift' | 'pet';
  price?: number;
  season?: SeasonId;
  edition?: string; // Silk Track items: the edition that hands it out
  note?: string; // reward and gift items: where they're earned or come from
  ring?: string; // auras recolor the avatar's ring
  fly?: string; // pets: the fly (critters.ts) it is
};

export const SLOTS: { id: Slot; name: string }[] = [
  { id: 'hat', name: 'Hats' },
  { id: 'held', name: 'Held' },
  { id: 'aura', name: 'Auras' },
  { id: 'pet', name: 'Pets' },
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
  // gifts: Advent Web doors (advent.ts) and the S.P.I.D.E.R. Prizes (prizes.ts)
  { id: 'jingle_bell', slot: 'held', name: 'Jingle bell', emoji: '🔔', source: 'gift', note: 'Advent Web · door 6' },
  { id: 'advent_star', slot: 'held', name: 'Advent star', emoji: '🌟', source: 'gift', note: 'Advent Web · door 12' },
  { id: 'aura_pine', slot: 'aura', name: 'Pine aura', emoji: '🌲', source: 'gift', note: 'Advent Web · door 18', ring: '#3FA36B' },
  { id: 'tomte_hat', slot: 'hat', name: 'Tomte hat', emoji: '🎅', source: 'gift', note: 'Advent Web · door 24' },
  { id: 'prize_medal', slot: 'held', name: 'S.P.I.D.E.R. Prize medal', emoji: '🏅', source: 'gift', note: 'The S.P.I.D.E.R. Prizes · 10 December' },
  // legendary chests only
  { id: 'aura_cosmic', slot: 'aura', name: 'Cosmic aura', emoji: '🌌', source: 'legendary', ring: '#9B6BFF' },
  { id: 'aura_flame', slot: 'aura', name: 'Flame aura', emoji: '🔥', source: 'legendary', ring: '#FF7A1A' },
  { id: 'aura_toxic', slot: 'aura', name: 'Toxic aura', emoji: '☢️', source: 'legendary', ring: '#33D17A' },
  { id: 'unicorn', slot: 'held', name: 'Pocket unicorn', emoji: '🦄', source: 'legendary' },
  // earned, never sold: co-op weeks (coop.ts) and the trek (trek.ts)
  { id: 'coop_bracelet', slot: 'held', name: 'Friendship bracelet', emoji: '📿', source: 'reward', note: 'Win a co-op week' },
  { id: 'aura_duo', slot: 'aura', name: 'Duo aura', emoji: '💞', source: 'reward', ring: '#FF6FAE', note: 'Win 5 co-op weeks' },
  { id: 'trek_ticket', slot: 'held', name: 'Travel card', emoji: '🎫', source: 'reward', note: 'Walk the tunnelbana trek' },
  { id: 'trek_map', slot: 'held', name: 'Trail map', emoji: '🗺️', source: 'reward', note: 'Halfway along Sörmlandsleden' },
  { id: 'trek_pack', slot: 'held', name: 'Trail backpack', emoji: '🎒', source: 'reward', note: 'Walk Sörmlandsleden' },
];

/** Silk Track hats, held items and auras (seasonal pieces it hands out are in COSMETICS already). */
export const SILK_COSMETICS: Cosmetic[] = SILK_ITEMS.map((x) => ({ ...x, source: 'silk' }));

/** What adopting a fly costs, by how rare it is. */
export const PET_PRICE: Record<Rarity, number> = { common: 300, rare: 600, epic: 1000, legendary: 1500 };
/** Every fly of the collection as a pet, sitting by the spider. */
export const PET_COSMETICS: Cosmetic[] = FLIES.map((f) => ({ id: `pet_${f.id}`, slot: 'pet', name: f.name, emoji: f.emoji, source: 'pet', price: PET_PRICE[f.rarity], fly: f.id }));

export const cosmeticOf = (id: string | undefined) =>
  id ? (COSMETICS.find((c) => c.id === id) ?? SILK_COSMETICS.find((c) => c.id === id) ?? PET_COSMETICS.find((c) => c.id === id)) : undefined;
export const owns = (s: State, id: string) => (s.cosmetics?.owned ?? []).includes(id);

/** A pet whose fly is in the collection: only a fly caught at least once can be adopted. */
export const petCaught = (s: State, c: Cosmetic) => c.source === 'pet' && !!c.fly && !!s.flies?.[c.fly];

/** Can be bought right now: shop items always, seasonal ones while their season is on, legendary ones never. */
export function buyable(c: Cosmetic, date: Date | number = new Date()) {
  if (c.source === 'shop') return true;
  if (c.source === 'season') return seasonOn(date)?.id === c.season;
  return false;
}

/** Can be bought by `s` right now: not owned yet, priced, and on sale (a pet once its fly was caught). */
export const forSale = (s: State, c: Cosmetic, date: Date | number = new Date()) =>
  c.price != null && !owns(s, c.id) && (c.source === 'pet' ? petCaught(s, c) : buyable(c, date));

const SEASON_NOTE: Partial<Record<SeasonId, string>> = { halloween: 'Spooky season only', lucia: 'Lucia only', solstice: 'Winter solstice only' };

/** Where to find an item you can't buy right now. */
export function whereToGet(c: Cosmetic) {
  if (c.source === 'legendary') return 'Legendary chests only';
  if (c.source === 'silk') return `Silk Track · ${c.edition ?? 'a monthly edition'}`;
  if (c.source === 'reward') return c.note ?? 'Earned';
  if (c.source === 'gift') return c.note ?? 'A gift';
  if (c.source === 'season') return (c.season && SEASON_NOTE[c.season]) ?? 'Seasonal';
  if (c.source === 'pet') return 'Catch it first';
  return '';
}

/** What the spider wears now, owned items only. */
export function worn(s: State): Partial<Record<Slot, Cosmetic>> {
  const out: Partial<Record<Slot, Cosmetic>> = {};
  for (const { id: slot } of SLOTS) {
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

/** Every title earned so far: one per level reached, plus those unlocked on the Silk Track. */
export const titlesEarned = (s: State) => [...new Set([...Array.from({ length: levelForXp(s.xp) }, (_, i) => titleFor(i + 1)), ...silkTitles(s)])];

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

/** Whether the avatar shows `extra` (both do unless switched off in the wardrobe). */
export const shows = (s: State, extra: AvatarExtra) => !(s.cosmetics?.hidden ?? []).includes(extra);

/** `s` with the avatar's `extra` switched on or off. */
export const withShown = (s: State, extra: AvatarExtra, on: boolean): State => {
  const hidden = (wardrobe(s).hidden ?? []).filter((x) => x !== extra);
  return { ...s, cosmetics: { ...wardrobe(s), hidden: on ? hidden : [...hidden, extra] } };
};

/** `s` showing `title` on HQ (null: the current level's). */
export const withTitle = (s: State, title: string | null): State => ({ ...s, cosmetics: { ...wardrobe(s), title: title ?? undefined } });
