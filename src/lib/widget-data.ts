// What the home-screen widget shows (APK 1.5.0+). The app writes a snapshot whenever these numbers change; the
// widget draws from it without loading the store, also after midnight (forToday) and right after a tap on its
// own buttons (withTap), before the app has applied the tap from the queue. Pure.
import { dayKey } from './dates';
import { coffeeOf, dayOf, gamingBudgetMin, gamingUsedMs, waterGoalFor, waterMl } from './selectors';
import type { State } from './types';

export type WidgetColors = { bg: string; card: string; text: string; dim: string; accent: string; water: string; coffee: string; game: string };

export type WidgetSnapshot = {
  day: string;
  waterMl: number;
  goalMl: number;
  glassMl: number;
  coffees: number;
  coffeeLimit: number;
  gameLeftMin: number | null; // null when unknown (a new day before the app ran)
  gaming: boolean; // a session is running
  colors: WidgetColors;
};

export const DEFAULT_WIDGET_COLORS: WidgetColors = {
  bg: '#07090F',
  card: '#10141F',
  text: '#F2F4F8',
  dim: '#8A93A6',
  accent: '#E23636',
  water: '#2F7BFF',
  coffee: '#FFC53D',
  game: '#9B6BFF',
};

export function snapshotOf(s: State, colors: WidgetColors, now = Date.now()): WidgetSnapshot {
  const key = dayKey(now);
  const d = dayOf(s, key);
  return {
    day: key,
    waterMl: waterMl(d),
    goalMl: waterGoalFor(s, key),
    glassMl: s.settings.glassMl,
    coffees: coffeeOf(d).length,
    coffeeLimit: s.settings.coffeeLimit,
    gameLeftMin: Math.round(gamingBudgetMin(s, key) - gamingUsedMs(s, key, now) / 60_000),
    gaming: !!s.activeGame,
    colors,
  };
}

/** A snapshot from an earlier day starts the new one at zero (the gaming budget is unknown until the app runs). */
export function forToday(snap: WidgetSnapshot, now = Date.now()): WidgetSnapshot {
  const key = dayKey(now);
  if (snap.day === key) return snap;
  return { ...snap, day: key, waterMl: 0, coffees: 0, gameLeftMin: snap.gaming ? snap.gameLeftMin : null };
}

/** The widget's own "+1 glass" / "+1 coffee", shown at once; the app logs the real entry from the queue. */
export function withTap(snap: WidgetSnapshot, kind: 'glass' | 'coffee', now = Date.now()): WidgetSnapshot {
  const today = forToday(snap, now);
  return kind === 'glass' ? { ...today, waterMl: today.waterMl + today.glassMl } : { ...today, coffees: today.coffees + 1 };
}

const liters = (ml: number) => (ml / 1000).toFixed(1).replace(/\.0$/, '');
const hm = (min: number) => (min >= 60 ? `${Math.floor(min / 60)}h ${min % 60}m` : `${min}m`);

/** The three numbers, as text. */
export function widgetLines(snap: WidgetSnapshot) {
  const left = snap.gameLeftMin;
  const game = snap.gaming ? 'playing' : left == null ? '–' : left >= 0 ? `${hm(left)} left` : `${hm(-left)} over`;
  return {
    water: `${liters(snap.waterMl)} / ${liters(snap.goalMl)} L`,
    coffee: `${snap.coffees} / ${snap.coffeeLimit}`,
    game,
  };
}
