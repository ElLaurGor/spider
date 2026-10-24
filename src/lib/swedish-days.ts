// The Swedish calendar: red days, the de facto days off (midsommarafton, julafton,
// nyårsafton), klämdagar and payday. Pure, so it's tested offline (logic-test.ts).
import { addDays, dayKey } from './dates';

export type Holiday = { key: string; name: string; red: boolean }; // red = an official public holiday

/** Easter Sunday (anonymous Gregorian algorithm). */
export function easterSunday(year: number) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day, 12);
}

/** The first `weekday` (0 = Sunday) on or after month/day. */
const firstOnOrAfter = (year: number, month: number, day: number, weekday: number) => {
  const d = new Date(year, month - 1, day, 12);
  return addDays(d, (weekday - d.getDay() + 7) % 7);
};

/** Midsommarafton: the Friday between 19 and 25 June. */
export const midsummerEve = (year: number) => firstOnOrAfter(year, 6, 19, 5);

/** Alla helgons dag: the Saturday between 31 October and 6 November. */
export const allSaintsDay = (year: number) => firstOnOrAfter(year, 10, 31, 6);

/** Första advent: the fourth Sunday before Christmas Day, between 27 November and 3 December. */
export const firstAdventSunday = (year: number) => firstOnOrAfter(year, 11, 27, 0);

/** When the Advent Web goes up: first Advent, or 1 December when first Advent comes later (2 or 3 Dec), since door 1 is the 1st. */
export function adventWebStart(year: number) {
  const first = firstAdventSunday(year);
  return first.getMonth() === 11 ? new Date(year, 11, 1, 12) : first;
}

/** Julfrid: julafton, juldagen and annandag jul (24–26 December), by day key. */
export const isJulfridKey = (key: string) => key.slice(5) >= '12-24' && key.slice(5) <= '12-26';

const cache = new Map<number, Holiday[]>();

/** Every red day and de facto day off of a year, in date order. */
export function holidaysOf(year: number): Holiday[] {
  const hit = cache.get(year);
  if (hit) return hit;
  const easter = easterSunday(year);
  const eve = midsummerEve(year);
  const on = (month: number, day: number) => new Date(year, month - 1, day, 12);
  const list: [Date, string, boolean][] = [
    [on(1, 1), 'Nyårsdagen', true],
    [on(1, 6), 'Trettondedag jul', true],
    [addDays(easter, -2), 'Långfredagen', true],
    [addDays(easter, -1), 'Påskafton', false],
    [easter, 'Påskdagen', true],
    [addDays(easter, 1), 'Annandag påsk', true],
    [on(5, 1), 'Första maj', true],
    [addDays(easter, 39), 'Kristi himmelsfärds dag', true],
    [addDays(easter, 49), 'Pingstdagen', true],
    [on(6, 6), 'Nationaldagen', true],
    [eve, 'Midsommarafton', false],
    [addDays(eve, 1), 'Midsommardagen', true],
    [allSaintsDay(year), 'Alla helgons dag', true],
    [on(12, 24), 'Julafton', false],
    [on(12, 25), 'Juldagen', true],
    [on(12, 26), 'Annandag jul', true],
    [on(12, 31), 'Nyårsafton', false],
  ];
  const result = list.map(([d, name, red]) => ({ key: dayKey(d), name, red })).sort((a, b) => (a.key < b.key ? -1 : 1));
  cache.set(year, result);
  return result;
}

/** The holiday on a date (red day or a de facto day off), if any. */
export function holidayOn(date: Date | number = new Date()): Holiday | null {
  const d = new Date(date);
  const key = dayKey(d);
  return holidaysOf(d.getFullYear()).find((h) => h.key === key) ?? null;
}

const weekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;

/** A weekend, a red day or a de facto day off. */
export const isDayOff = (date: Date | number) => weekend(new Date(date)) || holidayOn(date) != null;

/** A klämdag: a working day squeezed between two days off (the Friday after Kristi himmelsfärd, say). */
export function isKlamdag(date: Date | number) {
  const d = new Date(date);
  return !isDayOff(d) && isDayOff(addDays(d, -1)) && isDayOff(addDays(d, 1));
}

/** Payday: the 25th, or the last working day before it when the 25th is a day off. */
export function paydayOf(year: number, month: number) {
  let d = new Date(year, month - 1, 25, 12);
  while (isDayOff(d)) d = addDays(d, -1);
  return d;
}

export const isPayday = (date: Date | number = new Date()) => {
  const d = new Date(date);
  return dayKey(paydayOf(d.getFullYear(), d.getMonth() + 1)) === dayKey(d);
};

export type DayNote = { emoji: string; text: string; kind: 'holiday' | 'klamdag' | 'payday' };

/**
 * What's worth knowing about the next two weeks: today's holiday or payday, the next red day and
 * the next klämdag. Nearest first, at most three.
 */
export function upcomingDays(now: Date = new Date(), horizon = 14): DayNote[] {
  const notes: (DayNote & { in: number })[] = [];
  const when = (n: number, d: Date) => (n === 0 ? 'today' : n === 1 ? 'tomorrow' : `on ${d.toLocaleDateString('en-GB', { weekday: 'long' })}`);
  let holiday = false;
  let klam = false;
  for (let n = 0; n <= horizon; n++) {
    const d = addDays(now, n);
    const h = holidayOn(d);
    if (h && (n === 0 || !holiday)) {
      if (n > 0) holiday = true;
      notes.push({ in: n, kind: 'holiday', emoji: h.red ? '🇸🇪' : '🎉', text: n === 0 ? `${h.name} today${h.red ? ', a red day' : ''}.` : `${h.name} ${n > 6 ? `in ${n} days` : when(n, d)}.` });
    }
    if (!klam && n > 0 && isKlamdag(d)) {
      klam = true;
      notes.push({ in: n, kind: 'klamdag', emoji: '🌉', text: `Klämdag ${n > 6 ? `in ${n} days` : when(n, d)}. One day off buys a long weekend.` });
    }
  }
  if (isPayday(now)) notes.push({ in: 0, kind: 'payday', emoji: '💸', text: 'Payday. Spend it like a sensible spider.' });
  return notes.sort((a, b) => a.in - b.in).slice(0, 3).map(({ in: _in, ...n }) => n);
}
