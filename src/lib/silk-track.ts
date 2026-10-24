// The Silk Track: a monthly run of 20 tiers filled by the month's earned XP (xpEarned, so gaming penalties
// don't drain it). Each tier hands out something to wear, a title or a dated badge. Missed days cost nothing:
// the track only counts what was earned. When the month ends the next edition starts from zero, and whatever
// was unlocked stays. Tier XP is never paid out again: the reward is the item. Editions come from the table
// below, one per calendar month, so a new year needs no code. Theme-free, so logic-test can load it.
import type { State } from './types';

export const SILK_TIERS = 20;

/** XP needed this month for tier `n`: quick early tiers, wider gaps later. 20 is 3 600 (about 24 days at 150 a day). */
export const tierXp = (n: number) => (n <= 0 ? 0 : Math.round((80 * n + 5 * n * n) / 10) * 10);

/** The highest tier `xp` reaches. */
export function tierForXp(xp: number) {
  let n = 0;
  while (n < SILK_TIERS && xp >= tierXp(n + 1)) n++;
  return n;
}

export type SilkKind = 'hat' | 'held' | 'aura' | 'title' | 'badge';
export type SilkReward = { tier: number; kind: SilkKind; id: string; emoji: string; name: string; ring?: string };
export type Edition = { month: string; key: string; name: string; emoji: string; color: string; tagline: string; rewards: SilkReward[] };

/** `ref`: an existing cosmetic it hands out instead of a new one. `ring`: an aura's ring colour. */
type Item = { kind: Exclude<SilkKind, 'badge'>; emoji: string; name: string; ref?: string; ring?: string };
type EditionDef = Omit<Edition, 'month' | 'rewards'> & { items: Item[] };

const title = (name: string, emoji = '🏷️'): Item => ({ kind: 'title', emoji, name });
const hat = (emoji: string, name: string, ref?: string): Item => ({ kind: 'hat', emoji, name, ref });
const held = (emoji: string, name: string, ref?: string): Item => ({ kind: 'held', emoji, name, ref });
const aura = (emoji: string, name: string, ring: string): Item => ({ kind: 'aura', emoji, name, ring });

/** One per month, January first. Each has 10 items (tiers in ITEM_TIERS order); the other tiers are badges. */
const EDITIONS: EditionDef[] = [
  {
    key: 'frost',
    name: 'Frost edition',
    emoji: '❄️',
    color: '#9FD8FF',
    tagline: 'The darkest stretch is behind you. Mostly.',
    items: [title('Frost Starter'), hat('❄️', 'Snowflake crown'), held('🧤', 'Mittens'), held('🍵', 'Hot tea'), title('Ice Walker'), hat('🧊', 'Ice cap'), held('⛸️', 'Skates'), held('🌨️', 'Pocket snowfall'), title('Polar Night Survivor'), aura('🧊', 'Frost aura', '#9FD8FF')],
  },
  {
    key: 'ski',
    name: 'Ski season',
    emoji: '⛷️',
    color: '#BFE3FF',
    tagline: 'Vasaloppet energy. Any pace counts.',
    items: [title('Slope Rookie'), hat('⛑️', 'Ski helmet'), held('🎿', 'Tiny skis'), held('🏂', 'Snowboard'), title('Vasalopp Dreamer'), hat('🥽', 'Goggles'), held('☃️', 'Snowman'), held('🏒', 'Hockey stick'), title('Downhill Demon'), aura('🌬️', 'Wind aura', '#BFE3FF')],
  },
  {
    key: 'thaw',
    name: 'Thaw edition',
    emoji: '🌱',
    color: '#8FD694',
    tagline: 'The snow is leaving. Excuses can go with it.',
    items: [title('First Sprout'), hat('🌱', 'Sprout'), held('💧', 'Meltwater drop'), held('🐦', 'Early bird'), title('Spring Cleaner'), hat('🌷', 'Tulip hat'), held('☔', 'Umbrella'), held('🐛', 'Pet caterpillar'), title('Equinox Balancer'), aura('🌿', 'Fresh aura', '#8FD694')],
  },
  {
    key: 'valborg',
    name: 'Valborg edition',
    emoji: '🔥',
    color: '#FF9F43',
    tagline: 'Bonfires, choirs and a clean slate on the 1st.',
    items: [title('Bonfire Starter'), hat('🐣', 'Chick hat'), held('🪺', 'Nest'), held('🔦', 'Torch'), title('Spring Chorister'), hat('🐰', 'Bunny ears'), held('🪶', 'Feather'), held('🎺', 'Trumpet'), title('Fire Keeper'), aura('🌅', 'Dawn aura', '#FF9F43')],
  },
  {
    key: 'blossom',
    name: 'Blossom edition',
    emoji: '🌸',
    color: '#FFB7D5',
    tagline: 'Everything is blooming. Your habits are invited.',
    items: [title('Bloom Chaser'), hat('🌸', 'Blossom crown'), held('🐝', 'Pet bee'), held('🦋', 'Butterfly'), title('Lilac Season'), hat('👒', 'Sun hat'), held('🌻', 'Sunflower'), held('🪁', 'Kite'), title('Spring Royalty'), aura('🌸', 'Blossom aura', '#FFB7D5')],
  },
  {
    key: 'midsommar',
    name: 'Midsommar edition',
    emoji: '🌼',
    color: '#FFE066',
    tagline: 'The light never leaves. Neither do I.',
    items: [title('Maypole Dancer'), hat('🌼', 'Flower wreath'), held('🎻', 'Fiddle'), held('🐸', 'Små grodorna'), title('Midnight Sun Walker'), hat('🌞', 'Sun crown'), held('🌾', 'Wheat sheaf'), held('🧺', 'Picnic basket'), title('Longest Day Legend'), aura('☀️', 'Midnight sun aura', '#FFE066')],
  },
  {
    key: 'archipelago',
    name: 'Archipelago edition',
    emoji: '⛵',
    color: '#5EC8E5',
    tagline: 'Holiday mode. The web travels with you.',
    items: [title('Skärgård Drifter'), hat('🌊', 'Wave crest'), held('⛵', 'Tiny sailboat'), held('🎣', 'Fishing rod'), title('Captain of Nothing'), hat('🐚', 'Shell'), held('🛶', 'Canoe'), held('🦀', 'Pet crab'), title('Sea Breeze Sovereign'), aura('🌊', 'Ocean aura', '#5EC8E5')],
  },
  {
    key: 'kraftskiva',
    name: 'Kräftskiva edition',
    emoji: '🦞',
    color: '#FF6B5B',
    tagline: 'Paper hats, lanterns and late summer.',
    items: [title('Party Planner'), hat('🎉', 'Paper party hat'), held('🏮', 'Lantern'), held('🦞', 'Crayfish buddy'), title('Sing-Along Captain'), hat('🎊', 'Confetti crown'), held('🎶', 'Song sheet'), held('🪩', 'Disco ball'), title('Late Summer Legend'), aura('🌆', 'Dusk aura', '#FF6B5B')],
  },
  {
    key: 'forest',
    name: 'Forest edition',
    emoji: '🍄',
    color: '#C9A26B',
    tagline: 'Mushroom season. Forage some discipline.',
    items: [title('Forager'), hat('🍄', 'Mushroom cap'), held('🌰', 'Chestnut'), held('🦔', 'Pet hedgehog'), title('Chanterelle Hunter'), hat('🍁', 'Maple leaf'), held('🪵', 'Tiny log'), held('🦉', 'Owl'), title('Forest Whisperer'), aura('🍂', 'Autumn aura', '#C9A26B')],
  },
  {
    key: 'halloween',
    name: 'Halloween edition',
    emoji: '🎃',
    color: '#FF7A1A',
    tagline: "The spider's own holiday. Dress for it.",
    items: [title('Trick-or-Treater'), hat('🎃', 'Pumpkin hat', 'pumpkin'), held('🍬', 'Candy stash'), held('🦇', 'Pet bat'), title('Night Crawler'), hat('🕸️', 'Cobweb veil'), held('🔮', 'Crystal ball'), held('💀', 'Tiny skull'), title('Lord of the Webs'), aura('👻', 'Ghost aura', '#C7B8FF')],
  },
  {
    key: 'mys',
    name: 'Mys edition',
    emoji: '🕯️',
    color: '#D9A066',
    tagline: 'Dark at four. Candles, blankets, small wins.',
    items: [title('Cosy Operator'), hat('🧶', 'Wool beanie'), held('🫖', 'Teapot'), held('📚', 'Tiny books'), title('Keeper of the Lamp'), hat('🍂', 'Leaf crown'), held('🧦', 'Wool socks'), held('🌧️', 'Pocket drizzle'), title('November Survivor'), aura('🕯️', 'Candlelight aura', '#E8B46A')],
  },
  {
    key: 'jul',
    name: 'Lucia & jul edition',
    emoji: '⭐',
    color: '#FFD166',
    tagline: 'Light in the darkest month.',
    items: [title('Lucia Lightbearer'), hat('⭐', 'Star boy hat'), held('🕯️', 'Lucia candle', 'lucia_candle'), held('🎁', 'Tiny present'), title('Julbock Rider'), hat('🎀', 'Red bow'), held('🧸', 'Teddy'), held('🦌', 'Pocket reindeer'), title('Midwinter Legend'), aura('✨', 'Starlight aura', '#FFD166')],
  },
];

/** Tiers that hand out an edition's items, in order; every other tier is a dated badge. */
const ITEM_TIERS = [2, 3, 5, 7, 9, 11, 13, 15, 17, 20];
const BADGES: [emoji: string, name: string][] = [
  ['🧵', 'First thread'],
  ['🕸️', 'Spinner'],
  ['🪡', 'Stitcher'],
  ['🎀', 'Knotter'],
  ['🌀', 'Orb-weaver'],
  ['🌙', 'Night spinner'],
  ['⭐', 'Silk star'],
  ['🏵️', 'Web artisan'],
  ['💠', 'Web architect'],
  ['🏆', 'Master weaver'],
];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "2026-10" from a day key or a month key. */
export const monthOf = (key: string) => key.slice(0, 7);
const defOf = (month: string) => EDITIONS[Number(month.slice(5, 7)) - 1];
const itemId = (def: EditionDef, i: number) => def.items[i].ref ?? `silk_${def.key}_${i}`;
const badgeId = (month: string, tier: number) => `silk_badge_${month}_${tier}`;
export const monthName = (month: string) => `${MONTHS[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`;

/** The edition for a month ("2026-10"): its look and its 20 rewards. */
export function editionFor(month: string): Edition {
  const def = defOf(month);
  const rewards: SilkReward[] = [];
  let badge = 0;
  for (let tier = 1; tier <= SILK_TIERS; tier++) {
    const i = ITEM_TIERS.indexOf(tier);
    if (i >= 0) {
      const it = def.items[i];
      rewards.push({ tier, kind: it.kind, id: itemId(def, i), emoji: it.emoji, name: it.name, ...(it.ring ? { ring: it.ring } : {}) });
    } else {
      const [emoji, name] = BADGES[badge++];
      rewards.push({ tier, kind: 'badge', id: badgeId(month, tier), emoji, name: `${name} · ${monthName(month)}` });
    }
  }
  return { month, key: def.key, name: def.name, emoji: def.emoji, color: def.color, tagline: def.tagline, rewards };
}

/** The month after `month`. */
export function nextMonth(month: string) {
  const [y, m] = month.split('-').map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
}
const prevMonth = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
};

/** XP earned in a month (penalties are kept out of xpEarned, so they don't count against the track). */
export function monthXp(s: State, month: string) {
  let xp = 0;
  for (const [k, d] of Object.entries(s.days)) if (k.startsWith(month)) xp += d.xpEarned ?? 0;
  return xp;
}

/** The tier already handed out in `month`: the month on record, or the one before it. */
const givenIn = (s: State, month: string) => (s.silk?.month === month ? s.silk.tier : s.silk?.prev?.month === month ? s.silk.prev.tier : 0);

/** Where the track stands in a month: XP, tier reached (never below what was already handed out) and the next step. */
export function silkStatus(s: State, month: string) {
  const edition = editionFor(month);
  const xp = monthXp(s, month);
  const tier = Math.max(tierForXp(xp), givenIn(s, month));
  const next = tier < SILK_TIERS ? { tier: tier + 1, xp: tierXp(tier + 1), reward: edition.rewards[tier] } : null;
  const from = tierXp(tier);
  const progress = next ? Math.max(0, Math.min(1, (xp - from) / (next.xp - from))) : 1;
  return { edition, xp, tier, next, progress };
}

/** A reward that just unlocked; `had` when it was already in the wardrobe (a seasonal piece bought earlier). */
export type Unlocked = SilkReward & { had: boolean };

/**
 * Hands out every tier `month` has reached but not yet given. The record keeps the latest month and the one
 * before it (`prev`), so XP that lands late on last month still finds what it already gave.
 */
export function grantSilk(s: State, month: string): { state: State; unlocked: Unlocked[] } {
  const given = givenIn(s, month);
  const tier = tierForXp(monthXp(s, month));
  if (tier <= given) return { state: s, unlocked: [] };
  const w = s.cosmetics ?? { owned: [], worn: {} };
  const unlocked = editionFor(month)
    .rewards.filter((r) => r.tier > given && r.tier <= tier)
    .map((r) => ({ ...r, had: w.owned.includes(r.id) }));
  const owned = [...new Set([...w.owned, ...unlocked.map((r) => r.id)])];
  const cur = s.silk;
  const silk =
    !cur || cur.month === month
      ? { month, tier, ...(cur?.prev ? { prev: cur.prev } : {}) }
      : cur.month < month
        ? { month, tier, prev: { month: cur.month, tier: cur.tier } }
        : { ...cur, prev: { month, tier } };
  return { state: { ...s, cosmetics: { ...w, owned }, silk }, unlocked };
}

/** Days into a month that XP landing late on the month before still counts for its track (a watch sync, a boss settled on Monday). */
const LATE_DAYS = 2;

/**
 * Checks the track after XP moved: last month first while it's still the one on record, or during the first
 * LATE_DAYS of this month when it's the one before, then this month. Returns what unlocked, per edition.
 */
export function checkSilkTrack(s: State, today: string) {
  const month = monthOf(today);
  const last = prevMonth(month);
  const late = s.silk?.month === last || (s.silk?.prev?.month === last && Number(today.slice(8, 10)) <= LATE_DAYS);
  const out: { edition: Edition; unlocked: Unlocked[]; tier: number }[] = [];
  let next = s;
  for (const m of late ? [last, month] : [month]) {
    const r = grantSilk(next, m);
    next = r.state;
    if (r.unlocked.length) out.push({ edition: editionFor(m), unlocked: r.unlocked, tier: givenIn(next, m) });
  }
  return { state: next, unlocked: out };
}

// ---- for the wardrobe ----

/** Every item an edition hands out that isn't an existing cosmetic: hats, held items and auras. */
export const SILK_ITEMS = EDITIONS.flatMap((def) =>
  def.items.flatMap((it, i) => (it.ref || it.kind === 'title' ? [] : [{ id: itemId(def, i), slot: it.kind, emoji: it.emoji, name: it.name, ring: it.ring, edition: def.name }])),
) as { id: string; slot: 'hat' | 'held' | 'aura'; emoji: string; name: string; ring?: string; edition: string }[];

const TITLES = new Map(EDITIONS.flatMap((def) => def.items.flatMap((it, i) => (it.kind === 'title' ? [[itemId(def, i), it.name] as const] : []))));

/** Titles unlocked on the track (shown with the level titles). */
export const silkTitles = (s: State) => (s.cosmetics?.owned ?? []).flatMap((id) => (TITLES.has(id) ? [TITLES.get(id)!] : []));

/** Dated badges collected, oldest first. */
export function silkBadges(s: State) {
  return (s.cosmetics?.owned ?? [])
    .flatMap((id) => {
      const m = /^silk_badge_(\d{4}-\d{2})_(\d+)$/.exec(id);
      const r = m ? editionFor(m[1]).rewards[Number(m[2]) - 1] : undefined;
      return m && r ? [{ month: m[1], r }] : [];
    })
    .sort((a, b) => (a.month === b.month ? a.r.tier - b.r.tier : a.month < b.month ? -1 : 1))
    .map((x) => x.r);
}
