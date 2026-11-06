// Night expeditions: while the owner sleeps, the spider sometimes sneaks out of the terrarium. Two or three nights a
// week (seeded per week, never from how long or how well anyone sleeps) the tank is empty through her sleep window,
// with a note: "Out. Don't wait up." Once she's up it's back with a souvenir (seeded per night, some only in their
// months) and a two-line story built from the season and the night's real weather. On a kind night (a low mood,
// sick, Julfrid, the Storm protocol) it stays home and keeps her company. Souvenirs go on a small shelf in the tank
// (a few shown, the total kept). Looks only: no XP, no coins. Pure, so the tests can run it.
import { roll } from './critters';
import { addDays, atTime, dayKey, startOfWeek } from './dates';
import { dayLine, type LineKey } from './lines';
import { isSnow, seasonOn } from './seasons';
import { dayOf } from './selectors';
import { toneOn } from './tone';
import type { Souvenir, State, TripLog } from './types';
import type { DayForecast } from './weather';

const noon = (key: string) => new Date(`${key}T12:00`);
const next = (key: string) => dayKey(addDays(noon(key), 1));
const before = (key: string) => dayKey(addDays(noon(key), -1));

/** Shown on the tank's shelf, kept in State.trips.shelf, and mornings looked back on when the app wasn't opened. */
export const SHELF_SHOWN = 5;
export const SHELF_KEEP = 40;
export const TRIP_BACKFILL = 14;

export type SouvenirShape = 'card' | 'berry' | 'screw' | 'crumb' | 'pebble' | 'needle' | 'leaf' | 'coin' | 'cone' | 'feather';
export type SouvenirDef = { id: string; name: string; emoji: string; shape: SouvenirShape; color: string; months?: number[] };

/** What it can bring back; one with `months` only in those months (of the night out). Saved by id: add, never rename. */
export const SOUVENIRS: SouvenirDef[] = [
  { id: 'sl_ticket', name: 'an SL ticket', emoji: '🎫', shape: 'card', color: '#2f6fd6' },
  { id: 'ikea_screw', name: 'an IKEA screw', emoji: '🔩', shape: 'screw', color: '#a9b0b8' },
  { id: 'krona', name: 'a one-krona coin', emoji: '🪙', shape: 'coin', color: '#d9b45a' },
  { id: 'metro_map', name: 'a scrap of a tunnelbana map', emoji: '🗺️', shape: 'card', color: '#f2efe6' },
  { id: 'gull_feather', name: 'a gull feather', emoji: '🪶', shape: 'feather', color: '#eef2f5' },
  { id: 'lingonberry', name: 'a lingonberry', emoji: '🔴', shape: 'berry', color: '#c8102e', months: [8, 9, 10] },
  { id: 'conker', name: 'a conker', emoji: '🌰', shape: 'berry', color: '#6b3a1e', months: [9, 10] },
  { id: 'maple_leaf', name: 'a maple leaf', emoji: '🍁', shape: 'leaf', color: '#d9541e', months: [9, 10, 11] },
  { id: 'reflector', name: 'a lost reflector', emoji: '🔶', shape: 'coin', color: '#ff9f1a', months: [10, 11, 12, 1, 2] },
  { id: 'pine_needle', name: 'a pine needle', emoji: '🌲', shape: 'needle', color: '#2f5d36', months: [11, 12, 1, 2, 3] },
  { id: 'lucia_crumb', name: 'a Lucia-crown crumb', emoji: '🕯️', shape: 'crumb', color: '#f7e7a8', months: [12] },
  { id: 'pepparkaka', name: 'a pepparkaka corner', emoji: '🍪', shape: 'crumb', color: '#a0582a', months: [12] },
  { id: 'semla_crumb', name: 'a semla crumb', emoji: '🧁', shape: 'crumb', color: '#f4e3c3', months: [2, 3] },
  { id: 'birch_catkin', name: 'a birch catkin', emoji: '🌿', shape: 'needle', color: '#8a9a3a', months: [4, 5] },
  { id: 'wreath_petal', name: 'a petal off a midsommar wreath', emoji: '🌼', shape: 'leaf', color: '#ffd84a', months: [6] },
  { id: 'gotland_pebble', name: 'a Gotland pebble', emoji: '🪨', shape: 'pebble', color: '#d8d2c4', months: [5, 6, 7, 8, 9] },
  { id: 'crayfish_hat', name: 'a crayfish-party hat', emoji: '🦞', shape: 'cone', color: '#e0402a', months: [8] },
];
export const SOUVENIR_BY_ID: Record<string, SouvenirDef> = Object.fromEntries(SOUVENIRS.map((x) => [x.id, x]));

// ---------- when it goes out ----------

/** The two or three mornings of a week (its Monday) after which a night out is planned, before kind nights are left out. */
export function tripMornings(monday: string): string[] {
  const n = roll(`trips:${monday}`) < 0.5 ? 2 : 3;
  return Array.from({ length: 7 }, (_, i) => dayKey(addDays(noon(monday), i)))
    .map((d) => ({ d, r: roll(`trip:${d}`) }))
    .sort((a, b) => a.r - b.r)
    .slice(0, n)
    .map((x) => x.d)
    .sort();
}

/** A night out is planned for the night before `morning`. */
export const tripPlanned = (morning: string) => tripMornings(dayKey(startOfWeek(noon(morning)))).includes(morning);

/** The night before `morning` is a night out: planned, and neither that evening nor that morning is a kind day. */
export function tripOn(s: State, morning: string, now = new Date()): boolean {
  if (!tripPlanned(morning)) return false;
  return !toneOn(s, before(morning), now).kind && !toneOn(s, morning, now).kind;
}

/** The morning the night at `now` ends on: after noon it's tonight's (tomorrow morning), before noon this morning. */
export const morningOf = (now: Date | number) => (new Date(now).getHours() >= 12 ? dayKey(addDays(now, 1)) : dayKey(now));

/** When she's up on `morning`: the watch's wake time that day (the day log's, else `wakeAt`), else the usual wake hour. */
export function wakeOn(s: State, morning: string, wakeAt?: number | null): number {
  const watch = dayOf(s, morning).wakeAt ?? (wakeAt != null && dayKey(wakeAt) === morning ? wakeAt : null);
  return watch ?? atTime(noon(morning), 0, s.settings.wakeHour).getTime();
}

/** The night before `morning` is over at `now`: an earlier morning, or she's up. */
export function nightOver(s: State, morning: string, now: Date | number, wakeAt?: number | null): boolean {
  const today = dayKey(now);
  return morning < today || (morning === today && +new Date(now) >= wakeOn(s, morning, wakeAt));
}

/** The souvenir from the night before `morning`, seeded by it, from those that fit the night's month. */
export function souvenirFor(morning: string): SouvenirDef {
  const month = noon(before(morning)).getMonth() + 1;
  const fits = SOUVENIRS.filter((x) => !x.months || x.months.includes(month));
  return fits[Math.min(fits.length - 1, Math.floor(roll(`souvenir:${morning}`) * fits.length))];
}

// ---------- the story ----------

export type NightWeather = { t: number; code: number };

/** The night's weather: the morning's low and its weather code, from the forecast, else the weather logged for the morning or the evening before. */
export function nightWeather(s: State, morning: string, forecast?: DayForecast[] | null): NightWeather | null {
  const f = forecast?.find((d) => d.date === morning);
  if (f) return { t: f.min, code: f.code };
  const w = s.days[morning]?.weather ?? s.days[before(morning)]?.weather;
  return w ? { t: w.min, code: w.code } : null;
}

const FEAST: Partial<Record<string, string>> = { halloween: 'Halloween', advent: 'Advent', lucia: 'Lucia', solstice: 'midwinter', easter: 'Easter', valborg: 'Valborg', midsommar: 'midsommar', nyar: 'nyår' };
const RAIN = (code: number) => (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95;
/** "−3°", with a real minus sign. */
export const degrees = (t: number) => `${Math.round(t) < 0 ? '−' : ''}${Math.abs(Math.round(t))}°`;

/** Which pools tell the night: where it went (the season, or the holiday that evening) and what the weather did. */
export function storyKeys(morning: string, w: NightWeather | null): { where: LineKey; weather: LineKey; feast: string | null } {
  const evening = noon(before(morning));
  const feast = FEAST[seasonOn(evening)?.id ?? ''] ?? null;
  const m = evening.getMonth() + 1;
  const where: LineKey = feast ? 'tripFeast' : m === 12 || m <= 2 ? 'tripWinter' : m <= 5 ? 'tripSpring' : m <= 8 ? 'tripSummer' : 'tripAutumn';
  const weather: LineKey = !w ? 'tripNoWeather' : isSnow(w.code) ? 'tripSnow' : RAIN(w.code) ? 'tripRain' : w.code === 45 || w.code === 48 ? 'tripFog' : w.t <= 0 ? 'tripFrost' : w.t >= 12 ? 'tripWarm' : 'tripCalm';
  return { where, weather, feast };
}

/** The two-line story of a night out, the same every time it's told (seeded by the night). */
export function tripStory(x: Pick<Souvenir, 'night' | 'id' | 't' | 'code'>): [string, string] {
  const w = x.t != null && x.code != null ? { t: x.t, code: x.code } : null;
  const k = storyKeys(x.night, w);
  const vars = { title: SOUVENIR_BY_ID[x.id]?.name ?? 'a souvenir', day: k.feast ?? '', forecast: w ? degrees(w.t) : '' };
  return [dayLine(k.where, 1, x.night, 0, vars), dayLine(k.weather, 1, x.night, 0, vars)];
}

// ---------- the shelf ----------

const emptyLog = (today: string): TripLog => ({ since: today, shelf: [], total: 0 });

/** Nights out to collect at `now`: none looked at yet, or a morning since the last one is over. */
export function tripsDue(s: State, now = new Date(), wakeAt?: number | null): boolean {
  const today = dayKey(now);
  if (!s.trips) return true;
  const latest = nightOver(s, today, now, wakeAt) ? today : before(today);
  return (s.trips.checked ?? before(s.trips.since)) < latest;
}

/**
 * Mornings over since the last look (at most TRIP_BACKFILL back, none before the shelf began): each night out
 * leaves its souvenir on the shelf, with the night's weather kept for its story.
 */
export function settleTrips(s: State, now = new Date(), o: { wakeAt?: number | null; forecast?: DayForecast[] | null } = {}): { state: State; back: Souvenir[] } {
  const today = dayKey(now);
  const log = s.trips ?? emptyLog(today);
  const floor = dayKey(addDays(noon(today), -TRIP_BACKFILL));
  let d = log.checked ? next(log.checked) : log.since;
  if (d < floor) d = floor;
  let checked = log.checked;
  const back: Souvenir[] = [];
  for (; d <= today && nightOver(s, d, now, o.wakeAt); d = next(d)) {
    checked = d;
    if (!tripOn(s, d, now) || log.shelf.some((x) => x.night === d)) continue;
    const w = nightWeather(s, d, o.forecast);
    back.push({ night: d, id: souvenirFor(d).id, at: now.getTime(), t: w?.t ?? null, code: w?.code ?? null });
  }
  if (s.trips && checked === log.checked && !back.length) return { state: s, back };
  const trips: TripLog = { ...log, shelf: [...log.shelf, ...back].slice(-SHELF_KEEP), total: log.total + back.length };
  if (checked) trips.checked = checked;
  return { state: { ...s, trips }, back };
}

/** This morning's return, while it's still morning and she's up: the souvenir and its story. */
export function backThisMorning(s: State, now = new Date(), o: { wakeAt?: number | null; forecast?: DayForecast[] | null } = {}): { souvenir: SouvenirDef; story: [string, string] } | null {
  const today = dayKey(now);
  if (new Date(now).getHours() >= 12 || !nightOver(s, today, now, o.wakeAt) || !tripOn(s, today, now)) return null;
  const kept = s.trips?.shelf.find((x) => x.night === today);
  const w = kept ? null : nightWeather(s, today, o.forecast);
  const x = kept ?? { night: today, id: souvenirFor(today).id, t: w?.t ?? null, code: w?.code ?? null };
  return { souvenir: SOUVENIR_BY_ID[x.id] ?? souvenirFor(today), story: tripStory(x) };
}

/** The newest souvenirs, for the tank's shelf. */
export const shelfOf = (s: State) => (s.trips?.shelf ?? []).slice(-SHELF_SHOWN).flatMap((x) => (SOUVENIR_BY_ID[x.id] ? [SOUVENIR_BY_ID[x.id]] : []));
