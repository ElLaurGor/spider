// What the home-screen widget shows (APK 1.5.0+). The app writes a snapshot whenever these numbers change; the
// widget draws from it without loading the store, also after midnight (forToday), plus the taps still waiting in
// the queue (withQueued): its own buttons' and the reminder buttons', before the app has applied them. Pure.
import { dayKey } from './dates';
import type { QueuedAction } from './reminder-actions';
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

/**
 * The snapshot for today with the glasses and coffees still queued for today on top; the app logs the real
 * entries from the queue and takes them out of it as its new snapshot comes in.
 */
export function withQueued(snap: WidgetSnapshot, queued: readonly QueuedAction[], now = Date.now()): WidgetSnapshot {
  const today = forToday(snap, now);
  const mine = queued.filter((a) => a.day === today.day);
  const glasses = mine.filter((a) => a.kind === 'glass').length;
  const coffees = mine.filter((a) => a.kind === 'coffee').length;
  return glasses || coffees ? { ...today, waterMl: today.waterMl + glasses * today.glassMl, coffees: today.coffees + coffees } : today;
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
