import { dayKey, isDayKey } from './dates';
import type { DayLog, State } from './types';

export function emptyDay(): DayLog {
  return { water: [], food: [], sets: [], games: [], coffee: [], moods: [], bonusGameMin: 0 };
}

export function defaultState(): State {
  return {
    version: 1,
    onboarded: false,
    settings: {
      userName: '',
      savageLevel: 10,
      waterGoalMl: 2500,
      glassMl: 250,
      wakeHour: 7,
      sleepHour: 23,
      waterEveryMin: 90,
      kcalGoal: 2200,
      proteinGoal: 120,
      gamingBudgetMin: 120,
      gymHour: 18,
      gymMinute: 0,
      restSeconds: 90,
      caffeinePerCupMg: 90,
      coffeeLimit: 4,
      coffeeCutoffHour: 15,
      stepGoal: 8000,
      weather: null,
      allergies: [],
      pollenAlertLevel: 3,
      aqiAlert: 60,
      easyOnPeriod: true,
      phoneGamesCount: true,
      phoneLimitMin: 180,
      notify: { water: true, gym: true, morning: true, evening: true, gaming: true, mood: true, habits: true, report: true, sleep: true, cycle: true, countdowns: true, wrapped: true, windDown: true, league: true, pollen: true, air: true, smhi: true, vma: true, statusLine: false },
      respectMeetings: true,
      calendarIds: null,
      redDaysOff: false,
    },
    plan: {
      0: null,
      1: { name: 'Push', exercises: ['Bench press', 'Overhead press', 'Incline dumbbell press', 'Triceps pushdown'] },
      2: { name: 'Pull', exercises: ['Lat pulldown', 'Barbell row', 'Face pull', 'Biceps curl'] },
      3: null,
      4: { name: 'Legs', exercises: ['Squat', 'Romanian deadlift', 'Leg press', 'Calf raise'] },
      5: { name: 'Full body', exercises: ['Deadlift', 'Pull-up', 'Dumbbell press', 'Plank'] },
      6: null,
    },
    days: {},
    tasks: [],
    xp: 0,
    counters: { workouts: 0, tasksDone: 0, prs: 0, disciplinedStops: 0, quests: 0, bosses: 0 },
    achievements: {},
    prs: {},
    activeGame: null,
    restEndsAt: null,
    progressPhotos: [],
    habits: [],
    countdowns: [],
    coins: 0,
    coinsEarned: 0,
    rewards: [
      { id: 'r1', title: 'Pizza night', emoji: '🍕', cost: 800 },
      { id: 'r2', title: 'Lazy evening, zero guilt', emoji: '🛋️', cost: 400 },
      { id: 'r3', title: 'New game', emoji: '🎮', cost: 5000 },
    ],
    purchases: [],
    doubleXpUntil: null,
    bossBombs: {},
    league: null,
    activeFocus: null,
    trackers: [],
    bodyLog: [],
    secrets: {},
    seenAlerts: {},
    windDownItems: ['📵 Screens away', '🦷 Brush teeth', '🧘 Stretch 5 min', '📖 Read 10 min', '📝 Plan tomorrow'],
    bossesDefeated: {},
    lastBackupAt: null,
  };
}

/** When an entry was made: uid() starts with Date.now() in base 36 (8 digits until 2059). */
export function idTime(id: string) {
  const t = parseInt(id.slice(0, 8), 36);
  return Number.isFinite(t) && t > 1.5e12 && t < Date.now() + 86_400_000 ? t : null;
}

/**
 * Days saved under a key that isn't a date. The HQ coffee tile once passed its press event as the
 * day, so cups landed in "[object Object]" with no time. They go back to the day they were drunk
 * (the time comes from the id), marked `late` like any entry added afterwards: they count in that
 * day's totals but never for quests, bosses or contracts, and earn nothing now.
 */
export function withRealDays(days: State['days']): State['days'] {
  const junk = Object.keys(days).filter((k) => !isDayKey(k));
  if (!junk.length) return days;
  const out = { ...days };
  for (const k of junk) {
    for (const c of out[k]?.coffee ?? []) {
      const at = idTime(c.id);
      if (at == null) continue;
      const key = dayKey(at);
      const d = out[key] ?? emptyDay();
      if ((d.coffee ?? []).some((x) => x.id === c.id)) continue;
      out[key] = { ...d, coffee: [...(d.coffee ?? []), { ...c, at, late: true }].sort((a, b) => a.at - b.at) };
    }
    delete out[k];
  }
  return out;
}

/** Fills in fields added in newer versions so old saves keep working. */
export function hydrate(saved: Partial<State> | null): State {
  const base = defaultState();
  if (!saved) return base;
  return {
    ...base,
    ...saved,
    days: withRealDays(saved.days ?? base.days),
    settings: {
      ...base.settings,
      ...saved.settings,
      notify: { ...base.settings.notify, ...saved.settings?.notify },
    },
    plan: { ...base.plan, ...saved.plan },
    counters: { ...base.counters, ...saved.counters },
  };
}
