// Dated events: Halloween (the spider's own holiday), Lucia, the winter solstice and the Swedish
// year (Easter, Valborg, midsommar, nyår). Each brings a seasonal daily quest; Halloween dresses
// up the weekly boss and nyår turns it into the Old Year (quests.ts).
import { addDays } from './dates';
import type { LineKey } from './lines';
import { allSaintsDay, easterSunday, midsummerEve } from './swedish-days';

export type SeasonId = 'halloween' | 'lucia' | 'solstice' | 'easter' | 'valborg' | 'midsommar' | 'nyar';

type MonthDay = [month: number, day: number];
const fixed = (from: MonthDay, to: MonthDay) => () => [from, to] as [MonthDay, MonthDay];
const mdOf = (d: Date): MonthDay => [d.getMonth() + 1, d.getDate()];

type SeasonDef = {
  id: SeasonId;
  name: string;
  emoji: string;
  /** First and last day for a year; `from` after `to` wraps over New Year. */
  span: (year: number) => [MonthDay, MonthDay];
  about: string;
  line: LineKey;
};

const SEASONS: SeasonDef[] = [
  { id: 'halloween', name: 'Spooky season', emoji: '🎃', span: fixed([10, 24], [11, 1]), about: 'Seasonal quests and a haunted boss.', line: 'seasonHalloween' },
  { id: 'lucia', name: 'Lucia', emoji: '🕯️', span: fixed([12, 13], [12, 13]), about: 'Bring some light into the darkest month. Seasonal quest today.', line: 'seasonLucia' },
  { id: 'solstice', name: 'Winter solstice', emoji: '🌑', span: fixed([12, 21], [12, 21]), about: 'The darkest day. From tomorrow, the light comes back.', line: 'seasonSolstice' },
  {
    id: 'easter',
    name: 'Easter hunt',
    emoji: '🐣',
    span: (y) => [mdOf(addDays(easterSunday(y), -7)), mdOf(addDays(easterSunday(y), 1))], // Palm Sunday to Annandag påsk
    about: 'Five eggs are hidden around the app. 30 coins each, and something for finding all five.',
    line: 'seasonEaster',
  },
  { id: 'valborg', name: 'Valborg', emoji: '🔥', span: fixed([4, 30], [4, 30]), about: 'Bonfire night. Burn the tasks that have been rotting on your list.', line: 'seasonValborg' },
  {
    id: 'midsommar',
    name: 'Midsommar',
    emoji: '🌼',
    span: (y) => [mdOf(midsummerEve(y)), mdOf(addDays(midsummerEve(y), 1))],
    about: 'The lightest days of the year. Seasonal quest: get outside.',
    line: 'seasonMidsommar',
  },
  { id: 'nyar', name: 'Nyår', emoji: '🎆', span: fixed([12, 31], [1, 1]), about: 'This week the boss is the Old Year itself. Close it out.', line: 'seasonNyar' },
];

export type Season = Omit<SeasonDef, 'span'> & { lastDay: Date };

const md = ([month, day]: MonthDay) => month * 100 + day;

/** The season a date falls in, if any. */
export function seasonOn(date: Date | number = new Date()): Season | null {
  const d = new Date(date);
  const now = md(mdOf(d));
  for (const def of SEASONS) {
    const [from, to] = def.span(d.getFullYear());
    const wraps = md(from) > md(to);
    const inside = wraps ? now >= md(from) || now <= md(to) : now >= md(from) && now <= md(to);
    if (!inside) continue;
    const { span: _span, ...rest } = def;
    const endYear = wraps && now >= md(from) ? d.getFullYear() + 1 : d.getFullYear();
    return { ...rest, lastDay: new Date(endYear, to[0] - 1, to[1]) };
  }
  return null;
}

/** Alla helgons dag, a day of remembrance: HQ keeps the spooky-season jokes out of it (it can fall on Halloween). */
export function isAllSaintsDay(date: Date | number = new Date()) {
  const d = new Date(date);
  const a = allSaintsDay(d.getFullYear());
  return d.getMonth() === a.getMonth() && d.getDate() === a.getDate();
}

const SNOW = new Set([71, 73, 75, 77, 85, 86]); // WMO weather codes for snow

/** The winter a date belongs to ("2026" for 2026–27), so the first snow is announced once per winter. */
export const winterOf = (date: Date | number = new Date()) => {
  const d = new Date(date);
  return String(d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1);
};

export const isSnow = (code: number) => SNOW.has(code);
