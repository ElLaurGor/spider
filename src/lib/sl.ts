// SL departures for one stop, from SL's open APIs (no key, via Trafiklab): stop search (journey planner),
// live departures (Transport API) and disruptions (Deviations API). Parsing, filtering and the "leave in"
// maths are pure, so logic-test checks them offline; the fetchers go through getJson. SL gives departure
// times in local (Stockholm) time without an offset, which `new Date()` reads as local time.
import { pad } from './dates';
import { getJson } from './http';
import type { Settings } from './types';

/** The stop and lines the owner rides. `routes` like "17:1" (line 17, direction 1); empty means every line. */
export type SlConfig = NonNullable<Settings['sl']>;
export type SlStop = { siteId: number; name: string; area?: string };
export type SlDeparture = {
  line: string;
  lineId: number;
  mode: string; // METRO, BUS, TRAIN, TRAM, SHIP…
  direction: number;
  destination: string;
  scheduled: number;
  expected: number; // the realtime estimate when SL has one, else the timetable
  state: string;
  stopAreaId?: number;
};
export type SlDeviation = { id: string; importance: number; header: string; details: string; from: number; upto: number | null; lineIds: number[]; stopAreaIds: number[] };

/** Disruptions this important (SL's 1–9 scale) get a banner: delays, cancellations, replacement buses. */
export const SL_BANNER_LEVEL = 5;
/** How often the card may ask SL, at most: there's an unpublished quota (a few quick calls trip it). */
export const SL_POLL_MS = 60_000;
/** Disruptions change slowly: asked for every 5 minutes, not with every departures refresh. */
export const SL_DEVIATIONS_MS = 5 * 60_000;

// Departed or passed: not worth showing. Cancelled and the like: shown, so a missing bus isn't a mystery.
const GONE = new Set(['DEPARTED', 'PASSED', 'ASSUMEDDEPARTED']);
const CANCELLED = new Set(['CANCELLED', 'INHIBITED', 'MISSED', 'NOTCALLED', 'REPLACED']);
export const isCancelled = (d: Pick<SlDeparture, 'state'>) => CANCELLED.has(d.state);

/** The Transport API's site id inside the journey planner's global stop id ("9091001000009117" is site 9117). */
export function siteIdOf(globalId: string): number | null {
  const m = /^9091001(\d{9})$/.exec(globalId);
  return m ? Number(m[1]) : null;
}

type RawStopFinder = { locations?: { id?: string; type?: string; name?: string; disassembledName?: string; parent?: { name?: string } }[] };

/** Stops from a stop-finder answer, best match first, without duplicates. */
export function parseStops(j: RawStopFinder, max = 8): SlStop[] {
  const out: SlStop[] = [];
  for (const l of j.locations ?? []) {
    const siteId = l.type === 'stop' && l.id ? siteIdOf(l.id) : null;
    if (siteId == null || out.some((x) => x.siteId === siteId)) continue;
    out.push({ siteId, name: l.disassembledName || l.name || String(siteId), area: l.parent?.name });
    if (out.length >= max) break;
  }
  return out;
}

type RawDeparture = {
  destination?: string;
  direction_code?: number;
  state?: string;
  scheduled?: string;
  expected?: string;
  stop_area?: { id?: number };
  line?: { id?: number; designation?: string; transport_mode?: string };
};
type RawStopDeviation = { id?: number; importance_level?: number; message?: string; scope?: { stop_areas?: { id?: number }[]; lines?: { id?: number }[] } };
type RawDepartures = { departures?: RawDeparture[]; stop_deviations?: RawStopDeviation[] };

const timeOf = (s?: string) => (s ? new Date(s).getTime() : NaN);
const ids = (xs?: { id?: number }[]) => (xs ?? []).map((x) => x.id).filter((x): x is number => typeof x === 'number');

/** Departures (soonest first) and the stop's own notices from a departures answer. Unreadable rows are skipped. */
export function parseDepartures(j: RawDepartures): { departures: SlDeparture[]; stopDeviations: SlDeviation[] } {
  if (!Array.isArray(j.departures)) throw new Error('SL changed its departures format');
  const departures: SlDeparture[] = [];
  for (const d of j.departures) {
    const scheduled = timeOf(d.scheduled);
    const expected = timeOf(d.expected ?? d.scheduled);
    if (!d.line?.designation || typeof d.line.id !== 'number' || Number.isNaN(scheduled) || Number.isNaN(expected)) continue;
    departures.push({
      line: d.line.designation,
      lineId: d.line.id,
      mode: d.line.transport_mode ?? '',
      direction: d.direction_code ?? 0,
      destination: d.destination ?? '',
      scheduled,
      expected,
      state: d.state ?? 'EXPECTED',
      stopAreaId: d.stop_area?.id,
    });
  }
  departures.sort((a, b) => a.expected - b.expected);
  const stopDeviations = (j.stop_deviations ?? []).map(
    (x): SlDeviation => ({
      id: `stop-${x.id ?? x.message}`,
      importance: x.importance_level ?? 0,
      header: x.message ?? '',
      details: '',
      from: 0,
      upto: null,
      lineIds: ids(x.scope?.lines),
      stopAreaIds: ids(x.scope?.stop_areas),
    }),
  );
  return { departures, stopDeviations };
}

type RawDeviation = {
  deviation_case_id?: number;
  publish?: { from?: string; upto?: string };
  priority?: { importance_level?: number };
  message_variants?: { header?: string; details?: string; language?: string }[];
  scope?: { stop_areas?: { id?: number }[]; lines?: { id?: number }[] };
};

/** Disruptions from a deviations answer, in English when SL wrote one, else Swedish. */
export function parseDeviations(j: RawDeviation[]): SlDeviation[] {
  if (!Array.isArray(j)) throw new Error('SL changed its disruptions format');
  return j.map((x) => {
    const variants = x.message_variants ?? [];
    const v = variants.find((m) => m.language === 'en') ?? variants.find((m) => m.language === 'sv') ?? variants[0];
    const upto = timeOf(x.publish?.upto);
    return {
      id: `dev-${x.deviation_case_id}`,
      importance: x.priority?.importance_level ?? 0,
      header: v?.header ?? '',
      details: v?.details ?? '',
      from: timeOf(x.publish?.from) || 0,
      upto: Number.isNaN(upto) ? null : upto,
      lineIds: ids(x.scope?.lines),
      stopAreaIds: ids(x.scope?.stop_areas),
    };
  });
}

export const routeKey = (d: Pick<SlDeparture, 'line' | 'direction'>) => `${d.line}:${d.direction}`;

const MODE_ORDER = ['METRO', 'TRAIN', 'TRAM', 'BUS', 'SHIP'];
const lineNum = (line: string) => parseInt(line, 10) || 0;

/** Every line and direction at the stop, with where it goes ("17 → Åkeshov, Vällingby"), for picking in Settings. */
export function routesOf(deps: SlDeparture[]): { key: string; label: string; mode: string }[] {
  const by = new Map<string, { mode: string; line: string; dests: string[] }>();
  for (const d of deps) {
    const k = routeKey(d);
    const r = by.get(k) ?? { mode: d.mode, line: d.line, dests: [] };
    if (d.destination && !r.dests.includes(d.destination)) r.dests.push(d.destination);
    by.set(k, r);
  }
  const rank = (m: string) => (MODE_ORDER.includes(m) ? MODE_ORDER.indexOf(m) : MODE_ORDER.length);
  return [...by.entries()]
    .sort(([ka, a], [kb, b]) => rank(a.mode) - rank(b.mode) || lineNum(a.line) - lineNum(b.line) || a.line.localeCompare(b.line) || ka.localeCompare(kb))
    .map(([key, r]) => ({ key, mode: r.mode, label: `${r.line} → ${r.dests.slice(0, 2).join(', ') || '?'}` }));
}

/** Whole minutes until she has to walk out of the door for a departure (negative: it's too late). */
export const leaveInMin = (d: Pick<SlDeparture, 'expected'>, walkMin: number, now = Date.now()) => Math.floor((d.expected - now) / 60_000) - walkMin;

/** The next departures she can still make on her lines (cancelled ones included, so they're not a surprise). */
export function nextDepartures(deps: SlDeparture[], cfg: Pick<SlConfig, 'routes' | 'walkMin'>, now = Date.now(), n = 3): SlDeparture[] {
  return deps
    .filter((d) => !GONE.has(d.state) && (!cfg.routes.length || cfg.routes.includes(routeKey(d))) && leaveInMin(d, cfg.walkMin, now) >= 0)
    .sort((a, b) => a.expected - b.expected)
    .slice(0, n);
}

const hhmm = (t: number) => {
  const d = new Date(t);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** "Leave in 6 min for the 08:14 (line 17 → Åkeshov)", with the delay when SL expects one, or that it's cancelled. */
export function departureText(d: SlDeparture, walkMin: number, now = Date.now()): string {
  const what = `line ${d.line} → ${d.destination}`;
  if (isCancelled(d)) return `The ${hhmm(d.scheduled)} (${what}) is cancelled`;
  const leave = leaveInMin(d, walkMin, now);
  const late = Math.round((d.expected - d.scheduled) / 60_000);
  const delay = late >= 1 ? ` · ${late} min late` : '';
  return `${leave <= 0 ? 'Leave now' : `Leave in ${leave} min`} for the ${hhmm(d.expected)} (${what})${delay}`;
}

/** Without live times to go by: just what the timetable said, for "last known" rows. */
export const plannedText = (d: SlDeparture) => `${hhmm(d.scheduled)} line ${d.line} → ${d.destination}${isCancelled(d) ? ' (cancelled)' : ''}`;

/** Disruptions worth a banner: important, in effect now, and about one of her lines or her stop. Most important first. */
export function relevantDeviations(devs: SlDeviation[], lineIds: number[], stopAreaIds: number[], now = Date.now()): SlDeviation[] {
  const seen = new Set<string>();
  return devs
    .filter(
      (x) =>
        x.importance >= SL_BANNER_LEVEL &&
        !!x.header &&
        x.from <= now &&
        (x.upto == null || now <= x.upto) &&
        (x.lineIds.some((id) => lineIds.includes(id)) || x.stopAreaIds.some((id) => stopAreaIds.includes(id))),
    )
    .sort((a, b) => b.importance - a.importance)
    .filter((x) => !seen.has(x.header) && !!seen.add(x.header));
}

/** After a failed call, wait longer each time (2, 4, 8, then 15 minutes), so SL's quota recovers. */
export const slRetryMs = (fails: number) => (fails <= 0 ? SL_POLL_MS : Math.min(15, 2 ** fails) * 60_000);

export async function searchStops(q: string): Promise<SlStop[]> {
  const url = `https://journeyplanner.integration.sl.se/v2/stop-finder?name_sf=${encodeURIComponent(q.trim())}&any_obj_filter_sf=2&type_sf=any`;
  return parseStops(await getJson<RawStopFinder>(url, 'SL stop search'));
}

export async function fetchDepartures(siteId: number) {
  return parseDepartures(await getJson<RawDepartures>(`https://transport.integration.sl.se/v1/sites/${siteId}/departures?forecast=60`, 'SL departures'));
}

export async function fetchDeviations(lineIds: number[]): Promise<SlDeviation[]> {
  if (!lineIds.length) return [];
  const q = [...new Set(lineIds)].map((id) => `line=${id}`).join('&');
  return parseDeviations(await getJson<RawDeviation[]>(`https://deviations.integration.sl.se/v1/messages?${q}`, 'SL disruptions'));
}
