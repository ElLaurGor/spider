// A done list that keeps its titles (step 8 days). A day's finished tasks (DayLog.doneTasks, tasks.ts) save the
// title and the task's creation time with each record, so "Done today", the Report's week and Wrapped's month
// still name a task after Plan's Clear dropped it. Older records without a title fall back to the task while it
// still exists, else read as a cleared task. Pure, so logic-test can check it.
import { addDays, dayKey } from './dates';
import { doneTasksOn } from './selectors';
import type { State } from './types';

export type DoneItem = { id: string; at: number; day: string; title: string | null; since: number | null };

/** A uid's time (dates.ts uid starts with Date.now() in base 36), for records from before `since` was saved. */
function idTime(id: string) {
  const t = parseInt(id.slice(0, 8), 36);
  return Number.isFinite(t) && t > 1.5e12 && t < Date.now() + 86_400_000 ? t : null;
}

/** The tasks finished on day `key`, in order, with their titles (the live task's, if it's still on the list). */
export function doneOn(s: State, key: string): DoneItem[] {
  const saved = new Map((s.days[key]?.doneTasks ?? []).map((r) => [r.id, r]));
  return doneTasksOn(s, key)
    .map((r) => {
      const rec = saved.get(r.id);
      const task = s.tasks.find((t) => t.id === r.id);
      return { id: r.id, at: r.at, day: key, title: task?.title ?? rec?.title ?? null, since: rec?.since ?? task?.createdAt ?? idTime(r.id) };
    })
    .sort((a, b) => a.at - b.at);
}

/** The tasks finished from `from` to `to` (day keys, inclusive), in order. */
export function doneBetween(s: State, from: string, to: string): DoneItem[] {
  const out: DoneItem[] = [];
  for (let d = new Date(`${from}T12:00`); dayKey(d) <= to; d = addDays(d, 1)) out.push(...doneOn(s, dayKey(d)));
  return out;
}

/** How a done item reads when its title is gone. */
export const doneTitle = (x: DoneItem) => x.title ?? 'A cleared task';

/** The month's finished tasks, and the one that waited longest before it was finally done (at least a week). */
export function monthDone(s: State, year: number, month: number, now = new Date()) {
  const first = dayKey(new Date(year, month, 1, 12));
  const lastDay = new Date(year, month + 1, 0, 12);
  const to = dayKey(lastDay < now ? lastDay : now);
  const items = first <= to ? doneBetween(s, first, to) : [];
  const waited = items
    .filter((x) => x.title && x.since != null)
    .map((x) => ({ item: x, days: Math.floor((x.at - (x.since ?? x.at)) / 86_400_000) }))
    .sort((a, b) => b.days - a.days)[0];
  return { items, oldest: waited && waited.days >= 7 ? waited : null };
}
