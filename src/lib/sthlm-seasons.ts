// step 10: Stockholm's meteorological seasons by SMHI's definitions (climate-table.ts finds them in the daily means).
// The climate table carries every arrival since 1859, year by year; the app goes on from its last one with the same
// latest-months readings SthlmClimateSync already fetches. A new arrival is told once, when its run is complete
// (a toast, then a week in HQ's weather row), kept in State.sthlmSeasons, and shows in Wrapped's Stockholm slide.
// "Earliest spring since 1990; the median arrival is 16 March": city trivia, never about the owner.
import { mdOfOffset, seasonArrivals, seasonOffset, seasonYearOf, type Arrival, type ClimateTable, type DayObs, type Season } from './climate-table';
import { CLIMATE } from './sthlm-climate';
import type { SeasonSeen } from './types';

/** A new arrival is told only while its run ended at most this many days ago: one the app finds later is kept quietly. */
export const ANNOUNCE_DAYS = 10;
/** How long HQ's weather row mentions an arrival after it was told. */
export const ROW_DAYS = 7;
/** "The earliest since X" only when X is at least this many years back: anything closer is just an early year. */
export const SINCE_MIN_YEARS = 10;
const KEEP = 24;
const DAY_MS = 86_400_000;

export const SEASON_INFO: Record<Season, { name: string; emoji: string; rule: string }> = {
  spring: { name: 'spring', emoji: '🌱', rule: 'the first of 7 days averaging above 0°, from 15 February at the earliest' },
  summer: { name: 'summer', emoji: '☀️', rule: 'the first of 5 days averaging 10° or more' },
  autumn: { name: 'autumn', emoji: '🍂', rule: 'the first of 5 days averaging under 10°, from 1 August at the earliest' },
  winter: { name: 'winter', emoji: '❄️', rule: 'the first of 5 days averaging 0° or below' },
};

const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS = MONTHS_LONG.map((m) => m.slice(0, 3));
/** "11-20" (or a whole day key) → "20 November", or "20 Nov" when short. */
const mdLabel = (md: string, short = false) => `${Number(md.slice(-2))} ${(short ? MONTHS : MONTHS_LONG)[Number(md.slice(-5, -3)) - 1]}`;
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const noon = (key: string) => new Date(`${key}T12:00`).getTime();
const daysBetween = (from: string, to: string) => Math.round((noon(to) - noon(from)) / DAY_MS);

/**
 * Each season year's arrival (seasonOffset) for one season: the table's, then the app's own finds after it. null: it
 * never came that year (a winter that didn't). The table's last year isn't over yet, so a gap there isn't listed.
 */
export function seasonHistory(season: Season, seen: SeasonSeen[] = [], t: ClimateTable = CLIMATE): Map<number, number | null> {
  const out = new Map<number, number | null>();
  const col = t.seasons[season];
  col.forEach((v, i) => {
    if (v != null || i < col.length - 1) out.set(t.seasons.from + i, v);
  });
  for (const x of seen) if (x.season === season && out.get(seasonYearOf(x)) == null) out.set(seasonYearOf(x), seasonOffset(x));
  return out;
}

/** The median arrival over the years before `year` ('MM-DD'), and how many of those years it never came. */
export function medianBefore(season: Season, year: number, seen: SeasonSeen[] = [], t: ClimateTable = CLIMATE): { md: string; offset: number; never: number } | null {
  const before = [...seasonHistory(season, seen, t)].filter(([y]) => y < year);
  const came = before.map(([, v]) => v).filter((v): v is number => v != null).sort((a, b) => a - b);
  if (!came.length) return null;
  const mid = came.length % 2 ? came[(came.length - 1) / 2] : Math.round((came[came.length / 2 - 1] + came[came.length / 2]) / 2);
  return { md: mdOfOffset(mid), offset: mid, never: before.length - came.length };
}

/**
 * How an arrival compares with every year before it: "the earliest winter on record", "the earliest spring since
 * 1990", the latest ones the same way, else how far it is from the median. A winter that never came counts as
 * later than any.
 */
export function compareText(a: Pick<Arrival, 'season' | 'day'>, seen: SeasonSeen[] = [], t: ClimateTable = CLIMATE): string | null {
  const year = seasonYearOf(a);
  const x = seasonOffset(a);
  const name = SEASON_INFO[a.season].name;
  const before = [...seasonHistory(a.season, seen, t)].filter(([y]) => y < year).sort(([p], [q]) => p - q);
  const came = before.filter((e): e is [number, number] => e[1] != null);
  if (!came.length) return null;
  const since = before[0][0];
  if (came.every(([, v]) => v > x)) return `the earliest ${name} on record (since ${since})`;
  if (came.length === before.length && came.every(([, v]) => v < x)) return `the latest ${name} on record (since ${since})`;
  const early = came.filter(([, v]) => v <= x).at(-1)?.[0];
  if (early != null && year - early >= SINCE_MIN_YEARS) return `the earliest ${name} since ${early}`;
  const late = before.filter(([, v]) => v == null || v >= x).at(-1)?.[0];
  if (late != null && year - late >= SINCE_MIN_YEARS) return `the latest ${name} since ${late}`;
  const m = medianBefore(a.season, year, seen, t);
  if (!m) return null;
  const d = x - m.offset;
  return d === 0 ? 'right on the median' : `${Math.abs(d)} day${Math.abs(d) === 1 ? '' : 's'} ${d < 0 ? 'earlier' : 'later'} than the median`;
}

/**
 * The toast's sentence: "Meteorological winter arrived in Stockholm on 20 November (SMHI: the first of 5 days
 * averaging 0° or below). The earliest winter since 2010; the median arrival since 1859 is 3 December."
 */
export function seasonNews(a: Pick<Arrival, 'season' | 'day'>, seen: SeasonSeen[] = [], t: ClimateTable = CLIMATE): string {
  const info = SEASON_INFO[a.season];
  const head = `Meteorological ${info.name} arrived in Stockholm on ${mdLabel(a.day)} (SMHI: ${info.rule}).`;
  const cmp = compareText(a, seen, t);
  const m = medianBefore(a.season, seasonYearOf(a), seen, t);
  const median = m ? `the median arrival since ${t.seasons.from} is ${mdLabel(m.md)}` : '';
  const tail = [cmp, median].filter(Boolean).join('; ');
  return tail ? `${head} ${cap(tail)}.` : head;
}

/** HQ's weather row: "❄️ Winter arrived in Stockholm on 20 Nov: the earliest winter since 2010." */
export function seasonShort(a: Pick<Arrival, 'season' | 'day'>, seen: SeasonSeen[] = [], t: ClimateTable = CLIMATE): string {
  const info = SEASON_INFO[a.season];
  const cmp = compareText(a, seen, t);
  return `${info.emoji} ${cap(info.name)} arrived in Stockholm on ${mdLabel(a.day, true)}${cmp ? `: ${cmp}` : ''}.`;
}

/** Where the app goes on from: the latest arrival it knows, the table's or its own. */
export function seasonState(seen: SeasonSeen[] = [], t: ClimateTable = CLIMATE): { season: Season; day: string } | null {
  const own = [...seen].sort((p, q) => (p.day < q.day ? -1 : 1)).at(-1);
  const table = t.seasons.last;
  if (own && (!table || own.day > table.day)) return { season: own.season, day: own.day };
  return table;
}

/**
 * Folds SMHI's latest readings into the seasons the app knows: arrivals after the last known one (today's still
 * running mean left out). `news`: the ones to tell now, whose run ended within ANNOUNCE_DAYS; older finds are kept
 * quietly. Unchanged (the same array) when nothing new came.
 */
export function seasonsUpdate(seen: SeasonSeen[] | undefined, obs: DayObs[], today: string, now = Date.now(), t: ClimateTable = CLIMATE): { next: SeasonSeen[]; news: SeasonSeen[]; changed: boolean } {
  const prev = seen ?? [];
  const state = seasonState(prev, t);
  const found = state
    ? seasonArrivals(
        obs.filter((o) => o.day < today),
        state,
      )
    : [];
  if (!found.length) return { next: prev, news: [], changed: false };
  const added: SeasonSeen[] = found.map((a) => ({ ...a, at: now, told: daysBetween(a.known, today) <= ANNOUNCE_DAYS }));
  return { next: [...prev, ...added].slice(-KEEP), news: added.filter((x) => x.told), changed: true };
}

/** The arrival HQ's weather row mentions: one told within the last ROW_DAYS, the newest. */
export function seasonOnRow(seen: SeasonSeen[] | undefined, now = Date.now()): SeasonSeen | null {
  return [...(seen ?? [])].filter((x) => x.told && now - x.at < ROW_DAYS * DAY_MS).sort((p, q) => p.at - q.at).at(-1) ?? null;
}

/** Arrivals in a month ('YYYY-MM'), from the table and the app's finds, in date order: Wrapped's Stockholm slide. */
export function seasonsInMonth(ym: string, seen: SeasonSeen[] = [], t: ClimateTable = CLIMATE): Arrival[] {
  const out = new Map<string, Arrival>();
  const t0 = t.seasons;
  for (const season of ['spring', 'summer', 'autumn', 'winter'] as const) {
    t0[season].forEach((v, i) => {
      if (v == null) return;
      const day = `${t0.from + i + (v >= 366 ? 1 : 0)}-${mdOfOffset(v)}`;
      if (day.startsWith(`${ym}-`)) out.set(`${season}:${day}`, { season, day, known: day });
    });
  }
  for (const x of seen) if (x.day.startsWith(`${ym}-`)) out.set(`${x.season}:${x.day}`, { season: x.season, day: x.day, known: x.known });
  return [...out.values()].sort((p, q) => (p.day < q.day ? -1 : 1));
}

/** Wrapped's words for a month's arrivals: "Winter arrived on 20 Nov (the earliest winter since 2010)". */
export function monthSeasonsText(ym: string, seen: SeasonSeen[] = [], t: ClimateTable = CLIMATE): string | null {
  const list = seasonsInMonth(ym, seen, t);
  if (!list.length) return null;
  return list
    .map((a) => {
      const cmp = compareText(a, seen, t);
      return `${SEASON_INFO[a.season].emoji} ${cap(SEASON_INFO[a.season].name)} arrived on ${mdLabel(a.day, true)}${cmp ? ` (${cmp})` : ''}`;
    })
    .join(' · ');
}
