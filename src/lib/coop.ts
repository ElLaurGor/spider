// Co-op weeks: every other week one league bot is your partner instead of a rival, with one goal for the two
// of you ("5 water-goal days each"). The bot is set a little above what you managed last week and always gets
// there, and the team counts the slower of you two, so your half decides it. Rough days lower the bar, work done
// on one still counts. Winning pays coins (and the odd cosmetic), never XP; missing it costs nothing. Weekly
// counts only: nothing here runs in a row.
import { withOwned } from './cosmetics';
import { addDays, dayKey } from './dates';
import { usedOn } from './day-filters';
import { nemesisOf, weekKeyOf } from './league';
import { fillLine } from './lines';
import { openDays } from './medals';
import { doneTasksOn, stepGoalOn, trainedOn, waterGoalMet } from './selectors';
import { gentleDay } from './tone';
import type { CoopGoal, CoopWeek, State } from './types';

/** The first co-op week; from here every other week is one. */
export const COOP_FROM = '2026-10-26';
export const COOP_COINS = 80;
/** Wins that hand out the co-op cosmetics (cosmetics.ts). */
export const COOP_ITEMS: [number, string][] = [
  [1, 'coop_bracelet'],
  [5, 'aura_duo'],
];

const WEEK_MS = 7 * 86_400_000;
const noonOf = (week: string) => new Date(`${week}T12:00`);

/** Every other week from COOP_FROM. The league stays the usual thing; a partner every week would just be the league again. */
export function isCoopWeek(week: string) {
  if (week < COOP_FROM) return false;
  return Math.round((noonOf(week).getTime() - noonOf(COOP_FROM).getTime()) / WEEK_MS) % 2 === 0;
}

/** `label`: what's counted ("4/5 water-goal days"). `start`: the bar with no last week to go by. `cap`: the most it asks. */
export const GOALS: Record<CoopGoal, { label: string; unit: (n: number) => string; start: number; cap: number }> = {
  water: { label: 'water-goal days', unit: (n) => `${n} water-goal day${n === 1 ? '' : 's'}`, start: 4, cap: 7 },
  train: { label: 'training days', unit: (n) => `${n} training day${n === 1 ? '' : 's'}`, start: 2, cap: 6 },
  steps: { label: 'step-goal days', unit: (n) => `${n} step-goal day${n === 1 ? '' : 's'}`, start: 3, cap: 7 },
  tasks: { label: 'tasks done', unit: (n) => `${n} task${n === 1 ? '' : 's'}`, start: 5, cap: 30 },
  quests: { label: 'days with every quest done', unit: (n) => `${n} day${n === 1 ? '' : 's'} with every quest done`, start: 2, cap: 7 },
};

/** Each bot's idea of a good week. */
const GOAL_OF: Record<string, CoopGoal> = {
  'Gym Bro Gustav': 'train',
  'Couch Potato Carl': 'steps',
  'Hydro Hanna': 'water',
  'Caffeine Kalle': 'tasks',
  'Speedrun Sara': 'quests',
  'Lazy Lars': 'train',
  'Grindset Greta': 'tasks',
  'Noob Niklas': 'quests',
  'Doomscroll Dennis': 'quests',
  'Zen Zara': 'water',
  'Protein Petra': 'train',
  'Night Owl Olle': 'tasks',
  'Spreadsheet Sven': 'tasks',
  'Snack Attack Stina': 'water',
  'Marathon Maja': 'steps',
  'Procrastinating Pelle': 'tasks',
  'Meme Lord Max': 'quests',
  'Early Bird Elin': 'steps',
  'Tryhard Tove': 'train',
  'Chill Chris': 'water',
};
export const goalOf = (name: string): CoopGoal => GOAL_OF[name] ?? 'water';

const hash = (str: string) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
};

/** Steps from the watch in the two weeks before `week`: without them there's no step-goal partner. */
function hasSteps(s: State, week: string) {
  for (let i = 1; i <= 14; i++) if (s.days[dayKey(addDays(noonOf(week), -i))]?.steps != null) return true;
  return false;
}

/** A week's days from Monday, up to `now` for the running week. */
function weekKeys(week: string, now: Date) {
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    const key = dayKey(addDays(noonOf(week), i));
    if (key > dayKey(now)) break;
    out.push(key);
  }
  return out;
}

/** Your count towards a goal in a week (up to `now`). Work done on a rough day counts too. */
export function countFor(s: State, goal: CoopGoal, week: string, now: Date) {
  const keys = weekKeys(week, now);
  if (goal === 'tasks') return keys.reduce((a, k) => a + doneTasksOn(s, k).length, 0);
  return keys.filter((k) => {
    const d = s.days[k];
    if (!d) return false;
    if (goal === 'water') return waterGoalMet(s, d, k);
    if (goal === 'train') return trainedOn(d);
    if (goal === 'steps') return !!d.stepGoalHit || (d.steps ?? 0) >= stepGoalOn(s, k);
    return !!d.questsAllDone;
  }).length;
}

const endOfWeek = (week: string) => {
  const end = addDays(noonOf(week), 6);
  end.setHours(23, 59, 59, 0);
  return end;
};

/**
 * The bar for a full week: a little above last week's pace (10–20 %, at least one more), last week's own rough
 * days taken out so a rough week doesn't lower it. A goal with no week to go by starts at a fair default.
 */
export function baseFor(s: State, goal: CoopGoal, week: string) {
  const last = dayKey(addDays(noonOf(week), -7));
  const done = countFor(s, goal, last, endOfWeek(last));
  const g = GOALS[goal];
  if (!done && !weekKeys(last, endOfWeek(last)).some((k) => usedOn(s.days[k]))) return g.start;
  const per = (done * 7) / Math.max(1, openDays(s, last));
  return Math.max(1, Math.min(g.cap, Math.max(Math.ceil(per * 1.15), Math.floor(per) + 1)));
}

/** The bar in a week with `open` non-rough days: the full bar scaled down, never below 1. Null when the whole week was rough. */
export const coopTarget = (base: number, open: number) => (open <= 0 ? null : Math.max(1, Math.min(base, Math.ceil((base * open) / 7))));

/**
 * This week's co-op, when it's a co-op week: a partner from your league (never this week's nemesis, never a
 * step goal without a watch), picked by the week so it doesn't change. Null otherwise.
 */
export function coopFor(s: State, now = new Date()): CoopWeek | null {
  const l = s.league;
  if (!l || l.week !== weekKeyOf(now) || !isCoopWeek(l.week)) return null;
  const nemesis = nemesisOf(s)?.id;
  const steps = hasSteps(s, l.week);
  const pool = l.rivals.filter((r) => r.id !== nemesis && (steps || goalOf(r.name) !== 'steps'));
  if (!pool.length) return null;
  const r = pool[hash(`${l.week}:coop`) % pool.length];
  const goal = goalOf(r.name);
  return { week: l.week, partner: { name: r.name, emoji: r.emoji }, goal, base: baseFor(s, goal, l.week) };
}

/** Where the partner is: they get to the bar by Saturday night, a little at a time. */
export function partnerCount(target: number, week: string, now: Date) {
  const days = Math.max(0, Math.min(7, (now.getTime() - new Date(`${week}T00:00`).getTime()) / 86_400_000));
  return Math.min(target, Math.floor((target * days) / 6));
}

export type CoopStatus = {
  coop: CoopWeek;
  target: number | null; // null: the whole week was rough, so it's off
  mine: number;
  theirs: number;
  team: number; // the slower of you two
  done: boolean;
};

/** The running co-op week, or null when there isn't one this week. */
export function coopStatus(s: State, now = new Date()): CoopStatus | null {
  const c = s.coop;
  if (!c || c.week !== weekKeyOf(now) || c.result) return null;
  const target = coopTarget(c.base, openDays(s, c.week));
  const mine = countFor(s, c.goal, c.week, now);
  const theirs = target == null ? 0 : partnerCount(target, c.week, now);
  return { coop: c, target, mine, theirs, team: Math.min(mine, theirs), done: target != null && mine >= target };
}

/** The partner this week, by name (rival talk keeps them friendly). */
export const partnerName = (s: State, now = new Date()) => (s.coop && !s.coop.result && s.coop.week === weekKeyOf(now) ? s.coop.partner.name : null);

/**
 * Settles a co-op week that has ended (once). A win pays COOP_COINS and, at 1 and 5 wins, a cosmetic. A miss
 * or a week that was all rough days costs nothing.
 */
export function settleCoop(s: State, now = new Date()): { state: State; result: CoopWeek['result'] | null; items: string[] } {
  const c = s.coop;
  // Only once the week is over (its Sunday is behind us).
  if (!c || c.result || dayKey(now) <= dayKey(addDays(noonOf(c.week), 6))) return { state: s, result: null, items: [] };
  const end = endOfWeek(c.week);
  const target = coopTarget(c.base, openDays(s, c.week));
  const count = countFor(s, c.goal, c.week, end);
  const won = target != null && count >= target;
  const result = { count, target: target ?? 0, won, coins: won ? COOP_COINS : 0 };
  const record = s.coopRecord ?? { played: 0, won: 0 };
  // A week called off for rough days isn't counted as played.
  const coopRecord = target == null ? s.coopRecord : { played: record.played + 1, won: record.won + (won ? 1 : 0) };
  let state: State = { ...s, coop: { ...c, result }, coopRecord };
  const items = won ? COOP_ITEMS.filter(([n]) => n === coopRecord?.won).map(([, id]) => id) : [];
  for (const id of items) state = withOwned(state, id);
  if (won) state = { ...state, coins: state.coins + COOP_COINS, coinsEarned: state.coinsEarned + COOP_COINS };
  return { state, result, items };
}

// ----- what the partner says (rival-talk style: about the two of you and the goal, never your body) -----

const INTRO: Record<CoopGoal, string[]> = {
  water: ["Truce this week, {name}. Water goal on {target} days, both of us. I'll bring the bottles.", "No race this week. {target} water-goal days each. Glass up."],
  train: ['No race this week. {target} training days each, side by side.', "Team week, {name}. {target} training days each. I'll spot you."],
  steps: ['Walk with me this week. {target} step-goal days, both of us.', "Co-op week. {target} step-goal days each. I've picked the route."],
  tasks: ['This week we split the list: {target} tasks each, no excuses from either side.', "Team week, {name}. {target} tasks each. I've made a plan. Two plans."],
  quests: ['Co-op raid this week: every quest done on {target} days. I tank, you clear.', 'Team up, {name}. {target} days with every quest done. Same party.'],
};
const CHEER = {
  behind: ["I'm at {theirs}. Waiting for you. No rush. Some rush.", "{theirs} for me so far. The team counts the slower one, and that's you. For now."],
  even: ["You're carrying this. Don't tell the others.", 'Level with me or ahead. Good. Keep it that way.'],
  done: ["That's our goal. I'm telling the whole league.", 'Done, both of us. Best partner I ever had, and I have had nine.'],
  rest: ["Rest today. I'll hold our spot.", 'Take the day. The goal shrinks with it, I checked.'],
};
const RESULT = {
  won: ['We did it, {name}. Same time next co-op week?', 'Goal cleared. I may be a bot, but I felt that.'],
  missed: ['We came up short. It happens. Next co-op week we go again.', "Not this time. Nothing lost, and I'd still pick you."],
  off: ['A rough week, so the co-op is off. Nothing lost. Get well first.'],
};
export const allCoopLines = () => [...Object.values(INTRO).flat(), ...Object.values(CHEER).flat(), ...Object.values(RESULT).flat()];

const pick = (pool: string[], seed: string) => pool[hash(seed) % pool.length];
const who = (c: CoopWeek) => `${c.partner.emoji} ${c.partner.name}`;

/** The toast when a co-op week starts. */
export function coopIntro(s: State, c: CoopWeek) {
  const target = coopTarget(c.base, openDays(s, c.week)) ?? c.base;
  const quote = fillLine(pick(INTRO[c.goal], `${c.week}:intro`), { name: s.settings.userName || 'boss', target });
  return `🤝 Co-op week with ${who(c)}: "${quote}" ${GOALS[c.goal].unit(target)} each by Sunday, +${COOP_COINS} 🪙 if you both get there.`;
}

/** Today's word from the partner: kind on a rough day, about the race otherwise. */
export function coopCheer(s: State, st: CoopStatus, now = new Date()) {
  const day = dayKey(now);
  const pool = gentleDay(s, day) ? CHEER.rest : st.done ? CHEER.done : st.mine < st.theirs ? CHEER.behind : CHEER.even;
  return `${st.coop.partner.emoji} ${st.coop.partner.name}: "${fillLine(pick(pool, `${day}:cheer`), { theirs: st.theirs })}"`;
}

/** The toast when a co-op week is settled. */
export function coopResultText(s: State, c: CoopWeek, result: NonNullable<CoopWeek['result']>) {
  const name = s.settings.userName || 'boss';
  if (!result.target) return `🤝 ${who(c)}: "${fillLine(pick(RESULT.off, c.week), { name })}"`;
  const quote = fillLine(pick(result.won ? RESULT.won : RESULT.missed, c.week), { name });
  const score = `${result.count}/${result.target} ${GOALS[c.goal].label}`;
  return `🤝 Co-op week ${result.won ? 'won' : 'over'} with ${who(c)}, ${score}: "${quote}"${result.won ? ` +${result.coins} 🪙` : ''}`;
}

/** One line for HQ's weekly summary, or null outside a co-op week. */
export function coopSummary(s: State, now = new Date()) {
  const st = coopStatus(s, now);
  if (!st) return null;
  if (st.target == null) return `🤝 Co-op with ${st.coop.partner.name}: off this week (rest)`;
  return `🤝 Co-op with ${st.coop.partner.emoji} ${st.coop.partner.name}: ${st.mine}/${st.target} ${GOALS[st.coop.goal].label}${st.done ? ' ✓' : ''}`;
}
