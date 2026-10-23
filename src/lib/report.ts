import { addDays, dayKey, MIN, startOfDay, startOfWeek } from './dates';
import { roughDay, usedOn, type RoughKind } from './day-filters';
import { habitsDone, habitsFor } from './habits';
import { bossFor, questsFor } from './quests';
import {
  avgMood,
  coffeeOf,
  dayOf,
  doneTasksOn,
  emotionCounts,
  gameTotals,
  gamingBudgetMin,
  gamingUsedMs,
  moodsOf,
  proteinOf,
  trainedOn,
  trainMinutes,
  waterGoalFor,
  waterMl,
  workoutFor,
} from './selectors';
import type { State } from './types';

export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';
export const gradeOf = (score: number): Grade => (score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : score >= 40 ? 'D' : 'F');

export type Category = { id: string; label: string; emoji: string; stat: string; score: number | null };

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** Tasks finished that day, out of those on the list then (finished that day, or still open when it ended). */
function taskShare(s: State, date: Date): number | null {
  const start = startOfDay(date).getTime();
  const end = addDays(startOfDay(date), 1).getTime();
  const done = doneTasksOn(s, dayKey(date)).length; // the day's own record: Clear and delete don't erase it
  const open = s.tasks.filter((t) => t.createdAt < end && (!t.done || (t.doneAt ?? 0) >= end)).length;
  return done + open ? done / (done + open) : null;
}

/**
 * 0–100: how well a day went (or is going). Feeds HQ's verdict, best/worst day, Insights and Wrapped.
 * Habits only: what was eaten (protein) and how it felt (mood) are never graded. Water took protein's
 * 20 points, so a day with nothing logged or everything done scores what it always did.
 */
export function dayScoreFor(s: State, date: Date) {
  const key = dayKey(date);
  const d = dayOf(s, key);
  const water = clamp01(waterMl(d) / waterGoalFor(s, key)) * 50;
  const gym = !workoutFor(s, date) || trainedOn(d) ? 25 : 0;
  // Follow-through: habits due that day and tasks on the list, whichever there are.
  const due = habitsFor(s, date);
  const shares = [due.length ? due.filter((h) => habitsDone(s, key).includes(h.id)).length / due.length : null, taskShare(s, date)];
  const counted = shares.filter((x): x is number => x != null);
  const follow = counted.length ? avg(counted) * 15 : 15;
  const gaming = gamingUsedMs(s, key) <= gamingBudgetMin(s, key) * MIN ? 10 : 0;
  return Math.round(water + gym + follow + gaming);
}

export type RestDays = Record<RoughKind, number>;

/**
 * The weekly report card. It judges the days something was logged that weren't rough ones (sick or
 * away, a low mood, a period day): rough days are left out and listed as rest, never counted as misses.
 * Mood and protein are shown but not graded. With nothing to judge, `overall` and `grade` are null.
 */
export function weekReport(s: State, weekOffset = 0, now = new Date()) {
  const monday = addDays(startOfWeek(now), weekOffset * 7);
  const dates = Array.from({ length: 7 }, (_, i) => addDays(monday, i)).filter((d) => d.getTime() <= startOfDay(now).getTime());
  const all = dates.map((d) => ({ date: d, key: dayKey(d), log: dayOf(s, dayKey(d)) }));
  const rest: RestDays = { paused: 0, low: 0, period: 0 };
  const logs = all.filter((x) => {
    const rough = roughDay(s, x.key);
    if (rough) rest[rough] += 1;
    return !rough && usedOn(s.days[x.key]);
  });
  const n = logs.length;
  const per = (k: number) => (n ? (k / n) * 100 : null);
  const st = s.settings;
  const cats: Category[] = [];

  const waterHit = logs.filter((x) => waterMl(x.log) >= waterGoalFor(s, x.key)).length;
  cats.push({
    id: 'water',
    label: 'Water',
    emoji: '💧',
    stat: `${waterHit}/${n} days on goal${n ? ` · avg ${(avg(logs.map((x) => waterMl(x.log))) / 1000).toFixed(1)} L` : ''}`,
    score: per(waterHit),
  });

  const planned = logs.filter((x) => workoutFor(s, x.date)).length;
  const trained = logs.filter((x) => trainedOn(x.log)).length;
  // A workout on a rest day still counts for you, never against you.
  const extra = all.filter((x) => !logs.includes(x) && trainedOn(x.log)).length;
  const minutes = all.reduce((a, x) => a + trainMinutes(x.log), 0);
  cats.push({
    id: 'gym',
    label: 'Gym',
    emoji: '🏋️',
    stat: `${trained}/${planned} planned workouts${extra ? ` (+${extra} on rest days)` : ''}${minutes ? ` · ${minutes} min trained` : ''}`,
    score: planned ? clamp01((trained + extra) / planned) * 100 : trained + extra ? 100 : null,
  });

  // Shown, never graded: what was eaten isn't something to score.
  const fed = all.filter((x) => x.log.food.length > 0);
  cats.push({
    id: 'protein',
    label: 'Protein',
    emoji: '🍗',
    stat: fed.length ? `avg ${Math.round(avg(fed.map((x) => proteinOf(x.log))))} g/day on ${fed.length} logged day${fed.length === 1 ? '' : 's'}` : 'nothing logged',
    score: null,
  });

  const walked = logs.filter((x) => x.log.steps != null);
  if (walked.length) {
    const a = avg(walked.map((x) => x.log.steps ?? 0));
    cats.push({ id: 'steps', label: 'Steps', emoji: '👣', stat: `avg ${Math.round(a).toLocaleString('sv-SE')}/day`, score: clamp01(a / st.stepGoal) * 100 });
  }

  const slept = logs.filter((x) => x.log.sleepMin != null);
  const rated = logs.filter((x) => x.log.sleepRating != null);
  if (slept.length || rated.length) {
    const h = slept.length ? avg(slept.map((x) => x.log.sleepMin ?? 0)) / 60 : null;
    const r = rated.length ? avg(rated.map((x) => x.log.sleepRating ?? 3)) : null;
    const parts = [h != null ? `avg ${h.toFixed(1)} h/night` : '', r != null ? `rated ${r.toFixed(1)}/5` : ''].filter(Boolean);
    const scores = [h != null ? clamp01((h - 5) / 3) * 100 : null, r != null ? ((r - 1) / 4) * 100 : null].filter((x): x is number => x != null);
    cats.push({ id: 'sleep', label: 'Sleep', emoji: '😴', stat: parts.join(' · '), score: avg(scores) });
  }

  const overDays = logs.filter((x) => gamingUsedMs(s, x.key) > gamingBudgetMin(s, x.key) * MIN).length;
  const totalMin = Math.round(all.reduce((a, x) => a + gamingUsedMs(s, x.key), 0) / MIN);
  const topGame = gameTotals(s, all.length, dates[dates.length - 1] ?? now).find((g) => g.game !== 'Unnamed');
  cats.push({
    id: 'gaming',
    label: 'Gaming',
    emoji: '🎮',
    stat: `${Math.floor(totalMin / 60)}h ${totalMin % 60}m total · ${overDays} days over budget${topGame ? ` · mostly ${topGame.game}` : ''}`,
    score: n ? (1 - overDays / n) * 100 : null,
  });

  const cups = logs.map((x) => coffeeOf(x.log).length);
  const coffeeOver = cups.filter((c) => c > st.coffeeLimit).length;
  cats.push({
    id: 'coffee',
    label: 'Coffee',
    emoji: '☕',
    stat: `avg ${avg(cups).toFixed(1)} cups/day · ${coffeeOver} days over limit`,
    score: n ? (1 - coffeeOver / n) * 100 : null,
  });

  // Shown, never graded: feelings aren't a performance.
  const moods = all.map((x) => avgMood(x.log)).filter((m): m is number => m != null);
  if (moods.length) {
    const top = emotionCounts(s, 7, dates[dates.length - 1] ?? now)[0];
    cats.push({
      id: 'mood',
      label: 'Mood',
      emoji: '🫀',
      stat: `avg ${avg(moods).toFixed(1)}/5${top ? ` · mostly ${top.emotion.toLowerCase()}` : ''} · ${all.reduce((a, x) => a + moodsOf(x.log).length, 0)} check-ins`,
      score: null,
    });
  }

  let due = 0;
  let doneHabits = 0;
  for (const x of logs) {
    const today = habitsFor(s, x.date);
    due += today.length;
    doneHabits += today.filter((h) => habitsDone(s, x.key).includes(h.id)).length;
  }
  if (due) cats.push({ id: 'habits', label: 'Habits', emoji: '✅', stat: `${doneHabits}/${due} done`, score: (doneHabits / due) * 100 });

  // Tasks: graded only in a week that had any. Up to 5 finished is full marks (fewer if fewer existed).
  const weekStart = monday.getTime();
  const weekEnd = addDays(monday, 7).getTime();
  const tasks = Array.from({ length: 7 }, (_, i) => doneTasksOn(s, dayKey(addDays(monday, i))).length).reduce((a, b) => a + b, 0);
  const onList = s.tasks.filter((t) => t.createdAt < weekEnd && (!t.done || (t.doneAt ?? 0) >= weekStart)).length;
  cats.push({ id: 'tasks', label: 'Tasks', emoji: '📋', stat: `${tasks} completed`, score: onList ? clamp01(tasks / Math.min(5, onList)) * 100 : null });

  // Quests against what each day actually offered (one on low-battery days).
  let offered = 0;
  let quests = 0;
  for (const x of logs) {
    const today = questsFor(s, x.date).length;
    offered += today;
    quests += Math.min(today, x.log.questsDone?.length ?? 0);
  }
  cats.push({ id: 'quests', label: 'Quests', emoji: '🗡️', stat: `${quests}/${offered} daily quests`, score: offered ? (quests / offered) * 100 : null });

  const scored = cats.filter((c): c is Category & { score: number } => c.score != null);
  const overall = n && scored.length ? Math.round(avg(scored.map((c) => c.score))) : null;
  const ranked = logs.map((x) => ({ key: x.key, score: dayScoreFor(s, x.date) })).sort((a, b) => b.score - a.score);

  return {
    monday,
    days: n,
    rest,
    restDays: rest.paused + rest.low + rest.period,
    categories: cats,
    overall,
    grade: overall == null ? null : gradeOf(overall),
    best: ranked[0] ?? null,
    worst: ranked.length > 1 ? ranked[ranked.length - 1] : null,
    boss: bossFor(s, monday),
  };
}
