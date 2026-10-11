import { addDays, atTime, dayKey, startOfDay, startOfWeek } from './dates';
import { emptyDay } from './defaults';
import type { CalEvent, DayLog, SetEntry, State, Weekday, WorkoutDay } from './types';

export const dayOf = (s: State, key = dayKey()): DayLog => s.days[key] ?? emptyDay();

export const waterMl = (d: DayLog) => d.water.reduce((a, w) => a + w.ml, 0);
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
    const stepGoalHit = !!d.stepGoalHit || (steps ?? 0) >= s.settings.stepGoal;
    if (d.steps === steps && d.sleepMin === sleepMin && !!d.stepGoalHit === stepGoalHit) continue;
    days = { ...days, [p.key]: { ...d, steps, sleepMin, stepGoalHit } };
  }
  return days === s.days ? s : { ...s, days };
}

export const coffeeOf = (d: DayLog) => d.coffee ?? [];
export const activitiesOf = (d: DayLog) => d.activities ?? [];
export const trainMinutes = (d: DayLog) => activitiesOf(d).reduce((a, x) => a + x.minutes, 0);
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

/** A low mood (or, if enabled, a period day) makes S.P.I.D.E.R. go easy, whatever the savage setting. */
export function effectiveSavage(s: State) {
  const today = dayOf(s);
  const latest = moodsOf(today).at(-1);
  if (latest && latest.level <= 2) return Math.min(s.settings.savageLevel, 2);
  if (s.settings.easyOnPeriod && onPeriod(today)) return Math.min(s.settings.savageLevel, 4);
  if (lowBattery(today)) return Math.min(s.settings.savageLevel, 5);
  return s.settings.savageLevel;
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

export const workoutFor = (s: State, date: Date | number = new Date()): WorkoutDay | null =>
  s.plan[new Date(date).getDay() as Weekday];

export const gamingBudgetMin = (s: State, key = dayKey()) => s.settings.gamingBudgetMin + dayOf(s, key).bonusGameMin;

/** XP lost for gaming `overMs` past the budget: 2 per started 5 minutes, the first minute is free. */
export const gamePenalty = (overMs: number) => (overMs > 60_000 ? Math.ceil(overMs / (5 * 60_000)) * 2 : 0);

/** Gaming time used on a day, including a running session that started that day. */
export function gamingUsedMs(s: State, key = dayKey(), now = Date.now()) {
  const d = dayOf(s, key);
  let ms = d.games.reduce((a, g) => a + (g.end - g.start), 0);
  if (s.activeGame && dayKey(s.activeGame.start) === key) ms += now - s.activeGame.start;
  if (s.settings.phoneGamesCount) ms += (d.screen?.gamesMin ?? 0) * 60_000;
  return ms;
}

export function workoutsThisWeek(s: State, now = new Date()) {
  const monday = startOfWeek(now);
  let done = 0;
  let planned = 0;
  for (let i = 0; i < 7; i++) {
    const d = addDays(monday, i);
    if (s.plan[d.getDay() as Weekday]) planned++;
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

export function recentFoods(s: State, limit = 8) {
  const counts = new Map<string, { name: string; kcal: number; protein: number; n: number }>();
  const since = dayKey(addDays(new Date(), -30));
  for (const [k, d] of Object.entries(s.days)) {
    if (k < since) continue;
    for (const f of d.food) {
      const id = norm(f.name);
      const prev = counts.get(id);
      counts.set(id, { name: f.name, kcal: f.kcal, protein: f.protein, n: (prev?.n ?? 0) + 1 });
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
  const start = startOfDay(date).getTime();
  const end = start + 24 * 3_600_000;
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
