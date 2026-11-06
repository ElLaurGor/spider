// The per-day-of-year climate table behind Stockholm's "on this day" trivia (sthlm-climate.ts), built offline by
// scripts/build-sthlm-climate.ts from SMHI's daily series and checked by logic-test with a small fixture.
// Pure: no app imports, so the build script and the tests load it as it is.

/** One day's SMHI readings in °C: the daily mean (00–24 UTC) and the day's max and min (18–18 UTC, SMHI's own day). */
export type DayObs = { day: string; mean?: number; max?: number; min?: number };

/**
 * Tenths of a degree, indexed by day of the year in a leap-year calendar (0 = 1 Jan, 59 = 29 Feb, 365 = 31 Dec).
 * `mean`: the normal daily mean over `normal` (a fit of 6 yearly harmonics, so one odd year doesn't make a bump).
 * `warm`/`cold`: the warmest and coldest daily means since `from`; `hi`/`lo`: the highest max and lowest min since
 * `extremesFrom`. Each record has its year (the first year to reach it). `months`: the same for whole months.
 */
export type ClimateTable = {
  source: string;
  from: number;
  extremesFrom: number;
  through: string;
  normal: [number, number];
  mean: number[];
  warm: number[];
  warmY: number[];
  cold: number[];
  coldY: number[];
  hi: (number | null)[];
  hiY: (number | null)[];
  lo: (number | null)[];
  loY: (number | null)[];
  months: { mean: number[]; warm: number[]; warmY: number[]; cold: number[]; coldY: number[] };
};

const MONTH_DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MONTH_START = MONTH_DAYS.reduce<number[]>((acc, _n, i) => [...acc, i === 0 ? 0 : acc[i - 1] + MONTH_DAYS[i - 1]], []);

/** "2026-11-06" (or "11-06") → 310: its place in a leap year, so 29 Feb has a slot of its own. */
export function doyOf(day: string): number {
  const [m, d] = day.slice(-5).split('-').map(Number);
  return MONTH_START[m - 1] + d - 1;
}

/** Days in a month ("2026-02" → 28). */
export function daysInMonth(ym: string): number {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

const tenths = (c: number) => Math.round(c * 10);

/**
 * A month's mean of daily means, when at most `missing` days are missing (else null: a half month isn't the
 * month). Rounded to tenths of a degree.
 */
export function monthMeanOf(obs: DayObs[], ym: string, missing = 2): number | null {
  const vals = obs.filter((o) => o.day.startsWith(`${ym}-`) && o.mean != null).map((o) => o.mean as number);
  if (vals.length < daysInMonth(ym) - missing) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}

/**
 * The normal day-of-year curve: a mean plus `harmonics` yearly harmonics, fitted to the normal period's average for
 * each date. Each date counts once, so 29 February (one year in four) doesn't tilt the fit.
 */
function harmonicNormal(readings: { doy: number; v: number }[], harmonics: number): number[] {
  const sums = new Map<number, { sum: number; n: number }>();
  for (const r of readings) {
    const x = sums.get(r.doy) ?? { sum: 0, n: 0 };
    sums.set(r.doy, { sum: x.sum + r.v, n: x.n + 1 });
  }
  const points = [...sums].map(([doy, x]) => ({ doy, v: x.sum / x.n }));
  if (!points.length) return Array.from({ length: 366 }, () => 0);
  const w = (2 * Math.PI) / 366;
  const a0 = points.reduce((a, p) => a + p.v, 0) / points.length;
  const coef = Array.from({ length: harmonics }, (_, i) => {
    const k = i + 1;
    let a = 0;
    let b = 0;
    for (const p of points) {
      a += (p.v - a0) * Math.cos(k * w * p.doy);
      b += (p.v - a0) * Math.sin(k * w * p.doy);
    }
    return { k, a: (2 * a) / points.length, b: (2 * b) / points.length };
  });
  return Array.from({ length: 366 }, (_, t) => tenths(a0 + coef.reduce((s, c) => s + c.a * Math.cos(c.k * w * t) + c.b * Math.sin(c.k * w * t), 0)));
}

/**
 * Builds the table from daily readings (any order). Records keep the first year that reached them: a later tie
 * doesn't take it over. `normal` is the reference period for the averages (1991–2020, WMO's current normal).
 */
export function buildClimateTable(obs: DayObs[], opts: { source: string; normal?: [number, number]; harmonics?: number }): ClimateTable {
  const normal = opts.normal ?? [1991, 2020];
  const sorted = [...obs].sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
  const empty = () => Array.from({ length: 366 }, () => null as number | null);
  const warm = empty();
  const warmY = empty();
  const cold = empty();
  const coldY = empty();
  const hi = empty();
  const hiY = empty();
  const lo = empty();
  const loY = empty();
  const points: { doy: number; v: number }[] = [];
  let from = Infinity;
  let extremesFrom = Infinity;
  let through = '';
  for (const o of sorted) {
    const i = doyOf(o.day);
    const year = Number(o.day.slice(0, 4));
    if (o.mean != null) {
      const v = tenths(o.mean);
      from = Math.min(from, year);
      if (warm[i] == null || v > (warm[i] as number)) [warm[i], warmY[i]] = [v, year];
      if (cold[i] == null || v < (cold[i] as number)) [cold[i], coldY[i]] = [v, year];
      if (year >= normal[0] && year <= normal[1]) points.push({ doy: i, v: o.mean });
    }
    if (o.max != null) {
      const v = tenths(o.max);
      extremesFrom = Math.min(extremesFrom, year);
      if (hi[i] == null || v > (hi[i] as number)) [hi[i], hiY[i]] = [v, year];
    }
    if (o.min != null) {
      const v = tenths(o.min);
      extremesFrom = Math.min(extremesFrom, year);
      if (lo[i] == null || v < (lo[i] as number)) [lo[i], loY[i]] = [v, year];
    }
    if (o.mean != null || o.max != null || o.min != null) through = o.day;
  }

  // Whole months: the mean of daily means, for every month with at most 2 days missing.
  const yms = [...new Set(sorted.filter((o) => o.mean != null).map((o) => o.day.slice(0, 7)))];
  const byMonth = Array.from({ length: 12 }, () => ({ normal: [] as number[], warm: null as number | null, warmY: 0, cold: null as number | null, coldY: 0 }));
  const meansByYm = new Map<string, number[]>();
  for (const o of sorted) if (o.mean != null) meansByYm.set(o.day.slice(0, 7), [...(meansByYm.get(o.day.slice(0, 7)) ?? []), o.mean]);
  for (const ym of yms) {
    const vals = meansByYm.get(ym) ?? [];
    if (vals.length < daysInMonth(ym) - 2) continue;
    const m = Number(ym.slice(5, 7)) - 1;
    const year = Number(ym.slice(0, 4));
    const v = tenths(vals.reduce((a, b) => a + b, 0) / vals.length);
    const slot = byMonth[m];
    if (year >= normal[0] && year <= normal[1]) slot.normal.push(v);
    if (slot.warm == null || v > slot.warm) [slot.warm, slot.warmY] = [v, year];
    if (slot.cold == null || v < slot.cold) [slot.cold, slot.coldY] = [v, year];
  }

  const filled = (xs: (number | null)[]) => xs.map((x) => x ?? 0);
  return {
    source: opts.source,
    from: Number.isFinite(from) ? from : 0,
    extremesFrom: Number.isFinite(extremesFrom) ? extremesFrom : 0,
    through,
    normal,
    mean: harmonicNormal(points, opts.harmonics ?? 6),
    warm: filled(warm),
    warmY: filled(warmY),
    cold: filled(cold),
    coldY: filled(coldY),
    hi,
    hiY,
    lo,
    loY,
    months: {
      mean: byMonth.map((x) => (x.normal.length ? Math.round(x.normal.reduce((a, b) => a + b, 0) / x.normal.length) : 0)),
      warm: byMonth.map((x) => x.warm ?? 0),
      warmY: byMonth.map((x) => x.warmY),
      cold: byMonth.map((x) => x.cold ?? 0),
      coldY: byMonth.map((x) => x.coldY),
    },
  };
}

/** SMHI's corrected-archive CSV ("…;Representativt dygn;Lufttemperatur;Kvalitet…") as day → °C. */
export function parseSmhiCsv(csv: string): Map<string, number> {
  const out = new Map<string, number>();
  let started = false;
  for (const line of csv.split(/\r?\n/)) {
    const parts = line.split(';');
    if (!started) {
      started = parts[0].replace(/^﻿/, '').startsWith('Från Datum');
      continue;
    }
    const v = Number(parts[3]);
    if (parts.length >= 5 && /^\d{4}-\d{2}-\d{2}$/.test(parts[2]) && parts[3] !== '' && Number.isFinite(v)) out.set(parts[2], v);
  }
  return out;
}

/** SMHI's latest-months JSON (`value: [{ ref: "2026-11-05", value: "7.0" }]`) as day → °C. Throws if the format changed. */
export function parseSmhiLatest(j: { value?: { ref?: string; value?: string }[] | null }): Map<string, number> {
  if (!Array.isArray(j.value)) throw new Error('SMHI changed its observations format');
  const out = new Map<string, number>();
  for (const x of j.value) {
    const v = Number(x.value);
    if (x.ref && /^\d{4}-\d{2}-\d{2}$/.test(x.ref) && x.value != null && x.value !== '' && Number.isFinite(v)) out.set(x.ref, v);
  }
  return out;
}

/** Mean, max and min series joined by day, for days up to and including `until` (later rows are still running). */
export function joinObs(mean: Map<string, number>, max: Map<string, number>, min: Map<string, number>, until?: string): DayObs[] {
  const days = [...new Set([...mean.keys(), ...max.keys(), ...min.keys()])].filter((d) => !until || d <= until).sort();
  return days.map((day) => ({ day, mean: mean.get(day), max: max.get(day), min: min.get(day) }));
}
