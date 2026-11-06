// This weekend in Stockholm: upcoming events from Visit Stockholm's open API (keyless, CC BY 4.0, credit
// "Visit Stockholm / Stockholm Business Region"), in the categories the owner picked. The API filters by
// category and by dates that overlap (date_from/date_to); which weekend days an event is actually on is worked
// out here from its schedule: dated shows (`schedule.dates`, with times) or a run (`schedule.range`, minus its
// `excluded` days, no times). Pages repeat events now and then, so they're kept once by id. Pure apart from
// the fetch (getJson), so logic-test checks the parsing and the picks offline.
import { dayKey, pad, WEEKDAYS } from './dates';
import { getJson } from './http';
import type { State } from './types';

/** Visit Stockholm's 15 top-level categories (from the API's own `meta.categories`, Nov 2026). */
export const EVENT_CATEGORIES = [
  { slug: 'music', label: 'Music' },
  { slug: 'stage-film', label: 'Stage & Film' },
  { slug: 'exhibitions', label: 'Exhibitions' },
  { slug: 'eat-drink', label: 'Eat & Drink' },
  { slug: 'clubs-parties', label: 'Clubs & Parties' },
  { slug: 'festivals', label: 'Festivals' },
  { slug: 'fairs', label: 'Fairs & Markets' },
  { slug: 'family', label: 'Family' },
  { slug: 'sports', label: 'Sports & Wellbeing' },
  { slug: 'guided-tours', label: 'Guided tours & Lectures' },
  { slug: 'science-tech', label: 'Science & Tech' },
  { slug: 'gaming-boardgames', label: 'Gaming & Boardgames' },
  { slug: 'networking-community', label: 'Networking & Community' },
  { slug: 'careers-leadership', label: 'Careers & Leadership' },
  { slug: 'christmas-new-years-eve', label: "Christmas & New Year's" },
] as const;
export const EVENT_SLUGS: readonly string[] = EVENT_CATEGORIES.map((x) => x.slug);

export const VISIT_CREDIT = 'Visit Stockholm / Stockholm Business Region';
export const EVENTS_API = 'https://api.visitstockholm.com/api/public-v1/events/';
/** A fetched weekend stays good this long: the listings change slowly, so the API is asked a few times a day at most. */
export const EVENTS_TTL_MS = 4 * 3_600_000;
/** 16 events a page; a weekend in two or three categories is 5–8 pages. More than this isn't read. */
export const EVENTS_MAX_PAGES = 20;
/** After a failed fetch: 15, 30, then 60 minutes. */
export const eventsRetryMs = (fails: number) => Math.min(60, 15 * 2 ** Math.max(0, fails - 1)) * 60_000;

/** One showing on a weekend day: a time for dated shows, none for a run (an exhibition is open, not "at"). */
export type WeekendSlot = { day: string; time: string | null };
/**
 * `rank`: 0 a show on a few days (a concert, a festival night), 1 a show that runs for weeks, 2 a run of a few
 * days, 3 a long run (an exhibition). Lower ranks are picked first.
 */
export type WeekendEvent = { id: string; title: string; url: string | null; venue: string | null; station: string | null; cats: string[]; rank: 0 | 1 | 2 | 3; slots: WeekendSlot[] };

type RawDate = { date?: string; start_time?: string | null };
export type RawEvent = {
  id?: string;
  title?: { en?: string | null; sv?: string | null } | null;
  external_website_url?: string | null;
  venue_name?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  start_time?: string | null;
  categories?: { slug?: string }[] | null;
  schedule?: { range?: { start?: string; end?: string; excluded?: (string | { date?: string })[] | null } | null; dates?: RawDate[] | null } | null;
  closest_station?: string | null;
};
export type RawPage = { count?: number; next?: number | string | null; results?: RawEvent[] };

const dayMs = 86_400_000;
const isDay = (x: unknown): x is string => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x);
const spanDays = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / dayMs);
const hhmm = (t: string | null | undefined) => {
  const m = t ? /^(\d{1,2}):(\d{2})/.exec(t) : null;
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : null;
};

/** The weekend the card is about, Thursday to Saturday: its Friday and its days (Friday to Sunday). Null other days. */
export function weekendOf(d: Date): { friday: string; days: string[] } | null {
  const dow = d.getDay();
  if (dow < 4) return null; // Sunday (the weekend is nearly over) to Wednesday
  const fri = new Date(d.getFullYear(), d.getMonth(), d.getDate() + (5 - dow), 12);
  const days = [0, 1, 2].map((i) => dayKey(new Date(fri.getFullYear(), fri.getMonth(), fri.getDate() + i, 12)));
  return { friday: days[0], days };
}

/** Basic HTML entities, which turn up in titles now and then. */
export const decodeEntities = (s: string) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

/**
 * The nearest station as Visit Stockholm gives it, tidied: "T-bana Blå: Kungsträdgården | Buss 65: …" →
 * "Kungsträdgården", "Kärrtorp Subway Station" → "Kärrtorp". Null when it's missing ("undefined" included).
 */
export function cleanStation(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let s = raw.split('|')[0].trim();
  s = s
    .replace(/^nearest (bus )?stop:\s*/i, '')
    .replace(/^t-bana(\s+\S+)?:\s*/i, '')
    .replace(/^t-bana\s+/i, '')
    .replace(/\s+(subway station|tunnelbana|t-bana)$/i, '')
    .replace(/\s*\(SL bus stop\)$/i, '')
    .trim();
  if (!s || /^(undefined|null)$/i.test(s)) return null;
  return s.length > 40 ? `${s.slice(0, 39).trimEnd()}…` : s;
}

/** The weekend days an event is on. A run's own `dates` are a weekday template, so a run goes by its range. */
export function slotsOf(e: RawEvent, days: string[]): WeekendSlot[] {
  const range = e.schedule?.range;
  if (range && isDay(range.start) && isDay(range.end)) {
    const off = new Set((range.excluded ?? []).map((x) => (typeof x === 'string' ? x : x?.date)));
    return days.filter((d) => d >= range.start! && d <= range.end! && !off.has(d)).map((day) => ({ day, time: null }));
  }
  const dates = e.schedule?.dates ?? [];
  if (dates.length) {
    const out = dates.filter((x) => isDay(x.date) && days.includes(x.date)).map((x) => ({ day: x.date as string, time: hhmm(x.start_time) }));
    return out.sort((a, b) => (a.day + (a.time ?? '')).localeCompare(b.day + (b.time ?? '')));
  }
  if (!isDay(e.start_date)) return [];
  const end = isDay(e.end_date) ? e.end_date : e.start_date;
  return days.filter((d) => d >= e.start_date! && d <= end).map((day) => ({ day, time: hhmm(e.start_time) }));
}

/** One API event, for the weekend: null when it isn't on any of the days or has no usable id or title. */
export function weekendEvent(e: RawEvent, days: string[]): WeekendEvent | null {
  const title = decodeEntities((e.title?.en || e.title?.sv || '').trim());
  if (!e.id || !title) return null;
  const slots = slotsOf(e, days);
  if (!slots.length) return null;
  const run = isDay(e.start_date) && isDay(e.end_date) ? spanDays(e.start_date, e.end_date) : 0;
  const isRange = !!e.schedule?.range;
  const rank = (isRange ? (run <= 7 ? 2 : 3) : run <= 7 ? 0 : 1) as WeekendEvent['rank'];
  const url = e.external_website_url && /^https?:\/\//i.test(e.external_website_url) ? e.external_website_url : null;
  return {
    id: e.id,
    title,
    url,
    venue: e.venue_name?.trim() ? decodeEntities(e.venue_name.trim()) : null,
    station: cleanStation(e.closest_station),
    cats: (e.categories ?? []).map((x) => x.slug).filter((x): x is string => !!x),
    rank,
    slots,
  };
}

/** A page of the events API: the weekend's events on it, and whether there's a next page. Throws if the format changed. */
export function parsePage(j: RawPage, days: string[]): { events: WeekendEvent[]; next: boolean } {
  if (!Array.isArray(j.results)) throw new Error('Visit Stockholm changed its events format');
  const events = j.results.map((e) => weekendEvent(e, days)).filter((x): x is WeekendEvent => !!x);
  return { events, next: j.next != null && j.next !== '' };
}

/** Where the cache for a weekend's fetch is keyed: the picked categories (any order) and the weekend's Friday. */
export const weekendKey = (cats: string[], friday: string) => `${[...cats].sort().join(',')}|${friday}`;

export function eventsUrl(cats: string[], days: string[], page: number, from = days[0]) {
  const q = cats.map((c) => `categories=${encodeURIComponent(c)}`).join('&');
  return `${EVENTS_API}?${q}&date_from=${from}&date_to=${days[days.length - 1]}&page=${page}`;
}

const getPage = (url: string) => getJson<RawPage>(url, 'Visit Stockholm', { timeoutMs: 15_000 });

/**
 * The weekend's events in the picked categories, every page up to EVENTS_MAX_PAGES. Any failed page fails the
 * fetch (the card keeps its last good list). `get` is the page fetcher (logic-test hands in its own).
 */
export async function fetchWeekend(cats: string[], days: string[], get: (url: string) => Promise<RawPage> = getPage, today = dayKey()): Promise<WeekendEvent[]> {
  const known = cats.filter((c) => EVENT_SLUGS.includes(c));
  if (!known.length) return [];
  // From today on (a Saturday doesn't need Friday's), and every page: the API sorts long runs ahead of the weekend's shows.
  const from = days.find((d) => d >= today) ?? days[days.length - 1];
  const byId = new Map<string, WeekendEvent>();
  for (let page = 1; page <= EVENTS_MAX_PAGES; page++) {
    const { events, next } = parsePage(await get(eventsUrl(known, days, page, from)), days);
    for (const e of events) if (!byId.has(e.id)) byId.set(e.id, e);
    if (!next) break;
  }
  return [...byId.values()];
}

/** The next showing still ahead: a timed one later today or another day; an untimed one today only before 16:00. */
export function nextSlot(e: WeekendEvent, now: Date): WeekendSlot | null {
  const today = dayKey(now);
  const clock = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  return e.slots.find((s) => s.day > today || (s.day === today && (s.time ? s.time > clock : now.getHours() < 16))) ?? null;
}

export type WeekendPick = { event: WeekendEvent; slot: WeekendSlot };

/**
 * The card's picks: shows before runs (rank), then the soonest. The first round takes one per picked category
 * (in the owner's order), so two categories both show up; the rest fill in by rank. A title is shown once.
 */
export function pickWeekend(events: WeekendEvent[], cats: string[], now: Date, n = 3): WeekendPick[] {
  const ahead = events
    .map((event) => ({ event, slot: nextSlot(event, now) }))
    .filter((x): x is WeekendPick => !!x.slot && x.event.cats.some((c) => cats.includes(c)))
    .sort(
      (a, b) =>
        a.event.rank - b.event.rank ||
        a.slot.day.localeCompare(b.slot.day) ||
        (a.slot.time ?? '99').localeCompare(b.slot.time ?? '99') ||
        a.event.title.localeCompare(b.event.title),
    );
  const out: WeekendPick[] = [];
  const titles = new Set<string>();
  const take = (x: WeekendPick) => {
    const t = x.event.title.toLowerCase();
    if (out.length >= n || titles.has(t) || out.some((y) => y.event.id === x.event.id)) return;
    titles.add(t);
    out.push(x);
  };
  for (const c of cats) {
    const first = ahead.find((x) => cats.find((k) => x.event.cats.includes(k)) === c && !titles.has(x.event.title.toLowerCase()));
    if (first) take(first);
  }
  for (const x of ahead) take(x);
  // Shown in time order, whatever order they were picked in.
  return out.sort((a, b) => (a.slot.day + (a.slot.time ?? '99')).localeCompare(b.slot.day + (b.slot.time ?? '99')));
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "Sat 7 Nov" (or "Today"). */
export function dayText(day: string, today?: string) {
  if (day === today) return 'Today';
  const d = new Date(`${day}T12:00`);
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** When, for the card: "Sat 7 Nov · 19:00", or a run's days ahead: "Fri–Sun" ("Sat" for one). */
export function whenText(p: WeekendPick, now: Date): string {
  const today = dayKey(now);
  if (p.slot.time) return `${dayText(p.slot.day, today)} · ${p.slot.time}`;
  const ahead = p.event.slots.filter((s) => s.day >= p.slot.day);
  const first = ahead[0]?.day ?? p.slot.day;
  const last = ahead[ahead.length - 1]?.day ?? p.slot.day;
  const short = (day: string) => (day === today ? 'Today' : WEEKDAYS[new Date(`${day}T12:00`).getDay()]);
  return first === last ? `${dayText(first, today)} · open` : `${short(first)}–${short(last)} · open`;
}

/** The task "Add to Plan" makes: the day (and time), the event and where. */
export function outingTask(p: WeekendPick): string {
  const where = p.event.venue ? ` @ ${p.event.venue}` : p.event.station ? ` (near ${p.event.station})` : '';
  return `${dayText(p.slot.day)}${p.slot.time ? ` ${p.slot.time}` : ''}: ${p.event.title}${where}`;
}

/** Already in the Plan for that day. */
export const planned = (s: Pick<State, 'sthlmOutings'>, id: string, day: string) => (s.sthlmOutings ?? []).some((o) => o.id === id && o.day === day);

/** The month's outings ("2026-11"): every event added to the Plan for a day in it. A total, never a run of weekends. */
export const outingsIn = (s: Pick<State, 'sthlmOutings'>, ym: string) => (s.sthlmOutings ?? []).filter((o) => o.day.startsWith(`${ym}-`)).length;
