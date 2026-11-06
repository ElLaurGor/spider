// Task horizons (step 9 admin). "Not today" hides an open task until a day; Someday keeps a maybe out of the open
// count; "Waiting on" holds something like "Försäkringskassan reply" until its chase day, when it turns back into a
// task. Every count of open tasks (Plan, the tab badge, quests, contracts, the debrief's top-3 picker, the zombie
// and the bonfire, notifications) goes through activeTasks, and a zombie's age counts from when the task became
// active again (activeSinceOf). Pure, so logic-test can check it.
import { addDays, dayKey, isDayKey } from './dates';
import type { State, Task, TaskHorizon } from './types';

export type HorizonKind = TaskHorizon['kind'];
/** Where an open task is on a day: `active`, or still on its horizon. A later or waiting task whose day has come is active again. */
export type Place = 'active' | HorizonKind;

const startOf = (key: string) => new Date(`${key}T00:00`).getTime();

/** Where task `t` is on day `day`. Done tasks are 'active' here; callers check `done` themselves. */
export function placeOf(t: Task, day = dayKey()): Place {
  const h = t.horizon;
  if (!h) return 'active';
  if (h.kind === 'someday') return 'someday';
  return h.until && h.until > day ? h.kind : 'active';
}

/** An open task that counts on day `day`: not done, and not hidden by a horizon. */
export const isActive = (t: Task, day = dayKey()) => !t.done && placeOf(t, day) === 'active';

/** The open tasks that count on day `day`, in list order. */
export const activeTasks = (s: State, day = dayKey()) => s.tasks.filter((t) => isActive(t, day));

/** The open tasks on horizon `kind` on day `day`: later ones soonest first, waiting ones by chase day, someday ones newest first. */
export function onHorizon(s: State, kind: HorizonKind, day = dayKey()): Task[] {
  const list = s.tasks.filter((t) => !t.done && placeOf(t, day) === kind);
  if (kind === 'someday') return list.sort((a, b) => (b.horizon?.at ?? 0) - (a.horizon?.at ?? 0));
  return list.sort((a, b) => (a.horizon?.until ?? '').localeCompare(b.horizon?.until ?? ''));
}

/** A waiting task whose chase day has come: it's a task again ("Chase: …"). */
export const chasing = (t: Task, day = dayKey()) => !t.done && t.horizon?.kind === 'waiting' && placeOf(t, day) === 'active';

/** How an open task reads on Plan and HQ: a waiting one that's back is a chase. */
export const taskLabel = (t: Task, day = dayKey()) => (chasing(t, day) ? `Chase: ${t.title}` : t.title);

/**
 * When the task became active (again): when it was added, when it came back from Someday or a horizon by hand
 * (`activeSince`), or the start of the day its "Not today" or chase day came round. The zombie's age and the
 * bonfire's 30 days count from here.
 */
export function activeSinceOf(t: Task): number {
  let since = t.activeSince ?? t.createdAt;
  const h = t.horizon;
  if (h && h.kind !== 'someday' && h.until && isDayKey(h.until)) since = Math.max(since, startOf(h.until));
  return since;
}

/** The days a horizon can be set to from `today`: tomorrow, in 3 days, next Monday, in a week, in 2 weeks. */
export function horizonDays(today = dayKey()): { key: string; label: string }[] {
  const noon = new Date(`${today}T12:00`);
  const monday = addDays(noon, ((8 - noon.getDay()) % 7) || 7);
  const out = [
    { key: dayKey(addDays(noon, 1)), label: 'Tomorrow' },
    { key: dayKey(addDays(noon, 3)), label: 'In 3 days' },
    { key: dayKey(monday), label: 'Next Monday' },
    { key: dayKey(addDays(noon, 7)), label: 'In a week' },
    { key: dayKey(addDays(noon, 14)), label: 'In 2 weeks' },
  ];
  return out.filter((x, i) => out.findIndex((y) => y.key === x.key) === i);
}

/**
 * Task `id` put on a horizon (`later` and `waiting` need a day after today), or back to active now (null). Coming
 * back by hand from Someday or before its day restarts the zombie clock (`activeSince`); done tasks are left alone.
 */
export function withHorizon(s: State, id: string, h: { kind: HorizonKind; until?: string } | null, now = Date.now()): State {
  const today = dayKey(now);
  const task = s.tasks.find((t) => t.id === id);
  if (!task || task.done) return s;
  if (h && h.kind !== 'someday' && !(h.until && isDayKey(h.until) && h.until > today)) return s;
  let next: Task;
  if (!h) {
    if (!task.horizon) return s;
    const wasHidden = placeOf(task, today) !== 'active';
    // A horizon that already ran out made it active from that day; one taken off early makes it active now.
    const since = wasHidden ? now : activeSinceOf(task);
    next = { ...task, horizon: null, activeSince: since };
  } else {
    next = { ...task, horizon: { kind: h.kind, ...(h.kind === 'someday' ? {} : { until: h.until }), at: now } };
  }
  return { ...s, tasks: s.tasks.map((t) => (t.id === id ? next : t)) };
}

/** A new "Waiting on" item: held until its chase day, then a task. Unchanged when the title is empty or the day isn't ahead. */
export function withWaiting(s: State, title: string, until: string, id: string, now = Date.now()): State {
  const t = title.trim();
  if (!t || !isDayKey(until) || until <= dayKey(now)) return s;
  return { ...s, tasks: [{ id, title: t, done: false, createdAt: now, horizon: { kind: 'waiting', until, at: now } }, ...s.tasks] };
}

/** "Fri 14 Nov", for horizon days on Plan. */
export const shortDay = (key: string) => new Date(`${key}T12:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
