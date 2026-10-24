// Advent and Julfrid (seasons.ts). The Advent Web: 24 doors, door n opening on n December, and a door
// left shut stays openable until Trettondedag jul, so nothing is ever lost by missing a day (no streaks).
// Doors give coins or a cosmetic, never XP. Julfrid (24–26 December): away mode in one tap until the
// 27th, and an hour of quiet for Kalle Anka on julafton.
import { cosmeticOf, owns, withOwned } from './cosmetics';
import { addDays, dayKey } from './dates';
import { pauseEnd, pausedOn, startPause } from './pause';
import { adventWebStart, firstAdventSunday, isJulfridKey } from './swedish-days';
import type { State } from './types';

export const ADVENT_DOORS = 24;

/** Doors that hand out a cosmetic instead of coins. */
const GIFT_DOORS: Record<number, string> = { 6: 'jingle_bell', 12: 'advent_star', 18: 'aura_pine', 24: 'tomte_hat' };
/** What a gift door pays when its cosmetic is already in the wardrobe (a later year). */
const GIFT_COINS = 30;

const noon = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12);

/** Advent candles lit on a date: one more each Advent Sunday, all four until annandag jul, none outside. */
export function adventCandles(date: Date | number = new Date()) {
  const d = new Date(date);
  const first = firstAdventSunday(d.getFullYear());
  const key = dayKey(d);
  if (key < dayKey(first) || key > `${d.getFullYear()}-12-26`) return 0;
  const weeks = Math.floor((noon(d.getFullYear(), d.getMonth() + 1, d.getDate()).getTime() - first.getTime()) / (7 * 86_400_000));
  return Math.min(4, weeks + 1);
}

/** The year whose Advent Web is up on a date (first Advent, or 1 December if that's earlier, to Trettondedag jul), or null. */
export function adventYear(date: Date | number = new Date()): number | null {
  const d = new Date(date);
  const y = d.getFullYear();
  const key = dayKey(d);
  if (key >= dayKey(adventWebStart(y))) return y;
  if (key <= `${y}-01-06`) return y - 1;
  return null;
}

/** Doors opened in a year's Advent Web. */
export const doorsOpened = (s: State, year: number) => s.advent?.[String(year)] ?? [];

/** A door can be opened from its own date on, once, while that year's Advent Web is up. */
export function doorOpenable(s: State, n: number, date: Date | number = new Date()) {
  const year = adventYear(date);
  if (year == null || !Number.isInteger(n) || n < 1 || n > ADVENT_DOORS) return false;
  return dayKey(date) >= dayKey(noon(year, 12, n)) && !doorsOpened(s, year).includes(n);
}

/** Doors waiting to be opened right now. */
export function doorsWaiting(s: State, date: Date | number = new Date()) {
  let n = 0;
  for (let i = 1; i <= ADVENT_DOORS; i++) if (doorOpenable(s, i, date)) n++;
  return n;
}

const hash = (str: string) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
};

export type DoorPrize = { coins: number; cosmetic?: string };

/** What door `n` holds in `year`: a cosmetic on the gift doors, otherwise 10–30 coins (the same for that door all year). */
export function doorPrize(year: number, n: number): DoorPrize {
  const gift = GIFT_DOORS[n];
  if (gift) return { coins: 0, cosmetic: gift };
  return { coins: 10 + 5 * (hash(`${year}:door:${n}`) % 5) };
}

/** Opens door `n`: coins or the cosmetic (coins instead if it's owned already). Null when it can't be opened. */
export function openDoor(s: State, n: number, date: Date | number = new Date()): { state: State; prize: DoorPrize; reward: string } | null {
  const year = adventYear(date);
  if (year == null || !doorOpenable(s, n, date)) return null;
  const prize = doorPrize(year, n);
  const opened = { ...s, advent: { ...s.advent, [String(year)]: [...doorsOpened(s, year), n].sort((a, b) => a - b) } };
  const c = prize.cosmetic ? cosmeticOf(prize.cosmetic) : undefined;
  if (c && !owns(s, c.id)) return { state: withOwned(opened, c.id), prize, reward: `${c.emoji} ${c.name}` };
  const coins = c ? GIFT_COINS : prize.coins;
  return { state: { ...opened, coins: opened.coins + coins, coinsEarned: opened.coinsEarned + coins }, prize: { coins }, reward: `+${coins} 🪙` };
}

// ---- Julfrid ----

/** Julafton, juldagen or annandag jul. */
export const isJulfrid = (date: Date | number = new Date()) => isJulfridKey(dayKey(date));

/** Julafton 15:00–16:00: Kalle Anka. Reminders keep quiet (warnings still come through: they aren't planned). */
export function kalleAnka(t: Date | number) {
  const d = new Date(t);
  return d.getMonth() === 11 && d.getDate() === 24 && d.getHours() === 15;
}

/**
 * The Julfrid days off still on offer: from the evening of the 23rd (from the 24th, then) or during Julfrid
 * (from today), to annandag jul. Null outside that, or when every one of those days is paused already.
 */
export function julfridOffer(s: State, now: Date = new Date()): { from: string; to: string } | null {
  const y = now.getFullYear();
  const today = dayKey(now);
  const eve = today === `${y}-12-23` && now.getHours() >= 18;
  if (!eve && !isJulfridKey(today)) return null;
  const from = eve ? `${y}-12-24` : today;
  const to = `${y}-12-26`;
  for (let d = new Date(`${from}T12:00`); dayKey(d) <= to; d = addDays(d, 1)) if (!pausedOn(s, dayKey(d))) return { from, to };
  return null;
}

/**
 * Away mode for the rest of Julfrid (to annandag jul, so everything counts again on the 27th), within the
 * month's cap of paused days. It starts on the first Julfrid day no pause covers yet: a sick pause running
 * into Julfrid stays sick, and the days off follow it. From the 23rd's evening it's planned ahead.
 * `result`: 'gone' when there's nothing left on offer, 'cap' when the month's paused days are used up.
 */
export function julfridPlan(s: State, now: Date = new Date()): { state: State; result: 'ok' | 'gone' | 'cap' } {
  const offer = julfridOffer(s, now);
  if (!offer) return { state: s, result: 'gone' };
  let from: string | null = null;
  let to = offer.from;
  for (let d = new Date(`${offer.from}T12:00`); dayKey(d) <= offer.to; d = addDays(d, 1)) {
    const k = dayKey(d);
    if (pausedOn(s, k)) {
      if (from) break;
      continue;
    }
    from ??= k;
    to = k;
  }
  if (!from) return { state: s, result: 'gone' };
  const days = Math.round((new Date(`${to}T12:00`).getTime() - new Date(`${from}T12:00`).getTime()) / 86_400_000) + 1;
  if (from === dayKey(now)) {
    const next = startPause(s, 'away', days, from);
    return next === s ? { state: s, result: 'cap' } : { state: next, result: 'ok' };
  }
  const end = pauseEnd(s, from, days);
  if (!end) return { state: s, result: 'cap' };
  return { state: { ...s, pauses: [...(s.pauses ?? []), { from, to: end, kind: 'away' }] }, result: 'ok' };
}

export const julfridPause = (s: State, now: Date = new Date()) => julfridPlan(s, now).state;
