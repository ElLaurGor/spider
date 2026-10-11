// Daily quests (3 per day, picked from a pool that fits your setup) and a weekly
// boss whose HP drops with every XP you earn that week.
import { addDays, dayKey, startOfWeek } from './dates';
import { habitsDone, habitsFor } from './habits';
import {
  dayOf,
  gamingBudgetMin,
  gamingUsedMs,
  liveWaterMl,
  lowBattery,
  moodsOf,
  proteinOf,
  trainedOn,
  trainMinutes,
  waterMl,
  workoutFor,
} from './selectors';
import { seasonOn, type SeasonId } from './seasons';
import type { DayLog, State } from './types';
import { levelForXp } from './xp';

export type Quest = {
  id: string;
  title: string;
  progress: number;
  target: number;
  xp: number;
};

type QuestDef = {
  id: string;
  xp: number;
  season?: SeasonId; // only during that season, and then one of the day's three is always seasonal
  available: (s: State, date: Date) => boolean;
  build: (s: State, d: DayLog, date: Date) => { title: string; progress: number; target: number };
};

const before = (d: DayLog, hour: number) => d.water.filter((w) => new Date(w.at).getHours() < hour).length;
const tasksDoneOn = (s: State, date: Date) => s.tasks.filter((t) => t.done && t.doneAt && dayKey(t.doneAt) === dayKey(date)).length;
const hasSteps = (s: State) => Object.values(s.days).some((d) => d.steps != null);
// Only entries whose time can't be edited afterwards, logged on the day itself.
const loggedBefore8 = (d: DayLog) => [...d.water, ...d.sets, ...(d.moods ?? [])].some((x) => !('late' in x && x.late) && new Date(x.at).getHours() < 8);

const QUESTS: QuestDef[] = [
  { id: 'water_noon', xp: 20, available: () => true, build: (_s, d) => ({ title: 'Drink 3 glasses before 12:00', progress: before(d, 12), target: 3 }) },
  { id: 'early_sip', xp: 10, available: () => true, build: (_s, d) => ({ title: 'Log water before 09:00', progress: before(d, 9), target: 1 }) },
  {
    id: 'water_goal',
    xp: 20,
    available: () => true,
    build: (s, d) => ({ title: `Drink ${(s.settings.waterGoalMl / 1000).toFixed(1)} L`, progress: waterMl(d), target: s.settings.waterGoalMl }),
  },
  {
    id: 'protein',
    xp: 20,
    available: (s) => s.settings.proteinGoal > 0,
    build: (s, d) => ({ title: `Eat ${s.settings.proteinGoal} g protein`, progress: proteinOf(d), target: s.settings.proteinGoal }),
  },
  { id: 'meals', xp: 15, available: () => true, build: (_s, d) => ({ title: 'Log 3 meals', progress: d.food.length, target: 3 }) },
  {
    id: 'workout',
    xp: 25,
    available: (s, date) => !!workoutFor(s, date),
    build: (s, d, date) => ({ title: `Do today's ${workoutFor(s, date)?.name ?? ''} workout`, progress: trainedOn(d) ? 1 : 0, target: 1 }),
  },
  { id: 'train_minutes', xp: 25, available: (s, date) => !!workoutFor(s, date), build: (_s, d) => ({ title: 'Train for 45 minutes', progress: trainMinutes(d), target: 45 }) },
  {
    id: 'steps',
    xp: 25,
    available: (s) => Object.values(s.days).some((d) => d.steps != null),
    build: (s, d) => ({ title: `Walk ${s.settings.stepGoal.toLocaleString('sv-SE')} steps`, progress: d.steps ?? 0, target: s.settings.stepGoal }),
  },
  {
    id: 'steps_hard',
    xp: 35,
    available: (s) => Object.values(s.days).some((d) => d.steps != null),
    build: (_s, d) => ({ title: 'Walk 12 000 steps', progress: d.steps ?? 0, target: 12_000 }),
  },
  {
    id: 'tasks',
    xp: 20,
    available: (s) => s.tasks.some((t) => !t.done),
    build: (s, _d, date) => ({
      title: 'Finish 3 tasks',
      progress: tasksDoneOn(s, date),
      target: 3,
    }),
  },
  { id: 'bonus_time', xp: 20, available: () => true, build: (_s, d) => ({ title: 'Earn 30 bonus gaming minutes', progress: d.bonusGameMin, target: 30 }) },
  { id: 'mood', xp: 15, available: () => true, build: (_s, d) => ({ title: 'Check in your mood twice', progress: moodsOf(d).length, target: 2 }) },
  {
    id: 'habits',
    xp: 25,
    available: (s, date) => habitsFor(s, date).length > 0,
    build: (s, _d, date) => {
      const due = habitsFor(s, date);
      const done = habitsDone(s, dayKey(date));
      return { title: 'Complete all your habits', progress: due.filter((h) => done.includes(h.id)).length, target: due.length };
    },
  },
  {
    id: 'progress_photo',
    xp: 20,
    available: (s, date) => {
      const last = s.progressPhotos[s.progressPhotos.length - 1];
      return !last || date.getTime() - last.at > 6 * 86_400_000;
    },
    build: (s, _d, date) => ({
      title: 'Take a progress photo',
      progress: s.progressPhotos.some((p) => dayKey(p.at) === dayKey(date)) ? 1 : 0,
      target: 1,
    }),
  },

  // ---- seasonal (seasons.ts) ----
  { id: 'hw_potion', xp: 30, season: 'halloween', available: () => true, build: (_s, d) => ({ title: '🎃 Brew the potion: 4 glasses of water before 15:00', progress: before(d, 15), target: 4 }) },
  {
    id: 'hw_crypt',
    xp: 30,
    season: 'halloween',
    available: () => true,
    build: (_s, d) => ({ title: '🎃 Escape the crypt: train, or walk 8 000 steps', progress: trainedOn(d) || (d.steps ?? 0) >= 8000 ? 1 : 0, target: 1 }),
  },
  {
    id: 'hw_exorcise',
    xp: 30,
    season: 'halloween',
    available: (s) => s.tasks.some((t) => !t.done),
    build: (s, _d, date) => ({ title: '🎃 Exorcise 2 tasks from your list', progress: tasksDoneOn(s, date), target: 2 }),
  },
  { id: 'hw_seance', xp: 25, season: 'halloween', available: () => true, build: (_s, d) => ({ title: '🎃 Hold a séance: check in your mood', progress: moodsOf(d).length, target: 1 }) },
  { id: 'lucia_light', xp: 40, season: 'lucia', available: () => true, build: (_s, d) => ({ title: '🕯️ Bring the light: log something before 08:00', progress: loggedBefore8(d) ? 1 : 0, target: 1 }) },
  { id: 'solstice_walk', xp: 40, season: 'solstice', available: hasSteps, build: (_s, d) => ({ title: '🌑 Darkest day: walk 5 000 steps anyway', progress: d.steps ?? 0, target: 5000 }) },
  {
    id: 'solstice_water',
    xp: 40,
    season: 'solstice',
    available: (s) => !hasSteps(s),
    build: (s, d) => ({ title: '🌑 Darkest day: hit your water goal anyway', progress: waterMl(d), target: s.settings.waterGoalMl }),
  },
];

const hash = (str: string) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
};

/** Picks 3 quests for a day (one seasonal, in season); the same day always gets the same picks. */
export function pickQuests(s: State, date = new Date()) {
  const key = dayKey(date);
  const season = seasonOn(date)?.id;
  const pool = QUESTS.filter((q) => (!q.season || q.season === season) && q.available(s, date));
  const ranked = (qs: QuestDef[]) => qs.map((q) => ({ id: q.id, r: hash(`${key}:${q.id}`) })).sort((a, b) => a.r - b.r);
  const seasonal = ranked(pool.filter((q) => q.season)).slice(0, 1);
  return [...seasonal, ...ranked(pool.filter((q) => !q.season))]
    .slice(0, 3)
    .map((q) => q.id);
}

export function questsFor(s: State, date = new Date()): Quest[] {
  const d = dayOf(s, dayKey(date));
  const picked = d.quests ?? pickQuests(s, date);
  // Low-battery mode: just one quest today.
  const ids = lowBattery(d) ? picked.slice(0, 1) : picked;
  return ids.flatMap((id) => {
    const def = QUESTS.find((q) => q.id === id);
    if (!def) return [];
    const q = def.build(s, d, date);
    return [{ id, xp: def.xp, ...q, progress: Math.min(q.progress, q.target) }];
  });
}

// ---- weekly boss ----

export const BOSSES = [
  { id: 'procrastinator', name: 'The Procrastinator', emoji: '🦥' },
  { id: 'couch_goblin', name: 'The Couch Goblin', emoji: '🛋️' },
  { id: 'doomscroll', name: 'Lord Doomscroll', emoji: '📱' },
  { id: 'snooze', name: 'The Snooze Button', emoji: '⏰' },
  { id: 'dehydration', name: 'Captain Dehydration', emoji: '🏜️' },
  { id: 'leg_day', name: 'Sir Skips-Leg-Day', emoji: '🦵' },
  { id: 'sugar_baron', name: 'The Sugar Baron', emoji: '🍩' },
  { id: 'binge', name: 'The Binge Necromancer', emoji: '📺' },
] as const;

export const weekKey = (date: Date | number = new Date()) => dayKey(startOfWeek(date));

/** Each boss's weakness: on days that meet it, the XP earned that day hits it twice. Nothing food-related. */
export const WEAKNESS: Record<(typeof BOSSES)[number]['id'], { label: string; hit: (s: State, d: DayLog, key: string) => boolean }> = {
  procrastinator: { label: 'finishing tasks', hit: (s, _d, key) => s.tasks.some((t) => t.done && t.doneAt && dayKey(t.doneAt) === key) },
  couch_goblin: { label: 'moving: step goal or training', hit: (_s, d) => !!d.stepGoalHit || trainedOn(d) },
  doomscroll: { label: 'finishing a Web Focus session', hit: (_s, d) => (d.focus ?? []).some((f) => !f.snapped) },
  snooze: { label: 'logging something before 08:00', hit: (_s, d) => loggedBefore8(d) },
  dehydration: { label: 'hitting your water goal', hit: (s, d) => liveWaterMl(d) >= s.settings.waterGoalMl },
  leg_day: { label: 'training', hit: (_s, d) => trainedOn(d) },
  sugar_baron: { label: 'checking off a habit', hit: (s, _d, key) => habitsDone(s, key).length > 0 },
  // Only finished days: today isn't within budget until it's over.
  binge: { label: 'staying within your gaming budget', hit: (s, _d, key) => key < dayKey() && gamingUsedMs(s, key) <= gamingBudgetMin(s, key) * 60_000 },
};

/** Every boss dresses up for spooky season. Same boss underneath (id, weakness, taunts). */
const HALLOWEEN: Record<(typeof BOSSES)[number]['id'], { name: string; emoji: string }> = {
  procrastinator: { name: 'The Procrastimummy', emoji: '🧟' },
  couch_goblin: { name: 'The Couch Ghoul', emoji: '👻' },
  doomscroll: { name: 'Count Doomscrollula', emoji: '🧛' },
  snooze: { name: 'The Snooze Banshee', emoji: '😱' },
  dehydration: { name: 'Captain Dehydration, Skeleton Crew', emoji: '💀' },
  leg_day: { name: 'Sir Skips-Leg-Day the Headless', emoji: '🎃' },
  sugar_baron: { name: 'The Sugar Phantom', emoji: '🕯️' },
  binge: { name: 'The Binge Necromancer, Unholy Edition', emoji: '⚰️' },
};

export function bossFor(s: State, date: Date | number = new Date()) {
  const monday = startOfWeek(date);
  const weekIndex = Math.floor(monday.getTime() / (7 * 86_400_000));
  const base = BOSSES[weekIndex % BOSSES.length];
  const boss = seasonOn(date)?.id === 'halloween' ? { ...base, ...HALLOWEEN[base.id] } : base;
  const weakness = WEAKNESS[base.id];
  let healed = 0;
  let damage = 0;
  let bonus = 0; // extra damage from days that hit the weakness
  for (let i = 0; i < 7; i++) {
    const day = dayKey(addDays(monday, i));
    const d = dayOf(s, day);
    healed += Math.max(0, (d.screen?.doomMin ?? 0) - 60);
    const xp = d.xpEarned ?? 0;
    damage += xp;
    if (xp > 0 && weakness.hit(s, d, day)) bonus += xp;
  }
  const maxHp = 500 + 50 * levelForXp(s.xp) + healed;
  const key = dayKey(monday);
  damage += bonus + (s.bossBombs?.[key] ?? 0);
  return {
    ...boss,
    key,
    maxHp,
    damage,
    healed,
    bonus,
    weakness: weakness.label,
    hp: Math.max(0, maxHp - damage),
    defeated: !!s.bossesDefeated[key],
  };
}
