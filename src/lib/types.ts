// 0 = Sunday … 6 = Saturday (same as Date.getDay()).
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** A gym day's optional "When ___, I will ___" (if-then.ts), e.g. a plan B for rain at gym time. */
export type WorkoutDay = { name: string; exercises: string[]; plan?: IfThen | null };
/** Why a workout was moved (workout-move.ts), or 'skip' when the question was waved off. */
export type MoveWhy = 'late' | 'tired' | 'sick' | 'social' | 'other' | 'skip';
/** A planned workout moved to another day of the same week (step 6): `from` is then a rest day, `to` a workout day. */
export type WorkoutMove = { from: string; to: string; name: string; at: number; why?: MoveWhy };

/** What sets off an if-then plan (if-then.ts). `training`: 15 minutes after the last set, or a logged activity. */
export type CueEvent = 'coffee' | 'training' | 'focus' | 'gaming' | 'checkin';
export type Cue =
  | { kind: 'event'; event: CueEvent }
  | { kind: 'calendar'; match: string } // a calendar event ending whose title contains `match` ('' = the day's last meeting)
  | { kind: 'time'; hour: number; minute: number }
  | { kind: 'rain' }; // gym days: rain at gym time (the plan B)
/** "When <cue>, I will <then>". `onCue`: times it was done right after its cue (a total, never a run of days). */
export type IfThen = { cue: Cue; then: string; onCue?: number };

export type NotifyPrefs = {
  water: boolean;
  gym: boolean;
  morning: boolean;
  evening: boolean;
  gaming: boolean;
  mood: boolean;
  habits: boolean;
  report: boolean;
  sleep: boolean;
  cycle: boolean;
  countdowns: boolean;
  wrapped: boolean;
  windDown: boolean;
  league: boolean;
  pollen: boolean;
  air: boolean;
  smhi: boolean;
  vma: boolean;
  // cluster F
  statusLine: boolean; // a silent, ongoing summary in the notification shade
  // step 2b
  weekendBoss: boolean; // Sat/Sun 15:00, when what's still open today can finish the week's boss
};

export type Settings = {
  userName: string;
  savageLevel: number; // 1 = polite butler, 10 = no mercy
  waterGoalMl: number;
  glassMl: number;
  wakeHour: number;
  sleepHour: number;
  waterEveryMin: number;
  kcalGoal: number;
  proteinGoal: number;
  gamingBudgetMin: number;
  gymHour: number;
  gymMinute: number;
  restSeconds: number;
  caffeinePerCupMg: number;
  coffeeLimit: number; // cups per day
  coffeeCutoffHour: number; // coffee after this hour gets roasted
  stepGoal: number;
  weather: { name: string; lat: number; lon: number; county?: string; municipality?: string } | null; // see Place in weather.ts
  allergies: ('alder' | 'birch' | 'grass' | 'mugwort' | 'ragweed')[];
  pollenAlertLevel: 2 | 3; // alert from moderate (2) or high (3)
  aqiAlert: number; // European AQI at or above this triggers an alert
  easyOnPeriod: boolean; // tone down the roasts on period days
  phoneGamesCount: boolean; // auto-detected phone gaming counts toward the gaming budget
  focusGuard?: boolean; // during Web Focus, nudge the moment a social app opens (APK 1.4.0+, default on)
  phoneLimitMin: number; // daily phone time before S.P.I.D.E.R. gets loud
  notify: NotifyPrefs;
  respectMeetings: boolean;
  calendarIds: string[] | null; // null = every calendar on the phone
  // cluster F
  redDaysOff: boolean; // red days (swedish-days.ts) are rest days: no planned workout, no gym reminders
  // cluster E
  hq?: { order: string[]; hidden: string[] }; // HQ card order and hidden cards (lib/hq-layout.ts); unset = the default
  // cluster C
  adaptiveWater?: boolean; // hot days and training days raise the water goal (default on)
  maxHr?: number; // for heart rate zones in training (lib/workout-heart.ts DEFAULT_MAX_HR when unset)
  stepsFill?: boolean; // today's steps: other apps (the phone's own counter) cover the time Zepp hasn't written to Health Connect yet (default on)
  moveNudgeHour?: number | null; // workdays at this hour: a nudge to move (her stillest hour on the movement map); unset = off
  // step 4
  sl?: { siteId: number; name: string; routes: string[]; walkMin: number } | null; // SL departures card (lib/sl.ts); unset = no card
  quickAdd?: QuickAdd; // Fuel's quick-add chips (lib/quick-add.ts); unset = the most-logged foods only
};

/** A one-tap food on Fuel's quick-add row. */
export type QuickFood = { name: string; kcal: number; protein: number };
/** Pinned foods (in order) come first; `hidden` (food keys, quick-add.ts foodKey) stay out of the most-logged fill, which `auto: false` turns off. */
export type QuickAdd = { pinned: QuickFood[]; hidden: string[]; auto?: boolean };

// `late`: added to a past day afterwards. Counts for that day's totals, never for quests, bosses or contracts.
export type WaterEntry = { id: string; ml: number; at: number; late?: boolean };
export type FoodEntry = { id: string; name: string; kcal: number; protein: number; at: number; photo?: string; late?: boolean };
export type SetEntry = { id: string; exercise: string; weight: number; reps: number; at: number };
export type GameSession = { start: number; end: number; game?: string };
export type ActivityKind = 'machines' | 'cardio' | 'free_weights';
export type ActivityEntry = { id: string; kind: ActivityKind; minutes: number; at: number };
export type PeriodFlow = 'spotting' | 'light' | 'medium' | 'heavy';
export type PeriodLog = { flow: PeriodFlow | null; symptoms: string[] }; // flow null = symptoms only
export type Rating = 1 | 2 | 3 | 4 | 5;
export type ScreenDay = {
  totalMin: number;
  doomMin: number; // social/video apps
  gamesMin: number; // apps in Android's "game" category
  top: { label: string; min: number; game: boolean; doom: boolean }[];
  unlocks?: number; // times the phone was unlocked that day (APK 1.4.0+)
};
export type ChestPrize = { kind: 'coins' | 'gaming' | 'double_xp' | 'boss_bomb' | 'legendary'; amount: number; text: string; gold?: boolean };
export type FocusEntry = { id: string; start: number; end: number; minutes: number; label?: string; snapped?: string };
export type Tracker = { id: string; name: string; emoji: string; kind: 'scale' | 'number' | 'check'; unit?: string; createdAt: number };
export type Reward = { id: string; title: string; emoji: string; cost: number };
export type Purchase = { id: string; title: string; emoji: string; cost: number; at: number };
export type Rival = { id: string; name: string; emoji: string; power: number };
export type League = { tier: number; week: string; rivals: Rival[]; history: { week: string; tier: number; rank: number; xp: number }[] };
/** What a co-op week asks of both partners (coop.ts). */
export type CoopGoal = 'water' | 'train' | 'steps' | 'tasks' | 'quests';
/**
 * A co-op week (coop.ts): the league bot partnered with you, the shared goal and its bar for a week with no
 * rough days (`base`). Kept after the week so it can be settled even if the league has moved on; `result` once settled.
 */
export type CoopWeek = {
  week: string;
  partner: { name: string; emoji: string };
  goal: CoopGoal;
  base: number;
  result?: { count: number; target: number; won: boolean; coins: number };
};
/**
 * The virtual trek (trek.ts): the route, the day watch steps start counting (`skip`: steps that day from before
 * the trek began), the step length and the last waypoint handed out.
 */
export type TrekRoute = 'tunnelbana' | 'sormland';
export type Trek = { route: TrekRoute; since: string; skip?: number; stepM: number; reached: number };
export type ProgressPhoto = { id: string; uri: string; at: number };
export type CoffeeEntry = { id: string; mg: number; at: number; late?: boolean };
export type MoodLevel = 1 | 2 | 3 | 4 | 5;
// `asked`: the emotion words were offered (logged on the Mood screen, or "Want to name it?" answered or skipped)
export type MoodEntry = { id: string; level: MoodLevel; emotions: string[]; note?: string; at: number; late?: boolean; asked?: true };

export type DayWeather = {
  max: number;
  min: number;
  rainMm: number;
  sunMin: number;
  code: number;
  pressureDrop?: number | null; // cluster D: biggest 24 h air-pressure fall ending that day (hPa); null = unknown, missing = not fetched yet
}; // Open-Meteo, for Insights

export type DayLog = {
  water: WaterEntry[];
  food: FoodEntry[];
  sets: SetEntry[];
  games: GameSession[];
  coffee?: CoffeeEntry[]; // optional: days saved before v1.1 don't have these
  activities?: ActivityEntry[];
  period?: PeriodLog;
  sleepRating?: Rating; // how last night felt, rated in the morning
  energy?: Rating; // morning energy check; 1–2 = low-battery mode
  chestReady?: boolean; // earned by finishing all daily quests
  chest?: ChestPrize; // what the chest gave, once opened
  chestGold?: boolean; // step 2: an unopened chest's gold status, frozen when its day ended (loot.ts chestShelf)
  focus?: FocusEntry[];
  breaths?: number; // breathing sessions finished
  windDown?: string[]; // wind-down items done that evening
  windDownDone?: boolean;
  tracks?: Record<string, number>; // custom tracker values (check = 1/0)
  screen?: ScreenDay; // phone usage from Android usage stats (APK 1.3.0+)
  weather?: DayWeather; // that day's weather (filled in for days you used the app)
  air?: { aqi: number; pollen: Partial<Record<'alder' | 'birch' | 'grass' | 'mugwort' | 'ragweed', number>> }; // daily max, for Insights
  moods?: MoodEntry[];
  bonusGameMin: number;
  steps?: number; // latest count from the watch via Health Connect, or typed in
  stepsManual?: 'floor' | 'fixed'; // steps typed in: 'floor' (above the watch) until the watch counts more, 'fixed' (below it) for the whole day (syncedSteps)
  sleepMin?: number; // last night's sleep, from the watch or typed in
  sleepManual?: boolean; // sleepMin was typed in: the watch doesn't overwrite it
  stepGoalHit?: boolean;
  habits?: string[]; // ids of habits done that day
  habitsAllDone?: boolean;
  quests?: string[]; // the day's 3 quest ids, fixed once picked
  questsDone?: string[];
  questsAllDone?: boolean;
  questsAllDoneAt?: number; // for the "Speedrunner" secret
  xpEarned?: number; // positive XP earned that day (boss damage)
  waterGoalHit?: boolean;
  proteinGoalHit?: boolean;
  workoutCounted?: boolean;
  // cluster G
  critDamage?: number; // extra boss damage from critical hits that day (lib/critters.ts)
  critKeys?: string[]; // logged things that already crit, so a re-log can't crit again
  flySpawns?: string[]; // logged things that turned up a fly (at most 2 a day)
  // cluster A
  questRerolled?: boolean; // today's one paid quest swap is used (quests.ts rerollFor)
  questFocus?: { id: string; spot: string }; // the quest aimed at the week's weak spot (weak-spot.ts)
  questReduced?: string; // a reduced day's one gentle quest, fixed once picked (quests.ts gentleQuestFor)
  questDraft?: { candidates: string[]; locked: boolean }; // step 2b: the morning draft (5 on offer, keep 3) until noon
  // cluster B
  banked?: number; // coins paid at day rollover for that day's unused bonus gaming minutes (set once)
  // cluster F
  night?: NightPhone; // phone use in bed the night before (usage stats), for the morning check-in
  burned?: number; // old tasks burned on the Valborg bonfire
  // cluster C: the night before this day, from the watch (lib/sleep.ts); not set when sleep was typed in
  bedAt?: number;
  wakeAt?: number;
  sleepStages?: SleepStages;
  // step 2
  goals?: DayGoals; // what the day asked for, frozen once it's over (lib/goals.ts)
  phoneGamesInTimerMin?: number; // phone-game minutes (usage stats) played while the gaming timer ran: counted once
  // step 2: the XP ledger. xpEarned is what the day earned (boss and league damage); these explain the rest.
  xpBy?: Record<string, number>; // XP credited per entry today ("w:<glass id>", "s:<set id>", "workout", "q:<quest id>"), so an undo takes back exactly that; dropped at rollover
  xpLost?: number; // XP taken by gaming penalties (kept out of xpEarned)
  xpUndone?: number; // XP taken back by undos and deletions
  paid?: { mood?: number; photo?: boolean; body?: boolean }; // XP already paid today, so delete-and-relog can't pay again
  bonusEarnedMin?: number; // bonus gaming minutes earned (not bought or from a chest): the bonus-minutes quest counts these
  doneTasks?: { id: string; at: number }[]; // tasks finished that day, kept when the task is later deleted or cleared
  critBy?: Record<string, { id: string; dmg: number }>; // crit key -> the entry that rolled it, so undoing it takes the damage back; dropped at rollover
  // step 2b
  xpHours?: Record<number, number>; // hour (0–23) -> the day's xpEarned as last seen in that hour, for the ghost of last week (lib/xp-timeline.ts); kept 14 days
  // step 4
  cues?: Record<string, number>; // if-then cues that went off in the app that day: habit id (or 'gym') -> when (if-then.ts)
  comeback?: string; // the missed planned gym day this day's first workout came back from (comeback.ts), so undoing it takes the bonus back
};

/** A finished day's goals: settings, plan and habits as they were that day. */
export type DayGoals = {
  water: number; // ml, adaptive extras included
  steps: number;
  gaming: number; // base budget in minutes (the day's bonus minutes come on top)
  protein: number; // g, 0 = no protein goal
  workout: string | null; // the planned workout's name
  habits: string[]; // ids of the habits due
};

/** Phone use after bedtime, the night before a day. `lastAt` null = none worth mentioning. */
export type NightPhone = { lateMin: number; lastAt: number | null; top: string | null; from?: number }; // from: when counting started (night.ts inBedFrom)

export type SleepStages = { deep: number; light: number; rem: number; awake: number }; // minutes

export type ContractGoal = 'train' | 'water' | 'steps' | 'focus' | 'habits' | 'gaming' | 'tasks';
export type Contract = {
  week: string; // Monday's key
  from: string; // day signed: only days from here count
  signedAt?: number; // counted things (tasks, focus sessions) only count after this
  goal: ContractGoal;
  target: number;
  stake: number;
  status: 'open' | 'won' | 'lost' | 'voided';
  difficulty?: 'easy' | 'normal' | 'hard'; // cluster B; older contracts are normal
  before?: ContractGoal[]; // a follow-up: the goals of this week's earlier contracts, all won (contracts.ts signOptions)
};

export type Task = { id: string; title: string; done: boolean; createdAt: number; doneAt?: number; firstDoneAt?: number }; // firstDoneAt: re-checking later counts for that day

export type Counters = {
  workouts: number;
  tasksDone: number;
  prs: number;
  disciplinedStops: number;
  quests: number;
  bosses: number;
};

export type BodyEntry = {
  id: string;
  at: number;
  weight?: number; // kg
  waist?: number; // cm
  chest?: number;
  hips?: number;
  arm?: number;
  thigh?: number;
  bodyFat?: number; // %
};

export type Countdown = { id: string; title: string; emoji: string; date: string; yearly: boolean; createdAt: number };

export type Habit = {
  id: string;
  name: string;
  emoji: string;
  days: Weekday[]; // empty = every day
  remindHour: number | null;
  createdAt: number;
  plan?: IfThen | null; // step 4: an if-then plan (if-then.ts)
  perWeek?: { min: number; max: number } | null; // step 4: a weekly range ("2–4× this week, any days"); `days` is ignored then
};

export type State = {
  version: 1;
  onboarded: boolean;
  settings: Settings;
  plan: Record<Weekday, WorkoutDay | null>;
  workoutMoves?: WorkoutMove[]; // step 6: this and recent weeks' moved workouts (workout-move.ts), read by workoutFor
  days: Record<string, DayLog>;
  tasks: Task[];
  xp: number;
  counters: Counters;
  achievements: Record<string, number>; // id -> unlocked at
  prs: Record<string, number>; // exercise (lowercase) -> best weight
  activeGame: { start: number; game?: string } | null;
  restEndsAt: number | null;
  lastUpdateId?: string; // over-the-air update last seen, to announce new versions
  progressPhotos: ProgressPhoto[];
  habits: Habit[];
  countdowns: Countdown[];
  coins: number;
  coinsEarned: number; // lifetime, for the Hall of Fame
  rewards: Reward[];
  purchases: Purchase[];
  doubleXpUntil: number | null;
  bossBombs: Record<string, number>; // week key -> extra boss damage
  league: League | null;
  coop?: CoopWeek | null; // step 6: this or the last co-op week (lib/coop.ts)
  coopRecord?: { played: number; won: number }; // co-op weeks settled and won, totals
  activeFocus: { start: number; minutes: number; label?: string } | null;
  trackers: Tracker[];
  windDownItems: string[];
  bodyLog: BodyEntry[];
  secrets: Record<string, number>; // secret achievement id -> unlocked at
  seenAlerts: Record<string, number>; // SMHI/VMA alert id -> first notified at
  bossesDefeated: Record<string, string>; // week key (its Monday) -> boss id
  lastBackupAt: number | null;
  lastSharedAt?: number | null; // last "Send backup" through the share sheet (off the phone, presumably)
  respectTier?: number | null; // last respect tier seen (lib/respect.ts), to announce it going up
  goldenFound?: Record<string, number>; // golden line id (lib/lines.ts GOLDEN) -> found at, for the Roast Book
  firstSnow?: string; // winter (seasons.ts winterOf) whose first snow was announced
  contract?: Contract | null; // this or last week's weekly contract (lib/contracts.ts)
  seasonWins?: string[]; // "halloween-2026": a boss beaten while that season was on (seasons.ts)
  // cluster D
  experiments?: Experiment[]; // 2-week self-experiments (lib/experiments.ts), newest last
  // cluster G
  flies?: Record<string, { firstAt: number; count: number }>; // fly collection (lib/critters.ts)
  pendingFly?: { id: string; until: number } | null; // a fly buzzing around, catchable until `until`
  diary?: DiaryPage[]; // S.P.I.D.E.R.'s secret diary, one page per 10 quests (lib/diary.ts)
  // cluster A
  minionsPaid?: Record<string, number>; // week key -> minion waves already paid out
  bossPhaseSeen?: string; // week key whose boss rage (phase 2) was announced
  bossKilledAt?: Record<string, number>; // week key -> when its boss fell, for the bestiary
  finalBossWeek?: string; // week key of the Couch King fight, once all 8 bosses have fallen
  kingWeeks?: string[]; // step 2: every Couch King week, his first and each rematch (unset = just finalBossWeek)
  bossRecapAt?: string; // step 2b: week key of the last boss recap announced (toast)
  bossLateKills?: string[]; // step 2b: week keys whose boss fell late (its numbers came in after the week)
  bossRecapSeen?: string; // step 2b: week key of the last boss recap dismissed on HQ
  kingAnnounced?: string; // step 2: the Couch King week whose arrival was announced
  syndicateBroken?: number; // when the Couch King fell: unlocks its theme
  pauses?: Pause[]; // sick/away periods (pause.ts)
  // cluster B: economy & progression
  lastRollover?: string; // last day the day-start bookkeeping ran (rested pool, gaming bank)
  rested?: number; // rested-bonus XP left to hand out (lib/rested.ts)
  chestsSinceLegendary?: number; // loot chests opened since the last legendary one (lib/economy.ts pity)
  perks?: string[]; // spider abilities taken (lib/perks.ts)
  cosmetics?: { owned: string[]; worn: Partial<Record<'hat' | 'held' | 'aura', string>>; title?: string; hidden?: ('badge' | 'respect')[] }; // lib/cosmetics.ts; hidden: avatar extras switched off
  silk?: { month: string; tier: number; prev?: { month: string; tier: number } }; // Silk Track (lib/silk-track.ts): the month on record and the highest tier handed out in it, and the month before
  // cluster F
  eggsFound?: Record<string, Record<string, number>>; // Easter hunt: year -> egg id -> found at
  advent?: Record<string, number[]>; // Advent Web (lib/advent.ts): year -> doors opened
  prizesAccepted?: string[]; // years whose S.P.I.D.E.R. Prizes (lib/prizes.ts) were accepted
  nemesisLog?: Record<string, { name: string; emoji: string; beaten: boolean }>; // league week -> that week's nemesis, for the yearly Wrapped
  backupFolderUri?: string | null; // folder picked for automatic daily backups (a persisted SAF uri)
  // cluster E
  rivalTalk?: { week: string; rank: number; day: string; n: number } | null; // last league rank seen and today's rival remarks (rival-talk.ts)
  topTomorrow?: { day: string; ids: string[] } | null; // task ids picked in an evening debrief for that day's top 3 (memory.ts)
  // step 2
  maxLevel?: number; // the highest level ever reached: only a new one gets the level-up toasts
  fixes?: string[]; // one-time repairs already applied to this save (lib/fixes.ts)
  // step 2b
  medals?: Record<string, Partial<Record<string, MedalTier>>>; // week key (its Monday) -> medal id -> tier won that week (lib/medals.ts)
  medalsSince?: string; // first week that earns medals (the week they arrived), so old weeks aren't paid out
  // step 4
  lineMemory?: { deck?: Record<string, { used: string[]; prev?: string[]; at: number }>; banned?: string[] }; // lines.ts: each pool list's deck (no repeats across runs) and lines retired as "too far"
  toneEase?: { day: string; steps: number }; // tone.ts: "too far" turned that day's tone down this many steps
  jitSaid?: Record<string, string>; // just-in-time insights (jit.ts): kind -> the day it was last said (once a day each)
  rangeTop?: Record<string, string>; // range habit id -> the week (its Monday) whose top-of-range bonus was paid
  // step 5
  dismissed?: string[]; // HQ banners closed: 'wrapped:YYYY-MM', 'yearwrapped:YYYY', 'prizes:YYYY', 'julfrid:YYYY', 'season:<id>:<year>' (the newest 20)
  roughPatchAt?: number; // the rough-patch card was closed or acted on (rough-patch.ts): it stays away for 7 days
  trek?: Trek | null; // the virtual trek walked with watch steps (lib/trek.ts); unset = none started
  treksDone?: TrekRoute[]; // routes walked to the end, in order
  storm?: StormAlert[]; // storm.ts: the orange/red SMHI warnings and VMAs last seen for the owner's area (the Storm protocol)
};

/** An alert that holds the Storm protocol (storm.ts): kept in State so every day's tone, notifications included, can see it. */
export type StormAlert = {
  id: string;
  source: 'SMHI' | 'VMA';
  level: 'ORANGE' | 'RED' | 'VMA';
  title: string;
  advice: string; // what to do: the alert's own words, shortened, or where to read more
  url: string;
  start?: string; // ISO, as SMHI/Krisinformation give it
  end?: string;
  seenAt: number; // last check that still listed it: an alert without an end holds only through that day
};

export type MedalTier = 'bronze' | 'silver' | 'gold';

export type DiaryPage = { n: number; at: number; day: string; text: string };

export type CalEvent = {
  key: string;
  title: string;
  start: number;
  end: number;
  allDay: boolean;
  location: string | null;
  calendarId: string;
  color?: string;
};

export type CalInfo = { id: string; title: string; account: string; color?: string };

export type CalStatus = 'unsupported' | 'unknown' | 'denied' | 'granted';

// cluster D: a 2-week self-experiment. `done` holds the days she did it (not necessarily in a row).
export type ExperimentMetric = 'sleepMin' | 'sleepRating' | 'energy' | 'mood';
export type Experiment = {
  id: string;
  title: string;
  emoji: string;
  metric: ExperimentMetric;
  from: string; // first day (key)
  days: number; // length, 14
  done: string[]; // day keys she did it
  startedAt: number;
  closedAt?: number; // finished or stopped
};

// cluster A
/** Sick or away, from and to inclusive (day keys). */
export type Pause = { from: string; to: string; kind: 'sick' | 'away'; endedAt?: number }; // endedAt: "I'm back" was tapped on `to` (today stays easy)
