// The chore rota (step 9 admin). A chore repeats a set number of days after it was last done (sheets every 14
// days, descale monthly, the dentist every 6 months), and its freshness bar drains day by day ("Bathroom 80%
// grim"): never a run of days, never "3 days overdue". Paused days (sick, away) don't drain it. Overdue is never a
// miss and never in a day score. Doing one resets it and pays CHORE_XP once a day under its own ledger ref; a task
// made for it (the debrief's top-3 picker) resets it when checked off and pays the task's own XP instead. A "Skip
// one chore" pass from the shop resets one without XP. Pure, so logic-test can check it.
import { addDays, dayKey } from './dates';
import { pausedOn } from './pause';
import type { Chore, State, Task } from './types';

/** What doing a chore pays: modest, the same as a task. */
export const CHORE_XP = 5;
export const choreRef = (id: string) => `ch:${id}`;
/** A shop reward that is a chore pass: the "Skip one chore" idea (economy.ts REWARD_IDEAS), however it was renamed a little. */
export const isChoreSkip = (r: { title: string }) => /\bskip\b.*\bchores?\b/i.test(r.title);
/** Days walked ahead at most when looking for a due day (a year and a bit). */
const LOOKAHEAD = 400;
export const EVERY_MAX = 366;

export const CHORE_PRESETS: { name: string; emoji: string; every: number }[] = [
  { name: 'Change the sheets', emoji: '🛏️', every: 14 },
  { name: 'Clean the bathroom', emoji: '🛁', every: 7 },
  { name: 'Water the plants', emoji: '🪴', every: 7 },
  { name: 'Vacuum', emoji: '🧹', every: 7 },
  { name: 'Descale the kettle', emoji: '☕', every: 30 },
  { name: 'Clean the fridge', emoji: '🧊', every: 30 },
  { name: 'Fridge water filter', emoji: '💧', every: 180 },
  { name: 'Dentist checkup', emoji: '🦷', every: 182 },
];

const noon = (key: string) => new Date(`${key}T12:00`);
const choresOf = (s: State) => s.chores ?? [];

/** Days that counted since chore `c` was last done, up to `today`: the done day itself and paused days don't. Null when it was never done. */
export function choreDays(s: State, c: Chore, today = dayKey()): number | null {
  if (c.last == null) return null;
  const from = dayKey(c.last);
  if (from >= today) return 0;
  let n = 0;
  for (let d = addDays(noon(from), 1), i = 0; dayKey(d) <= today && i < LOOKAHEAD * 2; d = addDays(d, 1), i++) {
    if (!pausedOn(s, dayKey(d))) n++;
  }
  return n;
}

/** How grim it is, 0 (just done) to 1 (due). Never above 1: overdue is just due. */
export function grimOf(s: State, c: Chore, today = dayKey()) {
  const n = choreDays(s, c, today);
  return n == null ? 1 : Math.min(1, n / Math.max(1, c.every));
}

/** The freshness bar: 1 just done, 0 due. */
export const freshOf = (s: State, c: Chore, today = dayKey()) => 1 - grimOf(s, c, today);
export const isDue = (s: State, c: Chore, today = dayKey()) => grimOf(s, c, today) >= 1;

/** "Bathroom 80% grim", or "due" once the bar is empty. */
export function grimText(s: State, c: Chore, today = dayKey()) {
  const g = grimOf(s, c, today);
  return g >= 1 ? 'due' : `${Math.round(g * 100)}% grim`;
}

/**
 * The day chore `c` comes due: today if it already is, else walking ahead and skipping paused days (planned trips
 * included). Null if that's over a year away.
 */
export function dueOn(s: State, c: Chore, today = dayKey()): string | null {
  const n = choreDays(s, c, today);
  if (n == null || n >= c.every) return today;
  let left = c.every - n;
  for (let d = addDays(noon(today), 1), i = 0; i < LOOKAHEAD; d = addDays(d, 1), i++) {
    if (pausedOn(s, dayKey(d))) continue;
    left--;
    if (left <= 0) return dayKey(d);
  }
  return null;
}

/** Chores due on or before `day`, the grimmest first. */
export function choresDueBy(s: State, day: string, today = dayKey()): Chore[] {
  return choresOf(s)
    .filter((c) => {
      const due = dueOn(s, c, today);
      return due != null && due <= day;
    })
    .sort((a, b) => grimOf(s, b, today) - grimOf(s, a, today) || a.name.localeCompare(b.name));
}

/** The rota, the grimmest first. */
export const rota = (s: State, today = dayKey()) => [...choresOf(s)].sort((a, b) => grimOf(s, b, today) - grimOf(s, a, today) || a.name.localeCompare(b.name));

/** A tidied chore name, or null when it's too short to be one. */
export const cleanChoreName = (raw: string) => {
  const name = raw.replace(/\s+/g, ' ').trim().slice(0, 40);
  return name.length >= 2 ? name : null;
};

/** A new chore: fresh from now, or due right away (`due`). */
export function withChore(s: State, c: { name: string; emoji: string; every: number; due?: boolean }, id: string, now = Date.now()): State {
  const name = cleanChoreName(c.name);
  if (!name) return s;
  const every = Math.max(1, Math.min(EVERY_MAX, Math.round(c.every)));
  return { ...s, chores: [...choresOf(s), { id, name, emoji: c.emoji || '🧽', every, last: c.due ? null : now, createdAt: now }] };
}

export function withChoreEdit(s: State, id: string, patch: { name?: string; emoji?: string; every?: number }): State {
  const name = patch.name != null ? cleanChoreName(patch.name) : undefined;
  if (name === null) return s;
  return {
    ...s,
    chores: choresOf(s).map((c) =>
      c.id === id
        ? { ...c, ...(name ? { name } : {}), ...(patch.emoji ? { emoji: patch.emoji } : {}), ...(patch.every ? { every: Math.max(1, Math.min(EVERY_MAX, Math.round(patch.every))) } : {}) }
        : c,
    ),
  };
}

export const withoutChore = (s: State, id: string): State => ({ ...s, chores: choresOf(s).filter((c) => c.id !== id) });

/** The open task made for chore `id` (the debrief's top-3 picker), if any. */
export const choreTaskOf = (s: State, id: string): Task | null => s.tasks.find((t) => t.chore === id && !t.done) ?? null;

/** The title a chore's task gets. */
export const choreTitle = (c: Chore) => `${c.emoji} ${c.name}`;

/** A task for chore `id` (once: an open one is kept). Returns the state and the task's id. */
export function withChoreTask(s: State, id: string, taskId: string, now = Date.now()): { state: State; id: string | null } {
  const c = choresOf(s).find((x) => x.id === id);
  if (!c) return { state: s, id: null };
  const open = choreTaskOf(s, id);
  if (open) return { state: s, id: open.id };
  return { state: { ...s, tasks: [{ id: taskId, title: choreTitle(c), done: false, createdAt: now, chore: id }, ...s.tasks] }, id: taskId };
}

/** Whether chore `id` already paid its XP today (once a day: doing it twice is fine, it pays once). */
export const paidToday = (s: State, id: string, key = dayKey()) => (s.days[key]?.xpBy?.[choreRef(id)] ?? 0) > 0;

/**
 * Chore `id` reset at `at`: `how` 'done' (the caller pays the XP when `xp`), 'skip' (a pass from the shop, no XP;
 * the chore's open task goes too) or 'task' (its task was checked off, which paid). The latest reset is kept for a
 * same-day undo.
 */
export function withChoreReset(s: State, id: string, at: number, how: 'done' | 'skip' | 'task', opts: { xp?: boolean; task?: string } = {}): State {
  const c = choresOf(s).find((x) => x.id === id);
  if (!c) return s;
  const undo = { last: c.last, at, xp: !!opts.xp, ...(how === 'skip' ? { skip: true } : {}), ...(opts.task ? { task: opts.task } : {}) };
  const chores = choresOf(s).map((x) => (x.id === id ? { ...x, last: at, undo } : x));
  const tasks = how === 'skip' ? s.tasks.filter((t) => !(t.chore === id && !t.done)) : s.tasks;
  return { ...s, chores, tasks, ...(how === 'skip' ? { choreSkips: Math.max(0, (s.choreSkips ?? 0) - 1) } : {}) };
}

/** The latest reset of chore `id`, if it can still be undone today (a task's own uncheck undoes those). */
export function undoable(s: State, id: string, today = dayKey()) {
  const u = choresOf(s).find((x) => x.id === id)?.undo;
  return u && !u.task && dayKey(u.at) === today ? u : null;
}

/** Chore `id`'s latest reset taken back: its last-done time is restored, a used pass comes back. XP is the caller's (unreward). */
export function withoutChoreReset(s: State, id: string): State {
  const c = choresOf(s).find((x) => x.id === id);
  if (!c?.undo) return s;
  const u = c.undo;
  const chores = choresOf(s).map((x) => (x.id === id ? { ...x, last: u.last, undo: null } : x));
  return { ...s, chores, ...(u.skip ? { choreSkips: (s.choreSkips ?? 0) + 1 } : {}) };
}

/**
 * Tasks made for a chore, between two states (run() in the store): one just checked off resets its chore (the task
 * paid its own XP), one unchecked again puts the chore back as it was.
 */
export function syncChoreTasks(prev: State, next: State): State {
  if (!next.chores?.length) return next;
  let out = next;
  for (const t of next.tasks) {
    if (!t.chore) continue;
    const before = prev.tasks.find((p) => p.id === t.id);
    if (!before || before.done === t.done) continue;
    const c = (out.chores ?? []).find((x) => x.id === t.chore);
    if (!c) continue;
    if (t.done) out = withChoreReset(out, c.id, t.doneAt ?? Date.now(), 'task', { task: t.id });
    else if (c.undo?.task === t.id) out = withoutChoreReset(out, c.id);
  }
  return out;
}

/** A "Skip one chore" pass bought: the coins go, the purchase is listed, the pass waits on the chore card. */
export function withChoreSkipBought(s: State, r: { title: string; emoji: string; cost: number }, id: string, now = Date.now()): State {
  if (s.coins < r.cost) return s;
  return {
    ...s,
    coins: s.coins - r.cost,
    choreSkips: (s.choreSkips ?? 0) + 1,
    purchases: [...s.purchases, { id, title: r.title, emoji: r.emoji, cost: r.cost, at: now }].slice(-100),
  };
}
