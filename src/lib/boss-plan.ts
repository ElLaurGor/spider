// The weekend finisher: on Saturday and Sunday, when what's still open today can finish the week's boss,
// the cheapest way to do it ("a workout + your water goal"). It tries the boss maths for real (bossFor):
// today's things are simulated on a copy of the day, so a day that starts hitting the weakness counts
// 50 % harder, all of that day's XP included, and quests they'd complete pay too. Theme-free.
import { dayKey } from './dates';
import { habitsDone, habitsFor } from './habits';
import { pausedOn } from './pause';
import { bossFor, questsFor } from './quests';
import { dayOf, stepGoalOn, trainedOn, waterGoalFor, waterMl, workoutFor } from './selectors';
import { toneOn } from './tone';
import type { DayLog, State } from './types';
import { activityXp, focusXp, XP } from './xp';

/** One thing still open today: what it's called, the XP it pays, how much of a push it is, and what it does to the day. */
type Step = { id: string; label: string; xp: number; effort: number; apply: (d: DayLog, at: number) => DayLog };

/** At most this many things in a plan: past that, it isn't a finishing line any more. */
const MAX_STEPS = 3;

/** What's still open today, cheapest first. Nothing food-related: what you eat is never a boss tactic. */
function openSteps(s: State, now: Date): Step[] {
  const key = dayKey(now);
  const d = dayOf(s, key);
  const steps: Step[] = [];

  const due = habitsFor(s, now).filter((h) => !habitsDone(s, key).includes(h.id));
  if (due.length) {
    steps.push({
      id: 'habits',
      label: due.length === 1 ? 'your habit' : `your ${due.length} habits`,
      xp: due.length * XP.habit + XP.habitsAll,
      effort: 1 + due.length * 0.5,
      apply: (x) => ({ ...x, habits: [...new Set([...(x.habits ?? []), ...due.map((h) => h.id)])] }),
    });
  }

  const open = s.tasks.filter((t) => !t.done).length;
  if (open > 0) {
    steps.push({
      id: 'task',
      label: 'one task',
      xp: XP.task,
      effort: 1,
      apply: (x, at) => ({ ...x, doneTasks: [...(x.doneTasks ?? []), { id: 'plan-task', at }] }),
    });
  }

  if (!(d.moods ?? []).length) {
    steps.push({
      id: 'mood',
      label: 'a mood check-in',
      xp: XP.mood,
      effort: 1,
      apply: (x, at) => ({ ...x, moods: [...(x.moods ?? []), { id: 'plan-mood', level: 3, emotions: [], at }] }),
    });
  }

  steps.push({
    id: 'focus',
    label: 'a 25-min Web Focus',
    xp: focusXp(25),
    effort: 2,
    apply: (x, at) => ({ ...x, focus: [...(x.focus ?? []), { id: 'plan-focus', start: at - 25 * 60_000, end: at, minutes: 25 }] }),
  });

  const goal = waterGoalFor(s, key);
  const ml = waterMl(d);
  if (!d.waterGoalHit && ml < goal) {
    const glasses = Math.ceil((goal - ml) / Math.max(1, s.settings.glassMl));
    steps.push({
      id: 'water',
      label: 'your water goal',
      xp: XP.waterGoal + glasses * XP.water,
      effort: 1 + glasses * 0.3,
      apply: (x, at) => ({ ...x, water: [...x.water, { id: 'plan-water', ml: goal - ml, at }] }),
    });
  }

  const stepGoal = stepGoalOn(s, key);
  if (d.steps != null && !d.stepGoalHit && d.steps < stepGoal) {
    steps.push({ id: 'steps', label: 'your step goal', xp: XP.stepGoal, effort: 3, apply: (x) => ({ ...x, steps: stepGoal, stepGoalHit: true }) });
  }

  if (!trainedOn(d)) {
    const plan = workoutFor(s, now);
    steps.push({
      id: 'workout',
      label: plan ? `today's ${plan.name} workout` : 'a workout',
      xp: XP.workout + activityXp(45),
      effort: 4,
      apply: (x, at) => ({ ...x, activities: [...(x.activities ?? []), { id: 'plan-workout', kind: 'machines', minutes: 45, at }] }),
    });
  }
  return steps;
}

/** The state after doing `steps` today: the day's entries and the XP they (and any quests they finish) pay. */
function simulate(s: State, steps: Step[], now: Date): State {
  const key = dayKey(now);
  const at = now.getTime();
  const d0 = dayOf(s, key);
  let d = d0;
  let xp = 0;
  for (const st of steps) {
    d = st.apply(d, at);
    xp += st.xp;
  }
  const sim: State = { ...s, days: { ...s.days, [key]: d } };
  const done = d0.questsDone ?? [];
  const quests = questsFor(sim, now);
  const finished = quests.filter((q) => !done.includes(q.id) && q.progress >= q.target);
  xp += finished.reduce((a, q) => a + q.xp, 0);
  if (!d0.questsAllDone && quests.length && quests.every((q) => done.includes(q.id) || q.progress >= q.target)) xp += XP.questsAll;
  return { ...sim, days: { ...sim.days, [key]: { ...d, xpEarned: (d.xpEarned ?? 0) + xp } } };
}

/** `plan`: the steps as one phrase, capitalised ("Today's Push workout + your water goal"). */
export type Finisher = { boss: string; emoji: string; hp: number; plan: string; steps: string[] };

/**
 * Saturday and Sunday: the boss still standing, and the cheapest set of today's open things (at most three)
 * that would finish it. Null on weekdays, when it's down, when nothing today would do it, and on paused or
 * kind days (no pushing then).
 */
export function bossFinisher(s: State, now = new Date()): Finisher | null {
  if (!s.onboarded || (now.getDay() !== 6 && now.getDay() !== 0)) return null;
  const key = dayKey(now);
  if (pausedOn(s, key) || toneOn(s, key, now).kind) return null;
  const boss = bossFor(s, now, now);
  if (boss.defeated || boss.hp <= 0) return null;
  const steps = openSteps(s, now);
  let best: { steps: Step[]; effort: number } | null = null;
  for (let mask = 1; mask < 1 << steps.length; mask++) {
    const pick = steps.filter((_, i) => mask & (1 << i));
    if (pick.length > MAX_STEPS) continue;
    const effort = pick.reduce((a, x) => a + x.effort, 0);
    if (best && (pick.length > best.steps.length || (pick.length === best.steps.length && effort >= best.effort))) continue;
    if (bossFor(simulate(s, pick, now), now, now).hp > 0) continue;
    best = { steps: pick, effort };
  }
  if (!best) return null;
  const labels = best.steps.map((x) => x.label);
  const plan = labels.join(' + ');
  // It opens a sentence in every line ("{plan} ends it.").
  return { boss: boss.name, emoji: boss.emoji, hp: boss.hp, plan: plan[0].toUpperCase() + plan.slice(1), steps: labels };
}
