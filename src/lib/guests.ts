// Rare guests in the terrarium. Every 2 or 3 weeks (seeded from GUEST_EPOCH, so never two weeks running) a guest
// spends one day in the tank: a lost jumping spider from Gotland, Sir Reginald (a pompous harvestman who narrates
// for an hour once woken), a garden orb weaver in autumn, a house spider at jul, and during a Couch King week a
// Syndicate spy disguised as a pebble. It sleeps until tapped; awake, it comments on the day's logs in its own voice
// (the guest* pools in lines.ts), or on a kind day only keeps her company. By the next morning it has gone and left
// a small gift: coins, or its keepsake (a cosmetic; one already owned pays coins). Never XP. The guestbook
// (State.guests) remembers each visit. Pure, so the tests can run it.
import { owns, withOwned } from './cosmetics';
import { roll } from './critters';
import { addDays, dayKey, HOUR, startOfWeek } from './dates';
import { habitsDone } from './habits';
import type { LineKey } from './lines';
import { dayOf, doneTasksOn, trainedOn } from './selectors';
import { toneOn } from './tone';
import type { GuestBook, GuestId, GuestVisit, State } from './types';

const noon = (key: string) => new Date(`${key}T12:00`);
const next = (key: string) => dayKey(addDays(noon(key), 1));
const before = (key: string) => dayKey(addDays(noon(key), -1));
const WEEK = 7 * 86_400_000;

/** How a guest looks: the spider model recoloured and rescaled (legs, abdomen), maybe with a hat; the pebble keeps its legs tucked in until woken. */
export type GuestLook = { skin: string; leg: string; marking: string; legScale: number; abdomen: number; size: number; hat?: 'top' | 'tomte'; pebble?: boolean };
export type Guest = { id: GuestId; name: string; short: string; emoji: string; look: GuestLook; gift: string; voice: LineKey; quiet: LineKey };

export const GUESTS: Record<GuestId, Guest> = {
  jumper: {
    id: 'jumper',
    name: 'A lost jumping spider from Gotland',
    short: 'The jumping spider',
    emoji: '🕷️',
    look: { skin: '#3a2f28', leg: '#4a3c32', marking: '#f2efe6', legScale: 0.75, abdomen: 0.9, size: 0.5 },
    gift: 'visby_postcard',
    voice: 'guestJumper',
    quiet: 'guestJumperQuiet',
  },
  reginald: {
    id: 'reginald',
    name: 'Sir Reginald, a harvestman of some standing',
    short: 'Sir Reginald',
    emoji: '🎩',
    look: { skin: '#7a6450', leg: '#5e4c3c', marking: '#c9b08a', legScale: 2.1, abdomen: 0.8, size: 0.5, hat: 'top' },
    gift: 'monocle',
    voice: 'guestReginald',
    quiet: 'guestReginaldQuiet',
  },
  orb: {
    id: 'orb',
    name: 'A garden orb weaver, in for the autumn',
    short: 'The orb weaver',
    emoji: '🕸️',
    look: { skin: '#8a5a2a', leg: '#6b4a2a', marking: '#f4efe0', legScale: 1, abdomen: 1.35, size: 0.6 },
    gift: 'dew_drop',
    voice: 'guestOrb',
    quiet: 'guestOrbQuiet',
  },
  house: {
    id: 'house',
    name: 'A house spider, in for jul',
    short: 'The house spider',
    emoji: '🎅',
    look: { skin: '#5a4632', leg: '#4a3a2a', marking: '#a88a6a', legScale: 1.5, abdomen: 0.95, size: 0.62, hat: 'tomte' },
    gift: 'straw_goat',
    voice: 'guestHouse',
    quiet: 'guestHouseQuiet',
  },
  spy: {
    id: 'spy',
    name: 'A pebble. Definitely a pebble.',
    short: 'The pebble',
    emoji: '🪨',
    look: { skin: '#7a7670', leg: '#6a6660', marking: '#8a8680', legScale: 0.9, abdomen: 1.1, size: 0.55, pebble: true },
    gift: 'fake_moustache',
    voice: 'guestSpy',
    quiet: 'guestSpyQuiet',
  },
};

// ---------- when they come ----------

/** The Monday guest weeks are counted from. */
export const GUEST_EPOCH = '2026-01-05';
/** Days of guest days looked back on when the app wasn't opened. */
export const GUEST_BACKFILL = 21;
/** Sir Reginald narrates this long once woken. */
export const NARRATE_MS = HOUR;
/** What a gift of coins can be, and how often it's the guest's keepsake instead. */
export const GUEST_COINS = [20, 30, 40, 50] as const;
export const KEEPSAKE_CHANCE = 0.35;

const weekIndex = (monday: string) => Math.round((noon(monday).getTime() - noon(GUEST_EPOCH).getTime()) / WEEK);
const guestIdx: number[] = [0];
/** Whether week `i` (from the epoch) has a guest: the first does, then every 2 or 3 weeks (seeded), never two running. */
function guestWeekIndex(i: number): boolean {
  if (i < 0) return false;
  while (guestIdx[guestIdx.length - 1] < i) {
    const last = guestIdx[guestIdx.length - 1];
    guestIdx.push(last + 2 + (roll(`guestgap:${last}`) < 0.5 ? 0 : 1));
  }
  return guestIdx.includes(i);
}

/** The week (its Monday) has a guest. */
export const guestWeek = (monday: string) => guestWeekIndex(weekIndex(monday));

/** The day of a guest week the guest spends in the tank. */
export const guestDayOf = (monday: string) => dayKey(addDays(noon(monday), Math.min(6, Math.floor(roll(`guestday:${monday}`) * 7))));

/** Who comes: the spy in a Couch King week, the house spider from Lucia to Trettondagen, the orb weaver in autumn, else the jumping spider or Sir Reginald. */
export function guestFor(s: State, day: string): GuestId {
  const monday = dayKey(startOfWeek(noon(day)));
  const kings = s.kingWeeks ?? (s.finalBossWeek ? [s.finalBossWeek] : []);
  if (kings.includes(monday)) return 'spy';
  const d = noon(day);
  const md = (d.getMonth() + 1) * 100 + d.getDate();
  if (md >= 1213 || md <= 106) return 'house';
  const m = d.getMonth() + 1;
  const pool: GuestId[] = m >= 9 && m <= 10 ? ['orb', 'reginald', 'jumper'] : m >= 5 && m <= 8 ? ['jumper', 'jumper', 'reginald'] : ['reginald', 'jumper'];
  return pool[Math.min(pool.length - 1, Math.floor(roll(`guest:${day}`) * pool.length))];
}

/** The guest in the tank on `day`, if any. */
export function guestOn(s: State, day: string): GuestId | null {
  const monday = dayKey(startOfWeek(noon(day)));
  return guestWeek(monday) && guestDayOf(monday) === day ? guestFor(s, day) : null;
}

/** Guest days from `from` to `to`, inclusive. */
export function guestDays(s: State, from: string, to: string): { day: string; guest: GuestId }[] {
  const out: { day: string; guest: GuestId }[] = [];
  for (let d = from; d <= to; d = next(d)) {
    const g = guestOn(s, d);
    if (g) out.push({ day: d, guest: g });
  }
  return out;
}

// ---------- in the tank ----------

const bookOf = (s: State, today: string): GuestBook => s.guests ?? { since: today, visits: [] };
export const visitOn = (s: State, day: string) => s.guests?.visits.find((v) => v.day === day) ?? null;

/** Today's guest is awake (she tapped it). */
export const guestAwake = (s: State, day: string) => visitOn(s, day)?.woke != null;

/** `s` with today's guest woken at `now` (once). */
export function withGuestAwake(s: State, now = new Date()): State {
  const today = dayKey(now);
  const guest = guestOn(s, today);
  if (!guest || guestAwake(s, today)) return s;
  const book = bookOf(s, today);
  const visits = [...book.visits.filter((v) => v.day !== today), { day: today, guest, woke: now.getTime() }].slice(-60);
  return { ...s, guests: { ...book, visits } };
}

/** Sir Reginald narrates for an hour once woken. */
export function narrating(s: State, now = Date.now()): boolean {
  const today = dayKey(now);
  const v = visitOn(s, today);
  return guestOn(s, today) === 'reginald' && v?.woke != null && now - v.woke < NARRATE_MS;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const list = (xs: string[]) => (xs.length < 2 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`);

/** What the guest can talk about: the day's water, training, tasks, habits, focus and steps. Never food, mood, sleep or the body. Null when nothing's logged. */
export function daySummary(s: State, day: string): string | null {
  const d = dayOf(s, day);
  const parts: string[] = [];
  if (d.water.length) parts.push(plural(d.water.length, 'glass of water', 'glasses of water'));
  if (trainedOn(d)) parts.push('a workout');
  const tasks = doneTasksOn(s, day).length;
  if (tasks) parts.push(plural(tasks, 'task done', 'tasks done'));
  const habits = habitsDone(s, day).length;
  if (habits) parts.push(plural(habits, 'habit', 'habits'));
  const focus = d.focus?.length ?? 0;
  if (focus) parts.push(plural(focus, 'Web Focus session', 'Web Focus sessions'));
  if ((d.steps ?? 0) >= 1000) parts.push(`${(d.steps! / 1000).toFixed(1).replace(/\.0$/, '')}k steps`);
  return parts.length ? list(parts) : null;
}

/** What a tap on the guest gets: its own voice on the day's logs, or on a kind day (or with nothing logged) just company. */
export function guestLineKey(s: State, guest: GuestId, day: string, now = new Date()): { key: LineKey; summary: string } {
  const summary = daySummary(s, day);
  const g = GUESTS[guest];
  return toneOn(s, day, now).kind || !summary ? { key: g.quiet, summary: '' } : { key: g.voice, summary };
}

// ---------- the gift, by morning ----------

/** What a guest left after its day: its keepsake now and then (if not owned), else coins. Seeded by the day. */
export function giftFor(s: State, day: string, guest: GuestId): { coins?: number; cosmetic?: string } {
  const keepsake = GUESTS[guest].gift;
  if (roll(`guestgift:${day}`) < KEEPSAKE_CHANCE && !owns(s, keepsake)) return { cosmetic: keepsake };
  return { coins: GUEST_COINS[Math.min(GUEST_COINS.length - 1, Math.floor(roll(`guestcoins:${day}`) * GUEST_COINS.length))] };
}

/** Guest days to settle: none looked at yet, or one since the last look is over. */
export function guestsDue(s: State, now = new Date()): boolean {
  if (!s.guests) return true;
  return (s.guests.checked ?? before(s.guests.since)) < before(dayKey(now));
}

/**
 * Guest days over since the last look (at most GUEST_BACKFILL back, none before the guestbook began): each goes in
 * the guestbook with its gift, coins or its keepsake. Never XP.
 */
export function settleGuests(s: State, now = new Date()): { state: State; left: GuestVisit[] } {
  const today = dayKey(now);
  const yesterday = before(today);
  const book = bookOf(s, today);
  const floor = dayKey(addDays(noon(today), -GUEST_BACKFILL));
  let from = book.checked ? next(book.checked) : book.since;
  if (from < floor) from = floor;
  if (from > yesterday) return { state: s.guests ? s : { ...s, guests: book }, left: [] };
  let state: State = s;
  let visits = [...book.visits];
  const left: GuestVisit[] = [];
  for (const { day, guest } of guestDays(s, from, yesterday)) {
    const had = visits.find((v) => v.day === day);
    if (had?.gift) continue;
    const gift = giftFor(state, day, guest);
    if (gift.cosmetic) state = withOwned(state, gift.cosmetic);
    if (gift.coins) state = { ...state, coins: state.coins + gift.coins, coinsEarned: state.coinsEarned + gift.coins };
    const visit: GuestVisit = { ...had, day, guest, gift };
    visits = [...visits.filter((v) => v.day !== day), visit].sort((a, b) => (a.day < b.day ? -1 : 1));
    left.push(visit);
  }
  return { state: { ...state, guests: { ...book, checked: yesterday, visits: visits.slice(-60) } }, left };
}
