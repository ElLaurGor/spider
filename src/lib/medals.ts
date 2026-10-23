// Weekly medals: bronze, silver or gold for how many days something happened this week ("trained 4 days",
// "water goal on 5 days"). Counted per week, never in a row, and a missed medal is simply not won: nothing is
// lost or taken back. Rough days (sick or away, a low mood, a period day) lower the bar instead of counting
// against you, and anything done on one still counts. Awarded once, at the first rollover of the next week.
import { addDays, dayKey, MIN, startOfWeek } from './dates';
import { roughDay, usedOn } from './day-filters';
import { weekKeyOf } from './league';
import { gamingBudgetMin, gamingUsedMs, stepGoalOn, trainedOn, waterGoalMet } from './selectors';
import type { DayLog, MedalTier, State } from './types';

export const TIERS: MedalTier[] = ['bronze', 'silver', 'gold'];
export const MEDAL_EMOJI: Record<MedalTier, string> = { bronze: '🥉', silver: '🥈', gold: '🥇' };
/** XP per medal (coins come with it, as with any XP). */
export const MEDAL_XP: Record<MedalTier, number> = { bronze: 10, silver: 20, gold: 30 };

type Day = { key: string; log: DayLog | undefined };

export type MedalDef = {
  id: string;
  emoji: string;
  label: string;
  /** "4 days", "2 sessions" */
  unit: (n: number) => string;
  /** Bronze, silver, gold for a week with no rough days. */
  base: [number, number, number];
  count: (s: State, days: Day[]) => number;
  /** Whether it applies at all (no watch, no habits: no medal to chase). */
  applies?: (s: State) => boolean;
};

const days = (n: number) => `${n} day${n === 1 ? '' : 's'}`;
const hasSteps = (s: State) => Object.values(s.days).some((d) => d.steps != null);

export const MEDALS: MedalDef[] = [
  { id: 'train', emoji: '🏋️', label: 'Training', unit: days, base: [2, 3, 4], count: (_s, ds) => ds.filter((d) => d.log && trainedOn(d.log)).length },
  { id: 'water', emoji: '💧', label: 'Water goal', unit: days, base: [3, 5, 7], count: (s, ds) => ds.filter((d) => d.log && waterGoalMet(s, d.log, d.key)).length },
  {
    id: 'steps',
    emoji: '👟',
    label: 'Step goal',
    unit: days,
    base: [3, 5, 7],
    count: (s, ds) => ds.filter((d) => !!d.log?.stepGoalHit || (d.log?.steps ?? 0) >= stepGoalOn(s, d.key)).length,
    applies: hasSteps,
  },
  {
    id: 'focus',
    emoji: '🕸️',
    label: 'Web Focus',
    unit: (n) => `${n} session${n === 1 ? '' : 's'}`,
    base: [1, 2, 3],
    count: (_s, ds) => ds.reduce((a, d) => a + (d.log?.focus?.length ?? 0), 0),
  },
  {
    id: 'gaming',
    emoji: '🎮',
    label: 'Within the gaming budget',
    unit: days,
    base: [3, 5, 6],
    // Days you used the app: an untouched day isn't a win for the budget.
    count: (s, ds) => ds.filter((d) => usedOn(d.log) && gamingUsedMs(s, d.key) <= gamingBudgetMin(s, d.key) * MIN).length,
  },
  {
    id: 'habits',
    emoji: '✅',
    label: 'Every habit done',
    unit: days,
    base: [2, 4, 6],
    count: (_s, ds) => ds.filter((d) => !!d.log?.habitsAllDone).length,
    applies: (s) => s.habits.length > 0,
  },
];

export type MedalStanding = { def: MedalDef; count: number; need: Record<MedalTier, number>; tier: MedalTier | null; next: MedalTier | null };

/** A week's days (Monday on), up to `now` for the running week. */
function weekDays(s: State, week: string, now: Date): Day[] {
  const monday = new Date(`${week}T12:00`);
  const out: Day[] = [];
  for (let i = 0; i < 7; i++) {
    const key = dayKey(addDays(monday, i));
    if (key > dayKey(now)) break;
    out.push({ key, log: s.days[key] });
  }
  return out;
}

/** Days in the week that weren't rough ones: what the bar is scaled to (7 = the full bar). */
export function openDays(s: State, week: string) {
  const monday = new Date(`${week}T12:00`);
  let n = 0;
  for (let i = 0; i < 7; i++) if (roughDay(s, dayKey(addDays(monday, i))) == null) n++;
  return n;
}

/** What each medal needs in a week with `open` non-rough days: the full bar scaled down, at least 1. */
export const needFor = (base: [number, number, number], open: number): Record<MedalTier, number> => {
  const scale = (n: number) => Math.max(1, Math.ceil((n * open) / 7));
  return { bronze: scale(base[0]), silver: scale(base[1]), gold: scale(base[2]) };
};

/** Every medal for a week: progress, what each tier needs, the tier reached and the next one. Empty when the whole week was rough. */
export function medalsFor(s: State, week = weekKeyOf(), now = new Date()): MedalStanding[] {
  const open = openDays(s, week);
  if (open === 0) return [];
  const ds = weekDays(s, week, now);
  return MEDALS.filter((m) => !m.applies || m.applies(s)).map((def) => {
    const count = def.count(s, ds);
    const need = needFor(def.base, open);
    const tier = [...TIERS].reverse().find((t) => count >= need[t]) ?? null;
    const next = TIERS.find((t) => count < need[t]) ?? null;
    return { def, count, need, tier, next };
  });
}

export type MedalAward = { week: string; won: { def: MedalDef; tier: MedalTier; count: number }[]; xp: number };

/**
 * At a rollover: the first time, marks this week as where medals start (old weeks aren't paid out). Later,
 * settles the week that just ended, once. Returns the state with `medals`/`medalsSince` set and what was won.
 */
export function settleMedals(s: State, now = new Date()): { state: State; award: MedalAward | null } {
  const thisWeek = weekKeyOf(now);
  if (!s.medalsSince) return { state: { ...s, medalsSince: thisWeek }, award: null };
  const week = dayKey(addDays(startOfWeek(now), -7));
  if (week < s.medalsSince || s.medals?.[week]) return { state: s, award: null };
  const end = addDays(new Date(`${week}T12:00`), 6);
  end.setHours(23, 59, 59, 0);
  const won = medalsFor(s, week, end)
    .filter((m) => m.tier)
    .map((m) => ({ def: m.def, tier: m.tier as MedalTier, count: m.count }));
  const tiers = Object.fromEntries(won.map((w) => [w.def.id, w.tier]));
  const xp = won.reduce((a, w) => a + MEDAL_XP[w.tier], 0);
  return { state: { ...s, medals: { ...s.medals, [week]: tiers } }, award: { week, won, xp } };
}

/** "🥇 Water goal, 🥈 Training" */
export const medalList = (won: MedalAward['won']) => won.map((w) => `${MEDAL_EMOJI[w.tier]} ${w.def.label}`).join(', ');

/** Every medal ever won, per tier, and the weeks that won any. */
export function medalTotals(s: State) {
  const out: Record<MedalTier, number> = { bronze: 0, silver: 0, gold: 0 };
  let weeks = 0;
  for (const tiers of Object.values(s.medals ?? {})) {
    const list = Object.values(tiers).filter((t): t is MedalTier => !!t);
    if (list.length) weeks++;
    for (const t of list) out[t]++;
  }
  return { ...out, weeks };
}
