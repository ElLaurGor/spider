// Unchecking a task, and checking it again after its day is over: the bookkeeping without the toasts, so
// logic-test can check that toggling a task back and forth can't make XP. Checking a task for the first time
// is a normal reward (store.tsx), with Double XP and the rested share.
import { withoutCrit } from './critters';
import { dayKey } from './dates';
import { credit, unreward } from './ledger';
import { dayOf } from './selectors';
import type { State } from './types';
import { BONUS_MIN, XP } from './xp';

/** The day's own record of finished tasks (what contracts and the boss weakness count, even after Clear). */
export function recordTask(s: State, id: string, key: string, at: number | null): State {
  const d = dayOf(s, key);
  const doneTasks = [...(d.doneTasks ?? []).filter((t) => t.id !== id), ...(at == null ? [] : [{ id, at }])];
  return { ...s, days: { ...s.days, [key]: { ...d, doneTasks } } };
}

const counted = (s: State, by: number): State => ({ ...s, counters: { ...s.counters, tasksDone: Math.max(0, s.counters.tasksDone + by) } });

/** The day a task that's checked again goes back to: the one it was first done on, when that's over. */
export function recheckDay(s: State, id: string, today = dayKey()): string | null {
  const first = s.tasks.find((t) => t.id === id && !t.done)?.firstDoneAt;
  return first != null && dayKey(first) !== today ? dayKey(first) : null;
}

/**
 * A task checked again after being unchecked, first done on an earlier day: back to that day, for its XP
 * only. It's paid the plain amount, without Double XP or the rested share, because unchecking it again takes
 * back the plain amount too (that day's per-entry records are gone). Round trips come out even.
 */
export function recheckTask(s: State, id: string, today = dayKey()): State {
  const key = recheckDay(s, id, today);
  const task = s.tasks.find((t) => t.id === id);
  if (key == null || task?.firstDoneAt == null) return s;
  const first = task.firstDoneAt;
  const tasks = s.tasks.map((t) => (t.id === id ? { ...t, done: true, doneAt: first } : t));
  return credit(recordTask(counted({ ...s, tasks }, 1), id, key, first), key, XP.task, 0, `t:${id}`);
}

/** Unchecked: it comes off the day it was done (contracts, the boss weakness), with what it paid. */
export function uncheckTask(s: State, id: string, today = dayKey()): State {
  const task = s.tasks.find((t) => t.id === id);
  if (!task?.done) return s;
  const key = task.doneAt ? dayKey(task.doneAt) : today;
  const tasks = s.tasks.map((t) => (t.id === id ? { ...t, done: false, doneAt: undefined, firstDoneAt: t.firstDoneAt ?? t.doneAt } : t));
  const next = recordTask(counted({ ...s, tasks }, -1), id, key, null);
  const off = { ...next, days: { ...next.days, [key]: withoutCrit(dayOf(next, key), id) } };
  return unreward(off, key, `t:${id}`, XP.task, key === today ? BONUS_MIN.task : 0);
}
