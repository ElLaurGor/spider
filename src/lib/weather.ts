// Weather from Open-Meteo: free, no API key, no account.
export type Place = { name: string; lat: number; lon: number; county?: string }; // county e.g. "Stockholms län"

export type DayForecast = { date: string; max: number; min: number; rainPct: number; code: number };
export type Weather = { temp: number; feels: number; code: number; days: DayForecast[]; fetchedAt: number };

// Swedish names, so the county ("Stockholms län") matches SMHI and Krisinformation exactly.
export async function findPlace(query: string): Promise<Place | null> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?count=1&language=sv&format=json&name=${encodeURIComponent(query.trim())}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Geocoding failed (${res.status})`);
  const json = (await res.json()) as { results?: { name: string; country?: string; admin1?: string; latitude: number; longitude: number }[] };
  const r = json.results?.[0];
  return r ? { name: r.country ? `${r.name}, ${r.country}` : r.name, lat: r.latitude, lon: r.longitude, county: r.admin1 } : null;
}

/** Places saved before counties were stored: look the county up once from the name. */
export async function withCounty(place: Place): Promise<Place> {
  if (place.county) return place;
  const found = await findPlace(place.name.split(',')[0]);
  return found?.county ? { ...place, county: found.county } : place;
}

export async function fetchWeather(place: Place): Promise<Weather> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${place.lat}&longitude=${place.lon}` +
    '&current=temperature_2m,apparent_temperature,weather_code' +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max' +
    '&timezone=auto&forecast_days=4';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather failed (${res.status})`);
  const j = (await res.json()) as {
    current: { temperature_2m: number; apparent_temperature: number; weather_code: number };
    daily: {
      time: string[];
      weather_code: number[];
      temperature_2m_max: number[];
      temperature_2m_min: number[];
      precipitation_probability_max: (number | null)[];
    };
  };
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
    })),
    fetchedAt: Date.now(),
  };
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

export const forecastText = (d: DayForecast) => `${describe(d.code).emoji} ${d.max}°/${d.min}°, ${d.rainPct}% rain`;

/** Which roast pool fits the forecast. */
export function weatherKey(d: DayForecast): 'weatherRain' | 'weatherCold' | 'weatherHot' | 'weatherNice' {
  if (d.rainPct >= 60 || (d.code >= 51 && d.code <= 67) || (d.code >= 80 && d.code <= 82) || d.code >= 95) return 'weatherRain';
  if (d.max <= 3) return 'weatherCold';
  if (d.max >= 26) return 'weatherHot';
  return 'weatherNice';
}
