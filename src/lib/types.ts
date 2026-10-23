// 0 = Sunday … 6 = Saturday (same as Date.getDay()).
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type WorkoutDay = { name: string; exercises: string[] };

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
  weather: { name: string; lat: number; lon: number; county?: string } | null;
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
  moveNudgeHour?: number | null; // workdays at this hour: a nudge to move (her stillest hour on the movement map); unset = off
};

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
export type ProgressPhoto = { id: string; uri: string; at: number };
export type CoffeeEntry = { id: string; mg: number; at: number; late?: boolean };
export type MoodLevel = 1 | 2 | 3 | 4 | 5;
export type MoodEntry = { id: string; level: MoodLevel; emotions: string[]; note?: string; at: number; late?: boolean };

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
  steps?: number; // latest count from the watch via Health Connect
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
export type NightPhone = { lateMin: number; lastAt: number | null; top: string | null };

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
};

export type Task = { id: string; title: string; done: boolean; createdAt: number; doneAt?: number };

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
};

export type State = {
  version: 1;
  onboarded: boolean;
  settings: Settings;
  plan: Record<Weekday, WorkoutDay | null>;
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
  activeFocus: { start: number; minutes: number; label?: string } | null;
  trackers: Tracker[];
  windDownItems: string[];
  bodyLog: BodyEntry[];
  secrets: Record<string, number>; // secret achievement id -> unlocked at
  seenAlerts: Record<string, number>; // SMHI/VMA alert id -> first notified at
  bossesDefeated: Record<string, string>; // week key (its Monday) -> boss id
  lastBackupAt: number | null;
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
  syndicateBroken?: number; // when the Couch King fell: unlocks its theme
  pauses?: Pause[]; // sick/away periods (pause.ts)
  // cluster B: economy & progression
  lastRollover?: string; // last day the day-start bookkeeping ran (rested pool, gaming bank)
  rested?: number; // rested-bonus XP left to hand out (lib/rested.ts)
  chestsSinceLegendary?: number; // loot chests opened since the last legendary one (lib/economy.ts pity)
  perks?: string[]; // spider abilities taken (lib/perks.ts)
  cosmetics?: { owned: string[]; worn: Partial<Record<'hat' | 'held' | 'aura', string>>; title?: string }; // lib/cosmetics.ts
  // cluster F
  eggsFound?: Record<string, Record<string, number>>; // Easter hunt: year -> egg id -> found at
  backupFolderUri?: string | null; // folder picked for automatic weekly backups (a persisted SAF uri)
  // cluster E
  rivalTalk?: { week: string; rank: number; day: string; n: number } | null; // last league rank seen and today's rival remarks (rival-talk.ts)
  topTomorrow?: { day: string; ids: string[] } | null; // task ids picked in an evening debrief for that day's top 3 (memory.ts)
};

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
export type Pause = { from: string; to: string; kind: 'sick' | 'away' };
