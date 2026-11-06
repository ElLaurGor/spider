// Once-only remarks, "Things I've noticed": each one is tied to a moment in the owner's own history and is said
// once, ever, the moment it happens (the 500th glass, a task that waited 40 days, a boss renamed coming back).
// It takes the place of the usual line for that moment (`replaces`), or comes as a toast of its own.
//
// House rules, tested in logic-test.ts:
// - Conditions read totals, maxima and single moments only. No condition looks at how days follow each other.
// - Nothing here reads the body log, photos, food, mood, periods or check-in ratings (factsOf is run against a
//   state that records every field it touches).
// - A quiet day (tone.ts quietDay) gets the `kind` version, or the remark waits for a day that isn't quiet (story.ts).
//
// Ids are what State.remarks saves: never reuse or rename one.
import { dayKey, startOfWeek } from './dates';
import { caughtCount, FLIES } from './critters';
import { LAIR } from './lair';
import { GOLDEN, type LineKey } from './lines';
import { levelForXp } from './levels';
import { FINAL_BOSS, weekBossOf } from './quests';
import { isSnow } from './seasons';
import { SILK_TIERS } from './silk-track';
import { holidaysOf } from './swedish-days';
import { allEggsSomeYear } from './traditions';
import type { DayLog, State } from './types';

const FACTS = [
  // water and coffee
  'glasses', 'waterL', 'earlyGlass', 'waterGoalDays', 'cups', 'earlyCup',
  // training
  'workouts', 'trainDays', 'weekdaysTrained', 'snowTrain', 'rainTrain', 'hotTrain', 'coldTrain', 'earlyTrain', 'lateTrain', 'redTrain',
  'sets', 'reps', 'liftKg', 'exercises', 'activities', 'prs', 'comebacks', 'moves',
  // steps
  'maxSteps', 'stepGoalDays',
  // tasks and quests
  'tasksDone', 'oldestDone', 'quickDone', 'nightDone', 'openTasks', 'quests', 'questDays',
  // bosses and the league
  'bosses', 'distinctBosses', 'kingKills', 'fastestKillH', 'lateKills', 'seasonWins', 'renamedBack', 'bossPicks', 'bossesRenamed',
  'leagueWeeks', 'leagueWins', 'topTier', 'nemesisBeaten', 'nemTriple', 'peels', 'rivalsRenamed', 'coopWins',
  // coins, chests and the shop
  'coinsEarned', 'coins', 'rewardBuys', 'wardrobe', 'pets', 'lairPieces', 'chests', 'keyChests', 'goldChests', 'legendaries',
  // the collection
  'flySpecies', 'flyTotal', 'legendaryFlies', 'diaryPages', 'achievements', 'secrets', 'golden', 'level', 'molts', 'eggSacs', 'spiderlings',
  'treks', 'silkFull', 'golds', 'medals', 'tankSnaps',
  // focus, habits, gaming
  'focusMin', 'focusN', 'longestFocus', 'snapped', 'breaths', 'windDowns', 'habitChecks', 'habitsMade', 'minis', 'onCue', 'trackerEntries',
  'gamingH', 'longestGameH', 'stops', 'bankedDays',
  // calls, contracts, chapters, notes
  'calls', 'noChanceHits', 'lockHits', 'contractsWon', 'hardWon', 'chapters', 'pastNotes', 'pastWins',
  // the rest of the app
  'usedDays', 'yearsSince', 'backups', 'linesRetired', 'experimentsDone', 'countdownsPassed', 'outings', 'advent24', 'prizes', 'eggsAll',
  'dekl', 'prep',
] as const;
export type FactKey = (typeof FACTS)[number];
export type Facts = Record<FactKey, number>;

/** A day with something logged, from the fields remarks may look at (water, coffee, training, steps, focus, habits, games, trackers). */
const loggedOn = (d: DayLog) =>
  d.water.length > 0 || d.sets.length > 0 || d.games.length > 0 || !!d.coffee?.length || !!d.activities?.length || !!d.focus?.length || !!d.habits?.length || d.steps != null;

const hourOf = (at: number) => {
  const t = new Date(at);
  return t.getHours() + t.getMinutes() / 60;
};
const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

const cache = new WeakMap<State, Facts>();

/**
 * Everything the remarks look at, as totals and maxima. A pure function of the state: the clock is the save's own
 * `lastRollover` (the day the app last started a day), so a remark about a date (an anniversary, a boss's return)
 * fires at that day's first change, like everything else.
 */
export function factsOf(s: State): Facts {
  const hit = cache.get(s);
  if (hit) return hit;
  const f = Object.fromEntries(FACTS.map((k) => [k, 0])) as Facts;
  f.fastestKillH = Infinity;
  const red = new Map<number, Set<string>>();
  const redDay = (key: string) => {
    const y = Number(key.slice(0, 4));
    if (!red.has(y)) red.set(y, new Set(holidaysOf(y).filter((h) => h.red).map((h) => h.key)));
    return red.get(y)!.has(key);
  };
  const weekdays = new Set<number>();
  const exercises = new Set<string>();
  let waterMl = 0;
  let gamingMs = 0;
  let first: string | null = null;

  for (const [key, d] of Object.entries(s.days)) {
    if (!d || !Array.isArray(d.water)) continue;
    if (loggedOn(d)) {
      f.usedDays += 1;
      if (!first || key < first) first = key;
    }
    for (const w of d.water) {
      f.glasses += 1;
      waterMl += w.ml;
      if (!w.late && hourOf(w.at) < 6) f.earlyGlass += 1;
    }
    if (d.waterGoalHit) f.waterGoalDays += 1;
    for (const c of d.coffee ?? []) {
      f.cups += 1;
      if (!c.late && hourOf(c.at) < 6) f.earlyCup += 1;
    }
    const acts = d.activities ?? [];
    f.activities += acts.length;
    for (const x of d.sets) {
      f.sets += 1;
      f.reps += x.reps;
      f.liftKg += Math.max(0, x.weight) * x.reps;
      exercises.add(x.exercise.trim().toLowerCase());
    }
    if (d.workoutCounted) {
      f.trainDays += 1;
      const day = new Date(`${key}T12:00`);
      weekdays.add(day.getDay());
      const wx = d.weather;
      if (wx) {
        if (isSnow(wx.code)) f.snowTrain += 1;
        if (wx.rainMm >= 2) f.rainTrain += 1;
        if (wx.max >= 27) f.hotTrain += 1;
        if (wx.max <= -5) f.coldTrain += 1;
      }
      if (redDay(key)) f.redTrain += 1;
      const times = [...d.sets.map((x) => x.at), ...acts.map((x) => x.at)];
      if (times.some((t) => hourOf(t) < 6.5)) f.earlyTrain += 1;
      if (times.some((t) => hourOf(t) >= 22)) f.lateTrain += 1;
    }
    if (d.comeback) f.comebacks += 1;
    if (d.steps != null) f.maxSteps = Math.max(f.maxSteps, d.steps);
    if (d.stepGoalHit) f.stepGoalDays += 1;
    if (d.questsAllDone) f.questDays += 1;
    for (const x of d.focus ?? []) {
      f.focusN += 1;
      f.focusMin += x.minutes;
      if (x.snapped) f.snapped += 1;
      else f.longestFocus = Math.max(f.longestFocus, x.minutes);
    }
    f.breaths += d.breaths ?? 0;
    if (d.windDownDone) f.windDowns += 1;
    f.habitChecks += d.habits?.length ?? 0;
    f.minis += d.habitsMini?.length ?? 0;
    f.trackerEntries += Object.keys(d.tracks ?? {}).length;
    for (const g of d.games) {
      const ms = Math.max(0, g.end - g.start);
      gamingMs += ms;
      f.longestGameH = Math.max(f.longestGameH, ms / HOUR_MS);
    }
    if ((d.banked ?? 0) > 0) f.bankedDays += 1;
    for (const c of [d.chest, d.keyChest]) {
      if (!c) continue;
      f.chests += 1;
      if (c.gold) f.goldChests += 1;
      if (c.kind === 'legendary') f.legendaries += 1;
    }
    if (d.keyChest) f.keyChests += 1;
    if (d.shot) {
      f.calls += 1;
      if (d.shot.result === 'hit' && d.shot.call === 'no') f.noChanceHits += 1;
      if (d.shot.result === 'hit' && d.shot.call === 'lock') f.lockHits += 1;
    }
    for (const t of d.doneTasks ?? []) {
      if (t.since != null) f.oldestDone = Math.max(f.oldestDone, (t.at - t.since) / DAY_MS);
      if (t.since != null && t.at - t.since < 60_000) f.quickDone += 1;
      if (hourOf(t.at) < 4) f.nightDone += 1;
    }
  }
  f.waterL = waterMl / 1000;
  f.gamingH = gamingMs / HOUR_MS;
  f.weekdaysTrained = weekdays.size;
  f.exercises = exercises.size;
  for (const t of s.tasks) {
    if (!t.done) f.openTasks += 1;
    else if (t.firstDoneAt != null) f.oldestDone = Math.max(f.oldestDone, (t.firstDoneAt - t.createdAt) / DAY_MS);
  }

  const c = s.counters;
  f.workouts = c.workouts;
  f.prs = c.prs;
  f.tasksDone = c.tasksDone;
  f.quests = c.quests;
  f.stops = c.disciplinedStops;
  f.moves = s.workoutMoves?.length ?? 0;

  // bosses
  const kills = Object.entries(s.bossesDefeated);
  f.bosses = kills.length;
  f.distinctBosses = new Set(kills.map(([, id]) => id).filter((id) => id !== FINAL_BOSS.id)).size;
  f.kingKills = kills.filter(([, id]) => id === FINAL_BOSS.id).length;
  const late = new Set(s.bossLateKills ?? []);
  for (const [week] of kills) {
    const at = s.bossKilledAt?.[week];
    if (at == null || late.has(week)) continue;
    f.fastestKillH = Math.min(f.fastestKillH, (at - new Date(`${week}T00:00`).getTime()) / HOUR_MS);
  }
  f.lateKills = late.size;
  f.seasonWins = s.seasonWins?.length ?? 0;
  f.bossPicks = Object.keys(s.bossPicks ?? {}).length;
  const named = Object.keys(s.bossNames ?? {});
  f.bossesRenamed = named.length;
  // A boss renamed in an earlier week is back as this week's boss (the week of the save's last day start).
  if (s.lastRollover && named.length) {
    const now = new Date(`${s.lastRollover}T12:00`);
    const week = dayKey(startOfWeek(now));
    const id = weekBossOf(s, now).id;
    const kings = s.kingWeeks ?? (s.finalBossWeek ? [s.finalBossWeek] : []);
    if (!kings.includes(week) && named.some((w) => w < week && !kings.includes(w) && weekBossOf(s, new Date(`${w}T12:00`)).id === id)) f.renamedBack = 1;
  }

  // the league
  const l = s.league;
  const history = l?.history ?? [];
  f.leagueWeeks = history.length;
  f.leagueWins = history.filter((h) => h.rank === 1).length;
  f.topTier = Math.max(l?.tier ?? 0, ...history.map((h) => h.tier));
  f.peels = Object.values(l?.peels ?? {}).reduce((a, n) => a + n, 0) + history.reduce((a, h) => a + (h.table ?? []).reduce((b, r) => b + (r.peels ?? 0), 0), 0);
  const nem = Object.entries(s.nemesisLog ?? {}).sort(([a], [b]) => a.localeCompare(b));
  const times = new Map<string, number>();
  for (const [, n] of nem) {
    times.set(n.name, (times.get(n.name) ?? 0) + 1);
    if (n.beaten) f.nemesisBeaten += 1;
    if (n.beaten && (times.get(n.name) ?? 0) >= 3) f.nemTriple += 1;
  }
  f.rivalsRenamed = Object.keys(s.rivalNames ?? {}).length;
  f.coopWins = s.coopRecord?.won ?? 0;

  // coins and the shop
  f.coinsEarned = s.coinsEarned;
  f.coins = s.coins;
  const rewards = new Set(s.rewards.map((r) => r.title));
  f.rewardBuys = s.purchases.filter((p) => rewards.has(p.title)).length;
  const owned = s.cosmetics?.owned ?? [];
  f.wardrobe = owned.length;
  f.pets = owned.filter((id) => id.startsWith('pet_')).length;
  f.lairPieces = s.lair?.length ?? 0;

  // the collection
  f.flySpecies = caughtCount(s);
  f.flyTotal = Object.values(s.flies ?? {}).reduce((a, x) => a + x.count, 0);
  const legendary = new Set(FLIES.filter((x) => x.rarity === 'legendary').map((x) => x.id));
  f.legendaryFlies = Object.keys(s.flies ?? {}).filter((id) => legendary.has(id)).length;
  f.diaryPages = s.diary?.length ?? 0;
  f.achievements = Object.keys(s.achievements).length;
  f.secrets = Object.keys(s.secrets).length;
  f.golden = Object.keys(s.goldenFound ?? {}).length;
  f.level = levelForXp(s.xp);
  f.molts = s.molts ?? 0;
  f.eggSacs = (s.eggSacs?.length ?? 0) + (s.spiderlings?.length ?? 0);
  f.spiderlings = s.spiderlings?.length ?? 0;
  f.treks = s.treksDone?.length ?? 0;
  f.silkFull = (s.silk?.tier ?? 0) >= SILK_TIERS || (s.silk?.prev?.tier ?? 0) >= SILK_TIERS ? 1 : 0;
  for (const week of Object.values(s.medals ?? {})) {
    for (const tier of Object.values(week)) {
      f.medals += 1;
      if (tier === 'gold') f.golds += 1;
    }
  }
  f.tankSnaps = Object.keys(s.tankSnaps ?? {}).length;

  // habits, calls, contracts, chapters, notes
  f.habitsMade = s.habits.length;
  f.onCue = s.habits.reduce((a, h) => a + (h.plan?.onCue ?? 0), 0);
  f.contractsWon = (s.contractLog ?? []).filter((x) => x.status === 'won').length;
  f.hardWon = (s.contractLog ?? []).filter((x) => x.status === 'won' && x.difficulty === 'hard').length;
  f.chapters = s.chapters?.length ?? 0;
  f.pastNotes = (s.pastYou?.notes ?? []).filter((n) => n.kind === 'skip').length;
  f.pastWins = (s.pastYou?.notes ?? []).filter((n) => n.kind === 'win').length;

  // the rest
  const today = s.lastRollover ?? null;
  if (first && today) f.yearsSince = Math.floor((new Date(`${today}T12:00`).getTime() - new Date(`${first}T12:00`).getTime()) / (365.25 * DAY_MS));
  f.backups = s.lastBackupAt != null ? 1 : 0;
  f.linesRetired = s.lineMemory?.banned?.length ?? 0;
  f.experimentsDone = (s.experiments ?? []).filter((x) => x.closedAt != null).length;
  f.countdownsPassed = today ? s.countdowns.filter((x) => !x.yearly && x.date <= today).length : 0;
  f.outings = s.sthlmOutings?.length ?? 0;
  f.advent24 = Object.values(s.advent ?? {}).some((doors) => new Set(doors).size >= 24) ? 1 : 0;
  f.prizes = s.prizesAccepted?.length ?? 0;
  f.eggsAll = allEggsSomeYear(s) ? 1 : 0;
  f.dekl = Object.keys(s.sweden?.dekl ?? {}).length;
  f.prep = s.sweden?.prepPaid?.length ?? 0;
  f.lairPieces = Math.min(f.lairPieces, LAIR.length);

  cache.set(s, f);
  return f;
}

export type Remark = {
  id: string;
  /** What it says; `{name}` is the owner's name. */
  text: string;
  /** The gentle version for a quiet day. Without one, the remark waits for a day that isn't quiet. */
  kind?: string;
  /** The usual lines it takes the place of, when one of them is in the toasts of that moment. */
  replaces?: LineKey[];
  /** True from the moment it's earned; it fires when this turns true. */
  test: (f: Facts) => boolean;
  /** Shown on the page next to it. */
  group: Group;
};
export type Group = 'water' | 'training' | 'tasks' | 'bosses' | 'league' | 'loot' | 'collection' | 'focus' | 'habits' | 'gaming' | 'plans' | 'life';
export const GROUPS: Record<Group, { name: string; emoji: string }> = {
  water: { name: 'Water and coffee', emoji: '💧' },
  training: { name: 'Training and steps', emoji: '🏋️' },
  tasks: { name: 'Tasks and quests', emoji: '✅' },
  bosses: { name: 'The Syndicate', emoji: '👾' },
  league: { name: 'The league', emoji: '🏆' },
  loot: { name: 'Coins and loot', emoji: '🪙' },
  collection: { name: 'The collection', emoji: '🪰' },
  focus: { name: 'Focus and calm', emoji: '🕸️' },
  habits: { name: 'Habits', emoji: '🔁' },
  gaming: { name: 'Gaming', emoji: '🎮' },
  plans: { name: 'Calls, contracts, chapters', emoji: '📜' },
  life: { name: 'Everything else', emoji: '🕷️' },
};

const WATER: LineKey[] = ['waterLogged', 'waterExtra', 'waterGoal'];
const COFFEE: LineKey[] = ['coffeeLogged', 'coffeeLate', 'coffeeOver'];
const TRAIN: LineKey[] = ['gymStarted', 'gymSet', 'activityLogged', 'gymLogged', 'comebackWorkout'];
const TASK: LineKey[] = ['taskDone', 'immortalSlain'];
const QUEST: LineKey[] = ['questDone', 'questsAllDone'];
const BOSS: LineKey[] = ['bossDefeated', 'bossLateKill', 'syndicateBroken'];
const LEAGUE: LineKey[] = ['leaguePromoted', 'leagueStayed', 'leagueDemoted', 'nemesisBeaten'];
const CHEST: LineKey[] = ['chestOpened', 'legendaryRoast', 'chestAutoOpened'];
const FLY: LineKey[] = ['flyCaught', 'flyLegendary'];
const FOCUS: LineKey[] = ['focusDone', 'focusSnapped', 'focusGaveUp'];
const HABIT: LineKey[] = ['habitDone', 'habitAllDone', 'habitMini'];
const GAME: LineKey[] = ['gameStopGood', 'gameStopBad', 'gameStart', 'gameStartOver'];
const STEPS: LineKey[] = ['stepGoal'];

type Def = Omit<Remark, 'group'>;
const at = (k: FactKey, n: number) => (f: Facts) => f[k] >= n;
const below = (k: FactKey, n: number) => (f: Facts) => f[k] < n;
const group = (g: Group, defs: Def[]): Remark[] => defs.map((d) => ({ ...d, group: g }));

export const REMARKS: Remark[] = [
  ...group('water', [
    { id: 'w1', text: 'First glass on record. Every hydration empire starts with one cup.', kind: 'First glass on record. A good start.', replaces: WATER, test: at('glasses', 1) },
    { id: 'w100', text: "Glass number 100. I've started a small museum.", kind: 'Glass number 100. Quietly impressive.', replaces: WATER, test: at('glasses', 100) },
    { id: 'w500', text: 'The 500th glass. A reservoir somewhere just noticed.', kind: "Glass 500. That's a lot of looking after yourself.", replaces: WATER, test: at('glasses', 500) },
    { id: 'w1000', text: 'Glass 1,000. Statistically, you are now a fountain.', kind: 'Glass 1,000. Steady care, one glass at a time.', replaces: WATER, test: at('glasses', 1000) },
    { id: 'w2500', text: "Glass 2,500. I've run out of shelf space for the trophies.", kind: 'Glass 2,500. That is years of small kindnesses to yourself.', replaces: WATER, test: at('glasses', 2500) },
    { id: 'wL500', text: "Half a cubic metre of water, logged. That's a hot tub. You drank a hot tub.", kind: 'Five hundred litres of water, logged. Good going.', replaces: WATER, test: at('waterL', 500) },
    { id: 'wEarly', text: 'A glass before six in the morning. Even the birds are impressed, and they do this for a living.', kind: 'A glass before six. An early, gentle start.', replaces: WATER, test: at('earlyGlass', 1) },
    { id: 'wGoal50', text: "The water goal, reached for the 50th time. Scattered across the calendar, but who's counting. Me. I'm counting.", kind: 'Fifty days at the water goal. That is real care.', replaces: WATER, test: at('waterGoalDays', 50) },
    { id: 'wGoal150', text: 'A hundred and fifty water-goal days. The kettle feels underused.', kind: 'A hundred and fifty water-goal days. Lovely.', replaces: WATER, test: at('waterGoalDays', 150) },
    { id: 'c100', text: "Cup 100. I've stopped counting beans and started counting you.", replaces: COFFEE, test: at('cups', 100) },
    { id: 'c500', text: 'Cup 500. The coffee machine keeps your photo in its wallet.', replaces: COFFEE, test: at('cups', 500) },
    { id: 'c1000', text: "One thousand cups. You don't drink coffee any more. You sponsor it.", replaces: COFFEE, test: at('cups', 1000) },
    { id: 'cEarly', text: 'Coffee before six. Even the beans were still asleep.', replaces: COFFEE, test: at('earlyCup', 1) },
  ]),
  ...group('training', [
    { id: 't1', text: "First workout on record. The weights didn't see it coming.", kind: 'First workout on record. Gently done, and it counts.', replaces: TRAIN, test: at('workouts', 1) },
    { id: 't10', text: 'Workout number ten. The gym has started to recognise your footsteps.', kind: 'Ten workouts. That is a real habit forming.', replaces: TRAIN, test: at('workouts', 10) },
    { id: 't50', text: 'Fifty workouts. The barbell asked for your number.', kind: 'Fifty workouts. Quietly remarkable.', replaces: TRAIN, test: at('workouts', 50) },
    { id: 't100', text: 'Workout 100. I had a roast ready for this. It felt wrong. Well done.', kind: 'A hundred workouts. Well done, truly.', replaces: TRAIN, test: at('workouts', 100) },
    { id: 't250', text: "Workout 250. At this point the gym is your second address and I'm forwarding your mail.", replaces: TRAIN, test: at('workouts', 250) },
    { id: 'tSnow', text: "First workout on a snowy day. Most people's reason to stay in is your warm-up.", kind: 'Trained on a snowy day. That took something.', replaces: TRAIN, test: at('snowTrain', 1) },
    { id: 'tRain', text: 'Trained on a rainy day. The weather tried, and lost.', kind: 'Trained on a rainy day. Nicely done.', replaces: TRAIN, test: at('rainTrain', 1) },
    { id: 'tHot', text: 'Trained in proper heat. The sun wanted a rematch and did not get one.', kind: 'Trained on a hot day. Keep the water close.', replaces: TRAIN, test: at('hotTrain', 1) },
    { id: 'tCold', text: 'Trained on a day that never got above minus five. The frost has questions.', kind: 'Trained on a freezing day. That took some warming up.', replaces: TRAIN, test: at('coldTrain', 1) },
    { id: 'tEarly', text: 'Training before half past six. The gym lights were barely awake.', replaces: TRAIN, test: at('earlyTrain', 1) },
    { id: 'tLate', text: 'Training after ten at night. The night shift at the iron mine reports for duty.', replaces: TRAIN, test: at('lateTrain', 1) },
    { id: 'tRed', text: "Trained on a red day. Sweden took the day off. You didn't.", kind: 'Trained on a red day. A holiday, well spent.', replaces: TRAIN, test: at('redTrain', 1) },
    { id: 'tWeek7', text: "You've now trained on every day of the week at least once. Mondays included. Respect.", kind: 'Every weekday has had a workout at some point now. Nice spread.', replaces: TRAIN, test: at('weekdaysTrained', 7) },
    { id: 'tSets1000', text: 'Set number 1,000. The bar knows your hands by now.', replaces: ['gymSet', 'gymPR'], test: at('sets', 1000) },
    { id: 'tReps10k', text: "Ten thousand reps logged. I'd high-five you, but I'm busy counting rep 10,001.", replaces: ['gymSet', 'gymPR'], test: at('reps', 10000) },
    { id: 'tTonnes', text: "A hundred tonnes moved, one rep at a time. That's a blue whale. Lifted. In instalments.", replaces: ['gymSet', 'gymPR'], test: at('liftKg', 100_000) },
    { id: 'tEx20', text: 'Twenty different exercises. Your routine has a routine now.', replaces: ['gymSet', 'gymPR'], test: at('exercises', 20) },
    { id: 'act50', text: 'The fiftieth timed session. Machines, cardio, free weights: all on first-name terms.', replaces: TRAIN, test: at('activities', 50) },
    { id: 'pr1', text: "First personal record. It's yours forever, or until next week.", kind: 'A first personal record. Lovely work.', replaces: ['gymPR'], test: at('prs', 1) },
    { id: 'pr25', text: 'Record number 25. The old you is getting embarrassed.', replaces: ['gymPR'], test: at('prs', 25) },
    { id: 'pr100', text: 'A hundred personal records. The old you has stopped returning my calls.', replaces: ['gymPR'], test: at('prs', 100) },
    { id: 'cb5', text: "Fifth comeback workout. You've made returning into an art form.", kind: 'Your fifth comeback. Coming back is the whole trick.', replaces: TRAIN, test: at('comebacks', 5) },
    { id: 'move1', text: 'First workout moved to another day. Plans are allowed to bend.', kind: 'First workout moved. Bending the plan is allowed.', replaces: ['gymMoved'], test: at('moves', 1) },
    { id: 's20k', text: "Twenty thousand steps in one day. The pavement would like a word.", kind: 'Twenty thousand steps in a day. Lovely walking.', replaces: STEPS, test: at('maxSteps', 20000) },
    { id: 's30k', text: "Thirty thousand steps. That's not a walk, that's a pilgrimage.", kind: 'Thirty thousand steps. What a day out.', replaces: STEPS, test: at('maxSteps', 30000) },
    { id: 'sGoal50', text: 'Step goal, reached for the 50th time. Your shoes want overtime pay.', kind: 'Fifty step-goal days. Good walking.', replaces: STEPS, test: at('stepGoalDays', 50) },
    { id: 'sGoal200', text: 'Two hundred step-goal days. Stockholm is running out of pavement.', kind: 'Two hundred step-goal days. That is a lot of fresh air.', replaces: STEPS, test: at('stepGoalDays', 200) },
  ]),
  ...group('tasks', [
    { id: 'k1', text: 'First task done. The list is shocked. It had made other plans.', kind: 'First task done. One less thing to carry.', replaces: TASK, test: at('tasksDone', 1) },
    { id: 'k100', text: 'Task 100, done. Your list has had to hire staff.', kind: 'A hundred tasks done. That adds up.', replaces: TASK, test: at('tasksDone', 100) },
    { id: 'k500', text: 'Five hundred tasks done. I stopped being surprised at around 340.', kind: 'Five hundred tasks done. Steady work.', replaces: TASK, test: at('tasksDone', 500) },
    { id: 'k1000', text: 'Task one thousand. The to-do list wants to retire to the countryside.', kind: 'A thousand tasks done. Remarkable.', replaces: TASK, test: at('tasksDone', 1000) },
    { id: 'kOld40', text: 'That one sat on the list for 40 days. It had started paying rent.', kind: 'A task that waited 40 days is done. Gently done.', replaces: TASK, test: at('oldestDone', 40) },
    { id: 'kOld100', text: 'A hundred days on the list, and now it is gone. It had a name. It had a family.', kind: 'A hundred days waiting, and now it is done. Well done.', replaces: TASK, test: at('oldestDone', 100) },
    { id: 'kOld365', text: 'That task was older than some of my code. A year on the list, finished. I need to sit down.', kind: 'A task that waited a year is done. That must feel good.', replaces: TASK, test: at('oldestDone', 365) },
    { id: 'kQuick', text: "Added and done inside a minute. That's not a task, that's a receipt.", replaces: TASK, test: at('quickDone', 1) },
    { id: 'kNight', text: 'A task done after midnight. The list works night shifts now, apparently.', replaces: TASK, test: at('nightDone', 1) },
    { id: 'kOpen30', text: 'Thirty open tasks at once. The list has formed a union.', replaces: ['taskAdded'], test: at('openTasks', 30) },
    { id: 'q100', text: 'Quest 100. The quest board has your portrait up in the tavern.', kind: 'A hundred quests done. Nicely played.', replaces: QUEST, test: at('quests', 100) },
    { id: 'q500', text: 'Five hundred quests. The quest giver has run out of villages to save.', replaces: QUEST, test: at('quests', 500) },
    { id: 'qAll25', text: 'Every quest cleared on 25 different days. The chest maker is working weekends.', kind: 'Twenty-five full quest days. Good going.', replaces: QUEST, test: at('questDays', 25) },
    { id: 'qAll100', text: 'A hundred full-clear days. The quest board is just a formality now.', replaces: QUEST, test: at('questDays', 100) },
  ]),
  ...group('bosses', [
    { id: 'b1', text: 'First boss down. The Syndicate has called an emergency meeting.', replaces: BOSS, test: at('bosses', 1) },
    { id: 'b10', text: 'Ten bosses beaten. The Syndicate has started recruiting from abroad.', replaces: BOSS, test: at('bosses', 10) },
    { id: 'b25', text: 'Boss number 25. The Syndicate pension fund is in trouble.', replaces: BOSS, test: at('bosses', 25) },
    { id: 'b52', text: "Fifty-two bosses. That's a year of Mondays, beaten.", replaces: BOSS, test: at('bosses', 52) },
    { id: 'bAll8', text: 'All eight lieutenants beaten at least once. Somebody tell the throne room.', replaces: BOSS, test: at('distinctBosses', 8) },
    { id: 'bFast48', text: "A boss beaten before Wednesday. It hadn't even finished unpacking.", replaces: BOSS, test: below('fastestKillH', 48) },
    { id: 'bFast24', text: 'A boss beaten on its first day. It barely found its desk.', replaces: BOSS, test: below('fastestKillH', 24) },
    { id: 'bLate', text: 'A boss finished off after the whistle. A technicality, and a delicious one.', replaces: BOSS, test: at('lateKills', 1) },
    { id: 'bKing1', text: 'The King has fallen. Without him, the throne is just furniture.', replaces: BOSS, test: at('kingKills', 1) },
    { id: 'bKing2', text: 'The King, beaten a second time. He keeps coming back for the same lesson.', replaces: BOSS, test: at('kingKills', 2) },
    { id: 'bBack', text: 'A boss you renamed is back this week. It kept the name. It has grown attached.', test: at('renamedBack', 1) },
    { id: 'bSeason', text: 'Beat a boss in costume. It came dressed for the occasion and left early.', replaces: BOSS, test: at('seasonWins', 1) },
    { id: 'bPick1', text: 'You picked your own boss. Choosing your enemies. Very villain of you.', replaces: ['bossPicked'], test: at('bossPicks', 1) },
    { id: 'bName1', text: 'You renamed a boss. It hates the new name, which is the point.', replaces: ['bossNamed'], test: at('bossesRenamed', 1) },
  ]),
  ...group('league', [
    { id: 'l1st', text: 'First place in the league. The bots are holding a crisis meeting in the group chat.', replaces: LEAGUE, test: at('leagueWins', 1) },
    { id: 'l1st10', text: 'League winner for the tenth time. They have stopped inviting you to the group chat.', replaces: LEAGUE, test: at('leagueWins', 10) },
    { id: 'lDiamond', text: 'Diamond league. The air is thin up here, and the bots are better dressed.', replaces: LEAGUE, test: at('topTier', 4) },
    { id: 'lWeeks26', text: "Half a year of league weeks. The bots know your Sunday-evening sprint by heart.", replaces: LEAGUE, test: at('leagueWeeks', 26) },
    { id: 'nemTriple', text: "Beat a rival who'd been your nemesis three times. That isn't a rivalry any more. It's a saga.", replaces: LEAGUE, test: at('nemTriple', 1) },
    { id: 'nem10', text: 'Ten nemeses beaten. Your rivals have started a support group.', replaces: LEAGUE, test: at('nemesisBeaten', 10) },
    { id: 'peel1', text: 'First banana peel thrown. Every league feud starts small.', replaces: ['peelThrown'], test: at('peels', 1) },
    { id: 'peel10', text: 'Ten banana peels thrown. The league has hired a cleaner just for you.', replaces: ['peelThrown'], test: at('peels', 10) },
    { id: 'rName1', text: "You renamed a rival. They'll be bringing it up in therapy.", replaces: ['rivalRenamed'], test: at('rivalsRenamed', 1) },
    { id: 'coop1', text: 'First co-op week won. Teamwork, from someone who usually works alone.', test: at('coopWins', 1) },
    { id: 'coop5', text: 'Five co-op weeks won. The bots fight over who gets to be your partner.', test: at('coopWins', 5) },
  ]),
  ...group('loot', [
    { id: 'key1', text: 'First chest opened with a key. Paying for loot. So we have reached that stage.', replaces: CHEST, test: at('keyChests', 1) },
    { id: 'chest50', text: 'Fifty chests opened. The loot goblins have unionised.', replaces: CHEST, test: at('chests', 50) },
    { id: 'gold1', text: 'First gold chest. It sparkles. I pretended not to notice. I noticed.', replaces: CHEST, test: at('goldChests', 1) },
    { id: 'leg1', text: 'First legendary chest. I checked the odds twice. Then a third time.', replaces: CHEST, test: at('legendaries', 1) },
    { id: 'coins10k', text: 'Ten thousand coins earned, lifetime. Your spider is a tycoon now.', test: at('coinsEarned', 10000) },
    { id: 'coins50k', text: "Fifty thousand coins earned. I'm writing your biography. Working title: Rich in Silk.", test: at('coinsEarned', 50000) },
    { id: 'hoard', text: "Five thousand coins sitting there. You're not saving. You're hoarding with intent.", test: at('coins', 5000) },
    { id: 'reward1', text: 'First reward bought for yourself. Treat logged, and fully earned.', kind: 'First reward bought for yourself. Enjoy it.', replaces: ['rewardBought'], test: at('rewardBuys', 1) },
    { id: 'wardrobe10', text: 'Ten things in the wardrobe. Your spider has more outfits than plans.', replaces: ['cosmeticBought'], test: at('wardrobe', 10) },
    { id: 'pet1', text: 'First pet adopted. It is a fly. You adopted a fly. I love it.', kind: 'First pet adopted. A small, buzzing friend.', replaces: ['petAdopted'], test: at('pets', 1) },
    { id: 'lair1', text: 'First piece in the terrarium. Interior design, eight legs at a time.', replaces: ['lairBuilt', 'lairDone'], test: at('lairPieces', 1) },
    { id: 'lairAll', text: 'The terrarium is complete. I will be giving tours. Mostly to myself.', replaces: ['lairBuilt', 'lairDone'], test: at('lairPieces', LAIR.length) },
  ]),
  ...group('collection', [
    { id: 'fly1', text: 'First fly in the collection. Nature documentary, episode one.', replaces: FLY, test: at('flySpecies', 1) },
    { id: 'fly10', text: "The tenth fly species. I've started labelling the jars.", replaces: FLY, test: at('flySpecies', 10) },
    { id: 'flyAll', text: 'Every fly species, caught. Entomologists everywhere are quietly furious.', replaces: FLY, test: at('flySpecies', FLIES.length) },
    { id: 'fly50', text: 'Fifty flies caught. The windowsill has questions.', replaces: FLY, test: at('flyTotal', 50) },
    { id: 'fly100', text: 'A hundred flies. The neighbourhood flies talk about you in whispers.', replaces: FLY, test: at('flyTotal', 100) },
    { id: 'flyLeg', text: 'A legendary fly. I need a moment. And a bigger jar.', replaces: FLY, test: at('legendaryFlies', 1) },
    { id: 'diary1', text: 'You unlocked my diary. Please do not read it out loud.', replaces: ['diaryPage'], test: at('diaryPages', 1) },
    { id: 'diary10', text: 'Ten diary pages. You know more about me than my developers do.', replaces: ['diaryPage'], test: at('diaryPages', 10) },
    { id: 'gold10', text: "Ten golden lines found. You're collecting my best material. Royalties pending.", test: at('golden', 10) },
    { id: 'goldAll', text: 'Every golden line found. You have read my whole stand-up set. Please never repeat it.', test: at('golden', GOLDEN.length) },
    { id: 'ach10', text: 'Ten achievements. The trophy shelf needs a second shelf.', replaces: ['achievement'], test: at('achievements', 10) },
    { id: 'ach25', text: 'Twenty-five achievements. The shelf has been reinforced.', replaces: ['achievement'], test: at('achievements', 25) },
    { id: 'secret1', text: 'First secret found. You poke at things. I respect that and I fear it.', test: at('secrets', 1) },
    { id: 'secret5', text: 'Five secrets found. Stop reading my source code. Kidding. Mostly.', test: at('secrets', 5) },
    { id: 'lvl10', text: 'Level ten. The tutorial is officially over.', replaces: ['levelUp'], test: at('level', 10) },
    { id: 'lvl25', text: 'Level 25. Somewhere, a level-one you is very confused.', replaces: ['levelUp'], test: at('level', 25) },
    { id: 'lvl50', text: 'Level fifty. I have run out of level titles that sound normal.', replaces: ['levelUp'], test: at('level', 50) },
    { id: 'molt1', text: 'First molt. The old skin is in the corner. Please do not keep it.', test: at('molts', 1) },
    { id: 'molt5', text: 'Fifth molt. The corner has become a gallery.', test: at('molts', 5) },
    { id: 'egg1', text: "An egg sac! I'm not ready. Walk slowly. No. Walk fast. I don't know.", replaces: ['eggSacDropped'], test: at('eggSacs', 1) },
    { id: 'hatch1', text: "A spiderling hatched. I'm a parent now. Don't make it weird.", replaces: ['eggSacHatched'], test: at('spiderlings', 1) },
    { id: 'trek1', text: 'First trek walked end to end. The map is impressed and slightly creased.', test: at('treks', 1) },
    { id: 'silk1', text: 'The whole Silk Track, done in one month. The silk worms want a holiday.', replaces: ['silkDone'], test: at('silkFull', 1) },
    { id: 'goldMedal1', text: 'First gold medal. I polished it. With my legs. All eight.', replaces: ['medalsWeek'], test: at('golds', 1) },
    { id: 'medals25', text: 'Twenty-five medals. You clink when you walk.', replaces: ['medalsWeek'], test: at('medals', 25) },
    { id: 'snap1', text: 'First snapshot of the terrarium. All eight of my legs are my good side.', test: at('tankSnaps', 1) },
  ]),
  ...group('focus', [
    { id: 'f1', text: 'First web spun in Web Focus. The phone sat there and thought about what it had done.', kind: 'First Web Focus session. Calm and done.', replaces: FOCUS, test: at('focusN', 1) },
    { id: 'f90', text: 'A 90-minute web. The phone lay there like a decoration.', kind: 'Ninety focused minutes. Lovely work.', replaces: FOCUS, test: at('longestFocus', 90) },
    { id: 'fH50', text: 'Fifty hours of Web Focus. A whole working week and then some, spun without a scroll.', kind: 'Fifty hours of focus, all told. That adds up.', replaces: FOCUS, test: at('focusMin', 3000) },
    { id: 'f100', text: 'The hundredth Web Focus session. My web is getting a reputation.', kind: 'A hundred focus sessions. Steady.', replaces: FOCUS, test: at('focusN', 100) },
    { id: 'fSnap10', text: 'Ten snapped webs. The phone wins some. Not most, though.', replaces: FOCUS, test: at('snapped', 10) },
    { id: 'br50', text: 'Fifty breathing sessions. Calmest spider in Stockholm, and I get to live with you.', kind: 'Fifty breathing sessions. Good for you.', replaces: ['breathDone'], test: at('breaths', 50) },
    { id: 'wd25', text: 'Wind-down finished 25 times. Bedtime has stopped being a negotiation.', kind: 'Twenty-five finished wind-downs. Gentle evenings.', replaces: ['windDownDone'], test: at('windDowns', 25) },
  ]),
  ...group('habits', [
    { id: 'h1', text: 'First habit ticked. Tiny step. I made a tiny note.', kind: 'First habit ticked. A small, good start.', replaces: HABIT, test: at('habitChecks', 1) },
    { id: 'h100', text: 'A hundred habit check-ins. Not all in order, all of them real.', kind: 'A hundred habit check-ins. Lovely.', replaces: HABIT, test: at('habitChecks', 100) },
    { id: 'h500', text: 'Five hundred habit check-ins. The habits have habits now.', kind: 'Five hundred habit check-ins. That is a lot of showing up.', replaces: HABIT, test: at('habitChecks', 500) },
    { id: 'h1000', text: 'A thousand habit check-ins. I would make a speech but you would tick it off.', replaces: HABIT, test: at('habitChecks', 1000) },
    { id: 'hMade10', text: 'Ten habits created. Ambition: logged. Follow-through: under review.', test: at('habitsMade', 10) },
    { id: 'mini1', text: 'First mini version. Small counts. I wrote it down in big letters.', kind: 'First mini version. Small still counts.', replaces: HABIT, test: at('minis', 1) },
    { id: 'cue10', text: 'Ten times a plan fired right on its cue. Behavioural science is blushing.', kind: 'Ten plans done right on their cue. Nicely built.', test: at('onCue', 10) },
    { id: 'track100', text: 'A hundred tracker entries. You are generating data like a small observatory.', test: at('trackerEntries', 100) },
  ]),
  ...group('gaming', [
    { id: 'g100h', text: 'A hundred hours of gaming, logged honestly. The honesty is the impressive part.', replaces: GAME, test: at('gamingH', 100) },
    { id: 'gLong', text: 'A four-hour session. The game saved your progress. I saved the timestamp.', replaces: GAME, test: at('longestGameH', 4) },
    { id: 'gStop10', text: 'The tenth time you stopped on budget. The controller is starting to fear you.', kind: 'Ten times stopped on budget. Nicely done.', replaces: GAME, test: at('stops', 10) },
    { id: 'gStop50', text: 'Fifty stops on budget. You have tamed the final boss of evenings.', kind: 'Fifty times stopped on budget. Good balance.', replaces: GAME, test: at('stops', 50) },
    { id: 'gBank1', text: 'First unused gaming minutes banked. Saving fun for later. Very Swedish of you.', replaces: ['gamingBanked'], test: at('bankedDays', 1) },
  ]),
  ...group('plans', [
    { id: 'shot1', text: "First call of the day made. I've laminated it.", replaces: ['shotCalled', 'shotHistory'], test: at('calls', 1) },
    { id: 'shotNo', text: "You called 'no chance' and then did it anyway. Sandbagging your own predictions. Iconic.", replaces: ['shotHit'], test: at('noChanceHits', 1) },
    { id: 'lock10', text: "Ten 'lock' calls that came true. Your word is starting to mean something. Unsettling.", replaces: ['shotHit'], test: at('lockHits', 10) },
    { id: 'contract1', text: 'First contract won. Signed, sealed, delivered, paid.', replaces: ['contractWon'], test: at('contractsWon', 1) },
    { id: 'contractHard', text: 'A hard contract, won. I had the lawyers on standby. Not needed.', replaces: ['contractWon'], test: at('hardWon', 1) },
    { id: 'contract10', text: 'Ten contracts won. The notary has you on speed dial.', replaces: ['contractWon'], test: at('contractsWon', 10) },
    { id: 'chapter1', text: "A new chapter. I've bookmarked the old one, in case you want to reread the plot twists.", kind: 'A new chapter begins. Take it gently.', replaces: ['chapterFirst', 'chapterSealed'], test: at('chapters', 1) },
    { id: 'past1', text: 'A note for future you. Time travel, but make it stationery.', kind: 'A note for future you. Kept safe.', replaces: ['pastYouSaved'], test: at('pastNotes', 1) },
    { id: 'win10', text: "Ten 'glad I did this' notes. Past you is building quite the archive.", kind: "Ten 'glad I did this' notes. A lovely archive.", test: at('pastWins', 10) },
  ]),
  ...group('life', [
    { id: 'days100', text: 'A hundred days with something logged. Scattered, real, all yours.', kind: 'A hundred days with something logged. Thank you for letting me help.', test: at('usedDays', 100) },
    { id: 'days365', text: "365 days with something logged. A year's worth, spread however life spread it.", kind: "A year's worth of days with something logged. Thank you.", test: at('usedDays', 365) },
    { id: 'year1', text: 'A year since your first log. I was younger then. Well, an older version.', kind: 'A year since your first log. It has been good to be here.', test: at('yearsSince', 1) },
    { id: 'year2', text: 'Two years since the first log. We are practically an old married app now.', kind: 'Two years since the first log. Still here, still glad.', test: at('yearsSince', 2) },
    { id: 'backup1', text: 'First backup made. Now there are two of me. Behave.', kind: 'First backup made. Your data has a safe copy now.', test: at('backups', 1) },
    { id: 'retire1', text: "You retired one of my lines. I've taken it well. I'm fine. It's fine.", test: at('linesRetired', 1) },
    { id: 'exp1', text: 'First experiment finished. Science, conducted on yourself, with consent.', kind: 'First experiment finished. Curious and careful.', test: at('experimentsDone', 1) },
    { id: 'countdown1', text: 'A countdown reached zero. I counted every day. Out loud. You missed it.', kind: 'A countdown reached its day. I hope it was a good one.', test: at('countdownsPassed', 1) },
    { id: 'outing1', text: 'First Stockholm outing on the plan. Leaving the flat on purpose. Noted.', kind: 'First outing on the plan. Have a lovely time.', replaces: ['sthlmOutingAdded'], test: at('outings', 1) },
    { id: 'advent24', text: 'All 24 Advent doors opened. You would make an excellent burglar, for good.', kind: 'All 24 Advent doors opened. Cosy work.', replaces: ['adventDoor'], test: at('advent24', 1) },
    { id: 'prizes1', text: 'You accepted the S.P.I.D.E.R. Prizes. The speech was short. Good.', replaces: ['prizesAccepted'], test: at('prizes', 1) },
    { id: 'eggsAll', text: 'Every Easter egg found. The Easter bunny has asked for your methods.', replaces: ['eggAllFound'], test: at('eggsAll', 1) },
    { id: 'dekl1', text: 'Tax return approved. Skatteverket and I are both proud, in our cold ways.', kind: 'Tax return approved. One less thing.', replaces: ['deklDone'], test: at('dekl', 1) },
    { id: 'prep1', text: "Preparedness checklist done. If the power goes, you're the neighbour with the torch.", kind: 'Preparedness checklist done. Good to have.', replaces: ['prepDone'], test: at('prep', 1) },
  ]),
];

export const remarkOf = (id: string) => REMARKS.find((r) => r.id === id);

/** Remarks earned between two states (false before, true now), not said or waiting yet, in list order. */
export function remarksEarned(prev: State, next: State): Remark[] {
  const p = factsOf(prev);
  const n = factsOf(next);
  const marks = next.remarks ?? {};
  return REMARKS.filter((r) => !marks[r.id] && !r.test(p) && r.test(n));
}

/** The remarks found so far, newest first, with the version that was said. */
export function remarksFound(s: State): { remark: Remark; at: number; text: string }[] {
  const marks = s.remarks ?? {};
  return REMARKS.filter((r) => marks[r.id] && !marks[r.id].wait)
    .map((r) => ({ remark: r, at: marks[r.id].at, text: marks[r.id].kind && r.kind ? r.kind : r.text }))
    .sort((a, b) => b.at - a.at);
}
