// A finished day keeps the goals it had. Settings, the weekly plan and habits change over time; without a
// snapshot, lowering the water goal or adding a habit today would rewrite last week's contracts, boss
// weaknesses, quests and day scores. Each day is frozen at the first rollover after it ends. Days from
// before snapshots existed get today's settings then, which is what they were being judged by anyway.
import { dayKey, isDayKey } from './dates';
import { habitsFor } from './habits';
import { dayOf, waterGoalParts, workoutFor } from './selectors';
import type { DayGoals, State } from './types';

/** A day's goals from the current settings, plan and habits (what an unfrozen day goes by). */
export function liveGoals(s: State, key: string): DayGoals {
  const date = new Date(`${key}T12:00`);
  return {
    water: waterGoalParts(s, key).ml,
    steps: s.settings.stepGoal,
    gaming: s.settings.gamingBudgetMin,
    protein: s.settings.proteinGoal,
    workout: workoutFor(s, date)?.name ?? null,
    habits: habitsFor(s, date).map((h) => h.id),
  };
}

/** The goals a day is judged by: its snapshot once it's over, else the live ones. */
export const goalsOn = (s: State, key = dayKey()): DayGoals => dayOf(s, key).goals ?? liveGoals(s, key);

/** Freezes every logged day before `today` that has no snapshot yet. Unchanged state when there's nothing to do. */
export function withGoals(s: State, today = dayKey()): State {
  let days = s.days;
  for (const [k, d] of Object.entries(s.days)) {
    if (d.goals || !isDayKey(k) || k >= today) continue;
    if (days === s.days) days = { ...s.days };
    days[k] = { ...d, goals: liveGoals(s, k) };
  }
  return days === s.days ? s : { ...s, days };
}
