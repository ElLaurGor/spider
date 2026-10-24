// Daily quests (3 per day, picked from a pool that fits your setup) and a weekly
// boss whose HP drops with every XP you earn that week. Its HP follows your own pace.
import { addDays, dayKey, startOfWeek } from './dates';
import { habitsDone, habitsFor } from './habits';
import {
  dayOf,
  doneTasksOn,
  gamingBudgetMin,
  gamingUsedMs,
  lowBattery,
  moodsOf,
  proteinGoalOn,
  proteinOf,
  stepGoalOn,
  trainedOn,
  trainMinutes,
  waterGoalFor,
  waterGoalMet,
  waterMl,
  workoutFor,
} from './selectors';
import { pausedOn } from './pause';
import { seasonOn, type SeasonId } from './seasons';
import { eggsFoundOn, eggsLeft, oldTasksDoneOn, staleTasks } from './traditions';
import type { DayLog, State } from './types';
import { WEAK_SPOT_QUESTS, weakSpot } from './weak-spot';
import { healShare } from './perks';
import { BONUS_MIN, levelForXp, XP } from './xp';
import { unreward } from './ledger';
import { withoutCrit } from './critters';

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
  reduced?: boolean; // only ever the one quest of a reduced day (GENTLE), never in the normal draw
  extra?: boolean; // offered in the morning draft only, never one of the defaults (an optional seasonal one)
  available: (s: State, date: Date) => boolean;
  build: (s: State, d: DayLog, date: Date) => { title: string; progress: number; target: number };
};

const before = (d: DayLog, hour: number) => d.water.filter((w) => new Date(w.at).getHours() < hour).length;
const tasksDoneOn = (s: State, date: Date) => doneTasksOn(s, dayKey(date)).length;
const hasSteps = (s: State) => Object.values(s.days).some((d) => d.steps != null);
// Only entries whose time can't be edited afterwards, logged on the day itself.
const loggedBefore8 = (d: DayLog) => [...d.water, ...d.sets, ...(d.moods ?? [])].some((x) => !('late' in x && x.late) && new Date(x.at).getHours() < 8);

const QUESTS: QuestDef[] = [
  { id: 'water_noon', xp: 10, available: () => true, build: (_s, d) => ({ title: 'Drink 3 glasses before 12:00', progress: before(d, 12), target: 3 }) },
  { id: 'early_sip', xp: 5, available: () => true, build: (_s, d) => ({ title: 'Log water before 09:00', progress: before(d, 9), target: 1 }) },
  {
    id: 'water_goal',
    xp: 10,
    available: () => true,
    build: (s, d, date) => ({ title: `Drink ${(waterGoalFor(s, dayKey(date)) / 1000).toFixed(1)} L`, progress: waterMl(d), target: waterGoalFor(s, dayKey(date)) }),
  },
  {
    id: 'protein',
    xp: 10,
    available: (s, date) => proteinGoalOn(s, dayKey(date)) > 0,
    build: (s, d, date) => ({ title: `Eat ${proteinGoalOn(s, dayKey(date))} g protein`, progress: proteinOf(d), target: proteinGoalOn(s, dayKey(date)) }),
  },
  { id: 'meals', xp: 8, available: () => true, build: (_s, d) => ({ title: 'Log 3 meals', progress: d.food.length, target: 3 }) },
  {
    id: 'workout',
    xp: 15,
    available: (s, date) => !!workoutFor(s, date),
    // A workout moved off today (workout-move.ts) leaves the quest picked: any training still finishes it.
    build: (s, d, date) => {
      const name = workoutFor(s, date)?.name;
      return { title: name ? `Do today's ${name} workout` : 'Do a workout', progress: trainedOn(d) ? 1 : 0, target: 1 };
    },
  },
  { id: 'train_minutes', xp: 15, available: (s, date) => !!workoutFor(s, date), build: (_s, d) => ({ title: 'Train for 45 minutes', progress: trainMinutes(d), target: 45 }) },
  {
    id: 'steps',
    xp: 15,
    available: (s) => Object.values(s.days).some((d) => d.steps != null),
    build: (s, d, date) => ({ title: `Walk ${stepGoalOn(s, dayKey(date)).toLocaleString('sv-SE')} steps`, progress: d.steps ?? 0, target: stepGoalOn(s, dayKey(date)) }),
  },
  {
    id: 'steps_hard',
    xp: 20,
    available: (s) => Object.values(s.days).some((d) => d.steps != null),
    build: (_s, d) => ({ title: 'Walk 12 000 steps', progress: d.steps ?? 0, target: 12_000 }),
  },
  {
    id: 'tasks',
    xp: 10,
    available: (s) => s.tasks.some((t) => !t.done),
    build: (s, _d, date) => ({
      title: 'Finish 3 tasks',
      progress: tasksDoneOn(s, date),
      target: 3,
    }),
  },
  // earned minutes only: bought ones (shop) and chest prizes don't count
  { id: 'bonus_time', xp: 10, available: () => true, build: (_s, d) => ({ title: 'Earn 30 bonus gaming minutes', progress: d.bonusEarnedMin ?? d.bonusGameMin, target: 30 }) },
  { id: 'mood', xp: 8, available: () => true, build: (_s, d) => ({ title: 'Check in your mood twice', progress: moodsOf(d).length, target: 2 }) },
  {
    id: 'habits',
    xp: 15,
    available: (s, date) => habitsFor(s, date).length > 0,
    build: (s, _d, date) => {
      const due = habitsFor(s, date);
      const done = habitsDone(s, dayKey(date));
      return { title: 'Complete all your habits', progress: due.filter((h) => done.includes(h.id)).length, target: due.length };
    },
  },
  // ---- reduced days (sick, away, low battery): one gentle quest instead of three ----
  { id: 'checkin', xp: 8, reduced: true, available: () => true, build: (_s, d) => ({ title: 'Check in once: how are you doing?', progress: moodsOf(d).length, target: 1 }) },
  { id: 'sip', xp: 5, reduced: true, available: () => true, build: (_s, d) => ({ title: 'Drink one glass of water', progress: d.water.length, target: 1 }) },

  // ---- seasonal (seasons.ts) ----
  { id: 'hw_potion', xp: 15, season: 'halloween', available: () => true, build: (_s, d) => ({ title: '🎃 Brew the potion: 4 glasses of water before 15:00', progress: before(d, 15), target: 4 }) },
  {
    id: 'hw_crypt',
    xp: 15,
    season: 'halloween',
    available: () => true,
    build: (_s, d) => ({ title: '🎃 Escape the crypt: train, or walk 8 000 steps', progress: trainedOn(d) || (d.steps ?? 0) >= 8000 ? 1 : 0, target: 1 }),
  },
  {
    id: 'hw_exorcise',
    xp: 15,
    season: 'halloween',
    available: (s) => s.tasks.some((t) => !t.done),
    build: (s, _d, date) => ({ title: '🎃 Exorcise 2 tasks from your list', progress: tasksDoneOn(s, date), target: 2 }),
  },
  { id: 'hw_seance', xp: 12, season: 'halloween', available: () => true, build: (_s, d) => ({ title: '🎃 Hold a séance: check in your mood', progress: moodsOf(d).length, target: 1 }) },
  { id: 'lucia_light', xp: 20, season: 'lucia', available: () => true, build: (_s, d) => ({ title: '🕯️ Bring the light: log something before 08:00', progress: loggedBefore8(d) ? 1 : 0, target: 1 }) },
  {
    id: 'advent_candle',
    xp: 15,
    season: 'advent',
    extra: true, // Advent Sundays: on offer in the draft, never forced
    available: (s, date) => date.getDay() === 0 && s.tasks.some((t) => !t.done),
    build: (s, _d, date) => ({
      title: '🕯️ Light a candle: finish a task before 12:00',
      progress: doneTasksOn(s, dayKey(date)).some((t) => new Date(t.at).getHours() < 12) ? 1 : 0,
      target: 1,
    }),
  },
  { id: 'solstice_walk', xp: 20, season: 'solstice', available: hasSteps, build: (_s, d) => ({ title: '🌑 Darkest day: walk 5 000 steps anyway', progress: d.steps ?? 0, target: 5000 }) },
  {
    id: 'solstice_water',
    xp: 20,
    season: 'solstice',
    available: (s) => !hasSteps(s),
    build: (s, d, date) => ({ title: '🌑 Darkest day: hit your water goal anyway', progress: waterMl(d), target: waterGoalFor(s, dayKey(date)) }),
  },
  // Julfrid: one easy outing in the few hours of daylight. Also the gentle quest on a Julfrid day off.
  { id: 'jul_walk', xp: 15, season: 'jul', available: hasSteps, build: (_s, d) => ({ title: '🎄 A walk while it is light: 3 000 steps', progress: d.steps ?? 0, target: 3000 }) },
  // cluster F: the Swedish year (seasons.ts, traditions.ts). Nothing food-themed.
  {
    id: 'easter_egg',
    xp: 15,
    season: 'easter',
    available: (s, date) => eggsLeft(s, date) > 0,
    build: (s, _d, date) => ({ title: '🐣 Find an egg hidden somewhere in the app', progress: eggsFoundOn(s, date), target: 1 }),
  },
  { id: 'easter_spring', xp: 15, season: 'easter', available: () => true, build: (_s, d) => ({ title: '🐣 Spring clean: 3 glasses of water before 12:00', progress: before(d, 12), target: 3 }) },
  {
    id: 'valborg_fire',
    xp: 15,
    season: 'valborg',
    available: (s, date) => staleTasks(s, date.getTime()).length > 0,
    build: (s, d, date) => {
      const done = (d.burned ?? 0) + oldTasksDoneOn(s, date);
      return { title: '🔥 Feed the bonfire: burn or finish old tasks', progress: done, target: Math.max(1, Math.min(3, done + staleTasks(s, date.getTime()).length)) };
    },
  },
  {
    id: 'valborg_walk',
    xp: 15,
    season: 'valborg',
    available: () => true,
    build: (_s, d) => ({ title: '🔥 Walk to the bonfire: train, or walk 6 000 steps', progress: trainedOn(d) || (d.steps ?? 0) >= 6000 ? 1 : 0, target: 1 }),
  },
  { id: 'midsommar_out', xp: 20, season: 'midsommar', available: hasSteps, build: (_s, d) => ({ title: '🌼 Lightest days: walk 8 000 steps outside', progress: d.steps ?? 0, target: 8000 }) },
  {
    id: 'midsommar_water',
    xp: 20,
    season: 'midsommar',
    available: (s) => !hasSteps(s),
    build: (s, d, date) => ({ title: '🌼 Midsommar sun: hit your water goal', progress: waterMl(d), target: waterGoalFor(s, dayKey(date)) }),
  },
  {
    id: 'nyar_close',
    xp: 20,
    season: 'nyar',
    available: (s, date) => date.getMonth() === 11 && s.tasks.some((t) => !t.done), // New Year's Eve: on 1 Jan the year is closed
    build: (s, _d, date) => ({ title: '🎆 Close the year: finish 3 tasks', progress: tasksDoneOn(s, date), target: 3 }),
  },
  { id: 'nyar_fresh', xp: 20, season: 'nyar', available: () => true, build: (_s, d) => ({ title: '🎆 Fresh start: 3 glasses of water before 12:00', progress: before(d, 12), target: 3 }) },
];

const hash = (str: string) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
};

/**
 * Picks 3 quests for a day (one seasonal, in season); the same day always gets the same picks.
 * When the last 7 days had a weak spot (weak-spot.ts), the second slot goes to a quest that works on it.
 */
export function pickQuestsWithFocus(s: State, date = new Date()) {
  const key = dayKey(date);
  const season = seasonOn(date)?.id;
  const pool = QUESTS.filter((q) => !q.reduced && !q.extra && (!q.season || q.season === season) && q.available(s, date));
  const ranked = (qs: QuestDef[]) => qs.map((q) => ({ id: q.id, r: hash(`${key}:${q.id}`) })).sort((a, b) => a.r - b.r);
  const seasonal = ranked(pool.filter((q) => q.season)).slice(0, 1);
  const rest = ranked(pool.filter((q) => !q.season));
  let ids = [...seasonal, ...rest].slice(0, 3).map((q) => q.id);
  const spot = weakSpot(s, date);
  const aimed = spot ? WEAK_SPOT_QUESTS[spot].find((id) => rest.some((q) => q.id === id)) : undefined;
  if (spot && aimed) {
    ids = ids.filter((id) => id !== aimed);
    ids.splice(1, 0, aimed);
    ids = ids.slice(0, 3);
  }
  return { ids, focus: spot && aimed ? { id: aimed, spot } : null };
}

export const pickQuests = (s: State, date = new Date()) => pickQuestsWithFocus(s, date).ids;

// ---- the morning draft: 5 on offer, you keep 3 ----

/** How many quests the morning draft offers, and the hour it closes (whatever is picked by then stands). */
export const DRAFT_SIZE = 5;
export const DRAFT_UNTIL_HOUR = 12;

/**
 * The morning draft: the day's default 3 (pickQuestsWithFocus, weak-spot quest included) plus 2 more to
 * choose from, the same all day. In season one of the extras is seasonal too, when there's another, so the
 * season is on offer without being forced.
 */
export function draftFor(s: State, date = new Date()) {
  const key = dayKey(date);
  const season = seasonOn(date)?.id;
  const { ids, focus } = pickQuestsWithFocus(s, date);
  const pool = QUESTS.filter((q) => !q.reduced && !ids.includes(q.id) && (!q.season || q.season === season) && q.available(s, date));
  const ranked = (qs: QuestDef[]) =>
    qs
      .map((q) => ({ id: q.id, r: hash(`${key}:draft:${q.id}`) }))
      .sort((a, b) => a.r - b.r)
      .map((x) => x.id);
  const extras = [...ranked(pool.filter((q) => q.season)).slice(0, 1), ...ranked(pool.filter((q) => !q.season))].slice(0, DRAFT_SIZE - ids.length);
  return { candidates: [...ids, ...extras], defaults: ids, focus };
}

/** Whether quest `id` is already met on `date` (picking it now would pay out at once). */
export function questMet(s: State, id: string, date = new Date()) {
  const def = QUESTS.find((q) => q.id === id);
  if (!def) return false;
  const b = def.build(s, dayOf(s, dayKey(date)), date);
  return b.progress >= b.target;
}

/** The draft is open on a normal day until noon, until it's locked in, or until every quest is done. */
export function draftOpen(s: State, now = new Date()) {
  const key = dayKey(now);
  const d = dayOf(s, key);
  return !!d.questDraft && !d.questDraft.locked && !d.questsAllDone && !reducedDay(s, key) && now.getHours() < DRAFT_UNTIL_HOUR;
}

/**
 * Whether quest `id` can be in today's three: it's on offer, and it's either already one of them or not
 * yet met (picking a finished one would be free XP). A quest already completed today can't be dropped.
 */
export function draftPickable(s: State, id: string, now = new Date()) {
  const d = dayOf(s, dayKey(now));
  if (!d.questDraft?.candidates.includes(id)) return false;
  return (d.quests ?? []).includes(id) || !questMet(s, id, now);
}

/** A valid pick: three different quests on offer, all pickable, keeping every quest already done today. */
export function validDraft(s: State, ids: string[], now = new Date()) {
  const d = dayOf(s, dayKey(now));
  if (ids.length !== 3 || new Set(ids).size !== 3) return false;
  if ((d.questsDone ?? []).some((id) => !ids.includes(id))) return false;
  return ids.every((id) => draftPickable(s, id, now));
}

/** The XP a quest pays (0 for an id that's gone). */
export const questXpOf = (id: string) => QUESTS.find((q) => q.id === id)?.xp ?? 0;

/** Coins for swapping one of the day's quests (once a day). */
export const QUEST_REROLL_COST = 40;

/**
 * The quest that would replace `id` today, or null when it can't be swapped: once a day, never a
 * seasonal or finished quest, and only quests with no progress yet on both sides (no instant XP).
 */
export function rerollFor(s: State, id: string, date = new Date()): string | null {
  const key = dayKey(date);
  const d = dayOf(s, key);
  const picked = d.quests;
  if (!picked?.includes(id) || d.questRerolled || (d.questsDone ?? []).includes(id)) return null;
  if (draftOpen(s, date)) return null; // the draft is the free way to change them until it closes
  const def = QUESTS.find((q) => q.id === id);
  if (!def || def.season || def.build(s, d, date).progress > 0) return null;
  const next = QUESTS.filter((q) => !q.season && !q.reduced && !picked.includes(q.id) && q.available(s, date))
    .map((q) => ({ q, r: hash(`${key}:${q.id}`) }))
    .sort((a, b) => a.r - b.r)
    .find(({ q }) => q.build(s, d, date).progress === 0);
  return next?.q.id ?? null;
}

/** Gentlest first: what a reduced day asks for. A seasonal one keeps the season's flavour without asking for more. */
const GENTLE = ['hw_seance', 'jul_walk', 'checkin', 'sip'];

/**
 * A reduced day's one quest: the gentlest that fits the date and isn't already met (so going easy never
 * hands out an instant chest), or the gentlest at all when every one is.
 */
export function gentleQuestFor(s: State, date = new Date()): string {
  const d = dayOf(s, dayKey(date));
  const season = seasonOn(date)?.id;
  const fits = GENTLE.map((id) => QUESTS.find((q) => q.id === id)!).filter((q) => (!q.season || q.season === season) && q.available(s, date));
  const open = fits.find((q) => {
    const b = q.build(s, d, date);
    return b.progress < b.target;
  });
  return (open ?? fits[0]).id;
}

/**
 * Low-battery mode and sick/away days ask for one gentle quest. A day whose quests were all done before it
 * turned reduced keeps them (the count is frozen once they're done).
 */
export function reducedDay(s: State, key = dayKey()) {
  const d = dayOf(s, key);
  if (d.questReduced) return true;
  return (lowBattery(d) || pausedOn(s, key)) && !d.questsAllDone;
}

export function questsFor(s: State, date = new Date()): Quest[] {
  const key = dayKey(date);
  const d = dayOf(s, key);
  const picked = d.quests ?? pickQuests(s, date);
  const ids = reducedDay(s, key) ? [d.questReduced ?? gentleQuestFor(s, date)] : picked;
  return ids.flatMap((id) => {
    const q = questInfo(s, id, date);
    return q ? [q] : [];
  });
}

/** One quest as it stands on `date` (title, progress, XP), whether or not it's one of the day's; null for an id that's gone. */
export function questInfo(s: State, id: string, date = new Date()): Quest | null {
  const def = QUESTS.find((q) => q.id === id);
  if (!def) return null;
  const q = def.build(s, dayOf(s, dayKey(date)), date);
  return { id, xp: def.xp, ...q, progress: Math.min(q.progress, q.target) };
}

/**
 * After an undo or a delete: today's finished quests it pushed back under their target open again, with what
 * they paid. Only progress that went down counts (a goal raised later never reopens one), and a change that
 * brought new watch numbers never reopens anything. Once every quest is done they stay done, unless the chest
 * is still unopened: then the all-done bonus and the chest go back too.
 */
export function reopenQuests(prev: State, next: State, now = new Date()): { state: State; reopened: Quest[] } {
  const key = dayKey(now);
  const before = dayOf(prev, key);
  const after = dayOf(next, key);
  const done = after.questsDone ?? [];
  if (!done.length || before.steps !== after.steps || (after.questsAllDone && after.chest)) return { state: next, reopened: [] };
  const reopened = questsFor(next, now).filter((q) => {
    if (!done.includes(q.id) || q.progress >= q.target) return false;
    const was = questInfo(prev, q.id, now);
    return was != null && q.progress < was.progress;
  });
  if (!reopened.length) return { state: next, reopened };
  const ids = reopened.map((q) => q.id);
  const patch = (s: State, fn: (d: DayLog) => DayLog): State => ({ ...s, days: { ...s.days, [key]: fn(dayOf(s, key)) } });
  let s = patch({ ...next, counters: { ...next.counters, quests: Math.max(0, next.counters.quests - ids.length) } }, (d) => ({
    ...d,
    questsDone: (d.questsDone ?? []).filter((id) => !ids.includes(id)),
  }));
  for (const q of reopened) s = unreward(s, key, `q:${q.id}`, q.xp);
  if (after.questsAllDone) {
    s = patch(s, (d) => ({ ...withoutCrit(d, 'quests-all'), questsAllDone: undefined, questsAllDoneAt: undefined, chestReady: undefined }));
    s = unreward(s, key, 'quests-all', XP.questsAll, BONUS_MIN.questsAll);
  }
  return { state: s, reopened };
}

// ---- weekly boss ----

export const BOSSES = [
  { id: 'procrastinator', name: 'The Procrastinator', emoji: '🦥' },
  { id: 'couch_goblin', name: 'The Couch Goblin', emoji: '🛋️' },
  { id: 'doomscroll', name: 'Lord Doomscroll', emoji: '📱' },
  { id: 'snooze', name: 'The Snooze Button', emoji: '⏰' },
  { id: 'dehydration', name: 'Captain Dehydration', emoji: '🏜️' },
  { id: 'leg_day', name: 'Sir Skips-Leg-Day', emoji: '🦵' },
  { id: 'sugar_baron', name: 'The Shortcut Baron', emoji: '🎩' }, // id kept from its old name: saved wins point at it
  { id: 'binge', name: 'The Binge Necromancer', emoji: '📺' },
] as const;

export const weekKey = (date: Date | number = new Date()) => dayKey(startOfWeek(date));

/** The Lazy Syndicate's ruler: the week after all 8 bosses have fallen at least once. Every weakness hurts it. */
export const FINAL_BOSS = { id: 'couch_king', name: 'The Couch King', emoji: '👑' } as const;
export type BossId = (typeof BOSSES)[number]['id'] | typeof FINAL_BOSS.id;
/** The Couch King's HP compared to an ordinary boss, and how much each rematch adds. */
export const FINAL_HP = 1.5;
export const KING_RANK_HP = 0.25;
/** Weeks between Couch King rematches while he's still standing. */
export const KING_REMATCH_WEEKS = 8;

/** Weeks the Couch King was (or will be) your boss: his first week, then every rematch. */
export const kingWeeksOf = (s: State) => s.kingWeeks ?? (s.finalBossWeek ? [s.finalBossWeek] : []);

/**
 * The week of the Couch King's next rematch, once his last week is over and he's still standing (null
 * otherwise). Every 8 weeks from his last fight; a long break skips ahead to the next one still to come.
 */
export function kingRematchFor(s: State, week: string): string | null {
  const last = kingWeeksOf(s).at(-1);
  if (s.syndicateBroken || !last || last >= week || s.bossesDefeated[last]) return null;
  let next = addDays(new Date(`${last}T12:00`), 7 * KING_REMATCH_WEEKS);
  while (dayKey(startOfWeek(next)) < week) next = addDays(next, 7 * KING_REMATCH_WEEKS);
  return dayKey(startOfWeek(next));
}

/** Coins per wave of henchmen after the boss has fallen, and a wave's size as a share of the boss's HP. */
export const MINION_COINS = 20;
export const MINION_SHARE = 0.15;

const weekIndexOf = (monday: Date) => Math.floor(monday.getTime() / (7 * 86_400_000));

/** The first day you earned XP, which is when bosses start counting. */
export const firstXpDay = (s: State) =>
  Object.keys(s.days)
    .filter((k) => (s.days[k].xpEarned ?? 0) > 0)
    .sort()[0] as string | undefined;

/** How many times this week's boss has shown up since you started, this week included. Bosses return every 8 weeks. */
export function bossRank(s: State, date: Date | number = new Date()) {
  const first = firstXpDay(s);
  if (!first) return 1;
  const now = weekIndexOf(startOfWeek(date));
  const start = weekIndexOf(startOfWeek(new Date(`${first}T12:00`)));
  return now < start ? 1 : 1 + Math.floor((now - start) / BOSSES.length);
}

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const roman = (n: number) => ROMAN[n] ?? String(n);

/** All 8 bosses have fallen in weeks before `week`, and the Couch King hasn't been scheduled yet. */
export function finalBossDue(s: State, week: string) {
  if (s.finalBossWeek) return false;
  const beaten = new Set(
    Object.entries(s.bossesDefeated)
      .filter(([w]) => w < week)
      .map(([, id]) => id),
  );
  return BOSSES.every((b) => beaten.has(b.id));
}

/** Minutes of social apps per day before each extra minute heals the boss 1 HP. */
export const DOOM_FREE_MIN = 120;

/** Extra damage on days that hit the boss's weakness, as a share of that day's XP. */
export const WEAKNESS_BONUS = 0.5;

/** The boss has this many times your average week of XP, so an ordinary week needs its weakness (or a bomb) to win. */
export const BOSS_PACE = 1.1;

/** XP per action was halved on this day; days before it count half when sizing the boss. */
const XP_HALVED_ON = '2026-10-14';

/** Your average XP per day over the 4 weeks before `monday`, from your first day with XP (paused days left out). Null with under 3 days to go on. */
export function xpPace(s: State, monday: Date): number | null {
  const first = Object.keys(s.days)
    .filter((k) => (s.days[k].xpEarned ?? 0) > 0)
    .sort()[0];
  if (!first) return null;
  let total = 0;
  let days = 0;
  for (let i = 28; i >= 1; i--) {
    const key = dayKey(addDays(monday, -i));
    if (key < first || pausedOn(s, key)) continue;
    const xp = dayOf(s, key).xpEarned ?? 0;
    total += key < XP_HALVED_ON ? xp / 2 : xp;
    days++;
  }
  return days >= 3 ? total / days : null;
}

/** Each boss's weakness: on days that meet it, the XP earned that day hits it 50 % harder. Nothing food-related. */
export const WEAKNESS: Record<(typeof BOSSES)[number]['id'], { label: string; hit: (s: State, d: DayLog, key: string) => boolean }> = {
  procrastinator: { label: 'finishing tasks', hit: (s, _d, key) => doneTasksOn(s, key).length > 0 },
  couch_goblin: { label: 'moving: step goal or training', hit: (_s, d) => !!d.stepGoalHit || trainedOn(d) },
  doomscroll: { label: 'finishing a Web Focus session', hit: (_s, d) => (d.focus ?? []).some((f) => !f.snapped) },
  snooze: { label: 'logging something before 08:00', hit: (_s, d) => loggedBefore8(d) },
  dehydration: { label: 'hitting your water goal', hit: (s, d, key) => waterGoalMet(s, d, key) },
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
  sugar_baron: { name: 'The Shortcut Phantom', emoji: '🕯️' },
  binge: { name: 'The Binge Necromancer, Unholy Edition', emoji: '⚰️' },
};

const ANY_WEAKNESS = {
  label: "any boss's weakness",
  hit: (s: State, d: DayLog, key: string) => BOSSES.some((b) => WEAKNESS[b.id].hit(s, d, key)),
};

/** A boss's weakness: its own, or every one of them for the Couch King. */
export const weaknessOf = (id: BossId) => (id === FINAL_BOSS.id ? ANY_WEAKNESS : WEAKNESS[id]);

/** The second weakness a boss shows once it's below half HP: another boss's, picked by the week. */
export const rageWeaknessOf = (id: string, week: string) => {
  const others = BOSSES.filter((b) => b.id !== id);
  return others[hash(`${week}:rage`) % others.length].id;
};

/**
 * The season that dresses up the boss of `date`'s week (Halloween, or nyår's Old Year), decided for the whole
 * week: when any of its days is in season, the boss wears it from Monday to the recap, under one name.
 */
export function bossSeasonOf(date: Date | number): 'halloween' | 'nyar' | null {
  for (let i = 0; i < 7; i++) {
    const id = seasonOn(addDays(startOfWeek(date), i))?.id;
    if (id === 'halloween' || id === 'nyar') return id;
  }
  return null;
}

/** `now`: paused days after it don't shrink the boss yet (a pause planned for later can't make today's fight easier). */
export function bossFor(s: State, date: Date | number = new Date(), now: Date | number = Date.now()) {
  const monday = startOfWeek(date);
  const key = dayKey(monday);
  const kings = kingWeeksOf(s);
  const final = kings.includes(key);
  const base = final ? FINAL_BOSS : BOSSES[weekIndexOf(monday) % BOSSES.length];
  // Halloween dresses every boss up; at nyår the boss is the Old Year itself. All week, whatever day it's asked.
  const season = final ? null : bossSeasonOf(monday);
  const skin = season === 'halloween' ? HALLOWEEN[base.id as (typeof BOSSES)[number]['id']] : season === 'nyar' ? { name: 'The Old Year', emoji: '🕰️' } : null;
  const rank = final ? kings.indexOf(key) + 1 : bossRank(s, monday);
  const name = (skin?.name ?? base.name) + (rank > 1 ? ` ${roman(rank)}` : '');
  const weakness = final ? ANY_WEAKNESS : WEAKNESS[base.id as (typeof BOSSES)[number]['id']];
  const rage = final ? null : rageWeaknessOf(base.id, key);
  const days = Array.from({ length: 7 }, (_, i) => dayKey(addDays(monday, i)));
  const upTo = dayKey(now);
  const paused = days.filter((k) => k <= upTo && pausedOn(s, k)).length;

  // Sized to beat your usual week; a brand-new player gets a starter boss instead. Paused days shrink it.
  let healed = 0;
  for (const day of days) if (!pausedOn(s, day)) healed += Math.max(0, (dayOf(s, day).screen?.doomMin ?? 0) - DOOM_FREE_MIN);
  healed = Math.round(healed * healShare(s)); // the Thick Silk ability halves it (perks.ts)
  const pace = xpPace(s, monday);
  const full = pace == null ? 500 + 50 * levelForXp(s.xp) : Math.max(500, Math.round((pace * 7 * BOSS_PACE) / 50) * 50);
  const sized = Math.round((full * (final ? FINAL_HP + KING_RANK_HP * (rank - 1) : 1) * Math.max(1, 7 - paused)) / 7 / 50) * 50;
  const maxHp = Math.max(50, sized) + healed;

  // Day by day: a day that hits the weakness does 50 % more. Below half HP the boss rages, and from the
  // next day a second weakness counts too (still at most one bonus a day).
  let damage = s.bossBombs?.[key] ?? 0;
  let bonus = 0;
  let ragedOn: string | null = null;
  /** Each day's share: its XP, the weakness bonus on top, and critical hits (for the finisher and the recap). */
  const perDay: { key: string; xp: number; bonus: number; crit: number; hit: boolean }[] = [];
  for (const day of days) {
    const d = dayOf(s, day);
    const xp = d.xpEarned ?? 0;
    const raging = rage != null && ragedOn != null && day > ragedOn;
    const hit = weakness.hit(s, d, day) || (raging && WEAKNESS[rage].hit(s, d, day));
    const extra = xp > 0 && hit ? Math.round(xp * WEAKNESS_BONUS) : 0;
    bonus += extra;
    damage += extra;
    const crit = d.critDamage ?? 0; // critical hits (lib/critters.ts)
    damage += xp + crit;
    perDay.push({ key: day, xp, bonus: extra, crit, hit });
    if (ragedOn == null && damage >= maxHp / 2) ragedOn = day;
  }

  // Overkill: past zero HP, the rest of the week's damage takes down waves of henchmen.
  const overkill = Math.max(0, damage - maxHp);
  const minionHp = Math.max(50, Math.round((maxHp * MINION_SHARE) / 10) * 10);
  const minions = Math.floor(overkill / minionHp);

  return {
    id: base.id as BossId,
    name,
    emoji: skin?.emoji ?? base.emoji,
    key,
    rank,
    final,
    maxHp,
    damage,
    healed,
    bonus,
    paused,
    weakness: weakness.label,
    /** Below half HP: the day it happened, and the extra weakness that counts from the day after. */
    ragedOn,
    perDay,
    bombs: s.bossBombs?.[key] ?? 0,
    rageWeakness: rage && ragedOn ? WEAKNESS[rage].label : null,
    minions,
    minionHp,
    minionProgress: overkill - minions * minionHp,
    hp: Math.max(0, maxHp - damage),
    defeated: !!s.bossesDefeated[key],
  };
}
