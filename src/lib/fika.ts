// The fika almanac (step 8): Sweden's food days, computed per year. On the day HQ shows a banner (closed with ×,
// State.dismissed 'fika:<day>') and Fuel's quick add offers the day's food first. Nothing is ever logged by
// itself, and the lines tease skipping the tradition, never what or how much gets eaten.
// None of these days had anything before: the existing seasons (seasons.ts) don't cover any of them.
import { dayKey } from './dates';
import { isAllSaintsDay } from './seasons';
import { fettisdagen, surstrommingDay } from './swedish-days';

/**
 * A food for the quick-add chip: a portion with Livsmedelsverket's numbers per 100 g (`slv`: its number in the
 * food database, as fetched on 6 Nov 2026), or a name only (`kcal100` missing): the chip then fills in the
 * name and leaves the numbers to the owner.
 */
export type FikaFood = { name: string; grams?: number; slv?: number; kcal100?: number; protein100?: number };

export type FikaDay = { id: string; name: string; emoji: string; about: string; dateOf: (year: number) => Date; food?: FikaFood };

const on = (month: number, day: number) => (year: number) => new Date(year, month - 1, day, 12);

export const FIKA: FikaDay[] = [
  { id: 'knut', name: 'Tjugondag Knut', emoji: '🎄', about: 'Christmas gets danced out. The tree goes, and so do the last of the sweets on it.', dateOf: on(1, 13) },
  {
    id: 'semla',
    name: 'Fettisdagen',
    emoji: '🧁',
    about: 'Semla day, 47 days before Easter.',
    dateOf: fettisdagen,
    food: { name: 'Semla', grams: 100, slv: 1662, kcal100: 333, protein100: 5.4 },
  },
  { id: 'waffle', name: 'Våffeldagen', emoji: '🧇', about: 'Waffle day, on Lady Day (vårfrudagen, which sounds like våffeldagen).', dateOf: on(3, 25), food: { name: 'Våffla', grams: 50, slv: 736, kcal100: 254, protein100: 5.2 } },
  { id: 'chokladboll', name: 'Chokladbollens dag', emoji: '🍫', about: 'Chokladboll day. Rolled in coconut, or pärlsocker if you must.', dateOf: on(5, 11), food: { name: 'Chokladboll', grams: 30, slv: 1657, kcal100: 508, protein100: 4.9 } },
  { id: 'surstromming', name: 'Surströmmingspremiären', emoji: '🐟', about: 'The third Thursday in August: the season of the fermented herring opens. Outdoors is advised.', dateOf: surstrommingDay, food: { name: 'Surströmming', grams: 50, slv: 1297, kcal100: 82, protein100: 11.8 } },
  { id: 'kanelbulle', name: 'Kanelbullens dag', emoji: '🥐', about: 'Cinnamon bun day, since 1999.', dateOf: on(10, 4), food: { name: 'Kanelbulle', grams: 40, slv: 6758, kcal100: 345, protein100: 6.7 } },
  { id: 'gustavadolf', name: 'Gustav Adolfsdagen', emoji: '🎖️', about: 'A flag day, and the day of the Gustav Adolf pastry with his silhouette on top.', dateOf: on(11, 6), food: { name: 'Gustav Adolfsbakelse' } },
  { id: 'kladdkaka', name: 'Kladdkakans dag', emoji: '🍰', about: 'Kladdkaka day. Gooey in the middle is the point.', dateOf: on(11, 7), food: { name: 'Kladdkaka', grams: 60, slv: 3591, kcal100: 416, protein100: 4.6 } },
  { id: 'marten', name: 'Mårtensafton', emoji: '🪿', about: 'Goose dinner on the eve of Mårten, the Skåne way.', dateOf: on(11, 10), food: { name: 'Stekt gås', grams: 150, slv: 1184, kcal100: 324, protein100: 25.9 } },
  { id: 'pepparkaka', name: 'Pepparkakans dag', emoji: '🍪', about: 'Gingerbread day. Make a wish, press the middle.', dateOf: on(12, 9), food: { name: 'Pepparkakor', grams: 30, slv: 1624, kcal100: 453, protein100: 4.9 } },
];

/**
 * The fika day on a date, if any. Gustav Adolfsdagen gives way when Alla helgons dag falls on 6 November (2027,
 * say): a day of remembrance gets no pastry banner.
 */
export function fikaOn(date: Date | number | string): FikaDay | null {
  const d = typeof date === 'string' ? new Date(`${date}T12:00`) : new Date(date);
  const key = dayKey(d);
  const hit = FIKA.find((f) => dayKey(f.dateOf(d.getFullYear())) === key) ?? null;
  return hit && isAllSaintsDay(d) ? null : hit;
}

/** The quick-add numbers of a fika food: its portion from the per-100 g values, or null for a name-only one. */
export function fikaPortion(f: FikaFood): { name: string; kcal: number; protein: number } | null {
  if (f.kcal100 == null || f.grams == null) return null;
  return { name: `${f.name} (${f.grams} g)`, kcal: Math.round((f.kcal100 * f.grams) / 100), protein: Math.round(((f.protein100 ?? 0) * f.grams) / 100) };
}

/** HQ's banner key for a fika day: closed with ×, it stays closed for that day. */
export const fikaBannerKey = (key: string) => `fika:${key}`;
