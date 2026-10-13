// When during the day she moves: average steps per weekday and hour from the watch, and the workday
// hour she sits stillest (for an optional nudge). Pure; health.ts reads the hourly steps.
import { dayKey } from './dates';

export type HourSteps = { at: number; steps: number };
export type MoveMap = { grid: number[][]; days: number[] }; // grid[weekday 0–6][hour 0–23] = average steps; days = days counted per weekday

const WORN = 500; // a day with fewer steps in total: the watch was probably off

/** Average steps per weekday and hour. Days under 500 steps in total are left out. */
export function movementMap(slots: HourSteps[]): MoveMap {
  const byDay = new Map<string, HourSteps[]>();
  for (const x of slots) byDay.set(dayKey(x.at), [...(byDay.get(dayKey(x.at)) ?? []), x]);
  const sums = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
  const days = Array<number>(7).fill(0);
  for (const [, xs] of byDay) {
    if (xs.reduce((a, x) => a + x.steps, 0) < WORN) continue;
    const wd = new Date(xs[0].at).getDay();
    days[wd]++;
    for (const x of xs) sums[wd][new Date(x.at).getHours()] += x.steps;
  }
  return { grid: sums.map((row, wd) => row.map((v) => (days[wd] ? Math.round(v / days[wd]) : 0))), days };
}

/**
 * The workday hour (Mon–Fri, from an hour after waking until 19:00 or two hours before bed) with the
 * fewest steps on average: the desk hours, not the sofa ones. Needs at least 3 workdays of data.
 */
export function stillestHour(map: MoveMap, wakeHour: number, sleepHour: number) {
  const workdays = [1, 2, 3, 4, 5].filter((wd) => map.days[wd] > 0);
  if (workdays.reduce((a, wd) => a + map.days[wd], 0) < 3) return null;
  let best: { hour: number; steps: number } | null = null;
  for (let h = wakeHour + 1; h <= Math.min(19, sleepHour - 2); h++) {
    const total = workdays.reduce((a, wd) => a + map.grid[wd][h] * map.days[wd], 0);
    const n = workdays.reduce((a, wd) => a + map.days[wd], 0);
    const steps = Math.round(total / n);
    if (!best || steps < best.steps) best = { hour: h, steps };
  }
  return best;
}
