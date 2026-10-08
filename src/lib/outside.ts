// Pollen, air quality and UV (Open-Meteo / CAMS), SMHI weather warnings and VMA
// (Krisinformation.se). All free, no API keys. Warnings are matched on the county
// ("Stockholms län") that comes with the weather location.
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
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Air quality failed (${res.status})`);
  const j = (await res.json()) as {
    current: { european_aqi: number | null; pm2_5: number | null; pm10: number | null; uv_index: number | null };
    hourly: Record<string, (number | null)[]> & { time: string[] };
  };
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
export type Alert = { id: string; source: 'SMHI' | 'VMA'; level: AlertLevel; title: string; text: string; start?: string; url: string };

export const ALERT_COLOR: Record<AlertLevel, string> = { MESSAGE: '#3FA9FF', YELLOW: '#FFC53D', ORANGE: '#FF8A3D', RED: '#E23636', VMA: '#E23636' };
export const ALERT_LABEL: Record<AlertLevel, string> = { MESSAGE: 'Message', YELLOW: 'Yellow warning', ORANGE: 'Orange warning', RED: 'Red warning', VMA: 'VMA' };

type Lang = { sv?: string; en?: string };
const txt = (t?: Lang) => t?.en || t?.sv || '';

/** SMHI impact-based warnings for one county (MESSAGE = information, then YELLOW/ORANGE/RED). */
export async function fetchSmhi(county: string): Promise<Alert[]> {
  const res = await fetch('https://opendata-download-warnings.smhi.se/ibww/api/version/1/warning.json');
  if (!res.ok) throw new Error(`SMHI failed (${res.status})`);
  const warnings = (await res.json()) as {
    id: number;
    event: Lang & { code: string };
    warningAreas: {
      id: number;
      approximateStart?: string;
      warningLevel: Lang & { code: AlertLevel };
      eventDescription?: Lang;
      affectedAreas: Lang[];
      descriptions?: { title: Lang & { code: string }; text: Lang }[];
    }[];
  }[];
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
        url: 'https://www.smhi.se/vader/varningar-och-brandrisk/varningar-och-meddelanden',
      });
    }
  }
  const rank: Record<AlertLevel, number> = { VMA: 5, RED: 4, ORANGE: 3, YELLOW: 2, MESSAGE: 1 };
  return out.sort((a, b) => rank[b.level] - rank[a.level]);
}

export function isMine(a: { type?: string; description?: string }, county: string, town?: string) {
  if (a.type === 'Country' || a.description === county) return true;
  return !!town && !!a.description?.toLowerCase().startsWith(town.toLowerCase());
}

/** Active VMAs (Viktigt meddelande till allmänheten) for the county, the town's municipality, or nationwide. */
export async function fetchVma(county: string, town?: string): Promise<Alert[]> {
  const res = await fetch('https://api.krisinformation.se/v3/vmas?format=json');
  if (!res.ok) throw new Error(`Krisinformation failed (${res.status})`);
  const list = (await res.json()) as {
    identifier: string;
    headline?: string;
    preamble?: string;
    bodyText?: string;
    published?: string;
    web?: string;
    area?: { type?: string; description?: string }[];
  }[];
  // Municipal VMAs name the kommun ("Stockholms kommun", "Malmö kommun"), so match the town too.
  return list
    .filter((v) => !v.area?.length || v.area.some((a) => isMine(a, county, town)))
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
