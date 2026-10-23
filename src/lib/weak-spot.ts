// The area that went worst over the last 7 days, so one of the day's quests can aim at it (quests.ts).
// Neutral areas only: water, training, habits and steps. Never food, body or mood.
import { addDays, dayKey } from './dates';
import { habitsDone, habitsFor } from './habits';
import { pausedOn } from './pause';
import { dayOf, stepGoalOn, trainedOn, waterGoalFor, waterMl, workoutFor } from './selectors';
import type { State } from './types';

export type WeakSpot = 'water' | 'gym' | 'habits' | 'steps';

export const WEAK_SPOT_LABEL: Record<WeakSpot, string> = { water: 'water', gym: 'training', habits: 'habits and tasks', steps: 'steps' };

/** Quests that work on each area, best first. */
export const WEAK_SPOT_QUESTS: Record<WeakSpot, string[]> = {
  water: ['water_goal', 'water_noon', 'early_sip'],
  gym: ['workout', 'train_minutes'],
  habits: ['habits', 'tasks'],
  steps: ['steps'],
};

const MIN_DAYS = 3;
const GOOD = 0.75; // every area at or above this: nothing to aim at

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** Each area's 0–1 score over the 7 days before `date` (days the app was used and not paused). */
export function areaScores(s: State, date = new Date()): Partial<Record<WeakSpot, number>> | null {
  const days = Array.from({ length: 7 }, (_, i) => addDays(date, -(i + 1))).filter((d) => s.days[dayKey(d)] && !pausedOn(s, dayKey(d)));
  if (days.length < MIN_DAYS) return null;
  const out: Partial<Record<WeakSpot, number>> = {};
  out.water = avg(days.map((d) => (dayOf(s, dayKey(d)).waterGoalHit || waterMl(dayOf(s, dayKey(d))) >= waterGoalFor(s, dayKey(d)) ? 1 : 0)));
  const planned = days.filter((d) => workoutFor(s, d));
  if (planned.length) out.gym = avg(planned.map((d) => (trainedOn(dayOf(s, dayKey(d))) ? 1 : 0)));
  const habitDays = days.filter((d) => habitsFor(s, d).length > 0);
  if (habitDays.length) {
    out.habits = avg(habitDays.map((d) => habitsFor(s, d).filter((h) => habitsDone(s, dayKey(d)).includes(h.id)).length / habitsFor(s, d).length));
  }
  const walked = days.filter((d) => dayOf(s, dayKey(d)).steps != null);
  if (walked.length) out.steps = avg(walked.map((d) => Math.min(1, (dayOf(s, dayKey(d)).steps ?? 0) / stepGoalOn(s, dayKey(d)))));
  return out;
}

/** The weakest area, or null when there's too little to go on or everything went fine. */
export function weakSpot(s: State, date = new Date()): WeakSpot | null {
  const scores = areaScores(s, date);
  if (!scores) return null;
  let worst: WeakSpot | null = null;
  for (const k of ['water', 'gym', 'habits', 'steps'] as const) {
    const v = scores[k];
    if (v != null && v < GOOD && (worst == null || v < (scores[worst] ?? 1))) worst = k;
  }
  return worst;
}
