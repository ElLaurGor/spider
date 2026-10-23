// Which pool fits the moment, where the same number means different things at different times of day.
import type { LineKey } from './lines';
import { verdictKey } from './selectors';

/**
 * Steps against the goal, paced by the waking day: 3 000 at 10:00 is on pace, 3 000 at 21:00 is low.
 * Over half the goal is "mid" whatever the hour; under half, it's "early" while you keep up with the clock.
 */
export function stepsLineKey(steps: number, goal: number, now: Date, wakeHour: number, sleepHour: number): LineKey {
  if (steps >= goal) return 'stepsHigh';
  if (steps >= goal / 2) return 'stepsMid';
  const awake = Math.max(1, sleepHour - wakeHour);
  const share = Math.min(1, Math.max(0, (now.getHours() + now.getMinutes() / 60 - wakeHour) / awake));
  return steps >= (goal * share) / 2 ? 'stepsEarly' : 'stepsLow';
}

/**
 * HQ's verdict on the day so far. A kind day gets no verdict at all, and a slow morning isn't "tragic" yet.
 */
export function verdictLineKey(score: number, hour: number, kind: boolean): LineKey {
  if (kind) return 'verdictKind';
  if (hour < 12 && score < 55) return 'verdictMorning';
  return verdictKey(score);
}

/** The evening debrief's verdict on the whole day (the daytime pools say "so far"). */
export function nightVerdictKey(score: number, kind: boolean): LineKey {
  if (kind) return 'verdictKind';
  return score < 30 ? 'nightTragic' : score < 55 ? 'nightMid' : score < 80 ? 'nightGood' : 'nightGreat';
}

/** The Game tab while a session runs: the budget's up, or well past it ({over} only fits the second). */
export const gameLineKey = (overMs: number): LineKey | null => (overMs >= 30 * 60_000 ? 'gameWayOver' : overMs > 0 ? 'gameOver' : null);
