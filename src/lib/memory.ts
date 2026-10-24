// What S.P.I.D.E.R. remembers about you: yesterday's highlight, tomorrow's top 3 and the tasks that refuse to die.
import { addDays, dayKey, fmtTime } from './dates';
import type { LineKey } from './lines';
import { dayScoreFor } from './report';
import { bestBeforeDay, trainedOn, waterGoalFor, waterMl, workoutFor } from './selectors';
import { gentleDay } from './tone';
import type { DayLog, State, Task } from './types';

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

// ---- tonight's debrief, tomorrow's top 3 ----

const NIGHT_MS = 4 * 3_600_000; // until 04:00 it's still last night

/** The evening a moment belongs to. */
export const eveningKey = (now = Date.now()) => dayKey(now - NIGHT_MS);

/** The day an evening debrief plans for. */
export const tomorrowKey = (now = Date.now()) => dayKey(addDays(now - NIGHT_MS, 1));

/** Today's top 3 as picked in last night's debrief: the tasks that still exist, done or not. */
export function topToday(s: State, now = Date.now()): Task[] {
  const top = s.topTomorrow;
  if (!top || top.day !== dayKey(now)) return [];
  return top.ids.flatMap((id) => s.tasks.filter((t) => t.id === id));
}

// ---- yesterday ----

export type Callback = { key: LineKey; vars: Record<string, string | number> };

/** Yesterday's heaviest set that beat every earlier day of that exercise (the same test as a record in the store). */
function prOn(s: State, d: DayLog, key: string): { exercise: string; weight: number } | null {
  let found: { exercise: string; weight: number } | null = null;
  for (const set of d.sets) {
    const before = bestBeforeDay(s, set.exercise, key);
    if (before !== undefined && set.weight > before && (!found || set.weight > found.weight)) found = { exercise: set.exercise.trim(), weight: set.weight };
  }
  return found;
}

/** When the last gaming session that started that day ended, if it ran past bedtime. */
function lateGameEnd(s: State, d: DayLog, date: Date): number | null {
  const bedtime = new Date(date);
  bedtime.setHours(s.settings.sleepHour, 0, 0, 0);
  if (s.settings.sleepHour < 12) bedtime.setDate(bedtime.getDate() + 1); // a bedtime after midnight
  const last = Math.max(0, ...d.games.map((g) => g.end));
  return last > bedtime.getTime() ? last : null;
}

/**
 * The most notable thing about yesterday, for a morning callback; null when there's nothing to go on.
 * After a low-mood, period or paused day (or on one), only something kind. Never food, never the body.
 */
export function yesterdayHighlight(s: State, now = new Date()): Callback | null {
  const date = addDays(now, -1);
  const key = dayKey(date);
  const d = s.days[key];
  if (!d) return null;
  const today = dayKey(now);
  const low = (k: string) => (s.days[k]?.moods ?? []).some((m) => m.level <= 2);
  if (low(key) || low(today) || gentleDay(s, key) || gentleDay(s, today)) return { key: 'callbackGentle', vars: {} };

  const pr = prOn(s, d, key);
  if (pr) return { key: 'callbackPR', vars: pr };
  if (d.questsAllDone) return { key: 'callbackQuests', vars: {} };
  const late = lateGameEnd(s, d, date);
  if (late) return { key: 'callbackLateGame', vars: { time: fmtTime(late) } };
  const plan = workoutFor(s, date);
  if (plan && !trainedOn(d)) return { key: 'callbackSkip', vars: { workout: plan.name } };
  const water = (waterMl(d) / 1000).toFixed(1);
  const score = dayScoreFor(s, date);
  if ((d.waterGoalHit && (!plan || trainedOn(d))) || score >= 85) return { key: 'callbackWin', vars: { water } };
  if (d.water.length > 0 && waterMl(d) < waterGoalFor(s, key) / 2) return { key: 'callbackDry', vars: { water } };
  if (score <= 40) return { key: 'callbackSlow', vars: { score } };
  return null;
}
