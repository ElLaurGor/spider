// What S.P.I.D.E.R. remembers about you: the tasks that refuse to die.
import type { State, Task } from './types';

/** A task open this many days becomes "immortal": a running joke until it's done. */
export const IMMORTAL_DAYS = 7;

export const taskAgeDays = (t: Task, now = Date.now()) => Math.floor((now - t.createdAt) / 86_400_000);

/** The oldest task that's been open a week or more, and its age in days. */
export function immortalTask(s: State, now = Date.now()): { task: Task; days: number } | null {
  let oldest: Task | null = null;
  for (const t of s.tasks) {
    if (!t.done && taskAgeDays(t, now) >= IMMORTAL_DAYS && (!oldest || t.createdAt < oldest.createdAt)) oldest = t;
  }
  return oldest ? { task: oldest, days: taskAgeDays(oldest, now) } : null;
}
