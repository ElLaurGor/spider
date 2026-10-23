// Things that happen when you log stuff: rare flies to catch for the collection, and critical
// hits on the weekly boss. Rolls are seeded by the day and the entry's place in it, so undoing
// and re-logging gives the same roll (nothing to farm). Never about food amounts or the body.
import { dayKey, startOfWeek } from './dates';
import { isSnow, seasonOn, type SeasonId } from './seasons';
import { habitsFor } from './habits';
import { activitiesOf, coffeeOf, dayOf, moodsOf, trainedOn } from './selectors';
import type { DayLog, State } from './types';
import { activityXp, focusXp, XP } from './xp';

const hash = (str: string) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
};
/** A stable roll in [0, 1) for a string. */
export const roll = (seed: string) => hash(seed) / 2 ** 32;

// ---------- what was just logged ----------

export type LogKind =
  | 'water'
  | 'food'
  | 'coffee'
  | 'set'
  | 'activity'
  | 'mood'
  | 'task'
  | 'habit'
  | 'focus'
  | 'breath'
  | 'windDown'
  | 'sleepRating'
  | 'energy'
  | 'stepGoal'
  | 'questsAll'
  | 'pr'
  | 'stop';

/** One thing logged today. `key` is its stable place in the day (the nth glass, a task's id). */
export type LogEvent = { kind: LogKind; key: string; at: number; xp: number; minutes?: number; ageDays?: number; waterGoal?: boolean };

const fresh = <T extends { id: string; late?: boolean }>(before: T[], after: T[]) =>
  after.map((x, i) => ({ x, i })).filter(({ x }) => !x.late && !before.some((b) => b.id === x.id));

/** Everything logged for today between two states (back-dated entries don't count). */
export function logEvents(prev: State, next: State, now = new Date()): LogEvent[] {
  const key = dayKey(now);
  const a = dayOf(prev, key);
  const b = dayOf(next, key);
  const t = now.getTime();
  const out: LogEvent[] = [];
  const firstTraining = !trainedOn(a);

  for (const { x, i } of fresh(a.water, b.water)) {
    const goal = !a.waterGoalHit && !!b.waterGoalHit;
    out.push({ kind: 'water', key: `water:${i}`, at: x.at, xp: XP.water + (goal ? XP.waterGoal : 0), waterGoal: goal });
  }
  for (const { i, x } of fresh(a.food, b.food)) out.push({ kind: 'food', key: `food:${i}`, at: x.at, xp: XP.food });
  for (const { i, x } of fresh(coffeeOf(a), coffeeOf(b))) out.push({ kind: 'coffee', key: `coffee:${i}`, at: x.at, xp: 0 });
  fresh(a.sets, b.sets).forEach(({ i, x }, n) =>
    out.push({ kind: 'set', key: `set:${i}`, at: x.at, xp: XP.set + (firstTraining && n === 0 ? XP.workout : 0) }),
  );
  fresh(activitiesOf(a), activitiesOf(b)).forEach(({ i, x }, n) =>
    out.push({
      kind: 'activity',
      key: `activity:${i}`,
      at: x.at,
      xp: activityXp(x.minutes) + (firstTraining && n === 0 && b.sets.length === a.sets.length ? XP.workout : 0),
      minutes: x.minutes,
    }),
  );
  for (const { i, x } of fresh(moodsOf(a), moodsOf(b))) out.push({ kind: 'mood', key: `mood:${i}`, at: x.at, xp: i < 3 ? XP.mood : 0 });

  for (const task of next.tasks) {
    if (!task.done || !task.doneAt || dayKey(task.doneAt) !== key) continue;
    if (prev.tasks.find((p) => p.id === task.id)?.done) continue;
    out.push({ kind: 'task', key: `task:${task.id}`, at: task.doneAt, xp: XP.task, ageDays: (task.doneAt - task.createdAt) / 86_400_000 });
  }
  for (const id of b.habits ?? []) {
    if (!(a.habits ?? []).includes(id)) out.push({ kind: 'habit', key: `habit:${id}`, at: t, xp: XP.habit });
  }
  for (const f of b.focus ?? []) {
    if (f.snapped || (a.focus ?? []).some((x) => x.id === f.id)) continue;
    out.push({ kind: 'focus', key: `focus:${f.id}`, at: f.end, xp: focusXp(f.minutes), minutes: f.minutes });
  }
  if ((b.breaths ?? 0) > (a.breaths ?? 0)) out.push({ kind: 'breath', key: `breath:${b.breaths}`, at: t, xp: a.breaths ? 0 : XP.breath });
  if (!a.windDownDone && b.windDownDone) out.push({ kind: 'windDown', key: 'winddown', at: t, xp: XP.windDown });
  if (a.sleepRating == null && b.sleepRating != null) out.push({ kind: 'sleepRating', key: 'sleep', at: t, xp: XP.sleepRating });
  if (a.energy == null && b.energy != null) out.push({ kind: 'energy', key: 'energy', at: t, xp: XP.energy });
  if (!a.stepGoalHit && b.stepGoalHit) out.push({ kind: 'stepGoal', key: 'steps', at: t, xp: XP.stepGoal });
  if (!a.questsAllDone && b.questsAllDone) out.push({ kind: 'questsAll', key: 'quests', at: t, xp: XP.questsAll });
  if (next.counters.prs > prev.counters.prs) out.push({ kind: 'pr', key: `pr:${next.counters.prs}`, at: t, xp: XP.pr });
  if (next.counters.disciplinedStops > prev.counters.disciplinedStops) {
    out.push({ kind: 'stop', key: `stop:${next.counters.disciplinedStops}`, at: t, xp: 0 });
  }
  return out;
}

// ---------- the fly collection ----------

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export const RARITY: Record<Rarity, { label: string; coins: number }> = {
  common: { label: 'Common', coins: 10 },
  rare: { label: 'Rare', coins: 25 },
  epic: { label: 'Epic', coins: 35 },
  legendary: { label: 'Legendary', coins: 50 },
};
/** A legendary catch also drops this much boss damage. */
export const LEGENDARY_BOMB = 100;
/** How long a fly stays around to be caught. */
export const CATCH_MS = 5 * 60_000;
export const MAX_SPAWNS = 2;

type Ctx = { now: Date; day: DayLog; prevDay: DayLog; season: SeasonId | undefined; noHabits: boolean };
export type Fly = { id: string; name: string; emoji: string; rarity: Rarity; hint: string; chance: number; when: (e: LogEvent, c: Ctx) => boolean };

const rainy = (d: DayLog) => !!d.weather && (d.weather.rainMm >= 1 || (d.weather.code >= 51 && d.weather.code <= 67) || (d.weather.code >= 80 && d.weather.code <= 82) || d.weather.code >= 95);
const training = (e: LogEvent) => e.kind === 'set' || e.kind === 'activity';
/** Water, training, every habit (or none due) and every quest. */
const completeDay = (d: DayLog, noHabits: boolean) => !!d.waterGoalHit && trainedOn(d) && (!!d.habitsAllDone || noHabits) && !!d.questsAllDone;

// Chances are per logged thing that meets the condition. Nothing here is about food amounts or the body.
export const FLIES: Fly[] = [
  { id: 'house_fly', name: 'Common Housefly', emoji: '🪰', rarity: 'common', hint: 'Log anything. Anything at all.', chance: 0.03, when: () => true },
  { id: 'water_strider', name: 'Water Strider', emoji: '🦟', rarity: 'common', hint: 'Lives near water. Yours.', chance: 0.04, when: (e) => e.kind === 'water' },
  { id: 'gym_gnat', name: 'Gym Gnat', emoji: '🦟', rarity: 'common', hint: 'Hangs around the weights.', chance: 0.05, when: training },
  { id: 'mood_moth', name: 'Mood Moth', emoji: '🦋', rarity: 'common', hint: 'Drawn to feelings. Say how you feel.', chance: 0.08, when: (e) => e.kind === 'mood' },
  { id: 'checklist_cricket', name: 'Checklist Cricket', emoji: '🦗', rarity: 'common', hint: 'Chirps when a task gets done.', chance: 0.06, when: (e) => e.kind === 'task' },
  { id: 'habit_hoverfly', name: 'Habit Hoverfly', emoji: '🪰', rarity: 'common', hint: 'Loves a ticked-off habit.', chance: 0.06, when: (e) => e.kind === 'habit' },
  { id: 'weekend_wasp', name: 'Weekend Wasp', emoji: '🐝', rarity: 'common', hint: 'Only works Saturdays and Sundays.', chance: 0.05, when: (_e, c) => c.now.getDay() === 0 || c.now.getDay() === 6 },

  { id: 'dawn_mayfly', name: 'Dawn Mayfly', emoji: '🌅', rarity: 'rare', hint: 'Drink something before 07:00.', chance: 0.3, when: (e, c) => e.kind === 'water' && c.now.getHours() < 7 },
  { id: 'hydro_hornet', name: 'Hydro Hornet', emoji: '💧', rarity: 'rare', hint: 'Hit your water goal before 15:00.', chance: 0.5, when: (e, c) => !!e.waterGoal && c.now.getHours() < 15 },
  { id: 'thunder_midge', name: 'Thunder Midge', emoji: '⛈️', rarity: 'rare', hint: 'Train on a rainy day.', chance: 0.25, when: (e, c) => training(e) && rainy(c.day) },
  { id: 'zen_moth', name: 'Zen Moth', emoji: '🧘', rarity: 'rare', hint: 'Breathe slowly. It comes closer.', chance: 0.3, when: (e) => e.kind === 'breath' },
  { id: 'focus_firefly', name: 'Focus Firefly', emoji: '✨', rarity: 'rare', hint: 'A long, unbroken web: 60+ minutes.', chance: 0.6, when: (e) => e.kind === 'focus' && (e.minutes ?? 0) >= 60 },
  { id: 'moonlight_moth', name: 'Moonlight Moth', emoji: '🌙', rarity: 'rare', hint: 'Finish your wind-down.', chance: 0.4, when: (e) => e.kind === 'windDown' },
  { id: 'stride_skipper', name: 'Stride Skipper', emoji: '🦋', rarity: 'rare', hint: 'Hit your step goal.', chance: 0.4, when: (e) => e.kind === 'stepGoal' },
  { id: 'quest_dragonfly', name: 'Quest Dragonfly', emoji: '🐉', rarity: 'rare', hint: 'Clear every daily quest.', chance: 0.4, when: (e) => e.kind === 'questsAll' },
  { id: 'iron_beetle', name: 'Iron Beetle', emoji: '🪲', rarity: 'rare', hint: 'Beat a personal record.', chance: 0.4, when: (e) => e.kind === 'pr' },
  { id: 'fossil_beetle', name: 'Fossil Beetle', emoji: '🦴', rarity: 'rare', hint: 'Finish a task that sat there for a week.', chance: 0.6, when: (e) => e.kind === 'task' && (e.ageDays ?? 0) >= 7 },
  { id: 'sleepy_lacewing', name: 'Sleepy Lacewing', emoji: '😴', rarity: 'rare', hint: 'Rate how you slept.', chance: 0.2, when: (e) => e.kind === 'sleepRating' },
  { id: 'patience_damselfly', name: 'Patience Damselfly', emoji: '🎮', rarity: 'rare', hint: 'Stop gaming on time.', chance: 0.4, when: (e) => e.kind === 'stop' },

  { id: 'snow_flea', name: 'Snow Flea', emoji: '❄️', rarity: 'epic', hint: 'Only out when it snows.', chance: 0.15, when: (_e, c) => !!c.day.weather && isSnow(c.day.weather.code) },
  { id: 'sunbeam_dragonfly', name: 'Sunbeam Dragonfly', emoji: '☀️', rarity: 'epic', hint: 'A properly sunny day, and you moving in it.', chance: 0.25, when: (e, c) => (training(e) || e.kind === 'stepGoal') && (c.day.weather?.sunMin ?? 0) >= 360 },
  { id: 'ghost_gnat', name: 'Ghost Gnat', emoji: '👻', rarity: 'epic', hint: 'Spooky season only.', chance: 0.08, when: (_e, c) => c.season === 'halloween' },
  { id: 'lucia_glowworm', name: 'Lucia Glowworm', emoji: '🕯️', rarity: 'epic', hint: 'Glows on 13 December.', chance: 0.2, when: (_e, c) => c.season === 'lucia' },
  { id: 'solstice_moth', name: 'Solstice Moth', emoji: '🌑', rarity: 'epic', hint: 'The darkest day of the year.', chance: 0.2, when: (_e, c) => c.season === 'solstice' },

  { id: 'golden_scarab', name: 'Golden Scarab', emoji: '🏆', rarity: 'legendary', hint: 'Rare. Very rare. Busy days help.', chance: 0.02, when: (_e, c) => !!c.day.questsAllDone },
  { id: 'phantom_fly', name: 'Phantom Fly', emoji: '🌟', rarity: 'legendary', hint: 'Water, training, every habit and every quest, in one day.', chance: 0.6, when: (_e, c) => completeDay(c.day, c.noHabits) && !completeDay(c.prevDay, c.noHabits) },
];
export const FLY_BY_ID: Record<string, Fly> = Object.fromEntries(FLIES.map((f) => [f.id, f]));
const ORDER: Rarity[] = ['legendary', 'epic', 'rare', 'common'];

/** The fly a logged thing turns up, if any: the rarest candidates get the first slice of the roll. */
export function flyFor(e: LogEvent, c: Ctx): Fly | null {
  const r = roll(`fly:${dayKey(c.now)}:${e.key}`);
  let edge = 0;
  for (const rarity of ORDER) {
    for (const f of FLIES) {
      if (f.rarity !== rarity || !f.when(e, c)) continue;
      edge += f.chance;
      if (r < edge) return f;
    }
  }
  return null;
}

// ---------- critical hits ----------

export const CRIT_CHANCE = 0.05;
export const MAX_CRITS = 3;
/** Extra boss damage for a crit: three times the XP the thing gave, 15–90. */
export const critDamage = (xp: number) => Math.min(90, Math.max(15, xp * 3));

// ---------- applying it ----------

export type CritterMsg = { key: 'flySpawn' | 'critHit'; vars: Record<string, string | number>; action?: 'catchFly' };

/** Rolls flies and crits for what was just logged. Returns the updated state and what to announce. */
export function rollCritters(prev: State, next: State, now = new Date()): { state: State; msgs: CritterMsg[] } {
  if (!next.onboarded) return { state: next, msgs: [] };
  const events = logEvents(prev, next, now);
  if (!events.length) return { state: next, msgs: [] };
  const key = dayKey(now);
  const t = now.getTime();
  const msgs: CritterMsg[] = [];
  let day = dayOf(next, key);
  let pendingFly = next.pendingFly ?? null;
  const noHabits = habitsFor(next, now).length === 0;
  const ctx = (): Ctx => ({ now, day, prevDay: dayOf(prev, key), season: seasonOn(now)?.id, noHabits });

  for (const e of events) {
    const critKeys = day.critKeys ?? [];
    if (e.xp > 0 && critKeys.length < MAX_CRITS && !critKeys.includes(e.key) && roll(`crit:${key}:${e.key}`) < CRIT_CHANCE) {
      const damage = critDamage(e.xp);
      day = { ...day, critKeys: [...critKeys, e.key], critDamage: (day.critDamage ?? 0) + damage };
      msgs.push({ key: 'critHit', vars: { n: damage } });
    }
    const spawns = day.flySpawns ?? [];
    const flyBusy = pendingFly != null && pendingFly.until > t;
    if (flyBusy || spawns.length >= MAX_SPAWNS || spawns.includes(e.key)) continue;
    const fly = flyFor(e, ctx());
    if (!fly) continue;
    day = { ...day, flySpawns: [...spawns, e.key] };
    pendingFly = { id: fly.id, until: t + CATCH_MS };
    msgs.push({ key: 'flySpawn', vars: { title: `${fly.emoji} ${fly.name}` }, action: 'catchFly' });
  }
  if (!msgs.length) return { state: next, msgs };
  return { state: { ...next, pendingFly, days: { ...next.days, [key]: day } }, msgs };
}

export type CatchResult = { state: State; key: 'flyCaught' | 'flyLegendary' | 'flyGone' | null; vars: Record<string, string | number>; newSpecies: boolean };

/** Tapping "Catch it!": into the collection, with coins (and a boss bomb for a legendary). */
export function catchFly(s: State, now = Date.now()): CatchResult {
  const p = s.pendingFly;
  if (!p) return { state: s, key: null, vars: {}, newSpecies: false };
  const fly = FLY_BY_ID[p.id];
  if (!fly || now > p.until) return { state: { ...s, pendingFly: null }, key: 'flyGone', vars: {}, newSpecies: false };
  const flies = s.flies ?? {};
  const old = flies[fly.id];
  const coins = RARITY[fly.rarity].coins;
  let next: State = {
    ...s,
    pendingFly: null,
    flies: { ...flies, [fly.id]: { firstAt: old?.firstAt ?? now, count: (old?.count ?? 0) + 1 } },
    coins: s.coins + coins,
    coinsEarned: s.coinsEarned + coins,
  };
  if (fly.rarity === 'legendary') {
    const week = dayKey(startOfWeek(now));
    next = { ...next, bossBombs: { ...next.bossBombs, [week]: (next.bossBombs[week] ?? 0) + LEGENDARY_BOMB } };
  }
  return { state: next, key: fly.rarity === 'legendary' ? 'flyLegendary' : 'flyCaught', vars: { title: `${fly.emoji} ${fly.name}`, coins }, newSpecies: !old };
}

/** Species caught at least once. */
export const caughtCount = (s: State) => Object.keys(s.flies ?? {}).filter((id) => FLY_BY_ID[id]).length;
