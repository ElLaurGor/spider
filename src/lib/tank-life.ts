// What the terrarium's spider does and how its tank looks, from the app's state: the real day and night outside
// (Stockholm's sunrise and sunset), the owner's sleep window, a Web Focus session or the gaming timer, kind days
// (one cosy look for every reason, so the tank never says why), today's web, molting at level-ups, plants that
// grow with days and steps, the weather, the season, the worn pet and hat, and what was just logged (replayed the
// next time the tank is on screen). Pure, so the tests can run it; lib/terrarium-3d.ts acts it out.
// Never about the body, sleep length or quality, or amounts eaten: the spider's growth is its own.
import { worn } from './cosmetics';
import { logEvents } from './critters';
import { dayKey, HOUR, MIN } from './dates';
import { isAllSaintsDay, isSnow, seasonOn, winterOf } from './seasons';
import { dayOf } from './selectors';
import { toneOn } from './tone';
import type { State } from './types';
import { webParams } from './web-art';
import { weatherKey, type DayForecast } from './weather';
import { levelProgress } from './xp';

export const STOCKHOLM = { lat: 59.3293, lon: 18.0686 };

// ---------- day and night ----------

const rad = Math.PI / 180;
const JD_UNIX = 2440587.5; // the Julian day of 1970-01-01 00:00 UTC
const J2000 = 2451545.0;

/**
 * Sunrise and sunset (ms) on `date`'s day at `lat`/`lon` (east positive), from the sunrise equation: within a
 * couple of minutes, enough for a tank's light. The app's forecast has the exact times when it has a place; this
 * is the fallback. In polar day or night (never in Stockholm) the sun just rises at 00:00 or never sets.
 */
export function sunTimes(date: Date | number, lat = STOCKHOLM.lat, lon = STOCKHOLM.lon): { sunrise: number; sunset: number } {
  const noon = new Date(date);
  noon.setHours(12, 0, 0, 0);
  const n = Math.round(noon.getTime() / 86_400_000 + JD_UNIX - J2000 - lon / 360);
  const mean = n - lon / 360; // mean solar noon, days since J2000
  const m = (357.5291 + 0.98560028 * mean) % 360;
  const c = 1.9148 * Math.sin(m * rad) + 0.02 * Math.sin(2 * m * rad) + 0.0003 * Math.sin(3 * m * rad);
  const lambda = (m + c + 180 + 102.9372) % 360;
  const transit = J2000 + mean + 0.0053 * Math.sin(m * rad) - 0.0069 * Math.sin(2 * lambda * rad);
  const decl = Math.asin(Math.sin(lambda * rad) * Math.sin(23.4397 * rad));
  const cosW = (Math.sin(-0.833 * rad) - Math.sin(lat * rad) * Math.sin(decl)) / (Math.cos(lat * rad) * Math.cos(decl));
  const w = Math.acos(Math.max(-1, Math.min(1, cosW))) / rad;
  const ms = (j: number) => (j - JD_UNIX) * 86_400_000;
  return { sunrise: ms(transit - w / 360), sunset: ms(transit + w / 360) };
}

const smooth = (x: number) => {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
};

/** How light it is outside, 0 (night) to 1 (day), with dawn and dusk over `ramp` around sunrise and sunset. */
export function daylightAt(now: number, sunrise: number, sunset: number, ramp = 50 * MIN): number {
  const up = smooth((now - (sunrise - ramp / 2)) / ramp);
  const down = 1 - smooth((now - (sunset - ramp / 2)) / ramp);
  return Math.round(Math.max(0, Math.min(up, down)) * 100) / 100;
}

export type Lighting = {
  hemi: number; // the room's light
  sun: number; // the window's light (the moon's at night)
  warm: number; // 0 neutral … 1 warm and dim (cosy)
  lamp: number; // the heat lamp's strength; 0 = off (after dark)
  glow: number; // glow mushrooms and crystal: faint by day, lit up at night
  dusk: number; // 0 day … 1 night, for the room behind the glass
};

/** The tank's lights for how light it is outside (`day`, daylightAt) and whether it's a cosy day. */
export function lighting(day: number, cosy: boolean): Lighting {
  const hemi = 0.28 + 1.12 * day;
  const sun = 0.12 + 1.68 * day;
  const lamp = day > 0.25 ? (cosy ? 0.55 : 1) : 0;
  return { hemi: cosy ? hemi * 0.62 : hemi, sun: cosy ? sun * 0.45 : sun, warm: cosy ? 1 : 0, lamp, glow: Math.round((0.25 + 0.75 * (1 - day)) * 100) / 100, dusk: 1 - day };
}

// ---------- the owner's day ----------

/** Hours since midnight, with minutes. */
const hoursOf = (t: Date | number) => {
  const d = new Date(t);
  return d.getHours() + d.getMinutes() / 60;
};

/**
 * Whether the owner's sleep window is on at `now`: from bedtime (`sleepHour`) to the real wake time today (the
 * watch's, `wakeAt`) or, without one, `wakeHour`. A bedtime after midnight (say 01) starts the window then. Only
 * the clock: nothing here says how long or how well anyone slept.
 */
export function asleepAt(now: Date | number, o: { sleepHour: number; wakeHour: number; wakeAt?: number | null }): boolean {
  const h = hoursOf(now);
  const woke = o.wakeAt != null && dayKey(o.wakeAt) === dayKey(now) && o.wakeAt <= +new Date(now) ? hoursOf(o.wakeAt) : null;
  const wake = woke ?? o.wakeHour;
  const bed = o.sleepHour;
  const evening = bed >= 12 && h >= bed; // a bedtime before midnight
  const morning = bed >= 12 ? h < wake : h >= bed && h < wake; // until waking (from a bedtime after midnight, if that's when it is)
  return evening || morning;
}

/** The watch's wake time for today's night (its day log, or the health read), if there is one. */
export function wakeAtOf(s: State, key: string, nights?: { key: string; night: { wakeAt: number } | null }[] | null): number | null {
  return dayOf(s, key).wakeAt ?? nights?.find((n) => n.key === key)?.night?.wakeAt ?? null;
}

export type TankMode = 'wander' | 'focus' | 'game' | 'sleep' | 'storm' | 'cosy';

/**
 * What the spider is up to. A Web Focus session (still in its web) and the gaming timer (at the crystal) are
 * happening right now, so they come first; then the owner's sleep window (asleep on a thread), the Storm protocol
 * (calm in the hide), a kind day (cosy, by the moss at the front: the same for every reason) and otherwise its
 * usual wandering.
 */
export function tankMode(o: { focus: boolean; game: boolean; asleep: boolean; storm: boolean; kind: boolean }): TankMode {
  if (o.focus) return 'focus';
  if (o.game) return 'game';
  if (o.asleep) return 'sleep';
  if (o.storm) return 'storm';
  if (o.kind) return 'cosy';
  return 'wander';
}

// ---------- molting ----------

/** Within this share of a level's XP from the next one, the spider is in premolt. */
export const PREMOLT_SHARE = 0.1;
/** How much bigger each molt makes it, and after how many it stops growing (it has to fit the tank). */
export const MOLT_GROWTH = 0.03;
export const MOLT_GROWTH_MAX = 5;
/** Shed skins kept on show; the total is kept in State.molts. */
export const SKINS_SHOWN = 5;

export type MoltState = { level: number; toGo: number; premolt: boolean; due: boolean; molts: number };

/**
 * The spider's molts: premolt once the next level, a new one, is within PREMOLT_SHARE of its XP; a molt is due
 * once a level above the last one molted for has been reached (State.moltSeen). A molt never fails.
 */
export function moltState(s: State): MoltState {
  const { level, into, needed } = levelProgress(s.xp);
  const peak = Math.max(level, s.maxLevel ?? level);
  const toGo = needed - into;
  return { level, toGo, premolt: level >= peak && toGo <= Math.ceil(needed * PREMOLT_SHARE), due: (s.moltSeen ?? 1) < peak, molts: s.molts ?? 0 };
}

/** `s` after the tank acted out a molt: it has molted for the level reached, one more skin. */
export function withMolt(s: State): State {
  const m = moltState(s);
  if (!m.due) return s;
  return { ...s, moltSeen: Math.max(m.level, s.maxLevel ?? m.level), molts: m.molts + 1 };
}

/** The spider's size after `molts` molts (1 = as it came). */
export const sizeAfter = (molts: number) => 1 + MOLT_GROWTH * Math.min(Math.max(0, molts), MOLT_GROWTH_MAX);

// ---------- plants ----------

/** The pieces that grow: the moss bed, the fern and the glow mushrooms. */
export const PLANTS = ['rug', 'plant', 'fireplace'] as const;
export const GROW_DAYS = 28;
export const GROW_STEPS = 200_000;
/** How big a plant starts out. */
export const SPROUT = 0.3;

/**
 * How grown a plant is, 0–1, from the days since it went in (State.lairAt) and the watch steps walked since:
 * both lifetime totals. It never shrinks: what it reached is kept (State.lairGrowth). At 1 it blooms.
 */
export function plantGrowth(s: State, id: string, now = Date.now()): number {
  const at = s.lairAt?.[id] ?? now;
  const from = dayKey(at);
  const today = dayKey(now);
  let steps = 0;
  for (const [k, d] of Object.entries(s.days)) if (k >= from && k <= today) steps += d.steps ?? 0;
  const days = Math.max(0, (now - at) / 86_400_000);
  const grown = SPROUT + ((1 - SPROUT) / 2) * Math.min(1, days / GROW_DAYS) + ((1 - SPROUT) / 2) * Math.min(1, steps / GROW_STEPS);
  return Math.max(s.lairGrowth?.[id] ?? 0, Math.floor(grown * 100 + 1e-6) / 100);
}

/** Every plant in the tank and how grown it is. */
export function growthOf(s: State, now = Date.now()): Record<string, number> {
  const have = s.lair ?? [];
  return Object.fromEntries(PLANTS.filter((id) => have.includes(id)).map((id) => [id, plantGrowth(s, id, now)]));
}

/** Growth worth saving: a plant that grew at least `step` (or reached full size) since what's kept. */
export function grewSince(s: State, growth: Record<string, number>, step = 0.05): Record<string, number> | null {
  const kept = s.lairGrowth ?? {};
  const more = Object.entries(growth).filter(([id, g]) => g >= (kept[id] ?? 0) + step || (g >= 1 && (kept[id] ?? 0) < 1));
  return more.length ? Object.fromEntries(more) : null;
}

// ---------- today's web ----------

/** The corner web, from the day: radials (3 + a glass of water each), rings (habits and quests done), dew once sleep is logged, a bundle per finished task. */
export type WebSpec = { radials: number; rings: number; dew: number; bundles: number };
export const DEW_DROPS = 8;

export function webFor(s: State, key: string): WebSpec {
  const p = webParams(s, key);
  const d = dayOf(s, key);
  const slept = (d.sleepMin ?? 0) > 0 || d.sleepRating != null;
  return { radials: Math.min(16, 3 + d.water.length), rings: Math.min(8, p.rings - 1), dew: slept ? DEW_DROPS : 0, bundles: p.catches };
}

// ---------- weather in the glass ----------

export type TankWeather = { rain: boolean; frost: number; snowing: boolean; snowLid: boolean; sun: boolean };
export const NO_WEATHER: TankWeather = { rain: false, frost: 0, snowing: false, snowLid: false, sun: false };

/**
 * What today's weather does to the tank: rain runs down the glass, cold frosts its corners (more the colder it
 * is), the lid keeps snow once the winter's first snow fell (until March), a sunny day lays a sunbeam on the floor.
 */
export function tankWeather(day: DayForecast | null | undefined, o: { firstSnow?: string; now?: Date | number } = {}): TankWeather {
  const now = new Date(o.now ?? Date.now());
  const winter = [9, 10, 11, 0, 1, 2].includes(now.getMonth());
  const snowLid = winter && o.firstSnow === winterOf(now);
  if (!day) return { ...NO_WEATHER, snowLid };
  const key = weatherKey(day);
  const snowing = isSnow(day.code);
  const frost = key === 'weatherCold' ? Math.round(Math.max(snowing ? 0.5 : 0.25, Math.min(1, (4 - day.max) / 12)) * 100) / 100 : 0;
  return { rain: key === 'weatherRain', frost, snowing, snowLid: snowLid || (snowing && winter), sun: (key === 'weatherNice' || key === 'weatherHot') && day.sunshineMin >= 120 };
}

// ---------- the season ----------

export type Dressing = 'star' | 'candles' | 'sprig' | 'sparkles' | 'feathers' | 'embers' | 'pole' | 'pumpkin';

/** The tank's seasonal dressing on `date` (seasons.ts): free, temporary, looks only. Julfrid also snows the lid. */
export function dressingFor(date: Date | number = new Date()): { item: Dressing; snow?: boolean } | null {
  const season = seasonOn(date)?.id;
  if (season === 'advent' || season === 'solstice') return { item: 'star' };
  if (season === 'lucia') return { item: 'candles' };
  if (season === 'jul') return { item: 'sprig', snow: true };
  if (season === 'nyar') return { item: 'sparkles' };
  if (season === 'easter') return { item: 'feathers' };
  if (season === 'valborg') return { item: 'embers' };
  if (season === 'midsommar') return { item: 'pole' };
  if (season === 'halloween' && !isAllSaintsDay(date)) return { item: 'pumpkin' };
  return null;
}

// ---------- pets and hats ----------

/** How a pet fly moves in the tank: buzzing about, circling the lamp, drifting and glowing at night, hopping, trundling. */
export type PetMotion = 'buzz' | 'lamp' | 'glow' | 'hop' | 'trundle';

export const PET_MOTION: Record<string, PetMotion> = {
  house_fly: 'buzz',
  water_strider: 'hop',
  gym_gnat: 'buzz',
  mood_moth: 'lamp',
  checklist_cricket: 'hop',
  habit_hoverfly: 'buzz',
  weekend_wasp: 'buzz',
  dawn_mayfly: 'lamp',
  hydro_hornet: 'buzz',
  thunder_midge: 'buzz',
  zen_moth: 'lamp',
  focus_firefly: 'glow',
  moonlight_moth: 'lamp',
  stride_skipper: 'lamp',
  quest_dragonfly: 'buzz',
  iron_beetle: 'trundle',
  fossil_beetle: 'trundle',
  sleepy_lacewing: 'lamp',
  patience_damselfly: 'buzz',
  snow_flea: 'hop',
  sunbeam_dragonfly: 'buzz',
  ghost_gnat: 'glow',
  lucia_glowworm: 'glow',
  solstice_moth: 'lamp',
  golden_scarab: 'trundle',
  phantom_fly: 'glow',
};
export const petMotion = (fly: string): PetMotion => PET_MOTION[fly] ?? 'buzz';

export type HatShape = 'cap' | 'top' | 'crown' | 'grad' | 'pumpkin' | 'tomte' | 'beanie';
const HATS: Record<string, HatShape> = { cap: 'cap', top_hat: 'top', crown: 'crown', grad_cap: 'grad', pumpkin: 'pumpkin', tomte_hat: 'tomte' };
/** The worn hat as a shape on the spider's head; anything else gets a beanie. */
export const hatShape = (id: string): HatShape => HATS[id] ?? 'beanie';

// ---------- replaying what was just logged ----------

export type TankEventKind = 'water' | 'train' | 'task' | 'fly';
/** Something just logged, for the tank to act out: a glass mists the tank, training is shown off on the rocks, a task gets wrapped, a caught fly is pounced on. */
export type TankEvent = { id: string; kind: TankEventKind; at: number };
/** Events kept for the tank (non-persisted), at most this many and this old. */
export const TANK_QUEUE = 6;
export const TANK_EVENT_MS = 3 * HOUR;

const caught = (s: State) => Object.values(s.flies ?? {}).reduce((a, f) => a + f.count, 0);

/** What the tank should act out after a change: today's new glasses, training and tasks (one of each kind) and a fly caught. Food, body and photos never. */
export function tankEventsOf(prev: State, next: State, now = new Date()): TankEvent[] {
  const out: TankEvent[] = [];
  const t = now.getTime();
  const add = (kind: TankEventKind, key: string) => {
    if (!out.some((e) => e.kind === kind)) out.push({ id: `${kind}:${key}:${t}`, kind, at: t });
  };
  for (const e of logEvents(prev, next, now)) {
    if (e.kind === 'water') add('water', e.key);
    else if (e.kind === 'set' || e.kind === 'activity') add('train', e.key);
    else if (e.kind === 'task') add('task', e.key);
  }
  if (prev.pendingFly && !next.pendingFly && caught(next) > caught(prev)) add('fly', prev.pendingFly.id);
  return out;
}

/** The tank's queue with `events` added: the newest TANK_QUEUE, none older than TANK_EVENT_MS. */
export function withTankEvents(queue: TankEvent[], events: TankEvent[], now = Date.now()): TankEvent[] {
  return [...queue, ...events].filter((e) => now - e.at <= TANK_EVENT_MS).slice(-TANK_QUEUE);
}

// ---------- snapshots ----------

export type TankSnap = { month: string; uri: string; label: string };
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * The tank's monthly snapshots for a Wrapped: a month ('YYYY-MM') shows its own; a year ('YYYY') its first and
 * its last ("your tank in January vs December"), or the one it has.
 */
export function tankSnapsFor(s: State, period: string): TankSnap[] {
  const all = Object.entries(s.tankSnaps ?? {})
    .filter(([m]) => m.startsWith(period))
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([month, uri]) => ({ month, uri, label: MONTHS[Number(month.slice(5, 7)) - 1] ?? month }));
  return all.length > 2 ? [all[0], all[all.length - 1]] : all;
}

// ---------- all of it ----------

export type TankLife = {
  mode: TankMode;
  daylight: number;
  light: Lighting;
  web: WebSpec;
  premolt: boolean;
  molt: boolean; // a molt is due: act it out
  molts: number;
  growth: Record<string, number>;
  weather: TankWeather;
  dressing: Dressing | null;
  pet: { fly: string; motion: PetMotion } | null;
  hat: { id: string; shape: HatShape } | null;
  fly: boolean; // a fly is buzzing around, catchable
  spiderlings: number;
  eggs: number;
};

/** The tank before it knows anything: daytime, wandering, a bare web. */
export const IDLE_LIFE: TankLife = {
  mode: 'wander',
  daylight: 1,
  light: lighting(1, false),
  web: { radials: 7, rings: 4, dew: 0, bundles: 0 },
  premolt: false,
  molt: false,
  molts: 0,
  growth: {},
  weather: NO_WEATHER,
  dressing: null,
  pet: null,
  hat: null,
  fly: false,
  spiderlings: 0,
  eggs: 0,
};

export type TankInputs = {
  now: number;
  forecast?: DayForecast | null; // today's, from the weather side state
  nights?: { key: string; night: { wakeAt: number } | null }[] | null; // the health read's nights
};

/** Everything the tank shows at `now`. */
export function tankLifeOf(s: State, o: TankInputs): TankLife {
  const now = new Date(o.now);
  const key = dayKey(now);
  const forecast = o.forecast && o.forecast.date === key ? o.forecast : null;
  const place = s.settings.weather;
  const sun = forecast ?? sunTimes(now, place?.lat, place?.lon);
  const daylight = daylightAt(o.now, sun.sunrise, sun.sunset);
  const tone = toneOn(s, key, now);
  const focus = !!s.activeFocus && o.now < s.activeFocus.start + s.activeFocus.minutes * MIN;
  const asleep = asleepAt(now, { sleepHour: s.settings.sleepHour, wakeHour: s.settings.wakeHour, wakeAt: wakeAtOf(s, key, o.nights) });
  const mode = tankMode({ focus, game: !!s.activeGame, asleep, storm: !!tone.storm, kind: tone.kind });
  const cosy = tone.kind; // the same warm light whatever made the day kind
  const m = moltState(s);
  const w = worn(s);
  const season = dressingFor(now);
  const weather = tankWeather(forecast, { firstSnow: s.firstSnow, now });
  return {
    mode,
    daylight,
    light: lighting(daylight, cosy),
    web: webFor(s, key),
    premolt: m.premolt,
    molt: m.due,
    molts: m.molts,
    growth: growthOf(s, o.now),
    weather: season?.snow ? { ...weather, snowLid: true } : weather,
    dressing: season?.item ?? null,
    pet: w.pet?.fly ? { fly: w.pet.fly, motion: petMotion(w.pet.fly) } : null,
    hat: w.hat ? { id: w.hat.id, shape: hatShape(w.hat.id) } : null,
    fly: !!s.pendingFly && s.pendingFly.until > o.now,
    spiderlings: Math.min(3, (s.spiderlings ?? []).length),
    eggs: Math.min(3, (s.eggSacs ?? []).length),
  };
}
