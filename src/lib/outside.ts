// Pollen, air quality and UV (Open-Meteo / CAMS), SMHI weather warnings and VMA
// (Krisinformation.se). All free, no API keys. Warnings are matched on the county
// ("Stockholms län") that comes with the weather location.
import { dayKey, fmtTime, WEEKDAYS } from './dates';
import { getJson } from './http';
import type { Place } from './weather';

export type PollenType = 'alder' | 'birch' | 'grass' | 'mugwort' | 'ragweed';

export const POLLEN: { type: PollenType; label: string; emoji: string; moderate: number; high: number }[] = [
  { type: 'alder', label: 'Al (alder)', emoji: '🌳', moderate: 10, high: 100 },
  { type: 'birch', label: 'Björk (birch)', emoji: '🌳', moderate: 10, high: 100 },
  { type: 'grass', label: 'Gräs (grass)', emoji: '🌾', moderate: 10, high: 50 },
  { type: 'mugwort', label: 'Gråbo (mugwort)', emoji: '🌿', moderate: 10, high: 30 },
  { type: 'ragweed', label: 'Ambrosia (ragweed)', emoji: '🌼', moderate: 5, high: 20 },
];
export const pollenInfo = (t: PollenType) => POLLEN.find((p) => p.type === t)!;

/** 0 none, 1 low, 2 moderate, 3 high. Levels are approximate (grains/m³). */
export function pollenLevel(type: PollenType, value: number) {
  const p = pollenInfo(type);
  return value >= p.high ? 3 : value >= p.moderate ? 2 : value >= 1 ? 1 : 0;
}
export const LEVEL_LABEL = ['none', 'low', 'moderate', 'high'] as const;

/** European AQI bands. */
export function aqiBand(aqi: number) {
  if (aqi < 20) return { label: 'good', color: '#33D17A' };
  if (aqi < 40) return { label: 'fair', color: '#9BE564' };
  if (aqi < 60) return { label: 'moderate', color: '#FFC53D' };
  if (aqi < 80) return { label: 'poor', color: '#FF8A3D' };
  if (aqi < 100) return { label: 'very poor', color: '#E23636' };
  return { label: 'extremely poor', color: '#9B2DFF' };
}

export type AirDay = { date: string; aqi: number; uv: number; pollen: Record<PollenType, number> };
export type Air = { aqi: number; pm25: number; pm10: number; uv: number; days: AirDay[]; fetchedAt: number };

const POLLEN_KEYS = POLLEN.map((p) => `${p.type}_pollen`).join(',');

export async function fetchAir(place: Place): Promise<Air> {
  const url =
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${place.lat}&longitude=${place.lon}` +
    `&current=european_aqi,pm2_5,pm10,uv_index&hourly=european_aqi,uv_index,${POLLEN_KEYS}&timezone=auto&forecast_days=3`;
  const j = await getJson<{
    current: { european_aqi: number | null; pm2_5: number | null; pm10: number | null; uv_index: number | null };
    hourly: Record<string, (number | null)[]> & { time: string[] };
  }>(url, 'Air quality');
  const byDay = new Map<string, number[]>();
  j.hourly.time.forEach((t, i) => {
    const date = t.slice(0, 10);
    byDay.set(date, [...(byDay.get(date) ?? []), i]);
  });
  const max = (key: string, idx: number[]) => Math.max(0, ...idx.map((i) => j.hourly[key]?.[i] ?? 0));
  return {
    aqi: Math.round(j.current.european_aqi ?? 0),
    pm25: j.current.pm2_5 ?? 0,
    pm10: j.current.pm10 ?? 0,
    uv: j.current.uv_index ?? 0,
    days: [...byDay.entries()].map(([date, idx]) => ({
      date,
      aqi: Math.round(max('european_aqi', idx)),
      uv: Math.round(max('uv_index', idx) * 10) / 10,
      pollen: Object.fromEntries(POLLEN.map((p) => [p.type, Math.round(max(`${p.type}_pollen`, idx))])) as Record<PollenType, number>,
    })),
    fetchedAt: Date.now(),
  };
}

export type AlertLevel = 'MESSAGE' | 'YELLOW' | 'ORANGE' | 'RED' | 'VMA';
export type Alert = {
  id: string;
  source: 'SMHI' | 'VMA';
  level: AlertLevel;
  title: string;
  text: string;
  start?: string;
  end?: string;
  updated?: string;
  url: string;
};

export const ALERT_COLOR: Record<AlertLevel, string> = { MESSAGE: '#3FA9FF', YELLOW: '#FFC53D', ORANGE: '#FF8A3D', RED: '#E23636', VMA: '#E23636' };
export const ALERT_LABEL: Record<AlertLevel, string> = { MESSAGE: 'Message', YELLOW: 'Yellow warning', ORANGE: 'Orange warning', RED: 'Red warning', VMA: 'VMA' };

type Lang = { sv?: string; en?: string };
const txt = (t?: Lang) => t?.en || t?.sv || '';

// SMHI's short link survived their site move (the old long path now 404s), so link to that.
export const SMHI_PAGE = 'https://www.smhi.se/varningar';

/**
 * SMHI impact-based warnings for one county (MESSAGE = information, then YELLOW/ORANGE/RED). Throws when SMHI
 * can't be reached or its format changed, so a failure never reads as "no warnings".
 */
export async function fetchSmhi(county: string): Promise<Alert[]> {
  const warnings = await getJson<
    {
      id: number;
      event: Lang & { code: string };
      warningAreas: {
        id: number;
        approximateStart?: string;
        approximateEnd?: string;
        published?: string;
        warningLevel: Lang & { code: AlertLevel };
        eventDescription?: Lang;
        affectedAreas: Lang[];
        descriptions?: { title: Lang & { code: string }; text: Lang }[];
      }[];
    }[]
  >('https://opendata-download-warnings.smhi.se/ibww/api/version/1/warning.json', 'SMHI');
  const out: Alert[] = [];
  for (const w of warnings) {
    for (const a of w.warningAreas) {
      if (!a.affectedAreas.some((x) => x.sv === county)) continue;
      const incident = a.descriptions?.find((d) => d.title.code === 'INCIDENT') ?? a.descriptions?.[0];
      out.push({
        id: `smhi-${w.id}-${a.id}`,
        source: 'SMHI',
        level: a.warningLevel.code,
        title: txt(a.eventDescription) || txt(w.event),
        text: txt(incident?.text),
        start: a.approximateStart,
        end: a.approximateEnd,
        updated: a.published,
        url: SMHI_PAGE,
      });
    }
  }
  const rank: Record<AlertLevel, number> = { VMA: 5, RED: 4, ORANGE: 3, YELLOW: 2, MESSAGE: 1 };
  return out.sort((a, b) => rank[b.level] - rank[a.level]);
}

/** "Stockholms stad", "Solna Kommun", "Stockholms kommun" → "stockholms" / "solna": the kommun however it's named. */
const kommunOf = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/\s+(kommun|stad)$/, '');

/**
 * Whether a VMA area is the owner's: the whole country, the county, or the municipality. The municipality comes
 * from the geocoder ("Stockholms stad" for Kista too), the town name is the fallback for places saved without it.
 */
export function isMine(a: { type?: string; description?: string }, county: string, town?: string, municipality?: string) {
  if (a.type === 'Country' || a.description === county) return true;
  if (!a.description) return false;
  if (municipality && kommunOf(a.description) === kommunOf(municipality)) return true;
  return !!town && a.description.toLowerCase().startsWith(town.toLowerCase());
}

/** Active VMAs (Viktigt meddelande till allmänheten) for the county, the municipality, or nationwide. */
export async function fetchVma(county: string, town?: string, municipality?: string): Promise<Alert[]> {
  const list = await getJson<
    {
      identifier: string;
      headline?: string;
      preamble?: string;
      bodyText?: string;
      published?: string;
      web?: string;
      area?: { type?: string; description?: string }[];
    }[]
  >('https://api.krisinformation.se/v3/vmas?format=json', 'Krisinformation');
  if (!Array.isArray(list)) throw new Error('Krisinformation changed format');
  // Municipal VMAs name the kommun ("Stockholms kommun", "Malmö kommun"), so match the town too.
  return list
    .filter((v) => !v.area?.length || v.area.some((a) => isMine(a, county, town, municipality)))
    .map((v) => ({
      id: `vma-${v.identifier}`,
      source: 'VMA' as const,
      level: 'VMA' as const,
      title: v.headline ?? 'Viktigt meddelande till allmänheten',
      text: v.preamble || v.bodyText || '',
      start: v.published,
      url: v.web || 'https://www.krisinformation.se',
    }));
}

/** The key an alert is remembered by once notified: an escalation (yellow to orange) is a new key, so it notifies again. */
export const alertKey = (a: Pick<Alert, 'id' | 'level'>) => `${a.id}:${a.level}`;

const SEEN_DAYS = 30;

/**
 * The alerts to notify about now (yellow and up, and every VMA, once per level) and the seen-list after
 * notifying them. Saves from before levels were part of the key hold bare ids: those count as seen at the
 * alert's current level. Entries go 30 days after an alert was last seen active. `changed` is false when
 * nothing needs saving.
 */
export function triageAlerts(list: Alert[], seen: Record<string, number>, now = Date.now()) {
  const next: Record<string, number> = {};
  for (const [k, t] of Object.entries(seen)) if (t > now - SEEN_DAYS * 86_400_000) next[k] = t;
  let changed = Object.keys(next).length !== Object.keys(seen).length;
  const fresh: Alert[] = [];
  for (const a of list) {
    const key = alertKey(a);
    if (next[key]) {
      if (next[key] < now - 20 * 86_400_000) {
        next[key] = now; // still active: don't let it expire and ping again
        changed = true;
      }
      continue;
    }
    if (next[a.id]) {
      next[key] = next[a.id];
      delete next[a.id];
      changed = true;
      continue;
    }
    if (a.level === 'MESSAGE') continue;
    fresh.push(a);
    next[key] = now;
    changed = true;
  }
  return { fresh, seen: next, changed };
}

/**
 * Two seen-lists in one, for the app and the background check (APK 1.5.0+) to share: the later time wins
 * (so triage's "still active" refresh carries over), and entries older than 30 days go.
 */
export function mergeSeen(a: Record<string, number>, b: Record<string, number>, now = Date.now()) {
  const out: Record<string, number> = {};
  for (const src of [a, b]) for (const [k, t] of Object.entries(src)) if (t > now - SEEN_DAYS * 86_400_000) out[k] = Math.max(out[k] ?? 0, t);
  return out;
}

const MONTHS =['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
const dayLabel = (d: Date) => `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
/** "20 Oct", in the phone's time zone. */
export const shortDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

/**
 * When an alert applies, in local time: "Sun 25 Oct 09:00–19:00", "Sat 24 Oct 22:00 – Sun 25 Oct 06:00",
 * "from Sun 25 Oct 09:00" (no end given) or "since 7 Jul" (already running, no end).
 */
export function alertWhen(a: Pick<Alert, 'start' | 'end'>, now = Date.now()): string {
  const start = a.start ? new Date(a.start) : null;
  const end = a.end ? new Date(a.end) : null;
  const valid = (d: Date | null): d is Date => !!d && !Number.isNaN(d.getTime());
  if (valid(start) && valid(end)) {
    return dayKey(start) === dayKey(end)
      ? `${dayLabel(start)} ${fmtTime(start)}–${fmtTime(end)}`
      : `${dayLabel(start)} ${fmtTime(start)} – ${dayLabel(end)} ${fmtTime(end)}`;
  }
  if (valid(start)) return start.getTime() > now ? `from ${dayLabel(start)} ${fmtTime(start)}` : `since ${start.getDate()} ${MONTHS[start.getMonth()]}`;
  if (valid(end)) return `until ${dayLabel(end)} ${fmtTime(end)}`;
  return '';
}

/** Alerts still worth showing: one whose end time SMHI gave has passed is dropped. */
export const activeAlerts = (list: Alert[], now = Date.now()) => list.filter((a) => !a.end || !(Date.parse(a.end) <= now));

/** Real warnings and VMAs, without SMHI's long-running messages (water shortage and the like). */
export const warningsOf = (list: Alert[]) => list.filter((a) => a.level !== 'MESSAGE');

/** Whether a source (SMHI, Krisinformation) could be reached: last try, last success, failures in a row since. */
export type SourceStatus = { at: number; okAt: number | null; fails: number };

export const sourceAfter = (prev: SourceStatus | null, ok: boolean, now = Date.now()): SourceStatus => ({
  at: now,
  okAt: ok ? now : (prev?.okAt ?? null),
  fails: ok ? 0 : (prev?.fails ?? 0) + 1,
});

/** A source counts as checked when its last try worked, within the hour. */
export const sourceOk = (st: SourceStatus | null, now = Date.now()) => !!st && st.fails === 0 && st.okAt != null && now - st.okAt < 60 * 60_000;

/**
 * What to say about a source that isn't plainly fine, or null when it is: still checking, unreachable
 * ("Couldn't reach SMHI · last good check 14:05") or not checked for over an hour.
 */
export function sourceNote(name: string, st: SourceStatus | null, now = Date.now()): string | null {
  if (!st) return `Checking ${name}…`;
  const when = (t: number) => (dayKey(t) === dayKey(now) ? fmtTime(t) : `${shortDate(new Date(t).toISOString())} ${fmtTime(t)}`);
  if (st.fails > 0) return `Couldn't reach ${name} · ${st.okAt != null ? `last good check ${when(st.okAt)}` : 'no good check yet'}`;
  if (st.okAt == null || now - st.okAt >= 60 * 60_000) return `${name} last checked ${st.okAt != null ? when(st.okAt) : 'a while ago'}`;
  return null;
}
