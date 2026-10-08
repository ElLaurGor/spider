// The spider evolves as you level up, and higher levels unlock color themes.
import { THEMES, type ThemeId } from '@/constants/theme';

export type Stage = { level: number; name: string; badge: string | null; ring: 'faint' | 'red' | 'yellow' | 'cyan'; ringWidth: number; scale: number };

export const STAGES: Stage[] = [
  { level: 1, name: 'Spiderling', badge: null, ring: 'faint', ringWidth: 2, scale: 0.75 },
  { level: 3, name: 'Web Rookie', badge: null, ring: 'red', ringWidth: 2, scale: 0.9 },
  { level: 5, name: 'Wall Crawler', badge: '🕸️', ring: 'red', ringWidth: 3, scale: 1 },
  { level: 7, name: 'Web Warrior', badge: '⚔️', ring: 'yellow', ringWidth: 3, scale: 1 },
  { level: 9, name: 'Arachnid Overlord', badge: '👑', ring: 'yellow', ringWidth: 4, scale: 1.05 },
  { level: 12, name: 'S.P.I.D.E.R. Prime', badge: '⚡', ring: 'cyan', ringWidth: 4, scale: 1.1 },
];

export const stageFor = (level: number) => [...STAGES].reverse().find((s) => level >= s.level) ?? STAGES[0];
export const nextStage = (level: number) => STAGES.find((s) => s.level > level) ?? null;

export const themeIds = Object.keys(THEMES) as ThemeId[];
export const themeUnlocked = (id: ThemeId, level: number) => level >= THEMES[id].level;
/** Themes newly unlocked when going from one level to a higher one. */
export const themesUnlockedBetween = (from: number, to: number) => themeIds.filter((id) => THEMES[id].level > from && THEMES[id].level <= to);
