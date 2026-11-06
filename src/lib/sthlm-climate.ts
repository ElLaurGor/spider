// Stockholm's weather since 1859, as city trivia: what a date usually averages and its records (HQ's weather
// row), a toast when yesterday set a record for its date, and how a month ran against normal (Wrapped).
// The table (sthlm-climate.json) is built offline by scripts/build-sthlm-climate.ts from SMHI's Stockholm
// Observatoriekullen series; at runtime only the latest months of the station still running there (98230) are
// fetched, to spot new records and to have each month's mean. About the city, never about the owner.
import { doyOf, joinObs, monthMeanOf, parseSmhiLatest, type ClimateTable, type DayObs } from './climate-table';
import { getJson } from './http';
import table from './sthlm-climate.json';
import type { NewRecord, SthlmClimate } from './types';

export const CLIMATE = table as ClimateTable;

/** Stockholm Observatoriekullen: the trivia only shows for a weather place within `NEAR_KM` of it. */
export const OBSERVATORY = { lat: 59.3417, lon: 18.0549 };
export const NEAR_KM = 40;
/** A reading beyond the old record by more than this is a glitch in SMHI's unchecked data, not a record. */
export const GLITCH_C = 8;

/** Records set after the table was built (NewRecord, kept in State.sthlmClimate) keep the trivia true. */
export type RecordKind = NewRecord['kind'];
export type Fact = { v: number; year: number };
export type DayFacts = { normal: number; warm: Fact | null; cold: Fact | null; hi: Fact | null; lo: Fact | null };
export type Broken = { kind: RecordKind; v: number; old: Fact };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "2026-11-06" → "6 Nov". */
export const dateLabel = (day: string) => `${Number(day.slice(8, 10))} ${MONTHS[Number(day.slice(5, 7)) - 1]}`;
const deg = (v: number) => `${v.toFixed(1)}°`;
const c = (tenths: number) => tenths / 10;

/** Whether a weather place is Stockholm (within NEAR_KM of the observatory). */
export function nearStockholm(place: { lat: number; lon: number } | null | undefined): boolean {
  if (!place) return false;
  const rad = Math.PI / 180;
  const dLat = (place.lat - OBSERVATORY.lat) * rad;
  const dLon = (place.lon - OBSERVATORY.lon) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(OBSERVATORY.lat * rad) * Math.cos(place.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a)) <= NEAR_KM;
}

const beats = (kind: RecordKind, v: number, old: number) => (kind === 'warm' || kind === 'hi' ? v > old : v < old);

/** A date's normal (°C) and records, with records set since the table was built (`extra`) taking over where they beat it. */
export function factsOn(day: string, extra: NewRecord[] = [], t: ClimateTable = CLIMATE): DayFacts {
  const i = doyOf(day);
  const fact = (v: number | null | undefined, y: number | null | undefined): Fact | null => (v == null || !y ? null : { v: c(v), year: y });
  const facts: DayFacts = {
    normal: c(t.mean[i]),
    warm: fact(t.warm[i], t.warmY[i]),
    cold: fact(t.cold[i], t.coldY[i]),
    hi: fact(t.hi[i], t.hiY[i]),
    lo: fact(t.lo[i], t.loY[i]),
  };
  for (const r of [...extra].sort((a, b) => (a.day < b.day ? -1 : 1))) {
    if (doyOf(r.day) !== i) continue;
    const old = facts[r.kind];
    if (!old || beats(r.kind, r.v, old.v)) facts[r.kind] = { v: r.v, year: Number(r.day.slice(0, 4)) };
  }
  return facts;
}

/** The records a day's readings broke (strictly: a tie isn't a new record), warm and cold means first. */
export function recordsBroken(o: DayObs, facts: DayFacts): Broken[] {
  const out: Broken[] = [];
  const check = (kind: RecordKind, v: number | undefined) => {
    const old = facts[kind];
    if (v == null || !old || !beats(kind, v, old.v) || Math.abs(v - old.v) > GLITCH_C) return;
    out.push({ kind, v, old });
  };
  check('warm', o.mean);
  check('cold', o.mean);
  check('hi', o.max);
  check('lo', o.min);
  return out;
}

/**
 * HQ's line for a date, a different fact on different days: "6 Nov usually averages 4.7° in Stockholm; the coldest
 * on record (since 1859) averaged -6.6° in 1869." Null for a date the table has nothing for (the shipped one has all).
 */
export function triviaLine(day: string, extra: NewRecord[] = [], t: ClimateTable = CLIMATE): string | null {
  const f = factsOn(day, extra, t);
  const d = dateLabel(day);
  const usual = `${d} usually averages ${deg(f.normal)} in Stockholm`;
  const pick = doyOf(day) % 3;
  if (pick === 2 && f.hi && f.lo) return `Stockholm's records for ${d} (since ${t.extremesFrom}): a high of ${deg(f.hi.v)} in ${f.hi.year} and a low of ${deg(f.lo.v)} in ${f.lo.year}.`;
  if (pick === 1 && f.cold) return `${usual}; the coldest on record (since ${t.from}) averaged ${deg(f.cold.v)} in ${f.cold.year}.`;
  return f.warm ? `${usual}; the warmest on record (since ${t.from}) averaged ${deg(f.warm.v)} in ${f.warm.year}.` : null;
}

/** The toast's sentence for a record yesterday ("Yesterday averaged 12.1°, the warmest 5 Nov in Stockholm since 1859 …"). */
export function recordText(day: string, b: Broken, t: ClimateTable = CLIMATE): string {
  const d = dateLabel(day);
  const was = `(the old record: ${deg(b.old.v)} in ${b.old.year})`;
  if (b.kind === 'warm') return `Yesterday averaged ${deg(b.v)}, the warmest ${d} in Stockholm since ${t.from} ${was}.`;
  if (b.kind === 'cold') return `Yesterday averaged ${deg(b.v)}, the coldest ${d} in Stockholm since ${t.from} ${was}.`;
  if (b.kind === 'hi') return `Yesterday reached ${deg(b.v)}, Stockholm's highest for ${d} since ${t.extremesFrom} ${was}.`;
  return `Yesterday fell to ${deg(b.v)}, Stockholm's lowest for ${d} since ${t.extremesFrom} ${was}.`;
}

/**
 * How a month ran against its 1991–2020 normal: "October ran 1.2° warm in Stockholm: 8.9° against a normal 7.7°."
 * Within 0.3° it ran close to normal; a month beyond its record since 1859 says so.
 */
export function monthLine(ym: string, mean: number, t: ClimateTable = CLIMATE): { delta: number; text: string } {
  const m = Number(ym.slice(5, 7)) - 1;
  const normal = c(t.months.mean[m]);
  const delta = Math.round((mean - normal) * 10) / 10;
  const name = MONTHS_LONG[m];
  const head =
    Math.abs(delta) < 0.3
      ? `${name} ran close to normal in Stockholm: ${deg(mean)} against ${deg(normal)}.`
      : `${name} ran ${Math.abs(delta).toFixed(1)}° ${delta > 0 ? 'warm' : 'cold'} in Stockholm: ${deg(mean)} against a normal ${deg(normal)}.`;
  const record = mean > c(t.months.warm[m]) ? ` The warmest ${name} since ${t.from}.` : mean < c(t.months.cold[m]) ? ` The coldest ${name} since ${t.from}.` : '';
  return { delta, text: head + record };
}

/** The finished months (before `today`'s) in a set of readings, with their means. */
export function monthMeans(obs: DayObs[], today: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const ym of new Set(obs.map((o) => o.day.slice(0, 7)))) {
    if (ym >= today.slice(0, 7)) continue;
    const mean = monthMeanOf(obs, ym);
    if (mean != null) out[ym] = mean;
  }
  return out;
}

const yesterdayOf = (today: string) => {
  const d = new Date(`${today}T12:00`);
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * Folds SMHI's latest readings into what the app keeps. Days after the table (and after the last check) with all
 * three readings are checked for records; new ones are kept. `toast`: the sentence for a record yesterday, once.
 * `fetchedDay` is set only once yesterday's readings are all in (until then the app asks again later).
 */
export function climateUpdate(prev: SthlmClimate | undefined, obs: DayObs[], today: string, t: ClimateTable = CLIMATE): { next: SthlmClimate; toast: string | null } {
  const yesterday = yesterdayOf(today);
  const records = [...(prev?.records ?? [])];
  let checked = prev?.checked ?? '';
  let toast: string | null = null;
  for (const o of [...obs].sort((a, b) => (a.day < b.day ? -1 : 1))) {
    if (o.day <= t.through || o.day <= checked || o.day >= today) continue;
    if (o.mean == null || o.max == null || o.min == null) continue;
    const broken = recordsBroken(o, factsOn(o.day, records, t));
    for (const b of broken) records.push({ day: o.day, kind: b.kind, v: b.v });
    if (o.day === yesterday && broken.length && prev?.toasted !== yesterday) toast = recordText(o.day, broken[0], t);
    checked = o.day;
  }
  const y = obs.find((o) => o.day === yesterday);
  const complete = !!y && y.mean != null && y.max != null && y.min != null;
  const months = Object.fromEntries(
    Object.entries({ ...prev?.months, ...monthMeans(obs, today) })
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .slice(-24),
  );
  const next: SthlmClimate = {
    ...prev,
    fetchedDay: complete ? today : prev?.fetchedDay,
    checked: checked || undefined,
    months,
    records: records.slice(-100),
    ...(toast ? { toasted: yesterday } : {}),
  };
  return { next, toast };
}

/** Whether the app should ask SMHI now: a Stockholm place, and yesterday's readings not in yet today. */
export const climateDue = (s: { fetchedDay?: string } | undefined, near: boolean, today: string) => near && s?.fetchedDay !== today;

const OBS_URL = (p: number) => `https://opendata-download-metobs.smhi.se/api/version/latest/parameter/${p}/station/98230/period/latest-months/data.json`;

/** The last four months at Stockholm Observatoriekullen A (98230): daily mean (2), min (19) and max (20). */
export async function fetchSthlmObs(): Promise<DayObs[]> {
  const get = (p: number) => getJson<{ value?: { ref?: string; value?: string }[] }>(OBS_URL(p), 'SMHI observations').then(parseSmhiLatest);
  const [mean, min, max] = await Promise.all([get(2), get(19), get(20)]);
  return joinObs(mean, max, min);
}
