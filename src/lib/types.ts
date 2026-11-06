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
  adaptiveWater?: boolean; // hot days raise the water goal (default on); training days never do
  maxHr?: number; // for heart rate zones in training (lib/workout-heart.ts DEFAULT_MAX_HR when unset)
  stepsFill?: boolean; // today's steps: other apps (the phone's own counter) cover the time Zepp hasn't written to Health Connect yet (default on)
  moveNudgeHour?: number | null; // workdays at this hour: a nudge to move (her stillest hour on the movement map); unset = off
  // step 4
  sl?: { siteId: number; name: string; routes: string[]; walkMin: number } | null; // SL departures card (lib/sl.ts); unset = no card
  quickAdd?: QuickAdd; // Fuel's quick-add chips (lib/quick-add.ts); unset = the most-logged foods only
  // step 8 sweden
  sweden?: SwedenPrefs; // the Swedish calendar's extras (name days, people days, fika, Hesa Fredrik, deklaration); unset = the defaults
  // step 8 stockholm
  sthlmEvents?: string[]; // Visit Stockholm categories for HQ's weekend card (lib/sthlm-events.ts); unset or empty = no card
  // step 8 game
  birthday?: string | null; // 'MM-DD': a fresh-start landmark (lib/chapters.ts); unset = none
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
/** `base`: the roster name, once the owner renamed them (league.ts rosterName): their voice and co-op goal hang on it. */
export type Rival = { id: string; name: string; emoji: string; power: number; base?: string };
/** `peels`: rival id -> banana peels thrown at them this week (each takes PEEL_XP off their week). */
export type League = { tier: number; week: string; rivals: Rival[]; history: LeagueWeek[]; peels?: Record<string, number> };
/**
 * A settled league week. step 8 days: `table` (each rival's finish, under their roster name), `nemesis` and `coop`
 * (roster names) are saved from then on, for the rival files (rival-files.ts); older weeks have only your own result.
 */
export type LeagueWeek = { week: string; tier: number; rank: number; xp: number; table?: FinishRow[]; nemesis?: string; coop?: string };
/** A rival's finish in a settled league week: roster name (league.ts rosterName), the name shown then, XP and peels taken. */
export type FinishRow = { base: string; name: string; emoji: string; xp: number; peels?: number };
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
  keyChest?: ChestPrize; // a chest opened with a key bought in the shop (one a day), and what it gave
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
  questSlots?: number; // quests the day keeps: 4 once a quest card was bought for it (quests.ts), else 3
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
  doneTasks?: { id: string; at: number; title?: string; since?: number }[]; // tasks finished that day, kept when the task is later deleted or cleared (step 8 days: with its title and creation time, done-list.ts)
  critBy?: Record<string, { id: string; dmg: number }>; // crit key -> the entry that rolled it, so undoing it takes the damage back; dropped at rollover
  // step 2b
  xpHours?: Record<number, number>; // hour (0–23) -> the day's xpEarned as last seen in that hour, for the ghost of last week (lib/xp-timeline.ts); kept 14 days
  // step 4
  cues?: Record<string, number>; // if-then cues that went off in the app that day: habit id (or 'gym') -> when (if-then.ts)
  comeback?: string; // the missed planned gym day this day's first workout came back from (comeback.ts), so undoing it takes the bonus back
  // step 8 days
  gymAt?: { hour: number; minute: number }; // that day's gym time, moved to a free slot on Plan (plan-slots.ts gymTimeOn): the gym reminders, the shame slot and the slip time follow it
  // step 8 game
  shot?: Shot; // the morning's call (lib/prediction.ts), settled at the day's rollover
  habitsMini?: string[]; // habits done as their mini version that day (also in `habits`; lib/mini.ts)
  salvage?: string; // the 10-minute salvage's activity id (lib/mini.ts): once a day, kept if the activity is deleted
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
  woop?: Woop; // step 8 game: the outcome, the obstacle scouted at signing and its if-then plan (lib/woop.ts)
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

export type Countdown = { id: string; title: string; emoji: string; date: string; yearly: boolean; createdAt: number; until?: string }; // until (step 8 days): a trip's last day, offered as away days (away-ahead.ts)

export type Habit = {
  id: string;
  name: string;
  emoji: string;
  days: Weekday[]; // empty = every day
  remindHour: number | null;
  createdAt: number;
  plan?: IfThen | null; // step 4: an if-then plan (if-then.ts)
  perWeek?: { min: number; max: number } | null; // step 4: a weekly range ("2–4× this week, any days"); `days` is ignored then
  mini?: string | null; // step 8 game: the mini version ("shoes on, 2 minutes"), done in its place on a hard day (lib/mini.ts)
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
  cosmetics?: { owned: string[]; worn: Partial<Record<'hat' | 'held' | 'aura' | 'pet', string>>; title?: string; hidden?: ('badge' | 'respect')[] }; // lib/cosmetics.ts; hidden: avatar extras switched off
  lair?: string[]; // lib/lair.ts: the lair pieces bought, by id
  bossNames?: Record<string, string>; // week key (its Monday) -> the name the owner gave that week's boss
  rivalNames?: Record<string, string>; // a rival's roster name -> the name the owner gave them, for every league they turn up in
  silk?: { month: string; tier: number; prev?: { month: string; tier: number } }; // Silk Track (lib/silk-track.ts): the month on record and the highest tier handed out in it, and the month before
  // cluster F
  eggsFound?: Record<string, Record<string, number>>; // Easter hunt: year -> egg id -> found at
  advent?: Record<string, number[]>; // Advent Web (lib/advent.ts): year -> doors opened
  prizesAccepted?: string[]; // years whose S.P.I.D.E.R. Prizes (lib/prizes.ts) were accepted
  nemesisLog?: Record<string, { name: string; emoji: string; beaten: boolean }>; // league week -> that week's nemesis, for the yearly Wrapped
  backupFolderUri?: string | null; // folder picked for automatic daily backups (a persisted SAF uri)
  // cluster E
  rivalTalk?: { week: string; rank: number; day: string; n: number } | null; // last league rank seen and today's rival remarks (rival-talk.ts)
  topTomorrow?: { day: string; ids: string[]; when?: Record<string, TopWhen> } | null; // task ids picked in an evening debrief for that day's top 3 (memory.ts); when (step 8 days): task id -> when it's booked (plan-slots.ts)
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
  // step 8 terrarium
  moltSeen?: number; // tank-life.ts: the level the spider last molted for (hydrate: the level reached); a molt is due below the peak level
  molts?: number; // molts acted out in the tank, a total (its shed skins)
  lairAt?: Record<string, number>; // lair piece id -> when it went in (hydrate: first sight for older pieces), for the plants' growth
  lairGrowth?: Record<string, number>; // plant piece id -> the most it has grown (0–1), so a plant never shrinks
  tankSnaps?: Record<string, string>; // 'YYYY-MM' -> the month's automatic snapshot of the tank (a file in files/photos)
  eggSacs?: EggSac[]; // egg-sacs.ts: dropped by a gold chest or a boss kill, hatched by walking
  spiderlings?: Spiderling[]; // hatched from egg sacs; a few live in the terrarium
  // step 8 sweden
  sweden?: SwedenState; // one-tap tasks added, the tax return approved, the preparedness checklist (lib/people-days.ts, deklaration.ts, beredskap.ts)
  // step 8 stockholm
  sthlmOutings?: Outing[]; // weekend events added to the Plan (lib/sthlm-events.ts), for Wrapped's month total
  sthlmClimate?: SthlmClimate; // Stockholm weather trivia (lib/sthlm-climate.ts): month means, records set since the table, the last record toast
  // step 8 days
  slotPlans?: SlotPlan[]; // free slots on Plan given a job: a focus block or a task, each with its reminder (plan-slots.ts)
  pastYou?: PastYou; // notes from past you (past-you.ts): lines for the you who's about to skip, and the debrief's wins
  focusSide?: FocusSide | null; // the Web Focus session's spotter and task, running or just finished (spotter.ts)
  // step 8 game
  shotsPaid?: string; // 'YYYY-MM': the last month whose calls were scored and paid (lib/prediction.ts)
  bossPicks?: Record<string, string>; // week key (its Monday) -> the boss picked for that week (lib/boss-pick.ts)
  chapters?: Chapter[]; // fresh-start chapters, oldest first (lib/chapters.ts)
  contractLog?: ContractEntry[]; // settled contracts, oldest first, the newest 52 (lib/contract-log.ts)
  // step 9 story
  remarks?: Record<string, RemarkMark>; // once-only remarks (lib/remarks.ts): id -> when it was said, or that it waits for a day that isn't quiet
  mail?: Letter[]; // the mailbox (lib/mail.ts): letters from the cast, oldest first, the newest MAIL_KEEP
  bigDays?: BigDayAnswer[]; // how one-off calendar events went (lib/big-days.ts): kind and answer only, never the event's title
  cipher?: CipherState; // intercepted Syndicate memos and the mole hunt (lib/cipher.ts)
  meta?: MetaState; // "I remember the other timeline" (lib/meta-winks.ts): the week each wink was last said, and what it counts
  install?: string; // the install (lib/install-id.ts) that last had this save, so a restore can tell a new phone
};

// step 8 days
/** When a top-3 task is booked for: a free calendar gap (with an optional ping at its start), after gym, or after the first coffee. */
export type TopWhen = { kind: 'slot'; at: number; end: number; ping?: boolean } | { kind: 'gym' } | { kind: 'coffee' };
/** A free slot on Plan given a job (plan-slots.ts): a reminder at `at` with the Focus 25 min button, or one for a task. */
export type SlotPlan = { id: string; day: string; at: number; end: number; kind: 'focus' | 'task'; taskId?: string; title?: string };
/** One line from past you (past-you.ts): `skip` for the you who's about to skip, `win` a "glad I did this" from the debrief. */
export type PastNote = { id: string; text: string; at: number; day: string; kind: 'skip' | 'win'; after?: 'workout' | 'contract' | 'mood' | 'debrief' };
/** `askedWeek`: the week (its Monday) whose one ask was made; `ask`: a good moment's ask, waiting for its line. */
export type PastYou = { notes: PastNote[]; askedWeek?: string; ask?: { why: 'workout' | 'contract' | 'mood'; at: number } | null };
/** A league rival working alongside in Web Focus (spotter.ts): their name as shown, roster name and planned minutes. */
export type Spotter = { base: string; name: string; emoji: string; minutes: number };
/**
 * The Web Focus session started at `start`: its spotter, the Plan task it's about, and for the spotter's extra
 * round the session it adds to (`extends`). `closed`: the end-of-session offers were answered.
 */
export type FocusSide = {
  start: number;
  spotter?: Spotter;
  taskId?: string;
  extends?: { day: string; id: string; minutes: number };
  closed?: boolean;
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
  recurring?: boolean; // step 9 story: part of a repeating series (big-days.ts leaves those out)
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

// step 8 terrarium
/** An egg sac (egg-sacs.ts): hatches after `km` of watch steps from `since` (minus `skip`, that day's steps before it dropped), at `stepM` per step. */
export type EggSac = { id: string; from: 'chest' | 'boss'; key: string; at: number; since: string; skip: number; km: number; stepM: number };
/** A spiderling hatched from an egg sac, and the coins its hatching paid. */
export type Spiderling = { id: string; from: 'chest' | 'boss'; key: string; laidAt: number; hatchedAt: number; km: number; coins: number };

// step 8 sweden
/** Built-in people days (people-days.ts): Mors dag, Fars dag, Alla hjärtans dag. */
export type PeopleDayId = 'mors' | 'fars' | 'valentine';
/**
 * Someone whose day gets a morning reminder: their name day (`nameDay`, looked up in the almanac when added) or
 * a date picked by hand, with what it is ("birthday"). `md` is "MM-DD"; `since` is when they were added.
 */
export type Person = { id: string; name: string; md: string; nameDay: boolean; what?: string; since: number };
export type SwedenPrefs = {
  nameDays?: boolean; // HQ shows today's names and flag day (default on)
  people?: Person[]; // opt-in: nobody until added
  days?: Partial<Record<PeopleDayId, { who: string; since: number }>>; // opt-in: on once set, `who` for the task ("Call Dad")
  daysSince?: Partial<Record<PeopleDayId, number>>; // when each day was last switched on, kept while it's off (a quick off/on keeps it)
  fika?: boolean; // the fika almanac: HQ banner and that day's food on quick add (default on)
  siren?: boolean; // Hesa Fredrik's test: a heads-up at 14:50 (default on)
  deklaration?: boolean; // the tax return countdown and nudges (default on)
};
export type SwedenState = {
  tasks?: Record<string, string>; // 'fars:2026', 'dekl:2027' -> the task added for it with one tap (added once)
  dekl?: Record<string, number>; // year -> when the tax return was marked approved
  prep?: Record<string, string[]>; // year -> preparedness checklist items ticked (beredskap.ts PREP_ITEMS)
  prepPaid?: string[]; // years whose checklist paid its coins
};
// step 8 stockholm
/** An event added to the Plan from HQ's weekend card (sthlm-events.ts): its task, and the day it's on (Wrapped counts by that). */
export type Outing = { id: string; day: string; title: string; task: string; at: number };
/** A Stockholm temperature record set after the climate table was built (sthlm-climate.ts): warm/cold daily mean, high max, low min. */
export type NewRecord = { day: string; kind: 'warm' | 'cold' | 'hi' | 'lo'; v: number };
/** Stockholm weather trivia (sthlm-climate.ts): the day yesterday's readings came in, the last day checked for records, month means, new records, the day whose record was toasted. */
export type SthlmClimate = { fetchedDay?: string; checked?: string; months?: Record<string, number>; records?: NewRecord[]; toasted?: string };
// step 8 game
/** A call made in the morning (prediction.ts): `p` is the chance it gave, `result` is set when the day rolls over. */
export type ShotCall = 'no' | 'flip' | 'probably' | 'lock';
export type Shot = { q: 'gym' | 'quests'; call: ShotCall; p: number; at: number; result?: 'hit' | 'miss' | 'void' };
/** A situation that could wreck a contract's week (woop.ts). Situations only, never the body. */
export type ObstacleId = 'late_meetings' | 'long_day' | 'rain' | 'gaming' | 'doomscroll';
/** WOOP at signing: the best outcome, the obstacle, its if-then plan. `seen`: days a calendar obstacle showed up. */
export type Woop = { outcome: string; obstacle: ObstacleId; plan: IfThen; seen?: string[] };
/** A fresh-start chapter (chapters.ts): begun on a landmark, named by the owner, with one thing to restart. */
export type Chapter = { n: number; title: string; from: string; landmark: string; restart?: { text: string; habitId?: string }; at: number };
/** A settled contract (contract-log.ts). `payout`: coins paid back (the payout when won, the stake when voided). */
export type ContractEntry = {
  week: string;
  goal: ContractGoal;
  difficulty: 'easy' | 'normal' | 'hard';
  stake: number;
  target: number;
  status: 'won' | 'lost' | 'voided';
  payout: number;
  at: number;
  woop?: { obstacle: ObstacleId; showed: number; fired: number };
};

// step 9 story
/** A once-only remark (remarks.ts): when it was said (`kind`: its gentle version, on a quiet day), or `wait` for a day that isn't quiet. */
export type RemarkMark = { at: number; kind?: true; wait?: true };
/** Who writes (mail.ts): a beaten boss, the Couch King in exile, a co-op partner, Mamma Spindel in Småland. */
export type MailFrom = 'boss' | 'king' | 'rival' | 'mamma';
/**
 * A letter in the mailbox (mail.ts). `ref` is what it's about, so each is sent once ('resign:<week>', 'coop:<week>',
 * 'mamma:<YYYY-MM>', 'care:<day>', 'exile:<week>'). `gift`: a knitted cosmetic that came with it, `coins` in its place
 * when it's owned already. `memo`: an intercepted memo on the back (cipher.ts).
 */
export type Letter = {
  id: string;
  from: MailFrom;
  sender: string;
  emoji: string;
  subject: string;
  body: string;
  at: number;
  day: string;
  ref: string;
  read?: boolean;
  gift?: string;
  coins?: number;
  memo?: boolean;
};
/** A one-off calendar event's kind (big-days.ts). */
export type BigKind = 'dentist' | 'doctor' | 'interview' | 'exam' | 'flight' | 'party' | 'wedding' | 'presentation' | 'driving' | 'moving' | 'date' | 'concert' | 'race' | 'haircut';
export type BigAnswer = 'nailed' | 'survived' | 'rough';
/** How a big day went, asked in the evening debrief. `id` is a hash of the calendar event, never its title. */
export type BigDayAnswer = { id: string; kind: BigKind; day: string; answer: BigAnswer; at: number };
/** Where a memo was intercepted (cipher.ts). */
export type MemoPlace = 'postcard' | 'fly13' | 'version' | 'leet' | 'letter';
/** The mole hunt (cipher.ts): the save's seed, memos in the order found, names wrongly accused, the right one once named. */
export type CipherState = { seed: string; found: { place: MemoPlace; at: number }[]; wrong?: string[]; solved?: { name: string; at: number } };
/** A meta-move the spider winks at (meta-winks.ts). */
export type MetaKind = 'restore' | 'newPhone' | 'relog' | 'opens' | 'theme' | 'backdated';
/**
 * `weeks`: kind -> the week (its Monday) it was last said, at most once a week each. `opens`: the latest app opens,
 * `themes`: theme switches that day, `undo`: the glass just undone, `pending`: winks waiting for the next run (after a reload or a restore).
 */
export type MetaState = {
  weeks?: Partial<Record<MetaKind, string>>;
  opens?: number[];
  themes?: { day: string; n: number };
  undo?: { at: number; ml: number };
  pending?: MetaKind[];
};
