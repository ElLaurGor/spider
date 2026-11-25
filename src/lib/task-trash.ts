// step 10 ux: a deleted task's Undo (the delete's toast). The task and its place in the list are kept while the
// toast can still be tapped; the undo puts the very same task back (same id, so a slot booking, a top-3 pick, a
// chore link and its done record all still point at it). Nothing is paid or taken either way: a delete never
// touched XP. Pure, so logic-test can check it.
import type { State, Task } from './types';

/** The task, where it sat, and the task that came after it (so a task added meanwhile doesn't shift it). */
export type TrashedTask = { task: Task; index: number; next: string | null };

/** How long a deleted task waits for its Undo (longer than any toast stays up). */
export const TASK_UNDO_MS = 60_000;

/** Task `id` taken off the list, with what an undo needs to put it back; null when there's no such task. */
export function withoutTask(s: State, id: string): { state: State; trashed: TrashedTask } | null {
  const index = s.tasks.findIndex((t) => t.id === id);
  if (index < 0) return null;
  return {
    state: { ...s, tasks: s.tasks.filter((t) => t.id !== id) },
    trashed: { task: s.tasks[index], index, next: s.tasks[index + 1]?.id ?? null },
  };
}

/** A deleted task back where it was: before the task that followed it, else at its old index. A task that's back already stays once. */
export function withTaskBack(s: State, t: TrashedTask): State {
  if (s.tasks.some((x) => x.id === t.task.id)) return s;
  const tasks = [...s.tasks];
  const before = t.next ? tasks.findIndex((x) => x.id === t.next) : -1;
  tasks.splice(before >= 0 ? before : Math.min(Math.max(0, t.index), tasks.length), 0, t.task);
  return { ...s, tasks };
}
