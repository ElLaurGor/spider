// Weather from Open-Meteo: free, no API key, no account.
import { dayKey, fmtTime, HOUR } from './dates';
import { getJson } from './http';
import type { DayWeather } from './types';

/**
 * county e.g. "Stockholms län"; municipality the geocoder's admin2, e.g. "Stockholms stad" or "Solna Kommun"
 * ("" when the geocoder has none, so it isn't looked up again).
 */
export type Place = { name: string; lat: number; lon: number; county?: string; municipality?: string };

export type DayForecast = {
  date: string;
  max: number;
  min: number;
  rainPct: number;
  code: number;
  rainMm: number;
  sunrise: number; // ms
  sunset: number;
  daylightMin: number;
  sunshineMin: number;
};
export type RainSlot = { at: number; mm: number }; // 15-minute precipitation, next 4 hours
export type Weather = { temp: number; feels: number; code: number; days: DayForecast[]; soon: RainSlot[]; fetchedAt: number };

// Swedish names, so the county ("Stockholms län") matches SMHI and Krisinformation exactly.
export async function findPlace(query: string): Promise<Place | null> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?count=1&language=sv&format=json&name=${encodeURIComponent(query.trim())}`;
  const json = await getJson<{ results?: { name: string; country?: string; admin1?: string; admin2?: string; latitude: number; longitude: number }[] }>(
    url,
    'Geocoding',
  );
  const r = json.results?.[0];
  return r
    ? { name: r.country ? `${r.name}, ${r.country}` : r.name, lat: r.latitude, lon: r.longitude, county: r.admin1, municipality: r.admin2 ?? '' }
    : null;
}

/** Whether a place still needs its county or municipality looked up (saved before they were stored). */
export const needsPlaceInfo = (place: Place) => !place.county || place.municipality === undefined;

/** Places saved before counties and municipalities were stored: look them up once from the name. */
export async function withCounty(place: Place): Promise<Place> {
  if (!needsPlaceInfo(place)) return place;
  const found = await findPlace(place.name.split(',')[0]);
  if (!found) return place;
  return { ...place, county: place.county || found.county, municipality: place.municipality ?? found.municipality ?? '' };
}

/** The same place (a lookup's result must not land on a place picked in Settings in the meantime). */
export const samePlace = (a: Place | null | undefined, b: Place | null | undefined) => !!a && !!b && a.name === b.name && a.lat === b.lat && a.lon === b.lon;

/**
 * Open-Meteo's local times ("2026-10-25T07:49", no offset) as real instants. With timezone=auto the whole
 * response uses one UTC offset, today's, so reading them as the phone's local time puts every time after a
 * clock change an hour off (Sunday's sunrise would show 07:49 instead of 06:49).
 */
export function meteoTime(t: string, offsetSec: number | undefined) {
  if (offsetSec == null) return new Date(t).getTime();
  return Date.parse(`${t.length === 16 ? `${t}:00` : t}Z`) - offsetSec * 1000;
}

export async function fetchWeather(place: Place): Promise<Weather> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${place.lat}&longitude=${place.lon}` +
    '&current=temperature_2m,apparent_temperature,weather_code' +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,sunrise,sunset,daylight_duration,sunshine_duration' +
    '&minutely_15=precipitation&forecast_minutely_15=16' +
    '&timezone=auto&forecast_days=4';
  const j = await getJson<{
    utc_offset_seconds?: number;
    current: { temperature_2m: number; apparent_temperature: number; weather_code: number };
    daily: {
      time: string[];
      weather_code: number[];
      temperature_2m_max: number[];
      temperature_2m_min: number[];
      precipitation_probability_max: (number | null)[];
      precipitation_sum: (number | null)[];
      sunrise: string[];
      sunset: string[];
      daylight_duration: number[];
      sunshine_duration: (number | null)[];
    };
    minutely_15?: { time: string[]; precipitation: (number | null)[] };
  }>(url, 'Weather');
  return {
    temp: Math.round(j.current.temperature_2m),
    feels: Math.round(j.current.apparent_temperature),
    code: j.current.weather_code,
    days: j.daily.time.map((date, i) => ({
      date,
      max: Math.round(j.daily.temperature_2m_max[i]),
      min: Math.round(j.daily.temperature_2m_min[i]),
      rainPct: j.daily.precipitation_probability_max[i] ?? 0,
      code: j.daily.weather_code[i],
      rainMm: j.daily.precipitation_sum[i] ?? 0,
      // Local times without an offset, all at the response's one offset (see meteoTime).
      sunrise: meteoTime(j.daily.sunrise[i], j.utc_offset_seconds),
      sunset: meteoTime(j.daily.sunset[i], j.utc_offset_seconds),
      daylightMin: Math.round(j.daily.daylight_duration[i] / 60),
      sunshineMin: Math.round((j.daily.sunshine_duration[i] ?? 0) / 60),
    })),
    soon: (j.minutely_15?.time ?? []).map((t, i) => ({ at: meteoTime(t, j.utc_offset_seconds), mm: j.minutely_15?.precipitation[i] ?? 0 })),
    fetchedAt: Date.now(),
  };
}

/** " · updated 14:05" once fetched data is over an hour old (offline, or the app slept), so old numbers don't pass as now. */
export function staleNote(fetchedAt: number, now = Date.now()) {
  if (now - fetchedAt <= HOUR) return '';
  const d = new Date(fetchedAt);
  return ` · updated ${dayKey(d) === dayKey(now) ? '' : `${d.getDate()}/${d.getMonth() + 1} `}${fmtTime(d)}`;
}

/** WMO weather code → emoji + short label. */
export function describe(code: number): { emoji: string; label: string } {
  if (code === 0) return { emoji: '☀️', label: 'Clear' };
  if (code <= 2) return { emoji: '🌤️', label: 'Partly cloudy' };
  if (code === 3) return { emoji: '☁️', label: 'Cloudy' };
  if (code === 45 || code === 48) return { emoji: '🌫️', label: 'Fog' };
  if (code >= 51 && code <= 57) return { emoji: '🌦️', label: 'Drizzle' };
  if (code >= 61 && code <= 67) return { emoji: '🌧️', label: 'Rain' };
  if (code >= 71 && code <= 77) return { emoji: '❄️', label: 'Snow' };
  if (code >= 80 && code <= 82) return { emoji: '🌧️', label: 'Showers' };
  if (code === 85 || code === 86) return { emoji: '🌨️', label: 'Snow showers' };
  if (code >= 95) return { emoji: '⛈️', label: 'Thunderstorm' };
  return { emoji: '🌡️', label: 'Weather' };
}

export const dayWeatherOf = (d: DayForecast): DayWeather => ({ max: d.max, min: d.min, rainMm: d.rainMm, sunMin: d.sunshineMin, code: d.code });

/**
 * The biggest 24-hour fall in air pressure ending within each day (hPa, from hourly sea-level pressure), for the
 * symptom detective. A day without 24 h of earlier readings gets null.
 */
export function pressureDrops(times: string[], hPa: (number | null)[]): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  times.forEach((t, i) => {
    const day = t.slice(0, 10);
    const now = hPa[i];
    const before = i >= 24 ? hPa[i - 24] : null;
    const drop = now != null && before != null ? Math.round((before - now) * 10) / 10 : null;
    if (!(day in out)) out[day] = null;
    if (drop != null) out[day] = Math.max(out[day] ?? 0, drop);
  });
  return out;
}

/**
 * A stored day whose weather still needs fetching: never fetched, fetched before pressure was, or a blank
 * row (0°/0° and no weather code) saved when the forecast API stopped reaching that far back.
 */
export const weatherMissing = (w?: DayWeather) =>
  !w || w.pressureDrop === undefined || (w.code == null && w.max === 0 && w.min === 0 && !w.rainMm && !w.sunMin);

/**
 * Each day's weather over the last `days` days, for Insights. The historical-forecast API: the plain forecast
 * API now only keeps about 43 past days and returns the older ones as nulls.
 */
export async function fetchWeatherHistory(place: Place, days = 60): Promise<Record<string, DayWeather>> {
  const url =
    `https://historical-forecast-api.open-meteo.com/v1/forecast?latitude=${place.lat}&longitude=${place.lon}` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,sunshine_duration&hourly=pressure_msl` +
    `&past_days=${days}&forecast_days=1&timezone=auto`;
  const j = await getJson<{
    daily: {
      time: string[];
      weather_code: (number | null)[];
      temperature_2m_max: (number | null)[];
      temperature_2m_min: (number | null)[];
      precipitation_sum: (number | null)[];
      sunshine_duration: (number | null)[];
    };
    hourly?: { time: string[]; pressure_msl: (number | null)[] };
  }>(url, 'Weather history');
  const drops = j.hourly ? pressureDrops(j.hourly.time, j.hourly.pressure_msl) : {};
  const out: Record<string, DayWeather> = {};
  j.daily.time.forEach((date, i) => {
    const max = j.daily.temperature_2m_max[i];
    const min = j.daily.temperature_2m_min[i];
    const code = j.daily.weather_code[i];
    if (max == null || min == null || code == null) return; // no data that far back: leave the day for later
    out[date] = {
      max: Math.round(max),
      min: Math.round(min),
      rainMm: j.daily.precipitation_sum[i] ?? 0,
      sunMin: Math.round((j.daily.sunshine_duration[i] ?? 0) / 60),
      code,
      pressureDrop: drops[date] ?? null,
    };
  });
  return out;
}

const WET = 0.1; // mm per 15 minutes that counts as rain

/** "Rain until 18:15" while it rains, "Rain from 20:15" if it starts within 3 hours, else null. */
export function rainNote(soon: RainSlot[], now = Date.now()): string | null {
  const ahead = soon.filter((x) => x.at >= now - 15 * 60_000 && x.at <= now + 3 * 3_600_000);
  if (!ahead.length) return null;
  if (ahead[0].mm >= WET) {
    const stop = ahead.find((x) => x.mm < WET);
    return stop ? `🌧️ Rain until ${fmtTime(stop.at)}` : '🌧️ Rain for the next few hours';
  }
  const start = ahead.find((x) => x.mm >= WET);
  return start ? `🌂 Rain from ${fmtTime(start.at)}` : null;
}

/** Minutes of daylight gained tomorrow; null while the days are still getting shorter (no need to rub it in). */
export function daylightGain(days: DayForecast[], today: string): number | null {
  const i = days.findIndex((d) => d.date === today);
  const gain = i >= 0 && days[i + 1] ? days[i + 1].daylightMin - days[i].daylightMin : 0;
  return gain > 0 ? gain : null;
}

export const forecastText = (d: DayForecast) => `${describe(d.code).emoji} ${d.max}°/${d.min}°, ${d.rainPct}% rain`;

/**
 * Which roast pool fits the forecast (WMO codes: 3 overcast, 45/48 fog, 51–67 drizzle and rain, 71–77 and
 * 85–86 snow, 80–82 showers, 95+ thunder). Snow is cold at any temperature, and an overcast, foggy or
 * sunless day is grey: "nice" is kept for days with some sun in them.
 */
export function weatherKey(d: DayForecast): 'weatherRain' | 'weatherCold' | 'weatherHot' | 'weatherGrey' | 'weatherNice' {
  if (d.rainPct >= 60 || (d.code >= 51 && d.code <= 67) || (d.code >= 80 && d.code <= 82) || d.code >= 95) return 'weatherRain';
  if ((d.code >= 71 && d.code <= 77) || d.code === 85 || d.code === 86 || d.max <= 3) return 'weatherCold';
  if (d.max >= 26) return 'weatherHot';
  if (d.code === 3 || d.code === 45 || d.code === 48 || (d.sunshineMin != null && d.sunshineMin < 30)) return 'weatherGrey';
  return 'weatherNice';
}
