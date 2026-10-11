// Dated events: Halloween (the spider's own holiday), Lucia and the winter solstice. Each brings a
// seasonal daily quest; Halloween also dresses up the weekly boss (quests.ts).
import type { LineKey } from './lines';

export type SeasonId = 'halloween' | 'lucia' | 'solstice';

type SeasonDef = { id: SeasonId; name: string; emoji: string; from: [number, number]; to: [number, number]; about: string; line: LineKey };

const SEASONS: SeasonDef[] = [
  { id: 'halloween', name: 'Spooky season', emoji: '🎃', from: [10, 24], to: [11, 1], about: 'Seasonal quests and a haunted boss.', line: 'seasonHalloween' },
  { id: 'lucia', name: 'Lucia', emoji: '🕯️', from: [12, 13], to: [12, 13], about: 'Bring some light into the darkest month. Seasonal quest today.', line: 'seasonLucia' },
  { id: 'solstice', name: 'Winter solstice', emoji: '🌑', from: [12, 21], to: [12, 21], about: 'The darkest day. From tomorrow, the light comes back.', line: 'seasonSolstice' },
];

export type Season = Omit<SeasonDef, 'from' | 'to'> & { lastDay: Date };

const md = (month: number, day: number) => month * 100 + day;

/** The season a date falls in, if any. */
export function seasonOn(date: Date | number = new Date()): Season | null {
  const d = new Date(date);
  const now = md(d.getMonth() + 1, d.getDate());
  const def = SEASONS.find((x) => now >= md(...x.from) && now <= md(...x.to));
  if (!def) return null;
  const { id, name, emoji, about, line, to } = def;
  return { id, name, emoji, about, line, lastDay: new Date(d.getFullYear(), to[0] - 1, to[1]) };
}

const SNOW = new Set([71, 73, 75, 77, 85, 86]); // WMO weather codes for snow

/** The winter a date belongs to ("2026" for 2026–27), so the first snow is announced once per winter. */
export const winterOf = (date: Date | number = new Date()) => {
  const d = new Date(date);
  return String(d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1);
};

export const isSnow = (code: number) => SNOW.has(code);
