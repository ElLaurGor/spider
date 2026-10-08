import { addDays, dayKey, MIN, startOfDay, startOfWeek } from './dates';
import { habitsDone, habitsFor } from './habits';
import { bossFor } from './quests';
import {
  avgMood,
  coffeeOf,
  dayOf,
  emotionCounts,
  gameTotals,
  gamingBudgetMin,
  gamingUsedMs,
  moodsOf,
  proteinOf,
  trainedOn,
  trainMinutes,
  waterMl,
  workoutFor,
} from './selectors';
import type { State } from './types';

export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';
export const gradeOf = (score: number): Grade => (score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : score >= 40 ? 'D' : 'F');

export type Category = { id: string; label: string; emoji: string; stat: string; score: number | null };

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** Simple 0–100 score for any past day (used for best/worst day). */
export function dayScoreFor(s: State, date: Date) {
  const key = dayKey(date);
  const d = dayOf(s, key);
  const water = clamp01(waterMl(d) / s.settings.waterGoalMl) * 30;
  const gym = !workoutFor(s, date) || trainedOn(d) ? 25 : 0;
  const protein = s.settings.proteinGoal ? clamp01(proteinOf(d) / s.settings.proteinGoal) * 20 : 20;
  const due = habitsFor(s, date);
  const habits = due.length ? (due.filter((h) => habitsDone(s, key).includes(h.id)).length / due.length) * 15 : 15;
  const gaming = gamingUsedMs(s, key) <= gamingBudgetMin(s, key) * MIN ? 10 : 0;
  return Math.round(water + gym + protein + habits + gaming);
}

export function weekReport(s: State, weekOffset = 0, now = new Date()) {
  const monday = addDays(startOfWeek(now), weekOffset * 7);
  const dates = Array.from({ length: 7 }, (_, i) => addDays(monday, i)).filter((d) => d.getTime() <= startOfDay(now).getTime());
  const logs = dates.map((d) => ({ date: d, key: dayKey(d), log: dayOf(s, dayKey(d)) }));
  const n = Math.max(1, logs.length);
  const st = s.settings;
  const cats: Category[] = [];

  const waterHit = logs.filter((x) => waterMl(x.log) >= st.waterGoalMl).length;
  cats.push({
    id: 'water',
    label: 'Water',
    emoji: '💧',
    stat: `${waterHit}/${n} days on goal · avg ${(avg(logs.map((x) => waterMl(x.log))) / 1000).toFixed(1)} L`,
    score: (waterHit / n) * 100,
  });

  const planned = logs.filter((x) => workoutFor(s, x.date)).length;
  const trained = logs.filter((x) => trainedOn(x.log)).length;
  const minutes = logs.reduce((a, x) => a + trainMinutes(x.log), 0);
  cats.push({
    id: 'gym',
    label: 'Gym',
    emoji: '🏋️',
    stat: `${trained}/${planned} planned workouts${minutes ? ` · ${minutes} min trained` : ''}`,
    score: planned ? clamp01(trained / planned) * 100 : trained ? 100 : null,
  });

  const fed = logs.filter((x) => x.log.food.length > 0);
  cats.push({
    id: 'protein',
    label: 'Protein',
    emoji: '🍗',
    stat: fed.length ? `avg ${Math.round(avg(fed.map((x) => proteinOf(x.log))))} g/day (goal ${st.proteinGoal})` : 'nothing logged',
    score: fed.length && st.proteinGoal ? clamp01(avg(fed.map((x) => proteinOf(x.log))) / st.proteinGoal) * 100 : null,
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
  const totalMin = Math.round(logs.reduce((a, x) => a + gamingUsedMs(s, x.key), 0) / MIN);
  const topGame = gameTotals(s, logs.length, dates[dates.length - 1] ?? now).find((g) => g.game !== 'Unnamed');
  cats.push({
    id: 'gaming',
    label: 'Gaming',
    emoji: '🎮',
    stat: `${Math.floor(totalMin / 60)}h ${totalMin % 60}m total · ${overDays} days over budget${topGame ? ` · mostly ${topGame.game}` : ''}`,
    score: (1 - overDays / n) * 100,
  });

  const cups = logs.map((x) => coffeeOf(x.log).length);
  const coffeeOver = cups.filter((c) => c > st.coffeeLimit).length;
  cats.push({
    id: 'coffee',
    label: 'Coffee',
    emoji: '☕',
    stat: `avg ${avg(cups).toFixed(1)} cups/day · ${coffeeOver} days over limit`,
    score: (1 - coffeeOver / n) * 100,
  });

  const moods = logs.map((x) => avgMood(x.log)).filter((m): m is number => m != null);
  if (moods.length) {
    const top = emotionCounts(s, 7, dates[dates.length - 1] ?? now)[0];
    cats.push({
      id: 'mood',
      label: 'Mood',
      emoji: '🫀',
      stat: `avg ${avg(moods).toFixed(1)}/5${top ? ` · mostly ${top.emotion.toLowerCase()}` : ''} · ${logs.reduce((a, x) => a + moodsOf(x.log).length, 0)} check-ins`,
      score: ((avg(moods) - 1) / 4) * 100,
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

  const weekStart = monday.getTime();
  const weekEnd = addDays(monday, 7).getTime();
  const tasks = s.tasks.filter((t) => t.doneAt && t.doneAt >= weekStart && t.doneAt < weekEnd).length;
  cats.push({ id: 'tasks', label: 'Tasks', emoji: '📋', stat: `${tasks} completed`, score: clamp01(tasks / 5) * 100 });

  const quests = logs.reduce((a, x) => a + (x.log.questsDone?.length ?? 0), 0);
  cats.push({ id: 'quests', label: 'Quests', emoji: '🗡️', stat: `${quests}/${n * 3} daily quests`, score: (quests / (n * 3)) * 100 });

  const scored = cats.filter((c): c is Category & { score: number } => c.score != null);
  const overall = Math.round(avg(scored.map((c) => c.score)));
  const ranked = logs.map((x) => ({ key: x.key, score: dayScoreFor(s, x.date) })).sort((a, b) => b.score - a.score);

  return {
    monday,
    days: logs.length,
    categories: cats,
    overall,
    grade: gradeOf(overall),
    best: ranked[0] ?? null,
    worst: ranked.length > 1 ? ranked[ranked.length - 1] : null,
    boss: bossFor(s, monday),
  };
}
