import type { AndroidSymbol } from 'expo-symbols';

import { seasonOn } from './seasons';
import { allEggsSomeYear } from './traditions';
import { coffeeOf, gamingUsedMs, moodDays, moodsOf, totalCoffees, trainedOn, waterMl } from './selectors';
import type { State } from './types';

// Everyday actions give about half of what they did before 2026-10-14 (it came too easy); milestones
// (achievements, secrets, the boss) kept theirs. Coins per XP doubled, so coin income stayed the same.
export const XP = {
  water: 1,
  waterGoal: 15,
  food: 1,
  proteinGoal: 10,
  set: 2,
  workout: 20,
  pr: 10,
  task: 5,
  mood: 2,
  stepGoal: 10,
  progressPhoto: 5,
  habit: 3,
  habitsAll: 10,
  questsAll: 15,
  boss: 100,
  sleepRating: 2,
  energy: 1,
  windDown: 5,
  breath: 3,
  secret: 50,
  body: 1,
  achievement: 20,
} as const;

/** Timed training (Maskiner / Kondition / Fria vikter): 1 XP per 10 minutes, at most 10. */
export const activityXp = (minutes: number) => Math.min(10, Math.round(minutes / 10));
/** A finished Web Focus session: 1 XP per 5 minutes. */
export const focusXp = (minutes: number) => Math.round(minutes / 5);

export const BONUS_MIN = { workout: 30, waterGoal: 15, task: 10, stepGoal: 15, questsAll: 15, boss: 30 } as const;

const TITLES = [
  'Professional Couch Inspector',
  'Mildly Functional Human',
  'Hydrated Peasant',
  'Respectable Citizen',
  'Menace to Laziness',
  'Friendly Neighborhood Overachiever',
  'Avenger in Training',
  'Certified Main Character',
  'Billionaire Playboy Philanthropist (minus the billion)',
  "S.P.I.D.E.R.'s Equal (allegedly)",
];

/** Total XP needed to reach `level`: 0, 100, 300, 600, 1000, … */
export const xpForLevel = (level: number) => 50 * (level - 1) * level;

export function levelForXp(xp: number) {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;
  return level;
}

export const titleFor = (level: number) => TITLES[Math.min(level, TITLES.length) - 1];

export function levelProgress(xp: number) {
  const level = levelForXp(xp);
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return { level, title: titleFor(level), into: xp - base, needed: next - base, pct: (xp - base) / (next - base) };
}

export type Achievement = {
  id: string;
  title: string;
  desc: string;
  icon: AndroidSymbol;
  test: (s: State) => boolean;
};

const anyDay = (s: State, f: (d: State['days'][string]) => boolean) => Object.values(s.days).some(f);

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_sip', title: "Baby's First Sip", desc: 'Log your first glass of water', icon: 'water_drop', test: (s) => anyDay(s, (d) => d.water.length > 0) },
  { id: 'hydration_overlord', title: 'Hydration Overlord', desc: 'Hit your daily water goal', icon: 'water_full', test: (s) => anyDay(s, (d) => !!d.waterGoalHit) },
  { id: 'basically_a_fish', title: 'Basically a Fish', desc: 'Hit your water goal on 14 days', icon: 'waves', test: (s) => allDays(s).filter(([, d]) => d.waterGoalHit).length >= 14 },
  { id: 'gym_tourist', title: 'Gym Tourist', desc: 'Log your first workout', icon: 'fitness_center', test: (s) => s.counters.workouts >= 1 },
  { id: 'gym_rat', title: 'Gym Rat', desc: 'Log 10 workouts', icon: 'exercise', test: (s) => s.counters.workouts >= 10 },
  { id: 'stronger', title: 'Stronger Than Yesterday', desc: 'Beat a personal record', icon: 'military_tech', test: (s) => s.counters.prs >= 1 },
  { id: 'protein_goblin', title: 'Protein Goblin', desc: 'Hit your protein goal', icon: 'egg', test: (s) => anyDay(s, (d) => !!d.proteinGoalHit) },
  { id: 'task_assassin', title: 'Task Assassin', desc: 'Complete 10 tasks', icon: 'task_alt', test: (s) => s.counters.tasksDone >= 10 },
  { id: 'self_control', title: 'Self-Control Unlocked', desc: 'Stop gaming within budget', icon: 'sports_esports', test: (s) => s.counters.disciplinedStops >= 1 },
  { id: 'in_touch', title: 'In Touch With Feelings', desc: 'Check in your mood on 7 days', icon: 'mood', test: (s) => moodDays(s) >= 7 },
  { id: 'bean_counter', title: 'Bean Counter', desc: 'Log 25 coffees', icon: 'coffee', test: (s) => totalCoffees(s) >= 25 },
  { id: 'touch_grass', title: 'Touched Grass', desc: 'Hit your daily step goal', icon: 'directions_walk', test: (s) => anyDay(s, (d) => !!d.stepGoalHit) },
  { id: 'paparazzi', title: 'Own Paparazzi', desc: 'Take 5 progress photos', icon: 'photo_camera', test: (s) => s.progressPhotos.length >= 5 },
  { id: 'questaholic', title: 'Questaholic', desc: 'Complete 25 daily quests', icon: 'flag', test: (s) => s.counters.quests >= 25 },
  { id: 'boss_slayer', title: 'Boss Slayer', desc: 'Defeat a weekly boss', icon: 'swords', test: (s) => s.counters.bosses >= 1 },
  { id: 'creature_of_habit', title: 'Creature of Habit', desc: 'Checked off 50 habits', icon: 'task_alt', test: (s) => allDays(s).reduce((n, [, d]) => n + (d.habits?.length ?? 0), 0) >= 50 },
  { id: 'loot_goblin', title: 'Loot Goblin', desc: 'Open 10 loot chests', icon: 'redeem', test: (s) => Object.values(s.days).filter((d) => d.chest).length >= 10 },
  { id: 'climber', title: 'Ladder Climber', desc: 'Reach the Gold league', icon: 'military_tech', test: (s) => (s.league?.tier ?? 0) >= 2 },
  { id: 'deep_focus', title: 'Deep Focus', desc: 'Finish 10 Web Focus sessions', icon: 'center_focus_strong', test: (s) => Object.values(s.days).reduce((a, d) => a + (d.focus ?? []).filter((f) => !f.snapped).length, 0) >= 10 },
  { id: 'menace', title: 'Menace to Laziness', desc: 'Reach level 5', icon: 'emoji_events', test: (s) => levelForXp(s.xp) >= 5 },
];

// ---- Secret achievements: hidden until unlocked, a cryptic hint while locked ----

export type SecretAchievement = Achievement & { hint: string };
export const SECRET_COINS = 100;

const hourOf = (t: number) => new Date(t).getHours();
const allDays = (s: State) => Object.entries(s.days);
const between = (t: number, from: number, to: number) => hourOf(t) >= from && hourOf(t) < to;

export const SECRET_ACHIEVEMENTS: SecretAchievement[] = [
  { id: 's_night_owl', title: 'Night Owl', desc: 'Logged water between 02:00 and 05:00', hint: 'Hydration has no bedtime.', icon: 'bedtime', test: (s) => allDays(s).some(([, d]) => d.water.some((w) => between(w.at, 2, 5))) },
  { id: 's_speedrunner', title: 'Speedrunner', desc: 'All daily quests done before 10:00', hint: 'Beat the quests before the coffee kicks in.', icon: 'bolt', test: (s) => allDays(s).some(([, d]) => d.questsAllDoneAt != null && hourOf(d.questsAllDoneAt) < 10) },
  {
    id: 's_early_bird',
    title: 'Early Bird',
    desc: 'Logged something between 04:00 and 06:00',
    hint: 'Before the sun clocks in.',
    icon: 'flag',
    test: (s) => allDays(s).some(([, d]) => [...d.water, ...d.food, ...coffeeOf(d), ...moodsOf(d)].some((e) => between(e.at, 4, 6))),
  },
  { id: 's_coffee_gremlin', title: 'Coffee Gremlin', desc: '6+ coffees in one day', hint: 'One more cup. And another.', icon: 'coffee', test: (s) => allDays(s).some(([, d]) => coffeeOf(d).length >= 6) },
  { id: 's_overhydrated', title: 'Overhydrated', desc: '4+ liters of water in one day', hint: 'More than a houseplant drinks in a month.', icon: 'water_full', test: (s) => allDays(s).some(([, d]) => waterMl(d) >= 4000) },
  { id: 's_no_life', title: 'No-Life Speedrun', desc: '5+ hours of gaming in one day', hint: 'Touch grass? Never heard of it.', icon: 'sports_esports', test: (s) => allDays(s).some(([k]) => gamingUsedMs(s, k) >= 5 * 3_600_000) },
  { id: 's_zen_master', title: 'Zen Master', desc: '5 breathing sessions', hint: 'Breathe. Again. And again.', icon: 'air', test: (s) => allDays(s).reduce((a, [, d]) => a + (d.breaths ?? 0), 0) >= 5 },
  { id: 's_web_weaver', title: 'Web Weaver', desc: 'Finished a 90-minute Web Focus', hint: 'The longest web.', icon: 'center_focus_strong', test: (s) => allDays(s).some(([, d]) => (d.focus ?? []).some((f) => !f.snapped && f.minutes >= 90)) },
  { id: 's_butterfingers', title: 'Butterfingers', desc: 'Snapped a web by opening another app', hint: 'Webs are fragile. So is your focus.', icon: 'close', test: (s) => allDays(s).some(([, d]) => (d.focus ?? []).some((f) => !!f.snapped && f.snapped !== 'gave up')) },
  { id: 's_lucky', title: 'Lucky Spider', desc: 'Found a LEGENDARY loot chest', hint: 'RNG blessing.', icon: 'redeem', test: (s) => allDays(s).some(([, d]) => d.chest?.kind === 'legendary') },
  { id: 's_big_spender', title: 'Big Spender', desc: 'Spent 5,000 coins in the shop', hint: "Money can't buy happiness. Coins can buy pizza.", icon: 'storefront', test: (s) => s.purchases.reduce((a, p) => a + p.cost, 0) >= 5000 },
  { id: 's_couch_royalty', title: 'Couch Royalty', desc: 'Finished last in a league week', hint: 'Even Carl beat you.', icon: 'bedtime', test: (s) => (s.league?.history ?? []).some((h) => h.rank === 10) },
  { id: 's_champion', title: 'League Champion', desc: 'Finished #1 in a league week', hint: 'Top of the food chain.', icon: 'emoji_events', test: (s) => (s.league?.history ?? []).some((h) => h.rank === 1) },
  { id: 's_bomb_squad', title: 'Bomb Squad', desc: '3 boss bombs in one week', hint: 'An explosive week.', icon: 'local_fire_department', test: (s) => Object.values(s.bossBombs).some((v) => v >= 300) },
  { id: 's_midnight_snack', title: 'Midnight Snack', desc: 'Logged food between 00:00 and 04:00', hint: 'The fridge light is your sun.', icon: 'restaurant', test: (s) => allDays(s).some(([, d]) => d.food.some((f) => between(f.at, 0, 4))) },
  {
    id: 's_completionist',
    title: 'Completionist',
    desc: 'Water, workout, protein, all habits and all quests in one day',
    hint: 'Everything. In one day.',
    icon: 'task_alt',
    test: (s) => allDays(s).some(([, d]) => !!d.waterGoalHit && trainedOn(d) && !!d.proteinGoalHit && !!d.habitsAllDone && !!d.questsAllDone),
  },
  { id: 's_rage_quit', title: 'Rage Quit', desc: 'A gaming session under 2 minutes', hint: 'Game over. Very over. Very fast.', icon: 'undo', test: (s) => allDays(s).some(([, d]) => d.games.some((g) => g.end - g.start > 0 && g.end - g.start < 120_000)) },
  {
    id: 's_glow_up',
    title: 'Glow-Up Documented',
    desc: 'Progress photos spanning 30+ days',
    hint: 'A month of mirror selfies.',
    icon: 'photo_camera',
    test: (s) => s.progressPhotos.length >= 2 && s.progressPhotos[s.progressPhotos.length - 1].at - s.progressPhotos[0].at >= 30 * 86_400_000,
  },
  { id: 's_data_nerd', title: 'Data Nerd', desc: '3+ custom trackers logged in one day', hint: 'Track all the things.', icon: 'insights', test: (s) => allDays(s).some(([, d]) => Object.keys(d.tracks ?? {}).length >= 3) },
  { id: 's_old_friend', title: 'Old Friend', desc: '30 different days with S.P.I.D.E.R.', hint: 'Thirty days of us.', icon: 'favorite', test: (s) => Object.keys(s.days).length >= 30 },
  {
    id: 's_haunted_hero',
    title: 'Haunted Hero',
    desc: 'Beat the boss during spooky season',
    hint: 'Something wicked this way comes. In October.',
    icon: 'skull',
    test: (s) => (s.seasonWins ?? []).some((w) => w.startsWith('halloween-')),
  },
  {
    id: 's_light_bringer',
    title: 'Light Bringer',
    desc: 'Every quest done on Lucia',
    hint: 'Light in the darkest month. Wear a candle crown.',
    icon: 'candle',
    test: (s) => allDays(s).some(([k, d]) => !!d.questsAllDone && seasonOn(new Date(`${k}T12:00`))?.id === 'lucia'),
  },
  // cluster G
  { id: 's_glass_cannon', title: 'Glass Cannon', desc: '3 critical hits in one day', hint: 'Lightning, three times.', icon: 'bolt', test: (s) => allDays(s).some(([, d]) => (d.critKeys?.length ?? 0) >= 3) },
  { id: 's_entomologist', title: 'Entomologist', desc: 'Caught 10 different flies', hint: 'A jar full of tiny friends.', icon: 'bug_report', test: (s) => Object.keys(s.flies ?? {}).length >= 10 },
  // cluster F
  { id: 's_egg_hunter', title: 'Egg Hunter', desc: 'Found all five Easter eggs in one year', hint: 'Something is hiding in every tab. Only at Easter.', icon: 'egg', test: allEggsSomeYear },
  // cluster E
  {
    id: 's_monster_hunter',
    title: 'Monster Hunter',
    desc: 'Finished a task that had been open for a week or more',
    hint: 'Some things refuse to die. Until you.',
    icon: 'skull',
    // 7 days = IMMORTAL_DAYS in memory.ts (not imported: memory → report → quests → xp would be a cycle later)
    test: (s) => s.tasks.some((t) => t.done && t.doneAt != null && t.doneAt - t.createdAt >= 7 * 86_400_000),
  },
];
