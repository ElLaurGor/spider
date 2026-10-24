import { addDays, atTime, dayKey, startOfDay, startOfWeek } from './dates';
import { emptyDay } from './defaults';
import { toneOn } from './tone';
import { holidayOn } from './swedish-days';
import type { CalEvent, DayLog, SetEntry, State, Weekday, WorkoutDay } from './types';

export const dayOf = (s: State, key = dayKey()): DayLog => s.days[key] ?? emptyDay();

export const waterMl = (d: DayLog) => d.water.reduce((a, w) => a + w.ml, 0);
/** Water logged on the day itself: what quests, bosses and contracts go by (back-dated glasses don't count). */
export const liveWaterMl = (d: DayLog) => d.water.reduce((a, w) => a + (w.late ? 0 : w.ml), 0);
export const kcalOf = (d: DayLog) => d.food.reduce((a, f) => a + f.kcal, 0);
export const proteinOf = (d: DayLog) => d.food.reduce((a, f) => a + f.protein, 0);

/** Last night's sleep after a watch sync: hours typed in by hand win over the watch. */
export const syncedSleep = (d: DayLog, watchMin: number | null) => (d.sleepManual ? d.sleepMin : (watchMin ?? d.sleepMin));

/**
 * The watch's final numbers for past days you used the app (days without a log stay that way): steps
 * (never lower than a snapshot taken that day), the step-goal flag without XP, and sleep unless typed in.
 */
export function withPastHealth(s: State, past: { key: string; steps: number; sleepMin: number | null }[]): State {
  let days = s.days;
  for (const p of past) {
    const d = days[p.key];
    if (!d) continue;
    const steps = p.steps > 0 ? Math.max(d.steps ?? 0, p.steps) : d.steps;
    const sleepMin = syncedSleep(d, p.sleepMin);
    const stepGoalHit = !!d.stepGoalHit || (steps ?? 0) >= stepGoalOn(s, p.key);
    if (d.steps === steps && d.sleepMin === sleepMin && !!d.stepGoalHit === stepGoalHit) continue;
    days = { ...days, [p.key]: { ...d, steps, sleepMin, stepGoalHit } };
  }
  return days === s.days ? s : { ...s, days };
}

export const coffeeOf = (d: DayLog) => d.coffee ?? [];
export const activitiesOf = (d: DayLog) => d.activities ?? [];
/** Minutes of timed activities (Maskiner / Kondition / Fria vikter), as logged. */
export const activityMinutes = (d: DayLog) => activitiesOf(d).reduce((a, x) => a + x.minutes, 0);

const SET_GAP = 30 * 60_000; // sets further apart than this are separate sessions
const SET_MARGIN = 5 * 60_000;

/** Logged sets grouped into sessions, with 5 minutes of margin around them (a lone set is 10 minutes). */
export function setSessions(d: DayLog): { start: number; end: number }[] {
  const out: { start: number; end: number }[] = [];
  for (const set of [...d.sets].sort((a, b) => a.at - b.at)) {
    const last = out[out.length - 1];
    if (last && set.at - (last.end - SET_MARGIN) <= SET_GAP) last.end = set.at + SET_MARGIN;
    else out.push({ start: set.at - SET_MARGIN, end: set.at + SET_MARGIN });
  }
  return out;
}

/**
 * Minutes trained: timed activities as logged, plus sessions of sets that no activity covers (an activity is
 * logged when it ends, so it covers the minutes before it). Sets alone count too.
 */
export function trainMinutes(d: DayLog) {
  const covered: { start: number; end: number }[] = [];
  for (const a of activitiesOf(d)
    .map((x) => ({ start: x.at - x.minutes * 60_000, end: x.at }))
    .sort((x, y) => x.start - y.start)) {
    const last = covered[covered.length - 1];
    if (last && a.start <= last.end) last.end = Math.max(last.end, a.end);
    else covered.push(a);
  }
  let setMs = 0;
  for (const w of setSessions(d)) {
    let free = w.end - w.start;
    for (const c of covered) free -= Math.max(0, Math.min(w.end, c.end) - Math.max(w.start, c.start));
    setMs += Math.max(0, free);
  }
  return activityMinutes(d) + Math.round(setMs / 60_000);
}

/** A workout counts if anything was logged: timed activities or weight/reps sets. */
export const trainedOn = (d: DayLog) => d.sets.length > 0 || activitiesOf(d).length > 0;
export const onPeriod = (d: DayLog) => d.period?.flow != null;
/** Low-battery mode: the morning energy check said 1–2. */
export const lowBattery = (d: DayLog) => d.energy != null && d.energy <= 2;
export const caffeineMg = (d: DayLog) => coffeeOf(d).reduce((a, c) => a + c.mg, 0);
export const moodsOf = (d: DayLog) => d.moods ?? [];

export function avgMood(d: DayLog) {
  const m = moodsOf(d);
  return m.length ? m.reduce((a, x) => a + x.level, 0) / m.length : null;
}

/**
 * How savage S.P.I.D.E.R. may be right now, whatever the setting: today's tone (tone.ts). A low mood (kept
 * overnight until the next check-in), sick mode and a period day pause the roasts (1 = mild lines only);
 * low-battery mode only turns the tone down.
 */
export function effectiveSavage(s: State, now = new Date()) {
  return toneOn(s, dayKey(now), now).level;
}

/** Games played recently, most recent first (for one-tap picking). */
export function recentGames(s: State, limit = 8) {
  const seen: { game: string; at: number }[] = [];
  for (const d of Object.values(s.days)) for (const g of d.games) if (g.game) seen.push({ game: g.game, at: g.start });
  const order = seen.sort((a, b) => b.at - a.at).map((x) => x.game);
  return [...new Set(order)].slice(0, limit);
}

/** Total time per game over the last `days` days. */
export function gameTotals(s: State, days = 7, now = new Date()) {
  const totals = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    for (const g of dayOf(s, dayKey(addDays(now, -i))).games) {
      const name = g.game || 'Unnamed';
      totals.set(name, (totals.get(name) ?? 0) + (g.end - g.start));
    }
  }
  return [...totals.entries()].map(([game, ms]) => ({ game, ms })).sort((a, b) => b.ms - a.ms);
}

export function emotionCounts(s: State, days = 7, now = new Date()) {
  const counts = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    for (const m of moodsOf(dayOf(s, dayKey(addDays(now, -i))))) {
      for (const e of m.emotions) counts.set(e, (counts.get(e) ?? 0) + 1);
    }
  }
  return [...counts.entries()].map(([emotion, n]) => ({ emotion, n })).sort((a, b) => b.n - a.n);
}

export const moodDays = (s: State) => Object.values(s.days).filter((d) => moodsOf(d).length > 0).length;
export const totalCoffees = (s: State) => Object.values(s.days).reduce((a, d) => a + coffeeOf(d).length, 0);

/** The day's planned workout: a finished day's snapshot (lib/goals.ts), else the weekly plan. */
export function workoutFor(s: State, date: Date | number = new Date()): WorkoutDay | null {
  const plan = s.plan[new Date(date).getDay() as Weekday];
  const frozen = s.days[dayKey(date)]?.goals;
  if (frozen) return frozen.workout == null ? null : plan?.name === frozen.workout ? plan : { name: frozen.workout, exercises: [] };
  return s.settings.redDaysOff && redDay(date) ? null : plan;
}

/** A day's step goal and protein goal: the snapshot once the day is over, else today's settings. */
export const stepGoalOn = (s: State, key = dayKey()) => s.days[key]?.goals?.steps ?? s.settings.stepGoal;
export const proteinGoalOn = (s: State, key = dayKey()) => s.days[key]?.goals?.protein ?? s.settings.proteinGoal;

/** An official red day (swedish-days.ts); de facto days off like midsommarafton don't count. */
const redDay = (date: Date | number) => holidayOn(date)?.red ?? false;

/**
 * The day's water goal and why it's higher than the base: hot days (that day's saved weather) and
 * training days (planned or done) add some, unless adaptive water is off. Only ever raises the goal,
 * and a goal already hit stays hit (waterGoalHit is never taken back).
 */
export function waterGoalParts(s: State, key = dayKey()): { ml: number; why: string[] } {
  const base = s.settings.waterGoalMl;
  if (s.settings.adaptiveWater === false) return { ml: base, why: [] };
  const d = dayOf(s, key);
  const why: string[] = [];
  let extra = 0;
  const max = d.weather?.max;
  if (max != null && max >= 22) {
    const add = max >= 25 ? 500 : 300;
    extra += add;
    why.push(`+${add} ml: ${Math.round(max)}°`);
  }
  if (workoutFor(s, new Date(`${key}T12:00`)) || trainedOn(d)) {
    extra += 400;
    why.push('+400 ml: training day');
  }
  return { ml: base + extra, why };
}

/** A day's water goal: the snapshot once the day is over (lib/goals.ts), else the live one. */
export const waterGoalFor = (s: State, key = dayKey()) => s.days[key]?.goals?.water ?? waterGoalParts(s, key).ml;

/** The water goal counts as met once the glass that met it was logged, even if the goal grew later (a gym set, a hotter forecast). */
export const waterGoalMet = (s: State, d: DayLog, key: string) => !!d.waterGoalHit || liveWaterMl(d) >= waterGoalFor(s, key);

export const gamingBudgetMin = (s: State, key = dayKey()) => (s.days[key]?.goals?.gaming ?? s.settings.gamingBudgetMin) + dayOf(s, key).bonusGameMin;

/** XP lost for gaming `overMs` past the budget: 2 per started 5 minutes, the first minute is free. */
export const gamePenalty = (overMs: number) => (overMs > 60_000 ? Math.ceil(overMs / (5 * 60_000)) : 0);

/**
 * Gaming time used on a day, including a running session that started that day. Phone games count too
 * (if enabled), minus the minutes played while the timer was running, which the timer already has.
 */
export function gamingUsedMs(s: State, key = dayKey(), now = Date.now()) {
  const d = dayOf(s, key);
  let ms = d.games.reduce((a, g) => a + (g.end - g.start), 0);
  if (s.activeGame && dayKey(s.activeGame.start) === key) ms += now - s.activeGame.start;
  if (s.settings.phoneGamesCount) ms += Math.max(0, (d.screen?.gamesMin ?? 0) - (d.phoneGamesInTimerMin ?? 0)) * 60_000;
  return ms;
}

/** Minutes of foreground time in game apps (`games`, package names) that fall inside timer sessions. */
export function gamesInTimerMin(spans: { packageName: string; start: number; end: number }[], games: Set<string>, sessions: { start: number; end: number }[]) {
  let ms = 0;
  for (const sp of spans) {
    if (!games.has(sp.packageName)) continue;
    for (const g of sessions) ms += Math.max(0, Math.min(sp.end, g.end) - Math.max(sp.start, g.start));
  }
  return Math.round(ms / 60_000);
}

/** Tasks finished on a day: the day's own record (kept when tasks are deleted or cleared), plus older ones still on the list. */
export function doneTasksOn(s: State, key = dayKey()) {
  const out = new Map((s.days[key]?.doneTasks ?? []).map((t) => [t.id, t]));
  for (const t of s.tasks) if (t.done && t.doneAt && dayKey(t.doneAt) === key && !out.has(t.id)) out.set(t.id, { id: t.id, at: t.doneAt });
  return [...out.values()];
}

/**
 * When a forgotten gaming timer stops itself: an hour past bedtime after it started (if that's within 12
 * hours, else 8 hours in), and never under 4 hours in.
 */
export function gameCapAt(s: State, start: number) {
  const cap = new Date(start);
  cap.setHours(s.settings.sleepHour + 1, 0, 0, 0);
  if (cap.getTime() <= start) cap.setDate(cap.getDate() + 1);
  const at = cap.getTime() - start > 12 * 3_600_000 ? start + 8 * 3_600_000 : cap.getTime();
  return Math.max(at, start + 4 * 3_600_000);
}

export function workoutsThisWeek(s: State, now = new Date()) {
  const monday = startOfWeek(now);
  let done = 0;
  let planned = 0;
  for (let i = 0; i < 7; i++) {
    const d = addDays(monday, i);
    if (workoutFor(s, d)) planned++; // red days off and finished days' snapshots included
    const log = s.days[dayKey(d)];
    if (log && trainedOn(log)) done++;
  }
  return { done, planned };
}

export const verdictKey = (score: number) =>
  score < 30 ? 'verdictTragic' : score < 55 ? 'verdictMid' : score < 80 ? 'verdictGood' : ('verdictGreat' as const);

const norm = (name: string) => name.trim().toLowerCase();

/** The most recent earlier day this exercise was trained, with its heaviest set. */
export function lastSession(s: State, exercise: string, beforeKey = dayKey()): { key: string; best: SetEntry } | null {
  const keys = Object.keys(s.days)
    .filter((k) => k < beforeKey)
    .sort()
    .reverse();
  for (const k of keys) {
    const sets = s.days[k].sets.filter((x) => norm(x.exercise) === norm(exercise));
    if (sets.length) {
      const best = sets.reduce((a, b) => (b.weight > a.weight || (b.weight === a.weight && b.reps > a.reps) ? b : a));
      return { key: k, best };
    }
  }
  return null;
}

export const prFor = (s: State, exercise: string) => s.prs[norm(exercise)];

/** The heaviest set of an exercise on the days before `key`: what a set on `key` has to beat to be a record. */
export function bestBeforeDay(s: State, exercise: string, key: string): number | undefined {
  let best: number | undefined;
  for (const [k, d] of Object.entries(s.days)) {
    if (k >= key) continue;
    for (const x of d.sets) if (norm(x.exercise) === norm(exercise)) best = Math.max(best ?? 0, x.weight);
  }
  return best;
}

/** Whether a set of `exercise` already paid a record on day `key` (one record per exercise a day). Today only: past days drop the records. */
export const recordPaidOn = (s: State, key: string, exercise: string) => {
  const d = dayOf(s, key);
  return d.sets.some((x) => norm(x.exercise) === norm(exercise) && d.xpBy?.[`pr:${x.id}`] != null);
};

/** A set of `weight` on day `key` is a record when it beats every earlier day and no set of that exercise was one yet that day. */
export function isRecord(s: State, key: string, exercise: string, weight: number) {
  const before = bestBeforeDay(s, exercise, key);
  return before !== undefined && weight > before && !recordPaidOn(s, key, exercise);
}

/** A logged food's name without the portion the food search adds: "Havregryn (60 g)" is "Havregryn". */
export const foodBase = (name: string) => name.replace(/\s*\(\d+(?:[.,]\d+)?\s*g\)\s*$/i, '').trim();

/**
 * The month's most-logged foods, for one-tap chips. One chip per food whatever the portion (a tap logs the
 * latest portion), and photo-only meals ("Meal", nothing counted) are left out.
 */
export function recentFoods(s: State, limit = 8) {
  const counts = new Map<string, { name: string; kcal: number; protein: number; n: number; at: number }>();
  const since = dayKey(addDays(new Date(), -30));
  for (const [k, d] of Object.entries(s.days)) {
    if (k < since) continue;
    for (const f of d.food) {
      if (!f.kcal && !f.protein && norm(f.name) === 'meal') continue;
      const id = norm(foodBase(f.name));
      const prev = counts.get(id);
      const latest = !prev || f.at >= prev.at ? { name: f.name, kcal: f.kcal, protein: f.protein, at: f.at } : prev;
      counts.set(id, { ...latest, n: (prev?.n ?? 0) + 1 });
    }
  }
  return [...counts.values()].sort((a, b) => b.n - a.n).slice(0, limit);
}

/** Clock times (minutes after midnight) when water reminders go out. */
export function waterSlots(s: State) {
  const { wakeHour, sleepHour, waterEveryMin } = s.settings;
  const slots: number[] = [];
  for (let t = wakeHour * 60 + 60; t <= sleepHour * 60 - 60; t += Math.max(30, waterEveryMin)) slots.push(t);
  return slots;
}

export function nextWaterReminder(s: State, now = new Date()) {
  const mins = now.getHours() * 60 + now.getMinutes();
  const t = waterSlots(s).find((x) => x > mins);
  return t === undefined ? null : atTime(now, 0, Math.floor(t / 60), t % 60);
}

// ---- calendar helpers ----

export function eventsOn(events: CalEvent[], date: Date | number) {
  const day = startOfDay(date);
  const start = day.getTime();
  const end = addDays(day, 1).getTime(); // the next midnight: 23 or 25 hours away when the clocks change
  return events.filter((e) => e.start < end && e.end > start);
}

export const inMeeting = (events: CalEvent[], t: number) =>
  events.some((e) => !e.allDay && e.start <= t && e.end > t);

export function freeSlots(events: CalEvent[], date: Date | number, fromHour: number, toHour: number, minMin = 45) {
  const dayStart = startOfDay(date);
  let cursor = Math.max(atTime(dayStart, 0, fromHour).getTime(), Date.now());
  const end = atTime(dayStart, 0, toHour).getTime();
  const busy = eventsOn(events, date)
    .filter((e) => !e.allDay)
    .sort((a, b) => a.start - b.start);
  const slots: { start: number; end: number }[] = [];
  for (const e of busy) {
    if (e.start - cursor >= minMin * 60_000 && e.start <= end) slots.push({ start: cursor, end: Math.min(e.start, end) });
    cursor = Math.max(cursor, e.end);
  }
  if (end - cursor >= minMin * 60_000) slots.push({ start: cursor, end });
  return slots;
}
