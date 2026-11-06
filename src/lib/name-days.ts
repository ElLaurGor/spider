// Name days and flag days from the Swedish almanac (sholiday.faboul.se, keyless: the whole year in one JSON).
// Pure: the parsing and the lookups. Fetching and the per-year cache are in name-days-cache.ts.
import { pad } from './dates';

/** One year of the almanac, small enough to keep: "MM-DD" -> the day's names and its flag day, if any. */
export type YearNames = { year: number; days: Record<string, { names: string[]; flag?: string }> };

type Payload = { dagar?: { datum?: unknown; namnsdag?: unknown; flaggdag?: unknown }[] };

export const NAME_DAYS_URL = (year: number) => `https://sholiday.faboul.se/dagar/v2.1/${year}`;

/**
 * The API's year, kept as names and flag days by "MM-DD". Null unless it really is that year's almanac (every
 * day there, most of them with names): a half or odd answer shows nothing rather than wrong names.
 */
export function parseNameDays(json: unknown, year: number): YearNames | null {
  const list = (json as Payload | null)?.dagar;
  if (!Array.isArray(list)) return null;
  const days: YearNames['days'] = {};
  let named = 0;
  for (const d of list) {
    if (typeof d?.datum !== 'string' || !d.datum.startsWith(`${year}-`)) continue;
    const md = d.datum.slice(5, 10);
    const names = Array.isArray(d.namnsdag) ? d.namnsdag.filter((n): n is string => typeof n === 'string' && !!n.trim()).map((n) => n.trim()) : [];
    const flag = typeof d.flaggdag === 'string' && d.flaggdag.trim() ? d.flaggdag.trim() : undefined;
    if (names.length) named++;
    days[md] = flag ? { names, flag } : { names };
  }
  return Object.keys(days).length >= 365 && named >= 300 ? { year, days } : null;
}

const md = (key: string) => key.slice(5, 10);

/** A day's names and flag day ("2026-11-06" -> Gustav Adolf, Gustav Adolfsdagen), from that year's almanac. */
export function namesOn(data: YearNames | null, key: string) {
  if (!data || Number(key.slice(0, 4)) !== data.year) return null;
  const day = data.days[md(key)];
  return day && (day.names.length || day.flag) ? day : null;
}

/** HQ's line for a day: "Gustav Adolf · flag day (Gustav Adolfsdagen)". Null when the almanac isn't there. */
export function nameDayText(data: YearNames | null, key: string) {
  const day = namesOn(data, key);
  if (!day) return null;
  const names = day.names.join(', ');
  const flag = day.flag ? `flag day${day.flag.toLowerCase() === names.toLowerCase() ? '' : ` (${day.flag})`}` : '';
  return [names, flag].filter(Boolean).join(' · ');
}

const fold = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

/**
 * The "MM-DD" of a name's name day: the whole name as typed ("Gustav Adolf"), else its first name ("Anna
 * Svensson" is Anna), any case. Accents count only where nothing matches with them ("Ines" finds "Inés").
 */
export function nameDayOf(data: YearNames | null, name: string): string | null {
  if (!data) return null;
  const tries = [name.trim(), name.trim().split(/\s+/)[0]].filter(Boolean);
  for (const exact of [true, false]) {
    for (const t of tries) {
      const want = exact ? t.toLowerCase() : fold(t);
      for (const [day, v] of Object.entries(data.days)) {
        if (v.names.some((n) => (exact ? n.toLowerCase() : fold(n)) === want)) return day;
      }
    }
  }
  return null;
}

/** "08 Nov"-style label for an "MM-DD". */
export const mdLabel = (monthDay: string) => {
  const [m, d] = monthDay.split('-').map(Number);
  return new Date(2000, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

export const toMonthDay = (month: number, day: number) => `${pad(month)}-${pad(day)}`;
