// Weekly contract: early in the week, stake coins on a weekly goal. Reach it and the stake comes back
// double; miss it and S.P.I.D.E.R. keeps the coins, unless the week was a rough one (low mood or
// period days), then the stake comes back. Goals are counts within the week, never streaks.
import { addDays, dayKey, startOfDay, startOfWeek } from './dates';
import { dayOf, gamingBudgetMin, gamingUsedMs, moodsOf, onPeriod, trainedOn, waterMl } from './selectors';
import type { Contract, ContractGoal, State } from './types';

type GoalDef = {
  id: ContractGoal;
  target: number;
  title: (n: number) => string;
  available: (s: State) => boolean;
  /** How much one day adds. `final`: the day is over (gaming only counts finished days). */
  count: (s: State, key: string, final: boolean) => number;
};

export const CONTRACT_GOALS: GoalDef[] = [
  { id: 'train', target: 3, title: (n) => `Train on ${n} days`, available: () => true, count: (s, k) => (trainedOn(dayOf(s, k)) ? 1 : 0) },
  {
    id: 'water',
    target: 5,
    title: (n) => `Hit your water goal on ${n} days`,
    available: () => true,
    count: (s, k) => (waterMl(dayOf(s, k)) >= s.settings.waterGoalMl ? 1 : 0),
  },
  {
    id: 'steps',
    target: 4,
    title: (n) => `Hit your step goal on ${n} days`,
    available: (s) => Object.values(s.days).some((d) => d.steps != null),
    count: (s, k) => (dayOf(s, k).stepGoalHit ? 1 : 0),
  },
  { id: 'focus', target: 3, title: (n) => `Finish ${n} Web Focus sessions`, available: () => true, count: (s, k) => (dayOf(s, k).focus ?? []).filter((f) => !f.snapped).length },
  {
    id: 'habits',
    target: 4,
    title: (n) => `Do all your habits on ${n} days`,
    available: (s) => s.habits.length > 0,
    count: (s, k) => (dayOf(s, k).habitsAllDone ? 1 : 0),
  },
  {
    id: 'gaming',
    target: 5,
    title: (n) => `Stay within your gaming budget on ${n} days`,
    available: () => true,
    count: (s, k, final) => (final && gamingUsedMs(s, k) <= gamingBudgetMin(s, k) * 60_000 ? 1 : 0),
  },
  {
    id: 'tasks',
    target: 8,
    title: (n) => `Finish ${n} tasks`,
    available: (s) => s.tasks.some((t) => !t.done),
    count: (s, k) => s.tasks.filter((t) => t.done && t.doneAt && dayKey(t.doneAt) === k).length,
  },
];

export const STAKES = [100, 250, 500];

/** Contracts can be signed Monday to Wednesday, so there's a real week left to do it in. */
export const canSign = (now = new Date()) => [1, 2, 3].includes(now.getDay());

export const goalOf = (id: ContractGoal) => CONTRACT_GOALS.find((g) => g.id === id) ?? CONTRACT_GOALS[0];

/** The contract's days so far: from the day it was signed to today or its Sunday, whichever is first. */
function daysOf(c: Contract, now: Date) {
  const sunday = addDays(startOfWeek(new Date(`${c.week}T12:00`)), 6);
  const today = startOfDay(now);
  const keys: { key: string; final: boolean }[] = [];
  for (let d = new Date(`${c.from}T12:00`); dayKey(d) <= dayKey(sunday) && startOfDay(d) <= today; d = addDays(d, 1)) {
    keys.push({ key: dayKey(d), final: dayKey(d) < dayKey(today) });
  }
  return keys;
}

export function contractProgress(s: State, c: Contract, now = new Date()) {
  const goal = goalOf(c.goal);
  return daysOf(c, now).reduce((a, d) => a + goal.count(s, d.key, d.final), 0);
}

/** A rough week voids a missed contract: a low mood (1–2) or a period day while it ran. */
export function roughWeek(s: State, c: Contract, now = new Date()) {
  return daysOf(c, now).some(({ key }) => {
    const d = dayOf(s, key);
    return onPeriod(d) || moodsOf(d).some((m) => m.level <= 2);
  });
}
