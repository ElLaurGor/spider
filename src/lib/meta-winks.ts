// "I remember the other timeline": the spider winks at meta-moves. Restoring a backup, moving to a new phone (a
// restore made on another install), undoing a glass and pouring the same one straight back, opening the app 15
// times in an hour, a third theme in a day, editing a day from two weeks ago. Each kind at most once a week, never
// on a quiet day (story.ts drops it then), and none of it touches XP, coins or anything that's counted. Pure.
import { dayKey, startOfWeek } from './dates';
import type { DayLog, MetaKind, MetaState, State } from './types';

export const OPENS_WINDOW_MS = 60 * 60_000;
export const OPENS_WINK = 15;
export const THEMES_WINK = 3;
export const RELOG_MS = 2 * 60_000;
export const BACKDATED_DAYS = 14;
const DAY_MS = 86_400_000;

export type MetaEvent = { kind: MetaKind; vars: Record<string, string | number> };

const metaOf = (s: State): MetaState => s.meta ?? {};
const weekOf = (now: number) => dayKey(startOfWeek(now));

/** Said already this week. */
export const saidThisWeek = (s: State, kind: MetaKind, now = Date.now()) => metaOf(s).weeks?.[kind] === weekOf(now);
export const withSaid = (s: State, kind: MetaKind, now = Date.now()): State => ({ ...s, meta: { ...metaOf(s), weeks: { ...metaOf(s).weeks, [kind]: weekOf(now) } } });

/** A wink saved for the next run: after a theme switch reloads the app, after a restore. */
export const withPending = (s: State, kind: MetaKind): State => ({ ...s, meta: { ...metaOf(s), pending: [...new Set([...(metaOf(s).pending ?? []), kind])] } });
export const withoutPending = (s: State): State => (metaOf(s).pending?.length ? { ...s, meta: { ...metaOf(s), pending: undefined } } : s);

/** One more app open; `opens` once there were OPENS_WINK of them in the last hour. */
export function withOpen(s: State, now = Date.now()): State {
  const opens = [...(metaOf(s).opens ?? []).filter((t) => now - t < OPENS_WINDOW_MS), now].slice(-30);
  const next: State = { ...s, meta: { ...metaOf(s), opens } };
  return opens.length >= OPENS_WINK ? withPending(next, 'opens') : next;
}
export const opensInHour = (s: State, now = Date.now()) => (metaOf(s).opens ?? []).filter((t) => now - t < OPENS_WINDOW_MS).length;

/** A theme switch (the app reloads right after): the third one in a day leaves a wink for after the reload. */
export function withThemeSwitch(s: State, now = Date.now()): State {
  const day = dayKey(now);
  const t = metaOf(s).themes;
  const n = t?.day === day ? t.n + 1 : 1;
  const next: State = { ...s, meta: { ...metaOf(s), themes: { day, n } } };
  return n === THEMES_WINK ? withPending(next, 'theme') : next;
}

/**
 * A restored backup (`back`), stamped with this install (`here`): one from another install is a new phone, the
 * rest a plain restore. A backup from before installs were stamped counts as a plain restore.
 */
export function withRestore(back: State, here: string | null): State {
  const moved = !!here && !!back.install && back.install !== here;
  return withPending({ ...back, install: here ?? back.install }, moved ? 'newPhone' : 'restore');
}

/** What a user edits on a day (by reference: a change made by the app itself, like frozen goals, isn't one). */
const EDITED: (keyof DayLog)[] = ['water', 'food', 'sets', 'games', 'coffee', 'activities', 'moods', 'period', 'tracks', 'habits', 'sleepRating', 'energy', 'windDown'];
const filled = (d: DayLog) => EDITED.some((k) => (Array.isArray(d[k]) ? (d[k] as unknown[]).length > 0 : d[k] != null && typeof d[k] !== 'object') || (k === 'period' && d.period != null));
const edited = (a: DayLog | undefined, b: DayLog | undefined) => a !== b && (!a || !b ? !!(a ?? b) && filled((a ?? b)!) : EDITED.some((k) => a[k] !== b[k]));

/**
 * Meta-moves seen between two states of one run: a glass undone (remembered for a moment), the same glass
 * poured back within RELOG_MS, an edit to a day BACKDATED_DAYS or more ago, and the winks left pending.
 * Returns the state with the undo noted (or used up) and the pending list emptied.
 */
export function metaEvents(prev: State, next: State, now = Date.now()): { state: State; events: MetaEvent[] } {
  const events: MetaEvent[] = (metaOf(next).pending ?? []).map((kind): MetaEvent => ({ kind, vars: kind === 'opens' ? { n: opensInHour(next, now) } : {} }));
  let state = withoutPending(next);
  const today = dayKey(now);
  const was = prev.days[today]?.water ?? [];
  const is = next.days[today]?.water ?? [];
  if (is.length < was.length) {
    const gone = was.find((w) => !is.some((x) => x.id === w.id));
    if (gone) state = { ...state, meta: { ...metaOf(state), undo: { at: now, ml: gone.ml } } };
  } else if (is.length > was.length) {
    const undo = metaOf(state).undo;
    const added = is.find((w) => !was.some((x) => x.id === w.id));
    if (undo && added && now - undo.at <= RELOG_MS && added.ml === undo.ml) events.push({ kind: 'relog', vars: {} });
    if (undo) state = { ...state, meta: { ...metaOf(state), undo: undefined } };
  }
  // A day two weeks back or more that the owner changed (the mood journal, a cycle day, a tracker's history).
  const cut = new Date(`${today}T12:00`).getTime() - BACKDATED_DAYS * DAY_MS;
  let oldest: string | null = null;
  if (prev.days !== next.days) {
    for (const k of Object.keys(next.days)) {
      if (new Date(`${k}T12:00`).getTime() > cut || !edited(prev.days[k], next.days[k])) continue;
      if (!oldest || k < oldest) oldest = k;
    }
  }
  if (oldest) events.push({ kind: 'backdated', vars: { days: Math.round((new Date(`${today}T12:00`).getTime() - new Date(`${oldest}T12:00`).getTime()) / DAY_MS) } });
  return { state, events };
}

/** The line pool for each kind. */
export const META_LINE = {
  restore: 'metaRestore',
  newPhone: 'metaNewPhone',
  relog: 'metaRelog',
  opens: 'metaOpens',
  theme: 'metaTheme',
  backdated: 'metaBackdated',
} as const satisfies Record<MetaKind, string>;
