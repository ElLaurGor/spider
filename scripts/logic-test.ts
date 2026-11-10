/// <reference types="node" />
// Offline logic checks for the pure modules in src/lib. Run: npm run test:logic
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { basename } from 'node:path'; // step 9 story

import { addDays, atTime, dayKey, fmtClock, fmtDuration, isDayKey, isoWeek, MIN, startOfWeek } from '../src/lib/dates';
import { foodWeek } from '../src/lib/food-week';
import { hiddenFoods, QUICK_MAX, quickAddOf, quickFoods, withPinned, withRemoved, withRestored } from '../src/lib/quick-add';
import { defaultState, emptyDay, hydrate, idTime, withRealDays } from '../src/lib/defaults';
import { BASE_KEY, changedMonths, daysByMonth, fingerprint, INDEX_KEY, monthKey, olderCopy, readSaved, ReadError, ROW_LIMIT, rowsFor, utf8Bytes, V1_KEY, wouldWipe, writeVerified } from '../src/lib/persist';
import { fillLine, freshLine, GOLDEN, LINES, line } from '../src/lib/lines';
import { banLine, bannedLines, dayLine, lineId, lineIdFor, lineMemory, setLineMemory, unbanLine } from '../src/lib/lines';
import { insightById, jetlagRemark, jitAllowed, lateCoffeeRemark, lateGameRemark, nearBedtime, withJitSaid } from '../src/lib/jit';
import {
  avgMood,
  caffeineMg,
  effectiveSavage,
  emotionCounts,
  moodDays,
  totalCoffees,
  freeSlots,
  gamingUsedMs,
  inMeeting,
  lastSession,
  waterSlots,
  foodBase,
  recentFoods,
} from '../src/lib/selectors';
import { SECRET_ACHIEVEMENTS } from '../src/lib/xp';
import { changeOver, recentAverage, rolling, series } from '../src/lib/body-log';
import { ACHIEVEMENTS, activityXp, focusXp, levelForXp, levelProgress } from '../src/lib/xp';
import { HQ_SECTIONS, hqHidden, hqOrder, hqVisible, moveSection, toggleSection, WEEK_PARTS, withWeekCard } from '../src/lib/hq-layout';
import { medalLine, weekDaysLeft } from '../src/lib/week-card';
import { fmtTime } from '../src/lib/dates';
import { allRivalLines, rivalTalk } from '../src/lib/rival-talk';
import { eveningKey, IMMORTAL_DAYS, immortalTask, taskAgeDays, tomorrowKey, topToday, yesterdayHighlight } from '../src/lib/memory';
import { newLeague, rivalXp, settle, standings, weekKeyOf, TIERS } from '../src/lib/league';
import { coinsFor, rollChest } from '../src/lib/economy';
import { daysLeft, nextDate, upcoming } from '../src/lib/countdowns';
import { insights } from '../src/lib/insights';
import { bhKeep, permP } from '../src/lib/stats';
import { countedDay, firstDataDay, roughDay, usedOn } from '../src/lib/day-filters';
import { hallOfFame } from '../src/lib/records';
import { monthWrapped } from '../src/lib/wrapped';
import { cycleInfo, periodStarts, isPredictedPeriod } from '../src/lib/body';
import { trainedOn, recentGames, gameTotals, gamePenalty, shownSteps, syncedSleep, syncedSteps, waterGoalFor, waterGoalParts, waterMl, withPastHealth } from '../src/lib/selectors';
import { searchFoods } from '../src/lib/food-db';
import { pickQuests, questsFor, bossFor, BOSSES, WEAKNESS, xpPace } from '../src/lib/quests';
import { habitsFor } from '../src/lib/habits';
import { weekReport, gradeOf, dayScoreFor } from '../src/lib/report';
import { RESPECT, respectFor } from '../src/lib/respect';
import { isAllSaintsDay, isSnow, seasonOn, winterOf } from '../src/lib/seasons';
import { canSign, contractProgress, roughWeek } from '../src/lib/contracts';
import { daylightGain, describe as wx, rainNote, weatherKey } from '../src/lib/weather';
import {
  activeAlerts,
  alertWhen,
  aqiBand,
  fetchSmhi,
  fetchVma,
  isMine,
  pollenLevel,
  sourceAfter,
  sourceNote,
  sourceOk,
  triageAlerts,
  warningsOf,
  type Alert,
  type AlertLevel,
} from '../src/lib/outside';
import { getJson } from '../src/lib/http';
import { loadFoods } from '../src/lib/food-db';
import { fetchWeatherHistory, weatherMissing } from '../src/lib/weather';
// cluster D
import { phaseOn } from '../src/lib/body';
import { BED_MG, bedtimeCaffeine, bedtimeOn, caffeineCurve, caffeineLeft, cupsAround, lastCallClock, lastCallOn, lastCallText } from '../src/lib/caffeine';
import { cycleNotes, cycleStats } from '../src/lib/cycle-stats';
import { detective } from '../src/lib/detective';
import { experimentDays, experimentResult, verdictText } from '../src/lib/experiments';
import { pressureDrops } from '../src/lib/weather';
import { catchFly, critDamage, FLIES, flyFor, logEvents, MAX_CRITS, MAX_SPAWNS, rollCritters } from '../src/lib/critters';
import { kindDay, pageDue, unlockPages, writePage } from '../src/lib/diary';
import { webDays, webGeometry, webParams } from '../src/lib/web-art';
// cluster A
import { bestiary, lastKillDay, LORE } from '../src/lib/bestiary';
import { WEEKDAYS_LONG } from '../src/lib/dates';
import { endPause, pausedInWeek, pausedOn, startPause } from '../src/lib/pause';
import { cycleHeadsUpAt, isPlanned, plannedToCancel, stormPlan, wrappedReminder } from '../src/lib/reminder-times';
import { EASE_STEP, gentleDay, goldenAllowed, lastMoodLow, periodDay, quietDay, toneOn } from '../src/lib/tone';
import { gameLineKey, nightVerdictKey, stepsLineKey, verdictLineKey } from '../src/lib/line-context';
import type { DayLog, Weekday } from '../src/lib/types';
import { FINAL_BOSS, finalBossDue, pickQuestsWithFocus, rageWeaknessOf, rerollFor, xpPace as paceOf } from '../src/lib/quests';
import { WEAK_SPOT_QUESTS, weakSpot } from '../src/lib/weak-spot';
// step 2 game
import { gentleQuestFor, KING_REMATCH_WEEKS, kingRematchFor, kingWeeksOf, reducedDay, weaknessOf } from '../src/lib/quests';
import { DRAFT_SIZE, draftFor, draftOpen, draftPickable, questInfo, questMet, validDraft } from '../src/lib/quests';
import { bossFinisher } from '../src/lib/boss-plan';
import { bossRecap, lastWeekKey, pendingRecap, recentRecaps } from '../src/lib/boss-recap';
import { goalsOn, liveGoals, withGoals } from '../src/lib/goals';
import { doneTasksOn, gameCapAt, gamesInTimerMin, gamingBudgetMin, gamingUsedMs as usedMs, waterGoalMet, workoutsThisWeek } from '../src/lib/selectors';
import { areaScores } from '../src/lib/weak-spot';
import { chestShelf, SHELF_MAX, withChestGold } from '../src/lib/loot';
import { applyFixes, moveToWeekCard, recheckCoffeeGremlin } from '../src/lib/fixes';
import { credit, earnBonus, ledgerOn, penalize, refundPenalty, unreward, withoutUndoRecords } from '../src/lib/ledger';
import { withoutCrit } from '../src/lib/critters';
import { createQueue } from '../src/lib/action-queue';
import { bgTone } from '../src/lib/bg-config';
import { actionFromButton, isQueued, SILENT_BUTTONS, statusWithGlass, tapKey, tapLanded, type QueuedAction } from '../src/lib/reminder-actions';
import { mergeSeen as mergeSeenLists } from '../src/lib/outside';
import { DEFAULT_WIDGET_COLORS, forToday, snapshotOf, widgetLines, withQueued } from '../src/lib/widget-data';
// cluster B
import { bankFor, PITY_AFTER, rollChest as rollChestB, shopPrice } from '../src/lib/economy';
import { daysLeftInWeek, difficultyOk, payoutOf, targetFor } from '../src/lib/contracts';
// step 4 plans: if-then plans, the comeback bonus, weekly range habits
import { newMission, signOptions } from '../src/lib/contracts';
import { habitsShownOn, rangeDueOn, rangeNeededOn, rangeRemindOn, rangeText, rangeWeek } from '../src/lib/habits';
import { checkCues, cueHappened, cueReminders, cueSaid, cueTimes, firedEvents, onCueNow, planBToday, planMinutes, planText, rainAtGym, reminderRetired } from '../src/lib/if-then';
import { COMEBACK, missedGymBefore } from '../src/lib/comeback';
import { bankRate, focusBonusMin, healShare, perkBlocker, perkPoints, workoutBonusMin } from '../src/lib/perks';
import { restedAfter, restedGain, restedSplit, RESTED_CAP } from '../src/lib/rested';
import { buyable, COSMETICS, cosmeticOf, legendaryDrop, shownTitle, titlesEarned, whereToGet, worn, withOwned, withWorn } from '../src/lib/cosmetics';
import { checkSilkTrack, editionFor, grantSilk, monthXp, SILK_TIERS, silkBadges, silkStatus, tierForXp, tierXp } from '../src/lib/silk-track';
import { goldChest } from '../src/lib/loot';
import { xpForLevel } from '../src/lib/xp';
// cluster F
import { allSaintsDay, easterSunday, holidayOn, holidaysOf, isDayOff, isKlamdag, isPayday, midsummerEve, paydayOf, upcomingDays } from '../src/lib/swedish-days';
import { allEggsSomeYear, EGGS, eggsFoundOn, eggsLeft, oldTasksDoneOn, staleTasks } from '../src/lib/traditions';
import { inBedFrom, nightPhone, nightWindow } from '../src/lib/night';
import { autoBackupDue, backupNudge } from '../src/lib/backup-due';
import { workoutFor } from '../src/lib/selectors';
import { asleepMin, clockLabel, nightClock, nightOf, rhythmOf, stagedMin, withNights } from '../src/lib/sleep';
import { nightWindow as sleepWindow, ZEPP } from '../src/lib/sleep';
import { coveredUntil, overlapsIn, sourceName, stepsByHour, stepSources, stepsIn, stepsPlan, stepsReport, stepsVerdict, type StepsCheck } from '../src/lib/steps';
import { allDayLocal } from '../src/lib/calendar-days';
import { autoBackupsToPrune, orphanPhotos, pickBackup, skipAutoBackup } from '../src/lib/backup-pick';
import { isDoomscroll } from '../src/lib/doomscroll';
import { eventsOn } from '../src/lib/selectors';
import { meteoTime, needsPlaceInfo, samePlace, staleNote } from '../src/lib/weather';
// step 4 hq
import { departureText, leaveInMin, nextDepartures, parseDepartures, parseDeviations, parseStops, plannedText, relevantDeviations, routesOf, siteIdOf, slRetryMs } from '../src/lib/sl';
import { cancelledNote, type SlDeparture } from '../src/lib/sl';
import { adviceOf, nextStorm, stormAlertsOf, stormDays, stormOn } from '../src/lib/storm';
import { readinessFor } from '../src/lib/readiness';
import { patchSummary, roughPatch, showRoughPatch, PATCH_QUIET_MS } from '../src/lib/rough-patch';
import { EMOTIONS, nameItFor, withNamed } from '../src/lib/mood';
import { heartIn, workoutWindows } from '../src/lib/workout-heart';
import { movementMap, stillestHour } from '../src/lib/movement';
// step 2b progress
import { MEDALS, medalList, medalsFor, medalTotals, needFor, openDays, settleMedals } from '../src/lib/medals';
import { ghostOf, ghostText, withoutOldXpHours, withXpHour, xpByHour } from '../src/lib/xp-timeline';
import { NEMESIS_PRIZE, nemesisOf } from '../src/lib/league';
import { allCoopLines, baseFor, COOP_COINS, coopFor, coopResultText, coopStatus, coopSummary, GOALS, goalOf, isCoopWeek, partnerCount, settleCoop, coopTarget } from '../src/lib/coop';
import { BOT_KM_A_DAY, botKm, checkTrek, lengthOf, newTrek, OWNED_ITEM_COINS, ROUTES, trekKm, trekStatus, trekSummary, trekTable } from '../src/lib/trek';
// step 5 game fixes
import { recheckDay, recheckTask, uncheckTask } from '../src/lib/tasks';
import { activityMinutes, bestBeforeDay, isRecord, setSessions, trainMinutes } from '../src/lib/selectors';
import { bossSeasonOf, reopenQuests } from '../src/lib/quests';
import { lastTrainedBefore } from '../src/lib/comeback';
import { canUnmove, copingPlan, copingWeekday, moveDayName, moveTargets, pendingWhy, slipAt, slipping, withMove, withoutMove, withWhy } from '../src/lib/workout-move';
import { poolFor } from '../src/lib/lines';
// step 6 seasons
import { adventCandles, adventYear, doorOpenable, doorPrize, doorsWaiting, julfridOffer, julfridPause, julfridPlan, kalleAnka, openDoor } from '../src/lib/advent';
import { acceptPrizes, isPrizeDay, prizeCardUp, prizesFor } from '../src/lib/prizes';
import { nemesisOfYear, withNemesis, yearWrapped, yearWrappedDue } from '../src/lib/year-wrapped';
import { firstAdventSunday, isJulfridKey } from '../src/lib/swedish-days';
import { owns, shows, withShown } from '../src/lib/cosmetics';
import { forSale, PET_COSMETICS, PET_PRICE, petCaught } from '../src/lib/cosmetics';
import { CHEST_KEY_COST, cleanName, NAME_MAX } from '../src/lib/economy';
import { LAIR, LAIR_HOME, lairLeft, lairPieces, lairSpots, nextPiece, nextSpot, withPiece } from '../src/lib/lair';
import { PEEL_XP, peelBlocker, PEELS_PER_WEEK, rosterName, withPeel, withRivalName, withRivalNames } from '../src/lib/league';
import { QUEST_SLOTS, questCardBlocker, questSlotsOn, withBossName, withQuestCard } from '../src/lib/quests';
import { voiceOf } from '../src/lib/rival-talk';
// step 8 bug fixes
import { taskUsed } from '../src/lib/people-days';
import { pausedDaysInMonth } from '../src/lib/pause';
import { VOID_BRIER } from '../src/lib/prediction';
import { buildPiece, createWorld, planRoute, spots3d, TANK } from '../src/lib/terrarium-3d';
import { pauseOn } from '../src/lib/pause';
// step 8 sweden
import { fathersDay, fettisdagen, lastWeekday, mothersDay, nthWeekday, sirenTests, surstrommingDay } from '../src/lib/swedish-days';
import { mdLabel, nameDayOf, nameDayText, namesOn, parseNameDays } from '../src/lib/name-days';
import { aheadAt, nextPeopleDay, nextPersonDay, peoplePings, peopleSoon, PEOPLE_DAYS } from '../src/lib/people-days';
import { FIKA, fikaOn, fikaPortion } from '../src/lib/fika';
import { nextSirenTest, PREP_COINS, PREP_ITEMS, prepWeek, prepWeekOn, sirenPing, sirenToday, tickPrep } from '../src/lib/beredskap';
import { deklarationFor, deklarationOn, deklDone, deklPings } from '../src/lib/deklaration';
import type { PlannedPing } from '../src/lib/people-days';
import type { State as SweState, StormAlert as SweStorm } from '../src/lib/types';
// step 8 stockholm
import { buildClimateTable, daysInMonth, doyOf, joinObs, monthMeanOf, parseSmhiCsv, parseSmhiLatest, type DayObs } from '../src/lib/climate-table';
import { CLIMATE, climateDue, climateUpdate, dateLabel, factsOn, GLITCH_C, monthLine, monthMeans, nearStockholm, recordsBroken, recordText, triviaLine } from '../src/lib/sthlm-climate';
import { cleanStation, dayText, decodeEntities, EVENTS_MAX_PAGES, eventsRetryMs, eventsUrl, fetchWeekend, nextSlot, outingsIn, outingTask, parsePage, pickWeekend, planned } from '../src/lib/sthlm-events';
import { slotsOf, weekendEvent, weekendKey, weekendOf, whenText, type RawEvent, type RawPage } from '../src/lib/sthlm-events';
// step 8 days
import { awayOffers, offerKey, planAway, plannedAways, rangeText as awayRange, withoutPlannedAway } from '../src/lib/away-ahead';
import { doneBetween, doneOn, doneTitle, monthDone } from '../src/lib/done-list';
import { focusBreakdown, focusMinutes } from '../src/lib/focus-log';
import { journalEmotions, journalMonth } from '../src/lib/mood-journal';
import { ASK_OPEN_MS, goodMoment, openAsk, pastYouFor, pastYouTail, winOn, withoutAsk, withoutNote, withPastYouAsk, withSkipNote, withWin } from '../src/lib/past-you';
import { phoneWeek } from '../src/lib/phone-week';
import { gymTimeOn, keptWhen, slotPlansOn, slotReminders, whenLabel, whenNow, withGymAt, withoutSlotPlan, withSlotPlan, withTopWhen } from '../src/lib/plan-slots';
import { finishOf, knownRivals, rivalFile } from '../src/lib/rival-files';
import { endOffer, extraRound, OFFER_MS, sideFor, spotterFor, usualFocus, withExtension } from '../src/lib/spotter';
import { recordTask } from '../src/lib/tasks';
// step 8 game
import { brierOf, calibration, callHistory, CALLS, MIN_CALLS, outcomeOf, scoredShots, settleShotMonth, settleShots, SHOT_COINS, shotOpen, shotQuestion, titleFor, withShot, yesterdayShot } from '../src/lib/prediction';
import { calendarObstacleOn, dataObstacleOn, obstacleCue, obstacleOptions, planFor, withSeen, woopCue, woopOf, woopReminders, woopTally } from '../src/lib/woop';
import { didMini, MINI_XP, miniOffered, miniRef, salvageOffered, withMini, withoutMini } from '../src/lib/mini';
import { chapterOn, chaptersBetween, cleanBirthday, firstAugustWorkday, landmarkOffer, landmarksOn, nextChapter, withChapter } from '../src/lib/chapters';
import { multFor, revealedMult, SEALED_ODDS, sealedOn, sealedXp } from '../src/lib/sealed-card';
import { bossOptions, pickedFor, pickWeek, withBossPick } from '../src/lib/boss-pick';
import { habitHistory, trackerHistory } from '../src/lib/history';
import { contractStats, LOG_KEEP, netOf, withLogged } from '../src/lib/contract-log';
import { diaryChapters } from '../src/lib/diary';
import { bossRank, rotationBossOf, weekBossOf } from '../src/lib/quests';
import { XP } from '../src/lib/xp';
import type { CalEvent, Contract, ContractGoal, ShotCall, Tracker } from '../src/lib/types';
// step 8 terrarium
import * as THREE from 'three';
import { roll } from '../src/lib/critters';
import { EGG_CHANCE, EGG_COINS, EGG_KMS, eggDrops, eggKm, hatchEggs, MAX_EGGS } from '../src/lib/egg-sacs';
import { asleepAt, daylightAt, DEW_DROPS, dressingFor, grewSince, growthOf, hatShape, IDLE_LIFE, lighting, MOLT_GROWTH_MAX, moltState, NO_WEATHER, PET_MOTION, plantGrowth, sizeAfter, SPROUT, sunTimes } from '../src/lib/tank-life';
import { TANK_EVENT_MS, TANK_QUEUE, tankEventsOf, tankLifeOf, tankMode, tankSnapsFor, tankWeather, webFor, withMolt, withTankEvents, type TankLife } from '../src/lib/tank-life';
import type { DayForecast } from '../src/lib/weather';
// step 9 care
import { careOffer, OFFER_FOR_MS, STEP_OF, stepFor, withCareSeen } from '../src/lib/care-step';
import { energyCap, JOY_ASK_FOR_MS, joyAsk, joyPick, joyReminders, joySlot, liftText, withJoyAnswer, withJoyItem, withJoyTry, withoutJoyItem } from '../src/lib/joy';
import { lastKindWord, slipCard, slipsOn, withKindWord } from '../src/lib/slips';
import { quietUntil, shutdownQuiet, slotAt, withShutdown, withWorry, withWorrySettled, worriesDue, worryPings } from '../src/lib/worry';
import { NIGHT_WORDS, nightShiftNow, nightWord, thoughtsOf } from '../src/lib/night-shift';
import { fuelBeforeGym, logsFoodMostDays, mealRhythm } from '../src/lib/gym-fuel';
import { marathonGap, movePingOf } from '../src/lib/marathon';
import type { MoodEntry } from '../src/lib/types';
// step 9 admin
import { CHORE_XP, choreDays, choreRef, choresDueBy, dueOn, grimOf, grimText, isChoreSkip, isDue, paidToday, syncChoreTasks, undoable, withChore, withChoreReset, withChoreSkipBought, withChoreTask, withoutChoreReset } from '../src/lib/chores';
import { codeIn, datesIn, deadlineText, parseShelfText, returnBy, shelfList, shelfPings, shelfRemindAt, withShelfDone, withShelfItem } from '../src/lib/shelf';
import { aheadTargets, choresForWeek, gymClashes, planWeekOf, REVIEW_COINS, reviewPrompt, reviewWeek, weekBigOn, weekDone, withAheadMove, withBurned, withFirstStep, withReviewSealed, withWeekBig, zombiesOf } from '../src/lib/review';
import { activeSinceOf, activeTasks, chasing, horizonDays, isActive, onHorizon, placeOf, taskLabel, withHorizon, withWaiting } from '../src/lib/horizons';
import { CONTRACT_GOALS } from '../src/lib/contracts';
import type { State as AdminState, Task as AdminTask } from '../src/lib/types';
// step 9 tank
import { backThisMorning, degrees, morningOf, nightOver, settleTrips, SHELF_SHOWN, souvenirFor, SOUVENIRS, storyKeys, tripMornings, tripOn, tripPlanned, tripsDue, tripStory, TRIP_BACKFILL } from '../src/lib/expeditions';
import { daySummary, GUEST_EPOCH, GUESTS, guestDayOf, guestFor, guestLineKey, guestOn, guestsDue, guestWeek, narrating, NARRATE_MS, settleGuests, withGuestAwake } from '../src/lib/guests';
import { anniversaryYears, dayNumber, firstsOf, PARTY_EVERY, partyOn } from '../src/lib/hatch-day';
import { decided, emptyRps, guessOf, habitsOf, nextOdds, playRound, rpsFinding, RPS_DAILY_COINS, RPS_KEEP, RPS_WIN_COINS, scoreOf, spiderThrow, throwCount, weekTally, BEATEN_BY, ROUNDS } from '../src/lib/rps';
import type { RpsState, RpsThrow } from '../src/lib/types';
// step 9 story
import { factsOf, remarkOf, REMARKS, remarksEarned } from '../src/lib/remarks';
import { checkStory, remarksNow } from '../src/lib/story';
import { CARE_COINS, KNITS, MAIL_KEEP, killedText, mailBanner, mailBannerKey, withMail, withRead } from '../src/lib/mail';
import { bigDaysOn, bigKindOf, briefParts, withBigAnswer } from '../src/lib/big-days';
import { accuse, cluesOf, guessesLeft, lettersKnown, memoFound, memoLine, memosFound, memoTexts, MOLE_PRIZE, moleOf, RUNES, runeMap, withMemo } from '../src/lib/cipher';
import { metaEvents, OPENS_WINK, saidThisWeek, THEMES_WINK, withOpen, withRestore, withThemeSwitch } from '../src/lib/meta-winks';
import { ROSTER_LIST } from '../src/lib/league';

// levels
assert.equal(levelForXp(0), 1);
assert.equal(levelForXp(99), 1);
assert.equal(levelForXp(100), 2);
assert.equal(levelForXp(299), 2);
assert.equal(levelForXp(300), 3);
assert.equal(levelProgress(150).into, 50);
assert.equal(levelProgress(150).needed, 200);

// lines: level 10 => always savage, level 1 => always mild, vars substituted
const fill = (xs: string[]) => xs.map((x) => x.replace('{name}', 'X'));
for (let i = 0; i < 200; i++) {
  assert.ok(fill(LINES.waterRemind.savage).includes(line('waterRemind', 10, { name: 'X' })));
  assert.ok(fill(LINES.waterRemind.mild).includes(line('waterRemind', 1, { name: 'X' })));
}
for (let i = 0; i < 100; i++) {
  const t = line('gymRemind', 10, { workout: 'Push' });
  assert.ok(!t.includes('{'), t);
}
// every placeholder used in a pool is one we actually pass somewhere
const known = new Set(['name', 'ml', 'left', 'workout', 'weight', 'reps', 'exercise', 'over', 'penalty', 'count', 'events', 'summary', 'level', 'title', 'n', 'limit', 'cutoff', 'mg', 'steps', 'sleep', 'habit', 'quest', 'boss', 'forecast', 'xp', 'product', 'kcal', 'activity', 'minutes', 'game', 'title', 'month', 'prize', 'reward', 'missing', 'tier', 'rank', 'app', 'time', 'pollen', 'aqi', 'band', 'goal', 'stake', 'coins', /* cluster E */ 'task', 'days', 'water', 'score']);
for (const k of ['weakness', 'day', 'until']) known.add(k); // cluster A
for (const k of ['done', 'budget']) known.add(k); // step 2 tone: the Gym and Game tabs
for (const k of ['rival', 'medals']) known.add(k); // step 2b progress: the nemesis and weekly medals
for (const k of ['hp', 'plan']) known.add(k); // step 2b boss: the weekend finisher and the recap
known.add('finding'); // step 4 lines: just-in-time insights
for (const k of ['when', 'happened', 'then', 'dmg', 'min']) known.add(k); // step 4 plans: if-then prompts and the comeback bonus
known.add('year'); // step 6 seasons: the yearly Wrapped
for (const k of ['sunrise', 'sunset']) known.add(k); // step 6: the dark-day weather lines
for (const [k, pool] of Object.entries(LINES)) {
  for (const t of [...pool.mild, ...pool.savage]) {
    for (const m of t.matchAll(/\{(\w+)\}/g)) assert.ok(known.has(m[1]), `${k}: unknown {${m[1]}}`);
  }
}

// formatting
assert.equal(fmtDuration(0), '0m');
assert.equal(fmtDuration(95 * MIN), '1h 35m');
assert.equal(fmtDuration(120 * MIN), '2h');
assert.equal(fmtClock(65_000), '01:05');
assert.equal(fmtClock(3_725_000), '1:02:05');

// water reminder slots: 08:00 … 21:30 every 90 min with defaults (wake 7, sleep 23)
const s = defaultState();
const slots = waterSlots(s);
assert.equal(slots[0], 8 * 60);
assert.equal(slots.at(-1), 21 * 60 + 30);
assert.equal(slots.length, 10);

// quick-add chips: one per food whatever the portion (a tap logs the latest one), photo-only meals left out
{
  const f = defaultState();
  const food = (id: string, name: string, kcal: number, protein: number, at: number, photo?: string) => ({ id, name, kcal, protein, at, photo });
  f.days[dayKey()] = {
    water: [],
    food: [food('a', 'Havregryn (60 g)', 220, 8, 1), food('b', 'Kvarg', 120, 20, 2), food('c', 'Havregryn (80 g)', 290, 10, 3), food('d', 'Meal', 0, 0, 4, 'file:///x.jpg')],
    sets: [],
    games: [],
    bonusGameMin: 0,
  };
  assert.deepEqual(
    recentFoods(f).map((x) => [x.name, x.n]),
    [
      ['Havregryn (80 g)', 2],
      ['Kvarg', 1],
    ],
  );
  assert.equal(foodBase('Ägg (2,5 g)'), 'Ägg');
  assert.equal(foodBase('Pasta (cooked)'), 'Pasta (cooked)');
}

// Fuel's food tests run in a function of their own: the module body is at TypeScript's control-flow size limit.
function foodTests() {
  // quick-add row: pinned foods first, the most-logged fill the rest; a food taken off stays off until put back
  {
    const q0 = defaultState();
    const food = (id: string, name: string, kcal: number, protein: number, at: number) => ({ id, name, kcal, protein, at });
    q0.days[dayKey()] = { ...emptyDay(), food: [food('a', 'Havregryn (60 g)', 220, 8, 1), food('b', 'Kvarg', 120, 20, 2), food('c', 'Havregryn (80 g)', 290, 10, 3), food('d', 'Ägg', 70, 6, 4)] };
    const on = (q: ReturnType<typeof quickAddOf>) => ({ ...q0, settings: { ...q0.settings, quickAdd: q } });
    const names = (q: ReturnType<typeof quickAddOf>) => quickFoods(on(q)).map((f) => `${f.pinned ? '📌' : ''}${f.name}`);
    let q = quickAddOf(q0);
    assert.deepEqual(names(q), ['Havregryn (80 g)', 'Kvarg', 'Ägg']);
    q = withPinned(q, { name: ' Proteinbar ', kcal: 199.6, protein: 20 });
    assert.deepEqual(quickFoods(on(q))[0], { name: 'Proteinbar', kcal: 200, protein: 20, pinned: true });
    assert.deepEqual(names(q), ['📌Proteinbar', 'Havregryn (80 g)', 'Kvarg', 'Ägg']);
    // editing a most-logged food pins it with its new numbers instead of the chip it was
    q = withPinned(q, { name: 'Havregryn (60 g)', kcal: 220, protein: 8 }, 'Havregryn (80 g)');
    assert.deepEqual(names(q), ['📌Proteinbar', '📌Havregryn (60 g)', 'Kvarg', 'Ägg']);
    // taken off: out of the fill and listed to put back; a pinned one is unpinned too
    q = withRemoved(withRemoved(q, 'Kvarg'), 'havregryn (60 g)');
    assert.deepEqual(names(q), ['📌Proteinbar', 'Ägg']);
    assert.deepEqual(hiddenFoods(on(q)), ['Havregryn', 'Kvarg']);
    q = withRestored(q, 'Kvarg');
    assert.deepEqual(names(q), ['📌Proteinbar', 'Kvarg', 'Ägg']);
    // a renamed food keeps its place, and the old name stays off the row
    q = withPinned(q, { name: 'Kvarg vanilj', kcal: 130, protein: 18 }, 'Kvarg');
    q = withPinned(q, { name: 'Proteinbar choklad', kcal: 210, protein: 20 }, 'Proteinbar');
    assert.deepEqual(names(q), ['📌Proteinbar choklad', '📌Kvarg vanilj', 'Ägg']);
    // pinning what's already pinned replaces it; a blank name changes nothing
    q = withPinned(q, { name: 'kvarg vanilj', kcal: 140, protein: 18 });
    assert.deepEqual(q.pinned.map((f) => [f.name, f.kcal]), [['Proteinbar choklad', 210], ['kvarg vanilj', 140]]);
    assert.equal(withPinned(q, { name: '  ', kcal: 1, protein: 1 }), q);
    // the fill can be switched off: pinned foods only
    assert.deepEqual(names({ ...q, auto: false }), ['📌Proteinbar choklad', '📌kvarg vanilj']);
    assert.deepEqual(hiddenFoods(on({ ...q, auto: false })), []);
    // pinned foods all show; the fill stops at QUICK_MAX chips
    let many = quickAddOf(q0);
    for (let i = 0; i <= QUICK_MAX; i++) many = withPinned(many, { name: `Mat ${i}`, kcal: 100, protein: 5 });
    assert.equal(quickFoods(on(many)).length, QUICK_MAX + 1);
    assert.ok(quickFoods(on(many)).every((f) => f.pinned));
    assert.equal(quickFoods(on(withRemoved(withRemoved(many, 'Mat 0'), 'Mat 1'))).length, QUICK_MAX);
  }

  // the week of food: averages over finished days with numbers (photo-only meals and today left out), per-day protein goals
  {
    const fw = defaultState();
    fw.settings.proteinGoal = 100;
    const mon = startOfWeek(new Date(2026, 9, 28));
    const k = (i: number) => dayKey(addDays(mon, i));
    const meal = (id: string, name: string, kcal: number, protein: number) => ({ id, name, kcal, protein, at: 1 });
    fw.days[k(0)] = { ...emptyDay(), food: [meal('a', 'Kvarg', 150, 25), meal('b', 'Havregryn (60 g)', 220, 8), meal('c', 'Lax', 600, 80)] };
    fw.days[k(1)] = { ...emptyDay(), food: [meal('d', 'Kvarg', 150, 25), meal('e', 'Meal', 0, 0)] };
    fw.days[k(2)] = { ...emptyDay(), food: [meal('f', 'Meal', 0, 0)] };
    fw.days[k(3)] = { ...emptyDay(), food: [meal('g', 'Havregryn (80 g)', 290, 10)] };
    const w = foodWeek(fw, new Date(2026, 9, 29, 12), k(3));
    assert.equal(w.monday, '2026-10-26');
    assert.deepEqual(w.days.map((d) => [d.kcal, d.protein, d.logged, d.done]).slice(0, 5), [
      [970, 113, true, true],
      [150, 25, true, true],
      [0, 0, false, true],
      [290, 10, true, false],
      [0, 0, false, false],
    ]);
    assert.equal(w.counted, 2);
    assert.equal(w.avgKcal, 560);
    assert.equal(w.avgProtein, 69);
    assert.equal(w.proteinPct, 49);
    assert.deepEqual([w.proteinDays, w.goalDays], [1, 2]);
    assert.equal(w.topProtein?.key, k(0));
    assert.deepEqual([w.totalKcal, w.totalProtein], [1410, 148]);
    assert.deepEqual(w.top, [{ name: 'Havregryn', n: 2 }, { name: 'Kvarg', n: 2 }]);
    // a finished day goes by its own frozen protein goal
    fw.days[k(1)].goals = { water: 2000, steps: 8000, gaming: 60, protein: 20, workout: null, habits: [] };
    assert.deepEqual(((x) => [x.proteinDays, x.goalDays])(foodWeek(fw, mon, k(3))), [2, 2]);
    fw.days[k(1)].goals = { water: 2000, steps: 8000, gaming: 60, protein: 0, workout: null, habits: [] };
    assert.deepEqual(((x) => [x.proteinDays, x.goalDays])(foodWeek(fw, mon, k(3))), [1, 1]);
    // a week with nothing logged
    const none = foodWeek(fw, addDays(mon, -7), k(3));
    assert.deepEqual([none.counted, none.avgKcal, none.proteinPct, none.topProtein, none.top.length], [0, null, null, null, 0]);
    // Swedish week numbers (ISO): 2026 has 53 weeks
    assert.equal(isoWeek(new Date(2026, 9, 28)), 44);
    assert.equal(isoWeek(new Date(2025, 11, 29)), 1);
    assert.equal(isoWeek(new Date(2026, 0, 1)), 1);
    assert.equal(isoWeek(new Date(2027, 0, 1)), 53);
    assert.equal(isoWeek(new Date(2027, 0, 4)), 1);
  }
}
foodTests();

// a contract won before Sunday makes room for another, on a goal the week hasn't had, at a difficulty that fits
function contractFollowUpTests() {
  const s = defaultState();
  const mon = new Date(2026, 9, 12, 12);
  const thu = new Date(2026, 9, 15, 12);
  const sun = new Date(2026, 9, 18, 12);
  const week = '2026-10-12';
  assert.deepEqual(signOptions(s, mon)?.before, []);
  assert.equal(signOptions(s, thu), null, 'the first one: Monday to Wednesday');
  s.contract = { week, from: week, goal: 'train', target: 3, stake: 100, status: 'open' };
  assert.equal(signOptions(s, mon), null, 'one open at a time');
  s.contract = { ...s.contract, status: 'won' };
  const o = signOptions(s, thu);
  assert.deepEqual(o?.before, ['train']);
  assert.ok(o && !o.goals.includes('train') && o.goals.includes('water') && o.goals.includes('focus'));
  // Sunday: goals counted in days don't fit any more, counts still do
  const sunday = signOptions(s, sun);
  assert.ok(sunday && sunday.goals.includes('focus') && !sunday.goals.includes('water') && !sunday.goals.includes('gaming'));
  // a follow-up passes the week's goals on
  s.contract = { week, from: '2026-10-15', goal: 'water', target: 4, stake: 100, status: 'won', before: ['train'] };
  assert.deepEqual(signOptions(s, thu)?.before, ['train', 'water']);
  assert.ok(!signOptions(s, thu)?.goals.includes('water'));
  // every goal taken: nothing left to sign
  s.contract = { ...s.contract, before: ['train', 'steps', 'focus', 'habits', 'gaming', 'tasks'] };
  assert.equal(signOptions(s, thu), null);
  // last week's contract doesn't count for this week
  s.contract = { ...s.contract, week: '2026-10-05', status: 'lost' };
  assert.deepEqual(signOptions(s, mon)?.before, []);
}
contractFollowUpTests();

// the avatar's stage badge and opinion face show unless switched off, each on its own; the wardrobe stays as it was
function avatarExtrasTests() {
  const a = withOwned(defaultState(), 'cap');
  assert.ok(shows(a, 'badge') && shows(a, 'respect'));
  const off = withShown(withShown(a, 'respect', false), 'respect', false);
  assert.deepEqual(off.cosmetics?.hidden, ['respect']);
  assert.ok(shows(off, 'badge') && !shows(off, 'respect'));
  assert.deepEqual(off.cosmetics?.owned, ['cap']);
  assert.ok(shows(withShown(off, 'respect', true), 'respect'));
}
avatarExtrasTests();

// the shop's extras: a chest key, names, the lair, pets, banana peels and a fourth quest (none of them pays XP)
function shopTests() {
  // a chest key is a treat, not an investment: a normal chest's coins average far below the key's price
  const N = 2000;
  let coins = 0;
  for (let i = 0; i < N; i++) {
    const prize = rollChest((i + 0.5) / N, {}, ((i * 7919) % N) / N);
    if (prize.kind === 'coins' || prize.kind === 'legendary') coins += prize.amount;
  }
  assert.ok(coins / N < CHEST_KEY_COST / 5, `a chest averages ${coins / N} coins`);

  // names: spaces tidied, capped (emoji count as one), too short is no name
  assert.equal(cleanName('  Sir   Snooze  '), 'Sir Snooze');
  assert.equal(cleanName(' x '), null);
  assert.equal(Array.from(cleanName('🦥'.repeat(40)) ?? '').length, NAME_MAX);

  // the lair: one piece at a time, in order, each dearer than the last, until it's complete
  let lair = defaultState();
  assert.equal(nextPiece(lair)?.id, LAIR[0].id);
  assert.equal(lairLeft(lair), LAIR.reduce((a, x) => a + x.price, 0));
  assert.equal(new Set(LAIR.map((x) => x.id)).size, LAIR.length);
  assert.ok(LAIR.every((x, i) => i === 0 || x.price > LAIR[i - 1].price));
  lair = withPiece(lair, LAIR[0].id);
  assert.equal(nextPiece(lair)?.id, LAIR[1].id);
  assert.equal(withPiece(lair, LAIR[0].id).lair?.length, 1, 'a piece is bought once');
  for (let i = 1; i < LAIR.length; i++) lair = withPiece(lair, nextPiece(lair)!.id);
  assert.equal(nextPiece(lair), null);
  assert.equal(lairPieces(lair).length, LAIR.length);
  assert.equal(lairLeft(lair), 0);
  // the spider walking around: every piece has a spot inside the room and something to do there
  assert.ok(LAIR.every((x) => x.visit.x > 0 && x.visit.x < 100 && x.visit.y > 0 && x.visit.y < 100 && x.visit.act.length > 0));
  const bare = lairSpots([]);
  assert.equal(bare[0].id, LAIR_HOME.id);
  assert.ok(bare.length >= 3, 'an empty lair still has some floor to pace');
  const full = lairSpots(LAIR.map((x) => x.id));
  assert.equal(full.length, LAIR.length, 'the rug takes the middle of the floor');
  assert.ok(full.some((x) => x.id === 'rug' && x.x === LAIR_HOME.x && x.y === LAIR_HOME.y));
  assert.deepEqual(lairSpots(['web']).map((x) => x.id), ['home', 'web', 'left', 'right']);
  for (const r of [0, 0.3, 0.6, 0.9999]) assert.notEqual(nextSpot(full, 'web', r).id, 'web', 'always somewhere else');
  assert.ok(LAIR.filter((x) => x.visit.hang).every((x) => x.visit.y < 60), 'hanging spots are off the floor');

  // pets: a fly caught at least once can be adopted, priced by rarity, into a slot of its own
  const pet = defaultState();
  const gnat = PET_COSMETICS.find((c) => c.fly === 'gym_gnat')!;
  assert.equal(gnat.price, PET_PRICE.common);
  assert.ok(!petCaught(pet, gnat) && !forSale(pet, gnat), 'catch it first');
  pet.flies = { gym_gnat: { firstAt: 0, count: 1 } };
  assert.ok(forSale(pet, gnat));
  const adopted = withWorn(withOwned(pet, gnat.id), 'pet', gnat.id);
  assert.ok(!forSale(adopted, gnat), 'once is enough');
  assert.equal(worn(adopted).pet?.id, gnat.id);
  assert.equal(cosmeticOf(gnat.id)?.slot, 'pet');
  assert.equal(new Set(PET_COSMETICS.map((c) => c.id)).size, FLIES.length);
  assert.ok(!PET_COSMETICS.some((c) => COSMETICS.some((x) => x.id === c.id)));
  assert.equal(legendaryDrop(adopted, 0)?.source, 'legendary', 'chests never drop pets');

  // banana peels: off a rival's week in the table (never below 0), three a week, never this week's co-op partner
  const week = '2027-03-01';
  const monday = new Date(2027, 2, 1, 12);
  const sunNight = new Date(2027, 2, 7, 23, 0);
  const lg = defaultState();
  lg.league = newLeague(2, week);
  const target = lg.league.rivals[0];
  const xpOf = (st: typeof lg) => standings(st, sunNight).find((r) => r.id === target.id)!.xp;
  const before = xpOf(lg);
  assert.equal(before, rivalXp(target, 2, week, sunNight));
  assert.equal(xpOf(withPeel(lg, target.id)), Math.max(0, before - PEEL_XP));
  assert.equal(xpOf({ ...lg, league: { ...lg.league, peels: { [target.id]: 50 } } }), 0);
  assert.equal(peelBlocker(lg, target.id, null, monday), null);
  let three = lg;
  for (let i = 0; i < PEELS_PER_WEEK; i++) three = withPeel(three, target.id);
  assert.ok(peelBlocker(three, lg.league.rivals[1].id, null, monday), 'three a week');
  assert.ok(peelBlocker(lg, target.id, target.name, monday), 'not the co-op partner');
  assert.ok(peelBlocker(lg, 'nobody', null, monday));
  assert.ok(peelBlocker(lg, target.id, null, new Date(2027, 2, 9, 12)), "not last week's league");

  // renaming a rival: this week's table, the co-op partner too, and later leagues; voice and co-op goal stay theirs
  const rn = defaultState();
  rn.league = newLeague(0, week);
  const r0 = rn.league.rivals[0];
  rn.coop = { week, partner: { name: r0.name, emoji: r0.emoji }, goal: goalOf(r0.name), base: 3 };
  const renamed = withRivalName(rn, r0.id, 'Bob');
  assert.equal(renamed.league!.rivals[0].name, 'Bob');
  assert.equal(rosterName(renamed.league!.rivals[0]), r0.name);
  assert.equal(renamed.coop?.partner.name, 'Bob');
  assert.equal(standings(renamed, sunNight).find((r) => r.id === r0.id)?.base, r0.name);
  assert.equal(voiceOf(rosterName(renamed.league!.rivals[0])), voiceOf(r0.name));
  const again = withRivalName(renamed, r0.id, 'Bobby');
  assert.equal(rosterName(again.league!.rivals[0]), r0.name, 'a second rename keeps the roster name');
  assert.deepEqual(again.rivalNames, { [r0.name]: 'Bobby' });
  let found = false;
  for (let w = 1; w <= 40 && !found; w++) {
    const later = withRivalNames(newLeague(0, dayKey(addDays(monday, w * 7))), again.rivalNames);
    const hit = later.rivals.find((r) => rosterName(r) === r0.name);
    if (hit) {
      assert.equal(hit.name, 'Bobby');
      found = true;
    }
  }
  assert.ok(found, 'they turn up again in a later league, under their new name');

  // the boss's name: that week only, whatever day it's asked (recaps too); the newest 60 weeks are kept
  const bn = withBossName(defaultState(), 'Sir Snoozealot', new Date(2027, 2, 3, 12));
  assert.equal(bossFor(bn, new Date(2027, 2, 1, 9)).name, 'Sir Snoozealot');
  assert.equal(bossFor(bn, sunNight).name, 'Sir Snoozealot');
  assert.notEqual(bossFor(bn, new Date(2027, 2, 8, 9)).name, 'Sir Snoozealot');
  let many = defaultState();
  for (let i = 0; i < 70; i++) many = withBossName(many, `B${i}`, addDays(new Date(2026, 0, 5), i * 7));
  assert.equal(Object.keys(many.bossNames ?? {}).length, 60);
  assert.equal(bossFor(many, addDays(new Date(2026, 0, 5), 69 * 7)).name, 'B69');

  // a quest card: only while the morning pick is open, a fourth quest goes in at once, then four must be picked
  const qc = defaultState();
  qc.onboarded = true;
  const morning = new Date(2027, 2, 2, 9);
  const key = dayKey(morning);
  const draft = draftFor(qc, morning);
  qc.days[key] = { ...emptyDay(), quests: draft.defaults, questDraft: { candidates: draft.candidates, locked: false } };
  assert.equal(questSlotsOn(qc, key), QUEST_SLOTS);
  assert.equal(questCardBlocker(qc, morning), null);
  assert.ok(questCardBlocker(qc, new Date(2027, 2, 2, 13)), 'not after noon');
  const four = withQuestCard(qc, morning)!;
  const picked = four.days[key].quests!;
  assert.equal(picked.length, 4);
  assert.deepEqual(picked.slice(0, 3), draft.defaults);
  assert.ok(draft.candidates.includes(picked[3]));
  assert.equal(questSlotsOn(four, key), 4);
  assert.equal(questsFor(four, morning).length, 4);
  assert.ok(questCardBlocker(four, morning), 'one card a day');
  assert.equal(withQuestCard(four, morning), null);
  assert.ok(validDraft(four, picked, morning));
  assert.ok(!validDraft(four, draft.defaults, morning), 'three is not enough once four were bought');
}
shopTests();

// the terrarium in 3D: every spot has a place, and the spider walks, climbs and hangs without leaving the tank
function terrarium3dTests() {
  const all = LAIR.map((x) => x.id);
  assert.deepEqual(spots3d(all).map((x) => x.id), lairSpots(all).map((x) => x.id), 'every 2D spot has a place in 3D');
  assert.deepEqual(spots3d([]).map((x) => x.id), ['home', 'left', 'right']);
  for (const id of all) assert.ok(buildPiece(id).children.length > 0, `${id} has a look`);
  const web = spots3d(all).find((x) => x.id === 'web')!;
  const moss = spots3d(all).find((x) => x.id === 'rug')!;
  const route = planRoute(web, moss, () => 0.5);
  assert.equal(route[0].kind, 'move', 'down the thread first');
  assert.equal(route.at(-1)?.kind, 'wait');
  let seed = 1;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const w = createWorld({ ids: all, next: null, marking: '#E23636', background: '#10141F', random: rnd });
  const seen = new Set<string>();
  const before = w.legAngles();
  let outside = 0;
  let hung = false;
  let legs = false;
  for (let i = 0; i < 60 * 60 * 15; i++) {
    w.step(1 / 60);
    const p = w.pose();
    if (Math.abs(p.pos.x) > TANK.w / 2 || Math.abs(p.pos.z) > TANK.d / 2 || p.pos.y < -0.001 || p.pos.y > TANK.h) outside++;
    if (p.thread && p.pos.y > 2) hung = true;
    if (w.act()) seen.add(w.spotId());
    if (!legs && w.legAngles().some((a, j) => Math.abs(a - before[j]) > 0.1)) legs = true;
  }
  assert.equal(outside, 0, 'never through the glass or the floor');
  assert.ok(seen.size >= 8, `rests at most pieces: ${[...seen].join(', ')}`);
  assert.ok(hung && legs);
  const anchor = w.actAnchor();
  assert.ok(anchor && anchor.x > 0 && anchor.x < 1 && anchor.y > 0 && anchor.y < 1, 'the bubble lands in view');
  // buying a piece puts the spider back in the middle, with the new spot to visit
  w.setPieces(['web'], 'lamp');
  assert.equal(w.spotId(), 'home');
  w.dispose();
}
terrarium3dTests();

// free-time finder + meeting detection (tomorrow, so "now" doesn't clip it)
const tomorrow = atTime(new Date(), 1, 0);
const ev = (h1: number, h2: number) => ({
  key: `${h1}`,
  title: 'x',
  start: atTime(tomorrow, 0, h1).getTime(),
  end: atTime(tomorrow, 0, h2).getTime(),
  allDay: false,
  location: null,
  calendarId: 'c',
});
const events = [ev(9, 10), ev(10, 12), ev(14, 15)];
const free = freeSlots(events, tomorrow, 8, 22);
assert.deepEqual(
  free.map((f) => [new Date(f.start).getHours(), new Date(f.end).getHours()]),
  [
    [8, 9],
    [12, 14],
    [15, 22],
  ],
);
assert.ok(inMeeting(events, atTime(tomorrow, 0, 11).getTime()));
assert.ok(!inMeeting(events, atTime(tomorrow, 0, 13).getTime()));

// gaming: finished sessions + live session
const g = defaultState();
const now = atTime(new Date(), 0, 12).getTime(); // noon: sessions an hour or two back stay on today, whenever the tests run
g.days[dayKey()] = { water: [], food: [], sets: [], games: [{ start: now - 90 * MIN, end: now - 60 * MIN }], bonusGameMin: 30 };
g.activeGame = { start: now - 20 * MIN };
assert.equal(Math.round(gamingUsedMs(g, dayKey(), now) / MIN), 50);

// day score stays within 0..100
assert.ok(dayScoreFor(defaultState(), new Date()) >= 0 && dayScoreFor(defaultState(), new Date()) <= 100);
// ...and today and past days score follow-through the same way: tasks finished that day vs still open then
{
  const yesterdayNoon = atTime(new Date(), -1, 12);
  const base = defaultState();
  const doneY = { ...base, tasks: [{ id: 't', title: 'x', done: true, createdAt: yesterdayNoon.getTime() - 1, doneAt: yesterdayNoon.getTime() }] };
  const openY = { ...base, tasks: [{ id: 't', title: 'x', done: false, createdAt: yesterdayNoon.getTime() - 1 }] };
  assert.equal(dayScoreFor(doneY, yesterdayNoon) - dayScoreFor(openY, yesterdayNoon), 15);
  const doneNow = { ...base, tasks: [{ id: 't', title: 'x', done: true, createdAt: Date.now() - 1, doneAt: Date.now() }] };
  const openNow = { ...base, tasks: [{ id: 't', title: 'x', done: false, createdAt: Date.now() - 1 }] };
  assert.equal(dayScoreFor(doneNow, new Date()) - dayScoreFor(openNow, new Date()), 15);
  // a task created today doesn't count for yesterday
  assert.equal(dayScoreFor(doneNow, yesterdayNoon), dayScoreFor(openNow, yesterdayNoon));
}

// water goal days are totals now (no streaks anywhere)
const w = defaultState();
for (let i = 0; i < 3; i++) {
  w.days[dayKey(atTime(new Date(), -i, 12))] = { water: [], food: [], sets: [], games: [], bonusGameMin: 0, waterGoalHit: true };
}
const fish = ACHIEVEMENTS.find((a) => a.id === 'basically_a_fish')!;
assert.ok(!fish.test(w));
for (let i = 3; i < 14; i++) w.days[dayKey(atTime(new Date(), -i * 2, 12))] = { water: [], food: [], sets: [], games: [], bonusGameMin: 0, waterGoalHit: true };
assert.ok(fish.test(w)); // 14 days, not in a row

// last session ignores today and picks the heaviest set
const l = defaultState();
const y = dayKey(atTime(new Date(), -1, 12));
l.days[y] = {
  water: [],
  food: [],
  sets: [
    { id: '1', exercise: 'Bench press', weight: 60, reps: 8, at: 0 },
    { id: '2', exercise: 'bench press ', weight: 65, reps: 5, at: 0 },
  ],
  games: [],
  bonusGameMin: 0,
};
assert.equal(lastSession(l, 'Bench Press')?.best.weight, 65);

// old saves get new fields
const h = hydrate({ xp: 42, settings: { userName: 'X' } as never });
assert.equal(h.xp, 42);
assert.equal(h.settings.userName, 'X');
assert.equal(h.settings.waterGoalMl, 2500);
assert.equal(h.settings.notify.water, true);

// achievements: none unlocked for a fresh state
assert.equal(ACHIEVEMENTS.filter((a) => a.test(defaultState())).length, 0);

// coffee + mood
const m = defaultState();
const k = dayKey();
m.days[k] = {
  water: [], food: [], sets: [], games: [], bonusGameMin: 0,
  coffee: [{ id: 'c1', mg: 90, at: 1 }, { id: 'c2', mg: 90, at: 2 }],
  moods: [
    { id: 'm1', level: 4, emotions: ['Happy', 'Tired'], at: 1 },
    { id: 'm2', level: 2, emotions: ['Tired'], at: 2 },
  ],
};
assert.equal(caffeineMg(m.days[k]), 180);
assert.equal(totalCoffees(m), 2);
assert.equal(avgMood(m.days[k]), 3);
assert.equal(moodDays(m), 1);
assert.deepEqual(emotionCounts(m), [{ emotion: 'Tired', n: 2 }, { emotion: 'Happy', n: 1 }]);
// emotion words: saved by name, so the old ones stay; "Want to name it?" asks once, about a low check-in without words
{
  const names = EMOTIONS.map((e) => e.name);
  assert.equal(new Set(names).size, names.length);
  for (const old of ['Happy', 'Calm', 'Motivated', 'Grateful', 'Excited', 'Tired', 'Stressed', 'Anxious', 'Sad', 'Angry', 'Bored', 'Lonely']) assert.ok(names.includes(old), old);
  for (const added of ['Overwhelmed', 'Content', 'Hopeful', 'Irritable', 'Proud']) assert.ok(names.includes(added), added);
  assert.ok(EMOTIONS.filter((e) => e.low).every((e) => !['Happy', 'Proud', 'Hopeful', 'Content'].includes(e.name)));
  const low = { id: 'l', level: 2 as const, emotions: [], at: 3 };
  assert.equal(nameItFor([low])?.id, 'l');
  assert.equal(nameItFor([low, { id: 'ok', level: 3 as const, emotions: [], at: 4 }]), null); // only the latest counts
  assert.equal(nameItFor([{ ...low, emotions: ['Tired'] }]), null);
  assert.equal(nameItFor([{ ...low, asked: true }]), null); // asked already (or logged on the Mood screen)
  assert.equal(nameItFor([{ ...low, late: true }]), null);
  assert.equal(nameItFor([]), null);
  const named = withNamed({ ...low, emotions: ['Tired'] }, ['Tired', 'Numb']);
  assert.deepEqual(named.emotions, ['Tired', 'Numb']);
  assert.equal(named.asked, true);
  assert.equal(nameItFor([withNamed(low, [])]), null); // skipped: not asked again
}
// latest mood is low (2) -> roasts paused (mild only) even at savage 10
assert.equal(m.settings.savageLevel, 10);
assert.equal(effectiveSavage(m), 1);
{
  const mild = new Set(LINES.gymShame.mild.map((t) => fillLine(t, { workout: 'Push' })));
  for (let i = 0; i < 1000; i++) assert.ok(mild.has(line('gymShame', effectiveSavage(m), { workout: 'Push' })), 'a roast slipped through a low mood');
}
m.days[k].moods!.push({ id: 'm3', level: 5, emotions: [], at: 3 });
assert.equal(effectiveSavage(m), 10);
// sick mode holds the roasts too ("I will hold the roasts"); away mode only stops the nagging
{
  const sick = startPause(defaultState(), 'sick', 3);
  assert.equal(effectiveSavage(sick), 1);
  const mild = new Set(LINES.spiderTap.mild.map((t) => fillLine(t, {})));
  for (let i = 0; i < 1000; i++) assert.ok(mild.has(line('spiderTap', effectiveSavage(sick))), 'a roast slipped through sick mode');
  assert.equal(effectiveSavage(startPause(defaultState(), 'away', 3)), 10);
  assert.equal(effectiveSavage(endPause(sick)), 1, "I'm back: today stays easy");
  assert.equal(effectiveSavage(endPause(sick), addDays(new Date(), 1)), 10, 'from tomorrow the roasts are back');
}
// a low mood late last night keeps the roasts paused until today's first check-in
{
  const night = defaultState();
  const at = new Date(2027, 0, 13, 7, 30);
  const day = (moods: { level: 1 | 2 | 3 | 4 | 5; at: number }[]) => ({ water: [], food: [], sets: [], games: [], bonusGameMin: 0, moods: moods.map((x, i) => ({ id: `n${i}`, emotions: [], ...x })) });
  night.days['2027-01-12'] = day([{ level: 4, at: new Date(2027, 0, 12, 13).getTime() }, { level: 1, at: new Date(2027, 0, 12, 23, 30).getTime() }]);
  assert.equal(effectiveSavage(night, at), 1);
  night.days['2027-01-13'] = day([{ level: 4, at: at.getTime() }]); // today's check-in takes over
  assert.equal(effectiveSavage(night, at), 10);
  night.days['2027-01-12'] = day([{ level: 1, at: 1 }, { level: 3, at: 2 }]); // yesterday ended okay
  delete night.days['2027-01-13'];
  assert.equal(effectiveSavage(night, at), 10);
  night.days['2027-01-11'] = day([{ level: 1, at: 1 }]); // two days ago doesn't carry
  delete night.days['2027-01-12'];
  assert.equal(effectiveSavage(night, at), 10);
}
// old saved days without coffee/moods still work
const old = defaultState();
old.days[k] = { water: [], food: [], sets: [], games: [], bonusGameMin: 0 };
assert.equal(caffeineMg(old.days[k]), 0);
assert.equal(avgMood(old.days[k]), null);
assert.equal(effectiveSavage(old), 10);
// low-mood lines are kind in both pools
assert.deepEqual(LINES.moodAwful.savage, LINES.moodAwful.mild);
assert.deepEqual(LINES.moodLow.savage, LINES.moodLow.mild);

// ---------- step 2 tone ----------
// toneOn: one tone per day. Low mood (carried overnight), sick mode and period days are kind; away isn't.
{
  const blank = (extra: Partial<DayLog> = {}): DayLog => ({ water: [], food: [], sets: [], games: [], bonusGameMin: 0, ...extra });
  const mood = (level: 1 | 2 | 3 | 4 | 5) => ({ moods: [{ id: `m${level}`, level, emotions: [], at: 1 }] });
  const at = new Date(2027, 0, 13, 9); // Wed 13 Jan 2027
  const wed = '2027-01-13';
  const thu = '2027-01-14';
  const fri = '2027-01-15';
  const t = defaultState();
  assert.deepEqual(toneOn(t, wed, at), { level: 10, kind: false });
  t.days[wed] = blank(mood(2));
  assert.deepEqual(toneOn(t, wed, at), { level: 1, kind: true });
  assert.deepEqual(toneOn(t, thu, at), { level: 1, kind: true }); // tonight's low mood carries into tomorrow's reminders
  assert.equal(toneOn(t, fri, at).kind, false); // but not two days on
  t.days[wed] = blank(mood(3));
  assert.deepEqual(toneOn(t, wed, at), { level: 10, kind: false });
  // sick is kind, away isn't (away only stops the nagging)
  assert.ok(toneOn(startPause(defaultState(), 'sick', 2, wed), wed, at).kind);
  assert.deepEqual(toneOn(startPause(defaultState(), 'away', 2, wed), wed, at), { level: 10, kind: false });
  // low battery turns it down, never up
  const lb2 = defaultState();
  lb2.days[wed] = blank({ energy: 1 });
  assert.deepEqual(toneOn(lb2, wed, at), { level: 5, kind: false });
  lb2.settings.savageLevel = 3;
  assert.equal(toneOn(lb2, wed, at).level, 3);
  // period days: logged, still running (day 2 before it's logged), and predicted ones ahead
  const pd = defaultState();
  const flow = (k: string) => (pd.days[k] = blank({ period: { flow: 'medium', symptoms: [] } }));
  for (const k of ['2026-12-14', '2026-12-15', '2026-12-16', '2026-12-17']) flow(k); // an earlier 4-day period
  flow('2027-01-12');
  assert.ok(periodDay(pd, '2027-01-12'));
  assert.ok(periodDay(pd, wed)); // day 2, not logged yet
  assert.ok(toneOn(pd, wed, at).kind);
  pd.days[wed] = blank({ period: { flow: null, symptoms: ['Cramps'] } }); // logged without flow: goes by that
  assert.ok(!periodDay(pd, wed));
  delete pd.days[wed];
  for (const k of ['2027-01-13', '2027-01-14', '2027-01-15']) flow(k); // 4 days in, the usual length
  assert.ok(!periodDay(pd, '2027-01-16')); // a 5th day only if the run is still under the usual 4
  // spotting: a kind day itself, but a day of it doesn't make tomorrow a period day or shorten the usual length
  const sp = structuredClone(pd);
  sp.days['2026-12-30'] = blank({ period: { flow: 'spotting', symptoms: [] } });
  assert.ok(periodDay(sp, '2026-12-30'));
  assert.ok(!periodDay(sp, '2026-12-31'));
  assert.ok(periodDay(sp, '2027-01-15')); // the real period's day 4: the usual is still 4, not dragged down by a 1-day run
  pd.settings.easyOnPeriod = false;
  assert.equal(toneOn(pd, '2027-01-14', at).kind, false); // "go easy" off: the usual tone
  assert.ok(gentleDay(pd, '2027-01-14')); // recaps stay kind on period days either way
  pd.settings.easyOnPeriod = true;
  const forecast = { nextStart: new Date(2027, 1, 9), avgPeriodDays: 4 };
  assert.ok(toneOn(defaultState(), '2027-02-10', at, forecast).kind);
  assert.ok(!toneOn(defaultState(), '2027-02-13', at, forecast).kind); // the 5th day is past the predicted 4
  assert.ok(!toneOn(defaultState(), '2027-02-10', at).kind); // no forecast given, no prediction
  assert.ok(!toneOn(defaultState(), '2027-02-10', new Date(2027, 1, 10, 9), forecast).kind); // today goes by what's logged
  // gentle days for recaps: low mood, period, any pause
  assert.ok(gentleDay(startPause(defaultState(), 'away', 2, wed), wed));
  assert.ok(!gentleDay(defaultState(), wed));
  // golden lines: never on a kind day, never below level 4, never while turned down
  const gd = defaultState();
  assert.ok(goldenAllowed(gd, at));
  gd.settings.savageLevel = 3;
  assert.ok(!goldenAllowed(gd, at));
  gd.settings.savageLevel = 10;
  gd.days[wed] = blank(mood(1));
  assert.ok(!goldenAllowed(gd, at));
  gd.days[wed] = blank({ energy: 2 });
  assert.ok(!goldenAllowed(gd, at)); // low battery caps the tone at 5
  // a sick yesterday with a planned workout: a kind callback, not "you skipped Pull"
  const sk = startPause(defaultState(), 'sick', 1, '2027-01-12');
  sk.days['2027-01-12'] = blank();
  assert.equal(yesterdayHighlight(sk, at)?.key, 'callbackGentle');
  // the diary never assumes pronouns, and paused days get kind pages
  const dn = startPause(defaultState(), 'away', 1, '2027-01-12');
  dn.days['2027-01-12'] = blank({ water: [{ id: 'w', ml: 2000, at: 0 }], moods: [{ id: 'g', level: 5, emotions: [], at: 0 }] });
  assert.ok(kindDay(dn, '2027-01-12'));
  for (const who of ['', 'Alex']) {
    const named = { ...dn, pauses: [], settings: { ...dn.settings, userName: who } };
    for (let n = 1; n <= 12; n++) {
      const text = writePage(named, n, at).text;
      assert.ok(!/\b(she|her|hers|herself|he|him|his|himself)\b/i.test(text), text);
      assert.ok(!text.includes('{'), text);
      if (who) assert.ok(!/\bboss\b/.test(text), text);
    }
  }
  // pools picked by context: paced steps, no "tragic" mornings, a whole-day debrief, the right overage line
  const tenAm = new Date(2027, 0, 13, 10);
  const ninePm = new Date(2027, 0, 13, 21);
  assert.equal(stepsLineKey(3000, 8000, tenAm, 7, 23), 'stepsEarly');
  assert.equal(stepsLineKey(3000, 8000, ninePm, 7, 23), 'stepsLow');
  assert.equal(stepsLineKey(0, 8000, new Date(2027, 0, 13, 7), 7, 23), 'stepsEarly');
  assert.equal(stepsLineKey(4500, 8000, ninePm, 7, 23), 'stepsMid');
  assert.equal(stepsLineKey(8000, 8000, tenAm, 7, 23), 'stepsHigh');
  assert.equal(verdictLineKey(25, 7, false), 'verdictMorning');
  assert.equal(verdictLineKey(25, 15, false), 'verdictTragic');
  assert.equal(verdictLineKey(60, 8, false), 'verdictGood');
  assert.equal(verdictLineKey(90, 15, true), 'verdictKind');
  assert.equal(nightVerdictKey(20, false), 'nightTragic');
  assert.equal(nightVerdictKey(60, false), 'nightGood');
  assert.equal(nightVerdictKey(10, true), 'verdictKind');
  assert.equal(gameLineKey(0), null);
  assert.equal(gameLineKey(60_000), 'gameOver');
  assert.equal(gameLineKey(30 * 60_000), 'gameWayOver');
  // kind pools are the same in both
  for (const k of ['gymEasy', 'gymEasyLogged', 'gymRemindEasy', 'verdictKind', 'progressPhoto'] as const) assert.deepEqual(LINES[k].savage, LINES[k].mild, k);
}

// savage pools roast habits, never food or the body (bodyLogged is the neutral body log, both pools alike)
{
  const banned = /\b(kcal|calories?|eat|eats|ate|eaten|eating|stomach|belly|plate|mirror|muscles?|body|bodies|fat|thighs?|waist|weigh|weighs|weighed|weight|physique|glow-up|abs|diet)\b/i;
  for (const [k, pool] of Object.entries(LINES) as [string, { mild: string[]; savage: string[] }][]) {
    if (k === 'bodyLogged') continue;
    for (const text of pool.savage) assert.ok(!banned.test(text.replace(/\{\w+\}/g, '')), `${k}: ${text}`);
  }
  for (const g of GOLDEN) assert.ok(!banned.test(g.text.replace(/\{\w+\}/g, '')), g.id);
}

// every call site passes the placeholders its pool uses ({name} is always added)
{
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const f of readdirSync(dir)) {
      const full = join(dir, f);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.tsx?$/.test(f)) files.push(full);
    }
  };
  walk(join(process.cwd(), 'src'));
  const pools = LINES as Record<string, { mild: string[]; savage: string[] }>;
  const used = (k: string) => new Set([...pools[k].mild, ...pools[k].savage].flatMap((t) => [...t.matchAll(/\{(\w+)\}/g)].map((m) => m[1])));
  // The argument list of a call starting at `open` (the index of its "("), up to the matching ")".
  const argsAt = (src: string, open: number) => {
    let depth = 0;
    for (let i = open; i < src.length; i++) {
      if ('([{'.includes(src[i])) depth++;
      else if (')]}'.includes(src[i]) && --depth === 0) return src.slice(open + 1, i);
    }
    return '';
  };
  // Top-level pieces of an argument list or object literal body (commas inside brackets don't split).
  const splitTop = (text: string) => {
    const out: string[] = [];
    let depth = 0;
    let part = '';
    for (const ch of text) {
      if ('([{'.includes(ch)) depth++;
      if (')]}'.includes(ch)) depth--;
      if (ch === ',' && depth === 0) {
        out.push(part.trim());
        part = '';
      } else part += ch;
    }
    if (part.trim()) out.push(part.trim());
    return out;
  };
  let checked = 0;
  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(/\b(L|say|sayOn|quip|line|freshLine|poolFor)\(/g)) {
      const parts = splitTop(argsAt(src, m.index! + m[0].length - 1));
      const ki = parts.findIndex((x) => [...x.matchAll(/'(\w+)'/g)].some((k) => k[1] in pools));
      if (ki < 0) continue; // a key in a variable: dynamic by design
      const keys = [...parts[ki].matchAll(/'(\w+)'/g)].map((x) => x[1]).filter((k) => k in pools);
      const varsAt = m[1] === 'poolFor' || m[1] === 'line' || m[1] === 'freshLine' ? ki + 2 : ki + 1; // these take a level first
      const vars = parts[varsAt];
      if (vars && !vars.startsWith('{')) continue; // vars built elsewhere
      const have = new Set(['name']);
      for (const entry of vars ? splitTop(vars.slice(1, -1)) : []) {
        if (entry.startsWith('...')) have.add('*');
        const nm = /^['"]?(\w+)['"]?\s*(:|$)/.exec(entry);
        if (nm) have.add(nm[1]);
      }
      if (have.has('*')) continue; // spread in from elsewhere
      if (m[1] === 'poolFor') for (const k of (parts[varsAt + 1] ?? '').matchAll(/'(\w+)'/g)) have.add(k[1]); // filled in natively later
      for (const k of keys) {
        for (const ph of used(k)) assert.ok(have.has(ph), `${relative(process.cwd(), file)}: ${m[1]}('${k}') never passes {${ph}}`);
        checked++;
      }
    }
  }
  assert.ok(checked > 100, `only ${checked} call sites found`);
}

// ---------- step 4 lines ----------
// The deck: a pool list deals every line once before repeating, across app runs; retired lines never come back.
{
  const pools = LINES as Record<string, { mild: string[]; savage: string[] }>;
  setLineMemory(undefined);
  const mild = pools.waterRemind.mild.map((t) => fillLine(t, {})); // as shown ({name} filled in)
  assert.ok(mild.length >= 2);
  const firstRound = new Set(mild.map(() => freshLine('waterRemind', 1)));
  assert.equal(firstRound.size, mild.length); // level 1: the mild list, every line once
  const last = freshLine('waterRemind', 1); // the next round has started...
  assert.ok(mild.includes(last));
  // ...and it survives a restart: saved, loaded again, the round goes on without repeats
  setLineMemory(undefined);
  const half = Math.ceil(mild.length / 2);
  const before = Array.from({ length: half }, () => freshLine('waterRemind', 1));
  const saved = JSON.parse(JSON.stringify(lineMemory()));
  setLineMemory(saved);
  const after = Array.from({ length: mild.length - half }, () => freshLine('waterRemind', 1));
  assert.equal(new Set([...before, ...after]).size, mild.length);
  // a new round never starts with the line that ended the last one
  for (let round = 0; round < 20; round++) {
    const endOf = Array.from({ length: mild.length }, () => freshLine('waterRemind', 1)).at(-1);
    assert.notEqual(freshLine('waterRemind', 1), endOf);
    setLineMemory(undefined);
  }
  // old lists are forgotten after 30 days, and at most 300 are kept
  const now = Date.now();
  setLineMemory({ deck: { 'gymSet:s': { used: ['x'], at: now - 31 * 86_400_000 } } });
  freshLine('taskDone', 1);
  assert.ok(!lineMemory().deck?.['gymSet:s']);
  setLineMemory({ deck: Object.fromEntries(Array.from({ length: 320 }, (_, i) => [`p${i}:m`, { used: [], at: now - i * 1000 }])) });
  freshLine('taskDone', 1);
  assert.ok(Object.keys(lineMemory().deck ?? {}).length <= 300);
  assert.ok(lineMemory().deck?.['taskDone:m']); // the one just used is kept

  // retired lines: gone from both lists; mild all retired at level 1 still never means a roast
  setLineMemory(undefined);
  for (const t of pools.gymSet.savage) banLine(lineId('gymSet', t));
  const keep = { weight: '{weight}', reps: '{reps}', exercise: '{exercise}', ml: '{ml}', left: '{left}' }; // placeholders left in, to compare with the pool
  const shown = (xs: string[]) => xs.map((t) => fillLine(t, keep));
  for (let i = 0; i < 40; i++) assert.ok(shown(pools.gymSet.mild).includes(freshLine('gymSet', 10, keep)));
  assert.equal(bannedLines().length, pools.gymSet.savage.length);
  assert.ok(bannedLines().every((b) => b.key === 'gymSet' && pools.gymSet.savage.includes(b.text)));
  for (const t of pools.gymSet.savage) unbanLine(lineId('gymSet', t));
  assert.equal(bannedLines().length, 0);
  for (const t of pools.waterLogged.mild) banLine(lineId('waterLogged', t));
  for (let i = 0; i < 30; i++) assert.ok(shown(pools.waterLogged.mild).includes(freshLine('waterLogged', 1, keep))); // kind day: a repeat, not a roast
  for (let i = 0; i < 30; i++) assert.ok(shown(pools.waterLogged.savage).includes(freshLine('waterLogged', 10, keep))); // otherwise what's left
  assert.equal(bannedLines(['nope:1']).length, 0); // ids of lines that no longer exist are skipped
  setLineMemory(undefined);
  // the pool handed to native code (Web Focus) leaves retired lines out too, unless nothing would be left
  const guard = pools.focusGuard.savage;
  banLine(lineId('focusGuard', guard[0]));
  assert.ok(!poolFor('focusGuard', 10, {}, ['app', 'name']).includes(guard[0]));
  assert.equal(poolFor('focusGuard', 10, {}, ['app', 'name']).length, guard.length - 1);
  for (const x of guard) banLine(lineId('focusGuard', x));
  assert.deepEqual(poolFor('focusGuard', 10, {}, ['app', 'name']), pools.focusGuard.mild.map((x) => fillLine(x, { app: '{app}', name: '{name}' })));
  setLineMemory(undefined);

  // a toast knows which line it shows, even with an emoji or "+10 XP" around it
  const said = freshLine('taskDone', 10);
  const id = lineIdFor(`✅ ${said} +10 XP`);
  assert.ok(id?.startsWith('taskDone:'));
  banLine(id!);
  assert.ok(bannedLines().some((b) => fillLine(b.text, {}) === said));
  assert.equal(lineIdFor('Restored backup from 2027-01-13 (3 photos). Welcome back.'), null); // not a pool line
  setLineMemory(undefined);

  // notifications: a fixed shuffle per day, so a day's water reminders don't repeat while the pool allows
  const slots = mild.map((_, i) => dayLine('waterRemind', 1, '2027-01-13', i));
  assert.equal(new Set(slots).size, mild.length);
  assert.equal(dayLine('waterRemind', 1, '2027-01-13', 2), slots[2]); // a replan gives the slot the same line
  assert.equal(dayLine('waterRemind', 7, '2027-01-14', 3, { name: 'X' }), dayLine('waterRemind', 7, '2027-01-14', 3, { name: 'X' }));
  const days = new Set(Array.from({ length: 10 }, (_, i) => dayLine('waterRemind', 1, `2027-02-${10 + i}`, 0)));
  assert.ok(days.size > 1); // other days, other first lines
  banLine(lineId('waterRemind', pools.waterRemind.mild[0]));
  for (let i = 0; i < 12; i++) assert.notEqual(dayLine('waterRemind', 1, '2027-01-13', i), mild[0]); // retired lines skip notifications too
  setLineMemory(undefined);
  // the water reminders are dealt across the week: each day carries on where the last one stopped, so over
  // Monday to Sunday every line comes up as often as any other (give or take one), and a replan changes nothing
  {
    const week = ['2027-01-11', '2027-01-12', '2027-01-13', '2027-01-14', '2027-01-15', '2027-01-16', '2027-01-17'];
    for (const level of [1, 7]) {
      const said = week.flatMap((d) => Array.from({ length: 10 }, (_, i) => dayLine('waterRemind', level, d, i, {}, 10)));
      for (const list of level === 1 ? [pools.waterRemind.mild] : [pools.waterRemind.mild, pools.waterRemind.savage]) {
        const counts = list.map((x) => said.filter((y) => y === fillLine(x, {})).length);
        assert.ok(Math.max(...counts) - Math.min(...counts) <= 1, `level ${level}: ${counts}`);
      }
      assert.equal(dayLine('waterRemind', level, week[3], 4, {}, 10), said[34]);
    }
    // at level 1 a day's ten reminders use every mild line before any comes back
    const thursday = Array.from({ length: 10 }, (_, i) => dayLine('waterRemind', 1, week[3], i, {}, 10));
    assert.ok(new Set(thursday).size >= Math.min(10, pools.waterRemind.mild.length));
    // no two reminders in a row say the same thing, not even across the end of a round
    const all = week.flatMap((d) => Array.from({ length: 10 }, (_, i) => dayLine('waterRemind', 1, d, i, {}, 10)));
    for (let i = 1; i < all.length; i++) assert.notEqual(all[i], all[i - 1], `slot ${i}`);
    // a week whose tone changes (a kind Monday, a kind Tuesday): each earlier day is counted in its own tone, so
    // every list still deals its lines evenly instead of replaying some of them
    for (const levels of [
      [1, 8, 8, 8, 8, 8, 8],
      [8, 1, 8, 8, 8, 8, 8],
      [10, 3, 10, 10, 10, 10, 10],
    ]) {
      const levelOn = (d: string) => levels[week.indexOf(d)];
      const dealt = week.flatMap((d, j) => Array.from({ length: 10 }, (_, i) => dayLine('waterRemind', levels[j], d, i, {}, 10, levelOn)));
      for (const list of [pools.waterRemind.mild, pools.waterRemind.savage]) {
        const counts = list.map((x) => dealt.filter((y) => y === fillLine(x, {})).length);
        assert.ok(Math.max(...counts) - Math.min(...counts) <= 1, `levels ${levels}: ${counts}`);
      }
    }
  }

  // lint: lines seen every day have at least 4 savage variants (kind pools are the same in both and exempt)...
  const DAILY = ['greetMorning', 'greetAfternoon', 'greetEvening', 'greetNight', 'spiderTap', 'waterLogged', 'waterRemind', 'coffeeLogged', 'foodLogged', 'gymSet', 'gymToday', 'gymRemind', 'taskDone', 'habitDone', 'habitRemind', 'moodRemind', 'questDone', 'energyLow', 'energyOk', 'energyHigh', 'windDownRemind', 'windDownDone', 'breathDone', 'sleepRemind', 'rateSleepBad', 'rateSleepOk', 'rateSleepGreat', 'sleepShort', 'sleepGood', 'verdictTragic', 'verdictMid', 'verdictGood', 'verdictGreat', 'verdictMorning', 'weatherRain', 'weatherCold', 'weatherHot', 'weatherNice', 'weatherGrey', 'gameStart', 'stepsLow', 'stepsMid', 'stepsHigh', 'morningBrief', 'eveningReport', 'eveningReady'];
  for (const k of DAILY) {
    const pool = pools[k];
    assert.ok(pool, k);
    if (JSON.stringify(pool.mild) === JSON.stringify(pool.savage)) continue;
    assert.ok(pool.savage.length >= 4, `${k}: only ${pool.savage.length} savage lines`);
  }
  // ...and a catchphrase turns up in at most 2 pools, so it stays a joke instead of a tic
  for (const phrase of ['who are you and what have you done', 'houseplant', 'suspicious', 'bold', 'excuse']) {
    const hits = Object.entries(pools).filter(([, x]) => [...x.mild, ...x.savage].some((t) => new RegExp(`\\b${phrase}`, 'i').test(t)));
    assert.ok(hits.length <= 2, `"${phrase}" in ${hits.length} pools: ${hits.map(([k]) => k).join(', ')}`);
  }
  // ...and no line is in two pools, so the debrief never repeats HQ's verdict word for word
  const where = new Map<string, string[]>();
  for (const [k, x] of Object.entries(pools)) for (const t of new Set([...x.mild, ...x.savage])) where.set(t, [...(where.get(t) ?? []), k]);
  const twice = [...where].filter(([, ks]) => ks.length > 1);
  assert.deepEqual(twice, [], twice.map(([t, ks]) => `${ks.join('+')}: ${t}`).join('; '));
  // ...kind days (only the mild list there) don't hear the same two lines on repeat: every daily pool and
  // every kind pool has at least 6 mild lines
  const KIND = ['gymRemindEasy', 'gymEasyLogged', 'gymEasy', 'restDay', 'moodLow', 'moodAwful', 'periodLogged', 'periodSoon', 'verdictKind', 'pauseSick', 'callbackGentle', 'stormGreet', 'weatherDark'];
  for (const k of [...DAILY, ...KIND]) assert.ok(pools[k].mild.length >= 6, `${k}: only ${pools[k].mild.length} mild lines`);
  // ...a 20-set workout rarely hears a set line twice
  assert.ok(pools.gymSet.savage.length >= 16 && pools.gymSet.mild.length >= 8);
  // ...and the house jokes stay jokes: each in at most 3 pools (the Couch King's own lines, with {boss}, don't count)
  for (const phrase of [/\bcouch\b(?!\s+(king|potato))/i, /\bfil(ed|ing) a\b/i, /look at you/i, /missing person/i, /painfully mid/i, /\bdraft/i, /who replaced you|who are you and what/i]) {
    const hits = Object.entries(pools).filter(([, x]) => [...x.mild, ...x.savage].some((t) => phrase.test(t) && !t.includes('{boss}')));
    assert.ok(hits.length <= 3, `${phrase} in ${hits.length} pools: ${hits.map(([k]) => k).join(', ')}`);
  }
}

// "too far" turns the day's tone down a step (golden lines off), and only that day
{
  const at = new Date(2027, 0, 13, 9);
  const t = defaultState();
  t.toneEase = { day: '2027-01-13', steps: 1 };
  assert.deepEqual(toneOn(t, '2027-01-13', at), { level: 10 - EASE_STEP, kind: false });
  assert.equal(toneOn(t, '2027-01-14', at).level, 10);
  assert.ok(!goldenAllowed(t, at));
  t.toneEase = { day: '2027-01-13', steps: 9 };
  assert.equal(toneOn(t, '2027-01-13', at).level, 1);
}

// the Storm protocol (storm.ts): an orange or red warning or a VMA makes its days kind, then lifts by itself
{
  const at = new Date(2027, 0, 13, 9).getTime();
  const alert = (o: Partial<Alert> & Pick<Alert, 'id' | 'level'>): Alert => ({ source: 'SMHI', title: 'Storm', text: '', url: 'https://www.smhi.se/varningar', ...o });
  const iso = (d: number, h: number) => new Date(2027, 0, d, h).toISOString();
  const smhi = [
    alert({ id: 'smhi-1-1', level: 'YELLOW' }),
    alert({ id: 'smhi-2-1', level: 'ORANGE', title: 'Strong wind', text: 'Gusts of 30 m/s. Stay indoors if you can. Trees may fall. Ferries are cancelled.', start: iso(13, 6), end: iso(14, 18) }),
    alert({ id: 'smhi-3-1', level: 'RED', end: iso(12, 18) }), // already over
  ];
  const held = stormAlertsOf(smhi, at);
  assert.deepEqual(held.map((a) => a.id), ['smhi-2-1']); // yellow doesn't hold it, an ended one neither
  assert.equal(held[0].advice, 'Gusts of 30 m/s. Stay indoors if you can. Trees may fall. Ferries are cancelled.');
  assert.equal(adviceOf({ text: '', url: 'https://www.krisinformation.se' }), 'Details: www.krisinformation.se');
  assert.ok(adviceOf({ text: 'Stay safe. '.repeat(40), url: '' }).length <= 180);

  const t = defaultState();
  t.storm = nextStorm(undefined, smhi, [], at);
  assert.deepEqual(toneOn(t, '2027-01-13', new Date(at)), { level: 1, kind: true, storm: true });
  assert.equal(toneOn(t, '2027-01-14', new Date(at)).kind, true); // it runs into tomorrow: those reminders are kind too
  assert.deepEqual(toneOn(t, '2027-01-15', new Date(at)), { level: 10, kind: false });
  assert.equal(toneOn(t, '2027-01-14', new Date(2027, 0, 14, 19)).kind, false); // over at 18:00, so the evening is normal again
  assert.ok(!goldenAllowed(t, new Date(at)));
  // a check that finds the same alerts changes nothing (no save); a failed source keeps what it had
  assert.equal(nextStorm(t.storm, smhi, [], at + 60_000), t.storm);
  assert.equal(nextStorm(t.storm, null, null, at + 60_000), t.storm);
  assert.equal(nextStorm(t.storm, [], [], at), undefined); // SMHI says it's gone: lifted
  // a VMA has no end: it holds through the day it was last seen, so a phone that stops checking lifts it
  const vma = [alert({ id: 'vma-1', source: 'VMA', level: 'VMA', title: 'Fire in the harbour', text: 'Go indoors and close windows and doors.', start: iso(13, 8) })];
  const v = { storm: nextStorm(undefined, [], vma, at) };
  assert.equal(stormOn(v, '2027-01-13', at)?.id, 'vma-1');
  assert.equal(stormOn(v, '2027-01-14', at), null);
  assert.equal(nextStorm(v.storm, [], vma, at + 3_600_000), v.storm); // seen again the same day: no save
  assert.notEqual(nextStorm(v.storm, [], vma, at + 86_400_000), v.storm); // next day: moved on once
  // an orange warning for tomorrow with no end, seen tonight: it holds its own start day (not only tonight's)
  const tonight = new Date(2027, 0, 13, 20).getTime();
  const early = { storm: nextStorm(undefined, [alert({ id: 'smhi-9-1', level: 'ORANGE', start: iso(14, 6) })], [], tonight) };
  assert.equal(stormOn(early, '2027-01-13', tonight), null);
  assert.equal(stormOn(early, '2027-01-14', tonight)?.id, 'smhi-9-1');
  assert.equal(stormOn(early, '2027-01-15', tonight), null);
  // the background check: the days its alerts hold the protocol on, and what it does to what's already planned
  assert.deepEqual(stormDays(smhi, at), ['2027-01-13', '2027-01-14']);
  assert.deepEqual(stormDays([alert({ id: 'smhi-1-1', level: 'YELLOW' })], at), []);
  const planned = ['gym-2027-01-14-shame', 'gym-2027-01-14-pre', 'gym-2027-01-14-move', 'move-2027-01-14', 'evening-2027-01-14', 'water-2027-01-14-600', 'water-2027-01-15-600', 'evening-2027-01-15', 'weekendboss-2027-01-14', 'game-warn'];
  assert.deepEqual(stormPlan(planned, ['2027-01-14']), {
    cancel: ['gym-2027-01-14-shame', 'gym-2027-01-14-move', 'move-2027-01-14', 'evening-2027-01-14', 'weekendboss-2027-01-14'],
    soften: ['water-2027-01-14-600'],
  });
  // the worst one is the one shown
  const both = { storm: nextStorm(undefined, smhi, vma, at) };
  assert.equal(stormOn(both, '2027-01-13', at)?.level, 'VMA');
  // the Storm flag is set whatever else makes the day kind: a low mood, sick, Julfrid
  const julStorm = { ...defaultState(), storm: [{ ...held[0], start: new Date(2027, 11, 24, 6).toISOString(), end: new Date(2027, 11, 24, 22).toISOString() }] };
  assert.deepEqual(toneOn(julStorm, '2027-12-24', new Date(2027, 11, 24, 9)), { level: 1, kind: true, storm: true });
  t.days['2027-01-13'] = { ...emptyDay(), moods: [{ id: 'm', level: 1, emotions: [], at: 0 }] };
  assert.equal(toneOn(t, '2027-01-13', new Date(at)).storm, true);
  // quietDay: what recaps, rival talk and the co-op partner go by covers Julfrid, a Storm day and a carried low mood
  assert.ok(quietDay(defaultState(), '2027-12-25'));
  assert.ok(quietDay(t, '2027-01-14', new Date(at)));
  const carried = defaultState();
  carried.days['2027-02-01'] = { ...emptyDay(), moods: [{ id: 'm', level: 2, emotions: [], at: 0 }] };
  assert.ok(quietDay(carried, '2027-02-02') && !gentleDay(carried, '2027-02-02'));
  assert.ok(!quietDay(defaultState(), '2027-02-02'));
}

// SL: a cancelled next departure gets one calm line naming it and the next one that runs
{
  const now = new Date(2026, 9, 26, 8, 0).getTime();
  const dep = (h: number, m: number, state = 'EXPECTED', line = '17'): SlDeparture => {
    const at = new Date(2026, 9, 26, h, m).getTime();
    return { line, lineId: 17, mode: 'METRO', direction: 1, destination: 'Akeshov', scheduled: at, expected: at, state };
  };
  const cfg = { routes: ['17:1'], walkMin: 5 };
  assert.equal(cancelledNote([dep(8, 12), dep(8, 27)], cfg, now), null);
  assert.equal(cancelledNote([dep(8, 12, 'CANCELLED'), dep(8, 27)], cfg, now), 'Your 08:12 is cancelled; next is the 08:27 (line 17). Leave in 22 min.');
  assert.equal(cancelledNote([dep(8, 6, 'CANCELLED'), dep(8, 7)], { ...cfg, walkMin: 6 }, now), "Your 08:06 is cancelled; next is the 08:07 (line 17). I'd leave now.");
  assert.equal(cancelledNote([dep(8, 12, 'CANCELLED')], cfg, now), 'Your 08:12 is cancelled, and nothing else runs on your lines in the next hour. Time for plan B.');
  assert.equal(cancelledNote([dep(8, 12, 'CANCELLED', '4')], cfg, now), null); // not one of her lines
}

// a silence after a low check-in stays kind: the last mood counts however many days back it was
{
  const q = defaultState();
  const mood = (level: 1 | 2 | 3 | 4 | 5) => ({ water: [], food: [], sets: [], games: [], bonusGameMin: 0, moods: [{ id: 'm', level, emotions: [], at: 0 }] });
  assert.ok(!lastMoodLow(q, '2027-01-20'));
  q.days['2027-01-10'] = mood(4);
  q.days['2027-01-12'] = mood(2);
  q.days['2027-01-14'] = { water: [], food: [], sets: [], games: [], bonusGameMin: 0 }; // a day with no check-in
  assert.ok(lastMoodLow(q, '2027-01-20'));
  assert.ok(!lastMoodLow(q, '2027-01-11'));
  q.days['2027-01-13'] = mood(3);
  assert.ok(!lastMoodLow(q, '2027-01-20'));
}

// just-in-time insights: only what the data shows, once a day, never on a sick day
{
  const blank = (extra: Partial<DayLog> = {}): DayLog => ({ water: [], food: [], sets: [], games: [], bonusGameMin: 0, ...extra });
  const g = defaultState();
  const fri = new Date(2027, 0, 15, 22); // Fri 15 Jan 2027, 22:00 (bedtime 23:00)
  // 20 evenings: a finding needs 8+ days on each side and a clear test (stats.ts)
  for (let i = 20; i >= 1; i--) {
    const d = addDays(fri, -i);
    const late = i % 2 === 0; // every other evening: a game until 23:30
    const end = new Date(d);
    end.setHours(late ? 23 : 20, 30, 0, 0);
    g.days[dayKey(d)] = blank({ games: [{ start: end.getTime() - 3_600_000, end: end.getTime() }] });
  }
  // the morning after rates the night: worse after late gaming
  for (let i = 19; i >= 0; i--) {
    const k = dayKey(addDays(fri, -i));
    const lateBefore = (i + 1) % 2 === 0;
    g.days[k] = { ...(g.days[k] ?? blank()), sleepRating: lateBefore ? 2 : 4 };
  }
  assert.ok(insightById(g, 'late_game', fri));
  const r = lateGameRemark(g, fri);
  assert.ok(r && r.finding.includes('23:00'));
  assert.equal(lateGameRemark(g, new Date(2027, 0, 15, 14)), null); // the afternoon isn't near bedtime
  assert.equal(lateGameRemark(withJitSaid(g, 'late_game', fri), fri), null); // once a day
  assert.ok(lateGameRemark(withJitSaid(g, 'late_game', addDays(fri, -1)), fri)); // yesterday's doesn't count
  assert.equal(lateGameRemark(startPause(g, 'sick', 1, '2027-01-15'), fri), null); // nothing on a sick day
  assert.ok(lateGameRemark(startPause(g, 'away', 1, '2027-01-15'), fri)); // away mode still gets it
  assert.equal(lateGameRemark(defaultState(), fri), null); // no data, no remark
  assert.ok(nearBedtime(g, new Date(2027, 0, 15, 21, 31)));
  assert.ok(!nearBedtime(g, new Date(2027, 0, 15, 21, 29)));
  assert.ok(nearBedtime(g, new Date(2027, 0, 16, 1, 30))); // after midnight
  assert.ok(!nearBedtime(g, new Date(2027, 0, 16, 7)));
  assert.ok(!jitAllowed(startPause(defaultState(), 'sick', 1, '2027-01-15'), 'social_jetlag', fri));

  // late coffee: shorter nights after cups past the 15:00 curfew, and the caffeine left at bedtime
  const c = defaultState();
  for (let i = 20; i >= 1; i--) {
    const d = addDays(fri, -i);
    const late = i % 2 === 0;
    const cup = new Date(d);
    cup.setHours(late ? 17 : 9, 0, 0, 0);
    c.days[dayKey(d)] = blank({ coffee: [{ id: `c${i}`, mg: 90, at: cup.getTime() }] });
  }
  for (let i = 19; i >= 0; i--) {
    const k = dayKey(addDays(fri, -i));
    c.days[k] = { ...(c.days[k] ?? blank()), sleepMin: (i + 1) % 2 === 0 ? 360 : 450 };
  }
  const cup = new Date(2027, 0, 15, 17).getTime();
  c.days['2027-01-15'] = { ...c.days['2027-01-15'], coffee: [{ id: 'now', mg: 90, at: cup }] };
  const rc = lateCoffeeRemark(c, cup, new Date(cup));
  assert.ok(rc && rc.finding.includes('15:00'));
  assert.equal(rc.mg, 40); // 90 mg six hours before 23:00, halving every 5 hours: about 39 mg, to the nearest 10
  assert.equal(lateCoffeeRemark(c, new Date(2027, 0, 15, 10).getTime(), new Date(2027, 0, 15, 10)), null); // before the curfew
  assert.equal(lateCoffeeRemark(withJitSaid(c, 'late_coffee', new Date(cup)), cup, new Date(cup)), null);

  // the weekend heads-up: Friday from 17:00 only, and only with the data behind it
  assert.equal(jetlagRemark(g, new Date(2027, 0, 14, 19)), null); // Thursday
  assert.equal(jetlagRemark(g, new Date(2027, 0, 15, 16)), null); // too early
  assert.equal(jetlagRemark(g, new Date(2027, 0, 15, 19)), null); // no sleep rhythm data: nothing to say
}

// new fields default sensibly for old saves
const h2 = hydrate({ xp: 1 } as never);
assert.deepEqual(h2.progressPhotos, []);
assert.equal(h2.settings.stepGoal, 8000);
assert.equal(h2.settings.notify.mood, true);
assert.equal(ACHIEVEMENTS.length, 20);

// quests: 3 picks, same picks for the same day, valid progress
const q = defaultState();
q.onboarded = true;
const picks = pickQuests(q);
assert.equal(picks.length, 3);
assert.deepEqual(pickQuests(q), picks);
assert.equal(new Set(picks).size, 3);
const day2 = atTime(new Date(), 1, 12);
assert.ok(pickQuests(q, day2).length === 3);
for (const quest of questsFor(q)) assert.ok(quest.progress >= 0 && quest.progress <= quest.target && quest.target > 0, quest.id);
// watch quests only appear once steps data exists
assert.ok(!pickQuests(q).some((id) => id.startsWith('steps')));

// boss: damage = XP earned this week
const b = defaultState();
const fresh = bossFor(b);
assert.equal(fresh.damage, 0);
assert.equal(fresh.hp, fresh.maxHp);
b.days[dayKey()] = { water: [], food: [], sets: [], games: [], bonusGameMin: 0, xpEarned: 200 };
assert.equal(bossFor(b).damage, 200);
assert.equal(bossFor(b).hp, fresh.maxHp - 200);

// boss HP follows your pace: 1.1 × your average week over the 4 weeks before its Monday, from your first day with XP
{
  const empty = { water: [], food: [], sets: [], games: [], bonusGameMin: 0 };
  const monday = new Date(2027, 0, 11); // a Monday, well after XP was halved
  const before = (n: number) => dayKey(addDays(monday, -n));
  const p = defaultState();
  // under 3 days to go on: the starter boss
  p.days[before(1)] = { ...empty, xpEarned: 200 };
  p.days[before(2)] = { ...empty, xpEarned: 200 };
  assert.equal(xpPace(p, monday), null);
  assert.equal(bossFor(p, monday).maxHp, 500 + 50 * levelForXp(p.xp));
  // 10 days, two of them without XP: 1600 / 10 = 160 a day → 160 × 7 × 1.1 = 1232 → 1250
  for (let i = 1; i <= 10; i++) p.days[before(i)] = { ...empty, xpEarned: i === 4 || i === 5 ? 0 : 200 };
  assert.equal(xpPace(p, monday), 160);
  assert.equal(bossFor(p, monday).maxHp, 1250);
  // the week itself doesn't move its own HP
  p.days[dayKey(monday)] = { ...empty, xpEarned: 900 };
  assert.equal(bossFor(p, monday).maxHp, 1250);
  // a first day long ago: all 28 days count, empty ones too, and never below 500
  p.days[before(40)] = { ...empty, xpEarned: 5000 };
  assert.equal(xpPace(p, monday), 1600 / 28);
  assert.equal(bossFor(p, monday).maxHp, 500);
  // days before XP was halved (2026-10-14) count half
  const h = defaultState();
  const mon = new Date(2026, 9, 19);
  for (let i = 1; i <= 7; i++) h.days[dayKey(addDays(mon, -i))] = { ...empty, xpEarned: i >= 6 ? 400 : 200 };
  assert.equal(xpPace(h, mon), 200);
  assert.equal(bossFor(h, mon).maxHp, 1550); // 200 × 7 × 1.1 = 1540 → 1550
}

// habits: every-day habit, check-offs counted as a total
const hb = defaultState();
hb.habits = [{ id: 'h1', name: 'Read', emoji: 'x', days: [], remindHour: null, createdAt: Date.now() - 10 * 86_400_000 }];
for (let i = 1; i <= 3; i++) hb.days[dayKey(atTime(new Date(), -i, 12))] = { water: [], food: [], sets: [], games: [], bonusGameMin: 0, habits: ['h1'] };
assert.equal(habitsFor(hb).length, 1);
hb.days[dayKey()] = { water: [], food: [], sets: [], games: [], bonusGameMin: 0, habits: ['h1'] };
const creature = ACHIEVEMENTS.find((a) => a.id === 'creature_of_habit')!;
assert.ok(!creature.test(hb));
for (let i = 4; i < 50; i++) hb.days[dayKey(atTime(new Date(), -i * 3, 12))] = { water: [], food: [], sets: [], games: [], bonusGameMin: 0, habits: ['h1'] };
assert.ok(creature.test(hb)); // 50 check-offs, gaps allowed
assert.ok(!ACHIEVEMENTS.some((a) => /streak|in a row/i.test(a.desc)));

// report card: sane output for an empty and a busy week
const r0 = weekReport(defaultState());
assert.equal(r0.grade, null); // nothing logged: nothing to grade
assert.ok(r0.categories.length >= 7);
for (const c of r0.categories) assert.ok(c.score == null || (c.score >= 0 && c.score <= 100), c.id);
assert.equal(gradeOf(90), 'A');
assert.equal(gradeOf(10), 'F');

// weather helpers
assert.equal(wx(0).label, 'Clear');
assert.equal(wx(63).label, 'Rain');
const fc = (f: { date?: string; max: number; min: number; rainPct: number; code: number; daylightMin?: number; sunshineMin?: number }) => ({
  date: 'x', rainMm: 0, sunrise: 0, sunset: 0, daylightMin: 600, sunshineMin: 0, ...f,
});
assert.equal(weatherKey(fc({ max: 10, min: 2, rainPct: 80, code: 3 })), 'weatherRain');
assert.equal(weatherKey(fc({ max: 30, min: 18, rainPct: 0, code: 0 })), 'weatherHot');
assert.equal(weatherKey(fc({ max: 1, min: -5, rainPct: 0, code: 0 })), 'weatherCold');
// grey days aren't "nice": fog, overcast, or hardly a minute of sun; snow is cold whatever the thermometer says
assert.equal(weatherKey(fc({ max: 6, min: 2, rainPct: 10, code: 45 })), 'weatherGrey');
assert.equal(weatherKey(fc({ max: 7, min: 3, rainPct: 20, code: 3, sunshineMin: 200 })), 'weatherGrey');
assert.equal(weatherKey(fc({ max: 8, min: 4, rainPct: 0, code: 2, sunshineMin: 10 })), 'weatherGrey');
assert.equal(weatherKey(fc({ max: 8, min: 4, rainPct: 0, code: 1, sunshineMin: 240 })), 'weatherNice');
assert.equal(weatherKey(fc({ max: 5, min: 0, rainPct: 40, code: 73, sunshineMin: 0 })), 'weatherCold');
assert.equal(weatherKey(fc({ max: 4, min: 0, rainPct: 30, code: 85, sunshineMin: 0 })), 'weatherCold');
assert.equal(weatherKey(fc({ max: 0, min: -3, rainPct: 85, code: 73, sunshineMin: 0 })), 'weatherCold'); // a snow day's 85 % is snow, not an umbrella
assert.equal(weatherKey(fc({ max: 2, min: -1, rainPct: 70, code: 86 })), 'weatherCold');
assert.equal(weatherKey(fc({ max: 4, min: 1, rainPct: 60, code: 75 })), 'weatherCold');
// a grey day in the dark months (under 8 h of daylight) is "dark": its lines say when the light is
assert.equal(weatherKey(fc({ max: 4, min: 1, rainPct: 10, code: 3, daylightMin: 400 })), 'weatherDark');
assert.equal(weatherKey(fc({ max: 4, min: 1, rainPct: 10, code: 3, daylightMin: 480 })), 'weatherGrey');
assert.equal(weatherKey(fc({ max: 5, min: 1, rainPct: 0, code: 1, sunshineMin: 200, daylightMin: 400 })), 'weatherNice'); // a sunny winter day stays nice
assert.equal(weatherKey(fc({ max: 1, min: -4, rainPct: 0, code: 3, daylightMin: 400 })), 'weatherCold'); // cold says "dress warm" first
// daylight: only gains are mentioned; rain: "until" while raining, "from" when it starts within 3 hours
const dl = (date: string, daylightMin: number) => fc({ date, max: 0, min: 0, rainPct: 0, code: 0, daylightMin });
assert.equal(daylightGain([dl('2026-12-22', 370), dl('2026-12-23', 372)], '2026-12-22'), 2);
assert.equal(daylightGain([dl('2026-10-11', 637), dl('2026-10-12', 632)], '2026-10-11'), null);
assert.equal(daylightGain([dl('2026-10-11', 637)], '2026-10-11'), null);
{
  const t0 = new Date(2026, 9, 11, 17, 0).getTime();
  const slots = (mm: number[]) => mm.map((x, i) => ({ at: t0 + i * 15 * MIN, mm: x }));
  assert.equal(rainNote(slots([0.6, 0.4, 0, 0]), t0 + 5 * MIN), '🌧️ Rain until 17:30');
  assert.equal(rainNote(slots([0, 0, 0, 0.3]), t0), '🌂 Rain from 17:45');
  assert.equal(rainNote(slots([0, 0, 0, 0]), t0), null);
  assert.equal(rainNote(slots([0.5, 0.5]), t0), '🌧️ Rain for the next few hours');
}

// training by time counts as a workout
const t = defaultState();
const tk = dayKey();
t.days[tk] = { water: [], food: [], sets: [], games: [], bonusGameMin: 0, activities: [{ id: 'a', kind: 'cardio', minutes: 30, at: Date.now() }] };
assert.ok(trainedOn(t.days[tk]));
assert.ok(!trainedOn({ water: [], food: [], sets: [], games: [], bonusGameMin: 0 }));
// training minutes: activities as logged, sessions of sets too (5 min margin each side), an activity's own minutes never twice
{
  const at = (h: number, m = 0) => new Date(2027, 0, 12, h, m).getTime();
  const lift = (id: string, h: number, m: number) => ({ id, exercise: 'Squat', weight: 40, reps: 8, at: at(h, m) });
  const base = { water: [], food: [], sets: [], games: [], bonusGameMin: 0 };
  const sets = { ...base, sets: [lift('a', 18, 0), lift('b', 18, 15), lift('c', 18, 35)] };
  assert.deepEqual(setSessions(sets), [{ start: at(17, 55), end: at(18, 40) }]);
  assert.equal(trainMinutes(sets), 45, 'sets alone can finish "Train for 45 minutes"');
  assert.equal(activityMinutes(sets), 0);
  const both = { ...sets, activities: [{ id: 'x', kind: 'cardio' as const, minutes: 20, at: at(18, 40) }] }; // cardio 18:20–18:40, among the sets
  assert.equal(trainMinutes(both), 45, 'the cardio covers 20 of the session: 25 + 20');
  const twoLogs = { ...base, activities: [{ id: 'k', kind: 'cardio' as const, minutes: 30, at: at(18, 0) }, { id: 'm', kind: 'machines' as const, minutes: 30, at: at(18, 1) }] };
  assert.equal(trainMinutes(twoLogs), 60, 'two activities logged together keep their own minutes');
  assert.equal(trainMinutes({ ...sets, sets: [...sets.sets, lift('d', 20, 0)] }), 55, 'a lone set later is a 10-minute session of its own');
}

// games: recent list and totals
const gs = defaultState();
const nowMs = Date.now();
gs.days[dayKey()] = {
  water: [], food: [], sets: [], bonusGameMin: 0,
  games: [
    { start: nowMs - 3 * 3_600_000, end: nowMs - 2 * 3_600_000, game: 'Elden Ring' },
    { start: nowMs - 90 * 60_000, end: nowMs - 60 * 60_000, game: 'Fortnite' },
    { start: nowMs - 50 * 60_000, end: nowMs - 40 * 60_000 },
  ],
};
assert.deepEqual(recentGames(gs), ['Fortnite', 'Elden Ring']);
const totals = gameTotals(gs);
assert.equal(totals[0].game, 'Elden Ring');
assert.equal(Math.round(totals[0].ms / 60_000), 60);
assert.ok(totals.some((x) => x.game === 'Unnamed'));

// gaming penalty (also used to re-grade edited sessions): first minute free, then 1 XP per started 5 min
assert.equal(gamePenalty(0), 0);
assert.equal(gamePenalty(-10 * 60_000), 0);
assert.equal(gamePenalty(60_000), 0);
assert.equal(gamePenalty(61_000), 1);
assert.equal(gamePenalty(5 * 60_000), 1);
assert.equal(gamePenalty(20 * 60_000), 4);
assert.equal(gamePenalty(21 * 60_000), 5);
// shortening a 2h session to 1h on a 60 min budget refunds everything it cost
assert.equal(gamePenalty(0) - gamePenalty(60 * 60_000), -12);

// timed training and Web Focus XP
assert.equal(activityXp(60), 6);
assert.equal(activityXp(300), 10);
assert.equal(activityXp(3), 0);
assert.equal(focusXp(25), 5);
assert.equal(focusXp(90), 18);

// sleep: the watch fills and updates last night, but never overwrites hours typed in by hand
const night = { water: [], food: [], sets: [], games: [], bonusGameMin: 0 };
assert.equal(syncedSleep(night, 420), 420);
assert.equal(syncedSleep({ ...night, sleepMin: 400 }, 420), 420);
assert.equal(syncedSleep({ ...night, sleepMin: 400 }, null), 400);
assert.equal(syncedSleep({ ...night, sleepMin: 480, sleepManual: true }, 420), 480);
assert.equal(syncedSleep({ ...night, sleepMin: 0, sleepManual: true }, 420), 0);
assert.equal(syncedSleep(night, null), undefined);

// food search (Livsmedelsverket names): whole words first, plain before fancy, aliases for everyday words
const foods = ['Äggröra', 'Ägg kokt', 'Våffla m. ägg', 'Gris späck', 'Risgrynsgröt', 'Ris kokt', 'Havregrynsgröt fullkorn', 'Hårt bröd fullkorn råg', 'Kyckling bröstfilé rå u. skinn'].map(
  (name, id) => ({ id, name }),
);
const names = (q: string) => searchFoods(foods, q).map((f) => f.name);
assert.deepEqual(names('ägg'), ['Ägg kokt', 'Äggröra', 'Våffla m. ägg']);
assert.deepEqual(names('ris'), ['Ris kokt', 'Risgrynsgröt', 'Gris späck']);
assert.deepEqual(names('kokt ägg'), ['Ägg kokt']);
assert.deepEqual(names('gröt'), ['Risgrynsgröt', 'Havregrynsgröt fullkorn']);
assert.deepEqual(names('Knäckebröd'), ['Hårt bröd fullkorn råg']);
assert.deepEqual(names('kycklingfilé'), ['Kyckling bröstfilé rå u. skinn']);
assert.deepEqual(names('x'), []);
assert.deepEqual(names('3 eggs + toast'), []);

// period: kind (mild lines only) unless "go easy" is turned off
const p = defaultState();
p.days[dayKey()] = { water: [], food: [], sets: [], games: [], bonusGameMin: 0, period: { flow: 'medium', symptoms: [] } };
assert.equal(effectiveSavage(p), 1);
p.settings.easyOnPeriod = false;
assert.equal(effectiveSavage(p), 10);
p.settings.easyOnPeriod = true;
p.settings.savageLevel = 2;
assert.equal(effectiveSavage(p), 1);
// symptoms only (no flow) is not a period day
p.settings.savageLevel = 10;
p.days[dayKey()].period = { flow: null, symptoms: ['Cramps'] };
assert.equal(effectiveSavage(p), 10);

// cycle: two periods 28 days apart -> 28-day average, next predicted 28 days after the last start
const cy = defaultState();
const mk = (offset: number) => dayKey(atTime(new Date(), offset, 12));
for (const start of [-40, -12]) {
  for (let i = 0; i < 4; i++) cy.days[mk(start + i)] = { water: [], food: [], sets: [], games: [], bonusGameMin: 0, period: { flow: 'medium', symptoms: [] } };
}
// a skipped day inside a period must not count as a new start
cy.days[mk(-12 + 5)] = { water: [], food: [], sets: [], games: [], bonusGameMin: 0, period: { flow: 'light', symptoms: [] } };
assert.deepEqual(periodStarts(cy), [mk(-40), mk(-12)]);
const ci = cycleInfo(cy)!;
assert.equal(ci.avgLength, 28);
assert.equal(ci.cycles, 1);
assert.equal(ci.cycleDay, 13);
assert.equal(ci.daysUntil, 16);
assert.ok(isPredictedPeriod(ci, atTime(new Date(), 16, 12)));
assert.ok(!isPredictedPeriod(ci, atTime(new Date(), 10, 12)));
assert.equal(cycleInfo(defaultState()), null);
// spotting: mid-cycle it isn't a period (no restart, no shifted prediction); before a period it doesn't move the start
{
  const sp = structuredClone(cy);
  const spot = { water: [], food: [], sets: [], games: [], bonusGameMin: 0, period: { flow: 'spotting' as const, symptoms: [] } };
  sp.days[mk(-26)] = spot; // mid-cycle
  sp.days[mk(-14)] = spot; // two days before the second period
  sp.days[mk(-13)] = spot;
  assert.deepEqual(periodStarts(sp), [mk(-40), mk(-12)]);
  const si = cycleInfo(sp)!;
  assert.equal(si.cycleDay, 13);
  assert.equal(si.daysUntil, 16);
  assert.equal(si.avgLength, 28);
  sp.days[mk(0)] = spot; // spotting today, mid-cycle: no "period day 13"
  assert.equal(cycleInfo(sp)!.periodDay, null);
  assert.equal(cycleInfo(sp)!.daysUntil, 16);
  assert.equal(periodStarts({ ...defaultState(), days: { [mk(-3)]: spot } }).length, 0); // spotting alone: no cycle at all
}

// report: sleep ratings count even without watch data
const rs = defaultState();
rs.days[dayKey()] = { water: [], food: [], sets: [], games: [], bonusGameMin: 0, sleepRating: 5 };
const sleepCat = weekReport(rs).categories.find((c) => c.id === 'sleep')!;
assert.ok(sleepCat && sleepCat.score === 100, JSON.stringify(sleepCat));

// quest pool: no more "Log 15 sets", timed training instead
assert.ok(!pickQuests(defaultState()).includes('sets'));

// countdowns: one-off vs yearly rollover
const cd = defaultState();
const in10 = dayKey(atTime(new Date(), 10, 12));
const ago10 = dayKey(atTime(new Date(), -10, 12));
cd.countdowns = [
  { id: 'a', title: 'Trip', emoji: 'x', date: in10, yearly: false, createdAt: 0 },
  { id: 'b', title: 'Done', emoji: 'x', date: ago10, yearly: false, createdAt: 0 },
  { id: 'c', title: 'Bday', emoji: 'x', date: ago10, yearly: true, createdAt: 0 },
];
assert.equal(daysLeft(cd.countdowns[0]), 10);
assert.deepEqual(upcoming(cd).map((c) => c.id), ['a', 'c']);
const bday = nextDate(cd.countdowns[2]);
assert.ok(bday.getTime() > Date.now() && daysLeft(cd.countdowns[2]) >= 355 - 2, String(daysLeft(cd.countdowns[2])));

// insights: training days have clearly better mood -> insight appears
const ins = defaultState();
for (let i = 1; i <= 20; i++) {
  const trained = i % 2 === 0;
  ins.days[dayKey(atTime(new Date(), -i, 12))] = {
    water: [], food: [], games: [], bonusGameMin: 0,
    sets: [],
    activities: trained ? [{ id: 'x' + i, kind: 'cardio', minutes: 30, at: Date.now() }] : [],
    moods: [{ id: 'm' + i, level: trained ? 5 : 3, emotions: [], at: Date.now() }],
  };
}
const found = insights(ins);
assert.ok(found.some((x) => x.id === 'train_mood'), JSON.stringify(found.map((x) => x.id)));
assert.equal(insights(defaultState()).length, 0);
// ...but not with fewer than 8 days on a side
const fewIns = structuredClone(ins);
for (let i = 15; i <= 20; i++) delete fewIns.days[dayKey(atTime(new Date(), -i, 12))];
assert.ok(!insights(fewIns).some((x) => x.id === 'train_mood'));
// sick days are left out: no gym and a low mood on them don't make training look like a mood fix
const sickIns = structuredClone(ins);
for (let i = 1; i <= 20; i++) {
  const k = dayKey(atTime(new Date(), -i, 12));
  sickIns.days[k] = { ...sickIns.days[k], moods: [{ id: 'm' + i, level: 4, emotions: [], at: Date.now() }] };
}
for (let i = 2; i <= 20; i += 2) sickIns.days[dayKey(atTime(new Date(), -i, 12))].moods = [{ id: 's' + i, level: 4, emotions: [], at: Date.now() }];
for (let i = 1; i <= 7; i += 2) {
  const k = dayKey(atTime(new Date(), -i, 12));
  sickIns.days[k] = { ...sickIns.days[k], moods: [{ id: 's' + i, level: 1, emotions: [], at: Date.now() }] };
  sickIns.pauses = [...(sickIns.pauses ?? []), { kind: 'sick', from: k, to: k }];
}
assert.ok(!insights(sickIns).some((x) => x.id === 'train_mood'), JSON.stringify(insights(sickIns).map((x) => x.text)));

// stats: the same numbers always give the same p-value; a clear gap is small, an even split large; the cut keeps what survives
{
  const a = [5, 5, 5, 5, 5, 5, 5, 5, 4, 5];
  const b = [3, 3, 3, 2, 3, 3, 3, 3, 3, 3];
  assert.equal(permP(a, b), permP(a, b));
  assert.ok(permP(a, b) < 0.01, String(permP(a, b)));
  assert.ok(permP([3, 4, 3, 4, 3, 4, 3, 4], [4, 3, 4, 3, 4, 3, 4, 3]) > 0.5);
  assert.deepEqual(bhKeep([0.001, 0.02, 0.04, 0.5]), [true, true, true, false]);
  assert.deepEqual(bhKeep([0.04, 0.3, 0.6, 0.9]), [false, false, false, false]); // 0.04 alone among 4 tries isn't enough
}

// insights on noise: 60 days of independent random logs show nothing (they showed 4 findings on average before)
{
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const pick = <T extends number>(lo: T, hi: T) => (lo + Math.floor(rnd() * (hi - lo + 1))) as T;
  const noise = defaultState();
  noise.trackers = [{ id: 'hd', name: 'Headache', emoji: 'x', kind: 'scale', createdAt: 0 }];
  for (let i = 1; i <= 61; i++) {
    const date = atTime(new Date(), -i, 12);
    const at = (h: number) => atTime(date, 0, h).getTime();
    noise.days[dayKey(date)] = {
      water: Array.from({ length: pick(4, 12) }, (_, j) => ({ id: `w${i}-${j}`, ml: 250, at: at(8 + j) })),
      food: [], games: rnd() < 0.5 ? [{ start: at(20), end: at(20) + pick(30, 240) * 60_000 }] : [], bonusGameMin: 0,
      sets: rnd() < 0.5 ? [{ id: `s${i}`, exercise: 'Squat', weight: 40, reps: 10, at: at(17) }] : [],
      coffee: Array.from({ length: pick(0, 4) }, (_, j) => ({ id: `c${i}-${j}`, mg: 90, at: at(8 + j * 3) })),
      moods: [{ id: `m${i}`, level: pick<2 | 3 | 4 | 5>(2, 5), emotions: [], at: at(13) }],
      steps: pick(3000, 13000), sleepMin: pick(340, 520), sleepRating: pick<2 | 3 | 4 | 5>(2, 5), energy: pick<2 | 3 | 4 | 5>(2, 5),
      tracks: { hd: pick(1, 4) },
    };
  }
  assert.deepEqual(insights(noise).map((x) => x.id), []);
}

// weekdays: not the day score (which mostly says where the workouts are planned), one measure at a time
{
  const wk = defaultState();
  wk.plan = { 0: null, 1: { name: 'Legs', exercises: [] }, 2: null, 3: null, 4: null, 5: null, 6: null }; // Mondays planned, never trained: the day score would call Mondays bad
  for (let i = 1; i <= 91; i++) {
    const date = atTime(new Date(), -i, 12);
    const sunday = date.getDay() === 0;
    wk.days[dayKey(date)] = {
      water: Array.from({ length: sunday ? 4 : 8 }, (_, j) => ({ id: `w${i}-${j}`, ml: 250 + (j % 2) * 10, at: date.getTime() })),
      food: [], sets: [], games: [], bonusGameMin: 0, steps: 8000 + (i % 3) * 500,
    };
  }
  const wkIns = insights(wk).filter((x) => x.id === 'weekday');
  assert.equal(wkIns.length, 1);
  assert.ok(wkIns[0].text.startsWith('Sundays: you drink about') && wkIns[0].text.includes('% less water'), wkIns[0].text);
}

// wrapped: always intro + finale, data slides only with data
const wnow = new Date();
const wEmpty = monthWrapped(defaultState(), wnow.getFullYear(), wnow.getMonth(), wnow);
assert.deepEqual(wEmpty.slides.map((x) => x.id), ['intro', 'finale']);
const wFull = monthWrapped(ins, wnow.getFullYear(), wnow.getMonth() - (wnow.getDate() <= 2 ? 1 : 0), wnow);
assert.ok(wFull.slides.length >= 2);
assert.ok(wFull.grade != null && ['A', 'B', 'C', 'D', 'F'].includes(wFull.grade));

// ---------- step 2 scores ----------
// Scores and recaps judge counted days only: something was logged, and it wasn't a rough day (sick or
// away, a low mood, a period day). Days before the app was in use don't count, and neither mood nor
// protein is graded.
{
  const noPlan = () => {
    const s = defaultState();
    s.plan = { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null };
    return s;
  };
  const goalDay = (s: ReturnType<typeof defaultState>, key: string, extra: Partial<ReturnType<typeof emptyDay>> = {}) => {
    s.days[key] = { ...emptyDay(), water: [{ id: `w${key}`, ml: s.settings.waterGoalMl, at: new Date(`${key}T10:00`).getTime() }], ...extra };
  };
  const mood = (key: string, level: 1 | 2 | 3 | 4 | 5) => [{ id: `m${key}`, level, emotions: [], at: new Date(`${key}T12:00`).getTime() }];

  // usedOn: logged things count, watch/weather/phone data alone doesn't
  assert.equal(usedOn(undefined), false);
  assert.equal(usedOn({ ...emptyDay(), steps: 9000, sleepMin: 420, weather: { max: 5, min: 1, rainMm: 0, sunMin: 60, code: 3, pressureDrop: null } }), false);
  assert.equal(usedOn({ ...emptyDay(), sleepRating: 4 }), true);
  assert.equal(usedOn({ ...emptyDay(), moods: mood('2026-10-07', 3) }), true);

  // 1. October from the 7th: the first six days (watch steps only) don't drag the month down
  const oct = noPlan();
  for (let d = 1; d <= 6; d++) oct.days[`2026-10-0${d}`] = { ...emptyDay(), steps: 4000 };
  for (let d = 7; d <= 31; d++) goalDay(oct, `2026-10-${String(d).padStart(2, '0')}`);
  assert.equal(firstDataDay(oct), '2026-10-07');
  assert.equal(firstDataDay(defaultState()), null);
  const ow = monthWrapped(oct, 2026, 9, new Date(2026, 10, 1, 10));
  assert.equal(ow.slides.find((x) => x.id === 'water')?.sub, 'goal hit on 25 of 25 days');
  assert.ok(ow.slides[0].sub.includes('since 10-07'), ow.slides[0].sub);
  assert.equal(ow.score, 100);
  assert.equal(ow.grade, 'A');
  // a month entirely before the first logged day has nothing to grade
  assert.equal(monthWrapped(oct, 2026, 8, new Date(2026, 10, 1, 10)).grade, null);

  // 2. Mon–Wed sick, Thu–Sun on goal: 4/4, not 4/7, and no D (agent 7's case)
  const sick = noPlan();
  sick.pauses = [{ from: '2027-01-11', to: '2027-01-13', kind: 'sick' }];
  for (const k of ['2027-01-11', '2027-01-12', '2027-01-13']) sick.days[k] = { ...emptyDay(), moods: mood(k, 3) };
  for (const k of ['2027-01-14', '2027-01-15', '2027-01-16', '2027-01-17']) goalDay(sick, k);
  const sw = weekReport(sick, 0, new Date(2027, 0, 17, 20));
  assert.equal(sw.categories.find((c) => c.id === 'water')?.stat.startsWith('4/4 days on goal'), true, JSON.stringify(sw.categories[0]));
  assert.equal(sw.days, 4);
  assert.deepEqual(sw.rest, { paused: 3, low: 0, period: 0 });
  assert.ok(sw.grade != null && sw.grade !== 'D' && sw.grade !== 'F', String(sw.grade));
  assert.ok(sw.worst == null || !['2027-01-11', '2027-01-12', '2027-01-13'].includes(sw.worst.key));
  const jw = monthWrapped(sick, 2027, 0, new Date(2027, 0, 17, 20));
  assert.ok(jw.grade != null && jw.grade !== 'D' && jw.grade !== 'F', String(jw.grade));
  assert.equal(jw.restDays, 3);
  assert.equal(roughDay(sick, '2027-01-12'), 'paused');
  assert.equal(countedDay(sick, '2027-01-12'), false);
  assert.equal(countedDay(sick, '2027-01-14'), true);

  // 3. Mood isn't graded: moods 3 vs 5 give the same overall; moods of 1 are rest days, never an F
  const moodWeek = (level: 1 | 3 | 5) => {
    const s = noPlan();
    for (let d = 11; d <= 17; d++) goalDay(s, `2027-01-${d}`, { moods: mood(`2027-01-${d}`, level) });
    return weekReport(s, 0, new Date(2027, 0, 17, 20));
  };
  assert.equal(moodWeek(3).overall, moodWeek(5).overall);
  assert.equal(moodWeek(5).categories.find((c) => c.id === 'mood')?.score, null);
  const awful = moodWeek(1);
  assert.equal(awful.grade, null);
  assert.equal(awful.rest.low, 7);
  // a period day is a rest day too
  const per = noPlan();
  goalDay(per, '2027-01-14', { period: { flow: 'medium', symptoms: [] } });
  assert.equal(roughDay(per, '2027-01-14'), 'period');

  // protein: shown, never graded, and a big or small plate doesn't move the day score
  const fedA = noPlan();
  const fedB = noPlan();
  goalDay(fedA, '2027-01-14', { food: [{ id: 'f1', name: 'x', kcal: 600, protein: 5, at: 0 }] });
  goalDay(fedB, '2027-01-14', { food: [{ id: 'f1', name: 'x', kcal: 600, protein: 200, at: 0 }] });
  assert.equal(dayScoreFor(fedA, new Date(2027, 0, 14, 20)), dayScoreFor(fedB, new Date(2027, 0, 14, 20)));
  assert.equal(weekReport(fedB, 0, new Date(2027, 0, 17, 20)).categories.find((c) => c.id === 'protein')?.score, null);
  // the scale is unchanged at the ends: an empty rest day 50, an empty planned-gym day 25, a full day 100
  const emptyRest = noPlan();
  emptyRest.days['2027-01-14'] = emptyDay();
  assert.equal(dayScoreFor(emptyRest, new Date(2027, 0, 14, 20)), 50);
  const gymDay = defaultState(); // Tue 12 Jan has Pull planned
  assert.equal(dayScoreFor(gymDay, new Date(2027, 0, 12, 20)), 25);
  assert.equal(dayScoreFor(fedB, new Date(2027, 0, 14, 20)), 100);

  // 4. Tasks: no grade in a week without tasks; quests against what each day offered
  const tq = noPlan();
  goalDay(tq, '2027-01-14', { energy: 2 }); // low battery: one quest offered
  tq.days['2027-01-14'].questsDone = [questsFor(tq, new Date(2027, 0, 14, 12))[0].id];
  const tw = weekReport(tq, 0, new Date(2027, 0, 17, 20));
  assert.equal(tw.categories.find((c) => c.id === 'tasks')?.score, null);
  assert.equal(tw.categories.find((c) => c.id === 'quests')?.stat, '1/1 daily quests');
  assert.equal(tw.categories.find((c) => c.id === 'quests')?.score, 100);
  tq.tasks = [{ id: 't1', title: 'x', done: true, createdAt: new Date(2027, 0, 12).getTime(), doneAt: new Date(2027, 0, 14, 9).getTime() }];
  assert.equal(weekReport(tq, 0, new Date(2027, 0, 17, 20)).categories.find((c) => c.id === 'tasks')?.score, 100); // 1 of the 1 there was

  // 5. Respect: five awful days don't make S.P.I.D.E.R. "Disappointed"
  const rp = defaultState();
  for (let i = 1; i <= 5; i++) {
    const k = dayKey(atTime(new Date(), -i, 12));
    rp.days[k] = { ...emptyDay(), moods: mood(k, 1) };
  }
  assert.equal(respectFor(rp), null);
  for (let i = 1; i <= 5; i++) rp.days[dayKey(atTime(new Date(), -i, 12))].moods = mood('x', 3);
  assert.ok(respectFor(rp) != null);

  // 6. Gentle recaps when the tone is down: a low mood today turns the jokes off
  const tone = noPlan();
  for (let d = 7; d <= 20; d++) goalDay(tone, `2026-10-${d}`, { moods: mood(`2026-10-${d}`, 4) });
  const now = new Date(2026, 9, 21, 20);
  assert.equal(monthWrapped(tone, 2026, 9, now).slides[0].quip, "Let's see what you did. And what you didn't.");
  tone.days['2026-10-21'] = { ...emptyDay(), moods: mood('2026-10-21', 1) };
  const gentle = monthWrapped(tone, 2026, 9, now);
  assert.equal(gentle.slides[0].quip, "Here's your month.");
  assert.ok(!gentle.slides.some((x) => /kidneys|espresso|missing person|part-time|draft/.test(x.quip)), JSON.stringify(gentle.slides.map((x) => x.quip)));
  // the phone line teases the habit, not the person
  assert.ok(!JSON.stringify(monthWrapped(tone, 2026, 9, now)).includes('than your friends'));
  // insights keep the finding and drop the joke on a low day
  const insKind = structuredClone(ins);
  insKind.days[dayKey()] = { ...emptyDay(), moods: mood(dayKey(), 1) };
  const trainKind = insights(insKind).find((x) => x.id === 'train_mood');
  assert.equal(trainKind?.text, 'Your mood is better on days you train.');
  assert.ok(insights(ins).find((x) => x.id === 'train_mood')?.text.includes('Science agrees'));

  // 7. Hall of Shame: the worst day is never a sick or low-mood day, and themes come from the screen
  const hs = noPlan();
  const ago = (n: number) => dayKey(atTime(new Date(), -n, 12));
  goalDay(hs, ago(1)); // 100
  hs.days[ago(2)] = { ...emptyDay(), moods: mood(ago(2), 1), coffee: [1, 2, 3, 4, 5, 6].map((i) => ({ id: `c${i}`, mg: 90, at: 0 })) }; // awful day, 6 cups
  hs.days[ago(3)] = { ...emptyDay(), coffee: [{ id: 'cc', mg: 90, at: 0 }] }; // sick day below
  hs.pauses = [{ from: ago(3), to: ago(3), kind: 'sick' }];
  hs.days[ago(4)] = { ...emptyDay(), water: [{ id: 'half', ml: hs.settings.waterGoalMl / 2, at: 0 }], coffee: [1, 2, 3].map((i) => ({ id: `d${i}`, mg: 90, at: 0 })) }; // an ordinary half day
  const { fame, shame } = hallOfFame(hs);
  assert.equal(shame.find((r) => r.label === 'Worst day')?.detail, ago(4).slice(5));
  assert.equal(shame.find((r) => r.label === 'Most coffees in a day')?.value, '3 cups'); // the awful day's 6 don't count
  assert.ok(!fame.some((r) => r.label === 'Themes unlocked'));
  assert.equal(hallOfFame(hs, { unlocked: 9, total: 9 }).fame.find((r) => r.label === 'Themes unlocked')?.value, '9/9');
}

// ---------- step 2b progress ----------
// The ghost of last week (an hourly XP timeline), weekly medals (counts per week, never a run of days),
// and the weekly nemesis in the league.
{
  const d0 = (xp: number, hours?: Record<number, number>): DayLog => ({ ...emptyDay(), xpEarned: xp, ...(hours ? { xpHours: hours } : {}) });
  // timeline: noted per hour, unchanged state when nothing moved
  const tl = defaultState();
  const wed = new Date(2027, 0, 13, 9, 30); // Wed 13 Jan 2027
  assert.equal(withXpHour(tl, wed), tl); // no day yet
  tl.days['2027-01-13'] = d0(0);
  assert.equal(withXpHour(tl, wed), tl); // nothing earned, nothing noted
  tl.days['2027-01-13'] = d0(40);
  const noted = withXpHour(tl, wed);
  assert.deepEqual(noted.days['2027-01-13'].xpHours, { 9: 40 });
  assert.equal(withXpHour(noted, wed), noted);
  assert.equal(xpByHour(d0(0, { 9: 40, 13: 90 }), 8), 0);
  assert.equal(xpByHour(d0(0, { 9: 40, 13: 90 }), 12), 40);
  assert.equal(xpByHour(d0(0, { 9: 40, 13: 90 }), 20), 90);
  assert.equal(xpByHour(d0(90), 20), null); // no timeline
  const old = { ...defaultState(), days: { '2026-12-20': d0(5, { 8: 5 }), '2027-01-12': d0(5, { 8: 5 }) } };
  const pruned = withoutOldXpHours(old, '2027-01-13');
  assert.equal(pruned.days['2026-12-20'].xpHours, undefined);
  assert.deepEqual(pruned.days['2027-01-12'].xpHours, { 8: 5 });
  assert.equal(withoutOldXpHours(pruned, '2027-01-13'), pruned);

  // ghost: this week so far against last week up to the same weekday (and hour, once recorded)
  const gh = defaultState();
  Object.assign(gh.days, { '2027-01-04': d0(100), '2027-01-05': d0(50), '2027-01-06': d0(80), '2027-01-08': d0(300) }); // last week
  Object.assign(gh.days, { '2027-01-11': d0(60), '2027-01-12': d0(70), '2027-01-13': d0(20) }); // this week
  const at = new Date(2027, 0, 13, 15, 0);
  const whole = ghostOf(gh, at)!;
  assert.deepEqual(whole, { then: 230, now: 150, exact: false, weekday: 'Wednesday' }); // last Wednesday's whole day stands in
  assert.ok(ghostText(whole).includes('last week by the end of Wednesday: 230 XP · now: 150'));
  gh.days['2027-01-06'] = d0(80, { 9: 10, 14: 30, 20: 80 });
  const exact = ghostOf(gh, at)!;
  assert.deepEqual(exact, { then: 180, now: 150, exact: true, weekday: 'Wednesday' }); // 100 + 50 + 30 by 15:00
  assert.ok(ghostText(exact).includes('last Wednesday at this time: 180 XP'));
  const fresh = defaultState();
  fresh.days['2027-01-13'] = d0(20);
  assert.equal(ghostOf(fresh, at), null); // no last week to race

  // medals: the bar scales with the week's non-rough days, never below 1 / 2 / 3 (or the full bar, if lower)
  assert.deepEqual(needFor([3, 5, 7], 7), { bronze: 3, silver: 5, gold: 7 });
  assert.deepEqual(needFor([3, 5, 7], 5), { bronze: 3, silver: 4, gold: 5 });
  assert.deepEqual(needFor([1, 2, 3], 1), { bronze: 1, silver: 2, gold: 3 }, 'a rough week never hands out gold for one day');
  assert.deepEqual(needFor([2, 3, 4], 1), { bronze: 1, silver: 2, gold: 3 });
  assert.deepEqual(needFor([1, 1, 2], 1), { bronze: 1, silver: 1, gold: 2 }, 'never above the full bar');
  const md = defaultState();
  md.onboarded = true;
  md.settings.gamingBudgetMin = 60;
  const week = '2027-01-11';
  const mk = (i: number) => dayKey(addDays(new Date(`${week}T12:00`), i));
  for (let i = 0; i < 7; i++) md.days[mk(i)] = { ...emptyDay(), water: i < 5 ? [{ id: `w${i}`, ml: 6000, at: 0 }] : [] };
  for (let i = 0; i < 4; i++) md.days[mk(i)].activities = [{ id: `a${i}`, kind: 'cardio', minutes: 30, at: 0 }];
  md.days[mk(6)].games = [{ start: 0, end: 3 * 3_600_000 }]; // Sunday: 3 h, over budget
  const end = new Date(2027, 0, 17, 23, 59);
  const by = (id: string) => medalsFor(md, week, end).find((m) => m.def.id === id)!;
  assert.equal(by('water').count, 5);
  assert.equal(by('water').tier, 'silver');
  assert.equal(by('water').next, 'gold');
  assert.equal(by('train').tier, 'gold');
  assert.equal(by('gaming').count, 5); // six used days (Saturday is empty), Sunday over budget
  assert.equal(by('gaming').tier, 'silver');
  assert.equal(by('focus').tier, null);
  assert.ok(!medalsFor(md, week, end).some((m) => m.def.id === 'steps' || m.def.id === 'habits')); // no watch, no habits: no medal to chase
  // HQ's This week line: what's won, then the closest next tier
  assert.equal(medalLine(medalsFor(md, week, end)), '🏋️🥇 💧🥈 🎮🥈 · next 🥉 Web Focus: 1 session to go');
  assert.equal(medalLine(medalsFor(defaultState(), week, end)), 'none yet · closest 🥉 Web Focus: 1 session to go');
  const allGold = medalsFor(md, week, end).map((m) => ({ ...m, tier: 'gold' as const, next: null }));
  assert.equal(medalLine(allGold), `${allGold.map((m) => `${m.def.emoji}🥇`).join(' ')} · all at gold`);
  md.days[mk(0)].steps = 9000;
  assert.ok(medalsFor(md, week, end).some((m) => m.def.id === 'steps'));
  // two sick days lower the bar: the same 5 water days are gold
  const sick = { ...md, pauses: [{ from: mk(5), to: mk(6), kind: 'sick' as const }] };
  assert.equal(openDays(sick, week), 5);
  assert.equal(medalsFor(sick, week, end).find((m) => m.def.id === 'water')!.tier, 'gold');
  assert.deepEqual(medalsFor({ ...md, pauses: [{ from: mk(0), to: mk(6), kind: 'away' as const }] }, week, end), []); // a week away: nothing to win, nothing missed
  // a week of low moods and one workout: bronze, not gold, and mood-only days aren't "within the gaming budget"
  const meh = { ...md, days: { ...md.days } };
  for (let i = 0; i < 7; i++) meh.days[mk(i)] = { ...emptyDay(), moods: i < 6 ? [{ id: `m${i}`, level: 2 as const, emotions: [], at: new Date(`${mk(i)}T09:00`).getTime() }] : [], xpEarned: 2 };
  meh.days[mk(6)] = { ...meh.days[mk(6)], activities: [{ id: 'x', kind: 'cardio', minutes: 30, at: new Date(`${mk(6)}T10:00`).getTime() }] };
  const mehBy = (id: string) => medalsFor(meh, week, end).find((m) => m.def.id === id)!;
  assert.equal(openDays(meh, week), 1);
  assert.equal(mehBy('train').tier, 'bronze');
  assert.equal(mehBy('gaming').count, 1, 'only the day with something besides a check-in');
  assert.equal(mehBy('gaming').tier, 'bronze');
  // settling: the first rollover only marks where medals start; the next week's pays last week once
  const first = settleMedals(md, new Date(2027, 0, 13, 8));
  assert.deepEqual(first.awards, []);
  assert.equal(first.state.medalsSince, '2027-01-11');
  const monday = new Date(2027, 0, 18, 8);
  const paid = settleMedals(first.state, monday);
  assert.deepEqual(paid.awards.map((a) => a.week), [week]);
  assert.deepEqual(paid.state.medals?.[week], { train: 'gold', water: 'silver', gaming: 'silver' }); // one step-goal day isn't a medal yet
  assert.equal(paid.awards[0].xp, 30 + 20 + 20);
  assert.ok(medalList(paid.awards[0].won).includes('🥇 Training'));
  assert.deepEqual(settleMedals(paid.state, new Date(2027, 0, 18, 20)).awards, []); // once per week
  assert.deepEqual(settleMedals({ ...md, medalsSince: '2027-01-18' }, monday).awards, []); // weeks before medals arrived aren't paid
  // a whole week without opening the app: the next rollover settles both weeks, oldest first, each once
  const late = settleMedals(first.state, new Date(2027, 0, 26, 8));
  assert.deepEqual(late.awards.map((a) => a.week), [week, '2027-01-18']);
  assert.equal(late.awards[0].xp, 70);
  assert.deepEqual(late.state.medals?.['2027-01-18'], {}, 'an empty week is settled too, with nothing won');
  assert.deepEqual(settleMedals(late.state, new Date(2027, 0, 27, 8)).awards, []);
  assert.deepEqual(medalTotals(paid.state), { bronze: 0, silver: 2, gold: 1, weeks: 1 });
  assert.ok(MEDALS.every((m) => m.base[0] <= m.base[1] && m.base[1] <= m.base[2]));

  // nemesis: the rival set to finish just above last week's XP; beating them pays, losing costs nothing
  const nm = defaultState();
  assert.equal(nemesisOf(nm), null);
  nm.league = newLeague(1, week);
  const sunEnd = new Date(2027, 0, 17, 23, 59);
  const finals = nm.league.rivals.map((r) => rivalXp(r, 1, week, sunEnd)).sort((a, b) => a - b);
  assert.equal(rivalXp(nemesisOf(nm)!, 1, week, sunEnd), finals[Math.floor(finals.length / 2)]); // no last week: the middle
  nm.league.history = [{ week: '2027-01-04', tier: 1, rank: 4, xp: finals[2] }];
  const target = nemesisOf(nm)!;
  assert.equal(rivalXp(target, 1, week, sunEnd), finals[3]); // just above what you earned
  assert.equal(nemesisOf(nm)!.id, target.id); // the same all week
  nm.league.history = [{ week: '2027-01-04', tier: 1, rank: 1, xp: 99_999 }];
  assert.equal(rivalXp(nemesisOf(nm)!, 1, week, sunEnd), finals.at(-1)); // beat them all last week: the strongest
  for (let i = 0; i < 7; i++) nm.days[mk(i)] = { ...emptyDay(), xpEarned: 5000 };
  const st = settle(nm);
  assert.ok(st.nemesis?.beaten);
  assert.equal(st.nemesisPrize, NEMESIS_PRIZE);
  for (let i = 0; i < 7; i++) nm.days[mk(i)] = emptyDay();
  assert.equal(settle(nm).nemesisPrize, 0);
  assert.equal(settle(nm).nemesis?.beaten, false);
}

// co-op weeks: every other week a league bot is your partner; your half decides it; coins, never XP
{
  assert.ok(isCoopWeek('2026-10-26') && isCoopWeek('2026-11-09'));
  assert.ok(!isCoopWeek('2026-11-02') && !isCoopWeek('2026-10-19'), 'every other week, none before the first');
  assert.equal(coopTarget(5, 7), 5);
  assert.equal(coopTarget(5, 3), 3, 'rough days lower the bar');
  assert.equal(coopTarget(1, 1), 1);
  assert.equal(coopTarget(5, 0), null, 'a week of rough days calls it off');
  assert.equal(coopTarget(6, 7, true), 6, 'a day goal leaves a day free');
  assert.equal(coopTarget(6, 6, true), 5, '...of the open days, too');
  assert.equal(coopTarget(5, 3, true), 2);
  assert.equal(coopTarget(5, 1, true), 1);
  assert.equal(coopTarget(30, 6), 26, 'tasks are no day goal');
  const cw = '2026-10-26';
  const ck = (week: string, i: number) => dayKey(addDays(new Date(`${week}T12:00`), i));
  const co = defaultState();
  co.onboarded = true;
  assert.equal(baseFor(co, 'water', cw), GOALS.water.start, 'no last week: the default bar');
  for (let i = 0; i < 7; i++) co.days[ck('2026-10-19', i)] = { ...emptyDay(), waterGoalHit: i < 3 };
  assert.equal(baseFor(co, 'water', cw), 4, 'a little above last week (3 days)');
  for (let i = 0; i < 7; i++) co.days[ck('2026-10-19', i)].waterGoalHit = i < 6;
  assert.equal(baseFor(co, 'water', cw), 6, 'capped below the whole week');
  for (let i = 0; i < 7; i++) co.days[ck('2026-10-19', i)].waterGoalHit = i < 2;
  co.pauses = [{ from: ck('2026-10-19', 4), to: ck('2026-10-19', 6), kind: 'sick' }];
  assert.equal(baseFor(co, 'water', cw), 5, "last week's rough days don't lower this week's bar (2 in 4 open days)");
  // a sick week: work done on sick days doesn't count towards the pace, and a day or two of open days sets no bar
  for (let i = 0; i < 7; i++) co.days[ck('2026-10-19', i)].waterGoalHit = i < 4;
  co.pauses = [{ from: ck('2026-10-19', 1), to: ck('2026-10-19', 6), kind: 'sick' }];
  assert.equal(baseFor(co, 'water', cw), GOALS.water.start, 'one open day: the default bar, not every day');
  co.days[ck('2026-10-19', 2)] = { ...co.days[ck('2026-10-19', 2)], doneTasks: Array.from({ length: 8 }, (_, i) => ({ id: `t${i}`, at: 0 })) };
  assert.equal(baseFor(co, 'tasks', cw), GOALS.tasks.start, 'tasks done while sick set no bar');
  co.pauses = [{ from: ck('2026-10-19', 3), to: ck('2026-10-19', 6), kind: 'sick' }];
  assert.equal(baseFor(co, 'water', cw), 6, '3 of 3 open days: high, but never all 7');
  for (const goal of Object.keys(GOALS) as (keyof typeof GOALS)[]) assert.ok(!GOALS[goal].days || GOALS[goal].cap < 7, goal);
  co.pauses = [];
  for (let i = 0; i < 7; i++) co.days[ck('2026-10-19', i)] = { ...emptyDay(), waterGoalHit: i < 2 };
  // the partner: from your league, never the nemesis, the same all week; no step goal without a watch
  co.league = newLeague(1, cw);
  const mon = new Date(2026, 9, 26, 9);
  const c1 = coopFor(co, mon)!;
  assert.ok(c1 && co.league.rivals.some((r) => r.name === c1.partner.name));
  assert.notEqual(c1.partner.name, co.league.rivals.find((r) => r.id === nemesisOf(co)?.id)?.name);
  assert.equal(c1.goal, goalOf(c1.partner.name));
  assert.notEqual(c1.goal, 'steps');
  assert.deepEqual(coopFor(co, new Date(2026, 10, 1, 20)), c1, 'the same all week');
  assert.equal(coopFor({ ...co, league: newLeague(1, '2026-11-02') }, new Date(2026, 10, 3, 9)), null, 'not a co-op week');
  // progress: the partner gets there by Saturday night; the team counts the slower of you two
  assert.equal(partnerCount(5, cw, new Date(2026, 9, 26, 0, 0)), 0);
  assert.equal(partnerCount(5, cw, new Date(2026, 10, 1, 0, 0)), 5);
  co.coop = { week: cw, partner: { name: 'Hydro Hanna', emoji: '💧' }, goal: 'water', base: 3 };
  co.days[ck(cw, 0)] = { ...emptyDay(), waterGoalHit: true };
  const st = coopStatus(co, new Date(2026, 9, 28, 12))!;
  assert.equal(st.target, 3);
  assert.equal(st.mine, 1);
  assert.equal(st.team, Math.min(st.mine, st.theirs));
  assert.ok(coopSummary(co, new Date(2026, 9, 28, 12))!.includes('1/3 water-goal days'));
  // settling: only after Sunday, once; a win pays coins and the first win a bracelet, never XP
  assert.equal(settleCoop(co, new Date(2026, 10, 1, 22)).result, null, 'not before the week is over');
  co.days[ck(cw, 2)] = { ...emptyDay(), waterGoalHit: true };
  co.days[ck(cw, 5)] = { ...emptyDay(), waterGoalHit: true };
  const won = settleCoop(co, new Date(2026, 10, 2, 8));
  assert.deepEqual(won.result, { count: 3, target: 3, won: true, coins: COOP_COINS });
  assert.equal(won.state.coins, co.coins + COOP_COINS);
  assert.equal(won.state.xp, co.xp, 'never XP');
  assert.deepEqual(won.state.coopRecord, { played: 1, won: 1 });
  assert.deepEqual(won.items, ['coop_bracelet']);
  assert.ok(won.state.cosmetics?.owned.includes('coop_bracelet'));
  assert.equal(settleCoop(won.state, new Date(2026, 10, 3, 8)).result, null, 'settled once');
  assert.equal(coopStatus(won.state, new Date(2026, 10, 2, 8)), null);
  assert.ok(coopResultText(won.state, won.state.coop!, won.result!).includes(`+${COOP_COINS} 🪙`));
  // a miss costs nothing; a week of rough days is called off and not counted
  const short = { ...co, days: { ...co.days, [ck(cw, 5)]: emptyDay() } };
  const missed = settleCoop(short, new Date(2026, 10, 9, 8));
  assert.equal(missed.result?.won, false);
  assert.equal(missed.state.coins, short.coins);
  assert.deepEqual(missed.state.coopRecord, { played: 1, won: 0 });
  const off = settleCoop({ ...co, pauses: [{ from: cw, to: ck(cw, 6), kind: 'sick' }] }, new Date(2026, 10, 2, 8));
  assert.equal(off.result?.target, 0);
  assert.equal(off.state.coopRecord, undefined, 'a called-off week is not played');
  assert.ok(coopResultText(off.state, off.state.coop!, off.result!).includes('Nothing lost'));
  // the lines: only the placeholders they're given, and nothing about bodies
  for (const l of allCoopLines()) {
    for (const m of l.matchAll(/\{(\w+)\}/g)) assert.ok(['name', 'target', 'theirs'].includes(m[1]), l);
    assert.ok(!/\b(fat|weight|body|belly|thighs?)\b/i.test(l), l);
  }
}

// virtual trek: watch steps walk a real route; totals only; waypoints pay coins and cosmetics, never XP
{
  for (const r of Object.values(ROUTES)) {
    assert.equal(r.waypoints[0].km, 0, r.id);
    assert.ok(r.waypoints.every((w, i) => i === 0 || w.km > r.waypoints[i - 1].km), `${r.id}: waypoints in order`);
    assert.ok(r.items.every((x) => x.at > 0 && x.at < r.waypoints.length && cosmeticOf(x.id)?.source === 'reward'), r.id);
    assert.equal(new Set(r.waypoints.map((w) => w.name)).size, r.waypoints.length, r.id);
  }
  assert.equal(lengthOf(ROUTES.tunnelbana), 68);
  assert.equal(lengthOf(ROUTES.sormland), 1000);
  const tk = defaultState();
  tk.onboarded = true;
  tk.league = newLeague(0, '2026-10-26');
  tk.days['2026-10-25'] = { ...emptyDay(), steps: 50_000 }; // before the start: not counted
  tk.days['2026-10-26'] = { ...emptyDay(), steps: 8000 };
  tk.days['2026-10-28'] = { ...emptyDay(), steps: 6000 }; // the 27th had no steps: the spider just stood still
  tk.trek = newTrek('tunnelbana', '2026-10-26');
  const at = new Date(2026, 9, 28, 20);
  assert.equal(trekKm(tk, tk.trek, at), 10.5); // 14 000 steps × 0.75 m
  assert.equal(trekKm(tk, { ...tk.trek, stepM: 0.7 }, at), 9.8);
  const step = checkTrek(tk, at);
  assert.deepEqual(step.passed.map((w) => w.name), ['Vällingby', 'Alvik']);
  assert.equal(step.coins, 2 * ROUTES.tunnelbana.coins);
  assert.equal(step.state.trek?.reached, 2);
  assert.equal(step.state.xp, tk.xp, 'never XP');
  assert.equal(checkTrek(step.state, at).passed.length, 0, 'each waypoint once');
  const swap = { ...tk, trek: newTrek('tunnelbana', '2026-10-28', 0.75, 6000) };
  assert.equal(trekKm(swap, swap.trek, at), 0, "a new trek starts at 0 km: the day's earlier steps don't count again");
  assert.equal(checkTrek(swap, at).passed.length, 0, 'so switching routes replays nothing');
  // the finish: the last waypoint, its cosmetic and the finish coins, once
  const far = { ...step.state, days: { ...step.state.days, '2026-10-29': { ...emptyDay(), steps: 200_000 } } };
  const fin = checkTrek(far, new Date(2026, 9, 29, 20));
  assert.ok(fin.finished);
  assert.deepEqual(fin.items, ['trek_ticket']);
  assert.equal(fin.coins, (ROUTES.tunnelbana.waypoints.length - 3) * ROUTES.tunnelbana.coins + ROUTES.tunnelbana.finishCoins);
  assert.deepEqual(fin.state.treksDone, ['tunnelbana']);
  assert.equal(trekKm(fin.state, fin.state.trek!, new Date(2026, 9, 29, 20)), 68, 'never past the end');
  assert.equal(checkTrek(fin.state, new Date(2026, 9, 30, 20)).finished, false);
  assert.ok(trekStatus(fin.state, new Date(2026, 9, 29, 20))!.done);
  // walked again: the cosmetic already in the wardrobe pays coins instead of being handed out twice
  const again = { ...fin.state, trek: newTrek('tunnelbana', '2026-10-30') };
  again.days = { ...again.days, '2026-10-30': { ...emptyDay(), steps: 200_000 } };
  const fin2 = checkTrek(again, new Date(2026, 9, 30, 20));
  assert.deepEqual(fin2.items, []);
  assert.equal(fin2.coins, (ROUTES.tunnelbana.waypoints.length - 1) * ROUTES.tunnelbana.coins + ROUTES.tunnelbana.finishCoins + OWNED_ITEM_COINS);
  // postcards with a jab have a gentle side for quiet days
  for (const r of Object.values(ROUTES)) for (const w of r.waypoints) assert.ok(!/faster than you|judging you/.test(w.gentle ?? ''), w.name);
  assert.ok(ROUTES.tunnelbana.waypoints.find((w) => w.name === 'Alvik')?.gentle);
  // the bots walk the same route at their own pace, the same numbers every time
  const bot = tk.league.rivals[0];
  const b1 = botKm(bot, tk.trek, at);
  assert.equal(botKm(bot, tk.trek, at), b1);
  assert.ok(botKm(bot, tk.trek, new Date(2026, 9, 30, 20)) > b1);
  assert.ok(b1 > 0 && b1 < 3 * BOT_KM_A_DAY * 2);
  assert.equal(trekTable(tk, tk.trek, at).length, 10);
  assert.ok(trekSummary(step.state, at)!.startsWith('🚇 Tunnelbanan: 10.5 km · T-Centralen in 3.5 km'), trekSummary(step.state, at)!);
  assert.equal(trekSummary(defaultState()), null);
}

// economy: one coin per XP
assert.equal(coinsFor(10), 10);
assert.equal(coinsFor(3), 3);
assert.equal(coinsFor(-10), 0);
const kinds = new Set(Array.from({ length: 400 }, () => rollChest().kind));
for (const k of ['coins', 'gaming', 'double_xp', 'boss_bomb', 'legendary']) assert.ok(kinds.has(k as never), k);
assert.equal(rollChest(0.99).kind, 'legendary');

// league: 9 unique rivals, deterministic, rival XP grows over the week
const lg = defaultState();
lg.onboarded = true;
const wk = weekKeyOf();
lg.league = newLeague(0, wk);
assert.equal(lg.league.rivals.length, 9);
assert.equal(new Set(lg.league.rivals.map((r) => r.name)).size, 9);
assert.deepEqual(newLeague(0, wk).rivals.map((r) => r.name), lg.league.rivals.map((r) => r.name));
const riv0 = lg.league.rivals[0];
const sunday = atTime(new Date(`${wk}T12:00`), 6, 23, 59);
const monday = atTime(new Date(`${wk}T12:00`), 0, 8, 0);
assert.ok(rivalXp(riv0, 0, wk, sunday) > rivalXp(riv0, 0, wk, monday));
assert.equal(standings(lg).length, 10);
// a monster week -> promoted with a prize; a dead week -> stays in Bronze (can't drop lower)
const lastWeek = weekKeyOf(atTime(new Date(), -7, 12));
const big = defaultState();
big.league = newLeague(0, lastWeek);
for (let i = 0; i < 7; i++) big.days[dayKey(atTime(new Date(`${lastWeek}T12:00`), i, 12))] = { water: [], food: [], sets: [], games: [], bonusGameMin: 0, xpEarned: 2000 };
const won = settle(big);
assert.equal(won.rank, 1);
assert.equal(won.tier, 1);
assert.equal(won.prize, 300);
const dead = defaultState();
dead.league = newLeague(0, lastWeek);
assert.equal(settle(dead).tier, 0);
const deadGold = defaultState();
deadGold.league = newLeague(2, lastWeek);
assert.equal(settle(deadGold).tier, 1);
assert.equal(TIERS.length, 5);

// low-battery mode: one quest, gentler roasts
const lb = defaultState();
lb.onboarded = true;
lb.days[dayKey()] = { water: [], food: [], sets: [], games: [], bonusGameMin: 0, energy: 1 };
assert.equal(questsFor(lb).length, 1);
assert.equal(effectiveSavage(lb), 5);

// tracker insight: headache higher after short sleep
const tr = defaultState();
tr.trackers = [{ id: 'hd', name: 'Headache', emoji: 'x', kind: 'scale', createdAt: 0 }];
for (let i = 1; i <= 16; i++) {
  const short = i % 2 === 0;
  tr.days[dayKey(atTime(new Date(), -i, 12))] = { water: [], food: [], sets: [], games: [], bonusGameMin: 0, sleepMin: short ? 330 : 470, tracks: { hd: short ? 4 : 1 } };
}
assert.ok(insights(tr).some((x) => x.id === 'trk_short_hd'), JSON.stringify(insights(tr).map((x) => x.id)));

// screen time: social apps over 120 min/day heal the boss; phone games count toward the budget (toggleable)
const sc = defaultState();
sc.days[dayKey()] = { water: [], food: [], sets: [], games: [], bonusGameMin: 0, screen: { totalMin: 300, doomMin: 150, gamesMin: 40, top: [] } };
const base = bossFor(defaultState());
const healedBoss = bossFor(sc);
assert.equal(healedBoss.healed, 30);
assert.equal(healedBoss.maxHp, base.maxHp + 30);
sc.days[dayKey()].screen!.doomMin = 120;
assert.equal(bossFor(sc).healed, 0);
assert.equal(Math.round(gamingUsedMs(sc) / 60_000), 40);
sc.settings.phoneGamesCount = false;
assert.equal(gamingUsedMs(sc), 0);

// secret achievements: at least the original 22, unique, none unlocked on a fresh state, some trigger correctly
assert.ok(SECRET_ACHIEVEMENTS.length >= 22);
assert.equal(new Set(SECRET_ACHIEVEMENTS.map((a) => a.id)).size, SECRET_ACHIEVEMENTS.length);
assert.equal(SECRET_ACHIEVEMENTS.filter((a) => a.test(defaultState())).length, 0);
const sec = defaultState();
const at3 = atTime(new Date(), -1, 3).getTime();
sec.days[dayKey(at3)] = {
  water: [{ id: 'w', ml: 250, at: at3 }], food: [], sets: [], bonusGameMin: 0,
  coffee: Array.from({ length: 6 }, (_, i) => ({ id: 'c' + i, mg: 90, at: at3 + i })),
  games: [{ start: at3, end: at3 + 60_000 }],
};
const unlocked = SECRET_ACHIEVEMENTS.filter((a) => a.test(sec)).map((a) => a.id);
for (const id of ['s_night_owl', 's_coffee_gremlin', 's_rage_quit']) assert.ok(unlocked.includes(id), id + ' ' + unlocked);
assert.ok(!unlocked.includes('s_old_friend'));

// body log helpers
const bl = defaultState();
const blNow = Date.now();
bl.bodyLog = [
  { id: 'a', at: blNow - 40 * 86_400_000, weight: 80, waist: 90 },
  { id: 'b', at: blNow - 20 * 86_400_000, weight: 79 },
  { id: 'c', at: blNow - 2 * 86_400_000, weight: 78.4 },
  { id: 'd', at: blNow - 1 * 86_400_000, weight: 78.6 },
];
assert.equal(series(bl, 'weight').length, 4);
assert.equal(series(bl, 'waist').length, 1);
assert.equal(changeOver(bl, 'weight', null), -1.4);
assert.equal(changeOver(bl, 'weight', 30), -1.4);
assert.equal(changeOver(bl, 'waist', null), null);
assert.equal(Math.round((recentAverage(bl, 'weight') ?? 0) * 10) / 10, 78.5);
assert.equal(rolling(series(bl, 'weight'), 2)[3].v, 78.5);

// outside: pollen levels, AQI bands, VMA area matching
assert.equal(pollenLevel('birch', 0), 0);
assert.equal(pollenLevel('birch', 3), 1);
assert.equal(pollenLevel('birch', 10), 2);
assert.equal(pollenLevel('birch', 100), 3);
assert.equal(pollenLevel('grass', 50), 3);
assert.equal(pollenLevel('ragweed', 5), 2);
assert.equal(aqiBand(0).label, 'good');
assert.equal(aqiBand(39).label, 'fair');
assert.equal(aqiBand(60).label, 'poor');
assert.equal(aqiBand(140).label, 'extremely poor');
const LAN = 'Stockholms län';
assert.ok(isMine({ type: 'County', description: 'Stockholms län' }, LAN, 'Stockholm'));
assert.ok(isMine({ type: 'Municipality', description: 'Stockholms kommun' }, LAN, 'Stockholm'));
assert.ok(isMine({ type: 'Country', description: 'Sverige' }, LAN, 'Stockholm'));
assert.ok(!isMine({ type: 'Municipality', description: 'Malmö kommun' }, LAN, 'Stockholm'));
assert.ok(!isMine({ type: 'County', description: 'Skåne län' }, LAN, 'Stockholm'));
assert.ok(isMine({ type: 'Municipality', description: 'Malmö kommun' }, 'Skåne län', 'Malmö'));
assert.ok(!isMine({ type: 'Municipality', description: 'Solna kommun' }, LAN, undefined));

// SMHI/VMA: seen per level (an escalation pings again, old bare ids count as seen), when-text, source status
{
  const NOW = new Date(2026, 9, 23, 12).getTime();
  const DAY = 86_400_000;
  const al = (id: string, level: AlertLevel, extra: Partial<Alert> = {}): Alert => ({ id, source: 'SMHI', level, title: id, text: '', url: '', ...extra });
  let r = triageAlerts([al('smhi-1-1', 'YELLOW'), al('smhi-2-2', 'MESSAGE')], {}, NOW);
  assert.deepEqual(r.fresh.map((a) => a.id), ['smhi-1-1']); // messages never ping
  assert.deepEqual(r.seen, { 'smhi-1-1:YELLOW': NOW });
  assert.ok(r.changed);
  r = triageAlerts([al('smhi-1-1', 'YELLOW')], r.seen, NOW + 60_000);
  assert.equal(r.fresh.length, 0);
  assert.equal(r.changed, false); // nothing to save
  r = triageAlerts([al('smhi-1-1', 'ORANGE')], r.seen, NOW + 120_000);
  assert.deepEqual(r.fresh.map((a) => a.level), ['ORANGE']); // yellow to orange pings again
  const legacy = triageAlerts([al('smhi-3-3', 'YELLOW'), al('vma-x', 'VMA', { source: 'VMA' })], { 'smhi-3-3': NOW - DAY, 'vma-x': NOW - 1000 }, NOW);
  assert.equal(legacy.fresh.length, 0); // notified before the update: not again
  assert.deepEqual(legacy.seen, { 'smhi-3-3:YELLOW': NOW - DAY, 'vma-x:VMA': NOW - 1000 });
  assert.ok(legacy.changed);
  assert.equal(triageAlerts([al('smhi-3-3', 'ORANGE')], legacy.seen, NOW).fresh.length, 1); // and escalations work after
  const pruned = triageAlerts([al('smhi-8-8', 'RED')], { 'smhi-9-9:YELLOW': NOW - 31 * DAY, 'smhi-8-8:RED': NOW - 25 * DAY }, NOW);
  assert.deepEqual(pruned.seen, { 'smhi-8-8:RED': NOW }); // ended one goes after 30 days, a still-active one is kept alive
  assert.equal(pruned.fresh.length, 0);
  // two at once both ping (each has its own notification id)
  assert.equal(triageAlerts([al('vma-a', 'VMA', { source: 'VMA' }), al('smhi-5-5', 'YELLOW')], {}, NOW).fresh.length, 2);

  const iso = (...a: [number, number, number, number]) => new Date(...a).toISOString();
  assert.equal(alertWhen({ start: iso(2026, 9, 25, 9), end: iso(2026, 9, 25, 19) }, NOW), 'Sun 25 Oct 09:00–19:00'); // DST day too
  assert.equal(alertWhen({ start: iso(2026, 9, 24, 22), end: iso(2026, 9, 25, 6) }, NOW), 'Sat 24 Oct 22:00 – Sun 25 Oct 06:00');
  assert.equal(alertWhen({ start: iso(2026, 9, 25, 9) }, NOW), 'from Sun 25 Oct 09:00');
  assert.equal(alertWhen({ start: iso(2026, 6, 7, 0) }, NOW), 'since 7 Jul');
  assert.equal(alertWhen({}, NOW), '');
  assert.deepEqual(
    activeAlerts([al('a', 'YELLOW', { end: iso(2026, 9, 23, 11) }), al('b', 'YELLOW', { end: iso(2026, 9, 23, 13) }), al('c', 'MESSAGE')], NOW).map((a) => a.id),
    ['b', 'c'],
  ); // an ended warning isn't shown even if a failing source keeps the old list
  assert.deepEqual(warningsOf([al('a', 'MESSAGE'), al('b', 'YELLOW'), al('c', 'VMA')]).map((a) => a.id), ['b', 'c']);

  const ok = sourceAfter(null, true, NOW);
  assert.ok(sourceOk(ok, NOW));
  assert.equal(sourceNote('SMHI', ok, NOW), null);
  assert.equal(sourceNote('SMHI', null, NOW), 'Checking SMHI…');
  const down = sourceAfter(sourceAfter(ok, false, NOW + 15 * 60_000), false, NOW + 17 * 60_000);
  assert.equal(down.fails, 2);
  assert.ok(!sourceOk(down, NOW + 17 * 60_000)); // a failure is never an all-clear
  assert.equal(sourceNote('SMHI', down, NOW + 17 * 60_000), "Couldn't reach SMHI · last good check 12:00");
  assert.equal(sourceNote('SMHI', sourceAfter(null, false, NOW), NOW), "Couldn't reach SMHI · no good check yet");
  assert.ok(!sourceOk(ok, NOW + 61 * 60_000)); // nor is a check over an hour old
  assert.equal(sourceNote('SMHI', ok, NOW + 61 * 60_000), 'SMHI last checked 12:00');
  assert.ok(sourceOk(sourceAfter(down, true, NOW + 20 * 60_000), NOW + 20 * 60_000));

  assert.ok(weatherMissing(undefined));
  assert.ok(weatherMissing({ max: 4, min: 1, rainMm: 0, sunMin: 0, code: 3 })); // fetched before pressure was
  assert.ok(weatherMissing({ max: 0, min: 0, rainMm: 0, sunMin: 0, code: null as unknown as number, pressureDrop: null })); // a blank row
  assert.ok(!weatherMissing({ max: 0, min: -3, rainMm: 0, sunMin: 0, code: 71, pressureDrop: null })); // a real 0° day
  assert.ok(!weatherMissing({ max: 0, min: 0, rainMm: 0, sunMin: 0, code: 3, pressureDrop: 2 }));
}

// Network failures and format changes (fetch stubbed): an error, never a silent empty list; requests time out
void (async () => {
  const realFetch = globalThis.fetch;
  let lastUrl = '';
  const respond = (body: unknown, status = 200) =>
    (async (url: string) => {
      lastUrl = url;
      return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status });
    }) as unknown as typeof fetch;
  const SMHI = [
    {
      id: 3256,
      event: { sv: 'Risk för vattenbrist', en: 'Risk for water shortage', code: 'WATER_SHORTAGE' },
      warningAreas: [
        {
          id: 10251,
          approximateStart: '2026-07-06T22:00:00.000Z',
          published: '2026-10-20T09:31:47.894Z',
          warningLevel: { sv: 'Meddelande', en: 'Message', code: 'MESSAGE' },
          eventDescription: { en: 'Risk for water shortage - Watercourses' },
          affectedAreas: [{ id: 1, sv: 'Stockholms län' }],
          descriptions: [],
        },
      ],
    },
    {
      id: 3378,
      event: { en: 'Wind', code: 'WIND' },
      warningAreas: [
        {
          id: 10696,
          approximateStart: '2026-10-25T07:00:00.535Z',
          approximateEnd: '2026-10-25T17:00:00.223Z',
          published: '2026-10-23T09:11:36.941Z',
          warningLevel: { en: 'Yellow', code: 'YELLOW' },
          eventDescription: { en: 'Wind' },
          affectedAreas: [{ id: 4, sv: 'Södermanlands län' }, { id: 1, sv: 'Stockholms län' }],
          descriptions: [{ title: { code: 'INCIDENT' }, text: { en: 'Gusts up to 25 m/s.' } }],
        },
        { id: 10697, warningLevel: { code: 'YELLOW' }, eventDescription: { en: 'Wind' }, affectedAreas: [{ id: 9, sv: 'Gotlands län' }] },
      ],
    },
  ];
  try {
    globalThis.fetch = respond(SMHI);
    const got = await fetchSmhi(LAN);
    assert.deepEqual(
      got.map((a) => [a.id, a.level, a.title, a.text, a.end]),
      [
        ['smhi-3378-10696', 'YELLOW', 'Wind', 'Gusts up to 25 m/s.', '2026-10-25T17:00:00.223Z'], // worst first
        ['smhi-3256-10251', 'MESSAGE', 'Risk for water shortage - Watercourses', '', undefined],
      ],
    );
    assert.equal(got[1].updated, '2026-10-20T09:31:47.894Z');
    globalThis.fetch = respond('busy', 503);
    await assert.rejects(fetchSmhi(LAN), /SMHI failed \(503\)/);
    globalThis.fetch = respond('<html>Log in to the Wi-Fi</html>'); // captive portal: 200 with HTML
    await assert.rejects(fetchSmhi(LAN));
    globalThis.fetch = respond([{ id: 1, event: { code: 'WIND' }, warningAreas: [{ id: 2, warningLevel: { code: 'YELLOW' }, areas: [] }] }]);
    await assert.rejects(fetchSmhi(LAN)); // SMHI renamed a field: a failure, not "no warnings"
    globalThis.fetch = respond([]);
    assert.deepEqual(await fetchVma(LAN, 'Stockholm'), []); // a real empty list is fine
    globalThis.fetch = respond({ message: 'maintenance' });
    await assert.rejects(fetchVma(LAN, 'Stockholm'));

    globalThis.fetch = ((_url: string, init?: { signal?: AbortSignal }) =>
      new Promise((_, reject) => init?.signal?.addEventListener('abort', () => reject(new Error('aborted'))))) as unknown as typeof fetch;
    await assert.rejects(getJson('https://example.invalid', 'Slow thing', { timeoutMs: 30 }), /Slow thing timed out/);

    let calls = 0;
    globalThis.fetch = (async () => {
      calls++;
      if (calls === 1) throw new Error('offline');
      return new Response(JSON.stringify({ livsmedel: [{ nummer: 1, namn: ' Ägg kokt ' }] }));
    }) as unknown as typeof fetch;
    await assert.rejects(loadFoods());
    assert.deepEqual(await loadFoods(), [{ id: 1, name: 'Ägg kokt' }]); // the failed attempt wasn't cached
    assert.equal(calls, 2);

    globalThis.fetch = respond({
      daily: {
        time: ['2026-08-24', '2026-08-25'],
        weather_code: [null, 3],
        temperature_2m_max: [null, 18.4],
        temperature_2m_min: [null, 9.6],
        precipitation_sum: [null, 1.2],
        sunshine_duration: [null, 3600],
      },
      hourly: { time: [], pressure_msl: [] },
    });
    const hist = await fetchWeatherHistory({ name: 'Stockholm', lat: 59.33, lon: 18.07 }, 2);
    assert.ok(lastUrl.startsWith('https://historical-forecast-api.open-meteo.com/'));
    assert.deepEqual(Object.keys(hist), ['2026-08-25']); // a day without data isn't stored as 0°
    assert.deepEqual(hist['2026-08-25'], { max: 18, min: 10, rainMm: 1.2, sunMin: 60, code: 3, pressureDrop: null });
  } finally {
    globalThis.fetch = realFetch;
  }
  console.log('outside/weather fetch checks passed');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

// ---------- step 4 hq ----------
// SL departures (sl.ts): fixtures trimmed from real answers of 2026-10-23 (Odenplan, site 9117)
{
  assert.equal(siteIdOf('9091001000009117'), 9117);
  assert.equal(siteIdOf('9091001000000102'), 102);
  assert.equal(siteIdOf('18009117'), null); // the stopId, not the global id
  const stops = parseStops({
    locations: [
      { id: '9091001000009117', type: 'stop', name: 'Stockholm, Odenplan', disassembledName: 'Odenplan', parent: { name: 'Stockholm' } },
      { id: '9091001000009117', type: 'stop', name: 'Stockholm, Odenplan (again)' },
      { id: 'streetID:1', type: 'street', name: 'Odengatan' },
      { id: '9091001000001141', type: 'stop', name: 'Stockholm, S:t Eriksplan' },
    ],
  });
  assert.deepEqual(stops, [
    { siteId: 9117, name: 'Odenplan', area: 'Stockholm' },
    { siteId: 1141, name: 'Stockholm, S:t Eriksplan', area: undefined },
  ]);
  assert.deepEqual(parseStops({}), []);

  const at = (h: number, m: number) => `2026-10-26T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`; // local, no offset, as SL sends it
  const now = new Date(2026, 9, 26, 8, 3).getTime();
  const dep = (line: string, id: number, dir: number, dest: string, sched: string, exp: string | undefined, state = 'EXPECTED', mode = 'METRO') => ({
    destination: dest,
    direction_code: dir,
    state,
    scheduled: sched,
    ...(exp ? { expected: exp } : {}),
    stop_area: { id: mode === 'BUS' ? 10501 : 1131 },
    line: { id, designation: line, transport_mode: mode },
  });
  const { departures, stopDeviations } = parseDepartures({
    departures: [
      dep('17', 17, 1, 'Åkeshov', at(8, 14), at(8, 14)),
      dep('17', 17, 1, 'Vällingby', at(8, 4), at(8, 4)), // leave was 5 min ago: can't make it
      dep('4', 4, 1, 'Gullmarsplan', at(8, 20), at(8, 22), 'EXPECTED', 'BUS'),
      dep('17', 17, 1, 'Åkeshov', at(8, 24), undefined, 'CANCELLED'),
      dep('17', 17, 1, 'Åkeshov', at(8, 1), at(8, 2), 'DEPARTED'),
      dep('17', 17, 2, 'Skarpnäck', at(8, 16), at(8, 16)),
      { destination: 'Broken', line: { designation: 'X' } }, // no id, no times: skipped
    ],
    stop_deviations: [{ id: 1, importance_level: 6, message: 'Odenplan: the north entrance is closed', scope: { stop_areas: [{ id: 1131 }] } }],
  });
  assert.equal(departures.length, 6);
  assert.deepEqual(
    departures.map((d) => d.expected),
    [...departures.map((d) => d.expected)].sort((a, b) => a - b),
  ); // soonest first
  assert.equal(departures.find((d) => d.state === 'CANCELLED')!.expected, new Date(2026, 9, 26, 8, 24).getTime()); // no expected: the timetable
  assert.throws(() => parseDepartures({}), /format/);

  assert.deepEqual(routesOf(departures), [
    { key: '17:1', mode: 'METRO', label: '17 → Åkeshov, Vällingby' }, // destinations in the order they next leave
    { key: '17:2', mode: 'METRO', label: '17 → Skarpnäck' },
    { key: '4:1', mode: 'BUS', label: '4 → Gullmarsplan' },
  ]);

  const cfg = { routes: ['17:1'], walkMin: 5 };
  const next = nextDepartures(departures, cfg, now);
  assert.deepEqual(
    next.map((d) => `${d.line} ${d.destination} ${d.state}`),
    ['17 Åkeshov EXPECTED', '17 Åkeshov CANCELLED'],
  ); // not the one that's gone, not the one she can't make, not other lines
  assert.equal(nextDepartures(departures, { routes: [], walkMin: 0 }, now).length, 3); // every line, three at most
  assert.equal(leaveInMin(next[0], 5, now), 6);
  assert.equal(departureText(next[0], 5, now), 'Leave in 6 min for the 08:14 (line 17 → Åkeshov)');
  assert.equal(departureText(next[1], 5, now), 'The 08:24 (line 17 → Åkeshov) is cancelled');
  const bus = departures.find((d) => d.line === '4')!;
  assert.equal(departureText(bus, 5, now), 'Leave in 14 min for the 08:22 (line 4 → Gullmarsplan) · 2 min late');
  assert.equal(departureText(next[0], 11, now), 'Leave now for the 08:14 (line 17 → Åkeshov)');
  assert.equal(plannedText(bus), '08:20 line 4 → Gullmarsplan');

  const devs = parseDeviations([
    {
      deviation_case_id: 1,
      publish: { from: '2026-10-26T07:50:00+01:00', upto: '2026-10-26T09:00:00+01:00' },
      priority: { importance_level: 5 },
      message_variants: [{ header: 'Försenad avgång mot Åkeshov', details: 'Signalfel.', language: 'sv' }],
      scope: { lines: [{ id: 17 }] },
    },
    { deviation_case_id: 2, publish: { from: '2026-10-26T07:00:00+01:00' }, priority: { importance_level: 2 }, message_variants: [{ header: 'Avstängd hiss', language: 'sv' }], scope: { lines: [{ id: 17 }] } },
    { deviation_case_id: 3, publish: { from: '2026-10-25T07:00:00+01:00', upto: '2026-10-25T09:00:00+01:00' }, priority: { importance_level: 7 }, message_variants: [{ header: 'Gammal störning' }], scope: { lines: [{ id: 17 }] } },
    { deviation_case_id: 4, publish: { from: '2026-10-26T07:00:00+01:00' }, priority: { importance_level: 7 }, message_variants: [{ header: 'Buss ersätter tåg', language: 'sv' }, { header: 'Buses replace trains', language: 'en' }], scope: { lines: [{ id: 43 }] } },
    { deviation_case_id: 5, publish: { from: '2026-10-26T08:00:00+01:00' }, priority: { importance_level: 6 }, message_variants: [{ header: 'Försenad avgång mot Åkeshov', language: 'sv' }], scope: { lines: [{ id: 17 }] } },
  ]);
  assert.equal(devs[3].header, 'Buses replace trains'); // English when SL wrote it
  assert.equal(devs[1].upto, null);
  assert.throws(() => parseDeviations({} as never), /format/);
  const shown = relevantDeviations([...stopDeviations, ...devs], [17], [1131], now);
  assert.deepEqual(
    shown.map((x) => `${x.importance} ${x.header}`),
    ['6 Odenplan: the north entrance is closed', '6 Försenad avgång mot Åkeshov'],
  ); // 5 and 6 share a header (kept once, most important first); level 2, the ended one and line 43 aren't hers
  assert.equal(relevantDeviations(devs, [43], [], now)[0].header, 'Buses replace trains');

  assert.deepEqual([0, 1, 2, 3, 4, 9].map(slRetryMs), [60_000, 120_000, 240_000, 480_000, 900_000, 900_000]); // once a minute, then 2, 4, 8, 15 min
}


// respect meter: a rolling 7-day average of day scores (today excluded), silent until 3 days exist
{
  const r0 = defaultState();
  const fullDay = (n: number) => ({ water: [{ id: `w${n}`, ml: r0.settings.waterGoalMl, at: 0 }], food: [], sets: [], games: [], bonusGameMin: 0 });
  r0.days[dayKey(atTime(new Date(), -1, 12))] = fullDay(1);
  r0.days[dayKey(atTime(new Date(), -2, 12))] = fullDay(2);
  assert.equal(respectFor(r0), null);
  r0.days[dayKey(atTime(new Date(), -3, 12))] = fullDay(3);
  const r = respectFor(r0);
  assert.ok(r && r.score >= 0 && r.score <= 100);
  assert.ok(r && r.score >= RESPECT[r.tier].min && (r.tier === RESPECT.length - 1 || r.score < RESPECT[r.tier + 1].min));
  // today never counts, and days outside the window don't either
  r0.days[dayKey()] = { ...fullDay(0), water: [] };
  r0.days[dayKey(atTime(new Date(), -9, 12))] = { ...fullDay(9), water: [] };
  assert.equal(respectFor(r0)?.score, r?.score);
  for (const t of RESPECT) assert.ok(t.line in LINES, t.line);
}

// fresh lines: no line repeats within half its pool's size; golden lines have unique ids and known placeholders
{
  const pool = LINES.waterLogged.savage;
  const window = Math.floor(pool.length / 2);
  const picks = Array.from({ length: 200 }, () => freshLine('waterLogged', 10, { name: 'X', ml: 250 }));
  for (let i = window; i < picks.length; i++) {
    assert.ok(!picks.slice(i - window, i).includes(picks[i]), `repeat within ${window}: ${picks[i]}`);
  }
  assert.ok(new Set(picks).size === pool.length, 'every line still gets its turn');
  assert.equal(new Set(GOLDEN.map((g) => g.id)).size, GOLDEN.length);
  for (const g of GOLDEN) {
    for (const m of g.text.matchAll(/\{(\w+)\}/g)) assert.equal(m[1], 'name', `${g.id}: only {name} is passed`);
  }
}

// boss weaknesses: XP earned on days that hit the weakness counts 50 % extra; every boss has its weakness and taunts
{
  const b = defaultState();
  const k = dayKey();
  b.days[k] = { water: [], food: [], sets: [], games: [], bonusGameMin: 0, xpEarned: 100 };
  const plain = bossFor(b);
  assert.equal(plain.damage - plain.bonus, 100 + (b.bossBombs[plain.key] ?? 0));
  for (const boss of BOSSES) {
    assert.ok(WEAKNESS[boss.id].label, boss.id);
    assert.ok(`taunt_${boss.id}` in LINES, `taunt_${boss.id}`);
  }
  // Captain Dehydration's weakness is water: a water-goal day doubles that day's damage
  const water = WEAKNESS.dehydration.hit;
  b.days[k] = { ...b.days[k], water: [{ id: 'w', ml: waterGoalFor(b, k), at: Date.now() }] };
  assert.ok(water(b, b.days[k], k));
  assert.ok(!water(defaultState(), { water: [], food: [], sets: [], games: [], bonusGameMin: 0 }, k));
  // the snooze button: something logged before 08:00
  const early = { water: [{ id: 'e', ml: 250, at: atTime(new Date(), 0, 7, 30).getTime() }], food: [], sets: [], games: [], bonusGameMin: 0 };
  assert.ok(WEAKNESS.snooze.hit(b, early, k));
  assert.ok(!WEAKNESS.snooze.hit(b, { ...early, water: [{ id: 'l', ml: 250, at: atTime(new Date(), 0, 9).getTime() }] }, k));
  // when this week's boss is weak to the day, the bonus is half the day's XP
  const now = bossFor(b);
  assert.equal(now.bonus, WEAKNESS[now.id as keyof typeof WEAKNESS].hit(b, b.days[k], k) ? 50 : 0);
}

// seasons: dates, one seasonal quest a day in season, Halloween boss skins, seasonal secrets, first snow per winter
{
  assert.equal(seasonOn(new Date(2026, 9, 23)), null);
  assert.equal(seasonOn(new Date(2026, 9, 24))?.id, 'halloween');
  assert.equal(seasonOn(new Date(2026, 10, 1, 23, 59))?.id, 'halloween');
  assert.equal(seasonOn(new Date(2026, 10, 2)), null);
  // Alla helgons dag (Sat 31 Oct 2026, in spooky season) gets the quiet greeting instead of the jokes
  assert.ok(isAllSaintsDay(new Date(2026, 9, 31, 9)));
  assert.ok(!isAllSaintsDay(new Date(2026, 10, 1, 9)));
  assert.ok(isAllSaintsDay(new Date(2027, 10, 6, 20)));
  assert.deepEqual(LINES.greetAllSaints.savage, LINES.greetAllSaints.mild);
  assert.equal(seasonOn(new Date(2026, 11, 13))?.id, 'lucia');
  assert.equal(seasonOn(new Date(2026, 11, 21))?.id, 'solstice');
  assert.equal(seasonOn(new Date(2026, 11, 22))?.id, 'advent');
  for (const id of ['halloween', 'lucia', 'solstice'] as const) {
    const day = { halloween: new Date(2026, 9, 31, 12), lucia: new Date(2026, 11, 13, 12), solstice: new Date(2026, 11, 21, 12) }[id];
    assert.ok(seasonOn(day)!.line in LINES);
    const picks = pickQuests(defaultState(), day);
    assert.equal(picks.length, 3);
    assert.equal(picks.filter((q) => /^(hw_|lucia_|solstice_)/.test(q)).length, 1, `${id}: ${picks}`);
  }
  assert.ok(!pickQuests(defaultState(), new Date(2026, 9, 11, 12)).some((q) => /^(hw_|lucia_|solstice_)/.test(q)));
  const hw = bossFor(defaultState(), new Date(2026, 9, 31, 12));
  const plainWeek = bossFor(defaultState(), new Date(2026, 9, 31 - 14, 12));
  assert.notEqual(hw.name, BOSSES.find((b) => b.id === hw.id)!.name);
  assert.equal(plainWeek.name, BOSSES.find((b) => b.id === plainWeek.id)!.name);
  const haunted = SECRET_ACHIEVEMENTS.find((a) => a.id === 's_haunted_hero')!;
  // the costume is the week's: Halloween starts Sat 24 Oct 2026, so that week's boss wears it from Monday, under one name
  assert.equal(bossSeasonOf(new Date(2026, 9, 19, 12)), 'halloween');
  assert.equal(bossFor(defaultState(), new Date(2026, 9, 19, 12)).name, bossFor(defaultState(), new Date(2026, 9, 25, 12)).name);
  assert.notEqual(bossFor(defaultState(), new Date(2026, 9, 20, 12)).name, BOSSES.find((b) => b.id === bossFor(defaultState(), new Date(2026, 9, 20, 12)).id)!.name);
  assert.equal(bossSeasonOf(new Date(2026, 9, 26, 12)), 'halloween', 'the week ending Sun 1 Nov');
  assert.equal(bossSeasonOf(new Date(2026, 10, 2, 12)), null);
  // nyår: Thu 31 Dec and Fri 1 Jan share a week, and the Old Year is that whole week's boss
  assert.equal(bossFor(defaultState(), new Date(2026, 11, 28, 12)).name.startsWith('The Old Year'), true);
  assert.equal(bossFor(defaultState(), new Date(2027, 0, 3, 12)).name, bossFor(defaultState(), new Date(2026, 11, 28, 12)).name);
  assert.equal(bossSeasonOf(new Date(2026, 11, 21, 12)), null, 'Lucia and the solstice leave the boss as it is');
  // closing the year is a New Year's Eve quest: on 1 Jan the year is closed
  const ny = { ...defaultState(), tasks: [{ id: 't', title: 'x', done: false, createdAt: 0 }] };
  assert.ok(draftFor(ny, new Date(2026, 11, 31, 9)).candidates.includes('nyar_close'));
  assert.ok(!draftFor(ny, new Date(2027, 0, 1, 9)).candidates.includes('nyar_close'));
  assert.ok(pickQuests(ny, new Date(2027, 0, 1, 12)).includes('nyar_fresh'), 'the fresh start is all that is left on 1 Jan');
  // bosses beaten while spooky season was on (a costumed week counts, like its name)
  assert.ok(haunted.test({ ...defaultState(), seasonWins: ['halloween-2026'] }));
  assert.ok(!haunted.test({ ...defaultState(), bossesDefeated: { '2026-10-19': 'procrastinator' } }));
  assert.ok(!haunted.test({ ...defaultState(), seasonWins: ['lucia-2026'] }));
  assert.equal(winterOf(new Date(2026, 10, 20)), '2026');
  assert.equal(winterOf(new Date(2027, 2, 1)), '2026');
  assert.ok(isSnow(73) && !isSnow(61));
}

// Advent and Julfrid: season dates, candles, doors that wait (never a streak), gifts once, the days off, Kalle Anka
{
  assert.equal(dayKey(firstAdventSunday(2026)), '2026-11-29');
  assert.equal(dayKey(firstAdventSunday(2027)), '2027-11-28');
  assert.equal(dayKey(firstAdventSunday(2028)), '2028-12-03');
  assert.equal(seasonOn(new Date(2026, 10, 28)), null);
  assert.equal(seasonOn(new Date(2026, 10, 29))?.id, 'advent');
  assert.equal(seasonOn(new Date(2026, 11, 13))?.id, 'lucia', 'Lucia and the solstice win on their own day');
  assert.equal(seasonOn(new Date(2026, 11, 23))?.id, 'advent');
  assert.equal(seasonOn(new Date(2026, 11, 24))?.id, 'jul');
  assert.equal(dayKey(seasonOn(new Date(2026, 11, 24))!.lastDay), '2026-12-26');
  assert.equal(seasonOn(new Date(2026, 11, 27)), null);
  assert.ok(seasonOn(new Date(2026, 11, 1))!.line in LINES && seasonOn(new Date(2026, 11, 25))!.line in LINES);
  assert.deepEqual(LINES.seasonJul.savage, LINES.seasonJul.mild);
  // one more candle each Advent Sunday, all four until annandag jul
  assert.deepEqual([28, 29].map((d) => adventCandles(new Date(2026, 10, d, 12))), [0, 1]);
  assert.deepEqual([5, 6, 13, 20, 26, 27].map((d) => adventCandles(new Date(2026, 11, d, 12))), [1, 2, 3, 4, 4, 0]);
  // door n opens on n December; a missed one waits until Trettondedag jul; each opens once, for coins or a cosmetic, never XP
  const av = defaultState();
  assert.equal(adventYear(new Date(2026, 10, 30, 12)), 2026);
  assert.equal(adventYear(new Date(2027, 0, 6, 12)), 2026);
  assert.equal(adventYear(new Date(2027, 0, 7, 12)), null);
  assert.equal(adventYear(new Date(2026, 10, 1, 12)), null);
  // first Advent on 3 Dec (2028): the Web is still up from 1 December, door 1 with it
  assert.equal(adventYear(new Date(2028, 11, 1, 12)), 2028);
  assert.equal(seasonOn(new Date(2028, 11, 1, 12))?.id, 'advent');
  assert.equal(adventYear(new Date(2028, 10, 30, 12)), null);
  assert.ok(doorOpenable(defaultState(), 1, new Date(2028, 11, 1, 12)));
  assert.equal(doorsWaiting(av, new Date(2026, 10, 30, 12)), 0);
  assert.ok(doorOpenable(av, 1, new Date(2026, 11, 1, 12)) && !doorOpenable(av, 2, new Date(2026, 11, 1, 12)));
  assert.equal(doorsWaiting(av, new Date(2026, 11, 3, 12)), 3, 'missed doors stay openable');
  const d1 = openDoor(av, 1, new Date(2026, 11, 3, 12))!;
  assert.ok(d1.prize.coins >= 10 && d1.prize.coins <= 30);
  assert.equal(d1.state.coins, av.coins + d1.prize.coins);
  assert.equal(d1.state.xp, av.xp, 'doors never pay XP');
  assert.equal(openDoor(d1.state, 1, new Date(2026, 11, 3, 12)), null, 'once');
  assert.equal(doorsWaiting(d1.state, new Date(2026, 11, 3, 12)), 2);
  assert.deepEqual(doorPrize(2026, 7), doorPrize(2026, 7));
  assert.equal(openDoor(av, 0, new Date(2026, 11, 3, 12)), null);
  const d24 = openDoor(av, 24, new Date(2027, 0, 5, 12))!;
  assert.ok(owns(d24.state, 'tomte_hat') && d24.reward.includes('Tomte hat'));
  assert.equal(openDoor(av, 24, new Date(2027, 0, 7, 12)), null, 'after Trettondedag jul');
  const again = openDoor({ ...d24.state, advent: {} }, 24, new Date(2026, 11, 24, 12))!;
  assert.equal(again.state.coins, d24.state.coins + 30, 'a gift already in the wardrobe pays coins instead');
  assert.ok(!buyable(cosmeticOf('tomte_hat')!) && whereToGet(cosmeticOf('tomte_hat')!) === 'Advent Web · door 24');
  // Advent Sundays offer a candle quest in the draft, never as a default; other days don't
  const at = { ...defaultState(), tasks: [{ id: 't', title: 'x', done: false, createdAt: 0 }] };
  assert.ok(draftFor(at, new Date(2026, 10, 29, 9)).candidates.includes('advent_candle'));
  assert.ok(!draftFor(at, new Date(2026, 10, 29, 9)).defaults.includes('advent_candle'));
  assert.ok(!draftFor(at, new Date(2026, 10, 30, 9)).candidates.includes('advent_candle'), 'Sundays only');
  assert.ok(!pickQuests(at, new Date(2026, 11, 2, 12)).some((q) => q.startsWith('advent_')));
  // Julfrid: kind days (no roasts), away mode in one tap to annandag jul, a daylight walk as the gentle quest
  assert.ok(isJulfridKey('2026-12-24') && isJulfridKey('2026-12-26') && !isJulfridKey('2026-12-27'));
  assert.ok(toneOn(defaultState(), '2026-12-24').kind && toneOn(defaultState(), '2026-12-26').kind);
  assert.ok(!toneOn(defaultState(), '2026-12-27').kind);
  const jf = defaultState();
  assert.equal(julfridOffer(jf, new Date(2026, 11, 23, 17)), null);
  assert.deepEqual(julfridOffer(jf, new Date(2026, 11, 23, 19)), { from: '2026-12-24', to: '2026-12-26' });
  const planned = julfridPause(jf, new Date(2026, 11, 23, 19));
  assert.ok(!pausedOn(planned, '2026-12-23') && pausedOn(planned, '2026-12-24') && pausedOn(planned, '2026-12-26') && !pausedOn(planned, '2026-12-27'));
  assert.equal(pauseOn(planned, '2026-12-25')?.kind, 'away');
  assert.equal(julfridOffer(planned, new Date(2026, 11, 24, 9)), null, 'nothing left to offer');
  const onDay = julfridPause(jf, new Date(2026, 11, 25, 9));
  assert.ok(!pausedOn(onDay, '2026-12-24') && pausedOn(onDay, '2026-12-25') && pausedOn(onDay, '2026-12-26') && !pausedOn(onDay, '2026-12-27'));
  // a sick pause running into Julfrid stays sick; the days off follow it (the eve, or the 24th itself)
  const sickEve = { ...jf, pauses: [{ from: '2026-12-21', to: '2026-12-24', kind: 'sick' as const }] };
  for (const at of [new Date(2026, 11, 23, 19), new Date(2026, 11, 24, 9)]) {
    const r = julfridPlan(sickEve, at);
    assert.equal(r.result, 'ok');
    assert.equal(pauseOn(r.state, '2026-12-22')?.kind, 'sick');
    assert.equal(pauseOn(r.state, '2026-12-24')?.kind, 'sick');
    assert.equal(pauseOn(r.state, '2026-12-25')?.kind, 'away');
    assert.ok(pausedOn(r.state, '2026-12-26') && !pausedOn(r.state, '2026-12-27'));
  }
  assert.equal(julfridPlan(planned, new Date(2026, 11, 24, 9)).result, 'gone', 'nothing left: its own toast, not the cap one');
  const capped = { ...jf, pauses: [{ from: '2026-12-01', to: '2026-12-07', kind: 'away' as const }] };
  assert.equal(julfridPlan(capped, new Date(2026, 11, 24, 9)).result, 'cap');
  // "I'm sick" on the 23rd after the eve tap: the planned days off keep what the sick days don't cover
  const sickAfter = startPause(julfridPause(jf, new Date(2026, 11, 23, 19)), 'sick', 2, '2026-12-23');
  assert.equal(pauseOn(sickAfter, '2026-12-24')?.kind, 'sick');
  assert.equal(pauseOn(sickAfter, '2026-12-25')?.kind, 'away');
  assert.equal(pauseOn(sickAfter, '2026-12-26')?.kind, 'away');
  // a running pause changed to away keeps its sick days sick; changed to sick, they're all sick
  const sw = startPause(startPause(jf, 'sick', 5, '2026-11-02'), 'away', 3, '2026-11-04');
  assert.equal(pauseOn(sw, '2026-11-03')?.kind, 'sick');
  assert.equal(pauseOn(sw, '2026-11-04')?.kind, 'away');
  const ws = startPause(startPause(jf, 'away', 5, '2026-11-02'), 'sick', 3, '2026-11-04');
  assert.equal(pauseOn(ws, '2026-11-02')?.kind, 'sick');
  assert.equal(ws.pauses?.length, 1);
  const walker = { ...planned, days: { '2026-12-20': { water: [], food: [], sets: [], games: [], bonusGameMin: 0, steps: 5000 } } };
  assert.equal(gentleQuestFor(walker, new Date(2026, 11, 25, 12)), 'jul_walk');
  assert.ok(kalleAnka(new Date(2026, 11, 24, 15, 30)) && !kalleAnka(new Date(2026, 11, 24, 16, 0)) && !kalleAnka(new Date(2026, 11, 25, 15, 30)));
}

// the S.P.I.D.E.R. Prizes: totals over the year's counted days, no prize for an empty field, accepted once (a medal, never XP)
{
  const pz = defaultState();
  pz.days['2026-11-02'] = { water: [{ id: 'w', ml: 2000, at: 0 }], food: [], sets: [], games: [], bonusGameMin: 0, steps: 8000, coffee: [{ id: 'c', mg: 80, at: 0 }] };
  pz.days['2026-11-03'] = { water: [{ id: 'w2', ml: 1000, at: 0 }], food: [], sets: [], games: [], bonusGameMin: 0, steps: 6000, moods: [{ id: 'm', level: 1, emotions: [], at: 0 }] }; // rest: not counted
  const p = prizesFor(pz, 2026, new Date(2026, 11, 10, 12));
  const stat = (id: string) => p.find((x) => x.id === id)?.stat.replace(/\s/g, ' ');
  assert.equal(stat('physics'), '8 000 steps');
  assert.equal(stat('medicine'), '2.0 L of water');
  assert.equal(stat('chemistry'), '1 cup of coffee');
  assert.equal(stat('peace'), '1 day inside the gaming budget');
  assert.equal(stat('literature'), undefined, 'no diary, no prize');
  assert.equal(prizesFor(pz, 2025, new Date(2026, 11, 10, 12)).length, pz.coins > 0 ? 1 : 0, 'another year: only the vault');
  assert.ok(isPrizeDay(new Date(2026, 11, 10, 17)) && !isPrizeDay(new Date(2026, 11, 11)));
  assert.ok(prizeCardUp(new Date(2026, 11, 12)) && !prizeCardUp(new Date(2026, 11, 13)) && !prizeCardUp(new Date(2026, 11, 9)));
  const acc = acceptPrizes(pz, 2026)!;
  assert.ok(owns(acc.state, 'prize_medal'));
  assert.equal(acc.state.xp, pz.xp);
  assert.equal(acceptPrizes(acc.state, 2026), null, 'once a year');
  assert.equal(acceptPrizes(acc.state, 2027)!.state.coins, acc.state.coins + 50, 'the medal is owned: coins next year');
}

// the yearly Wrapped: from the first logged day ("since October"), rough days as rest, totals only, the nemesis of the year
{
  const yw = defaultState();
  yw.settings.adaptiveWater = false; // the plain goal
  const day = (extra: Partial<DayLog>): DayLog => ({ water: [{ id: 'w', ml: yw.settings.waterGoalMl, at: 0 }], food: [], sets: [], games: [], bonusGameMin: 0, ...extra });
  yw.days['2026-10-07'] = day({ xpEarned: 100 });
  yw.days['2026-11-10'] = day({ xpEarned: 300, sets: [{ id: 's', exercise: 'Squat', weight: 40, reps: 8, at: new Date(2026, 10, 10, 18).getTime() }] });
  yw.days['2026-11-11'] = day({ xpEarned: 20, moods: [{ id: 'm', level: 1, emotions: [], at: 0 }] });
  yw.bossesDefeated = { '2026-10-19': 'procrastinator', '2025-12-01': 'snooze' };
  yw.lineMemory = { banned: ['a', 'b', 'c'] };
  let nm = withNemesis(yw, '2026-10-26', { name: 'Hydro Hanna', emoji: '💧', beaten: true });
  nm = withNemesis(nm, '2026-11-02', { name: 'Hydro Hanna', emoji: '💧', beaten: false });
  nm = withNemesis(withNemesis(nm, '2026-11-09', { name: 'Gym Greg', emoji: '🏋️', beaten: true }), '2026-11-16', null);
  assert.deepEqual(nemesisOfYear(nm, 2026), { name: 'Hydro Hanna', emoji: '💧', weeks: 2, beaten: 1 });
  assert.equal(nemesisOfYear(nm, 2027), null);
  const w = yearWrapped(nm, 2026, new Date(2027, 0, 1, 10));
  const slide = (id: string) => w.slides.find((x) => x.id === id);
  assert.equal(w.partial, false);
  assert.ok(slide('intro')!.sub.includes('since October') && slide('intro')!.sub.includes('1 rest day'), slide('intro')!.sub);
  assert.equal(slide('intro')!.big.replace(/\s/g, ' '), '420 XP');
  assert.equal(slide('month')!.big, 'November');
  assert.equal(slide('bosses')!.big, '1', 'only this year');
  assert.equal(slide('nemesis')!.big, 'Hydro Hanna');
  assert.equal(slide('retired')!.quip, "3. I've grown.");
  assert.equal(slide('water')!.sub, 'goal hit on 2 of 2 days', 'the rough day is rest, not a miss');
  assert.equal(w.slides.at(-1)!.id, 'finale');
  assert.ok(!/in a row|streak/i.test(JSON.stringify(w)));
  assert.equal(yearWrapped(nm, 2026, new Date(2026, 11, 20, 12)).partial, true);
  assert.ok(yearWrappedDue(new Date(2027, 0, 7, 20)) && !yearWrappedDue(new Date(2027, 0, 8)) && !yearWrappedDue(new Date(2026, 11, 31)));
}

// weekly contract: counts only from the day it was signed, gaming only for finished days, rough weeks void it
{
  const monday = startOfWeek(new Date(2026, 9, 14)); // Mon 12 Oct 2026
  const wed = addDays(monday, 2);
  const fri = atTime(monday, 4, 12);
  const k = (d: Date) => dayKey(d);
  const c = { week: k(monday), from: k(wed), goal: 'water' as const, target: 2, stake: 100, status: 'open' as const };
  const cs = defaultState();
  cs.settings.adaptiveWater = false; // the plain goal; the adaptive one is tested on its own
  const goalDay = (n: number) => ({ water: [{ id: `w${n}`, ml: cs.settings.waterGoalMl, at: 0 }], food: [], sets: [], games: [], bonusGameMin: 0 });
  cs.days[k(monday)] = goalDay(1); // before signing: doesn't count
  cs.days[k(wed)] = goalDay(2);
  cs.days[k(addDays(monday, 3))] = goalDay(3);
  assert.equal(contractProgress(cs, c, fri), 2);
  assert.equal(contractProgress(cs, c, atTime(monday, 2, 12)), 1); // Wednesday itself
  // gaming: today isn't counted until it's over
  const g = { ...c, goal: 'gaming' as const, target: 5 };
  assert.equal(contractProgress(defaultState(), g, fri), 2); // Wed + Thu are finished, Fri isn't
  assert.equal(contractProgress(defaultState(), g, addDays(monday, 9)), 5); // next week: Wed..Sun all finished
  // rough week: a low mood or a period day while it ran
  assert.ok(!roughWeek(cs, c, fri));
  cs.days[k(addDays(monday, 3))] = { ...goalDay(3), moods: [{ id: 'm', level: 2, emotions: [], at: 0 }] };
  assert.ok(roughWeek(cs, c, fri));
  assert.ok(canSign(monday) && canSign(wed) && !canSign(addDays(monday, 3)) && !canSign(addDays(monday, 6)));
  assert.deepEqual(LINES.contractVoided.savage, LINES.contractVoided.mild);
}

// weather insights: sunny days vs the rest (mood), rainy days vs dry ones (steps)
{
  const ws = defaultState();
  for (let i = 1; i <= 20; i++) {
    const key = dayKey(addDays(new Date(), -i));
    const sunnyDay = i % 2 === 0;
    ws.days[key] = {
      water: [], food: [], sets: [], games: [], bonusGameMin: 0,
      steps: sunnyDay ? 9000 : 5000,
      moods: [{ id: `m${i}`, level: sunnyDay ? 4 : 3, emotions: [], at: 0 }],
      weather: { max: 10, min: 2, rainMm: sunnyDay ? 0 : 5, sunMin: sunnyDay ? 300 : 0, code: sunnyDay ? 0 : 61 },
    };
  }
  const ids = insights(ws).map((x) => x.id);
  assert.ok(ids.includes('sun_mood') && ids.includes('rain_steps'), JSON.stringify(ids));
}

// watch backfill: final steps for past days you used the app, goal flag without XP, typed-in sleep kept
{
  const hs = defaultState();
  const y = dayKey(addDays(new Date(), -1));
  const y2 = dayKey(addDays(new Date(), -2));
  const gone = dayKey(addDays(new Date(), -3)); // no log that day: stays without one
  hs.days[y] = { water: [], food: [], sets: [], games: [], bonusGameMin: 0, steps: 3000 };
  hs.days[y2] = { water: [], food: [], sets: [], games: [], bonusGameMin: 0, steps: 9000, sleepMin: 480, sleepManual: true };
  const next = withPastHealth(hs, [
    { key: y, steps: hs.settings.stepGoal + 100, sleepMin: 410 },
    { key: y2, steps: 0, sleepMin: 300 },
    { key: gone, steps: 12000, sleepMin: 420 },
  ]);
  assert.equal(next.days[y].steps, hs.settings.stepGoal + 100);
  assert.equal(next.days[y].stepGoalHit, true);
  assert.equal(next.days[y].sleepMin, 410);
  assert.equal(next.days[y2].steps, 9000); // a 0 from the watch never wipes a snapshot
  // Zepp's own final count replaces a higher snapshot (one the phone's filling took that day)
  assert.equal(withPastHealth(next, [{ key: y, steps: 5000, sleepMin: 410 }]).days[y].steps, 5000);
  assert.equal(next.days[y2].sleepMin, 480); // typed-in sleep wins
  assert.equal(next.days[gone], undefined);
  assert.equal(next.xp, hs.xp);
  assert.equal(withPastHealth(next, [{ key: y, steps: hs.settings.stepGoal + 100, sleepMin: 410 }]), next); // nothing new: same object
}

// typed-in steps: above the watch they hold until it counts more ('floor'), below it all day ('fixed')
{
  const base = { water: [], food: [], sets: [], games: [], bonusGameMin: 0 };
  const floor = { ...base, steps: 3185, stepsManual: 'floor' as const };
  const fixed = { ...base, steps: 3000, stepsManual: 'fixed' as const };
  assert.deepEqual(syncedSteps(floor, 2032), { steps: 3185, stepsManual: 'floor' }); // the watch is still behind
  assert.deepEqual(syncedSteps(floor, 3185), { steps: 3185, stepsManual: 'floor' });
  assert.deepEqual(syncedSteps(floor, 3300), { steps: 3300, stepsManual: undefined }); // caught up: the watch takes over
  assert.deepEqual(syncedSteps(fixed, 9000), { steps: 3000, stepsManual: 'fixed' });
  assert.deepEqual(syncedSteps({ ...base, steps: 500 }, 400), { steps: 400, stepsManual: undefined }); // not typed: the watch's number
  assert.deepEqual(syncedSteps(floor, null), { steps: 3185, stepsManual: 'floor' }); // no reading: as it was
  assert.equal(shownSteps(floor, 2032), 3185);
  assert.equal(shownSteps(fixed, 9000), 3000);
  assert.equal(shownSteps(base, 1200), 1200);
  assert.equal(shownSteps({ ...base, steps: 800 }, null), 800);
  assert.equal(shownSteps(base, null), undefined);
  // past days: a typed-in number lower than the watch stays, a 'floor' one gives way once the watch passes it
  const hs = defaultState();
  const y = dayKey(addDays(new Date(), -1));
  const y2 = dayKey(addDays(new Date(), -2));
  hs.days[y] = { ...fixed };
  hs.days[y2] = { ...floor };
  const next = withPastHealth(hs, [
    { key: y, steps: 9000, sleepMin: null },
    { key: y2, steps: 4000, sleepMin: null },
  ]);
  assert.equal(next.days[y].steps, 3000);
  assert.equal(next.days[y].stepsManual, 'fixed');
  assert.ok(!next.days[y].stepGoalHit);
  assert.equal(next.days[y2].steps, 4000);
  assert.equal(next.days[y2].stepsManual, undefined);
  assert.equal(withPastHealth(next, [{ key: y, steps: 9000, sleepMin: null }]), next);
  assert.ok(usedOn({ ...base, steps: 100, stepsManual: 'floor' })); // typing steps in is using the app
}

// review fixes: no instant contract wins, back-dated entries and edited times don't feed the game rules
{
  const k = dayKey();
  const signedAt = Date.now();
  const base = defaultState();
  const doneEarlier = { id: 'a', title: 'a', done: true, createdAt: 0, doneAt: signedAt - 60_000 };
  const doneLater = { id: 'b', title: 'b', done: true, createdAt: 0, doneAt: signedAt + 60_000 };
  const c = { week: k, from: k, signedAt, goal: 'tasks' as const, target: 8, stake: 500, status: 'open' as const };
  assert.equal(contractProgress({ ...base, tasks: [doneEarlier, doneLater] }, c, new Date(signedAt + 120_000)), 1);
  // back-dated water: counts for the day's total, not for the water contract or Captain Dehydration
  const lateDay = { water: [{ id: 'w', ml: base.settings.waterGoalMl, at: 0, late: true }], food: [], sets: [], games: [], bonusGameMin: 0 };
  assert.equal(waterMl(lateDay), base.settings.waterGoalMl);
  assert.ok(!WEAKNESS.dehydration.hit(base, lateDay, k));
  const wc = { ...c, goal: 'water' as const, target: 1, signedAt: 0 };
  assert.equal(contractProgress({ ...base, days: { [k]: lateDay } }, wc), 0);
  // before 08:00: coffee and food times can be edited, so they don't count; back-dated water doesn't either
  const early = atTime(new Date(), 0, 7, 30).getTime();
  const coffeeOnly = { water: [], food: [], sets: [], games: [], bonusGameMin: 0, coffee: [{ id: 'c', mg: 80, at: early }] };
  assert.ok(!WEAKNESS.snooze.hit(base, coffeeOnly, k));
  assert.ok(!WEAKNESS.snooze.hit(base, { ...coffeeOnly, water: [{ id: 'w', ml: 250, at: early, late: true }] }, k));
  assert.ok(WEAKNESS.snooze.hit(base, { ...coffeeOnly, water: [{ id: 'w', ml: 250, at: early }] }, k));
  // The Binge Necromancer: today isn't within budget until it's over
  assert.ok(!WEAKNESS.binge.hit(base, lateDay, k));
  assert.ok(WEAKNESS.binge.hit(base, lateDay, dayKey(addDays(new Date(), -1))));
}

// ---- cluster D ----
{
  const blank = () => ({ water: [], food: [], sets: [], games: [], bonusGameMin: 0 });
  const H = 3_600_000;
  const at = (key: string, h: number, m = 0) => new Date(`${key}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`).getTime();

  // caffeine curve: halves every 5 h, only cups already drunk count, last night's late cup still lingers a little
  assert.ok(Math.abs(caffeineLeft([{ mg: 100, at: 0 }], 5 * H) - 50) < 0.01);
  assert.ok(Math.abs(caffeineLeft([{ mg: 100, at: 0 }], 10 * H) - 25) < 0.01);
  assert.equal(caffeineLeft([{ mg: 100, at: 10 * H }], 5 * H), 0);
  assert.equal(bedtimeOn('2026-06-10', 23), at('2026-06-10', 23));
  assert.equal(bedtimeOn('2026-06-10', 1), at('2026-06-11', 1));
  const cs = defaultState();
  cs.settings.sleepHour = 23;
  cs.days['2026-06-10'] = { ...blank(), coffee: [{ id: 'c1', mg: 90, at: at('2026-06-10', 15) }] };
  const bed = bedtimeCaffeine(cs, '2026-06-10');
  assert.ok(Math.abs(bed - 90 * 0.5 ** (8 / 5)) < 0.01, String(bed));
  cs.days['2026-06-09'] = { ...blank(), coffee: [{ id: 'c0', mg: 90, at: at('2026-06-09', 22) }] };
  assert.ok(bedtimeCaffeine(cs, '2026-06-10') > bed && bedtimeCaffeine(cs, '2026-06-10') < bed + 5);
  assert.equal(caffeineCurve(cs, '2026-06-10', 6, 24).length, 18 * 4 + 1);

  // step 6 last call: the latest cup that still leaves at most BED_MG at bedtime, cups so far included
  assert.equal(BED_MG, 50);
  assert.equal(lastCallClock(23, 90), '18:45', '90 mg cups, bed at 23: about 4.2 h before');
  assert.equal(lastCallClock(1, 90), '20:45', 'bed after midnight');
  const lc = defaultState();
  lc.settings.sleepHour = 23;
  assert.equal(lastCallOn(lc, '2026-06-12'), at('2026-06-12', 18, 45), 'no coffee yet: the plain last call');
  lc.days['2026-06-12'] = { ...blank(), coffee: [{ id: 'm', mg: 90, at: at('2026-06-12', 8) }] };
  const call = lastCallOn(lc, '2026-06-12') as number;
  const bedLc = bedtimeOn('2026-06-12', 23);
  const withCup = (t: number) => caffeineLeft([...cupsAround(lc, '2026-06-12'), { mg: 90, at: t }], bedLc);
  assert.ok(call < at('2026-06-12', 18, 45), 'the morning cup moves last call earlier');
  assert.ok(withCup(call) <= BED_MG && withCup(call + 5 * 60_000) > BED_MG, 'the latest 5-minute mark under the line');
  assert.equal(lastCallText(lc, '2026-06-12', at('2026-06-12', 9)), `Next cup fine until ${fmtTime(call)}.`);
  assert.equal(lastCallText(lc, '2026-06-12', at('2026-06-12', 17, 30)), `Last call was ${fmtTime(call)}. Decaf from here.`);
  // two big morning cups leave so little room that the sum lands before the second cup (04:00): no such time is shown
  const big = defaultState();
  big.settings.sleepHour = 23;
  big.days['2026-06-12'] = { ...blank(), coffee: [8, 10].map((h) => ({ id: `b${h}`, mg: 150, at: at('2026-06-12', h) })) };
  assert.ok((lastCallOn(big, '2026-06-12') as number) < at('2026-06-12', 10));
  assert.equal(lastCallText(big, '2026-06-12', at('2026-06-12', 10, 30)), 'Last call has passed. Decaf from here.');
  // two ordinary morning cups still leave room for an early-afternoon one
  const two = defaultState();
  two.settings.sleepHour = 23;
  two.days['2026-06-12'] = { ...blank(), coffee: [8, 10].map((h) => ({ id: `t${h}`, mg: 90, at: at('2026-06-12', h) })) };
  assert.ok(lastCallText(two, '2026-06-12', at('2026-06-12', 10, 30))!.startsWith('Next cup fine until 13:'));
  assert.equal(lastCallText(lc, '2026-06-12', at('2026-06-12', 23, 30)), null, 'bedtime: nothing to say');
  lc.days['2026-06-12'].coffee = [1, 2, 3].map((n) => ({ id: `e${n}`, mg: 90, at: at('2026-06-12', 20) }));
  assert.equal(lastCallOn(lc, '2026-06-12'), null);
  assert.equal(lastCallText(lc, '2026-06-12', at('2026-06-12', 21)), 'Last call has passed. Decaf from here.');

  // air pressure: the biggest 24 h fall ending inside each day; rising pressure = 0; no earlier reading = null
  const times: string[] = [];
  const hPa: number[] = [];
  for (let d = 1; d <= 3; d++) {
    for (let h = 0; h < 24; h++) {
      times.push(`2026-06-0${d}T${String(h).padStart(2, '0')}:00`);
      hPa.push(d === 1 ? 1015 : d === 2 ? 1020 : 1020 - h * 0.5); // day 2 rises, day 3 falls through the day
    }
  }
  const drops = pressureDrops(times, hPa);
  assert.equal(drops['2026-06-01'], null);
  assert.equal(drops['2026-06-02'], 0);
  assert.equal(drops['2026-06-03'], 11.5);

  // cycle: phases from the period starts, per-phase averages and kind notes (no streaks, no roasts)
  const cy = defaultState();
  const cnow = new Date(2026, 5, 30, 12);
  for (let i = 0; i < 59; i++) {
    const date = addDays(new Date(2026, 4, 1, 12), i);
    const key = dayKey(date);
    const cycleDay = i < 28 ? i + 1 : i - 27;
    const period = cycleDay <= 4;
    const luteal = cycleDay >= 17;
    cy.days[key] = {
      ...blank(),
      period: period ? { flow: 'medium', symptoms: [] } : undefined,
      sleepMin: luteal ? 480 : 420,
      energy: luteal ? 2 : 4,
    };
  }
  // counted back from the next period (29 May, then the predicted 26 June)
  assert.equal(phaseOn(cy, '2026-05-01'), 'period');
  assert.equal(phaseOn(cy, '2026-05-08'), 'follicular');
  assert.equal(phaseOn(cy, '2026-05-15'), 'ovulation'); // 14 days before
  assert.equal(phaseOn(cy, '2026-05-20'), null); // 9 days before: between mid-cycle and the last week, unnamed
  assert.equal(phaseOn(cy, '2026-05-24'), 'luteal'); // the week before
  assert.equal(phaseOn(cy, '2026-06-20'), 'luteal'); // the week before the predicted start
  assert.equal(phaseOn(cy, '2026-06-27'), null); // past the predicted start with nothing logged: late, not "the week before" forever
  assert.equal(phaseOn(defaultState(), '2026-05-20'), null);
  // a 35-day cycle: mid-cycle is still about 14 days before the next period, not cycle day 14–16
  const long = defaultState();
  for (const k of ['2026-01-01', '2026-01-02', '2026-02-05', '2026-02-06']) long.days[k] = { ...blank(), period: { flow: 'medium', symptoms: [] } };
  assert.equal(phaseOn(long, '2026-01-22'), 'ovulation');
  assert.equal(phaseOn(long, '2026-01-15'), 'follicular');
  assert.equal(phaseOn(long, '2026-02-01'), 'luteal');
  const stats = cycleStats(cy, cnow)!;
  assert.equal(stats.cycles, 1);
  assert.equal(stats.phases.find((p) => p.phase === 'luteal')?.sleepMin, 480);
  const notes = cycleNotes(stats);
  assert.ok(notes.some((n) => n.id === 'sleep_luteal' && n.text.includes('more')), JSON.stringify(notes));
  assert.ok(notes.some((n) => n.id === 'energy_luteal' && n.text.includes('lower')));
  for (const n of notes) assert.ok(!/streak|in a row|lazy|excuse/i.test(n.text), n.text);
  assert.equal(cycleStats(defaultState(), cnow), null);
  assert.ok(insights(cy, cnow).some((x) => x.id === 'cycle_body'), JSON.stringify(insights(cy, cnow).map((x) => x.id)));

  // symptom detective: short-sleep nights line up with the headache; wording is "tends to", never "causes"
  const dt = defaultState();
  dt.trackers = [
    { id: 'hd', name: 'Headache', emoji: 'x', kind: 'scale', createdAt: 0 },
    { id: 'al', name: 'Allergy', emoji: 'y', kind: 'check', createdAt: 0 },
  ];
  for (let i = 1; i <= 30; i++) {
    const key = dayKey(addDays(cnow, -i));
    const short = i % 2 === 0;
    const drop = i % 3 === 0;
    dt.days[key] = {
      ...blank(),
      sleepMin: short ? 330 : 470,
      weather: { max: 15, min: 8, rainMm: 0, sunMin: 100, code: 3, pressureDrop: drop ? 8 : 1 },
      tracks: { hd: short ? 4 : 1, al: drop ? 1 : 0 },
    };
  }
  const hd = detective(dt, dt.trackers[0], cnow);
  assert.equal(hd.logged, 30);
  assert.equal(hd.clues[0]?.id, 'short_sleep', JSON.stringify(hd.clues));
  assert.ok(hd.clues[0].text.includes('higher'));
  const al = detective(dt, dt.trackers[1], cnow);
  assert.equal(al.clues[0]?.id, 'pressure', JSON.stringify(al.clues));
  assert.ok(al.clues[0].detail.startsWith('100% vs 0%'));
  for (const c of [...hd.clues, ...al.clues]) assert.ok(!/caus/i.test(c.text), c.text);
  assert.equal(detective(defaultState(), dt.trackers[0], cnow).clues.length, 0);

  // self-experiments: the days it was done vs the two weeks before; any days count, never "in a row"
  const ex = defaultState();
  const doneDays = ['2026-06-15', '2026-06-17', '2026-06-18', '2026-06-19', '2026-06-21', '2026-06-23', '2026-06-24', '2026-06-26'];
  const nightAfter = (k: string) => dayKey(addDays(new Date(`${k}T12:00`), 1));
  for (let i = 0; i < 30; i++) {
    const key = dayKey(addDays(new Date(2026, 5, 1, 12), i));
    ex.days[key] = { ...blank(), sleepMin: doneDays.map(nightAfter).includes(key) ? 480 : 420 };
  }
  const exp = { id: 'e', title: 'No screens after 22:00', emoji: 'x', metric: 'sleepMin' as const, from: '2026-06-15', days: 14, done: doneDays, startedAt: 0 };
  assert.deepEqual([experimentDays(exp)[0], experimentDays(exp)[13]], ['2026-06-15', '2026-06-28']);
  const done = experimentResult(ex, exp, new Date(2026, 5, 30, 12));
  assert.ok(done.ended);
  assert.equal(done.day, 14);
  assert.equal(done.during, 480);
  assert.equal(done.before, 420);
  assert.equal(done.verdict, 'better');
  assert.ok(verdictText(exp, done).startsWith('Looks like it helped'), verdictText(exp, done));
  // a gap as big as the noise around it is "no clear difference", not a win
  const noisy = structuredClone(ex);
  for (let i = 0; i < 30; i++) {
    const key = dayKey(addDays(new Date(2026, 5, 1, 12), i));
    const during = doneDays.map(nightAfter).includes(key);
    noisy.days[key] = { ...blank(), sleepMin: (during ? 435 : 420) + (i % 2 ? 45 : -45) };
  }
  assert.equal(experimentResult(noisy, exp, new Date(2026, 5, 30, 12)).verdict, 'same');
  // sick days count on neither side
  const sick = startPause(structuredClone(ex), 'sick', 7, '2026-06-17');
  assert.equal(experimentResult(sick, exp, new Date(2026, 5, 30, 12)).nDuring, 3); // 17–23 June paused: 15, 24 and 26 are left
  const mid = experimentResult(ex, exp, new Date(2026, 5, 20, 12));
  assert.ok(!mid.ended);
  assert.equal(mid.day, 6);
  assert.equal(experimentResult(ex, { ...exp, done: ['2026-06-15'] }, new Date(2026, 5, 30, 12)).verdict, 'unknown');
  for (const k of ['experimentStarted', 'experimentDone', 'experimentStopped'] as const) {
    for (const t of [...LINES[k].mild, ...LINES[k].savage]) assert.ok(!/streak|in a row/i.test(t), t);
  }
}

// ---- cluster G ----
{
  const at = new Date(2027, 0, 12, 10); // a Tuesday morning
  const k = dayKey(at);
  const empty = () => ({ water: [], food: [], sets: [], games: [], bonusGameMin: 0 });
  const base = defaultState();
  base.onboarded = true;
  base.days[k] = empty();
  const withWater = (s: typeof base, n: number, late = false) => {
    const d = { ...s.days[k], water: [...s.days[k].water] };
    for (let i = 0; i < n; i++) d.water.push({ id: `w${d.water.length}`, ml: 250, at: at.getTime(), ...(late ? { late: true } : {}) });
    return { ...s, days: { ...s.days, [k]: d } };
  };

  // what was just logged: new glasses by their place in the day; back-dated ones never count
  const two = withWater(base, 2);
  assert.deepEqual(logEvents(base, two, at).map((e) => e.key), ['water:0', 'water:1']);
  assert.equal(logEvents(base, withWater(base, 1, true), at).length, 0);
  assert.equal(logEvents(two, two, at).length, 0);

  // crits: once per logged thing, at most 3 a day, damage 15–90, and the boss takes it
  assert.equal(critDamage(1), 15);
  assert.equal(critDamage(20), 60);
  assert.equal(critDamage(100), 90);
  let s = base;
  for (let i = 0; i < 300; i++) s = rollCritters(s, withWater(s, 1), at).state;
  const crits = s.days[k].critKeys ?? [];
  assert.equal(crits.length, MAX_CRITS, 'a long day of glasses crits exactly 3 times');
  assert.equal(s.days[k].critDamage, 3 * critDamage(1));
  assert.equal(bossFor(s, at).damage - bossFor({ ...s, days: { ...s.days, [k]: { ...s.days[k], critDamage: 0 } } }, at).damage, 45);

  // undo + re-log gives the same roll: no fresh crit or fly for the same glass
  const first = crits[0];
  const idx = Number(first.split(':')[1]);
  let c = base;
  for (let i = 0; i <= idx; i++) c = rollCritters(c, withWater(c, 1), at).state;
  assert.ok(c.days[k].critKeys?.includes(first));
  const undone = { ...c, days: { ...c.days, [k]: { ...c.days[k], water: c.days[k].water.slice(0, -1) } } };
  const relogged = rollCritters(undone, withWater(undone, 1), at);
  assert.equal(relogged.state.days[k].critKeys?.length, c.days[k].critKeys?.length);
  assert.ok(!relogged.msgs.some((m) => m.key === 'critHit'));

  // flies: at most 2 a day, never while one is still buzzing; same roll for the same glass
  let f = base;
  let spawned = 0;
  for (let i = 0; i < 400; i++) {
    const r = rollCritters(f, withWater(f, 1), at);
    spawned += r.msgs.filter((m) => m.key === 'flySpawn').length;
    f = r.state;
    if (f.pendingFly) f = { ...f, pendingFly: { ...f.pendingFly, until: 0 } }; // it flew off
  }
  assert.equal(spawned, MAX_SPAWNS);
  assert.equal(f.days[k].flySpawns?.length, MAX_SPAWNS);
  const busy = { ...base, pendingFly: { id: 'house_fly', until: at.getTime() + 60_000 } };
  for (let i = 0; i < 100; i++) assert.ok(!rollCritters(busy, withWater(busy, i + 1), at).msgs.some((m) => m.key === 'flySpawn'));

  // catching: into the jar with coins; a legendary also bombs the boss; too late = gone
  const caught = catchFly({ ...base, pendingFly: { id: 'house_fly', until: at.getTime() + 1000 } }, at.getTime());
  assert.equal(caught.key, 'flyCaught');
  assert.equal(caught.state.flies?.house_fly?.count, 1);
  assert.equal(caught.state.coins, base.coins + 10);
  assert.ok(caught.newSpecies);
  assert.equal(catchFly(caught.state, at.getTime()).key, null);
  const legend = catchFly({ ...base, pendingFly: { id: 'golden_scarab', until: at.getTime() + 1000 } }, at.getTime());
  assert.equal(legend.key, 'flyLegendary');
  assert.equal(Object.values(legend.state.bossBombs).reduce((a, b) => a + b, 0), 100);
  const late = catchFly({ ...base, pendingFly: { id: 'house_fly', until: at.getTime() - 1 } }, at.getTime());
  assert.equal(late.key, 'flyGone');
  assert.equal(late.state.pendingFly, null);

  // no fly is about food: logging food only ever turns up the "log anything" fly
  const ctx = { now: at, day: empty(), prevDay: empty(), season: undefined, noHabits: true };
  const foodFlies = FLIES.filter((x) => x.when({ kind: 'food', key: 'food:0', at: at.getTime(), xp: 1 }, ctx)).map((x) => x.id);
  assert.deepEqual(foodFlies, ['house_fly']);
  for (const x of FLIES) assert.ok(!/food|meal|\b(eat|eats|ate|eating)\b|kcal|calor|weigh(?!ts)|body/i.test(`${x.name} ${x.hint}`), x.id);
  assert.equal(new Set(FLIES.map((x) => x.id)).size, FLIES.length);
  // the same logged thing always rolls the same
  const e = { kind: 'water' as const, key: 'water:3', at: at.getTime(), xp: 1 };
  assert.equal(flyFor(e, ctx)?.id, flyFor(e, ctx)?.id);

  // diary: a page per 10 quests (a total), kind on low days, never food/body
  const dd = defaultState();
  dd.onboarded = true;
  dd.counters.quests = 9;
  assert.ok(!pageDue(dd));
  dd.counters.quests = 25;
  const y = dayKey(addDays(at, -1));
  dd.days[y] = { ...empty(), water: [{ id: 'a', ml: 2800, at: 0 }], food: [{ id: 'f', name: 'Pizza', kcal: 900, protein: 30, at: 0 }], steps: 9000, sleepMin: 340 };
  dd.bodyLog = [{ id: 'b', at: 0, weight: 70 }];
  const unlocked = unlockPages(dd, at);
  assert.equal(unlocked.added, 2);
  assert.equal(unlocked.state.diary?.length, 2);
  assert.ok(!pageDue(unlocked.state));
  for (const page of unlocked.state.diary ?? []) {
    assert.ok(!page.text.includes('{'), page.text);
    assert.ok(!/kcal|calor|pizza|food|meal|ate |eat|weigh|\bkg\b|body/i.test(page.text), page.text);
    assert.equal(page.day, y);
  }
  assert.ok(/2\.8 L/.test(unlocked.state.diary![0].text), unlocked.state.diary![0].text);
  const low = { ...dd, days: { ...dd.days, [y]: { ...dd.days[y], moods: [{ id: 'm', level: 1 as const, emotions: [], at: 0 }] } } };
  assert.ok(kindDay(low, y));
  const kindPage = writePage(low, 1, at).text;
  assert.ok(/quieter day|running low/.test(kindPage), kindPage);
  assert.ok(!/spite|petition|couch|cactus/.test(kindPage), kindPage);
  assert.deepEqual(writePage(dd, 1, at), writePage(dd, 1, at));
  // away (a trip, a holiday) is time off, not a low day: no "running low" on its page
  const away = { ...dd, pauses: [{ from: y, to: y, kind: 'away' as const }] };
  assert.ok(kindDay(away, y));
  for (let n = 1; n <= 6; n++) {
    const t = writePage(away, n, at).text;
    assert.ok(/away|off duty/i.test(t) && !/running low|quieter day/.test(t), t);
  }
  // ...unless the mood was low as well
  assert.ok(/quieter day|running low/.test(writePage({ ...low, pauses: away.pauses }, 1, at).text));

  // the day's web: stable, from water/habits/quests/training/sleep/tasks/gaming/mood, never the body
  const w = defaultState();
  w.days[k] = { ...empty(), water: Array.from({ length: 7 }, (_, i) => ({ id: `x${i}`, ml: 250, at: 0 })), sleepMin: 450, habits: ['h1', 'h2'], questsDone: ['q'], moods: [{ id: 'm', level: 4, emotions: [], at: 0 }] };
  const wp = webParams(w, k);
  assert.equal(wp.threads, 7);
  assert.equal(wp.rings, 4);
  assert.equal(wp.dew, 8);
  assert.equal(wp.mood, 4);
  assert.ok(!wp.empty);
  assert.deepEqual(webParams({ ...w, bodyLog: [{ id: 'b', at: 0, weight: 60, waist: 70 }] }, k), wp);
  const g = webGeometry(wp, 200, k);
  assert.equal(g.segs.length, wp.threads + wp.rings * wp.threads + wp.frays);
  assert.equal(g.dots.length, wp.dew + wp.catches);
  assert.ok(g.segs.every((x) => [x.x1, x.y1, x.x2, x.y2, x.w].every(Number.isFinite)));
  assert.deepEqual(webGeometry(wp, 200, k), g);
  assert.equal(webParams(defaultState(), k).empty, true);
  assert.deepEqual(webDays(w, 28, at), [k]);
}

// ---- cluster A ----
{
  const empty = () => ({ water: [], food: [], sets: [], games: [], bonusGameMin: 0 });
  const monday = new Date(2027, 0, 11); // a Monday
  const mk = (n: number) => dayKey(addDays(monday, n));
  // 10 days of 100 XP before the week: pace 100/day -> 100 x 7 x 1.1 = 770 -> 750 HP
  const paced = () => {
    const st = defaultState();
    for (let i = 1; i <= 10; i++) st.days[mk(-i)] = { ...empty(), xpEarned: 100 };
    return st;
  };
  assert.equal(bossFor(paced(), monday).maxHp, 750);

  // pause: a range, capped at 7 days a calendar month, ended early
  let ps = startPause(defaultState(), 'sick', 3, '2027-03-10');
  assert.ok(pausedOn(ps, '2027-03-11') && pausedOn(ps, '2027-03-12') && !pausedOn(ps, '2027-03-13'));
  ps = startPause(ps, 'away', 10, '2027-03-10'); // changing it re-measures from today
  assert.equal(ps.pauses?.length, 1);
  assert.equal(ps.pauses?.[0].to, '2027-03-16');
  assert.equal(startPause(ps, 'sick', 2, '2027-03-20'), ps, "March's 7 days are used up");
  ps = endPause(ps, '2027-03-12');
  assert.ok(pausedOn(ps, '2027-03-12') && !pausedOn(ps, '2027-03-13'), "I'm back: today stays paused, tomorrow counts");
  assert.ok(ps.pauses?.[0].endedAt);
  assert.equal(endPause(ps, '2027-03-12'), ps, 'ending twice does nothing');
  const sameDay = endPause(startPause(defaultState(), 'sick', 2, '2027-03-10'), '2027-03-10');
  assert.ok(pausedOn(sameDay, '2027-03-10') && !pausedOn(sameDay, '2027-03-11'), 'the loophole: ending on the first day keeps it');
  // across a month boundary each month has its own cap
  assert.equal(startPause(defaultState(), 'away', 4, '2027-03-30').pauses?.[0].to, '2027-04-02');

  // paused days: left out of the pace, shrink the boss, one quest a day, no league demotion
  const pz = paced();
  pz.days[mk(-11)] = { ...empty(), xpEarned: 100 };
  pz.days[mk(-12)] = { ...empty(), xpEarned: 100 };
  pz.days[mk(-4)] = { ...empty(), xpEarned: 0 };
  pz.pauses = [{ from: mk(-4), to: mk(-4), kind: 'sick' }];
  assert.equal(paceOf(pz, monday), 100);
  pz.pauses.push({ from: mk(0), to: mk(1), kind: 'away' });
  assert.equal(pausedInWeek(pz, monday), 2);
  assert.equal(bossFor(pz, monday, addDays(monday, 6)).maxHp, 550); // 750 x 5/7 = 536 -> 550
  assert.equal(bossFor(pz, monday, addDays(monday, -1)).maxHp, 750, 'paused days still ahead: no shrink yet');
  assert.equal(bossFor(pz, monday, monday).maxHp, 650, 'Monday paused so far: 750 x 6/7 = 643 -> 650');
  pz.days[mk(0)] = { ...empty(), quests: ['water_goal', 'meals', 'mood'] };
  assert.equal(questsFor(pz, addDays(monday, 0)).length, 1);
  const lgA = defaultState();
  lgA.league = newLeague(2, mk(0));
  assert.equal(settle(lgA).tier, 1, 'last place demotes');
  lgA.pauses = [{ from: mk(0), to: mk(2), kind: 'sick' }];
  assert.equal(settle(lgA).tier, 2, '3 sick days: no demotion');

  // weak spot: no water goal all week -> one quest aims at water, in slot 2
  const ws = defaultState();
  for (let i = 1; i <= 5; i++) ws.days[mk(-i)] = empty();
  assert.equal(weakSpot(ws, monday), 'water');
  const wp = pickQuestsWithFocus(ws, monday);
  assert.ok(wp.focus && WEAK_SPOT_QUESTS.water.includes(wp.focus.id));
  assert.equal(wp.ids[1], wp.focus!.id);
  assert.equal(wp.ids.length, 3);
  assert.equal(weakSpot(defaultState(), monday), null, 'too little data');

  // quest swap: once a day, only quests with no progress, to one with no progress
  const rq = defaultState();
  const tue = new Date(2027, 0, 12, 12);
  rq.days[dayKey(tue)] = { ...empty(), quests: ['water_goal', 'meals', 'mood'] };
  const swap = rerollFor(rq, 'meals', tue);
  assert.ok(swap && !['water_goal', 'meals', 'mood'].includes(swap));
  rq.days[dayKey(tue)].water = [{ id: 'w', ml: 250, at: tue.getTime() }];
  assert.equal(rerollFor(rq, 'water_goal', tue), null, 'already started');
  rq.days[dayKey(tue)].questRerolled = true;
  assert.equal(rerollFor(rq, 'meals', tue), null, 'once a day');

  // rage: below half HP the boss gets a second weakness from the next day on
  let rageMonday: Date | null = null;
  for (let i = 0; i < 400 && !rageMonday; i++) {
    const m = addDays(monday, 7 * i);
    const id = bossFor(defaultState(), m).id;
    if (['doomscroll', 'snooze', 'sugar_baron', 'procrastinator'].includes(id) && rageWeaknessOf(id, dayKey(m)) === 'dehydration') rageMonday = m;
  }
  assert.ok(rageMonday, 'a week whose rage weakness is water');
  const rm = rageMonday!;
  const rk = (n: number) => dayKey(addDays(rm, n));
  const rs = defaultState();
  rs.settings.adaptiveWater = false; // the plain goal, whatever the day's plan says
  for (let i = 1; i <= 10; i++) rs.days[rk(-i)] = { ...empty(), xpEarned: 100 };
  const wet = () => [{ id: 'w', ml: rs.settings.waterGoalMl, at: new Date(`${rk(1)}T12:00`).getTime() }];
  rs.days[rk(0)] = { ...empty(), xpEarned: 100 };
  rs.days[rk(1)] = { ...empty(), xpEarned: 100, water: wet() };
  assert.equal(bossFor(rs, rm).bonus, 0, 'not enraged yet: water does nothing');
  rs.days[rk(0)].xpEarned = 400; // 400 of 750 HP on Monday: enraged
  const raged = bossFor(rs, rm);
  assert.equal(raged.ragedOn, rk(0));
  assert.ok(raged.rageWeakness);
  assert.equal(raged.bonus, 50);
  assert.equal(raged.damage, 400 + 100 + 50);

  // overkill: waves of henchmen (15 % of the boss's HP each)
  const ok = paced();
  ok.days[mk(0)] = { ...empty(), xpEarned: 2000 };
  const okb = bossFor(ok, monday);
  assert.equal(okb.minionHp, 110);
  assert.equal(okb.minions, Math.floor((okb.damage - 750) / 110));
  assert.equal(okb.minionProgress, okb.damage - 750 - okb.minions * 110);

  // the Couch King: after all 8 bosses fell in earlier weeks, once, 1.5x HP, every weakness
  const fk = paced();
  BOSSES.forEach((b, i) => (fk.bossesDefeated[dayKey(addDays(monday, -7 * (i + 1)))] = b.id));
  assert.ok(finalBossDue(fk, mk(0)));
  assert.ok(!finalBossDue({ ...fk, bossesDefeated: { [mk(-7)]: 'binge' } }, mk(0)));
  fk.finalBossWeek = mk(0);
  assert.ok(!finalBossDue(fk, mk(7)), 'only once');
  const king = bossFor(fk, monday);
  assert.equal(king.id, FINAL_BOSS.id);
  assert.equal(king.maxHp, 1150); // 750 x 1.5 = 1125 -> 1150
  assert.equal(king.weakness, "any boss's weakness");
  assert.ok(`taunt_${FINAL_BOSS.id}` in LINES);

  // ranks: a boss back after 8 weeks is "II"
  const rk2 = defaultState();
  rk2.days[mk(-56)] = { ...empty(), xpEarned: 50 };
  assert.ok(bossFor(rk2, monday).name.endsWith(' II'));
  assert.equal(bossFor(rk2, monday).rank, 2);
  assert.equal(bossFor(defaultState(), monday).rank, 1);

  // bestiary: fights since the first XP, wins, fastest kill, lore after a win
  const bs = defaultState();
  bs.days[mk(-14)] = { ...empty(), xpEarned: 50 };
  const first = bossFor(bs, addDays(monday, -14));
  bs.bossesDefeated[mk(-14)] = first.id;
  bs.bossKilledAt = { [mk(-14)]: new Date(`${mk(-10)}T18:30`).getTime() };
  const row = bestiary(bs, monday).find((r) => r.id === first.id)!;
  assert.equal(row.wins, 1);
  assert.equal(row.fights, 1);
  assert.equal(row.fastest?.time, '18:30');
  assert.equal(row.lore, LORE[first.id]);
  assert.equal(bestiary(bs, monday).filter((r) => r.fights > 0).length, 3, 'three weeks, three bosses');
  assert.equal(lastKillDay(bs, first.id, mk(0)), WEEKDAYS_LONG[new Date(`${mk(-10)}T12:00`).getDay()]);
  assert.equal(lastKillDay(bs, first.id, mk(-14)), null);
}

// ---------- step 2 game ----------
{
  const empty = () => ({ water: [], food: [], sets: [], games: [], bonusGameMin: 0 });
  const mood = (at: Date, level: 1 | 2 | 3 | 4 | 5 = 3) => ({ id: `m${at.getTime()}`, level, emotions: [], at: at.getTime() });

  // reduced days get one gentle quest, never the seasonal "train or walk 8 000 steps"
  const sat = new Date(2026, 9, 24, 12); // first day of spooky season
  const sk = dayKey(sat);
  const sick = defaultState();
  sick.days[sk] = { ...empty(), quests: ['hw_crypt', 'water_goal', 'meals'] };
  sick.pauses = [{ from: sk, to: sk, kind: 'sick' }];
  assert.ok(reducedDay(sick, sk));
  assert.deepEqual(questsFor(sick, sat).map((q) => q.id), ['hw_seance']);
  sick.days[sk].moods = [mood(sat)];
  assert.equal(gentleQuestFor(sick, sat), 'sip', 'the séance is already met: no instant chest');
  sick.days[sk].questReduced = 'hw_seance';
  assert.deepEqual(questsFor(sick, sat).map((q) => q.id), ['hw_seance'], 'fixed once picked');
  const lowNov = defaultState();
  const nov = new Date(2026, 10, 10, 12);
  lowNov.days[dayKey(nov)] = { ...empty(), quests: ['steps_hard', 'water_goal', 'meals'], energy: 1 };
  assert.equal(gentleQuestFor(lowNov, nov), 'checkin');
  // every quest done before the day turned reduced: the count stays frozen at three
  const allDone = defaultState();
  allDone.days[sk] = { ...empty(), quests: ['hw_crypt', 'water_goal', 'meals'], questsDone: ['hw_crypt', 'water_goal', 'meals'], questsAllDone: true };
  allDone.pauses = [{ from: sk, to: sk, kind: 'away' }];
  assert.ok(!reducedDay(allDone, sk));
  assert.equal(questsFor(allDone, sat).length, 3);
  // the gentle quests never turn up on an ordinary day
  for (let i = 0; i < 60; i++) {
    const d = addDays(nov, i);
    assert.ok(!pickQuests(defaultState(), d).some((id) => id === 'checkin' || id === 'sip'));
  }

  // goal snapshots: a finished day keeps the goals it had
  const gs = defaultState();
  gs.settings.adaptiveWater = false;
  const gMon = new Date(2027, 1, 1, 12); // a Monday
  const gk = (n: number) => dayKey(addDays(gMon, n));
  for (let i = 0; i < 4; i++) gs.days[gk(i)] = { ...empty(), water: [{ id: `w${i}`, ml: 2000, at: addDays(gMon, i).getTime() }] };
  gs.habits = [{ id: 'old', name: 'Old', emoji: 'x', days: [], remindHour: null, createdAt: addDays(gMon, -30).getTime() }];
  const frozen = withGoals(gs, gk(3));
  assert.ok(frozen.days[gk(0)].goals && frozen.days[gk(2)].goals && !frozen.days[gk(3)].goals, 'past days only, never today');
  assert.equal(withGoals(frozen, gk(3)), frozen, 'nothing left to freeze');
  assert.deepEqual(goalsOn(frozen, gk(0)), { water: 2500, steps: 8000, gaming: 120, protein: 120, workout: 'Push', habits: ['old'] });
  // later: a lower water goal, a new habit, a different plan, a bigger gaming budget
  const edited = { ...frozen, settings: { ...frozen.settings, waterGoalMl: 1500, gamingBudgetMin: 300 }, plan: { ...frozen.plan, 1: null } };
  edited.habits = [...edited.habits, { id: 'new', name: 'New', emoji: 'y', days: [], remindHour: null, createdAt: addDays(gMon, 3).getTime() }];
  assert.equal(waterGoalFor(edited, gk(0)), 2500, "last Monday's water goal stays 2.5 L");
  assert.ok(!waterGoalMet(edited, edited.days[gk(0)], gk(0)), '2 L of 2.5 L is still a miss');
  assert.equal(waterGoalFor(edited, gk(3)), 1500, 'today follows the new setting');
  assert.equal(workoutFor(edited, addDays(gMon, 0))?.name, 'Push', 'the plan it had');
  assert.equal(workoutFor(edited, addDays(gMon, 7)), null, 'next Monday follows the new plan');
  assert.equal(gamingBudgetMin(edited, gk(0)), 120);
  assert.deepEqual(habitsFor(edited, addDays(gMon, 0)).map((h) => h.id), ['old']);
  assert.deepEqual(habitsFor(edited, addDays(gMon, 3)).map((h) => h.id), ['old', 'new']);
  // without a snapshot, a habit created today still isn't due on earlier days
  assert.deepEqual(habitsFor(edited, addDays(gMon, 5)).map((h) => h.id), ['old', 'new']);
  assert.deepEqual(habitsFor({ ...edited, days: {} }, addDays(gMon, 1)).map((h) => h.id), ['old']);
  assert.equal(liveGoals(edited, gk(0)).water, 1500, 'the live goal moved; the snapshot did not');
  // a water goal met once stays met when the goal grows (a hotter forecast later that day)
  const met = { ...empty(), water: [{ id: 'w', ml: 2500, at: 0 }], waterGoalHit: true, weather: { max: 27, min: 16, rainMm: 0, sunMin: 500, code: 0 } };
  const ad = defaultState();
  ad.days[gk(10)] = met;
  assert.ok(waterGoalFor(ad, gk(10)) > 2500 && waterGoalMet(ad, met, gk(10)));
  // weak spot reads each day's own goal
  const wsp = defaultState();
  wsp.settings.adaptiveWater = false;
  for (let i = 1; i <= 4; i++) wsp.days[gk(10 - i)] = { ...empty(), water: [{ id: 'w', ml: 2000, at: 0 }], goals: { water: 2000, steps: 8000, gaming: 120, protein: 120, workout: null, habits: [] } };
  assert.equal(areaScores(wsp, addDays(gMon, 10))?.water, 1, 'each day met the goal it had');
  // a sick or away day makes it a rough week: a missed contract gives the stake back
  const rw = defaultState();
  const rwc = { week: gk(0), from: gk(0), goal: 'train' as const, target: 3, stake: 100, status: 'open' as const };
  assert.ok(!roughWeek(rw, rwc, addDays(gMon, 6)));
  rw.pauses = [{ from: gk(2), to: gk(2), kind: 'away' }];
  assert.ok(roughWeek(rw, rwc, addDays(gMon, 6)));
  // the progress-photo quest is gone (body tracking stays neutral)
  for (let i = 0; i < 30; i++) assert.ok(!pickQuests(defaultState(), addDays(gMon, i)).includes('progress_photo'));

  // the Couch King comes back every 8 weeks, a rank stronger, until he falls
  const kg = defaultState();
  for (let i = 1; i <= 10; i++) kg.days[gk(-i)] = { ...empty(), xpEarned: 100 }; // pace 100/day: 750 HP
  kg.finalBossWeek = gk(0);
  assert.deepEqual(kingWeeksOf(kg), [gk(0)]);
  assert.equal(kingRematchFor(kg, gk(0)), null, 'his week is still on');
  assert.equal(kingRematchFor(kg, gk(7)), gk(7 * KING_REMATCH_WEEKS));
  assert.equal(kingRematchFor(kg, gk(7 * 20)), gk(7 * 24), 'a long break skips to the next one still ahead');
  assert.equal(kingRematchFor({ ...kg, syndicateBroken: 1 }, gk(7)), null);
  assert.equal(kingRematchFor({ ...kg, bossesDefeated: { [gk(0)]: 'couch_king' } }, gk(7)), null);
  kg.kingWeeks = [gk(0), gk(56)];
  for (let i = 1; i <= 28; i++) kg.days[gk(56 - i)] = { ...empty(), xpEarned: 100 }; // 4 weeks at 100/day before the rematch
  const rematch = bossFor(kg, addDays(gMon, 56), addDays(gMon, 62));
  assert.equal(rematch.id, FINAL_BOSS.id);
  assert.equal(rematch.rank, 2);
  assert.ok(rematch.name.endsWith(' II'));
  assert.equal(rematch.maxHp, 1300, '750 x 1.75 = 1313 -> 1300');
  assert.notEqual(bossFor(kg, addDays(gMon, 7)).id, FINAL_BOSS.id, 'an ordinary boss in between');
  assert.equal(bestiary(kg, addDays(gMon, 60)).find((r) => r.id === FINAL_BOSS.id)?.fights, 2);
  // every weakness hurts the King, so a King week can still earn a gold chest
  const kd = { ...empty(), sets: [{ id: 's', exercise: 'Squat', weight: 50, reps: 5, at: 0 }] };
  assert.ok(weaknessOf(FINAL_BOSS.id).hit(kg, kd, gk(1)));
  assert.equal(BOSSES.find((b) => b.id === 'sugar_baron')?.name, 'The Shortcut Baron', 'renamed, same id');

  // the chest shelf: unopened chests wait past midnight, oldest first, with the gold status they ended with
  const sh = defaultState();
  for (const n of [0, 1, 2, 3]) sh.days[gk(n)] = { ...empty(), chestReady: true };
  sh.days[gk(1)].chest = { kind: 'coins', amount: 60, text: '60 coins' };
  sh.days[gk(2)].chestGold = true;
  const shelfNow = addDays(gMon, 4);
  assert.deepEqual(chestShelf(sh, shelfNow).map((c) => c.key), [gk(0), gk(2), gk(3)], 'opened ones are off the shelf');
  assert.equal(chestShelf(sh, shelfNow).find((c) => c.key === gk(2))?.gold, true);
  const frozenGold = withChestGold(sh, gk(4));
  assert.ok(frozenGold.days[gk(0)].chestGold != null && frozenGold.days[gk(3)].chestGold != null);
  assert.equal(frozenGold.days[gk(1)].chestGold, undefined, 'an opened chest needs no gold status');
  assert.equal(withChestGold(frozenGold, gk(4)), frozenGold);
  assert.equal(SHELF_MAX, 3);

  // the limit-breaking secrets are badges of shame: still listed and counted, they pay nothing
  const badges = SECRET_ACHIEVEMENTS.filter((a) => a.badge).map((a) => a.id).sort();
  assert.deepEqual(badges, ['s_coffee_gremlin', 's_night_owl', 's_no_life', 's_overhydrated']);
  const timer = defaultState();
  timer.activeGame = { start: Date.now() - 6 * 3_600_000 };
  assert.ok(!SECRET_ACHIEVEMENTS.find((a) => a.id === 's_no_life')!.test(timer), 'a timer still running (or forgotten) is not 5 h of gaming yet');

  // Coffee Gremlin, once: kept if a real day has 6+ cups, else revoked with what it paid
  const cup = (n: number, key: string) => ({ id: `c${key}${n}`, mg: 90, at: new Date(`${key}T0${n}:30`).getTime() });
  const cg = defaultState();
  cg.xp = 1120; // level 5 (1000), 120 into it
  cg.coins = 60;
  cg.coinsEarned = 900;
  cg.secrets = { s_coffee_gremlin: 1, s_zen_master: 2 };
  cg.days[gk(0)] = { ...empty(), coffee: [1, 2, 3, 4, 5].map((n) => cup(n, gk(0))) };
  const revoked = recheckCoffeeGremlin(cg);
  assert.ok(!revoked.secrets.s_coffee_gremlin && revoked.secrets.s_zen_master);
  assert.equal(revoked.xp, 1070);
  assert.equal(revoked.coins, 0, 'never below 0 coins');
  assert.equal(revoked.coinsEarned, 800);
  assert.equal(recheckCoffeeGremlin({ ...cg, xp: 1010 }).xp, 1000, 'never below the highest level reached');
  assert.equal(recheckCoffeeGremlin({ ...cg, xp: 980, maxLevel: 5 }).xp, 980, 'already under it: nothing more taken, nothing given');
  cg.days[gk(1)] = { ...empty(), coffee: [1, 2, 3, 4, 5, 6].map((n) => cup(n, gk(1))) };
  assert.equal(recheckCoffeeGremlin(cg), cg, 'a real day with 6 cups keeps it');
  // it runs once: hydrate marks it done, a new save starts with it done
  const once = hydrate({ ...cg, days: { [gk(0)]: cg.days[gk(0)] }, fixes: undefined });
  assert.ok(!once.secrets.s_coffee_gremlin && once.fixes?.includes('coffee-gremlin'));
  assert.equal(applyFixes(once), once);
  assert.ok(defaultState().fixes?.includes('coffee-gremlin'));
  assert.equal(hydrate({ ...cg, days: { [gk(0)]: cg.days[gk(0)] }, fixes: ['coffee-gremlin'] }).secrets.s_coffee_gremlin, 1, 'not again');
  assert.equal(xpForLevel(5), 1000);

  // Completionist: no habits due, or no protein goal, counts as done
  const comp = defaultState();
  comp.settings.proteinGoal = 0;
  comp.days[gk(2)] = { ...empty(), waterGoalHit: true, questsAllDone: true, sets: [{ id: 's', exercise: 'Squat', weight: 50, reps: 5, at: 0 }] };
  const completionist = SECRET_ACHIEVEMENTS.find((a) => a.id === 's_completionist')!;
  assert.ok(completionist.test(comp));
  comp.habits = [{ id: 'h', name: 'H', emoji: 'x', days: [], remindHour: null, createdAt: 0 }];
  assert.ok(!completionist.test(comp), 'a habit due and not done');

  // phone games played while the gaming timer ran count once (the timer has them)
  const t0 = new Date(`${gk(3)}T19:00`).getTime();
  const spans = [
    { packageName: 'com.game', start: t0 + 10 * MIN, end: t0 + 40 * MIN }, // 30 min, all inside the session
    { packageName: 'com.game', start: t0 + 70 * MIN, end: t0 + 90 * MIN }, // 20 min, 10 inside
    { packageName: 'com.chat', start: t0, end: t0 + 60 * MIN }, // not a game
  ];
  assert.equal(gamesInTimerMin(spans, new Set(['com.game']), [{ start: t0, end: t0 + 80 * MIN }]), 40);
  const both = defaultState();
  both.days[gk(3)] = { ...empty(), games: [{ start: t0, end: t0 + 80 * MIN }], screen: { totalMin: 90, doomMin: 0, gamesMin: 50, top: [] }, phoneGamesInTimerMin: 40 };
  assert.equal(usedMs(both, gk(3)), 90 * MIN, '80 on the timer + 10 phone-only minutes, not 130');

  // the ledger: an undo takes back exactly what its entry got (Double XP included), never below zero
  const lg = defaultState();
  const lk = gk(4);
  let led = credit(lg, lk, 4, 0, 'w:1'); // a glass under Double XP: 2 x 2
  led = credit(led, lk, 15, 15); // the water goal it reached (sticky, no record)
  assert.equal(led.xp, 19);
  assert.equal(led.coins, 19);
  assert.deepEqual(led.days[lk].xpBy, { 'w:1': 4 });
  assert.equal(led.days[lk].bonusEarnedMin, 15);
  const undone = unreward(led, lk, 'w:1', 1);
  assert.equal(undone.xp, 15, 'the 4 it got, not the plain 1');
  assert.equal(undone.coins, 15);
  assert.equal(undone.days[lk].xpEarned, 15);
  assert.equal(undone.days[lk].xpUndone, 4);
  assert.equal(undone.days[lk].xpBy, undefined);
  assert.equal(unreward(undone, lk, 'w:1', 1).xp, 14, 'no record (an old entry): the plain amount');
  const broke = unreward({ ...led, coins: 2 }, lk, null, 10, 30);
  assert.equal(broke.coins, 0, 'coins never below 0');
  assert.equal(broke.days[lk].bonusGameMin, 0);
  assert.equal(broke.days[lk].bonusEarnedMin, 0);
  // gaming penalties stay out of xpEarned (boss, league); a refund goes back to the same day
  const pen = penalize(led, lk, 6);
  assert.equal(pen.xp, 13);
  assert.equal(pen.days[lk].xpEarned, 19, 'the boss and the league are not hit');
  assert.deepEqual(ledgerOn(pen, lk), { earned: 19, lost: 6, undone: 0 });
  assert.equal(refundPenalty(pen, lk, 6).days[lk].xpLost, 0);
  assert.equal(refundPenalty(pen, lk, 6).xp, 19);
  assert.equal(earnBonus(lg, lk, 30).days[lk].bonusEarnedMin, 30);
  // per-entry records go at rollover, the day's totals stay
  const pruned = withoutUndoRecords({ ...led, days: { ...led.days, [lk]: { ...led.days[lk], critBy: { 'water:0': { id: '1', dmg: 15 } } } } }, gk(5));
  assert.equal(pruned.days[lk].xpBy, undefined);
  assert.equal(pruned.days[lk].critBy, undefined);
  assert.equal(pruned.days[lk].xpEarned, 19);
  assert.equal(withoutUndoRecords(led, lk), led, "today's records stay");

  // an undone entry takes its crit off the boss; its slot stays used, so a re-log can't crit again
  const critDay = { ...empty(), critKeys: ['water:0', 'set:0', 'pr:1'], critDamage: 75, critBy: { 'water:0': { id: 'w', dmg: 15 }, 'set:0': { id: 's', dmg: 30 }, 'pr:1': { id: 's', dmg: 30 } } };
  const uncrit = withoutCrit(critDay, 's');
  assert.equal(uncrit.critDamage, 15, 'the set and the record it set');
  assert.deepEqual(Object.keys(uncrit.critBy ?? {}), ['water:0']);
  assert.deepEqual(uncrit.critKeys, critDay.critKeys);
  assert.equal(withoutCrit(critDay, 'nope'), critDay);
  // rollCritters remembers which entry rolled a crit
  const rc = defaultState();
  rc.onboarded = true;
  const rcAt = new Date(2026, 9, 20, 12);
  const rcKey = dayKey(rcAt);
  let critted: ReturnType<typeof rollCritters> | null = null;
  for (let n = 0; n < 400 && !critted?.state.days[rcKey]?.critBy; n++) {
    const before = { ...rc, days: { [rcKey]: { ...empty(), water: Array.from({ length: n }, (_, i) => ({ id: `x${i}`, ml: 250, at: rcAt.getTime() })) } } };
    const after = { ...before, days: { [rcKey]: { ...before.days[rcKey], water: [...before.days[rcKey].water, { id: `x${n}`, ml: 250, at: rcAt.getTime() }] } } };
    critted = rollCritters(before, after, rcAt);
  }
  const hit = Object.values(critted?.state.days[rcKey]?.critBy ?? {})[0];
  assert.ok(hit && /^x\d+$/.test(hit.id) && hit.dmg > 0, 'a crit names its glass');

  // tasks done on a day stay counted after the task is deleted or cleared
  const td = defaultState();
  const tAt = new Date(`${gk(5)}T10:00`).getTime();
  td.days[gk(5)] = { ...empty(), doneTasks: [{ id: 'gone', at: tAt }] };
  td.tasks = [{ id: 'still', title: 'x', done: true, createdAt: 0, doneAt: tAt + 1 }];
  assert.deepEqual(doneTasksOn(td, gk(5)).map((t) => t.id).sort(), ['gone', 'still']);
  const tc = { week: gk(0), from: gk(0), signedAt: 0, goal: 'tasks' as const, target: 2, stake: 100, status: 'open' as const };
  assert.equal(contractProgress(td, tc, addDays(gMon, 6)), 2, 'the deleted one still counts');

  // a task first done on an earlier day, unchecked and checked again: plain XP both ways, so no round trip makes
  // any, Double XP and the rested pool or not (the check went to Tuesday at 10 XP under Double XP)
  const firstAt = new Date(`${gk(1)}T10:00`).getTime();
  let farm: ReturnType<typeof defaultState> = { ...defaultState(), xp: 100, coins: 100, rested: 50, doubleXpUntil: Date.now() + 3_600_000 };
  farm.tasks = [{ id: 'T', title: 'x', done: true, createdAt: 0, doneAt: firstAt, firstDoneAt: firstAt }];
  farm.days[gk(1)] = { ...empty(), doneTasks: [{ id: 'T', at: firstAt }], xpEarned: 10 };
  farm.counters = { ...farm.counters, tasksDone: 1 };
  const before = { xp: farm.xp, coins: farm.coins, tue: 10, rested: 50, done: 1 };
  for (let i = 0; i < 20; i++) {
    farm = uncheckTask(farm, 'T', gk(3));
    assert.equal(recheckDay(farm, 'T', gk(3)), gk(1), 'back to the day it was first done');
    farm = recheckTask(farm, 'T', gk(3));
  }
  assert.deepEqual({ xp: farm.xp, coins: farm.coins, tue: farm.days[gk(1)].xpEarned, rested: farm.rested, done: farm.counters.tasksDone }, before, '20 round trips, not a point made');
  assert.ok(farm.tasks[0].done && farm.tasks[0].doneAt === firstAt);
  assert.deepEqual(doneTasksOn(farm, gk(1)).map((x) => x.id), ['T']);
  assert.equal(recheckDay({ ...farm, tasks: [{ ...farm.tasks[0], done: false, firstDoneAt: new Date(`${gk(3)}T09:00`).getTime() }] }, 'T', gk(3)), null, "first done today: a normal check, with today's multipliers");

  // records: a set beats every earlier day, and only one a day per exercise (ramping up through today's sets isn't three)
  const lifts = defaultState();
  const lift = (id: string, weight: number, n: number) => ({ id, exercise: 'Squat', weight, reps: 5, at: new Date(`${gk(n)}T18:00`).getTime() });
  assert.equal(isRecord(lifts, gk(1), 'Squat', 40), false, 'a first session has nothing to beat');
  lifts.days[gk(1)] = { ...empty(), sets: [lift('a', 20, 1), lift('b', 30, 1), lift('c', 40, 1)] };
  assert.equal(isRecord(lifts, gk(1), 'Squat', 50), false, 'not even its heaviest set');
  assert.equal(bestBeforeDay(lifts, ' squat', gk(2)), 40);
  lifts.days[gk(2)] = { ...empty(), sets: [lift('d', 30, 2)] };
  assert.equal(isRecord(lifts, gk(2), 'Squat', 40), false, 'matching the best is not beating it');
  assert.equal(isRecord(lifts, gk(2), 'Squat', 42.5), true);
  lifts.days[gk(2)] = { ...lifts.days[gk(2)], sets: [...lifts.days[gk(2)].sets, lift('e', 42.5, 2)], xpBy: { 'pr:e': 10 } };
  assert.equal(isRecord(lifts, gk(2), 'Squat', 45), false, 'one record per exercise a day');
  assert.equal(isRecord(lifts, gk(2), 'Bench press', 45), false, 'another exercise with no history: nothing to beat');

  // an undo that takes a finished quest back under its target opens it again, with exactly what it paid
  const qAt = new Date(`${gk(2)}T11:00`);
  const glass = (id: string) => ({ id, ml: 250, at: qAt.getTime() });
  const qDay = { ...empty(), quests: ['water_noon', 'meals', 'mood'], water: [glass('1'), glass('2'), glass('3')], questsDone: ['water_noon'], xpEarned: 20, xpBy: { 'q:water_noon': 20 } };
  const qs: ReturnType<typeof defaultState> = { ...defaultState(), onboarded: true, xp: 100, coins: 200, days: { [gk(2)]: qDay } };
  qs.counters = { ...qs.counters, quests: 1 };
  const withWater = (s: typeof qs, n: number): typeof qs => ({ ...s, days: { ...s.days, [gk(2)]: { ...s.days[gk(2)], water: s.days[gk(2)].water.slice(0, n) } } });
  const ro = reopenQuests(qs, withWater(qs, 2), qAt);
  assert.deepEqual(ro.reopened.map((q) => q.id), ['water_noon']);
  assert.deepEqual(ro.state.days[gk(2)].questsDone, []);
  assert.equal(ro.state.xp, 80, 'the 20 it got under Double XP, not the plain 10');
  assert.equal(ro.state.counters.quests, 0);
  assert.equal(reopenQuests(qs, qs, qAt).state, qs, 'nothing went down: nothing reopens');
  const synced2 = { ...withWater(qs, 2), days: { ...withWater(qs, 2).days, [gk(2)]: { ...withWater(qs, 2).days[gk(2)], steps: 4000 } } };
  assert.equal(reopenQuests(qs, synced2, qAt).reopened.length, 0, 'a change with new watch numbers never reopens one');
  // every quest done and the chest still shut: the all-done bonus and the chest go back too; once it's opened, the day stays done
  const doneAll = { ...qs, days: { [gk(2)]: { ...qDay, questsDone: ['water_noon', 'meals', 'mood'], questsAllDone: true, questsAllDoneAt: qAt.getTime(), chestReady: true, bonusGameMin: 15, bonusEarnedMin: 15, xpBy: { 'q:water_noon': 10, 'quests-all': 15 } } } };
  const shut = reopenQuests(doneAll, withWater(doneAll, 1), qAt);
  assert.deepEqual(shut.reopened.map((q) => q.id), ['water_noon']);
  assert.equal(shut.state.days[gk(2)].questsAllDone, undefined);
  assert.equal(shut.state.days[gk(2)].chestReady, undefined);
  assert.equal(shut.state.days[gk(2)].bonusGameMin, 0);
  assert.equal(shut.state.xp, 100 - 10 - 15);
  const opened = { ...doneAll, days: { [gk(2)]: { ...doneAll.days[gk(2)], chest: { kind: 'coins' as const, amount: 50, text: '50 coins' } } } };
  assert.equal(reopenQuests(opened, withWater(opened, 1), qAt).reopened.length, 0, 'the chest is open: the day stays done');

  // a forgotten gaming timer stops itself: an hour past bedtime, at least 4 h in
  const gc = defaultState(); // sleepHour 23
  const at = (h: number, m = 0) => new Date(2026, 9, 21, h, m).getTime();
  assert.equal(gameCapAt(gc, at(21)), at(25), '21:00 -> 01:00 (4 h)');
  assert.equal(gameCapAt(gc, at(18)), at(24), '18:00 -> midnight');
  assert.equal(gameCapAt(gc, at(23, 30)), at(27, 30), '23:30 -> 03:30 (4 h)');
  assert.equal(gameCapAt(gc, at(10)), at(18), 'midnight is too far: 8 h');

  // red days off count in this week's planned workouts
  const red = defaultState();
  red.settings.redDaysOff = true;
  assert.equal(workoutsThisWeek(red, new Date(2026, 11, 23, 12)).planned, 3, 'Christmas Eve week: the plan minus red Friday 25 Dec');
}

// ---------- step 4 plans ----------
{
  const blankDay = (): DayLog => ({ water: [], food: [], sets: [], games: [], bonusGameMin: 0 });
  const noon = (key: string) => new Date(`${key}T12:00`);
  // The week of Mon 11 Jan 2027.
  const wk = ['2027-01-11', '2027-01-12', '2027-01-13', '2027-01-14', '2027-01-15', '2027-01-16', '2027-01-17'];
  const created = new Date(2026, 11, 1).getTime();
  const range = { id: 'r', name: 'Stretch', emoji: '🧘', days: [], remindHour: 19, createdAt: created, perWeek: { min: 3, max: 5 }, plan: null };
  const fixed = { id: 'f', name: 'Vitamins', emoji: '💊', days: [], remindHour: 8, createdAt: created };
  const withDone = (keys: string[], base = defaultState()) => {
    const st = { ...base, habits: [range, fixed], days: { ...base.days } };
    for (const k of keys) st.days[k] = { ...blankDay(), ...st.days[k], habits: [...(st.days[k]?.habits ?? []), 'r'] };
    return st;
  };

  // range habits: due only when done or when the low end needs every open day left; reminders one day earlier
  const empty = withDone([]);
  assert.deepEqual(wk.map((k) => rangeNeededOn(empty, range, noon(k))), [false, false, false, false, true, true, true], 'min 3, nothing done: needed Fri to Sun');
  assert.deepEqual(wk.map((k) => rangeRemindOn(empty, range, noon(k))), [false, false, false, true, true, true, true], 'reminded from Thursday (one spare day)');
  assert.ok(!habitsFor(empty, noon(wk[0])).some((h) => h.id === 'r'), 'not due on Monday with slack left');
  assert.ok(habitsFor(empty, noon(wk[0])).some((h) => h.id === 'f'), 'fixed habits are unchanged');
  assert.ok(habitsShownOn(empty, noon(wk[0])).some((h) => h.id === 'r'), 'but listed every day');
  const two = withDone([wk[0], wk[1]]);
  assert.ok(rangeDueOn(two, range, noon(wk[1])), 'a day it was done is due (doing it always counts)');
  assert.ok(!rangeNeededOn(two, range, noon(wk[5])) && rangeRemindOn(two, range, noon(wk[5])), 'min 3, 2 done: Saturday gets the one reminder');
  assert.ok(rangeNeededOn(two, range, noon(wk[6])), '... and Sunday is the day it has to happen');
  assert.equal(rangeText(rangeWeek(two, range, noon(wk[3]))!), '2/3–5 this week');
  const five = withDone(wk.slice(0, 5));
  assert.equal(rangeWeek(five, range, noon(wk[6]))!.done, 5);
  assert.ok(!rangeRemindOn(five, range, noon(wk[6])), 'no reminders once the low end is met');
  // paused days and a habit added mid-week ask for less, never more
  const sick = startPause(withDone([]), 'sick', 4, wk[3]);
  assert.equal(rangeWeek(sick, range, noon(wk[0]))!.target, 2, 'sick Thu–Sun: 3 of 7 open days, low end 3 -> 2');
  assert.equal(rangeText(rangeWeek(sick, range, noon(wk[0]))!), '0/2–5 this week');
  const late = { ...withDone([]), habits: [{ ...range, createdAt: noon(wk[3]).getTime() - 3_600_000 }] };
  assert.equal(rangeWeek(late, late.habits[0], noon(wk[3]))!.target, 2, 'added Thursday: 4 open days, low end 3 -> 2');
  assert.ok(!rangeNeededOn(late, late.habits[0], noon(wk[0])), 'not needed before it existed');
  assert.equal(rangeWeek({ ...empty, habits: [fixed] }, fixed), null, 'a fixed habit has no range');
  // hydrate gives old habits the new fields
  const old = hydrate({ ...defaultState(), habits: [fixed] });
  assert.equal(old.habits[0].perWeek, null);
  assert.equal(old.habits[0].plan, null);

  // if-then: how a cue reads
  assert.equal(cueSaid({ kind: 'event', event: 'coffee' }), 'after your first coffee');
  assert.equal(cueSaid({ kind: 'time', hour: 7, minute: 30 }), 'at 07:30');
  assert.equal(cueSaid({ kind: 'calendar', match: 'Standup' }), 'when Standup ends');
  assert.equal(cueSaid({ kind: 'calendar', match: ' ' }), 'when your last meeting ends');
  assert.equal(cueHappened({ kind: 'event', event: 'coffee' }), "Coffee's logged.");
  assert.equal(planText({ cue: { kind: 'event', event: 'coffee' }, then: 'Vitamins' }), 'After my first coffee → Vitamins');
  assert.equal(planText({ cue: { kind: 'rain' }, then: '20-min home circuit' }), 'If it rains at gym time → 20-min home circuit');
  assert.equal(planMinutes('20-min home circuit'), 20);
  assert.equal(planMinutes('45 minutes of yoga'), 45);
  assert.equal(planMinutes('home circuit'), 20);
  assert.equal(planMinutes('2 rounds'), 20);
  for (const k of ['ifThenCue', 'planBRain', 'planBDone', 'comebackWorkout', 'rangeWeekMin', 'rangeWeekTop', 'ifThenDone', 'ifThenRetired'] as const) assert.ok(LINES[k], k);
  assert.equal(fillLine('{happened} You planned {when}: {then}.', { happened: "Coffee's logged.", when: 'after your first coffee', then: 'Vitamins' }), "Coffee's logged. You planned after your first coffee: Vitamins.");

  // what happened in the app between two states
  const at = new Date(2027, 0, 13, 9);
  const k0 = dayKey(at);
  const base = { ...defaultState(), onboarded: true };
  const withDay = (st: typeof base, d: Partial<DayLog>) => ({ ...st, days: { ...st.days, [k0]: { ...blankDay(), ...st.days[k0], ...d } } });
  const cup = { id: 'c1', mg: 90, at: at.getTime() };
  assert.deepEqual(firedEvents(base, withDay(base, { coffee: [cup] }), at), ['coffee']);
  assert.deepEqual(firedEvents(withDay(base, { coffee: [cup] }), withDay(base, { coffee: [cup, { ...cup, id: 'c2' }] }), at), [], 'only the first coffee');
  assert.deepEqual(firedEvents(base, withDay(base, { coffee: [{ ...cup, late: true }] }), at), [], 'back-dated cups are no cue');
  assert.deepEqual(firedEvents(base, withDay(base, { activities: [{ id: 'a', kind: 'cardio', minutes: 30, at: at.getTime() }] }), at), ['training']);
  assert.deepEqual(firedEvents(base, withDay(base, { focus: [{ id: 'x', start: 0, end: 1, minutes: 25 }] }), at), ['focus']);
  assert.deepEqual(firedEvents(base, withDay(base, { focus: [{ id: 'x', start: 0, end: 1, minutes: 25, snapped: 'Instagram' }] }), at), [], 'a snapped web is no cue');
  assert.deepEqual(firedEvents({ ...base, activeGame: { start: at.getTime() - 3_600_000 } } as typeof base, base, at), ['gaming']);
  assert.deepEqual(firedEvents(base, withDay(base, { sleepRating: 4 }), at), ['checkin']);

  // a cue in the app prompts once a day, not for a habit already done, not on a paused day
  const vit = { ...fixed, plan: { cue: { kind: 'event' as const, event: 'coffee' as const }, then: 'Vitamins' } };
  const planned = { ...base, habits: [vit] };
  const c1 = checkCues(planned, withDay(planned, { coffee: [cup] }), at);
  assert.equal(c1.prompts.length, 1);
  assert.equal(c1.prompts[0].target, 'f');
  assert.equal(c1.state.days[k0].cues?.f, at.getTime());
  assert.equal(checkCues(c1.state, withDay(c1.state, { coffee: [cup, { ...cup, id: 'c2' }] }), at).prompts.length, 0, 'once a day');
  assert.equal(checkCues(withDay(planned, { habits: ['f'] }), withDay(planned, { habits: ['f'], coffee: [cup] }), at).prompts.length, 0, 'already done');
  const pausedPlan = startPause(planned, 'sick', 2, k0);
  assert.equal(checkCues(pausedPlan, withDay(pausedPlan, { coffee: [cup] }), at).prompts.length, 0, 'paused');
  // on cue: within 90 minutes of the cue
  assert.ok(onCueNow(c1.state, vit, new Date(at.getTime() + 30 * 60_000), []));
  assert.ok(!onCueNow(c1.state, vit, new Date(at.getTime() + 3 * 3_600_000), []), 'hours later is not on cue');
  const timed = { ...fixed, plan: { cue: { kind: 'time' as const, hour: 7, minute: 30 }, then: 'Vitamins', onCue: 3 } };
  assert.ok(onCueNow(base, timed, new Date(2027, 0, 13, 8), []));
  assert.ok(!onCueNow(base, timed, new Date(2027, 0, 13, 7), []), 'before its time');
  assert.ok(!reminderRetired(timed) && reminderRetired({ ...timed, plan: { ...timed.plan, onCue: 10 } }), 'the clock reminder retires at 10 on cue');
  const lifting = { ...fixed, plan: { cue: { kind: 'event' as const, event: 'training' as const }, then: 'Stretch' } };
  const trained = withDay(base, { sets: [{ id: 's', exercise: 'Squat', weight: 60, reps: 5, at: at.getTime() }] });
  assert.ok(onCueNow(trained, lifting, new Date(at.getTime() + 5 * 60_000), []), 'right after the last set counts');
  assert.deepEqual(cueTimes(trained, lifting.plan, at, []), [at.getTime() + 15 * 60_000], 'after training: 15 min after the last set');

  // calendar cues: a meeting by title, or the day's last one
  const ev = (title: string, h: number) => ({ key: title, title, start: new Date(2027, 0, 13, h).getTime(), end: new Date(2027, 0, 13, h, 30).getTime(), allDay: false, location: null, calendarId: 'c' });
  const evs = [ev('Standup', 9), ev('Planning', 14), ev('1:1', 16)];
  assert.deepEqual(cueTimes(base, { cue: { kind: 'calendar', match: 'standup' }, then: 'x' }, at, evs), [new Date(2027, 0, 13, 9, 30).getTime()]);
  assert.deepEqual(cueTimes(base, { cue: { kind: 'calendar', match: '' }, then: 'x' }, at, evs), [new Date(2027, 0, 13, 16, 30).getTime()]);

  // reminders for clock cues: ids, skipped once done or on paused days
  const meeting = { ...fixed, plan: { cue: { kind: 'calendar' as const, match: '' }, then: 'Walk 10 min' } };
  const rem = cueReminders({ ...base, habits: [meeting] }, 0, at, evs, null);
  assert.deepEqual(rem.map((r) => r.id), [`ifthen-f-${k0}-0`]);
  assert.equal(cueReminders(withDay({ ...base, habits: [meeting] }, { habits: ['f'] }), 0, at, evs, null).length, 0, 'done: no reminder');
  assert.equal(cueReminders(startPause({ ...base, habits: [meeting] }, 'away', 2, k0), 0, at, evs, null).length, 0, 'paused: none');

  // plan B: rain at gym time
  const wet = { temp: 8, feels: 5, code: 61, fetchedAt: 0, soon: [], days: [{ date: k0, max: 8, min: 3, rainPct: 80, code: 61, rainMm: 4, sunrise: 0, sunset: 0, daylightMin: 0, sunshineMin: 0 }] };
  const dry = { ...wet, days: [{ ...wet.days[0], rainPct: 10, rainMm: 0 }] };
  assert.ok(rainAtGym(wet, at, 18, 0) && !rainAtGym(dry, at, 18, 0) && !rainAtGym(null, at, 18, 0));
  const gymAt = new Date(2027, 0, 13, 18).getTime();
  assert.ok(rainAtGym({ ...dry, soon: [{ at: gymAt, mm: 0.6 }] }, at, 18, 0), 'the 15-minute forecast wins when it reaches gym time');
  const wed = at.getDay() as Weekday;
  const rainy = { ...base, plan: { ...base.plan, [wed]: { name: 'Pull', exercises: [], plan: { cue: { kind: 'rain' as const }, then: '20-min home circuit' } } } };
  assert.deepEqual(planBToday(rainy, wet, at), { then: '20-min home circuit', minutes: 20, time: '18:00' });
  assert.equal(planBToday(rainy, dry, at), null, 'dry: no plan B');
  assert.equal(planBToday(trained.days ? { ...rainy, days: trained.days } : rainy, wet, at), null, 'trained already');
  assert.deepEqual(cueReminders(rainy, 0, at, [], wet).map((r) => [r.id, r.planB, r.at]), [[`ifthen-gym-${k0}`, true, gymAt - 3_600_000]], 'plan B goes out an hour before gym time');

  // the comeback bonus: the first workout after a missed planned day (Tue Pull), not after a paused one
  const cb = defaultState();
  cb.days['2027-01-11'] = { ...blankDay(), sets: [{ id: 's1', exercise: 'Bench press', weight: 50, reps: 5, at: noon('2027-01-11').getTime() }] };
  cb.days['2027-01-12'] = { ...blankDay(), water: [{ id: 'w', ml: 250, at: noon('2027-01-12').getTime() }] };
  const thu = noon('2027-01-14');
  assert.equal(missedGymBefore(cb, thu), '2027-01-12', 'Tuesday (Pull) was planned and missed');
  assert.equal(missedGymBefore({ ...cb, days: { ...cb.days, '2027-01-13': { ...blankDay(), activities: [{ id: 'a', kind: 'cardio', minutes: 20, at: 0 }] } } }, thu), null, 'trained since: nothing to come back from');
  assert.equal(missedGymBefore(startPause(cb, 'sick', 1, '2027-01-12'), thu), null, 'a paused day is never missed');
  assert.equal(missedGymBefore(defaultState(), thu), null, 'nothing logged yet: no comeback');
  const flow = { ...cb, days: { ...cb.days, '2027-01-12': { ...cb.days['2027-01-12'], period: { flow: 'medium' as const, symptoms: [] } } } };
  assert.equal(missedGymBefore(flow, thu), null, 'a period day is rest, never a miss');
  const low = { ...cb, days: { ...cb.days, '2027-01-12': { ...cb.days['2027-01-12'], moods: [{ id: 'm', level: 1 as const, emotions: [], at: noon('2027-01-12').getTime() }] } } };
  assert.equal(missedGymBefore(low, thu), null, 'a low-mood day is rest too');
  assert.equal(lastTrainedBefore(cb, thu), '2027-01-11', 'the line names the last workout (Monday), not the miss');
  assert.equal(lastTrainedBefore(defaultState(), thu), null);
  assert.ok(!LINES.comebackWorkout.savage.concat(LINES.comebackWorkout.mild).some((x) => /is history/.test(x)));
  assert.ok(COMEBACK.xp > 0 && COMEBACK.min > 0);

  // step 6: a slipping workout moves to a free day this week instead of being missed (workout-move.ts)
  {
    const tue = '2027-01-12';
    const tueAt = noon(tue).getTime();
    assert.deepEqual(moveTargets(cb, tue, tue), ['2027-01-13', '2027-01-16', '2027-01-17'], 'free days after it, nearest first, three at most');
    const toSat = withMove(cb, tue, '2027-01-16', tueAt);
    assert.equal(workoutFor(toSat, noon(tue)), null, 'the day it left is a rest day');
    assert.equal(workoutFor(toSat, noon('2027-01-16'))?.name, 'Pull');
    assert.equal(workoutFor(toSat, noon('2027-01-16'))?.exercises.length, 4, 'with its exercises');
    assert.equal(workoutsThisWeek(toSat, noon('2027-01-16')).planned, workoutsThisWeek(cb, noon('2027-01-16')).planned, 'the week plans as many');
    assert.equal(missedGymBefore(toSat, thu), null, 'moved, not missed: no comeback for it');
    assert.equal(questInfo(toSat, 'workout', noon(tue))?.title, 'Do a workout', 'a picked workout quest still makes sense');
    const frozen = withGoals(toSat, '2027-01-14');
    assert.equal(goalsOn(frozen, tue).workout, null, 'the freeze keeps the moved-away day a rest day');
    assert.equal(liveGoals(toSat, '2027-01-16').workout, 'Pull');
    const satFrozen = { ...frozen, days: { ...frozen.days, '2027-01-16': { ...blankDay(), goals: liveGoals(toSat, '2027-01-16') } } };
    assert.equal(workoutFor(satFrozen, noon('2027-01-16'))?.exercises.length, 4, 'a frozen moved-to day keeps the plan');
    // once per workout, this week only, from today on, never a trained or paused day
    assert.equal(withMove(toSat, '2027-01-16', '2027-01-17', tueAt), toSat, 'a moved workout stays put');
    assert.equal(withMove(cb, tue, '2027-01-14', tueAt), cb, 'not onto another workout day');
    assert.deepEqual(moveTargets(cb, '2027-01-11', tue), [], 'not a day that has passed');
    assert.deepEqual(moveTargets(cb, '2027-01-15', '2027-01-15'), ['2027-01-16', '2027-01-17'], 'Friday: the weekend, never next week');
    assert.deepEqual(moveTargets(cb, '2027-01-11', '2027-01-11'), [], 'Monday was trained');
    assert.deepEqual(moveTargets(startPause(cb, 'sick', 1, tue), tue, tue), [], 'a paused day has nothing to move');
    const xmas = defaultState();
    xmas.settings.redDaysOff = true;
    assert.deepEqual(moveTargets(xmas, '2026-12-24', '2026-12-24'), ['2026-12-27'], 'red days off are not free days');
    // undo: until the day it left has passed or the new day was trained
    assert.ok(canUnmove(toSat, tue, tue));
    assert.equal(workoutFor(withoutMove(toSat, tue, tue), noon(tue))?.name, 'Pull');
    const trainedSat = { ...toSat, days: { ...toSat.days, '2027-01-16': { ...blankDay(), sets: [{ id: 'x', exercise: 'Row', weight: 40, reps: 8, at: noon('2027-01-16').getTime() }] } } };
    assert.ok(!canUnmove(trainedSat, tue, tue) && !canUnmove(toSat, tue, '2027-01-13'));
    // slipping: two hours after gym time, or an hour before bed when that's sooner
    assert.equal(slipAt(cb, tue), new Date(2027, 0, 12, 20).getTime());
    assert.equal(slipAt({ ...cb, settings: { ...cb.settings, gymHour: 21 } }, tue), new Date(2027, 0, 12, 22).getTime());
    assert.ok(!slipping(cb, new Date(2027, 0, 12, 19).getTime()) && slipping(cb, new Date(2027, 0, 12, 20, 30).getTime()));
    assert.ok(!slipping(toSat, new Date(2027, 0, 12, 21).getTime()), 'moved: nothing slips');
    assert.equal(moveDayName('2027-01-13', tue), 'tomorrow');
    assert.equal(moveDayName('2027-01-16', tue), 'Saturday');
    // what got in the way: asked once, a coping plan for some answers on that weekday
    assert.equal(pendingWhy(toSat, tue)?.from, tue);
    assert.equal(pendingWhy(withWhy(toSat, tue, 'skip'), tue), null);
    assert.equal(copingPlan(cb, 'late')?.cue.kind, 'calendar');
    assert.equal(copingPlan(cb, 'sick'), null, 'sick: rest is the plan');
    assert.equal(copingWeekday(cb, tue), 2);
    const ownPlan = { ...cb, plan: { ...cb.plan, 2: { name: 'Pull', exercises: [], plan: { cue: { kind: 'rain' as const }, then: 'Home circuit' } } } };
    assert.equal(copingWeekday(ownPlan, tue), null, 'never over a plan of its own');
    assert.deepEqual(actionFromButton('gym_move', { day: tue, to: '2027-01-16' }, tueAt), { kind: 'gymMove', day: tue, to: '2027-01-16' });
    assert.ok(!SILENT_BUTTONS.has('gym_move'), 'Move it opens the app');
  }

  // after a lost contract: a different goal, the one last week came closest to
  const lost = defaultState();
  for (const k of ['2027-01-11', '2027-01-12', '2027-01-13', '2027-01-14', '2027-01-15']) lost.days[k] = { ...blankDay(), water: [{ id: 'w', ml: 3000, at: noon(k).getTime() }] };
  lost.contract = { week: '2027-01-11', from: '2027-01-11', goal: 'train', target: 3, stake: 100, status: 'lost' };
  assert.deepEqual(newMission(lost, noon('2027-01-18')), { goal: 'water', lost: 'train' });
  assert.equal(newMission({ ...lost, contract: { ...lost.contract, status: 'won' } }, noon('2027-01-18')), null, 'only after a lost one');
  assert.equal(newMission(lost, noon('2027-01-26')), null, 'only the week right after');
}

// ---------- step 2b boss ----------
{
  const empty = () => ({ water: [], food: [], sets: [], games: [], bonusGameMin: 0 });

  // the morning draft: the default three plus two more, the same all day
  const draftDay = new Date(2026, 10, 10, 9); // a Tuesday, no season
  const ds = defaultState();
  const dr = draftFor(ds, draftDay);
  assert.equal(dr.candidates.length, DRAFT_SIZE);
  assert.equal(new Set(dr.candidates).size, DRAFT_SIZE, 'no quest offered twice');
  assert.deepEqual(dr.defaults, pickQuestsWithFocus(ds, draftDay).ids, 'the defaults are the old picks');
  assert.ok(dr.defaults.every((id) => dr.candidates.includes(id)));
  assert.ok(!dr.candidates.some((id) => id === 'checkin' || id === 'sip'), 'gentle quests stay out of the draft');
  assert.deepEqual(draftFor(ds, new Date(2026, 10, 10, 11)).candidates, dr.candidates, 'same offer all day');
  // in season the season is on offer
  const sp = draftFor(defaultState(), new Date(2026, 9, 27, 9));
  assert.ok(sp.candidates.some((id) => id.startsWith('hw_')));

  // open until noon, then the picks stand; never on a reduced day or once all are done
  const dk = dayKey(draftDay);
  const open = defaultState();
  open.days[dk] = { ...empty(), quests: dr.defaults, questDraft: { candidates: dr.candidates, locked: false } };
  assert.ok(draftOpen(open, draftDay));
  assert.ok(!draftOpen(open, new Date(2026, 10, 10, 12)), 'closed at 12:00');
  assert.ok(!draftOpen({ ...open, days: { [dk]: { ...open.days[dk], questDraft: { candidates: dr.candidates, locked: true } } } }, draftDay));
  assert.ok(!draftOpen({ ...open, days: { [dk]: { ...open.days[dk], energy: 1 } } }, draftDay), 'low battery: one gentle quest, no draft');
  assert.ok(!draftOpen({ ...open, days: { [dk]: { ...open.days[dk], questsAllDone: true } } }, draftDay));
  // reroll waits until the draft is closed
  assert.equal(rerollFor(open, dr.defaults[0], draftDay), null);

  // a valid pick: three different quests on offer, done ones kept, no already-met newcomers
  const extra = dr.candidates.filter((id) => !dr.defaults.includes(id));
  assert.ok(validDraft(open, [dr.defaults[0], extra[0], extra[1]], draftDay));
  assert.ok(!validDraft(open, [dr.defaults[0], extra[0]], draftDay), 'three, not two');
  assert.ok(!validDraft(open, [dr.defaults[0], dr.defaults[0], extra[0]], draftDay), 'three different ones');
  assert.ok(!validDraft(open, [dr.defaults[0], extra[0], 'not_on_offer'], draftDay));
  const kept = { ...open, days: { [dk]: { ...open.days[dk], questsDone: [dr.defaults[1]] } } };
  assert.ok(!validDraft(kept, [dr.defaults[0], extra[0], extra[1]], draftDay), "a quest done today can't be dropped");
  assert.ok(validDraft(kept, [dr.defaults[1], extra[0], extra[1]], draftDay));
  // an already-met quest can't be drafted in (free XP)
  const sippedDay = { ...open.days[dk], water: [{ id: 'w1', ml: 250, at: new Date(2026, 10, 10, 8).getTime() }] };
  const sipped = { ...open, days: { [dk]: { ...sippedDay, questDraft: { candidates: ['early_sip', ...dr.candidates.filter((id) => id !== 'early_sip').slice(0, 4)], locked: false } } } };
  assert.ok(questMet(sipped, 'early_sip', draftDay));
  assert.equal(draftPickable(sipped, 'early_sip', draftDay), (sipped.days[dk].quests ?? []).includes('early_sip'));
  assert.equal(questInfo(ds, 'meals', draftDay)?.target, 3);
  assert.equal(questInfo(ds, 'gone_quest', draftDay), null);

  // the weekend finisher: Saturday, the boss nearly down, and the cheapest way to end it
  const sat = new Date(2026, 9, 31, 10); // Saturday
  const monday = startOfWeek(sat);
  const fin = defaultState();
  fin.onboarded = true;
  const setMonday = (xp: number) => {
    fin.days[dayKey(monday)] = { ...empty(), xpEarned: xp };
  };
  setMonday(0);
  const fullHp = bossFor(fin, sat, sat).maxHp;
  // the damage that leaves 1–25 HP (a past day may hit the weakness, so find it rather than assume)
  let xp = fullHp;
  for (; xp > 0; xp--) {
    setMonday(xp);
    const hp = bossFor(fin, sat, sat).hp;
    if (hp >= 1 && hp <= 25) break;
  }
  assert.ok(xp > 0, 'found a nearly beaten boss');
  const f = bossFinisher(fin, sat);
  assert.ok(f, 'Saturday, nearly down: a finishing line');
  assert.equal(f!.hp, bossFor(fin, sat, sat).hp);
  assert.ok(f!.steps.length >= 1 && f!.steps.length <= 3);
  assert.equal(f!.plan, f!.steps.join(' + ').replace(/^./, (c) => c.toUpperCase()));
  assert.ok(!/protein|meal|eat|food/i.test(f!.plan), 'never a food tactic');
  assert.equal(bossFinisher(fin, new Date(2026, 9, 30, 10)), null, 'Friday: no finisher');
  assert.equal(bossFinisher({ ...fin, bossesDefeated: { [dayKey(monday)]: bossFor(fin, sat).id } }, sat), null, 'already down');
  assert.equal(bossFinisher({ ...fin, pauses: [{ from: dayKey(sat), to: dayKey(sat), kind: 'sick' }] }, sat), null, 'never on a sick day');
  const sad = { ...fin, days: { ...fin.days, [dayKey(sat)]: { ...empty(), moods: [{ id: 'm', level: 1 as const, emotions: [], at: sat.getTime() }] } } };
  assert.equal(bossFinisher(sad, sat), null, 'never on a kind day');
  setMonday(0);
  assert.equal(bossFinisher(fin, sat), null, 'a whole boss is more than one day can do');

  // the boss recap: last week's fight, by source, from what the boss maths keeps per day
  const now = new Date(2026, 10, 2, 9); // Monday 2 Nov
  const week = lastWeekKey(now);
  assert.equal(week, '2026-10-26');
  const rc = defaultState();
  rc.onboarded = true;
  const wk = (n: number) => dayKey(addDays(new Date(`${week}T12:00`), n));
  rc.days[wk(0)] = { ...empty(), xpEarned: 40, questsDone: ['meals'] };
  rc.days[wk(1)] = { ...empty(), xpEarned: 120, critDamage: 15 };
  rc.days[wk(3)] = { ...empty(), xpEarned: 80, questsDone: ['water_goal', 'mood'] };
  rc.bossBombs = { [week]: 60 };
  const r = bossRecap(rc, week)!;
  assert.ok(r, 'a week with a fight');
  assert.equal(r.sources.quests + r.sources.xp + r.sources.weakness + r.sources.crits + r.sources.bombs, r.damage, 'the sources add up to the damage');
  assert.equal(r.sources.quests, 8 + 10 + 8, 'quest XP from each day');
  assert.equal(r.sources.crits, 15);
  assert.equal(r.sources.bombs, 60);
  assert.equal(r.top.length, 2);
  assert.ok(r.top[0].damage >= r.top[1].damage);
  assert.equal(r.top[0].day, 'Tuesday');
  assert.ok(!r.beaten && r.hp > 0 && r.fellOn == null);
  const won = { ...rc, bossesDefeated: { [week]: bossFor(rc, new Date(`${week}T12:00`)).id }, bossKilledAt: { [week]: new Date(`${wk(3)}T19:00`).getTime() } };
  const rw = bossRecap(won, week)!;
  assert.ok(rw.beaten && !rw.late && rw.fellOn === 'Thursday' && rw.hp === 0);
  assert.ok(bossRecap({ ...won, bossLateKills: [week] }, week)!.late, 'finished after its week');
  assert.equal(bossRecap(defaultState(), week), null, 'no fight before any XP');
  assert.equal(bossRecap(rc, '2026-10-12'), null, 'a week before the first XP day');
  assert.equal(recentRecaps(rc, 4, now).length, 1);
  assert.ok(pendingRecap(rc, now));
  assert.equal(pendingRecap({ ...rc, bossRecapSeen: week }, now), null, 'dismissed on HQ');

  // old saves: the recap starts next week (no recap of a week long gone), and the finisher ping is on
  const base = defaultState();
  const oldNotify: Partial<typeof base.settings.notify> = { ...base.settings.notify };
  delete oldNotify.weekendBoss;
  const old = hydrate({ ...base, settings: { ...base.settings, notify: oldNotify as typeof base.settings.notify } });
  assert.equal(old.bossRecapSeen, lastWeekKey());
  assert.equal(old.bossRecapAt, lastWeekKey());
  assert.equal(old.settings.notify.weekendBoss, true);
}

// ---- cluster B ----
{
  const emptyB = () => ({ water: [], food: [], sets: [], games: [], bonusGameMin: 0 });

  // loot chests: the original table is unchanged, gold chests skip the gaming minutes, pity forces a legendary
  assert.deepEqual(rollChestB(0.1, {}, 0), { kind: 'coins', amount: 50, text: '🪙 50 coins' });
  assert.equal(rollChestB(0.4).kind, 'gaming');
  assert.equal(rollChestB(0.6).kind, 'double_xp');
  assert.equal(rollChestB(0.8).kind, 'boss_bomb');
  assert.equal(rollChestB(0.93).kind, 'legendary');
  assert.equal(rollChestB(0, { pity: true }).kind, 'legendary');
  assert.equal(rollChestB(0.89).kind, 'boss_bomb');
  assert.equal(rollChestB(0.89, { luck: 0.04 }).kind, 'legendary'); // Treasure Sense: 12 %
  assert.equal(rollChestB(0.86, { gold: true }).kind, 'legendary'); // gold: 15 %
  const goldCoins = rollChestB(0.1, { gold: true }, 0.999);
  assert.equal(goldCoins.kind, 'coins');
  assert.equal(goldCoins.amount, 250);
  assert.ok(goldCoins.gold);
  for (let i = 0; i < 100; i++) assert.notEqual(rollChestB(i / 100, { gold: true }).kind, 'gaming');
  assert.equal(PITY_AFTER, 15);

  // gaming bank: only unused bonus minutes, base budget spent first, capped
  assert.deepEqual(bankFor(60, 180, 100), { minutes: 60, coins: 90 });
  assert.deepEqual(bankFor(60, 180, 160), { minutes: 20, coins: 60 });
  assert.deepEqual(bankFor(60, 180, 200), { minutes: 0, coins: 0 });
  assert.deepEqual(bankFor(10, 130, 0, 4, 120), { minutes: 10, coins: 40 });

  // shop prices: Bomb Maker only touches the bomb
  assert.equal(shopPrice('bomb'), 600);
  assert.equal(shopPrice('bomb', ['bomb_maker']), 450);
  assert.equal(shopPrice('gaming30', ['bomb_maker']), 400);

  // contract difficulty: target and payout move; day-counted goals must fit in the days left
  const mon = new Date(2026, 9, 12, 12);
  const wed = new Date(2026, 9, 14, 12);
  assert.equal(daysLeftInWeek(mon), 7);
  assert.equal(daysLeftInWeek(wed), 5);
  assert.equal(daysLeftInWeek(new Date(2026, 9, 18, 12)), 1);
  assert.equal(targetFor('train', 'easy'), 2);
  assert.equal(targetFor('train', 'hard'), 5);
  assert.equal(targetFor('tasks', 'easy'), 7);
  assert.ok(difficultyOk('water', 'hard', mon));
  assert.ok(!difficultyOk('water', 'hard', wed));
  assert.ok(difficultyOk('water', 'normal', wed));
  assert.ok(difficultyOk('tasks', 'hard', wed)); // a count, not days
  assert.equal(payoutOf({ stake: 100 }), 200);
  assert.equal(payoutOf({ stake: 100, difficulty: 'easy' }), 150);
  assert.equal(payoutOf({ stake: 100, difficulty: 'hard' }), 300);
  assert.equal(payoutOf({ stake: 100, difficulty: 'normal' }, 0.25), 250); // Coin Spinner

  // rested pool: empty days 30, low-battery days 15, nothing before your first XP, capped
  const r = defaultState();
  const ago = (n: number) => dayKey(addDays(new Date(), -n));
  r.days[ago(9)] = { ...emptyB(), xpEarned: 0 }; // before the first XP: doesn't count
  r.days[ago(5)] = { ...emptyB(), xpEarned: 120 };
  r.days[ago(2)] = { ...emptyB(), xpEarned: 50, energy: 2 };
  r.days[ago(1)] = { ...emptyB(), xpEarned: 100 };
  assert.equal(restedGain(r, ago(3), ago(1)), 30 + 15); // day 3 empty, day 2 low battery, day 1 fine
  assert.equal(restedGain(r, ago(10), ago(6)), 0);
  assert.equal(restedGain(defaultState(), ago(3), ago(1)), 0); // a brand-new player
  assert.equal(restedAfter(50, 45), RESTED_CAP);
  assert.deepEqual(restedSplit(60, 10), { extra: 5, left: 55 });
  assert.deepEqual(restedSplit(3, 10), { extra: 3, left: 0 });
  assert.deepEqual(restedSplit(10, 1), { extra: 1, left: 9 });
  assert.deepEqual(restedSplit(10, -5), { extra: 0, left: 10 });
  assert.deepEqual(restedSplit(0, 10), { extra: 0, left: 0 });

  // abilities: a point per level above 1, tiers in order, effects
  const pk = defaultState();
  pk.xp = xpForLevel(4); // level 4: 3 points
  assert.equal(perkPoints(pk), 3);
  assert.equal(perkBlocker(pk, 'hydro_glands'), 'Needs Strong Silk first');
  assert.equal(perkBlocker(pk, 'strong_silk'), null);
  pk.perks = ['strong_silk'];
  assert.equal(perkPoints(pk), 2);
  assert.equal(perkBlocker(pk, 'hydro_glands'), null);
  assert.equal(perkBlocker(pk, 'strong_silk'), 'Unlocked');
  pk.perks = ['strong_silk', 'hydro_glands'];
  assert.equal(perkBlocker(pk, 'second_wind'), 'Needs 3 points');
  assert.equal(workoutBonusMin(pk), 40);
  assert.equal(workoutBonusMin(defaultState()), 30);
  assert.equal(focusBonusMin(defaultState(), 50), 10);
  assert.equal(focusBonusMin({ ...defaultState(), perks: ['focus_silk'] }, 50), 15);
  assert.equal(healShare({ perks: ['thick_silk'] }), 0.5);
  assert.deepEqual(bankRate({ ...defaultState(), perks: ['time_lord'] }), { rate: 4, cap: 120 });
  pk.xp = 0; // a penalty after spending: never negative
  assert.equal(perkPoints(pk), 0);
  // Thick Silk halves doomscroll healing on the boss
  const heal = defaultState();
  heal.days[dayKey()] = { ...emptyB(), screen: { totalMin: 300, doomMin: 160, gamesMin: 0, top: [] } };
  assert.equal(bossFor(heal).healed, 40);
  assert.equal(bossFor({ ...heal, perks: ['thick_silk'] }).healed, 20);

  // wardrobe: shop always, seasonal only in season, legendary never for sale
  const cos = (id: string) => COSMETICS.find((c) => c.id === id)!;
  assert.ok(buyable(cos('top_hat')));
  assert.ok(buyable(cos('pumpkin'), new Date(2026, 9, 31, 12)));
  assert.ok(!buyable(cos('pumpkin'), new Date(2026, 9, 11, 12)));
  assert.ok(!buyable(cos('aura_flame')));
  const w = defaultState();
  const firstLegendary = COSMETICS.find((c) => c.source === 'legendary')!;
  assert.equal(legendaryDrop(w, 0)?.id, firstLegendary.id);
  let all = w;
  for (const c of COSMETICS.filter((x) => x.source === 'legendary')) all = withOwned(all, c.id);
  assert.equal(legendaryDrop(all, 0), null);
  assert.deepEqual(worn(withWorn(w, 'hat', 'crown')), {}); // not owned: not worn
  assert.equal(worn(withWorn(withOwned(w, 'crown'), 'hat', 'crown')).hat?.emoji, '👑');
  assert.equal(worn(withWorn(withWorn(withOwned(w, 'crown'), 'hat', 'crown'), 'hat', null)).hat, undefined);
  const tl = defaultState();
  tl.xp = xpForLevel(3);
  assert.equal(titlesEarned(tl).length, 3);
  tl.cosmetics = { owned: [], worn: {}, title: titlesEarned(tl)[0] };
  assert.equal(shownTitle(tl), titlesEarned(tl)[0]);
  tl.cosmetics = { owned: [], worn: {}, title: 'Not earned' };
  assert.equal(shownTitle(tl), titlesEarned(tl)[2]);

  // gold chest: a great day (score 85+); an empty day isn't one
  const g = defaultState();
  assert.ok(!goldChest(g));
  g.settings.proteinGoal = 0;
  g.days[dayKey()] = { ...emptyB(), water: [{ id: 'w', ml: g.settings.waterGoalMl, at: Date.now() }], sets: [{ id: 's', exercise: 'Squat', weight: 50, reps: 5, at: Date.now() }] };
  assert.ok(goldChest(g));
}

// ---------- step 2b silk ----------
{
  // tiers: quick early, 3 600 XP for all 20, never paid as XP
  assert.equal(tierXp(0), 0);
  assert.equal(tierXp(1), 90);
  assert.equal(tierXp(3), 290);
  assert.equal(tierXp(10), 1300);
  assert.equal(tierXp(SILK_TIERS), 3600);
  for (let n = 1; n <= SILK_TIERS; n++) assert.ok(tierXp(n) > tierXp(n - 1));
  assert.deepEqual([0, 89, 90, 289, 290, 3599, 3600, 99_999].map(tierForXp), [0, 0, 1, 2, 3, 19, 20, 20]);

  // editions: one per month from the table, 20 rewards each, 10 items and 10 dated badges
  const oct = editionFor('2026-10');
  assert.equal(oct.name, 'Halloween edition');
  assert.equal(oct.rewards.length, 20);
  assert.equal(oct.rewards[2].id, 'pumpkin'); // the pumpkin hat sits at tier 3 (the seasonal one)
  assert.equal(oct.rewards[0].id, 'silk_badge_2026-10_1');
  assert.ok(oct.rewards[0].name.endsWith('October 2026'));
  assert.equal(oct.rewards[19].kind, 'aura');
  assert.equal(editionFor('2026-11').name, 'Mys edition');
  assert.equal(editionFor('2027-12').name, 'Lucia & jul edition');
  const ids = new Set<string>();
  for (let m = 1; m <= 12; m++) {
    const ed = editionFor(`2027-${String(m).padStart(2, '0')}`);
    assert.equal(ed.rewards.length, SILK_TIERS, ed.name);
    assert.equal(ed.rewards.filter((r) => r.kind === 'badge').length, 10, ed.name);
    for (const r of ed.rewards) {
      assert.ok(!ids.has(r.id), `duplicate ${r.id}`);
      ids.add(r.id);
    }
  }

  // the month's earned XP fills it; gaming penalties (xpLost) don't drain it; other months don't count
  const sk = defaultState();
  sk.days['2026-10-07'] = { ...emptyDay(), xpEarned: 200, xpLost: 50 };
  sk.days['2026-10-20'] = { ...emptyDay(), xpEarned: 100 };
  sk.days['2026-09-30'] = { ...emptyDay(), xpEarned: 999 };
  assert.equal(monthXp(sk, '2026-10'), 300);

  // grant: tiers 1–3 (badge, title, pumpkin), once
  const g1 = grantSilk(sk, '2026-10');
  assert.deepEqual(g1.unlocked.map((r) => r.tier), [1, 2, 3]);
  assert.deepEqual(g1.state.silk, { month: '2026-10', tier: 3 });
  assert.ok(g1.state.cosmetics!.owned.includes('pumpkin'));
  assert.ok(titlesEarned(g1.state).includes('Trick-or-Treater')); // track titles join the level titles
  assert.equal(grantSilk(g1.state, '2026-10').unlocked.length, 0);
  assert.equal(g1.state.xp, sk.xp); // no XP paid out
  // a piece bought earlier still counts as the tier's reward
  const bought = grantSilk(withOwned(sk, 'pumpkin'), '2026-10');
  assert.ok(bought.unlocked.find((r) => r.id === 'pumpkin')!.had);
  // more XP: only the new tier; an undo later never takes a tier back
  const more = { ...g1.state, days: { ...g1.state.days, '2026-10-21': { ...emptyDay(), xpEarned: 100 } } };
  assert.deepEqual(grantSilk(more, '2026-10').unlocked.map((r) => r.tier), [4]);
  const undone = { ...g1.state, days: { ...g1.state.days, '2026-10-20': { ...emptyDay(), xpEarned: 0 } } };
  assert.equal(silkStatus(undone, '2026-10').tier, 3);
  assert.equal(silkStatus(undone, '2026-10').next?.reward.tier, 4);

  // month change: last month's late XP still pays while it's on record, then the new edition takes over
  const late = { ...g1.state, days: { ...g1.state.days, '2026-10-31': { ...emptyDay(), xpEarned: 400 } } }; // 700 in October
  const nov1 = checkSilkTrack(late, '2026-11-01');
  assert.deepEqual(nov1.unlocked.map((u) => [u.edition.name, u.tier]), [['Halloween edition', 6]]);
  assert.equal(nov1.state.silk?.month, '2026-10'); // nothing earned in November yet
  const nov2 = checkSilkTrack({ ...nov1.state, days: { ...nov1.state.days, '2026-11-02': { ...emptyDay(), xpEarned: 100 } } }, '2026-11-02');
  assert.deepEqual(nov2.unlocked.map((u) => [u.edition.name, u.tier]), [['Mys edition', 1]]);
  assert.deepEqual(nov2.state.silk, { month: '2026-11', tier: 1, prev: { month: '2026-10', tier: 6 } });
  assert.equal(checkSilkTrack(nov2.state, '2026-11-02').unlocked.length, 0);
  // October XP that lands after November's first tier (a watch sync, a boss settled late) still pays October's tier
  const synced = { ...nov2.state, days: { ...nov2.state.days, '2026-10-31': { ...emptyDay(), xpEarned: 400 + tierXp(7) - 700 } } };
  const caught = checkSilkTrack(synced, '2026-11-02');
  assert.deepEqual(caught.unlocked.map((u) => [u.edition.name, u.tier]), [['Halloween edition', 7]]);
  assert.deepEqual(caught.state.silk, { month: '2026-11', tier: 1, prev: { month: '2026-10', tier: 7 } });
  assert.equal(silkStatus(caught.state, '2026-10').tier, 7);
  assert.deepEqual(checkSilkTrack(synced, '2026-11-03').unlocked, [], 'two days in, October is closed');
  // a record two months old isn't caught up: that edition is over
  assert.deepEqual(checkSilkTrack(late, '2026-12-05').unlocked, []);

  // wardrobe: track pieces wear like any other, can't be bought, and say where they come from
  const veil = cosmeticOf('silk_halloween_5')!;
  assert.equal(veil.name, 'Cobweb veil');
  assert.equal(veil.slot, 'hat');
  assert.ok(!buyable(veil));
  assert.equal(whereToGet(veil), 'Silk Track · Halloween edition');
  assert.equal(worn(withWorn(withOwned(sk, veil.id), 'hat', veil.id)).hat?.emoji, '🕸️');
  assert.equal(cosmeticOf('silk_halloween_9')?.ring, '#C7B8FF'); // the ghost aura recolours the ring
  // badges: dated, listed in tier order
  const bd = { ...sk, cosmetics: { owned: ['silk_badge_2026-10_10', 'silk_badge_2026-10_4', 'cap'], worn: {} } };
  assert.deepEqual(silkBadges(bd).map((b) => b.tier), [4, 10]);

  // the toasts fill every placeholder
  for (const k of ['silkTier', 'silkTiers', 'silkDone'] as const)
    for (const t of [...LINES[k].mild, ...LINES[k].savage]) assert.ok(!fillLine(t, { tier: 3, reward: '🎃 Pumpkin hat', month: 'Halloween edition', count: 3 }).includes('{'), t);
}

// ---- cluster F ----
{
  // Swedish calendar: Easter, midsommarafton, alla helgons dag, red days, klämdagar, payday
  assert.equal(dayKey(easterSunday(2026)), '2026-04-05');
  assert.equal(dayKey(easterSunday(2027)), '2027-03-28');
  assert.equal(dayKey(easterSunday(2028)), '2028-04-16');
  assert.equal(dayKey(midsummerEve(2026)), '2026-06-19');
  assert.equal(dayKey(midsummerEve(2027)), '2027-06-25');
  assert.equal(dayKey(allSaintsDay(2026)), '2026-10-31');
  assert.equal(dayKey(allSaintsDay(2027)), '2027-11-06');
  assert.equal(holidaysOf(2026).length, 17);
  assert.equal(holidaysOf(2026).filter((h) => h.red).length, 13);
  assert.equal(holidayOn(new Date(2026, 4, 14))?.name, 'Kristi himmelsfärds dag');
  assert.equal(holidayOn(new Date(2026, 5, 19))?.red, false); // midsommarafton: off, but not red
  assert.equal(holidayOn(new Date(2026, 9, 13)), null);
  assert.ok(isDayOff(new Date(2026, 11, 24)) && isDayOff(new Date(2026, 9, 17)) && !isDayOff(new Date(2026, 9, 13)));
  assert.ok(isKlamdag(new Date(2026, 4, 15))); // the Friday after Kristi himmelsfärd
  assert.ok(!isKlamdag(new Date(2026, 4, 14)) && !isKlamdag(new Date(2026, 4, 13)));
  assert.equal(dayKey(paydayOf(2026, 10)), '2026-10-23'); // the 25th is a Sunday
  assert.equal(dayKey(paydayOf(2026, 12)), '2026-12-23'); // 25th Juldagen, 24th Julafton
  assert.equal(dayKey(paydayOf(2026, 11)), '2026-11-25');
  assert.ok(isPayday(new Date(2026, 9, 23, 9)) && !isPayday(new Date(2026, 9, 25)));
  const up = upcomingDays(new Date(2026, 4, 8, 12));
  assert.deepEqual(up.map((n) => n.kind), ['holiday', 'klamdag']);
  assert.ok(up[0].text.startsWith('Kristi himmelsfärds dag'));
  assert.deepEqual(upcomingDays(new Date(2026, 9, 13, 12)), []);
  assert.equal(upcomingDays(new Date(2026, 9, 23, 12))[0]?.kind, 'payday');

  // the Swedish year's seasons, each with a seasonal quest even on a fresh state
  assert.equal(seasonOn(new Date(2027, 2, 21))?.id, 'easter'); // Palm Sunday
  assert.equal(seasonOn(new Date(2027, 2, 29))?.id, 'easter'); // Annandag påsk
  assert.equal(dayKey(seasonOn(new Date(2027, 2, 21))!.lastDay), '2027-03-29');
  assert.equal(seasonOn(new Date(2027, 2, 30)), null);
  assert.equal(seasonOn(new Date(2027, 3, 30))?.id, 'valborg');
  assert.equal(seasonOn(new Date(2027, 5, 26))?.id, 'midsommar');
  assert.equal(seasonOn(new Date(2027, 5, 27)), null);
  assert.equal(seasonOn(new Date(2026, 11, 31))?.id, 'nyar');
  assert.equal(seasonOn(new Date(2027, 0, 1))?.id, 'nyar');
  assert.equal(dayKey(seasonOn(new Date(2026, 11, 31))!.lastDay), '2027-01-01');
  assert.equal(seasonOn(new Date(2027, 0, 2)), null);
  for (const [id, day] of [['easter', new Date(2027, 2, 25, 12)], ['valborg', new Date(2027, 3, 30, 12)], ['midsommar', new Date(2027, 5, 25, 12)], ['nyar', new Date(2026, 11, 31, 12)]] as const) {
    assert.ok(seasonOn(day)!.line in LINES, id);
    const picks = pickQuests(defaultState(), day);
    assert.equal(picks.length, 3, id);
    assert.equal(picks.filter((q) => /^(easter_|valborg_|midsommar_|nyar_)/.test(q)).length, 1, `${id}: ${picks}`);
  }
  assert.equal(bossFor(defaultState(), new Date(2026, 11, 31, 12)).name, 'The Old Year');
  assert.equal(bossFor(defaultState(), new Date(2026, 11, 28, 12)).name, 'The Old Year', "Monday of nyår's week already");
  assert.notEqual(bossFor(defaultState(), new Date(2026, 11, 27, 12)).name, 'The Old Year');

  // Easter eggs: per year, 30 coins each in the store, all five unlock a secret
  const eg = defaultState();
  const easter = new Date(2027, 2, 25, 12);
  assert.equal(eggsLeft(eg, easter), EGGS.length);
  eg.eggsFound = { '2027': { hq: easter.getTime(), gym: easter.getTime() - 86_400_000 } };
  assert.equal(eggsLeft(eg, easter), 3);
  assert.equal(eggsFoundOn(eg, easter), 1);
  assert.equal(eggsLeft(eg, new Date(2028, 3, 12)), EGGS.length); // a new year, a new hunt
  assert.ok(!allEggsSomeYear(eg));
  eg.eggsFound['2027'] = Object.fromEntries(EGGS.map((e) => [e, easter.getTime()]));
  assert.ok(allEggsSomeYear(eg));
  assert.ok(SECRET_ACHIEVEMENTS.find((a) => a.id === 's_egg_hunter')!.test(eg));

  // Valborg: open tasks over 30 days old burn; finished old ones count too
  const vb = defaultState();
  const now = Date.now();
  vb.tasks = [
    { id: 'old', title: 'Old', done: false, createdAt: now - 40 * 86_400_000 },
    { id: 'new', title: 'New', done: false, createdAt: now - 2 * 86_400_000 },
    { id: 'olddone', title: 'Old done', done: true, createdAt: now - 60 * 86_400_000, doneAt: now },
  ];
  assert.deepEqual(staleTasks(vb, now).map((t) => t.id), ['old']);
  assert.equal(oldTasksDoneOn(vb, now), 1);

  // phone in bed: bedtime until 05:00, short nights aren't mentioned
  const morning = new Date(2026, 9, 13, 8);
  const win = nightWindow(morning, 23);
  assert.equal(new Date(win.bed).getHours(), 23);
  assert.equal(dayKey(win.bed), '2026-10-12');
  assert.equal(new Date(win.end).getHours(), 5);
  assert.equal(dayKey(nightWindow(morning, 1).bed), '2026-10-13'); // a bedtime after midnight is that morning's
  const at = (h: number, m = 0) => atTime(morning, h >= 12 ? -1 : 0, h, m).getTime();
  const spans = [
    { label: 'Instagram', start: at(22, 30), end: at(23, 20) }, // 20 min after bedtime
    { label: 'TikTok', start: at(0, 10), end: at(0, 47) }, // 37 min
    { label: 'Clock', start: at(7), end: at(7, 5) }, // morning, outside the window
  ];
  const nightUse = nightPhone(spans, win.bed, win.end);
  assert.equal(nightUse.lateMin, 57);
  assert.equal(nightUse.top, 'TikTok');
  assert.equal(dayKey(nightUse.lastAt!), '2026-10-13');
  assert.equal(new Date(nightUse.lastAt!).getMinutes(), 47);
  assert.deepEqual(nightPhone([{ label: 'X', start: at(23, 0), end: at(23, 5) }], win.bed, win.end), { lateMin: 5, lastAt: null, top: null, from: win.bed });
  // with the watch: counted from the watch's bedtime when that was later (the sofa before a late night isn't bed)
  const watchBed = at(0, 30);
  assert.equal(inBedFrom(win.bed, watchBed), watchBed);
  assert.equal(inBedFrom(win.bed, at(22)), win.bed); // in bed early: still from the target bedtime
  assert.equal(inBedFrom(win.bed, undefined), win.bed);
  const fromWatch = nightPhone(spans, inBedFrom(win.bed, watchBed), win.end);
  assert.equal(fromWatch.lateMin, 17); // TikTok from 00:30 to 00:47 only
  assert.equal(fromWatch.from, watchBed);

  // automatic backup: once a day, whatever the weekday
  const sunday = new Date(2026, 9, 18, 10);
  assert.ok(autoBackupDue(null, sunday));
  assert.ok(autoBackupDue(sunday.getTime() - 2 * 86_400_000, sunday));
  assert.ok(!autoBackupDue(sunday.getTime() - 3_600_000, sunday)); // already today
  assert.ok(autoBackupDue(sunday.getTime() - 3_600_000, new Date(2026, 9, 19, 10))); // Monday: yesterday's doesn't count
  assert.ok(!autoBackupDue(new Date(2026, 9, 19, 0, 5).getTime(), new Date(2026, 9, 19, 23, 50)));

  // the backup nudge: not on a brand-new install, not while backups keep landing, and 'stale' when a set folder went quiet
  const nb = { backupFolderUri: null as string | null, lastBackupAt: null as number | null, lastSharedAt: null as number | null, firstDay: '2026-10-07' };
  const nudgeAt = new Date(2026, 9, 24, 12);
  const daysAgo = (n: number) => nudgeAt.getTime() - n * 86_400_000;
  assert.equal(backupNudge(nb, nudgeAt), 'setup');
  assert.equal(backupNudge({ ...nb, firstDay: '2026-10-23' }, nudgeAt), null); // one day in: too early to nag
  assert.equal(backupNudge({ ...nb, firstDay: null }, nudgeAt), null);
  assert.equal(backupNudge({ ...nb, lastSharedAt: daysAgo(2) }, nudgeAt), null); // sent off the phone this week
  assert.equal(backupNudge({ ...nb, lastSharedAt: daysAgo(8) }, nudgeAt), 'setup');
  assert.equal(backupNudge({ ...nb, backupFolderUri: 'content://x', lastBackupAt: daysAgo(0.5) }, nudgeAt), null);
  assert.equal(backupNudge({ ...nb, backupFolderUri: 'content://x', lastBackupAt: daysAgo(9) }, nudgeAt), 'stale');
  assert.equal(backupNudge({ ...nb, backupFolderUri: 'content://x', lastBackupAt: daysAgo(9), lastSharedAt: daysAgo(1) }, nudgeAt), 'stale'); // the folder still went quiet

  // the weekly photo tidy-up: only what no kept backup needs, and nothing when a kept file can't be read
  assert.deepEqual(orphanPhotos(['a.jpg', 'b.jpg', 'c.jpg'], [{ u1: 'a.jpg' }, { u1: 'a.jpg', u2: 'c.jpg' }]), ['b.jpg']);
  assert.equal(orphanPhotos(['a.jpg'], [{ u1: 'b.jpg' }, null]), null);

  // red days as rest days (opt-in): Juldagen is a Friday with a plan; midsommarafton isn't red
  const rd = defaultState();
  const xmas = new Date(2026, 11, 25, 12);
  assert.ok(workoutFor(rd, xmas));
  rd.settings.redDaysOff = true;
  assert.equal(workoutFor(rd, xmas), null);
  assert.ok(workoutFor(rd, new Date(2027, 5, 25, 12)));
}

// ---- cluster E ----
{
  // HQ layout: default order, saved orders keep their order, retired ids drop out and new ones slot in by their default neighbour
  const ids = HQ_SECTIONS.map((x) => x.id);
  assert.deepEqual(hqOrder(), ids);
  // the SL card sits right after weather; the check-ins card has no neighbour before it, so it goes on top
  assert.deepEqual(hqOrder({ order: ['achievements', 'gone', 'weather'], hidden: [] }).slice(0, 4), ['care', 'achievements', 'weather', 'commute']);
  const saved = hqOrder({ order: ['achievements', 'weather'], hidden: [] });
  assert.equal(saved.length, ids.length);
  assert.equal(new Set(saved).size, ids.length);
  const moved = moveSection(null, 'quests', -1);
  assert.equal(moved.order.indexOf('quests'), ids.indexOf('quests') - 1);
  assert.deepEqual(moveSection(null, 'care', -1).order, ids); // already first
  const hidden = toggleSection(null, 'insight');
  assert.ok(!hqVisible(hidden).includes('insight'));
  assert.ok(hqVisible(toggleSection(hidden, 'insight')).includes('insight'));

  // This week: on by default in place of the full weekly cards, which stay in the list (hidden) to bring back
  const shown = hqVisible();
  assert.ok(shown.includes('week') && shown.includes('quests'));
  for (const id of WEEK_PARTS) assert.ok(!shown.includes(id) && ids.includes(id), id);
  assert.ok(shown.indexOf('tiles') < shown.indexOf('level') && shown.indexOf('buttons') < shown.indexOf('week'), 'quick logging comes first');
  assert.ok(hqVisible(toggleSection(null, 'league')).includes('league'), 'a hidden-by-default card comes back');
  assert.ok(hqHidden(moveSection(null, 'weather', 1)).includes('silk'), 'moving keeps the default hidden cards hidden');
  // a saved layout: This week takes the first weekly card's place, the rest is untouched, nothing is lost
  const mine = { order: ['tiles', 'quests', 'silk', 'league', 'weather'], hidden: ['medals', 'achievements'] };
  const moved2 = withWeekCard(mine);
  assert.ok(moved2.order.indexOf('week') === moved2.order.indexOf('silk') - 1 && moved2.order.indexOf('quests') < moved2.order.indexOf('week'));
  assert.equal(new Set(moved2.order).size, ids.length);
  assert.ok(WEEK_PARTS.every((id) => moved2.hidden.includes(id)) && moved2.hidden.includes('achievements') && !moved2.hidden.includes('week'));
  assert.ok(hqVisible(moved2).includes('week') && !hqVisible(moved2).includes('silk'));
  // no weekly card was showing: it goes just above the quests; everything it replaces was hidden: it stays hidden
  const aboveQuests = withWeekCard({ order: ['weather', 'quests'], hidden: [...WEEK_PARTS] }).order;
  assert.equal(aboveQuests.indexOf('week'), aboveQuests.indexOf('quests') - 1);
  // a real layout saved before step 6 (no care, week or trek card yet), every weekly card and the quests hidden
  const oldIds = ['weather', 'commute', 'countdowns', 'swedishDays', 'sleep', 'top3', 'winddown', 'debrief', 'level', 'progress', 'shortcuts', 'league', 'silk', 'medals', 'contract', 'experiment', 'insight', 'quests', 'wild', 'tiles', 'buttons', 'upnext', 'achievements'];
  const allOff = withWeekCard({ order: oldIds, hidden: ['league', 'silk', 'medals', 'contract', 'quests'] });
  assert.ok(allOff.hidden.includes('week') && allOff.hidden.includes('trek'), 'everything it replaces was hidden: it stays hidden');
  const someOn = withWeekCard({ order: oldIds, hidden: ['league', 'silk', 'medals', 'contract'] });
  assert.ok(!someOn.hidden.includes('week') && someOn.hidden.includes('trek') && hqVisible(someOn).includes('quests'));
  assert.ok(!withWeekCard({ order: [], hidden: [] }).hidden.includes('week'), 'a layout that knew none of them keeps This week');
  // the one-time repair: only a saved layout changes, and only once
  const hqSave = defaultState();
  hqSave.settings.hq = mine;
  assert.deepEqual(moveToWeekCard(hqSave).settings.hq, moved2);
  assert.equal(moveToWeekCard(defaultState()).settings.hq, undefined);
  const repaired = hydrate({ ...hqSave, fixes: ['coffee-gremlin'] });
  assert.ok(repaired.fixes?.includes('hq-week-card') && hqVisible(repaired.settings.hq).includes('week'));
  const reshown = { ...repaired, settings: { ...repaired.settings, hq: toggleSection(repaired.settings.hq, 'silk') } };
  assert.ok(hqVisible(hydrate(reshown).settings.hq).includes('silk'), 'a card brought back stays back');
  assert.equal(weekDaysLeft(new Date(2026, 9, 26, 12)), 7); // Monday
  assert.equal(weekDaysLeft(new Date(2026, 10, 1, 12)), 1); // Sunday

  // the immortal task: the oldest one open a week or more, counted by age (never "days in a row")
  const day = 86_400_000;
  const nowMs = Date.now();
  const it = defaultState();
  it.tasks = [
    { id: 'new', title: 'New', done: false, createdAt: nowMs - 2 * day },
    { id: 'old', title: 'Call the dentist', done: false, createdAt: nowMs - 12 * day - 60_000 },
    { id: 'older-done', title: 'Done ages ago', done: true, createdAt: nowMs - 40 * day, doneAt: nowMs - 30 * day },
  ];
  assert.deepEqual(immortalTask(it, nowMs), { task: it.tasks[1], days: 12 });
  assert.equal(immortalTask({ ...it, tasks: [it.tasks[0]] }, nowMs), null);
  assert.equal(taskAgeDays(it.tasks[0], nowMs), 2);
  const hunter = SECRET_ACHIEVEMENTS.find((a) => a.id === 's_monster_hunter')!;
  assert.ok(hunter.test(it)); // 'Done ages ago' was open 10 days
  assert.ok(!hunter.test({ ...it, tasks: [it.tasks[0], it.tasks[1]] }));
  assert.equal(IMMORTAL_DAYS, 7); // the secret's test hard-codes 7 days

  // yesterday callbacks (now: Wednesday 13 Jan 2027, so yesterday was a Tuesday = Pull day in the default plan)
  const wed = new Date(2027, 0, 13, 9);
  const tue = '2027-01-12';
  const blank = () => ({ water: [], food: [], sets: [], games: [], bonusGameMin: 0 });
  const yc = defaultState();
  assert.equal(yesterdayHighlight(yc, wed), null); // nothing logged yesterday
  yc.days[tue] = blank();
  assert.deepEqual(yesterdayHighlight(yc, wed), { key: 'callbackSkip', vars: { workout: 'Pull' } });
  // a heavier set than any earlier session is a record
  yc.days['2027-01-05'] = { ...blank(), sets: [{ id: 'a', exercise: 'Barbell row', weight: 50, reps: 8, at: 0 }] };
  yc.days[tue] = { ...blank(), sets: [{ id: 'b', exercise: 'barbell row ', weight: 55, reps: 6, at: 0 }] };
  assert.deepEqual(yesterdayHighlight(yc, wed), { key: 'callbackPR', vars: { exercise: 'barbell row', weight: 55 } });
  // gaming past bedtime (23:00) beats the plain training remark
  yc.days[tue] = { ...blank(), sets: [{ id: 'b', exercise: 'Barbell row', weight: 45, reps: 6, at: 0 }] };
  yc.days[tue].games = [{ start: new Date(2027, 0, 12, 22).getTime(), end: new Date(2027, 0, 13, 1, 12).getTime() }];
  assert.deepEqual(yesterdayHighlight(yc, wed), { key: 'callbackLateGame', vars: { time: fmtTime(new Date(2027, 0, 13, 1, 12)) } });
  // a low mood yesterday: only kind words
  yc.days[tue].moods = [{ id: 'm', level: 2, emotions: [], at: 0 }];
  assert.equal(yesterdayHighlight(yc, wed)?.key, 'callbackGentle');
  // a rest day with very little water
  const thu = new Date(2027, 0, 14, 8);
  yc.days['2027-01-13'] = { ...blank(), water: [{ id: 'w', ml: 500, at: 0 }] };
  assert.equal(yesterdayHighlight(yc, thu)?.key, 'callbackGentle', "Tuesday's low mood carries into Wednesday, which had no check-in");
  yc.days['2027-01-13'].moods = [{ id: 'm2', level: 4, emotions: [], at: 0 }];
  assert.deepEqual(yesterdayHighlight(yc, thu), { key: 'callbackDry', vars: { water: '0.5' } });
  for (const k of ['callbackGentle', 'callbackPR', 'callbackQuests', 'callbackLateGame', 'callbackSkip', 'callbackWin', 'callbackDry', 'callbackSlow'] as const) {
    assert.ok(LINES[k].mild.length > 0 && LINES[k].savage.length > 0, k);
  }

  // rival trash talk: first look only remembers; a pass makes one rival talk; at most two a day; quiet on low-mood days
  const noon = new Date(2027, 0, 13, 12);
  const rt = defaultState();
  rt.onboarded = true;
  rt.league = newLeague(0, weekKeyOf(noon));
  const first = rivalTalk(rt, noon)!;
  assert.equal(first.line, null);
  assert.equal(first.talk.rank, 10); // 0 XP: last
  rt.rivalTalk = first.talk;
  assert.equal(rivalTalk(rt, noon), null); // nothing changed
  const todayKey = dayKey(noon);
  rt.days[todayKey] = { ...blank(), xpEarned: 100_000 };
  const up = rivalTalk(rt, noon, () => 0)!;
  const table = standings(rt, noon);
  assert.equal(up.talk.rank, 1);
  assert.equal(up.talk.n, 1);
  assert.equal(up.line?.tone, 'good');
  assert.ok(up.line!.text.startsWith(`${table[1].emoji} ${table[1].name}: "`), up.line!.text); // the one you just passed
  rt.rivalTalk = up.talk;
  rt.days[todayKey] = { ...blank(), xpEarned: 0 };
  const down = rivalTalk(rt, noon, () => 0)!;
  assert.equal(down.talk.rank, 10);
  assert.equal(down.line?.tone, 'info');
  rt.rivalTalk = down.talk;
  rt.days[todayKey] = { ...blank(), xpEarned: 100_000 };
  const third = rivalTalk(rt, noon)!;
  assert.equal(third.line, null); // today's two are used up
  assert.equal(third.talk.rank, 1);
  rt.rivalTalk = { ...third.talk, rank: 10, day: '2027-01-12' }; // a new day resets the allowance
  assert.ok(rivalTalk(rt, noon)!.line);
  rt.days[todayKey].moods = [{ id: 'm', level: 1, emotions: [], at: noon.getTime() }];
  assert.equal(rivalTalk(rt, noon)!.line, null); // low mood: rivals keep quiet
  for (const t of allRivalLines()) {
    for (const m of t.matchAll(/\{(\w+)\}/g)) assert.equal(m[1], 'name', t);
  }

  // evening debrief: until 04:00 it's still last night; tonight's top-3 picks show up the next day only
  const late = new Date(2027, 0, 14, 1, 30).getTime();
  assert.equal(eveningKey(late), '2027-01-13');
  assert.equal(tomorrowKey(late), '2027-01-14');
  assert.equal(tomorrowKey(new Date(2027, 0, 13, 21).getTime()), '2027-01-14');
  // by the clock: on the night the clocks go back (25 Oct 2026), 03:30 is still that evening, not "4 hours ago" = the new day
  assert.equal(eveningKey(new Date(2026, 9, 25, 3, 30)), '2026-10-24');
  assert.equal(tomorrowKey(new Date(2026, 9, 25, 3, 30)), '2026-10-25');
  assert.equal(eveningKey(new Date(2026, 9, 25, 4, 0)), '2026-10-25');
  const tt = defaultState();
  tt.tasks = [
    { id: 'a', title: 'A', done: false, createdAt: 0 },
    { id: 'b', title: 'B', done: true, createdAt: 0, doneAt: 1 },
  ];
  tt.topTomorrow = { day: '2027-01-14', ids: ['b', 'gone', 'a'] };
  assert.deepEqual(
    topToday(tt, new Date(2027, 0, 14, 9).getTime()).map((t) => t.id),
    ['b', 'a'],
  );
  assert.deepEqual(topToday(tt, new Date(2027, 0, 15, 9).getTime()), []);
}

// ---- cluster C ----
// adaptive water: only hot days raise the goal, training days (planned or done) never do; off means the plain goal
{
  const w = defaultState();
  const sunday = '2027-01-10'; // a rest day in the default plan
  const monday = '2027-01-11'; // Push day
  w.days[sunday] = { water: [], food: [], sets: [], games: [], bonusGameMin: 0 };
  assert.equal(waterGoalFor(w, sunday), w.settings.waterGoalMl);
  assert.equal(waterGoalFor(w, monday), w.settings.waterGoalMl, 'a planned gym day keeps the plain goal');
  w.days[monday] = { water: [], food: [], sets: [], games: [], bonusGameMin: 0, activities: [{ id: 'm', kind: 'cardio', minutes: 45, at: 0 }] };
  assert.deepEqual(waterGoalParts(w, monday), { ml: w.settings.waterGoalMl, why: [] }, 'a day trained keeps the plain goal');
  w.days[sunday] = { ...w.days[sunday], weather: { max: 23, min: 14, rainMm: 0, sunMin: 300, code: 0 } };
  assert.equal(waterGoalFor(w, sunday), w.settings.waterGoalMl + 300);
  w.days[sunday] = { ...w.days[sunday], weather: { max: 27, min: 16, rainMm: 0, sunMin: 500, code: 0 } };
  w.days[sunday].activities = [{ id: 'a', kind: 'cardio', minutes: 30, at: 0 }]; // trained on a rest day
  const parts = waterGoalParts(w, sunday);
  assert.equal(parts.ml, w.settings.waterGoalMl + 500);
  assert.deepEqual(parts.why, ['+500 ml: 27°']);
  w.settings.adaptiveWater = false;
  assert.equal(waterGoalFor(w, sunday), w.settings.waterGoalMl);
}

// sleep nights: the main session plus a split-off piece, stages summed; typed-in nights stay the watch's own business
// Steps from Health Connect records: Zepp's own records added up, a block over midnight prorated,
// overlapping records counted once per stretch of time, from the newest (as Health Connect does within one app)
{
  const day = new Date(2026, 9, 24).getTime();
  const H = 3_600_000;
  const end = day + 24 * H;
  const rec = (h0: number, h1: number, count: number, modified?: number) => ({ start: day + h0 * H, end: day + h1 * H, count, origin: ZEPP, modified });
  assert.equal(stepsIn([rec(8, 9, 1000), rec(9, 10, 2185)], day, end), 3185);
  assert.equal(stepsIn([rec(-1, 1, 400), rec(9, 10, 100)], day, end), 300); // half of the block from before midnight
  assert.equal(stepsIn([rec(14, 15, 300, 1), rec(14, 15, 900, 2)], day, end), 900); // written again: the newest counts
  // a growing block written again with a later end: the newest covers its whole span
  assert.equal(stepsIn([rec(14, 14.5, 300, 1), rec(14, 15, 900, 2)], day, end), 900);
  // half-overlapping blocks: the shared hour comes from the newer one
  assert.equal(stepsIn([rec(8, 10, 600, 1), rec(9, 11, 400, 2)], day, end), 300 + 400);
  // a block and its parts written later: the parts win where they are
  assert.equal(stepsIn([rec(8, 10, 500, 1), rec(8, 9, 200, 2), rec(9, 10, 300, 2)], day, end), 500);
  assert.equal(stepsIn([rec(8, 10, 500, 3), rec(8, 9, 200, 2), rec(9, 10, 300, 2)], day, end), 500); // the block is newest
  assert.equal(stepsIn([], day, end), 0);
  assert.equal(stepsIn([{ start: day + 5 * H, end: day + 5 * H, count: 7 }], day, end), 7); // an instant
  assert.equal(overlapsIn([rec(8, 9, 1), rec(9, 10, 1)]), 0);
  assert.equal(overlapsIn([rec(8, 10, 1), rec(9, 11, 1), rec(9, 11, 1)]), 2);
  assert.equal(coveredUntil([rec(8, 9, 10), rec(13, 14, 0)], day, end), day + 14 * H); // a zero-step block still says how far Zepp got
  assert.equal(coveredUntil([], day, end), null);
  assert.equal(coveredUntil([rec(23, 25, 10)], day, end), end);
  const sources = stepSources(
    [
      { start: day + 8 * H, end: day + 9 * H, count: 2500, origin: 'com.google.android.apps.fitness', modified: 5 },
      rec(8, 9, 2000),
      rec(-3, -2, 999), // yesterday's, read only for the lead
    ],
    day,
    end,
  );
  assert.deepEqual(
    sources.map((x) => [x.name, x.steps, x.records]),
    [
      ['Zepp', 2000, 1],
      ['Google Fit', 2500, 1],
    ],
  );
  assert.equal(sources[0].lastEnd, day + 9 * H);
  assert.equal(sources[0].minutes, 60);
  assert.equal(sources[0].lastWritten, null);
  assert.equal(sources[1].lastWritten, 5);
  assert.equal(sourceName('com.example'), 'com.example');
  assert.equal(sourceName('com.android.healthconnect.phone.a1b2c3'), 'This phone');
  assert.equal(sourceName('android'), 'This phone');
  // a failed read is unknown (never another source's number); other apps fill a day without Zepp, and
  // today's time after Zepp's newest record when filling is on
  assert.equal(stepsPlan(null, day, end), null);
  assert.deepEqual(stepsPlan([], day, end), { zepp: 0, until: null, gap: day });
  assert.deepEqual(stepsPlan([rec(8, 9, 1000)], day, end), { zepp: 1000, until: day + 9 * H, gap: null }); // a past day: Zepp's alone
  assert.deepEqual(stepsPlan([rec(8, 9, 1000)], day, end, day + 14.5 * H), { zepp: 1000, until: day + 9 * H, gap: day + 9 * H });
  assert.deepEqual(stepsPlan([rec(14, 15, 1000)], day, end, day + 14.5 * H), { zepp: 1000, until: day + 15 * H, gap: null }); // an open block reaches past now
  assert.deepEqual(stepsPlan([rec(-1, 1, 400)], day, end), { zepp: 200, until: day + H, gap: null }); // read with the lead: its part after midnight
  // hour by hour per app, and the check's verdict and report
  const hours = stepsByHour([rec(8, 9, 100), rec(9.5, 10.5, 60), { start: day + 8 * H, end: day + 9 * H, count: 70, origin: 'android' }], day, day + 10 * H);
  assert.deepEqual(
    hours.map((x) => [new Date(x.at).getHours(), x.bySource]),
    [
      [8, { Zepp: 100, 'This phone': 70 }],
      [9, { Zepp: 30 }],
    ],
  );
  const at = day + 14.5 * H;
  const check: StepsCheck = {
    at,
    steps: 2932,
    plan: { zepp: 2032, until: day + 14 * H, gap: day + 14 * H },
    gapSteps: 900,
    fill: true,
    zeppMerged: 0,
    merged: 2950,
    sources: stepSources([rec(13, 14, 2032, at - 20 * 60_000), { start: day + 13 * H, end: day + 14.5 * H, count: 2950, origin: 'android' }], day, end),
    hours: [],
    zeppTail: [rec(13, 14, 2032, at - 20 * 60_000)],
    errors: [],
    android: '35',
  };
  const verdict = stepsVerdict(check).join(' ');
  assert.ok(verdict.includes('stop at 14:00') && verdict.includes('30 min'), verdict); // Zepp is behind
  assert.ok(verdict.includes('900'), verdict); // the phone fills it
  assert.ok(verdict.includes('priority list'), verdict); // Health Connect leaves Zepp out of its own total
  assert.ok(verdict.includes('2\u00a0950') || verdict.includes('2 950'), verdict); // why the Health Connect app differs
  const report = stepsReport(check);
  assert.ok(report.includes('Zepp') && report.includes('This phone') && report.includes('Errors: none'), report);
  assert.ok(!stepsVerdict({ ...check, plan: { zepp: 2032, until: at - 2 * 60_000, gap: null }, gapSteps: null, zeppMerged: 2032, merged: 2032, steps: 2032 }).length);
}
{
  const key = '2027-01-12';
  const at = (h: number, m = 0) => new Date(`${key}T00:00`).getTime() + (h * 60 + m) * 60_000; // hours from that midnight
  const main = {
    start: at(-1),
    end: at(5),
    stages: [
      { start: at(-1), end: at(0), stage: 4 },
      { start: at(0), end: at(2), stage: 5 },
      { start: at(2), end: at(2, 30), stage: 1 },
      { start: at(2, 30), end: at(5), stage: 6 },
    ],
  };
  const tail = { start: at(5, 40), end: at(7), stages: [{ start: at(5, 40), end: at(7), stage: 4 }] };
  const nap = { start: at(15), end: at(16), stages: [] }; // after 14:00: tomorrow's window, not this night
  const night = nightOf([nap, tail, main], key)!;
  assert.equal(night.bedAt, at(-1));
  assert.equal(night.wakeAt, at(7));
  assert.deepEqual(night.stages, { deep: 120, light: 140, rem: 150, awake: 30 });
  // asleep: the stages that aren't awake, not wake − bed − awake (that counted the 40-minute gap as sleep)
  assert.equal(asleepMin(night), 410);
  assert.equal(stagedMin(night), 440); // what the stage shares are of: they add up to 100 %
  // a split night without stages: two stretches of sleep, the gap between them isn't sleep
  const plain = nightOf([{ start: at(-1), end: at(3), stages: [] }, { start: at(4), end: at(7), stages: [] }], key)!;
  assert.equal(asleepMin(plain), 420);
  assert.equal(plain.stages, null);
  assert.equal(nightOf([nap], key), null);
  assert.equal(nightOf([{ ...main, stages: [{ start: at(-1), end: at(5), stage: 2 }] }], key)!.stages, null); // only "sleeping"
  assert.equal(nightClock(at(-1), key), -60);
  assert.equal(clockLabel(-60), '23:00');
  assert.equal(clockLabel(45), '00:45');

  const ns = defaultState();
  const empty = { water: [], food: [], sets: [], games: [], bonusGameMin: 0 };
  ns.days['2027-01-11'] = { ...empty, sleepMin: 400, sleepManual: true };
  const after = withNights(ns, [{ key, night }, { key: '2027-01-11', night }, { key: '2027-01-10', night }], key);
  assert.equal(after.days[key].bedAt, at(-1)); // today: created
  assert.equal(after.days['2027-01-11'].bedAt, undefined); // typed in by hand
  assert.equal(after.days['2027-01-10'], undefined); // a day never opened stays empty
  assert.equal(withNights(after, [{ key, night }], key), after); // nothing new: same object

  // rhythm: usual bedtime, spread, and weekend nights later than weekday ones
  const rs = defaultState();
  const mon = new Date(2027, 0, 11); // Monday
  for (let i = 0; i < 7; i++) {
    const d = addDays(mon, i);
    const k = dayKey(d);
    const weekend = d.getDay() === 6 || d.getDay() === 0;
    const bed = weekend ? 60 : i % 2 ? -50 : -70; // 01:00 on weekend nights, 22:50 or 23:10 on weekdays
    const mid = new Date(`${k}T00:00`).getTime();
    rs.days[k] = { ...empty, bedAt: mid + bed * 60_000, wakeAt: mid + (bed + 480) * 60_000 };
  }
  const r = rhythmOf(rs, addDays(mon, 6), 7)!;
  assert.equal(r.nights.length, 7);
  assert.equal(r.bedMedian, -50);
  assert.equal(r.spread, 20);
  assert.equal(r.jetlag, 122); // middle of the night: weekend 05:00 (300) vs weekdays 02:58 on average (178)
  assert.equal(rhythmOf(defaultState(), addDays(mon, 6), 7), null);
}

// ---------- step 2 fixes ----------
// Clock changes: each check runs on both of this year's switch days of the time zone the test runs in (Europe/Stockholm:
// Sun 25 Oct 2026 and Sun 28 Mar 2027; America/New_York: 1 Nov 2026 and 14 Mar 2027), the days after, and a plain day.
{
  const keys = ['2026-10-25', '2026-10-26', '2026-11-01', '2027-03-14', '2027-03-28', '2027-03-29', '2027-01-12'];
  const noon = (k: string) => new Date(`${k}T12:00`);
  for (const key of keys) {
    const prev = dayKey(addDays(noon(key), -1));
    // the night before a day: 18:00 the evening before to 14:00 on the clock
    const w = sleepWindow(key);
    assert.equal(dayKey(w.from), prev);
    assert.equal(new Date(w.from).getHours(), 18, key);
    assert.equal(new Date(w.to).getHours(), 14, key);
    // the rhythm chart reads the clock: 08:00 is 480 and 23:30 the evening before is -30, whatever the day's length
    assert.equal(nightClock(atTime(noon(key), 0, 8).getTime(), key), 480, key);
    assert.equal(nightClock(atTime(noon(key), -1, 23, 30).getTime(), key), -30, key);
    // a day's events run midnight to midnight: 23:00–23:45 belongs to it, 00:30 the next day doesn't
    const late = { key: 'a', title: 'late', start: atTime(noon(key), 0, 23).getTime(), end: atTime(noon(key), 0, 23, 45).getTime(), allDay: false, location: null, calendarId: 'c' };
    const next = { ...late, key: 'b', start: atTime(noon(key), 1, 0, 30).getTime(), end: atTime(noon(key), 1, 1).getTime() };
    assert.deepEqual(eventsOn([late, next], noon(key)).map((e) => e.key), ['a'], key);
    // the caffeine curve runs from and to clock hours
    const cs = defaultState();
    cs.days[key] = { ...emptyDay(), coffee: [{ id: 'c1', mg: 90, at: atTime(noon(key), 0, 9).getTime() }] };
    const curve = caffeineCurve(cs, key, 6, 23);
    assert.equal(new Date(curve[0].t).getHours(), 6, key);
    assert.equal(new Date(curve[curve.length - 1].t).getHours(), 23, key);
    // cycle day: whole calendar days (a 23-hour day used to knock it one short for the whole cycle)
    const cy2 = defaultState();
    for (const back of [37, 9]) cy2.days[dayKey(addDays(noon(key), -back))] = { ...emptyDay(), period: { flow: 'medium', symptoms: [] } };
    assert.equal(cycleInfo(cy2, noon(key))!.cycleDay, 10, key);
  }

  // Open-Meteo's times are all at the response's one offset (today's): Sunday's sunrise after the switch is 05:49 UTC
  assert.equal(meteoTime('2026-10-25T07:49', 7200), Date.UTC(2026, 9, 25, 5, 49));
  assert.equal(meteoTime('2026-10-23T07:44', 7200), Date.UTC(2026, 9, 23, 5, 44));
  assert.equal(meteoTime('2026-10-25T07:49', undefined), new Date('2026-10-25T07:49').getTime()); // no offset given: as before

  // all-day events arrive as UTC midnights: as local days they'd spill into the next morning
  const allDay = allDayLocal(Date.UTC(2026, 9, 26), Date.UTC(2026, 9, 27));
  assert.equal(dayKey(allDay.start), '2026-10-26');
  assert.equal(new Date(allDay.start).getHours(), 0);
  assert.equal(dayKey(allDay.end), '2026-10-27');
  const monAllDay = { key: 'x', title: 'Holiday', ...allDay, allDay: true, location: null, calendarId: 'c' };
  assert.equal(eventsOn([monAllDay], new Date(2026, 9, 27, 12)).length, 0); // not on Tuesday too
  assert.equal(eventsOn([monAllDay], new Date(2026, 9, 26, 12)).length, 1);
  const localMidnight = new Date(2026, 9, 26).getTime();
  if (new Date(localMidnight).getUTCHours() !== 0) assert.deepEqual(allDayLocal(localMidnight, localMidnight + 86_400_000), { start: localMidnight, end: localMidnight + 86_400_000 }); // already local: untouched

  // sleep from one source: Zepp's night, not Zepp's plus another tracker's added on top; stage 7 is awake in bed
  const key = '2027-01-12';
  const at = (h: number, m = 0) => atTime(noon(key), 0, 0).getTime() + (h * 60 + m) * 60_000;
  const zepp = { start: at(-1), end: at(7), origin: ZEPP, stages: [{ start: at(-1), end: at(-0.5), stage: 7 }, { start: at(-0.5), end: at(7), stage: 4 }] };
  const other = { start: at(-1, -30), end: at(6, 30), origin: 'com.sec.android.app.shealth', stages: [{ start: at(-1, -30), end: at(6, 30), stage: 4 }] };
  const both = nightOf([other, zepp], key)!;
  assert.equal(both.bedAt, at(-1));
  assert.equal(both.wakeAt, at(7));
  assert.deepEqual(both.stages, { deep: 0, light: 450, rem: 0, awake: 30 });
  assert.equal(nightOf([other], key)!.bedAt, at(-1, -30)); // no Zepp: the other tracker alone
  const phone = { ...other, origin: 'android', start: at(2), end: at(3), stages: [] };
  assert.equal(nightOf([phone, other], key)!.bedAt, at(-1, -30)); // no Zepp: the source with the longest session

  // VMA areas: the municipality, however the geocoder and Krisinformation spell it
  assert.ok(isMine({ type: 'Municipality', description: 'Stockholms kommun' }, 'Stockholms län', 'Kista', 'Stockholms stad'));
  assert.ok(isMine({ description: 'Solna kommun' }, 'Stockholms län', 'Solna', 'Solna Kommun'));
  assert.ok(!isMine({ description: 'Solna kommun' }, 'Stockholms län', 'Kista', 'Stockholms stad'));
  assert.ok(isMine({ description: 'Malmö kommun' }, 'Skåne län', 'Malmö')); // saved before municipalities: the town still works
  assert.ok(needsPlaceInfo({ name: 'Stockholm, Sverige', lat: 59.33, lon: 18.07, county: 'Stockholms län' })); // no municipality yet
  assert.ok(!needsPlaceInfo({ name: 'Kiruna', lat: 67.86, lon: 20.23, county: 'Norrbottens län', municipality: '' })); // looked up, none
  assert.ok(samePlace({ name: 'A', lat: 1, lon: 2 }, { name: 'A', lat: 1, lon: 2, county: 'x' }));
  assert.ok(!samePlace({ name: 'A', lat: 1, lon: 2 }, { name: 'B', lat: 1, lon: 2 }));

  // doomscrolling is matched on exact packages: YouTube Music and Messenger are not TikTok
  for (const pkg of ['com.instagram.android', 'com.google.android.youtube', 'com.zhiliaoapp.musically', 'com.zhiliaoapp.musically.go', 'com.facebook.katana', 'com.instagram.barcelona'])
    assert.ok(isDoomscroll(pkg), pkg);
  for (const pkg of ['com.google.android.apps.youtube.music', 'com.facebook.orca', 'com.whatsapp', 'com.spotify.music', 'se.sj.android'])
    assert.ok(!isDoomscroll(pkg), pkg);

  // a yearly countdown on 29 Feb is on 28 Feb in other years, and back on the 29th in leap years
  const leap = { id: 'l', title: 'Leap', emoji: '🎂', date: '2024-02-29', yearly: true, createdAt: 0 };
  assert.equal(dayKey(nextDate(leap, new Date(2027, 1, 20, 12))), '2027-02-28');
  assert.equal(dayKey(nextDate(leap, new Date(2027, 2, 1, 12))), '2028-02-29');

  // auto-backup folder: the newest file that reads and isn't a near-empty post-wipe copy
  const files = (days: (number | null)[]) => days.map((d, i) => ({ name: `data-2026-10-0${i + 1}-10-00.json`, days: d }));
  assert.equal(pickBackup(files([40, 47, 54, 61])), 'data-2026-10-04-10-00.json'); // the newest
  assert.equal(pickBackup(files([40, 47, 54, null])), 'data-2026-10-03-10-00.json'); // newest cut off mid-write
  assert.equal(pickBackup(files([47, 54, 61, 1])), 'data-2026-10-03-10-00.json'); // newest written right after a wipe
  assert.equal(pickBackup(files([null, null])), null);
  assert.equal(pickBackup(files([1, 1])), 'data-2026-10-02-10-00.json'); // a small history is still a history
  assert.ok(skipAutoBackup(61, 1)); // a wiped phone doesn't push the good backups out
  assert.ok(!skipAutoBackup(61, 62));
  assert.ok(!skipAutoBackup(null, 1)); // the first backup ever
  // pruning: the last 7 daily files stay, and before them the newest of each of 5 weeks; undated names are never touched
  const daily = Array.from({ length: 60 }, (_, i) => `data-${dayKey(addDays(new Date(2026, 7, 26, 12), i))}-10-00.json`); // 26 Aug – 24 Oct
  const gone = new Set(autoBackupsToPrune(daily));
  const kept = daily.filter((n) => !gone.has(n));
  assert.deepEqual(kept.slice(-7), daily.slice(-7));
  assert.equal(kept.length, 12, kept.join(' '));
  // the newest of each week before the daily ones: Saturday 17 Oct (its week is partly daily), then four Sundays
  assert.deepEqual(kept.slice(0, 5), ['data-2026-09-20-10-00.json', 'data-2026-09-27-10-00.json', 'data-2026-10-04-10-00.json', 'data-2026-10-11-10-00.json', 'data-2026-10-17-10-00.json']);
  assert.deepEqual(autoBackupsToPrune(daily.slice(-7)), []);
  assert.deepEqual(autoBackupsToPrune(daily.slice(-8)), [], 'the 8th newest is the newest of its week: it stays');
  assert.ok(!autoBackupsToPrune(['data-x.json', ...daily]).includes('data-x.json'));

  // old weather and air data says how old it is
  const fetched = new Date(2026, 9, 23, 14, 5).getTime();
  assert.equal(staleNote(fetched, fetched + 30 * MIN), '');
  assert.equal(staleNote(fetched, fetched + 90 * MIN), ' · updated 14:05');
  assert.equal(staleNote(fetched, new Date(2026, 9, 24, 9).getTime()), ' · updated 23/10 14:05');
}

// morning readiness: sleep and resting heart rate against her own normal, plus her ratings
{
  const empty = { water: [], food: [], sets: [], games: [], bonusGameMin: 0 };
  const tue = new Date(2027, 0, 12, 8); // Tuesday 08:00, a Pull day in the default plan
  const rd = defaultState();
  assert.equal(readinessFor(rd, [], tue), null); // nothing to go on
  for (let i = 1; i <= 7; i++) rd.days[dayKey(addDays(tue, -i))] = { ...empty, sleepMin: 450 };
  const rest = Array.from({ length: 14 }, (_, i) => ({ key: dayKey(addDays(tue, i - 13)), bpm: 56 as number | null }));
  // short night, heart rate up, rated badly: take it easy, and the planned workout gets a lighter option
  rd.days[dayKey(tue)] = { ...empty, sleepMin: 350, sleepRating: 2 };
  const low = readinessFor(rd, rest.map((r, i) => (i === 13 ? { ...r, bpm: 62 } : r)), tue)!;
  assert.equal(low.tier, 'easy');
  assert.ok(low.suggestion?.startsWith('Pull is on the plan'));
  assert.ok(low.reasons.some((x) => x.includes('6 above your usual 56')));
  // a good night and a calm heart: ready
  rd.days[dayKey(tue)] = { ...empty, sleepMin: 500, sleepRating: 4, energy: 4 };
  assert.equal(readinessFor(rd, rest, tue)!.tier, 'ready');
  // today's resting rate missing: yesterday's is used
  const noToday = rest.map((r, i) => (i === 13 ? { ...r, bpm: null } : i === 12 ? { ...r, bpm: 63 } : r));
  rd.days[dayKey(tue)] = { ...empty, sleepMin: 450 };
  const y = readinessFor(rd, noToday, tue)!;
  assert.ok(y.reasons.some((x) => x.includes('Resting heart rate 63')));
  assert.equal(y.tier, 'steady');
}

// the rough-patch check: 3+ signs over 14 days against the owner's own normal; a sign without enough data doesn't count
{
  const now = new Date(2027, 1, 20, 12);
  const key = (i: number) => dayKey(addDays(now, -i));
  const day = (sleepMin: number, mood: number, doomMin: number) => ({
    ...emptyDay(),
    water: [{ id: 'w', ml: 250, at: 1 }],
    sleepMin,
    moods: [{ id: 'm', level: mood as 1 | 2 | 3 | 4 | 5, emotions: [], at: 1 }],
    screen: { totalMin: doomMin, doomMin, gamesMin: 0, top: [] },
  });
  const build = (window: (i: number) => ReturnType<typeof day>) => {
    const s = defaultState();
    for (let i = 14; i < 42; i++) s.days[key(i)] = day(450, 3, 30); // the usual: 7 h 30, okay days, 30 min of scrolling
    for (let i = 0; i < 14; i++) s.days[key(i)] = window(i);
    return s;
  };
  // 8 short nights (70 min under), 6 low days, scrolling doubled
  const heavy = build((i) => day(i < 8 ? 380 : 450, i < 6 ? 2 : 3, 60));
  const p = roughPatch(heavy, [], now)!;
  assert.deepEqual(p.signs.map((x) => x.id), ['sleep', 'mood', 'screen']);
  assert.equal(p.heavy, false);
  assert.ok(p.signs[0].text.startsWith('8 short nights'));
  assert.ok(patchSummary(p).startsWith('The last two weeks: 8 short nights'));
  assert.ok(patchSummary(p).includes(' and scrolling and games up to about 1h a day (usually 30m)'));
  // most of the two weeks low: the card also mentions 1177
  assert.equal(roughPatch(build((i) => day(i < 8 ? 380 : 450, i < 9 ? 2 : 3, 60)), [], now)!.heavy, true);
  // two signs aren't enough
  assert.equal(roughPatch(build((i) => day(i < 8 ? 380 : 450, i < 6 ? 2 : 3, 30)), [], now), null);
  // typed-in nights are guesses: they don't make the sleep sign
  const typed = build((i) => ({ ...day(i < 8 ? 380 : 450, i < 6 ? 2 : 3, 60), sleepManual: true }));
  assert.equal(roughPatch(typed, [], now), null);
  // no usual to compare with (a new owner): sleep and scrolling can't count, however the last days look
  const fresh = defaultState();
  for (let i = 0; i < 14; i++) fresh.days[key(i)] = day(300, 1, 200);
  assert.equal(roughPatch(fresh, [], now), null);
  // sick days still count as data (a hard week is a hard week), and readiness counts "easy" mornings
  const sick = build((i) => ({ ...day(i < 8 ? 380 : 450, i < 6 ? 2 : 3, 30), ...(i < 5 ? { energy: 1 as const, sleepRating: 1 as const } : {}) }));
  sick.pauses = [{ kind: 'sick', from: key(10), to: key(8) }];
  assert.deepEqual(roughPatch(sick, [], now)!.signs.map((x) => x.id), ['sleep', 'mood', 'readiness']);
  // shown at most once a week, and not during or soon after a pause
  const t = now.getTime();
  assert.equal(showRoughPatch(heavy, t), true);
  assert.equal(showRoughPatch({ ...heavy, roughPatchAt: t - PATCH_QUIET_MS + 60_000 }, t), false);
  assert.equal(showRoughPatch({ ...heavy, roughPatchAt: t - PATCH_QUIET_MS }, t), true);
  assert.equal(showRoughPatch({ ...heavy, pauses: [{ kind: 'sick', from: key(0), to: key(0) }] }, t), false);
  assert.equal(showRoughPatch({ ...heavy, pauses: [{ kind: 'away', from: key(9), to: key(6) }] }, t), false);
  assert.equal(showRoughPatch({ ...heavy, pauses: [{ kind: 'away', from: key(12), to: key(8) }] }, t), true);
}

// heart in training: sets grouped into sessions, activities counted back from when they were logged, zones by max HR
{
  const t0 = new Date(2027, 0, 12, 17).getTime();
  const m = (n: number) => t0 + n * 60_000;
  const set = (id: string, at: number) => ({ id, exercise: 'Squat', weight: 60, reps: 5, at });
  const day = {
    water: [],
    food: [],
    sets: [set('a', m(0)), set('b', m(10)), set('c', m(25)), set('late', m(120))],
    games: [],
    bonusGameMin: 0,
    activities: [{ id: 'k', kind: 'cardio' as const, minutes: 20, at: m(45) }], // 17:25–17:45: overlaps the sets
  };
  const ws = workoutWindows(day);
  assert.equal(ws.length, 2);
  assert.deepEqual([ws[0].start, ws[0].end, ws[0].label], [m(-5), m(45), 'Gym']);
  assert.deepEqual([ws[1].start, ws[1].end], [m(115), m(125)]);
  assert.equal(workoutWindows({ ...day, sets: [] })[0].label, 'Kondition');
  // one sample a minute: 10 min at 100 bpm (Z1 at max 190 → 52 %), 10 min at 160 (84 %, Z4), a 21-min gap, 90 (no zone)
  const samples = [
    ...Array.from({ length: 10 }, (_, i) => ({ at: m(i), bpm: 100 })),
    ...Array.from({ length: 10 }, (_, i) => ({ at: m(10 + i), bpm: 160 })),
    { at: m(40), bpm: 90 },
    { at: m(60), bpm: 150 }, // outside the window
  ];
  const h = heartIn(samples, ws[0], 190)!;
  assert.equal(h.max, 160);
  assert.equal(h.avg, Math.round((10 * 100 + 10 * 160 + 90) / 21));
  assert.deepEqual(h.zoneMin, [10, 0, 0, 11, 0]); // the gap after the last 160 counts 2 min, not 21
  assert.equal(heartIn(samples, ws[1], 190), null); // no data in the later window
}

// movement map: average steps per weekday and hour, watch-off days left out; stillest workday desk hour
{
  const slots: { at: number; steps: number }[] = [];
  const mon = new Date(2027, 0, 11); // Monday
  for (let i = 0; i < 7; i++) {
    for (let h = 0; h < 24; h++) {
      const steps = h >= 8 && h <= 20 ? (h === 14 ? 50 : h === 20 ? 10 : 400) : 0; // 14:00 is the desk slump, 20:00 the sofa
      slots.push({ at: new Date(2027, 0, 11 + i, h).getTime(), steps: i === 6 ? 0 : steps }); // Sunday: watch off
    }
  }
  slots.push({ at: new Date(2027, 0, 18, 14).getTime(), steps: 150 }); // next Monday, 14:00 only: under 500, left out
  const mm = movementMap(slots);
  assert.equal(mm.days[1], 1); // the second Monday doesn't count
  assert.equal(mm.days[0], 0);
  assert.equal(mm.grid[2][9], 400);
  assert.equal(mm.grid[2][14], 50);
  assert.deepEqual(stillestHour(mm, 7, 23), { hour: 14, steps: 50 }); // 20:00 is past the desk hours
  assert.equal(stillestHour(movementMap(slots.filter((x) => new Date(x.at).getDay() === 1)), 7, 23), null); // one workday
  assert.equal(new Date(mon).getDay(), 1);
}

// ---------- persistence (persist.ts): v2 rows, migration, read errors, the shrink guard, junk day keys ----------
{
  const memStore = (init: Record<string, string> = {}) => {
    const m = new Map(Object.entries(init));
    return {
      m,
      getItem: async (k: string) => m.get(k) ?? null,
      multiGet: async (keys: readonly string[]) => keys.map((k) => [k, m.get(k) ?? null] as const),
      multiSet: async (pairs: readonly (readonly [string, string])[]) => {
        for (const [k, v] of pairs) m.set(k, v);
      },
      multiRemove: async (keys: readonly string[]) => {
        for (const k of keys) m.delete(k);
      },
    };
  };
  const day = (ml: number) => ({ ...emptyDay(), water: [{ id: `w${ml}`, ml, at: 0 }] });
  const s0 = hydrate({ ...defaultState(), onboarded: true, xp: 1234, days: { '2026-09-29': day(250), '2026-09-30': day(500), '2026-10-01': day(750), '2026-10-23': day(1000) } });

  assert.deepEqual(Object.keys(daysByMonth(s0.days)).sort(), ['2026-09', '2026-10']);
  assert.deepEqual(Object.keys(daysByMonth({ ...s0.days, '[object Object]': day(1) })).sort(), ['2026-09', '2026-10']); // junk keys never get a row
  // only months with a replaced, added or removed day are rewritten
  assert.deepEqual([...changedMonths(null, s0.days)].sort(), ['2026-09', '2026-10']);
  assert.deepEqual([...changedMonths(s0.days, { ...s0.days, '2026-10-23': day(1250) })], ['2026-10']);
  assert.deepEqual([...changedMonths(s0.days, { ...s0.days, '2026-11-01': day(1) })], ['2026-11']);
  const octOnly = Object.fromEntries(Object.entries(s0.days).filter(([k]) => k.startsWith('2026-10')));
  assert.deepEqual([...changedMonths(s0.days, octOnly)], ['2026-09']);
  assert.equal(changedMonths(s0.days, { ...s0.days }).size, 0);
  const first = rowsFor(s0, null, [], { migratedAt: 111 });
  assert.deepEqual(
    first.pairs.map(([k]) => k),
    [BASE_KEY, INDEX_KEY, monthKey('2026-09'), monthKey('2026-10')],
  );
  assert.ok(!JSON.parse(first.pairs[0][1]).days); // the base row holds no days
  assert.deepEqual(JSON.parse(first.pairs[1][1]), { months: ['2026-09', '2026-10'], migratedAt: 111 });
  assert.deepEqual(rowsFor({ ...s0, days: octOnly }, s0.days, first.months).gone, [monthKey('2026-09')]);
  assert.deepEqual(rowsFor({ ...s0, days: {} }, s0.days, first.months).gone, [monthKey('2026-09'), monthKey('2026-10')]); // reset: every month row goes

  assert.equal(utf8Bytes('ab'), 2);
  assert.equal(utf8Bytes('é'), 2);
  assert.equal(utf8Bytes('☕'), 3);
  assert.equal(utf8Bytes('🕷'), 4);
  assert.equal(ROW_LIMIT, 2 * 1024 * 1024);

  // the shrink guard: refuses a save that throws most of a real history away
  assert.ok(!wouldWipe(0, 0)); // a new install
  assert.ok(!wouldWipe(6, 0)); // too little history to tell
  assert.ok(wouldWipe(16, 0) && wouldWipe(16, 1) && wouldWipe(16, 3));
  assert.ok(!wouldWipe(16, 4) && !wouldWipe(16, 17));
  assert.ok(wouldWipe(400, 79) && !wouldWipe(400, 80));

  // junk day keys: the HQ coffee tile's press event became the day; the cups go back to the day they were drunk
  const at1 = new Date(2026, 9, 12, 8, 30).getTime();
  const at2 = new Date(2026, 9, 14, 13, 5).getTime();
  const cid = (t: number) => t.toString(36) + 'abcde';
  assert.equal(idTime(cid(at1)), at1);
  assert.equal(idTime('x1'), null);
  assert.equal(idTime('zzzzzzzzzzzzz'), null); // far future: not a time
  const noTime = null as unknown as number; // NaN, once saved as JSON
  const junk = {
    ...s0.days,
    '2026-10-14': { ...emptyDay(), coffee: [{ id: cid(at2), mg: 90, at: at2 }] }, // already there: not doubled
    '[object Object]': {
      ...emptyDay(),
      coffee: [
        { id: cid(at1), mg: 90, at: noTime, late: true },
        { id: cid(at2), mg: 90, at: noTime, late: true },
        { id: 'bad', mg: 90, at: 0 },
      ],
    },
  };
  const fixed = withRealDays(junk);
  assert.ok(!('[object Object]' in fixed));
  assert.deepEqual(fixed['2026-10-12'].coffee, [{ id: cid(at1), mg: 90, at: at1, late: true }]);
  assert.equal(fixed['2026-10-14'].coffee?.length, 1);
  assert.equal(fixed['2026-10-23'], s0.days['2026-10-23']); // untouched days keep their identity
  assert.equal(withRealDays(s0.days), s0.days);
  assert.ok(!('[object Object]' in hydrate({ ...s0, days: junk }).days));
  assert.ok(isDayKey('2026-10-23') && !isDayKey('[object Object]') && !isDayKey({}) && !isDayKey(undefined) && !isDayKey('2026-1-3'));

  void (async () => {
    // a new install
    assert.deepEqual(await readSaved(memStore()), { source: 'none', saved: null });

    // v1 -> v2: read the old row, write the months, read them back, and the state comes back the same
    const disk = memStore({ [V1_KEY]: JSON.stringify(s0) });
    const v1 = await readSaved(disk);
    assert.equal(v1.source, 'v1');
    const rows = rowsFor(hydrate(v1.saved), null, [], { migratedAt: 222 }).pairs;
    assert.ok(await writeVerified(disk, rows));
    const v2 = await readSaved(disk);
    assert.equal(v2.source, 'v2');
    assert.deepEqual(hydrate(v2.saved), s0);
    if (v2.source === 'v2') {
      assert.deepEqual(v2.index, { months: ['2026-09', '2026-10'], migratedAt: 222 });
      assert.equal(Object.keys(v2.sizes).length, 3);
    }
    assert.ok(disk.m.has(V1_KEY)); // the old row stays as a fallback
    assert.deepEqual(await olderCopy(disk), { at: 222 });

    // a later save rewrites only the month that changed, and the result still reads back whole
    const s1 = { ...s0, xp: 1300, days: { ...s0.days, '2026-10-23': day(1500) } };
    const next = rowsFor(s1, s0.days, ['2026-09', '2026-10'], { migratedAt: 222 });
    assert.deepEqual(
      next.pairs.map(([k]) => k),
      [BASE_KEY, INDEX_KEY, monthKey('2026-10')],
    );
    await disk.multiSet(next.pairs);
    assert.deepEqual(hydrate((await readSaved(disk)).saved), s1);

    // a read-back that differs from what was written is caught
    const liar = { ...memStore(), multiGet: async (keys: readonly string[]) => keys.map((k) => [k, 'x'] as const) };
    assert.equal(await writeVerified(liar, rows), false);

    // something saved that can't be read throws, and says which layout broke
    const broken = memStore(Object.fromEntries(rows));
    broken.m.delete(monthKey('2026-09'));
    await assert.rejects(readSaved(broken), (e: unknown) => e instanceof ReadError && e.stage === 'v2');
    await assert.rejects(readSaved(memStore({ [BASE_KEY]: '{}' })), (e: unknown) => e instanceof ReadError && e.stage === 'v2'); // no month list
    await assert.rejects(readSaved(memStore({ [V1_KEY]: '{"days": {' })), (e: unknown) => e instanceof ReadError && e.stage === 'v1');
    const tooBig = { ...memStore(), multiGet: () => Promise.reject(new Error('Row too big to fit into CursorWindow')) };
    await assert.rejects(readSaved(tooBig), /CursorWindow/);
    assert.equal(await olderCopy(memStore({ [BASE_KEY]: '{}' })), null); // no v1 to fall back on

    // v1 written along with v2 (1.4.0's updates): code that only knows v1 (a rolled-back update) finds current data,
    // and what it writes wins. Saves from 1.5.0 never write v1 or its fingerprint, and keep the old row.
    assert.notEqual(fingerprint('{"xp":1}'), fingerprint('{"xp":2}'));
    assert.equal(fingerprint('abc'), fingerprint('abc'));
    assert.ok(!first.pairs.some(([k]) => k === V1_KEY)); // never written
    assert.ok(!('v1' in JSON.parse(first.pairs[1][1])));
    const v1Now = JSON.stringify(s0);
    const dualIndex = JSON.stringify({ months: first.months, migratedAt: 111, v1: fingerprint(v1Now) });
    const both = memStore({ ...Object.fromEntries(first.pairs), [INDEX_KEY]: dualIndex, [V1_KEY]: v1Now });
    const same = await readSaved(both);
    assert.equal(same.source, 'v2'); // v1 unchanged since: v2 is read
    assert.deepEqual(await olderCopy(both), { at: null }); // still current then: no date to show
    both.m.set(V1_KEY, JSON.stringify({ ...s0, xp: 9999 })); // older code saved to v1 only
    const rolled = await readSaved(both);
    assert.ok(rolled.source === 'v1' && rolled.newer && rolled.saved.xp === 9999);
    both.m.set(V1_KEY, '{"days": {'); // an unreadable v1 never hides a good v2
    assert.equal((await readSaved(both)).source, 'v2');
    both.m.delete(V1_KEY);
    assert.equal((await readSaved(both)).source, 'v2');
    // the first save after such a load stops the fingerprint and dates the old row
    const after = rowsFor(s0, s0.days, first.months, { migratedAt: 111, v1Until: 333 });
    assert.deepEqual(JSON.parse(after.pairs[1][1]), { months: first.months, migratedAt: 111, v1Until: 333 });
    const noDual = memStore({ ...Object.fromEntries(first.pairs), [INDEX_KEY]: after.pairs[1][1] }); // v2 wins whatever v1 holds
    noDual.m.set(V1_KEY, JSON.stringify({ ...s0, xp: 1 }));
    assert.equal((await readSaved(noDual)).source, 'v2');
    assert.deepEqual(await olderCopy(noDual), { at: 333 });
    console.log('persistence tests passed');
  })().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

// reminder times: the period heads-up survives a replan on its own morning; Wrapped on the 1st before 10:00
{
  const cyc = defaultState();
  for (const start of ['2026-09-01', '2026-09-29']) cyc.days[start] = { water: [], food: [], sets: [], games: [], bonusGameMin: 0, period: { flow: 'medium', symptoms: [] } };
  const headsUp = (now: Date) => {
    const info = cycleInfo(cyc, now)!;
    return cycleHeadsUpAt(info);
  };
  assert.equal(dayKey(cycleInfo(cyc, new Date(2026, 9, 23, 12))!.nextStart), '2026-10-27');
  // Sun 25 Oct is the DST day (25 hours): the heads-up is still 10:00 local that Sunday
  for (const now of [new Date(2026, 9, 23, 20), new Date(2026, 9, 25, 7, 30)]) {
    const at = headsUp(now)!;
    assert.equal(dayKey(at), '2026-10-25');
    assert.equal(fmtTime(at), '10:00');
  }
  assert.equal(headsUp(new Date(2026, 9, 26, 8)), null); // one day to go: too late
  const w = (now: Date) => {
    const { at, month } = wrappedReminder(now);
    return `${dayKey(at)} ${fmtTime(at)} ${month}`;
  };
  assert.equal(w(new Date(2026, 9, 23, 12)), '2026-11-01 10:00 October');
  assert.equal(w(new Date(2026, 10, 1, 8)), '2026-11-01 10:00 October'); // Sun 1 Nov before 10:00: still October's
  assert.equal(w(new Date(2026, 10, 1, 11)), '2026-12-01 10:00 November');
  assert.equal(w(new Date(2026, 11, 20, 12)), '2027-01-01 10:00 December');
  // a replan cancels the planned reminders, except one about to go off (a replan just before moved it to
  // now + 5 s; cancelling it again would lose it), and never the timers or warnings it doesn't plan
  const nowMs = new Date(2026, 9, 24, 12).getTime();
  const sched = [
    { identifier: 'water-2026-10-24-720', trigger: { type: 'date', value: nowMs + 4_000 } },
    { identifier: 'water-2026-10-24-780', trigger: { type: 'date', value: nowMs + 3_600_000 } },
    { identifier: 'habit-x-2026-10-24', trigger: { type: 'date', value: nowMs - 1_000 } },
    { identifier: 'game-warn', trigger: { type: 'date', value: nowMs + 3_600_000 } },
    { identifier: 'alert-smhi-1', trigger: { type: 'timeInterval', seconds: 1 } },
    { identifier: 'prizes-2026', trigger: null },
  ];
  assert.deepEqual(plannedToCancel(sched, nowMs), ['water-2026-10-24-780', 'prizes-2026']);
  assert.ok(isPlanned('weekendboss-2026-10-24') && !isPlanned('rest-done') && !isPlanned('snooze-water') && !isPlanned('focus-done'));
}

// reminder buttons (APK 1.5.0): one action per button, with the day it's about; one key per tap
{
  const at = new Date(2027, 0, 13, 0, 10).getTime(); // just after midnight
  assert.deepEqual(actionFromButton('water_glass', {}, at), { kind: 'glass', day: '2027-01-13', at });
  assert.deepEqual(actionFromButton('water_snooze', undefined, at), { kind: 'snooze' });
  assert.deepEqual(actionFromButton('focus_start', null, at), { kind: 'focus' });
  // "Done" on last night's reminder ticks the reminder's day, not the new one
  assert.deepEqual(actionFromButton('habit_done', { habitId: 'h1', day: '2027-01-12' }, at), { kind: 'habit', habitId: 'h1', day: '2027-01-12', at });
  assert.deepEqual(actionFromButton('habit_done', { habitId: 'h1' }, at), { kind: 'habit', habitId: 'h1', day: '2027-01-13', at });
  assert.deepEqual(actionFromButton('habit_done', { habitId: 'h1', day: 'junk' }, at), { kind: 'habit', habitId: 'h1', day: '2027-01-13', at });
  assert.equal(actionFromButton('habit_done', {}, at), null); // no habit id: nothing to tick
  assert.deepEqual(actionFromButton('mood_2', {}, at), { kind: 'mood', level: 2, day: '2027-01-13', at });
  assert.equal(actionFromButton('mood_9', {}, at), null);
  assert.equal(actionFromButton('expo.modules.notifications.actions.DEFAULT', {}, at), null);
  assert.ok(!SILENT_BUTTONS.has('focus_start')); // opens the app
  for (const b of ['water_glass', 'water_snooze', 'habit_done', 'mood_4', 'mood_3', 'mood_2']) assert.ok(SILENT_BUTTONS.has(b), b);
  assert.equal(tapKey('water-2027-01-13-600', 'water_glass', 123), 'water-2027-01-13-600|water_glass|123');
  assert.notEqual(tapKey('a', 'water_glass', 1), tapKey('a', 'water_glass', 2)); // the next day's reminder is a new tap
  // the status line redrawn in the background (a new date, so the next tap on it is a new tap) shows the glass
  assert.equal(statusWithGlass('💧 1.2/2.5 L · 🗡️ 1/3 quests · 👹 120 HP', 300), '💧 1.5/2.5 L · 🗡️ 1/3 quests · 👹 120 HP');
  assert.equal(statusWithGlass('💧 0.0/2.0 L', 330), '💧 0.3/2.0 L');
  assert.equal(statusWithGlass('no water here', 250), 'no water here');
  // only taps that carry a day and a time travel through the queue
  assert.ok(isQueued({ kind: 'glass', day: '2027-01-13', at }) && isQueued({ kind: 'habit', habitId: 'h', day: '2027-01-13', at }));
  assert.ok(!isQueued({ kind: 'snooze' }) && !isQueued({ kind: 'focus' }) && !isQueued({ kind: 'gymMove', day: '2027-01-13' }));
  // a tap handed over again (a drain that saved, then died before letting go) is seen as already there
  const landedDay = {
    water: [{ id: 'w', ml: 250, at }],
    food: [],
    sets: [],
    games: [],
    bonusGameMin: 0,
    coffee: [{ id: 'c', mg: 80, at: at + 1 }],
    moods: [{ id: 'm', level: 3 as const, emotions: [], at: at + 2 }],
    habits: ['h1'],
  };
  assert.ok(tapLanded(landedDay, { kind: 'glass', day: '2027-01-13', at }));
  assert.ok(!tapLanded(landedDay, { kind: 'glass', day: '2027-01-13', at: at + 5 }));
  assert.ok(tapLanded(landedDay, { kind: 'coffee', day: '2027-01-13', at: at + 1 }));
  assert.ok(tapLanded(landedDay, { kind: 'mood', level: 3, day: '2027-01-13', at: at + 2 }));
  assert.ok(tapLanded(landedDay, { kind: 'habit', habitId: 'h1', day: '2027-01-13', at }));
  assert.ok(!tapLanded(landedDay, { kind: 'habit', habitId: 'h2', day: '2027-01-13', at }));
  assert.ok(!tapLanded(undefined, { kind: 'glass', day: '2027-01-13', at }));
  assert.ok(!tapLanded({ ...landedDay, coffee: undefined, moods: undefined, habits: undefined }, { kind: 'coffee', day: '2027-01-13', at: at + 1 }));
  // lines written in the background take that day's tone, and a day the app didn't plan for is a kind one
  assert.equal(bgTone({ tones: { '2027-01-13': 7, '2027-01-14': 1 } }, '2027-01-13'), 7);
  assert.equal(bgTone({ tones: { '2027-01-13': 7 } }, '2027-01-16'), 1);
  assert.equal(bgTone(null, '2027-01-13'), 1);
}

// the queue for taps made while the app isn't on screen (APK 1.5.0): a tap leaves it only once the app saved it
{
  const kv = () => {
    const m = new Map<string, string>();
    return { m, getItem: async (k: string) => m.get(k) ?? null, setItem: async (k: string, v: string) => void m.set(k, v) };
  };
  const at = new Date(2027, 0, 12, 23, 50).getTime();
  const glass: QueuedAction = { kind: 'glass', day: '2027-01-12', at };
  const coffee: QueuedAction = { kind: 'coffee', day: '2027-01-12', at: at + 1 };
  void (async () => {
    // no app running (a headless start): queued for the next launch
    const alone = createQueue(kv());
    assert.equal(await alone.enqueue(glass), false);
    assert.deepEqual(await alone.readQueued(), [glass]);

    // an app running: the task waits until it applied and saved, and the tap is gone from the queue only then
    const store = kv();
    const q = createQueue(store);
    const applied: QueuedAction[] = [];
    let queuedWhileSaving: QueuedAction[] | null = null;
    q.onQueued(() =>
      q
        .drainQueued(async (xs) => {
          applied.push(...xs);
          queuedWhileSaving = JSON.parse(store.m.get('spider:pending-actions') ?? '[]') as QueuedAction[]; // "saving": still queued
        })
        .then(() => undefined),
    );
    assert.equal(await q.enqueue(glass), true);
    assert.deepEqual(applied, [glass]);
    assert.deepEqual(queuedWhileSaving, [glass]); // a kill mid-save leaves it queued, so the next launch applies it
    assert.deepEqual(await q.readQueued(), []);
    assert.equal(await q.drainQueued(async () => assert.fail('nothing to apply')), 0);

    // a tap queued while a drain is applying waits its turn, and is applied by the next drain, once
    const slow = createQueue(kv());
    await slow.enqueue(glass);
    let release = () => {};
    let started = () => {};
    const applying = new Promise<void>((r) => (started = r));
    const seen: QueuedAction[][] = [];
    const first = slow.drainQueued(async (xs) => {
      seen.push(xs);
      await new Promise<void>((r) => {
        release = r;
        started();
      });
    });
    await applying;
    const second = slow.enqueue(coffee);
    release();
    await first;
    await second;
    assert.deepEqual(await slow.readQueued(), [coffee]);
    await slow.drainQueued(async (xs) => void seen.push(xs));
    assert.deepEqual(seen, [[glass], [coffee]]);

    // applying that fails half-way still lets go: it's applied in memory, and twice would double it
    const failing = createQueue(kv());
    await failing.enqueue(glass);
    await assert.rejects(failing.drainQueued(async () => Promise.reject(new Error('disk full'))));
    assert.deepEqual(await failing.readQueued(), []);

    // an app that never answers can't hold the task forever
    const stuck = createQueue(kv(), 20);
    stuck.onQueued(() => new Promise<void>(() => {}));
    assert.equal(await stuck.enqueue(glass), true);

    // each tap is claimed once, whichever path sees it first
    const taps = createQueue(kv());
    assert.equal(await taps.claimTap('t1', at), true);
    assert.equal(await taps.claimTap('t1', at), false);
    assert.equal(await taps.claimTap('t2', at), true);
    console.log('queue tests passed');
  })().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

// shared seen-list (APK 1.5.0): the app and the background check merge theirs; the later time wins, 30 days max
{
  const day = 86_400_000;
  const now = new Date(2027, 0, 13, 12).getTime();
  const merged = mergeSeenLists({ 'a:YELLOW': now - 25 * day, old: now - 31 * day }, { 'a:YELLOW': now - day, 'b:VMA': now }, now);
  assert.deepEqual(merged, { 'a:YELLOW': now - day, 'b:VMA': now }); // triage's "still active" refresh carries over
  assert.deepEqual(mergeSeenLists({}, {}, now), {});
}

// home-screen widget (APK 1.5.0): today's numbers, zero on a new day, queued taps (its own and the reminders') shown at once
{
  const at = new Date(2027, 0, 13, 15).getTime();
  const key = dayKey(at);
  const s0 = defaultState();
  const s = {
    ...s0,
    settings: { ...s0.settings, glassMl: 250, coffeeLimit: 4, gamingBudgetMin: 90 },
    days: { [key]: { ...emptyDay(), water: [{ id: 'w', ml: 750, at }], coffee: [{ id: 'c', mg: 80, at }] } },
  };
  const snap = snapshotOf(s, DEFAULT_WIDGET_COLORS, at);
  assert.equal(snap.day, key);
  assert.equal(snap.waterMl, 750);
  assert.equal(snap.coffees, 1);
  assert.equal(snap.gameLeftMin, 90);
  assert.deepEqual(widgetLines(snap), { water: `0.8 / ${(snap.goalMl / 1000).toFixed(1).replace(/\.0$/, '')} L`, coffee: '1 / 4', game: '1h 30m left' });
  const glass: QueuedAction = { kind: 'glass', day: key, at };
  const coffee: QueuedAction = { kind: 'coffee', day: key, at };
  const tapped = withQueued(snap, [glass, glass, coffee], at);
  assert.deepEqual([tapped.waterMl, tapped.coffees], [1250, 2]);
  assert.equal(withQueued(snap, [{ kind: 'mood', level: 4, day: key, at }], at), snap); // nothing the widget shows
  assert.equal(withQueued(snap, [], at), snap);
  // the next morning: yesterday's numbers don't carry over; the gaming budget is unknown until the app runs
  const tomorrow = new Date(2027, 0, 14, 8).getTime();
  const next = forToday(snap, tomorrow);
  assert.deepEqual([next.day, next.waterMl, next.coffees, next.gameLeftMin], ['2027-01-14', 0, 0, null]);
  assert.equal(widgetLines(next).game, '–');
  assert.equal(withQueued(snap, [{ kind: 'glass', day: '2027-01-14', at: tomorrow }], tomorrow).waterMl, 250); // a tap after midnight starts the new day
  assert.equal(withQueued(snap, [glass], tomorrow).waterMl, 0); // last night's queued glass belongs to last night
  assert.equal(widgetLines({ ...snap, gameLeftMin: -75 }).game, '1h 15m over');
  assert.equal(widgetLines({ ...snap, gaming: true }).game, 'playing');
}

// ---------- step 8 sweden: name days, people days, the fika almanac, Hesa Fredrik, deklaration ----------
function step8SwedenTests() {
  const k = (d: Date) => dayKey(d);
  const pick = (x: { phase: string; target: string; days: number } | null) => (x ? { phase: x.phase, target: x.target, days: x.days } : null);
  // date rules
  assert.equal(k(mothersDay(2026)), '2026-05-31');
  assert.equal(k(mothersDay(2027)), '2027-05-30');
  assert.equal(k(fathersDay(2026)), '2026-11-08'); // this Sunday
  assert.equal(k(fathersDay(2027)), '2027-11-14');
  assert.equal(k(nthWeekday(2026, 11, 1, 0)), '2026-11-01');
  assert.equal(k(lastWeekday(2026, 11, 1)), '2026-11-30');
  assert.equal(k(fettisdagen(2026)), '2026-02-17');
  assert.equal(k(fettisdagen(2027)), '2027-02-09');
  for (let y = 2025; y <= 2045; y++) {
    assert.equal(fettisdagen(y).getDay(), 2, `fettisdagen ${y}`); // always a Tuesday
    assert.equal(mothersDay(y).getDay(), 0);
    assert.ok(mothersDay(y).getDate() >= 25 && mothersDay(y).getMonth() === 4);
    assert.ok(fathersDay(y).getDate() >= 8 && fathersDay(y).getDate() <= 14 && fathersDay(y).getDay() === 0);
    assert.ok(surstrommingDay(y).getDay() === 4 && surstrommingDay(y).getDate() >= 15 && surstrommingDay(y).getDate() <= 21);
  }
  assert.equal(k(surstrommingDay(2026)), '2026-08-20');
  assert.equal(k(surstrommingDay(2027)), '2027-08-19');

  // Hesa Fredrik: the first non-holiday Monday of March, June, September and December, at 15:00
  assert.deepEqual(sirenTests(2026).map(k), ['2026-03-02', '2026-06-01', '2026-09-07', '2026-12-07']);
  assert.deepEqual(sirenTests(2027).map(k), ['2027-03-01', '2027-06-07', '2027-09-06', '2027-12-06']);
  assert.equal(k(sirenTests(2022)[1]), '2022-06-13'); // 6 June 2022 was the first Monday: the national day moves it a week
  assert.ok(sirenTests(2026).every((t) => t.getHours() === 15 && t.getDay() === 1 && !holidayOn(t)));
  const nov6 = new Date(2026, 10, 6, 20, 14);
  assert.equal(nextSirenTest(nov6)?.getTime(), new Date(2026, 11, 7, 15).getTime());
  assert.equal(k(nextSirenTest(new Date(2026, 11, 7, 16))!), '2027-03-01');
  const base: SweState = defaultState();
  const ping = sirenPing(base, nov6);
  assert.deepEqual([ping?.id, ping?.at.getTime(), ping?.line], ['siren-2026-12-07', new Date(2026, 11, 7, 14, 50).getTime(), 'sirenTest']);
  assert.ok(isPlanned(ping!.id));
  const alert = (level: SweStorm['level']): SweStorm => ({ id: 'a', source: level === 'VMA' ? 'VMA' : 'SMHI', level, title: 'x', advice: '', url: '', start: new Date(2026, 11, 7, 9).toISOString(), seenAt: new Date(2026, 11, 7, 10).getTime() });
  const morning = new Date(2026, 11, 7, 11);
  assert.ok(sirenPing(base, morning)); // still ahead at 11:00
  assert.equal(sirenPing({ ...base, storm: [alert('VMA')] }, morning), null); // never "only a test" beside a real VMA
  assert.equal(sirenPing({ ...base, storm: [alert('ORANGE')] }, morning), null); // no "only a test" on any storm day (the background's stormPlan agrees)
  assert.equal(sirenPing({ ...base, settings: { ...base.settings, sweden: { siren: false } } }, morning), null);
  assert.equal(sirenPing(base, new Date(2026, 11, 7, 14, 55)), null); // the heads-up time has gone
  assert.ok(sirenToday(base, new Date(2026, 11, 7, 14, 55)));
  assert.ok(!sirenToday(base, new Date(2026, 11, 7, 15, 20)));
  assert.ok(!sirenToday({ ...base, storm: [alert('VMA')] }, new Date(2026, 11, 7, 14, 55)));
  assert.ok(stormPlan(['siren-2026-12-07', 'morning-2026-12-07'], ['2026-12-07']).cancel.includes('siren-2026-12-07')); // a storm while closed takes it back

  // Krisberedskapsveckan: ISO week 39, and its checklist pays coins once a year, never XP
  assert.deepEqual(prepWeek(2027), { from: '2027-09-27', to: '2027-10-03' });
  assert.deepEqual(prepWeek(2026), { from: '2026-09-21', to: '2026-09-27' });
  for (let y = 2025; y <= 2040; y++) {
    const w = prepWeek(y);
    assert.equal(isoWeek(new Date(`${w.from}T12:00`)), 39, String(y));
    assert.equal(new Date(`${w.from}T12:00`).getDay(), 1);
  }
  assert.ok(prepWeekOn('2027-09-30'));
  assert.equal(prepWeekOn('2027-10-04'), null);
  let prep: SweState = { ...base, coins: 10, coinsEarned: 10 };
  let paid = 0;
  for (const item of PREP_ITEMS) {
    const r = tickPrep(prep, item.id, 2027);
    prep = r.state;
    paid += r.paid;
  }
  assert.equal(paid, PREP_COINS);
  assert.deepEqual([prep.coins, prep.coinsEarned, prep.xp], [10 + PREP_COINS, 10 + PREP_COINS, base.xp]);
  const again = tickPrep(tickPrep(prep, 'cash', 2027).state, 'cash', 2027); // untick and tick: paid already
  assert.equal(again.paid, 0);
  assert.equal(again.state.coins, 10 + PREP_COINS);
  assert.equal(tickPrep(prep, 'water', 2028).paid, 0); // one item of next year's list

  // deklaration: the early refund, then the deadline (2 May or the next weekday), shown from 1 March
  assert.equal(deklarationFor(2026).deadline, '2026-05-04');
  assert.equal(deklarationFor(2027).deadline, '2027-05-03');
  assert.equal(deklarationFor(2028).deadline, '2028-05-02');
  for (let y = 2028; y <= 2045; y++) {
    const d = deklarationFor(y);
    assert.ok(d.deadline >= `${y}-05-02` && d.deadline <= `${y}-05-06` && !isDayOff(new Date(`${d.deadline}T12:00`)), d.deadline);
    assert.equal(d.early, `${y}-03-31`);
  }
  assert.equal(deklarationOn(base, '2027-02-28'), null);
  assert.deepEqual(pick(deklarationOn(base, '2027-03-01')), { phase: 'early', target: '2027-03-31', days: 30 });
  assert.deepEqual(pick(deklarationOn(base, '2027-04-01')), { phase: 'deadline', target: '2027-05-03', days: 32 });
  assert.equal(deklarationOn(base, '2027-05-03')?.days, 0);
  assert.equal(deklarationOn(base, '2027-05-04'), null); // nothing the rest of the year
  assert.equal(deklarationOn(base, '2026-11-06'), null);
  const approved: SweState = { ...base, sweden: { dekl: { 2027: Date.now() } } };
  assert.equal(deklarationOn(approved, '2027-03-10'), null);
  const viaTask: SweState = { ...base, sweden: { tasks: { 'dekl:2027': 't1' } }, days: { '2027-03-10': { ...emptyDay(), doneTasks: [{ id: 't1', at: 1 }] } } };
  assert.ok(deklDone(viaTask, 2027)); // the task was done, then cleared: still done
  assert.ok(!deklDone({ ...viaTask, days: {} }, 2027));
  assert.equal(deklarationOn({ ...base, settings: { ...base.settings, sweden: { deklaration: false } } }, '2027-03-10'), null);
  const ids = (xs: PlannedPing[]) => xs.map((x) => x.id);
  assert.deepEqual(ids(deklPings(base, nov6)), []); // too far ahead to plan yet
  assert.deepEqual(ids(deklPings(base, new Date(2027, 2, 1, 9))), ['dekl-2027-early']);
  assert.equal(deklPings(base, new Date(2027, 2, 1, 9))[0].at.getTime(), new Date(2027, 2, 29, 18).getTime());
  assert.deepEqual(ids(deklPings(base, new Date(2027, 3, 1, 9))), ['dekl-2027-week', 'dekl-2027-eve']);
  assert.deepEqual(ids(deklPings(approved, new Date(2027, 3, 1, 9))), []);
  assert.deepEqual(ids(deklPings(base, new Date(2027, 4, 2, 19))), []); // the eve has gone

  // name days: the almanac's year from a sample payload, its lookups, and nothing from a broken answer
  const dagar: { datum: string; namnsdag: string[]; flaggdag: string }[] = [];
  for (let d = new Date(2026, 0, 1, 12); d.getFullYear() === 2026; d = addDays(d, 1)) dagar.push({ datum: dayKey(d), namnsdag: [`N${dagar.length}`], flaggdag: '' });
  const setDay = (key: string, names: string[], flag = '') => Object.assign(dagar.find((x) => x.datum === key)!, { namnsdag: names, flaggdag: flag });
  setDay('2026-01-01', [], 'Nyårsdagen');
  setDay('2026-06-06', ['Gustav', 'Gösta'], 'Sveriges nationaldag och svenska flaggans dag');
  setDay('2026-11-06', ['Gustav Adolf'], 'Gustav Adolfsdagen');
  setDay('2026-11-08', ['Vendela']);
  const payload = { cachetid: '2026-11-06 20:15:36', version: '2.1', dagar };
  const names = parseNameDays(JSON.parse(JSON.stringify(payload)), 2026);
  assert.ok(names);
  assert.equal(parseNameDays(payload, 2027), null); // another year's answer
  assert.equal(parseNameDays({ dagar: dagar.slice(0, 200) }, 2026), null); // half a year
  assert.equal(parseNameDays({ error: 'x' }, 2026), null);
  assert.equal(parseNameDays(null, 2026), null);
  assert.deepEqual(namesOn(names, '2026-11-06'), { names: ['Gustav Adolf'], flag: 'Gustav Adolfsdagen' });
  assert.equal(nameDayText(names, '2026-11-06'), 'Gustav Adolf · flag day (Gustav Adolfsdagen)');
  assert.equal(nameDayText(names, '2026-11-08'), 'Vendela');
  assert.equal(nameDayText(names, '2026-01-01'), 'flag day (Nyårsdagen)');
  assert.equal(nameDayText(names, '2027-11-06'), null); // not this almanac's year
  assert.equal(nameDayText(null, '2026-11-06'), null); // unavailable: nothing shown
  assert.equal(nameDayOf(names, 'vendela'), '11-08');
  assert.equal(nameDayOf(names, 'Gustav Adolf'), '11-06');
  assert.equal(nameDayOf(names, 'Gustav'), '06-06');
  assert.equal(nameDayOf(names, 'Gösta Berg'), '06-06'); // the first name
  assert.equal(nameDayOf(names, 'Gosta'), '06-06'); // without the accent
  assert.equal(nameDayOf(names, 'Zlatan'), null);
  assert.equal(mdLabel('11-08'), '8 Nov');

  // people days: kind heads-up and nudge, planned so a replan never sends one twice
  const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m).getTime();
  const withDays = (since: number, people: { name: string; md: string; nameDay: boolean; what?: string }[] = []): SweState => ({
    ...base,
    settings: { ...base.settings, wakeHour: 7, sweden: { days: { fars: { who: '', since } }, people: people.map((x, i) => ({ ...x, id: `p${i}`, since: at(1, 9) })) } },
  });
  // turned on tonight (Friday 20:14): the 3-days-ahead time has gone, so the heads-up is tomorrow at 18:00
  const tonight = withDays(nov6.getTime());
  const plan = peoplePings(tonight, nov6);
  assert.deepEqual(
    plan.map((x) => [x.id, x.at.getTime()]),
    [
      ['people-fars-2026-11-08-ahead', at(7, 18)],
      ['people-fars-2026-11-08-day', at(8, 7, 30)],
    ],
  );
  assert.equal(plan[0].title, '👔 Fars dag tomorrow');
  assert.deepEqual(plan[0].vars, { title: 'Fars dag', day: 'tomorrow', task: 'Call Dad' });
  assert.ok(plan.every((x) => isPlanned(x.id)));
  // replanned after it went out: it isn't moved to another evening
  assert.deepEqual(ids(peoplePings(tonight, new Date(at(7, 19)))), ['people-fars-2026-11-08-day']);
  // on for months: the heads-up was Thursday's (gone by now), the nudge still comes
  assert.equal(aheadAt('2026-11-08', at(1, 9))?.getTime(), at(5, 18));
  assert.deepEqual(ids(peoplePings(withDays(at(1, 9)), nov6)), ['people-fars-2026-11-08-day']);
  // turned on Saturday evening: no heads-up on the day itself, just the nudge; on Sunday after the nudge: HQ only
  assert.equal(aheadAt('2026-11-08', at(7, 19)), null);
  assert.deepEqual(ids(peoplePings(withDays(at(7, 19)), new Date(at(7, 19)))), ['people-fars-2026-11-08-day']);
  assert.deepEqual(ids(peoplePings(withDays(at(8, 9)), new Date(at(8, 9)))), []);
  assert.deepEqual(
    peopleSoon(withDays(at(8, 9)), '2026-11-08').map((x) => [x.kind, x.in]),
    [['builtin', 0]],
  );
  assert.equal(peopleSoon(tonight, '2026-11-05').length, 1); // 3 days ahead: the one-tap task shows
  assert.equal(peopleSoon(tonight, '2026-11-04').length, 0);
  const soon = peopleSoon({ ...tonight, settings: { ...tonight.settings, sweden: { days: { fars: { who: 'Anders', since: 0 } } } } }, '2026-11-06')[0];
  assert.ok(soon.kind === 'builtin' && soon.task === 'Call Anders' && soon.taskKey === 'fars:2026');
  // off by default: nothing planned or shown
  assert.deepEqual(peoplePings(base, nov6), []);
  assert.deepEqual(peopleSoon(base, '2026-11-07'), []);
  // the next Mors dag and Alla hjärtans dag from here
  assert.deepEqual(
    PEOPLE_DAYS.map((d) => k(nextPeopleDay(d, '2026-11-06'))),
    ['2027-05-30', '2026-11-08', '2027-02-14'],
  );
  // a person's name day or date: a morning note, in words that name them
  const vendela = withDays(at(1, 9), [
    { name: 'Vendela', md: '11-08', nameDay: true },
    { name: 'Anna', md: '11-07', nameDay: false, what: 'birthday' },
  ]);
  const notes = peoplePings(vendela, nov6).filter((x) => x.line === 'personDayToday');
  assert.deepEqual(
    notes.map((x) => [x.id, x.at.getTime(), x.vars.title]),
    [
      ['people-pp0-2026-11-08', at(8, 7, 30), "Vendela's name day"],
      ['people-pp1-2026-11-07', at(7, 7, 30), "Anna's birthday"],
    ],
  );
  assert.ok(line('personDayToday', 10, notes[0].vars).includes("Vendela's name day"));
  assert.equal(k(nextPersonDay({ md: '02-29' }, '2027-01-10')), '2027-02-28');
  assert.equal(k(nextPersonDay({ md: '11-06' }, '2026-11-07')), '2027-11-06');
  // every ping passes what its pool's lines use; people days and the siren are kind in both pools; Kalle Anka is never hit
  const pools = LINES as Record<string, { mild: string[]; savage: string[] }>;
  const all = [...peoplePings(vendela, nov6), sirenPing(base, nov6)!, ...deklPings(base, new Date(2027, 2, 1, 9)), ...deklPings(base, new Date(2027, 3, 1, 9))];
  for (const x of all) {
    const pool = pools[x.line];
    assert.ok(pool, x.line);
    for (const t of [...pool.mild, ...pool.savage]) for (const m of t.matchAll(/\{(\w+)\}/g)) assert.ok(m[1] === 'name' || m[1] in x.vars, `${x.id}: {${m[1]}}`);
    assert.ok(!(x.at.getMonth() === 11 && x.at.getDate() === 24 && x.at.getHours() === 15));
  }
  for (const key of ['personDayToday', 'peopleDayAhead', 'peopleDayToday', 'sirenTest']) assert.deepEqual(pools[key].savage, pools[key].mild, key);

  // the fika almanac: computed days, a banner key per day, the food first on quick add, never logged by itself
  assert.equal(fikaOn('2026-11-06')?.id, 'gustavadolf'); // today
  assert.equal(fikaOn('2026-11-07')?.id, 'kladdkaka');
  assert.equal(fikaOn('2026-11-10')?.id, 'marten');
  assert.equal(fikaOn('2026-02-17')?.id, 'semla');
  assert.equal(fikaOn('2027-02-09')?.id, 'semla');
  assert.equal(fikaOn('2026-08-20')?.id, 'surstromming');
  assert.deepEqual(['2026-01-13', '2026-03-25', '2026-05-11', '2026-10-04', '2026-12-09'].map((x) => fikaOn(x)?.id), ['knut', 'waffle', 'chokladboll', 'kanelbulle', 'pepparkaka']);
  assert.equal(fikaOn('2026-11-08'), null);
  assert.equal(fikaOn('2027-11-06'), null); // Alla helgons dag that year: no pastry banner
  for (let y = 2026; y <= 2040; y++) {
    const keys = FIKA.map((f) => k(f.dateOf(y)));
    assert.equal(new Set(keys).size, keys.length, String(y)); // no two on one day
    // only Våffeldagen can land on a holiday (Easter, some years); the others never do
    for (const key of keys) if (fikaOn(key) && fikaOn(key)?.id !== 'waffle') assert.equal(holidayOn(new Date(`${key}T12:00`)), null, key);
  }
  assert.deepEqual(fikaPortion(FIKA.find((f) => f.id === 'semla')!.food!), { name: 'Semla (100 g)', kcal: 333, protein: 5 });
  assert.equal(fikaPortion({ name: 'Gustav Adolfsbakelse' }), null);
  const fuel: SweState = { ...base, settings: { ...base.settings, quickAdd: { pinned: [{ name: 'Kladdkaka (60 g)', kcal: 1, protein: 1 }, { name: 'Ägg', kcal: 70, protein: 6 }], hidden: [] } } };
  const row = quickFoods(fuel, '2026-11-07');
  assert.deepEqual(
    row.map((f) => [f.name, f.kcal, f.pinned, f.fika?.ask ?? null]),
    [
      ['Kladdkaka (60 g)', 1, true, null],
      ['Ägg', 70, true, null],
    ],
  ); // her own pinned version of the day's food leads, with her numbers (never swapped for the almanac's)
  const unpinned: SweState = { ...fuel, settings: { ...fuel.settings, quickAdd: { pinned: [{ name: 'Ägg', kcal: 70, protein: 6 }], hidden: [] } } };
  assert.deepEqual(
    quickFoods(unpinned, '2026-11-07').map((f) => [f.name, f.kcal, f.fika?.ask ?? null]),
    [
      ['Kladdkaka (60 g)', 250, false],
      ['Ägg', 70, null],
    ],
  ); // otherwise the almanac's portion comes first
  assert.equal(quickFoods(fuel, '2026-11-06')[0].fika?.ask, true); // a name only: the tap fills in the name
  assert.equal(quickFoods(fuel, '2026-11-08')[0].name, 'Kladdkaka (60 g)'); // any other day: the row as it was
  assert.equal(quickFoods(fuel)[0].fika, undefined);
  assert.equal(quickFoods({ ...fuel, settings: { ...fuel.settings, quickAdd: { pinned: [], hidden: ['kladdkaka'] } } }, '2026-11-07').length, 0); // taken off stays off
  assert.equal(quickFoods({ ...fuel, settings: { ...fuel.settings, sweden: { fika: false } } }, '2026-11-07')[0].fika, undefined);
  assert.deepEqual(fuel.days, {}); // offering a food logs nothing
}
step8SwedenTests();

// step 8 stockholm: the weekend card (Visit Stockholm) and Stockholm's weather since 1859 (SMHI)
function step8StockholmTests() {
  // the climate table: day-of-year slots in a leap calendar, records keep the first year to reach them
  {
    assert.equal(doyOf('01-01'), 0);
    assert.equal(doyOf('2024-02-29'), 59);
    assert.equal(doyOf('2026-03-01'), 60);
    assert.equal(doyOf('2026-11-06'), 310);
    assert.equal(doyOf('2026-12-31'), 365);
    assert.equal(daysInMonth('2026-02'), 28);
    assert.equal(daysInMonth('2024-02'), 29);
    const fixture: DayObs[] = [
      { day: '1859-11-06', mean: -5.04 },
      { day: '1995-11-06', mean: 8, max: 11.2, min: 4 },
      { day: '2000-11-06', mean: 8, max: 11.2, min: -6.5 }, // ties: the record stays 1995's
      { day: '2010-11-06', mean: 6, max: 14.4, min: -6.5 },
      { day: '1980-11-07', mean: 3 },
    ];
    const t = buildClimateTable(fixture, { source: 'fixture' });
    const i = doyOf('11-06');
    assert.deepEqual([t.warm[i], t.warmY[i], t.cold[i], t.coldY[i]], [80, 1995, -50, 1859]);
    assert.deepEqual([t.hi[i], t.hiY[i], t.lo[i], t.loY[i]], [144, 2010, -65, 2000]);
    assert.deepEqual([t.from, t.extremesFrom, t.through], [1859, 1995, '2010-11-06']);
    assert.equal(t.hi[doyOf('11-07')], null); // no max that day: no record to quote
    assert.equal(t.mean.length, 366);

    // the normal: a smooth curve over 1991–2020 only (a hot year outside it changes nothing), months with ≤ 2 days missing
    const curve = (doy: number) => 6 + 10 * Math.sin((2 * Math.PI * (doy - 110)) / 366);
    const days: DayObs[] = [];
    for (const y of [1991, 1992, 1993]) {
      for (let d = new Date(y, 0, 1, 12); d.getFullYear() === y; d.setDate(d.getDate() + 1)) {
        const day = dayKey(d);
        days.push({ day, mean: curve(doyOf(day)) });
      }
    }
    for (let d = 1; d <= 31; d++) days.push({ day: `1980-07-${String(d).padStart(2, '0')}`, mean: 40 });
    const n = buildClimateTable(days, { source: 'fixture' });
    for (const k of [0, 59, 120, 200, 310, 365]) assert.ok(Math.abs(n.mean[k] / 10 - curve(k)) <= 0.15, `normal at ${k}: ${n.mean[k]} vs ${curve(k).toFixed(2)}`);
    assert.deepEqual([n.months.warm[6], n.months.warmY[6]], [400, 1980]); // July 1980: the record month, outside the normal
    assert.ok(Math.abs(n.months.mean[6] / 10 - 15.5) < 1, String(n.months.mean[6])); // July's normal comes from 1991–1993 only
    assert.equal(monthMeanOf(days, '1980-07'), 40);
    assert.equal(monthMeanOf(days.filter((o) => o.day !== '1991-03-01' && o.day !== '1991-03-02'), '1991-03') != null, true); // 2 missing: still a month
    assert.equal(monthMeanOf(days.filter((o) => !/^1991-03-0[123]$/.test(o.day)), '1991-03'), null); // 3 missing: not a month

    // SMHI's CSV (BOM, header block, extra columns) and latest-months JSON
    const csv = [
      '﻿Stationsnamn;Stationsnummer;Stationsnät;Mäthöjd (meter över marken)',
      'Stockholm-Observatoriekullen;98210;SMHIs stationsnät;2.0',
      '',
      'Från Datum Tid (UTC);Till Datum Tid (UTC);Representativt dygn;Lufttemperatur;Kvalitet;;Tidsutsnitt:',
      '1859-01-01 00:00:01;1859-01-02 00:00:00;1859-01-01;0.2;Y;;Kvalitetskontrollerade historiska data',
      '1859-01-02 00:00:01;1859-01-03 00:00:00;1859-01-02;-3.1;Y;;Tidsperiod (fr.o.m.) = 1859-01-01',
      '1859-01-03 00:00:01;1859-01-04 00:00:00;1859-01-03;;Y',
      '',
    ].join('\r\n');
    assert.deepEqual([...parseSmhiCsv(csv)], [['1859-01-01', 0.2], ['1859-01-02', -3.1]]);
    const latest = parseSmhiLatest({ value: [{ ref: '2026-11-04', value: '7.4' }, { ref: '2026-11-05', value: '7.0' }, { ref: 'bad', value: '1' }] });
    assert.deepEqual([...latest], [['2026-11-04', 7.4], ['2026-11-05', 7]]);
    assert.throws(() => parseSmhiLatest({ value: null }));
    assert.deepEqual(joinObs(latest, new Map([['2026-11-06', 6.6]]), new Map(), '2026-11-05'), [
      { day: '2026-11-04', mean: 7.4, max: undefined, min: undefined },
      { day: '2026-11-05', mean: 7, max: undefined, min: undefined },
    ]); // today's still-running max is left out
  }

  // the lookup: a date's facts, records set since the table, the HQ line, the toast's sentence, a month's line
  {
    const october = (y: number, mean: number): DayObs[] => Array.from({ length: 31 }, (_, k) => ({ day: `${y}-10-${String(k + 1).padStart(2, '0')}`, mean }));
    const t = buildClimateTable(
      [
        { day: '1859-11-06', mean: -6.6 },
        { day: '1938-11-06', mean: 11.4, max: 12.3, min: 9 },
        { day: '1970-11-06', mean: 1, max: 3, min: -6.7 },
        { day: '2020-11-06', mean: 9, max: 14.4, min: 5 },
        { day: '1938-11-07', mean: 5, max: 7, min: 2 },
        { day: '1939-11-08', mean: 5, max: 7, min: 2 },
        ...october(1900, 5), // the coldest October
        ...october(1990, 10), // the warmest, just before the normal period
        ...october(2001, 7.7), // the normal period's only October
      ],
      { source: 'fixture' },
    );
    const f = factsOn('2026-11-06', [], t);
    assert.deepEqual([f.warm, f.cold, f.hi, f.lo], [{ v: 11.4, year: 1938 }, { v: -6.6, year: 1859 }, { v: 14.4, year: 2020 }, { v: -6.7, year: 1970 }]);
    const extra = [
      { day: '2026-11-06', kind: 'warm' as const, v: 12.1 },
      { day: '2025-11-06', kind: 'hi' as const, v: 13 }, // not above the table's record: ignored
      { day: '2026-11-07', kind: 'cold' as const, v: -20 }, // another date
    ];
    const g = factsOn('2027-11-06', extra, t);
    assert.deepEqual([g.warm, g.hi, g.cold], [{ v: 12.1, year: 2026 }, { v: 14.4, year: 2020 }, { v: -6.6, year: 1859 }]);
    // broken: strictly beyond the record (a tie isn't one), and never by more than a glitch
    assert.deepEqual(recordsBroken({ day: '2026-11-06', mean: 11.9, max: 14.4, min: 0 }, f), [{ kind: 'warm', v: 11.9, old: { v: 11.4, year: 1938 } }]);
    assert.deepEqual(recordsBroken({ day: '2026-11-06', mean: 11.4, max: 14.5, min: -7 }, f).map((b) => b.kind), ['hi', 'lo']);
    assert.deepEqual(recordsBroken({ day: '2026-11-06', mean: 11.4 + GLITCH_C + 0.1 }, f), []);
    assert.deepEqual(recordsBroken({ day: '2026-11-06' }, f), []);
    // HQ's line: a different fact by date (310 % 3 = 1: the coldest; 311: high and low; 312: the warmest)
    assert.equal(dateLabel('2026-11-06'), '6 Nov');
    const normal = f.normal.toFixed(1);
    assert.equal(triviaLine('2026-11-06', [], t), `6 Nov usually averages ${normal}° in Stockholm; the coldest on record (since 1859) averaged -6.6° in 1859.`);
    assert.equal(triviaLine('2026-11-07', [], t), "Stockholm's records for 7 Nov (since 1938): a high of 7.0° in 1938 and a low of 2.0° in 1938.");
    assert.match(triviaLine('2026-11-08', [], t) ?? '', /^8 Nov usually averages -?\d+\.\d° in Stockholm; the warmest on record \(since 1859\) averaged 5\.0° in 1939\.$/);
    assert.equal(triviaLine('2026-11-09', [], t), null); // a date with nothing in the table
    assert.ok(!/\byou/i.test(triviaLine('2026-11-06', [], t) ?? '')); // about the city, never the owner
    assert.equal(
      recordText('2026-11-05', { kind: 'warm', v: 12.1, old: { v: 11.4, year: 1938 } }, t),
      'Yesterday averaged 12.1°, the warmest 5 Nov in Stockholm since 1859 (the old record: 11.4° in 1938).',
    );
    assert.match(recordText('2026-11-05', { kind: 'lo', v: -8, old: { v: -6.7, year: 1970 } }, t), /^Yesterday fell to -8\.0°, Stockholm's lowest for 5 Nov since 1938 \(the old record: -6\.7° in 1970\)\.$/);
    // a month against its normal (October here: normal 7.7°, records 10.0° in 1990 and 5.0° in 1900)
    assert.deepEqual(monthLine('2026-10', 8.9, t), { delta: 1.2, text: 'October ran 1.2° warm in Stockholm: 8.9° against a normal 7.7°.' });
    assert.equal(monthLine('2026-10', 7.5, t).text, 'October ran close to normal in Stockholm: 7.5° against 7.7°.');
    assert.equal(monthLine('2026-10', 6.5, t).delta, -1.2);
    assert.match(monthLine('2026-10', 6.5, t).text, /ran 1\.2° cold/);
    assert.match(monthLine('2026-10', 10.5, t).text, / The warmest October since 1859\.$/);
    assert.match(monthLine('2026-10', 4.9, t).text, / The coldest October since 1859\.$/);
    assert.deepEqual(monthMeans([{ day: '2026-10-01', mean: 5 }], '2026-11-06'), {}); // a month with a day in it isn't a month

    // folding in SMHI's latest readings: new records once, a toast for yesterday's once, fetchedDay once yesterday is in
    const obs = (day: string, mean?: number, max?: number, min?: number): DayObs => ({ day, mean, max, min });
    const after = '2026-11-07'; // t.through is 2020-11-06, so these days are all new
    let r = climateUpdate(undefined, [obs('2026-11-05', 5, 7, 2), obs('2026-11-06', 12, 14, 9), obs('2026-11-07', 4, 6)], after, t);
    assert.match(r.toast ?? '', /^Yesterday averaged 12\.0°, the warmest 6 Nov in Stockholm since 1859/);
    assert.deepEqual(r.next.records, [{ day: '2026-11-06', kind: 'warm', v: 12 }]);
    assert.deepEqual([r.next.toasted, r.next.checked, r.next.fetchedDay], ['2026-11-06', '2026-11-06', after]);
    r = climateUpdate(r.next, [obs('2026-11-06', 12, 14, 9)], after, t);
    assert.equal(r.toast, null); // once
    // yesterday not all in yet: no toast, no fetchedDay, and it's checked once it is
    let p = climateUpdate(undefined, [obs('2026-11-06', 12, 14)], after, t);
    assert.deepEqual([p.toast, p.next.fetchedDay, p.next.checked], [null, undefined, undefined]);
    p = climateUpdate(p.next, [obs('2026-11-06', 12, 14, 9)], after, t);
    assert.ok(p.toast && p.next.fetchedDay === after);
    // an older record (the app was closed that day) is kept quietly; days inside the table aren't checked again
    const q = climateUpdate(undefined, [obs('2020-11-06', 30, 30, 30), obs('2025-11-06', 12, 14, 9)], after, t);
    assert.equal(q.toast, null);
    assert.deepEqual(q.next.records?.map((x) => x.day), ['2025-11-06']);
    // month means: finished months only, the newest 24 kept
    const oct = Array.from({ length: 31 }, (_, k) => obs(`2026-10-${String(k + 1).padStart(2, '0')}`, k < 15 ? 8 : 9, 10, 5));
    const m = climateUpdate({ months: { '2026-09': 11.2 } }, [...oct, obs('2026-11-01', 3, 4, 1)], after, t);
    assert.deepEqual(m.next.months, { '2026-09': 11.2, '2026-10': 8.5 });
    assert.ok(climateDue(undefined, true, after) && !climateDue({ fetchedDay: after }, true, after) && !climateDue(undefined, false, after));
    assert.ok(nearStockholm({ lat: 59.33, lon: 18.07 }) && nearStockholm({ lat: 59.36, lon: 18.0 })); // Stockholm, Solna
    assert.ok(!nearStockholm({ lat: 59.86, lon: 17.64 }) && !nearStockholm({ lat: 57.7, lon: 11.97 }) && !nearStockholm(null)); // Uppsala, Göteborg
  }

  // the shipped table: since 1859, every date filled, small enough to bundle
  {
    assert.equal(CLIMATE.from, 1859);
    assert.equal(CLIMATE.extremesFrom, 1941);
    assert.ok(isDayKey(CLIMATE.through));
    for (const k of ['mean', 'warm', 'warmY', 'cold', 'coldY', 'hi', 'hiY', 'lo', 'loY'] as const) assert.equal(CLIMATE[k].length, 366, k);
    for (let k = 0; k < 366; k++) {
      assert.ok(CLIMATE.warm[k] > CLIMATE.mean[k] && CLIMATE.mean[k] > CLIMATE.cold[k], `day ${k}`);
      assert.ok(CLIMATE.hi[k] != null && CLIMATE.lo[k] != null && (CLIMATE.hi[k] as number) > (CLIMATE.lo[k] as number), `day ${k}`);
      assert.ok(CLIMATE.warmY[k] >= 1859 && CLIMATE.coldY[k] >= 1859);
    }
    assert.ok(CLIMATE.months.mean[6] > 150 && CLIMATE.months.mean[0] < 0); // July near 18°, January below 0
    const bytes = statSync(join(process.cwd(), 'src', 'lib', 'sthlm-climate.json')).size;
    assert.ok(bytes > 10_000 && bytes < 30_000, `${bytes} bytes`);
  }

  // the weekend card: Thursday to Saturday, events on the weekend's days, shows before runs, one per category first
  {
    assert.equal(weekendOf(new Date(2026, 10, 4, 12)), null); // Wednesday
    assert.deepEqual(weekendOf(new Date(2026, 10, 5, 12)), { friday: '2026-11-06', days: ['2026-11-06', '2026-11-07', '2026-11-08'] }); // Thursday
    assert.equal(weekendOf(new Date(2026, 10, 6, 23))?.friday, '2026-11-06'); // Friday
    assert.equal(weekendOf(new Date(2026, 10, 7, 8))?.friday, '2026-11-06'); // Saturday
    assert.equal(weekendOf(new Date(2026, 10, 8, 12)), null); // Sunday
    assert.equal(weekendOf(new Date(2026, 11, 31, 12))?.friday, '2027-01-01'); // across the year
    assert.equal(cleanStation("T-bana Blå: Kungsträdgården | Buss 65: Arkes/Moderna Museet | Buss 2: Karl XII's torg"), 'Kungsträdgården');
    assert.equal(cleanStation('Kärrtorp Subway Station'), 'Kärrtorp');
    assert.equal(cleanStation('Rådhuset Tunnelbana'), 'Rådhuset');
    assert.equal(cleanStation('t-bana Gamla Stan'), 'Gamla Stan');
    assert.equal(cleanStation('Nearest bus stop: Flatenbadet (SL bus stop)'), 'Flatenbadet');
    assert.equal(cleanStation('undefined'), null);
    assert.equal(cleanStation(null), null);
    assert.ok((cleanStation('Roslagsbanan till Täby Centrum eller Tibble station, bussar från Mörby centrum') ?? '').length <= 40);
    assert.equal(decodeEntities('Sweden&#x27;s &amp; Co &quot;30&quot;'), 'Sweden\'s & Co "30"');

    const days = ['2026-11-06', '2026-11-07', '2026-11-08'];
    const raw = (o: Partial<RawEvent> & { id: string }): RawEvent => ({ title: { en: o.id }, categories: [{ slug: 'music' }], start_date: '2026-11-06', end_date: '2026-11-06', ...o });
    const dated = (id: string, dates: [string, string][], extra: Partial<RawEvent> = {}) =>
      raw({ id, schedule: { range: null, dates: dates.map(([date, start_time]) => ({ date, start_time })) }, start_date: dates[0][0], end_date: dates[dates.length - 1][0], ...extra });
    const run = (id: string, start: string, end: string, excluded: string[] = [], extra: Partial<RawEvent> = {}) =>
      raw({ id, schedule: { range: { start, end, excluded }, dates: [{ date: '2026-11-02' }, { date: '2026-11-03' }] }, start_date: start, end_date: end, ...extra });
    // a run goes by its range minus excluded days (its own dates are a weekday template); shows by their dates
    assert.deepEqual(slotsOf(run('x', '2026-11-06', '2027-01-31', ['2026-11-07']), days), [{ day: '2026-11-06', time: null }, { day: '2026-11-08', time: null }]);
    assert.deepEqual(slotsOf(dated('y', [['2026-11-04', '19:00'], ['2026-11-07', '19:30'], ['2026-11-07', '13:00'], ['2026-11-14', '19:00']]), days), [
      { day: '2026-11-07', time: '13:00' },
      { day: '2026-11-07', time: '19:30' },
    ]);
    assert.deepEqual(slotsOf(raw({ id: 'z', start_date: '2026-11-07', end_date: '2026-11-08', start_time: '9:00' }), days), [{ day: '2026-11-07', time: '09:00' }, { day: '2026-11-08', time: '09:00' }]);
    assert.deepEqual(slotsOf(raw({ id: 'z2', start_date: '2026-11-07', end_date: '2026-11-07', start_time: '9:30:00' }), days), [{ day: '2026-11-07', time: '09:30' }]);
    assert.deepEqual(slotsOf(raw({ id: 'z3', start_date: '2026-11-07', end_date: '2026-11-07', start_time: 'soon' }), days), [{ day: '2026-11-07', time: null }]);
    assert.equal(weekendEvent(dated('later', [['2026-11-14', '19:00']]), days), null); // not this weekend
    assert.equal(weekendEvent(raw({ id: 'untitled', title: { en: '', sv: '' } }), days), null);
    assert.equal(weekendEvent(raw({ id: 'sv', title: { en: null, sv: 'Julmarknad' } }), days)?.title, 'Julmarknad');
    const ranks = [
      dated('once', [['2026-11-07', '19:00']]),
      dated('long show', [['2026-11-07', '19:00']], { start_date: '2026-11-06', end_date: '2026-12-13' }),
      run('festival', '2026-11-06', '2026-11-08'),
      run('exhibition', '2026-11-06', '2027-03-01', [], { categories: [{ slug: 'exhibitions' }] }),
    ].map((e) => weekendEvent(e, days)?.rank);
    assert.deepEqual(ranks, [0, 1, 2, 3]);
    const full = weekendEvent(
      dated('Icona Pop', [['2026-11-07', '19:00']], { venue_name: 'Annexet', closest_station: 'Globen', external_website_url: 'https://example.com/x', categories: [{ slug: 'music' }, { slug: 'clubs-parties' }] }),
      days,
    );
    assert.deepEqual(full, { id: 'Icona Pop', title: 'Icona Pop', url: 'https://example.com/x', venue: 'Annexet', station: 'Globen', cats: ['music', 'clubs-parties'], rank: 0, slots: [{ day: '2026-11-07', time: '19:00' }] });
    assert.equal(weekendEvent(dated('ftp', [['2026-11-07', '19:00']], { external_website_url: 'javascript:alert(1)' }), days)?.url, null);
    assert.throws(() => parsePage({ count: 3 } as RawPage, days));
    assert.deepEqual(parsePage({ next: 2, results: [dated('a', [['2026-11-07', '19:00']]), dated('b', [['2026-11-20', '19:00']])] }, days).events.map((e) => e.id), ['a']);
    assert.equal(parsePage({ next: null, results: [] }, days).next, false);
    assert.equal(weekendKey(['music', 'exhibitions'], '2026-11-06'), weekendKey(['exhibitions', 'music'], '2026-11-06'));
    assert.equal(eventsUrl(['music', 'stage-film'], days, 2), 'https://api.visitstockholm.com/api/public-v1/events/?categories=music&categories=stage-film&date_from=2026-11-06&date_to=2026-11-08&page=2');
    assert.deepEqual([1, 2, 3, 4].map((k) => eventsRetryMs(k) / 60_000), [15, 30, 60, 60]);

    // picks, on Friday at 20:00: tonight's 19:00 show and today's run are over; one per category first; a title once
    const events = [
      dated('Tonight early', [['2026-11-06', '19:00']]),
      dated('Tonight late', [['2026-11-06', '21:00']]),
      dated('Saturday gig', [['2026-11-07', '20:00']]),
      dated('Saturday gig dup', [['2026-11-07', '20:30']], { title: { en: 'saturday GIG' } }), // the same show listed twice
      dated('Sunday matinee', [['2026-11-08', '15:00']]),
      run('Gallery', '2026-11-06', '2027-02-01', [], { categories: [{ slug: 'exhibitions' }] }),
      dated('Brunch', [['2026-11-08', '11:00']], { categories: [{ slug: 'eat-drink' }] }),
    ]
      .map((e) => weekendEvent(e, days))
      .filter((e): e is NonNullable<typeof e> => !!e);
    const fri8pm = new Date(2026, 10, 6, 20, 0);
    const pick = pickWeekend(events, ['music', 'exhibitions'], fri8pm);
    assert.deepEqual(pick.map((x) => [x.event.id, x.slot.day, x.slot.time]), [
      ['Tonight late', '2026-11-06', '21:00'],
      ['Saturday gig', '2026-11-07', '20:00'],
      ['Gallery', '2026-11-07', null], // the exhibition gets its place, from Saturday (it's after 16:00 on Friday)
    ]);
    assert.deepEqual(pickWeekend(events, ['music'], fri8pm).map((x) => x.event.id), ['Tonight late', 'Saturday gig', 'Sunday matinee']);
    assert.deepEqual(pickWeekend(events, ['eat-drink'], fri8pm).map((x) => x.event.id), ['Brunch']);
    assert.deepEqual(pickWeekend(events, ['family'], fri8pm), []);
    assert.equal(nextSlot(events.find((e) => e.id === 'Gallery')!, new Date(2026, 10, 6, 10))?.day, '2026-11-06'); // a run today, in the morning
    const [late, gig, gallery] = pick;
    assert.equal(whenText(late, fri8pm), 'Today · 21:00');
    assert.equal(whenText(gig, fri8pm), 'Sat 7 Nov · 20:00');
    assert.equal(whenText(gallery, fri8pm), 'Sat–Sun · open');
    assert.equal(whenText({ event: { ...gallery.event, slots: [{ day: '2026-11-08', time: null }] }, slot: { day: '2026-11-08', time: null } }, fri8pm), 'Sun 8 Nov · open');
    assert.equal(outingTask(gig), 'Sat 7 Nov 20:00: Saturday gig');
    assert.equal(outingTask({ event: full!, slot: full!.slots[0] }), 'Sat 7 Nov 19:00: Icona Pop @ Annexet');
    assert.equal(outingTask({ event: { ...full!, venue: null }, slot: full!.slots[0] }), 'Sat 7 Nov 19:00: Icona Pop (near Globen)');
    assert.equal(dayText('2026-11-07', '2026-11-07'), 'Today');

    // the Plan and Wrapped: planned once per event and day; the month's total counts by the event's day
    const s0 = defaultState();
    const outing = (id: string, day: string) => ({ id, day, title: id, task: `t-${id}`, at: 1 });
    const withOutings = { ...s0, sthlmOutings: [outing('a', '2026-10-31'), outing('b', '2026-11-07'), outing('c', '2026-11-08')] };
    assert.ok(planned(withOutings, 'b', '2026-11-07') && !planned(withOutings, 'b', '2026-11-08') && !planned(s0, 'b', '2026-11-07'));
    assert.deepEqual([outingsIn(withOutings, '2026-10'), outingsIn(withOutings, '2026-11'), outingsIn(s0, '2026-11')], [1, 2, 0]);
    const sthlm = { name: 'Stockholm, Sverige', lat: 59.33, lon: 18.07 };
    const wrappedOf = (st: typeof s0) => monthWrapped(st, 2026, 9, new Date(2026, 10, 6, 12)).slides.find((x) => x.id === 'stockholm');
    const city = { ...withOutings, settings: { ...s0.settings, weather: sthlm }, sthlmClimate: { months: { '2026-10': CLIMATE.months.mean[9] / 10 + 1.2 } } };
    const slide = wrappedOf(city);
    assert.equal(slide?.big, '1 outing');
    assert.match(slide?.sub ?? '', /^1 weekend event added to your plan · October ran 1\.2° warm in Stockholm: /);
    assert.equal(wrappedOf({ ...city, sthlmOutings: [] })?.big, '+1.2°');
    assert.equal(wrappedOf({ ...city, settings: { ...city.settings, weather: { name: 'Göteborg', lat: 57.7, lon: 11.97 } } })?.sub, '1 weekend event added to your plan'); // not Stockholm: no city weather
    assert.equal(wrappedOf(s0), undefined);
  }

  // fetching a weekend: every page until there's no next, an event once however often pages repeat it, unknown categories skipped
  void (async () => {
    const days = ['2026-11-06', '2026-11-07', '2026-11-08'];
    const ev = (id: string) => ({ id, title: { en: id }, categories: [{ slug: 'music' }], schedule: { range: null, dates: [{ date: '2026-11-07', start_time: '19:00' }] }, start_date: '2026-11-07', end_date: '2026-11-07' });
    const asked: string[] = [];
    const pages: Record<number, RawPage> = { 1: { next: 2, results: [ev('a'), ev('b')] }, 2: { next: 3, results: [ev('b'), ev('c')] }, 3: { next: null, results: [ev('a')] } };
    const got = await fetchWeekend(['music', 'nonsense'], days, async (url) => {
      asked.push(url);
      return pages[Number(/page=(\d+)/.exec(url)?.[1])];
    });
    assert.deepEqual(got.map((e) => e.id), ['a', 'b', 'c']);
    assert.equal(asked.length, 3);
    assert.ok(asked.every((u) => u.includes('categories=music&date_from') && !u.includes('nonsense')));
    assert.deepEqual(await fetchWeekend(['nonsense'], days, async () => assert.fail('no call without a known category')), []);
    let calls = 0;
    await fetchWeekend(['music'], days, async () => (calls++, { next: 99, results: [] }));
    assert.equal(calls, EVENTS_MAX_PAGES); // a page cap
    await assert.rejects(fetchWeekend(['music'], days, async (url) => (url.includes('page=2') ? Promise.reject(new Error('down')) : pages[1])));
    console.log('step 8 stockholm fetch checks passed');
  })().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
step8StockholmTests();

// step 8 days: the owner's days, plans and the app's own records
function step8DaysTests() {
  type Pools = Record<string, { mild: string[]; savage: string[] }>;
  for (const k of ['gymSlotSet', 'pastYouAsk', 'pastYouSaved', 'spotterOutlasted', 'spotterStopped', 'slotFocusPing', 'slotTaskPing', 'topSlotPing', 'awayPlanned', 'phoneWeekDoom', 'phoneWeekHeavy', 'phoneWeekChill']) {
    const pool = (LINES as Pools)[k];
    assert.ok(pool && pool.mild.length > 0 && pool.savage.length > 0, k);
  }
  assert.ok(isPlanned('slot-focus-p1') && isPlanned('slot-task-p2') && isPlanned('top3-2027-01-14-T1'));

  // 22: free slots that do something, and 16: tomorrow's top 3 booked (plan-slots.ts)
  {
    const key = '2027-01-13';
    const t = (h: number, m = 0, d = 13) => new Date(2027, 0, d, h, m).getTime();
    const s = { ...defaultState(), onboarded: true, tasks: [{ id: 'T1', title: 'Taxes', done: false, createdAt: 0 }] };
    assert.deepEqual(gymTimeOn(s, key), { hour: 18, minute: 0 });
    const moved = withGymAt(s, key, t(7, 42), key);
    assert.deepEqual(gymTimeOn(moved, key), { hour: 7, minute: 45 }, 'rounded up to 5 minutes');
    assert.deepEqual(gymTimeOn(moved, '2027-01-14'), { hour: 18, minute: 0 }, 'today only');
    assert.equal(slipAt(moved, key), t(9, 45), 'the slip time follows the moved gym time');
    assert.equal(withGymAt(s, '2027-01-12', t(7), key), s, 'never a past day');
    assert.equal(withGymAt(moved, key, null, key).days[key].gymAt, undefined);

    const now = new Date(2027, 0, 13, 8);
    const a = withSlotPlan(s, { day: key, at: t(10), end: t(11), kind: 'focus' }, key, 'p1');
    const b = withSlotPlan(a, { day: key, at: t(11), end: t(12), kind: 'task', taskId: 'T1' }, key, 'p2');
    assert.equal(withSlotPlan(b, { day: key, at: t(13), end: t(14), kind: 'task', taskId: 'gone' }, key, 'p3'), b, 'no task, no booking');
    assert.equal(withSlotPlan(b, { day: '2027-01-12', at: t(10, 0, 12), end: t(11, 0, 12), kind: 'focus' }, key, 'p3'), b, 'never a past day');
    assert.deepEqual(slotPlansOn(b, key).map((p) => p.id), ['p1', 'p2']);
    assert.deepEqual(slotReminders(b, now).map((r) => [r.id, r.kind, r.title]), [['slot-focus-p1', 'focus', 'Focus block'], ['slot-task-p2', 'task', 'Taxes']]);
    assert.deepEqual(slotReminders(b, new Date(2027, 0, 13, 10, 30)).map((r) => r.id), ['slot-task-p2'], 'a slot already started is past');
    assert.deepEqual(slotReminders({ ...b, tasks: [{ ...b.tasks[0], done: true }] }, now).map((r) => r.id), ['slot-focus-p1'], 'a done task stays quiet');
    assert.deepEqual(slotReminders({ ...b, pauses: [{ from: key, to: key, kind: 'away' }] }, now), [], 'nothing on a paused day');
    const c = withSlotPlan(b, { day: key, at: t(10), end: t(11), kind: 'task', taskId: 'T1' }, key, 'p4');
    assert.deepEqual(slotPlansOn(c, key).map((p) => p.id), ['p4', 'p2'], 'one job per slot start');
    assert.deepEqual(slotPlansOn(withoutSlotPlan(c, 'p4'), key).map((p) => p.id), ['p2']);

    const tom = '2027-01-14';
    const top = { ...s, tasks: [...s.tasks, { id: 'T2', title: 'Call the bank', done: false, createdAt: 0 }], topTomorrow: { day: tom, ids: ['T1', 'T2'] } };
    const slot = { kind: 'slot' as const, at: t(9, 0, 14), end: t(11, 30, 14), ping: true };
    const booked = withTopWhen(withTopWhen(top, tom, 'T1', slot), tom, 'T2', { kind: 'coffee' });
    assert.equal(whenLabel(booked.topTomorrow!.when!.T1), '09:00–11:30 🔔');
    assert.equal(whenLabel({ kind: 'gym' }), 'after gym');
    assert.equal(withTopWhen(top, tom, 'T9', { kind: 'gym' }), top, 'only a picked task');
    assert.deepEqual(slotReminders(booked, now).map((r) => [r.id, r.title]), [['top3-2027-01-14-T1', 'Taxes']]);
    assert.deepEqual(slotReminders(withTopWhen(booked, tom, 'T1', { ...slot, ping: false }), now), [], 'no ping asked, none sent');
    assert.deepEqual(keptWhen(booked.topTomorrow, tom, ['T2']), { T2: { kind: 'coffee' } }, 're-picking keeps the bookings still picked');
    assert.equal(keptWhen(booked.topTomorrow, '2027-01-15', ['T2']), undefined);
    assert.equal(withTopWhen(booked, tom, 'T2', null).topTomorrow?.when?.T2, undefined);
    assert.ok(!whenNow(booked, { kind: 'coffee' }, tom));
    const coffee = { ...booked, days: { [tom]: { ...emptyDay(), coffee: [{ id: 'c', mg: 80, at: t(8, 0, 14) }] } } };
    assert.ok(whenNow(coffee, { kind: 'coffee' }, tom));
    assert.ok(whenNow(booked, slot, tom, t(10, 0, 14)) && !whenNow(booked, slot, tom, t(12, 0, 14)));
  }

  // 17: notes from past you (past-you.ts)
  {
    const key = '2027-01-13'; // a Wednesday
    const k2 = '2027-01-14';
    const at = new Date(2027, 0, 13, 18).getTime();
    const s0 = { ...defaultState(), onboarded: true };
    const trained = { ...s0, days: { [key]: { ...emptyDay(), workoutCounted: true } } };
    assert.equal(goodMoment(s0, trained, at), 'workout');
    const asked = withPastYouAsk(s0, trained, at);
    assert.equal(asked.pastYou?.ask?.why, 'workout');
    assert.equal(asked.pastYou?.askedWeek, '2027-01-11');
    assert.equal(withPastYouAsk(s0, s0, at), s0, 'no good moment, no ask');
    const meh = { ...s0, days: { [key]: { ...emptyDay(), moods: [{ id: 'm0', level: 3 as const, emotions: [], at }] } } };
    assert.equal(goodMoment(s0, meh, at), null, 'a 3 is not a good moment');
    const won = { ...s0, contract: { week: '2027-01-11', from: key, goal: 'water' as const, target: 5, stake: 20, status: 'won' as const } };
    assert.equal(goodMoment({ ...won, contract: { ...won.contract, status: 'open' } }, won, at), 'contract');
    const sick = { ...trained, pauses: [{ from: key, to: key, kind: 'sick' as const }] };
    assert.equal(withPastYouAsk(s0, sick, at), sick, 'never on a sick day');
    // at most once a week: a good check-in the next day doesn't ask again, the next week does
    const later = at + 86_400_000;
    const calm = withoutAsk(asked);
    const happy = { ...calm, days: { ...calm.days, [k2]: { ...emptyDay(), moods: [{ id: 'm', level: 5 as const, emotions: [], at: later }] } } };
    assert.equal(goodMoment(calm, happy, later), 'mood');
    assert.equal(withPastYouAsk(calm, happy, later).pastYou?.ask, null);
    const weekLater = new Date(2027, 0, 20, 18).getTime();
    const again = { ...happy, days: { ...happy.days, '2027-01-20': { ...emptyDay(), workoutCounted: true } } };
    assert.equal(withPastYouAsk(happy, again, weekLater).pastYou?.askedWeek, '2027-01-18');
    assert.ok(openAsk(asked, at + 1000));
    assert.equal(openAsk(asked, at + ASK_OPEN_MS + 1), null, 'an ask lets go after a while');
    // the line answers the ask; the debrief's win is one a night
    const noted = withSkipNote(asked, '  20 minutes in, you   always feel better  ', at, 'n1');
    assert.equal(noted.pastYou?.ask, null);
    assert.deepEqual(noted.pastYou?.notes.map((n) => [n.text, n.kind, n.after]), [['20 minutes in, you always feel better', 'skip', 'workout']]);
    assert.equal(withSkipNote(asked, '   ', at), asked);
    const glad = withWin(withWin(noted, key, 'went for the walk', at, 'w1'), key, 'went for the walk anyway', at, 'w2');
    assert.deepEqual(glad.pastYou?.notes.map((n) => n.id), ['n1', 'w2']);
    assert.equal(winOn(glad, key)?.text, 'went for the walk anyway');
    assert.equal(winOn(withWin(glad, key, ''), key), null);
    // served on a normal day: the lines for the you about to skip first; on a kind day and in the rough-patch card only wins
    const morning = new Date(2027, 0, 14, 9);
    assert.equal(pastYouFor(glad, k2, 'gym', morning)?.kind, 'skip');
    assert.equal(pastYouFor(glad, k2, 'rough', morning)?.kind, 'win');
    const low = { ...glad, days: { ...glad.days, [k2]: { ...emptyDay(), moods: [{ id: 'l', level: 1 as const, emotions: [], at: morning.getTime() - 1000 }] } } };
    assert.equal(pastYouFor(low, k2, 'gym', morning)?.kind, 'win');
    assert.equal(pastYouFor(withoutNote(low, 'w2'), k2, 'gym', morning), null, 'a kind day with no wins shows nothing');
    assert.equal(pastYouFor(glad, '2027-01-12', 'gym', new Date(2027, 0, 12, 9)), null, 'never before it was written');
    assert.equal(pastYouFor(glad, k2, 'gym', morning)?.id, pastYouFor(glad, k2, 'gym', new Date(2027, 0, 14, 20))?.id, 'the same note all day');
    assert.ok(pastYouTail(glad, k2, 'gym', morning).startsWith(' 📝 '));
    assert.equal(pastYouTail(s0, k2, 'gym', morning), '');
  }

  // 20: the spotter in Web Focus (spotter.ts)
  {
    const now = new Date(2027, 0, 13, 10);
    const day = '2027-01-13';
    const s0 = { ...defaultState(), onboarded: true, league: newLeague(1, weekKeyOf(now)) };
    const sp = spotterFor(s0, 25, now)!;
    assert.equal(sp.name, nemesisOf(s0)!.name, "this week's nemesis first");
    assert.equal(sp.minutes, 35, 'no history: the session plus 10');
    assert.equal(spotterFor(defaultState(), 25, now), null, 'no league, no spotter');
    const f = (id: string, minutes: number, snapped?: string) => ({ id, start: 0, end: 0, minutes, snapped });
    const hist = { ...s0, days: { '2027-01-12': { ...emptyDay(), focus: [f('a', 50), f('b', 50), f('c', 90, 'TikTok')] }, '2027-01-11': { ...emptyDay(), focus: [f('d', 25)] } } };
    assert.equal(usualFocus(hist, 25, now), 50, 'the median of finished sessions');
    assert.equal(spotterFor(hist, 25, now)!.minutes, 60, 'a bit past her usual');
    const start = now.getTime();
    const side = sideFor(s0, start, 25);
    const done = { ...s0, focusSide: side, days: { [day]: { ...emptyDay(), focus: [{ id: 'e1', start, end: start + 25 * MIN, minutes: 25 }] } } };
    assert.equal(endOffer(done, start + 26 * MIN)?.more, 10, '"I\'m doing 10 more, you in?"');
    assert.equal(endOffer(done, start + 25 * MIN + OFFER_MS + 1), null, 'the offer goes stale');
    const snapped = { ...done, days: { [day]: { ...emptyDay(), focus: [{ id: 'e1', start, end: start + 5 * MIN, minutes: 25, snapped: 'TikTok' }] } } };
    assert.equal(endOffer(snapped, start + 6 * MIN), null, 'no extra round after a snapped web');
    const extraAt = start + 26 * MIN;
    const extra = { ...done, activeFocus: { start: extraAt, minutes: 10 }, focusSide: { ...side, start: extraAt, extends: { day, id: 'e1', minutes: 25 } } };
    assert.ok(extraRound(extra));
    assert.equal(extraRound({ ...done, activeFocus: { start: extraAt, minutes: 25 } }), null, 'a plain session is no extra round');
    const longer = withExtension({ ...extra, activeFocus: null }, day, 'e1', 10, extraAt + 10 * MIN);
    assert.deepEqual(longer.days[day].focus!.map((x) => [x.minutes, x.end]), [[35, extraAt + 10 * MIN]], 'the extra round adds to the session, not a new one');
    const after = endOffer(longer, extraAt + 11 * MIN)!;
    assert.ok(after.outlasted && after.more == null);
    assert.equal(focusXp(35) - focusXp(25), 2, 'the extra minutes pay what the longer session pays on top');
    const tasked = { ...done, tasks: [{ id: 'T', title: 'Thesis', done: false, createdAt: 0 }], focusSide: { ...sideFor({ ...s0, tasks: [{ id: 'T', title: 'Thesis', done: false, createdAt: 0 }] }, start, 25, 'T') } };
    assert.equal(tasked.focusSide.taskId, 'T');
    assert.equal(endOffer(tasked, start + 60 * MIN)?.task?.id, 'T', 'offers to tick the task off');
    assert.equal(endOffer({ ...tasked, focusSide: { ...tasked.focusSide, closed: true } }, start + 26 * MIN), null);
    assert.equal(sideFor(s0, start, 25, 'nope').taskId, undefined);
  }

  // 26: where focus went (focus-log.ts)
  {
    const now = new Date(2027, 0, 13, 20); // a Wednesday
    const at = (d: number, h: number) => new Date(2027, 0, d, h).getTime();
    const s = defaultState();
    s.days['2027-01-11'] = { ...emptyDay(), focus: [{ id: 'a', start: at(11, 9), end: at(11, 10), minutes: 60, label: 'Thesis' }, { id: 'b', start: at(11, 13), end: at(11, 13) + 20 * MIN, minutes: 50, label: 'thesis ', snapped: 'Instagram' }] };
    s.days['2027-01-12'] = {
      ...emptyDay(),
      focus: [
        { id: 'c', start: at(12, 9), end: at(12, 9) + 50 * MIN, minutes: 50, label: 'Taxes' },
        { id: 'd', start: at(12, 10), end: at(12, 10) + 5 * MIN, minutes: 25, snapped: 'Instagram' },
        { id: 'e', start: at(12, 11), end: at(12, 11), minutes: 25, snapped: 'gave up' },
      ],
    };
    s.days['2027-01-03'] = { ...emptyDay(), focus: [{ id: 'f', start: at(3, 9), end: at(3, 10), minutes: 60, label: 'Old' }] };
    const w = focusBreakdown(s, 'week', now);
    assert.deepEqual(w.rows.map((r) => [r.label, r.min, r.n]), [['thesis', 80, 2], ['Taxes', 50, 1], ['No label', 5, 2]]);
    assert.deepEqual(w.snapper, { app: 'Instagram', n: 2 }, '"gave up" is not an app');
    assert.equal(w.total, 135);
    assert.ok(focusBreakdown(s, 'month', now).rows.some((r) => r.label === 'Old'));
    assert.ok(!w.rows.some((r) => r.label === 'Old'));
    assert.equal(focusMinutes({ id: 'x', start: 0, end: 7 * MIN, minutes: 25, snapped: 'X' }), 7);
  }

  // 23: away planned ahead (away-ahead.ts)
  {
    const today = '2027-01-13';
    const now = new Date(2027, 0, 13, 9);
    const s = { ...defaultState(), onboarded: true };
    const r = planAway(s, '2027-01-20', '2027-01-23', today);
    assert.equal(r.result, 'ok');
    assert.deepEqual(r.state.pauses, [{ from: '2027-01-20', to: '2027-01-23', kind: 'away' }]);
    assert.ok(pausedOn(r.state, '2027-01-21') && !pausedOn(r.state, '2027-01-24') && !pausedOn(r.state, today));
    assert.deepEqual(plannedAways(r.state, today).map((p) => p.from), ['2027-01-20']);
    const capped = planAway(r.state, '2027-01-26', '2027-01-30', today);
    assert.deepEqual([capped.result, capped.to], ['short', '2027-01-28'], "the month's 7 paused days still hold");
    assert.equal(planAway(capped.state, '2027-01-30', '2027-01-31', today).result, 'cap');
    assert.equal(planAway(r.state, '2027-01-22', '2027-01-25', today).result, 'paused');
    assert.equal(planAway(s, '2027-01-10', '2027-01-12', today).result, 'past');
    assert.equal(planAway(s, '2027-01-20', '2027-02-10', today).result, 'past', 'at most two weeks at a time');
    const fromToday = planAway(s, today, '2027-01-14', today);
    assert.equal(fromToday.result, 'ok');
    assert.equal(pauseOn(fromToday.state, today)?.to, '2027-01-14');
    assert.deepEqual(withoutPlannedAway(r.state, '2027-01-20', today).pauses, []);
    assert.equal(withoutPlannedAway(fromToday.state, today, today), fromToday.state, 'a running pause ends with "I\'m back" instead');
    assert.ok(pausedOn(startPause(r.state, 'sick', 2, today), '2027-01-21'), 'sick mode today keeps the trip');
    const ev = (title: string, from: number, to: number) => ({ key: title, title, start: new Date(2027, 0, from).getTime(), end: new Date(2027, 0, to).getTime(), allDay: true, location: null, calendarId: 'c' });
    const trip = ev('Kiruna', 16, 19);
    const oneDay = ev('Dentist', 15, 16);
    const spain = { id: 'c1', title: 'Spain', emoji: '🏖️', date: '2027-02-12', until: '2027-02-16', yearly: false, createdAt: 0 };
    const offers = awayOffers({ ...s, countdowns: [spain] }, [trip, oneDay], now);
    assert.deepEqual(offers.map((o) => [o.from, o.to, o.title]), [['2027-01-16', '2027-01-18', 'Kiruna'], ['2027-02-12', '2027-02-16', '🏖️ Spain']]);
    assert.deepEqual(awayOffers({ ...s, dismissed: [offerKey('2027-01-16', '2027-01-18')] }, [trip], now), [], 'closed with No');
    assert.deepEqual(awayOffers(planAway(s, '2027-01-16', '2027-01-18', today).state, [trip], now), [], 'already planned');
    assert.equal(awayRange('2027-02-12', '2027-02-16'), '12–16 Feb');
    assert.equal(awayRange('2027-12-30', '2028-01-02'), '30 Dec – 2 Jan');
  }

  // 24: the done list keeps its titles (tasks.ts, done-list.ts)
  {
    const key = '2027-01-13';
    const at = new Date(2027, 0, 13, 15).getTime();
    const since = new Date(2026, 11, 1).getTime();
    const s = { ...defaultState(), tasks: [{ id: 'T1', title: 'Renew passport', done: true, createdAt: since, doneAt: at }] };
    const rec = recordTask(s, 'T1', key, at);
    assert.deepEqual(rec.days[key].doneTasks, [{ id: 'T1', at, title: 'Renew passport', since }]);
    assert.deepEqual(recordTask(rec, 'T1', key, null).days[key].doneTasks, []);
    const cleared = { ...rec, tasks: [] };
    assert.deepEqual(doneOn(cleared, key).map((x) => [x.id, x.title]), [['T1', 'Renew passport']], 'Clear keeps the title');
    const older = { ...defaultState(), days: { [key]: { ...emptyDay(), doneTasks: [{ id: 'gone', at }] } } };
    assert.equal(doneTitle(doneOn(older, key)[0]), 'A cleared task', 'old records fall back gracefully');
    assert.equal(doneOn({ ...rec, tasks: [{ ...rec.tasks[0], title: 'Passport!' }] }, key)[0].title, 'Passport!', 'a renamed task shows its name');
    assert.equal(doneBetween(cleared, '2027-01-11', '2027-01-17').length, 1);
    const m = monthDone(cleared, 2027, 0, new Date(2027, 0, 20));
    assert.deepEqual([m.items.length, m.oldest?.item.title, m.oldest?.days], [1, 'Renew passport', 43]);
    const quick = recordTask({ ...defaultState(), tasks: [{ id: 'Q', title: 'Quick', done: true, createdAt: at - 3_600_000, doneAt: at }] }, 'Q', key, at);
    assert.equal(monthDone(quick, 2027, 0, new Date(2027, 0, 20)).oldest, null, 'a quick one is not "finally done"');
    const slide = monthWrapped(cleared, 2027, 0, new Date(2027, 1, 2)).slides.find((x) => x.id === 'tasks');
    assert.ok(slide?.sub.includes('Renew passport'), slide?.sub ?? 'no tasks slide');
  }

  // 27: rival files (rival-files.ts)
  {
    const week = '2027-01-04';
    const s0 = { ...defaultState(), onboarded: true, league: newLeague(1, week) };
    const nem = nemesisOf(s0)!;
    const r0 = s0.league.rivals.find((r) => r.id !== nem.id)!;
    const base = rosterName(r0);
    s0.league.peels = { [r0.id]: 2 };
    for (let i = 0; i < 7; i++) s0.days[dayKey(addDays(new Date(`${week}T12:00`), i))] = { ...emptyDay(), xpEarned: 30 };
    const fin = finishOf(s0);
    assert.equal(fin.table?.length, 9);
    const row = fin.table!.find((r) => r.base === base)!;
    assert.equal(row.peels, 2);
    assert.equal(fin.nemesis, rosterName(nem));
    assert.equal(fin.coop, undefined);
    assert.equal(finishOf({ ...s0, coop: { week, partner: { name: r0.name, emoji: r0.emoji }, goal: 'water', base: 5 } }).coop, base);
    const st = settle(s0);
    const history = [{ week, tier: 1, rank: st.rank, xp: st.xp, ...fin }];
    const next = { ...s0, league: withRivalNames(newLeague(1, '2027-01-11', history), { [base]: 'Bob' }), rivalNames: { [base]: 'Bob' } };
    const file = rivalFile(next, base, new Date(2027, 0, 13, 12));
    assert.equal(file.name, 'Bob', 'a renamed rival keeps their file');
    assert.ok(file.renamed);
    assert.deepEqual(file.weeks.map((w) => [w.week, w.theirs, w.above, w.nemesis, w.peels]), [[week, row.xp, st.xp >= row.xp, false, 2]]);
    assert.equal(file.above + file.below, 1);
    assert.equal(file.peels, 2);
    assert.equal(rivalFile(next, rosterName(nem), new Date(2027, 0, 13, 12)).weeks[0].nemesis, true);
    const older = { ...next, nemesisLog: { '2026-12-28': { name: base, emoji: r0.emoji, beaten: true } } };
    const of = rivalFile(older, base, new Date(2027, 0, 13, 12));
    assert.deepEqual(of.weeks.find((w) => w.week === '2026-12-28'), { week: '2026-12-28', mine: null, theirs: null, above: null, nemesis: true, beaten: true, peels: 0, coop: false }, 'older weeks show what is known');
    assert.equal(of.nemesisBeaten, 1);
    assert.ok(knownRivals(next).some((r) => r.base === base && r.weeks === 1));
  }

  // 29: the mood journal (mood-journal.ts): words only, never a grade
  {
    const s = defaultState();
    s.days['2027-01-05'] = { ...emptyDay(), moods: [{ id: 'a', level: 2, emotions: ['Tired'], note: 'long day', at: 1 }, { id: 'b', level: 4, emotions: [], at: 2 }] };
    s.days['2027-01-09'] = { ...emptyDay(), moods: [{ id: 'c', level: 4, emotions: ['Calm', 'Tired'], at: 3 }] };
    s.days['2027-02-01'] = { ...emptyDay(), moods: [{ id: 'd', level: 3, emotions: [], note: 'February', at: 4 }] };
    assert.deepEqual(journalMonth(s, 2027, 0).map((d) => [d.key, d.entries.map((m) => m.id)]), [['2027-01-09', ['c']], ['2027-01-05', ['a']]]);
    assert.deepEqual(journalMonth(s, 2027, 0, 'Calm').map((d) => d.key), ['2027-01-09']);
    assert.deepEqual(journalEmotions(s, 2027, 0), [{ emotion: 'Tired', n: 2 }, { emotion: 'Calm', n: 1 }]);
    assert.deepEqual(journalMonth(s, 2027, 1).map((d) => d.key), ['2027-02-01']);
  }

  // 30: phone week (phone-week.ts)
  {
    const now = new Date(2027, 0, 13, 20);
    const s = defaultState();
    const day = (total: number, doom: number, unlocks?: number) => ({
      ...emptyDay(),
      screen: { totalMin: total, doomMin: doom, gamesMin: 0, top: [{ label: 'TikTok', min: doom, game: false, doom: true }, { label: 'Maps', min: total - doom, game: false, doom: false }], unlocks },
    });
    assert.equal(phoneWeek(s, now).lineKey, null);
    s.days['2027-01-11'] = day(200, 90, 50);
    s.days['2027-01-12'] = day(180, 80, 40);
    s.days['2027-01-13'] = day(100, 60);
    const w = phoneWeek(s, now);
    assert.deepEqual([w.days.length, w.days[6].key, w.days[0].screen], [7, '2027-01-13', null]);
    assert.deepEqual(w.top.map((a) => [a.label, a.min]), [['Maps', 250], ['TikTok', 230]]);
    assert.deepEqual([w.avgMin, w.avgUnlocks, w.doom?.perDay, w.lineKey], [160, 45, 77, 'phoneWeekDoom']);
    const quiet = { ...s, days: { '2027-01-11': day(200, 20), '2027-01-12': day(220, 20), '2027-01-13': day(240, 20) } };
    assert.equal(phoneWeek(quiet, now).lineKey, 'phoneWeekHeavy', 'over the daily limit on average');
    const calm = { ...s, days: { '2027-01-11': day(60, 10), '2027-01-12': day(70, 10), '2027-01-13': day(80, 10) } };
    assert.equal(phoneWeek(calm, now).lineKey, 'phoneWeekChill');
  }
}
step8DaysTests();

// step 8 game: calls, obstacle scouting, mini versions, chapters, the sealed card, boss picks, history, the contract ledger.
// In a function of its own: the module body is at TypeScript's control-flow size limit.
function step8GameTests() {
  const at = (k: string, h = 12) => new Date(`${k}T${String(h).padStart(2, '0')}:00`);
  const used = (): DayLog => ({ ...emptyDay(), water: [{ id: 'w', ml: 250, at: 0 }] });
  const low = (): DayLog => ({ ...used(), moods: [{ id: 'm', level: 2, emotions: [], at: 0 }] });
  const trained = (): DayLog => ({ ...emptyDay(), activities: [{ id: 'a', kind: 'cardio', minutes: 30, at: 0 }] });
  const base = () => {
    const s = defaultState();
    s.onboarded = true;
    return s;
  };

  // ---- 13. call your shot: one morning call, settled at rollover, void on uncounted days, Brier-scored monthly for coins ----
  {
    const s = base();
    const mon = at('2027-03-01', 9); // a Monday: Push day
    assert.equal(shotQuestion(s, mon), 'gym');
    assert.equal(shotQuestion(s, at('2027-03-03', 9)), 'quests'); // Wednesday: a rest day
    assert.ok(shotOpen(s, mon));
    assert.ok(!shotOpen(s, at('2027-03-01', 12)), 'mornings only');
    assert.ok(!shotOpen({ ...s, onboarded: false }, mon));
    assert.ok(!shotOpen(s, at('2027-03-03', 9)), "a quest call needs the day's quests");
    assert.ok(shotOpen({ ...s, days: { '2027-03-03': { ...emptyDay(), quests: ['meals', 'mood', 'water_goal'] } } }, at('2027-03-03', 9)));
    assert.ok(!shotOpen({ ...s, days: { '2027-03-01': low() } }, mon), 'not on a rough day');
    assert.ok(!shotOpen({ ...s, pauses: [{ from: '2027-03-01', to: '2027-03-01', kind: 'sick' }] }, mon), 'not paused');
    assert.ok(!shotOpen({ ...s, days: { '2027-03-01': { ...emptyDay(), energy: 2 } } }, mon), 'not on a reduced day');
    assert.ok(!shotOpen({ ...s, days: { '2027-03-01': trained() } }, mon), 'not once the answer is known');
    const called = withShot(s, 'lock', mon);
    const shot = called.days['2027-03-01'].shot!;
    assert.deepEqual([shot.q, shot.call, shot.p], ['gym', 'lock', 0.95]);
    assert.equal(withShot(called, 'no', mon), called, 'one call a day');
    assert.deepEqual(CALLS.map((c) => c.p), [0.1, 0.5, 0.75, 0.95]);
    // outcomes: a hit, a miss, void when the day isn't counted (nothing logged, a rough day) or the workout moved
    const day = (d: DayLog) => ({ ...s, days: { '2027-03-01': { ...d, shot } } });
    assert.equal(outcomeOf(day(trained()), '2027-03-01', shot), 'hit');
    assert.equal(outcomeOf(day(used()), '2027-03-01', shot), 'miss');
    assert.equal(outcomeOf(day(emptyDay()), '2027-03-01', shot), 'void', 'nothing logged');
    assert.equal(outcomeOf(day({ ...trained(), moods: [{ id: 'm', level: 1, emotions: [], at: 0 }] }), '2027-03-01', shot), 'void', 'a low-mood day is rest');
    assert.equal(outcomeOf(day({ ...used(), period: { flow: 'medium', symptoms: [] } }), '2027-03-01', shot), 'void', 'a period day is rest');
    const moved = { ...day(used()), workoutMoves: [{ from: '2027-03-01', to: '2027-03-03', name: 'Push', at: 0 }] };
    assert.equal(outcomeOf(moved, '2027-03-01', shot), 'void', 'moving a workout is never a missed call');
    const quests = { ...shot, q: 'quests' as const };
    assert.equal(outcomeOf({ ...s, days: { '2027-03-03': { ...used(), questsAllDone: true, shot: quests } } }, '2027-03-03', quests), 'hit');
    assert.equal(outcomeOf({ ...s, days: { '2027-03-03': { ...used(), questReduced: 'sip', shot: quests } } }, '2027-03-03', quests), 'void');
    // settled once at rollover, yesterday's gets a word unless void
    const r = settleShots(day(trained()), '2027-03-02');
    assert.equal(r.state.days['2027-03-01'].shot?.result, 'hit');
    assert.equal(r.settled.length, 1);
    assert.equal(yesterdayShot(r.settled, '2027-03-02')?.result, 'hit');
    assert.equal(settleShots(r.state, '2027-03-02').state, r.state, 'settled once');
    assert.equal(settleShots(day(trained()), '2027-03-01').settled.length, 0, "today's call waits for midnight");
    assert.equal(yesterdayShot(settleShots(day(emptyDay()), '2027-03-02').settled, '2027-03-02'), null);

    // a month of calls: Brier score, the title and the coins (an affine Brier payout: a proper scoring rule)
    const month = (calls: [ShotCall, boolean][]) => {
      const m = base();
      calls.forEach(([call, hit], i) => {
        const k = dayKey(addDays(at('2027-02-01'), i));
        m.days[k] = { ...used(), shot: { q: 'gym', call, p: CALLS.find((c) => c.id === call)!.p, at: 0, result: hit ? 'hit' : 'miss' } };
      });
      m.days['2027-02-27'] = { ...used(), shot: { q: 'gym', call: 'lock', p: 0.95, at: 0, result: 'void' } }; // never scored
      return m;
    };
    const rep = <T,>(n: number, x: T) => Array.from({ length: n }, () => x);
    assert.equal(calibration(month([...rep(5, ['lock', true] as [ShotCall, boolean])]), '2027-02').title, 'Dead-Eye Oracle');
    const over = calibration(month([...rep(3, ['lock', true] as [ShotCall, boolean]), ...rep(2, ['lock', false] as [ShotCall, boolean])]), '2027-02');
    assert.equal(over.n, 5, 'void calls are left out');
    assert.equal(over.title, 'Overconfident Oracle');
    assert.ok(Math.abs((over.brier ?? 0) - (3 * 0.05 ** 2 + 2 * 0.95 ** 2) / 5) < 1e-9);
    assert.equal(calibration(month(rep(5, ['no', true] as [ShotCall, boolean])), '2027-02').title, 'Sandbagger');
    assert.equal(calibration(month([...rep(6, ['probably', true] as [ShotCall, boolean]), ...rep(2, ['probably', false] as [ShotCall, boolean])]), '2027-02').title, 'Calibrated');
    assert.equal(calibration(month([...rep(3, ['flip', true] as [ShotCall, boolean]), ...rep(3, ['flip', false] as [ShotCall, boolean])]), '2027-02').title, 'Coin Flipper');
    assert.equal(calibration(month(rep(MIN_CALLS - 1, ['lock', true] as [ShotCall, boolean])), '2027-02').title, null, 'too few calls for a title');
    assert.equal(titleFor(10, 0, 0.05), 'Dead-Eye Oracle');
    const five = calibration(month(rep(5, ['lock', true] as [ShotCall, boolean])), '2027-02');
    assert.equal(five.coins, Math.round(5 * SHOT_COINS * (1 - 0.05 ** 2) + SHOT_COINS * (1 - VOID_BRIER))); // the void call pays like a coin flip
    // sandbagging never pays: for any belief, the call closest to it has the best expected payout
    for (const belief of CALLS) {
      const expected = (p: number) => SHOT_COINS * (1 - (belief.p * (1 - p) ** 2 + (1 - belief.p) * p ** 2));
      const best = [...CALLS].sort((a, b) => expected(b.p) - expected(a.p))[0];
      assert.equal(best.id, belief.id, `believing ${belief.p}`);
    }
    assert.ok(brierOf({ q: 'gym', call: 'flip', p: 0.5, at: 0, result: 'miss' }) === 0.25);
    // paid once at month start, coins only (never XP)
    const feb = month(rep(5, ['lock', true] as [ShotCall, boolean]));
    const paid = settleShotMonth(feb, at('2027-03-01', 8));
    assert.equal(paid.award?.coins, five.coins);
    assert.deepEqual([paid.state.coins, paid.state.coinsEarned, paid.state.xp, paid.state.shotsPaid], [five.coins, five.coins, 0, '2027-02']);
    assert.equal(settleShotMonth(paid.state, at('2027-03-20')).state, paid.state, 'once a month');
    const empty = settleShotMonth(base(), at('2027-03-01'));
    assert.deepEqual([empty.award, empty.state.coins, empty.state.shotsPaid], [null, 0, '2027-02']);
    // history for the savage line: "You said lock. History says 60 %."
    const hist = month([...rep(3, ['lock', true] as [ShotCall, boolean]), ...rep(2, ['lock', false] as [ShotCall, boolean]), ['no', false]]);
    assert.deepEqual(callHistory(hist, 'lock', '2027-03-01'), { n: 5, pct: 60 });
    assert.deepEqual(callHistory(hist, 'flip', '2027-03-01'), { n: 0, pct: null });
    assert.equal(scoredShots(hist, '2027-02').length, 6);
  }

  // ---- 14. obstacle scouting (WOOP) at signing: situations the app can see, a ready if-then plan, the tally ----
  {
    const s = base();
    assert.deepEqual(planFor(s, 'train', 'rain'), { cue: { kind: 'rain' }, then: 'do a 20-minute home circuit instead' });
    assert.deepEqual(obstacleCue(s, 'late_meetings'), { kind: 'calendar', match: '' });
    assert.deepEqual(obstacleCue(s, 'gaming'), { kind: 'event', event: 'gaming' });
    assert.deepEqual(obstacleCue(s, 'doomscroll'), { kind: 'time', hour: 21, minute: 0 }); // two hours before bedtime
    assert.ok(planFor(s, 'water', 'doomscroll').then.startsWith('put the phone on the charger and '));
    // ranked by what the last 4 weeks showed: the gaming timer on 5 days, the phone on 2, rain on 1
    const now = at('2027-03-01', 9);
    const r = base();
    r.settings.weather = { name: 'Stockholm', lat: 59.3, lon: 18.1 };
    for (let i = 1; i <= 10; i++) {
      const k = dayKey(addDays(now, -i));
      const t = at(k, 18).getTime();
      r.days[k] = {
        ...used(),
        games: i <= 5 ? [{ start: t, end: t + 3 * 60 * MIN }] : [],
        screen: i === 6 || i === 7 ? { totalMin: 300, doomMin: 200, gamesMin: 0, top: [] } : undefined,
        weather: i === 8 ? { max: 8, min: 2, rainMm: 6, sunMin: 0, code: 61 } : undefined,
      };
    }
    assert.deepEqual(obstacleOptions(r, 'train', now).map((o) => o.id), ['gaming', 'doomscroll', 'rain']);
    assert.ok(!obstacleOptions(r, 'water', now).some((o) => o.id === 'rain'), 'rain only gets in the way of training and steps');
    assert.ok(!obstacleOptions(r, 'gaming', now).some((o) => o.id === 'gaming'));
    assert.ok(!obstacleOptions(r, 'train', now).some((o) => o.calendar), 'no calendar, no calendar obstacles');
    assert.ok(!obstacleOptions(base(), 'train', now).some((o) => o.id === 'doomscroll' || o.id === 'rain'), 'only what the app can see');
    assert.ok(dataObstacleOn(r, 'gaming', dayKey(addDays(now, -1))) && !dataObstacleOn(r, 'gaming', dayKey(addDays(now, -6))));
    // the calendar: a meeting ending late, or 4+ hours of meetings
    const ev = (k: string, from: number, to: number, title = 'Meeting'): CalEvent => ({ key: `${k}${from}`, title, start: at(k, from).getTime(), end: at(k, to).getTime(), allDay: false, location: null, calendarId: 'c' });
    assert.ok(calendarObstacleOn('late_meetings', [ev('2027-03-02', 16, 18)], at('2027-03-02')));
    assert.ok(!calendarObstacleOn('late_meetings', [ev('2027-03-02', 9, 16)], at('2027-03-02')));
    assert.ok(calendarObstacleOn('long_day', [ev('2027-03-02', 9, 11), ev('2027-03-02', 13, 15)], at('2027-03-02')));
    assert.ok(!calendarObstacleOn('long_day', [ev('2027-03-02', 9, 11)], at('2027-03-02')));
    const cal = obstacleOptions(r, 'water', now, [ev('2027-03-02', 16, 18), ev('2027-03-03', 16, 18)], true);
    assert.ok(Math.abs((cal.find((o) => o.id === 'late_meetings')?.rate ?? 0) - 2 / 7) < 1e-9);
    // the WOOP as signed: outcome tidied, the ready plan or the owner's own "then"
    const w = woopOf(s, 'water', '  Clear skin by Sunday  ', 'gaming');
    assert.deepEqual(w, { outcome: 'Clear skin by Sunday', obstacle: 'gaming', plan: { cue: { kind: 'event', event: 'gaming' }, then: 'drink a full glass of water' } });
    assert.equal(woopOf(s, 'water', '', 'gaming', 'two glasses').plan.then, 'two glasses');
    // the tally: rough days left out; "fired" when the goal still moved on an obstacle day
    const t = base();
    const c: Contract = { week: '2027-03-01', from: '2027-03-01', signedAt: 0, goal: 'water', target: 5, stake: 100, status: 'open', woop: w };
    const over = (k: string) => [{ start: at(k, 18).getTime(), end: at(k, 18).getTime() + 3 * 60 * MIN }];
    t.days['2027-03-01'] = { ...used(), games: over('2027-03-01'), waterGoalHit: true };
    t.days['2027-03-02'] = { ...used(), games: over('2027-03-02') };
    t.days['2027-03-03'] = { ...low(), games: over('2027-03-03'), waterGoalHit: true }; // a rough day: out of the tally
    t.days['2027-03-04'] = { ...used(), waterGoalHit: true };
    t.contract = c;
    assert.deepEqual(woopTally(t, c, at('2027-03-07')), { showed: 2, fired: 1 });
    assert.deepEqual(woopTally(t, { ...c, woop: undefined }, at('2027-03-07')), { showed: 0, fired: 0 });
    // a calendar obstacle is noted once the calendar shows it today
    const lc: Contract = { ...c, woop: woopOf(s, 'water', '', 'late_meetings') };
    const seen = withSeen({ ...t, contract: lc }, [ev('2027-03-02', 16, 18)], at('2027-03-02', 9));
    assert.deepEqual(seen.contract?.woop?.seen, ['2027-03-02']);
    assert.equal(withSeen(seen, [ev('2027-03-02', 16, 18)], at('2027-03-02', 10)), seen, 'once');
    assert.equal(withSeen({ ...t, contract: lc }, [ev('2027-03-02', 9, 10)], at('2027-03-02', 9)).contract, lc);
    assert.equal(withSeen(t, [ev('2027-03-02', 16, 18)], at('2027-03-02', 9)), t, 'a data obstacle needs no calendar');
    assert.equal(woopTally(seen, seen.contract!, at('2027-03-07')).showed, 1);
    // reminders on the plan's clock cue, under a planned prefix; none once won, none on a paused day
    const rem = woopReminders({ ...t, contract: lc }, 1, at('2027-03-01', 9), [ev('2027-03-02', 16, 18)], null);
    assert.equal(rem.length, 1);
    assert.equal(rem[0].id, 'ifthen-woop-2027-03-02-0');
    assert.equal(rem[0].at, at('2027-03-02', 18).getTime());
    assert.ok(isPlanned(rem[0].id));
    assert.deepEqual(woopReminders({ ...t, contract: { ...lc, status: 'won' } }, 1, at('2027-03-01', 9), [ev('2027-03-02', 16, 18)], null), []);
    assert.deepEqual(woopReminders({ ...t, contract: lc, pauses: [{ from: '2027-03-02', to: '2027-03-02', kind: 'away' }] }, 1, at('2027-03-01', 9), [ev('2027-03-02', 16, 18)], null), []);
    const long = { ...t, contract: { ...c, woop: woopOf(s, 'water', '', 'long_day') } };
    const ld = woopReminders(long, 0, at('2027-03-02', 9), [ev('2027-03-02', 9, 11), ev('2027-03-02', 12, 14)], null);
    assert.deepEqual(ld.map((x) => x.at), [at('2027-03-02', 17).getTime()]);
    assert.deepEqual(woopReminders(long, 0, at('2027-03-02', 9), [ev('2027-03-02', 9, 10)], null), [], 'only on a day the calendar shows it');
    // the in-app cue: the gaming timer stopped on a contract day prompts once
    const playing = { ...t, activeGame: { start: at('2027-03-05', 18).getTime() } };
    const stopped = { ...t, activeGame: null };
    const cue = woopCue(playing, stopped, at('2027-03-05', 20));
    assert.equal(cue.prompt?.target, 'woop');
    assert.equal(cue.prompt?.plan.then, 'drink a full glass of water');
    assert.ok(cue.state.days['2027-03-05'].cues?.woop != null);
    assert.equal(woopCue(playing, cue.state, at('2027-03-05', 21)).prompt, null, 'once a day');
    assert.equal(woopCue(playing, { ...stopped, contract: { ...c, status: 'won' } }, at('2027-03-05', 20)).prompt, null);
  }

  // ---- 15. mini versions and the 10-minute salvage ----
  {
    const s = base();
    s.habits = [{ id: 'h', name: 'Run', emoji: '🏃', days: [], remindHour: null, createdAt: 0, mini: 'shoes on, 2 minutes' }];
    const k = '2027-03-02';
    assert.ok(miniOffered(s, s.habits[0], k));
    const m = withMini(s, 'h', k);
    assert.deepEqual([m.days[k].habits, m.days[k].habitsMini], [['h'], ['h']]);
    assert.ok(didMini(m, 'h', k));
    assert.ok(!miniOffered(m, m.habits[0], k), 'once a day');
    assert.equal(withMini(m, 'h', k), m);
    assert.equal(questInfo(m, 'habits', at(k))?.progress, 1, 'the mini counts as showing up');
    const back = withoutMini(m, 'h', k);
    assert.deepEqual([back.days[k].habits, back.days[k].habitsMini], [[], undefined]);
    assert.ok(!miniOffered({ ...s, days: { [k]: low() } }, s.habits[0], k), 'never on a rough day');
    assert.ok(!miniOffered({ ...s, pauses: [{ from: k, to: k, kind: 'sick' }] }, s.habits[0], k));
    assert.ok(!miniOffered(s, { ...s.habits[0], mini: ' ' }, k), 'only with a mini version');
    assert.ok(!miniOffered({ ...s, days: { [k]: { ...emptyDay(), habits: ['h'] } } }, s.habits[0], k), 'not once it is done in full');
    // a third of the XP under its own ref: an undo takes back exactly that (Double XP included)
    assert.equal(miniRef('h'), 'hm:h');
    assert.ok(MINI_XP * 3 <= XP.habit + 1 && MINI_XP >= 1);
    const paid = credit(m, k, MINI_XP * 2, 0, miniRef('h'));
    assert.equal(paid.days[k].xpBy?.['hm:h'], 2);
    const undone = unreward(paid, k, miniRef('h'), MINI_XP);
    assert.deepEqual([undone.xp, undone.days[k].xpEarned, undone.days[k].xpBy], [0, 0, undefined]);
    // the salvage: a slipping planned workout, once a day, never on a rough or paused day
    const mon = '2027-03-01';
    assert.ok(salvageOffered(s, at(mon, 20).getTime() + 30 * MIN), 'slipping from two hours after gym time');
    assert.ok(!salvageOffered(s, at(mon, 19).getTime()), 'not before it slips');
    assert.ok(!salvageOffered(s, at('2027-03-03', 21).getTime()), 'not on a rest day');
    assert.ok(!salvageOffered({ ...s, days: { [mon]: trained() } }, at(mon, 21).getTime()));
    assert.ok(!salvageOffered({ ...s, days: { [mon]: { ...emptyDay(), salvage: 'gone' } } }, at(mon, 21).getTime()), 'once a day, even after a delete');
    assert.ok(!salvageOffered({ ...s, days: { [mon]: low() } }, at(mon, 21).getTime()));
    assert.ok(!salvageOffered({ ...s, pauses: [{ from: mon, to: mon, kind: 'sick' }] }, at(mon, 21).getTime()));
  }

  // ---- 18. fresh-start chapters: one offer per landmark, named, sealed; never a "days since" ----
  {
    assert.equal(cleanBirthday('3-14'), '03-14');
    assert.equal(cleanBirthday('02-29'), '02-29');
    assert.equal(cleanBirthday('02-30'), null);
    assert.equal(cleanBirthday('13-01'), null);
    assert.equal(cleanBirthday('soon'), null);
    const s = base();
    s.settings.birthday = '03-14';
    const ids = (k: string) => landmarksOn(s, at(k)).map((l) => l.id);
    assert.deepEqual(ids('2027-03-14'), ['birthday:2027']);
    assert.deepEqual(ids('2027-03-25'), ['payday:2027-03']); // a Thursday
    assert.deepEqual(ids('2027-03-01'), ['season:spring:2027']);
    assert.deepEqual(ids('2027-12-01'), ['season:winter:2027']);
    assert.equal(dayKey(firstAugustWorkday(2027)), '2027-08-02'); // 1 August is a Sunday
    assert.deepEqual(ids('2027-08-02'), ['august:2027']);
    assert.deepEqual(ids('2027-03-10'), []);
    const p = { ...s, pauses: [{ from: '2027-03-07', to: '2027-03-09', kind: 'sick' as const }] };
    assert.deepEqual(landmarksOn(p, at('2027-03-10')).map((l) => l.id), ['back:2027-03-10']);
    assert.deepEqual(landmarksOn({ ...s, settings: { ...s.settings, birthday: '02-29' } }, at('2027-02-28')).map((l) => l.id), ['birthday:2027']);
    // on offer for the landmark day and the two after it; waved off, or taken, it's gone
    assert.equal(landmarkOffer(p, at('2027-03-12'))?.id, 'back:2027-03-10');
    assert.equal(landmarkOffer(p, at('2027-03-13')), null);
    assert.equal(landmarkOffer(p, at('2027-03-08')), null, 'not while paused');
    assert.equal(landmarkOffer({ ...p, onboarded: false }, at('2027-03-11')), null);
    assert.equal(landmarkOffer({ ...p, dismissed: ['chapter:back:2027-03-10'] }, at('2027-03-11')), null);
    const offer = landmarkOffer(p, at('2027-03-11'))!;
    const one = withChapter(p, offer, '  The   Comeback ', { text: 'evening walks' }, at('2027-03-11'));
    assert.deepEqual(one.chapters?.map((c) => [c.n, c.title, c.from, c.landmark, c.restart?.text]), [[1, 'The Comeback', '2027-03-11', 'back:2027-03-10', 'evening walks']]);
    assert.equal(landmarkOffer(one, at('2027-03-12')), null, 'one chapter per landmark');
    assert.equal(withChapter(one, offer, 'Again', null, at('2027-03-12')), one);
    assert.equal(nextChapter(one), 2);
    const two = withChapter(one, landmarkOffer(one, at('2027-03-14'))!, '', null, at('2027-03-14'));
    assert.deepEqual(two.chapters?.map((c) => [c.n, c.title, c.restart]), [
      [1, 'The Comeback', { text: 'evening walks' }],
      [2, 'Chapter 2', undefined],
    ]);
    assert.equal(chapterOn(two, '2027-03-12')?.n, 1);
    assert.equal(chapterOn(two, '2027-03-20')?.n, 2);
    assert.equal(chapterOn(two, '2027-03-01'), null);
    assert.equal(chaptersBetween(two, '2027-03-01', '2027-03-31').length, 2);
    // the diary groups its pages by chapter; Wrapped shows the month's chapter by name
    const d = { ...two, diary: [{ n: 1, at: 0, day: '2027-03-05', text: 'a' }, { n: 2, at: 0, day: '2027-03-12', text: 'b' }, { n: 3, at: 0, day: '2027-03-13', text: 'c' }] };
    assert.deepEqual(diaryChapters(d).map((g) => [g.chapter?.n ?? 0, g.pages.map((x) => x.n)]), [[1, [3, 2]], [0, [1]]]);
    const slide = monthWrapped(two, 2027, 2, at('2027-03-31')).slides.find((x) => x.id === 'chapter');
    assert.equal(slide?.big, 'Chapter 2');
    assert.ok(slide && !/days? since|in a row/i.test(`${slide.sub} ${slide.quip}`));
    assert.ok(!monthWrapped(two, 2027, 1, at('2027-03-31')).slides.some((x) => x.id === 'chapter'));
    assert.equal(yearWrapped(two, 2027, at('2027-12-31')).slides.find((x) => x.id === 'chapters')?.sub, '1. The Comeback · 2. Chapter 2');
  }

  // ---- 19. the sealed quest card: one draft card face down, ×0.5/×1/×2 on average exactly ×1, seeded by the day ----
  {
    assert.ok(Math.abs(SEALED_ODDS.reduce((a, o) => a + o.p * o.mult, 0) - 1) < 1e-9, 'expected value ×1');
    assert.ok(Math.abs(SEALED_ODDS.reduce((a, o) => a + o.p, 0) - 1) < 1e-9);
    assert.deepEqual([0, 0.39, 0.4, 0.79, 0.8, 0.999].map(multFor), [0.5, 0.5, 1, 1, 2, 2]);
    const s = base();
    const counts: Record<number, number> = { 0.5: 0, 1: 0, 2: 0 };
    for (let i = 0; i < 3000; i++) {
      const k = dayKey(addDays(at('2027-01-01'), i));
      const x = sealedOn({ ...s, days: { [k]: { ...emptyDay(), questDraft: { candidates: ['a', 'b', 'c', 'd', 'e'], locked: false } } } }, k)!;
      counts[x.mult]++;
    }
    assert.ok(Math.abs(counts[0.5] / 3000 - 0.4) < 0.04 && Math.abs(counts[1] / 3000 - 0.4) < 0.04 && Math.abs(counts[2] / 3000 - 0.2) < 0.04, JSON.stringify(counts));
    const k = '2027-03-02';
    const draft = draftFor(s, at(k, 9));
    const q = { ...s, days: { [k]: { ...emptyDay(), quests: draft.defaults, questDraft: { candidates: draft.candidates, locked: false } } } };
    const sealed = sealedOn(q, k)!;
    assert.ok(draft.candidates.includes(sealed.id));
    assert.deepEqual(sealedOn(q, k), sealed, 'the same all day');
    assert.equal(sealedOn(s, k), null, 'no draft, no sealed card');
    assert.equal(sealedOn({ ...q, days: { [k]: { ...q.days[k], questReduced: 'sip' } } }, k), null, 'not on a reduced day');
    const xp = questInfo(q, sealed.id, at(k))!.xp;
    assert.equal(sealedXp(q, k, sealed.id, xp), Math.max(1, Math.round(xp * sealed.mult)));
    const other = draft.candidates.find((id) => id !== sealed.id)!;
    assert.equal(sealedXp(q, k, other, 10), 10);
    // a reroll or a re-pick doesn't roll it again
    const swapped = { ...q, days: { [k]: { ...q.days[k], quests: [...draft.candidates].reverse().slice(0, 3), questRerolled: true } } };
    assert.deepEqual(sealedOn(swapped, k), sealed);
    // face down until done
    assert.equal(revealedMult(q, sealed.id, k), null);
    assert.equal(revealedMult({ ...q, days: { [k]: { ...q.days[k], questsDone: [sealed.id] } } }, sealed.id, k), sealed.mult);
    // paid through the ledger: an undo takes back what it paid, not the plain XP
    const pay = sealedXp(q, k, sealed.id, xp);
    const credited = credit(q, k, pay, 0, `q:${sealed.id}`);
    const reopened = unreward(credited, k, `q:${sealed.id}`, xp);
    assert.deepEqual([reopened.xp, reopened.days[k].xpEarned], [0, 0]);
  }

  // ---- 21. pick next week's boss: Sunday (and Monday until noon), weakness as focus, ranks stay right ----
  {
    const s = base();
    const sun = at('2027-03-07', 10);
    assert.equal(pickWeek(s, sun), '2027-03-08');
    assert.equal(pickWeek(s, at('2027-03-06')), null, 'Saturday: not yet');
    assert.equal(pickWeek(s, at('2027-03-09')), null, 'Tuesday: too late');
    assert.equal(pickWeek(s, at('2027-03-08', 9)), '2027-03-08', 'Monday morning');
    assert.equal(pickWeek({ ...s, days: { '2027-03-08': { ...used(), xpEarned: 5 } } }, at('2027-03-08', 9)), '2027-03-08', 'still open after the rollover paid medals onto Monday');
    assert.equal(pickWeek(s, at('2027-03-08', 12)), null, 'closed at noon');
    assert.equal(pickWeek({ ...s, kingWeeks: ['2027-03-08'] }, sun), null, 'never for a Couch King week');
    const options = bossOptions(s, '2027-03-08');
    assert.equal(options.length, 3);
    assert.equal(new Set(options).size, 3);
    assert.equal(options[0], rotationBossOf(at('2027-03-08')).id, 'the rota first');
    assert.deepEqual(bossOptions(s, '2027-03-08'), options, 'the same all day');
    const lastWeek: string = bossFor(s, at('2027-03-01')).id;
    assert.ok(!(options as string[]).includes(lastWeek) || options[0] === lastWeek, "not last week's boss again");
    const picked = withBossPick(s, options[1], sun);
    assert.equal(picked.bossPicks?.['2027-03-08'], options[1]);
    assert.equal(pickedFor(picked, '2027-03-08'), options[1]);
    assert.equal(withBossPick(s, 'couch_king', sun), s, 'only bosses on offer');
    assert.equal(withBossPick(s, options[1], at('2027-03-10')), s, 'only while a pick is open');
    const b = bossFor(picked, at('2027-03-10'), at('2027-03-10'));
    assert.equal(b.id, options[1]);
    assert.equal(b.weakness, WEAKNESS[options[1]].label); // the pick's weakness is the week's
    assert.equal(b.maxHp, bossFor(s, at('2027-03-10'), at('2027-03-10')).maxHp, 'HP sizing unchanged');
    assert.equal(weekBossOf(picked, at('2027-03-15')).id, rotationBossOf(at('2027-03-15')).id, 'a pick is for one week');
    // a Couch King week ignores a pick; Halloween still dresses up the picked boss
    assert.ok(bossFor({ ...picked, kingWeeks: ['2027-03-08'] }, at('2027-03-10')).final);
    const hw = withBossPick(s, bossOptions(s, '2027-10-25')[2], at('2027-10-24'));
    const hb = bossFor(hw, at('2027-10-27'));
    assert.equal(hb.id, bossOptions(s, '2027-10-25')[2]);
    assert.notEqual(hb.name, BOSSES.find((x) => x.id === hb.id)?.name, 'in costume');
    // ranks and the bestiary count the weeks a boss really was the boss
    const r = base();
    r.days['2027-01-04'] = { ...used(), xpEarned: 50 };
    const first = rotationBossOf(at('2027-01-04')).id;
    const third = rotationBossOf(at('2027-01-18')).id;
    assert.equal(bossRank(r, at('2027-01-18')), 1);
    const again = { ...r, bossPicks: { '2027-01-18': first } };
    assert.equal(bossFor(again, at('2027-01-19')).id, first);
    assert.equal(bossRank(again, at('2027-01-19')), 2, 'its second week');
    assert.ok(bossFor(again, at('2027-01-19')).name.endsWith(' II'));
    const rows = bestiary(again, at('2027-01-20'));
    assert.equal(rows.find((x) => x.id === first)?.fights, 2);
    assert.equal(rows.find((x) => x.id === third)?.fights, 0);
    assert.equal(bossRank(r, at('2027-03-01')), 2, 'no picks: every 8 weeks, as before');
    assert.equal(bossRank({ ...r, bossPicks: {} }, at('2027-03-01')), 2);
  }

  // ---- 25. tracker and habit history: 8 weeks, totals per week, rough days as rest, never a run ----
  {
    const s = base();
    s.habits = [{ id: 'h', name: 'Read', emoji: '📖', days: [], remindHour: null, createdAt: at('2027-02-22', 8).getTime() }];
    s.days['2027-02-22'] = { ...emptyDay(), habits: ['h'] };
    s.days['2027-02-24'] = low();
    s.days['2027-03-01'] = { ...emptyDay(), habits: ['h'] };
    s.days['2027-03-02'] = { ...emptyDay(), habits: ['h'], habitsMini: ['h'] };
    const weeks = habitHistory(s, s.habits[0], at('2027-03-03'));
    assert.equal(weeks.length, 8);
    assert.equal(weeks[7].week, '2027-03-01');
    assert.equal(weeks[0].week, '2027-01-11');
    assert.equal(weeks[0].summary, '–', 'before it existed');
    assert.deepEqual(weeks[7].cells.map((c) => c.kind), ['done', 'mini', 'open', 'none', 'none', 'none', 'none']);
    assert.equal(weeks[7].summary, 'Done on 2 of 3 · 1 mini');
    assert.deepEqual(weeks[6].cells.map((c) => c.kind), ['done', 'miss', 'rest', 'miss', 'miss', 'miss', 'miss']);
    assert.equal(weeks[6].summary, 'Done on 1 of 6 · 1 rest', 'a rough day is rest, never a miss');
    for (const w of weeks) assert.ok(!/in a row|streak|since/i.test(w.summary), w.summary);
    const range = { ...s.habits[0], perWeek: { min: 2, max: 4 } };
    assert.equal(habitHistory({ ...s, habits: [range] }, range, at('2027-03-03'))[7].summary, '2× · goal 2–4 · 1 mini');
    // trackers: yes/no counts, averages, a rough day's value drawn as rest
    const check: Tracker = { id: 't', name: 'Meditation', emoji: '🧘', kind: 'check', createdAt: 0 };
    const t = base();
    t.trackers = [check];
    t.days['2027-03-01'] = { ...emptyDay(), tracks: { t: 1 } };
    t.days['2027-03-02'] = { ...emptyDay(), tracks: { t: 0 } };
    t.days['2027-03-03'] = { ...low(), tracks: { t: 1 } };
    t.days['2027-03-04'] = { ...low(), tracks: { t: 0 } };
    const tw = trackerHistory(t, check, at('2027-03-05'))[7];
    assert.deepEqual(tw.cells.map((c) => c.kind), ['yes', 'no', 'rest', 'rest', 'empty', 'none', 'none']);
    assert.equal(tw.summary, 'Yes on 2 of 3');
    const num: Tracker = { id: 'n', name: 'Alcohol', emoji: '🍷', kind: 'number', unit: 'drinks', createdAt: 0 };
    const n = base();
    n.days['2027-03-01'] = { ...emptyDay(), tracks: { n: 1 } };
    n.days['2027-03-02'] = { ...low(), tracks: { n: 2 } };
    assert.equal(trackerHistory(n, num, at('2027-03-05'))[7].summary, 'avg 1.5 drinks · 3 drinks in all');
    const scale: Tracker = { id: 'n', name: 'Stress', emoji: '😣', kind: 'scale', createdAt: 0 };
    assert.equal(trackerHistory(n, scale, at('2027-03-05'))[7].summary, 'avg 1.5 · 2 logged');
    assert.equal(trackerHistory(n, scale, at('2027-03-05'))[6].summary, 'Nothing logged');
  }

  // ---- 28. the contract ledger: settled contracts, totals, net coins; a rough week is rest, never a loss ----
  {
    let s = base();
    const c = (week: string, goal: ContractGoal, difficulty: 'easy' | 'normal' | 'hard', stake: number, target: number): Contract => ({ week, from: week, goal, target, stake, status: 'open', difficulty });
    s = withLogged(s, c('2027-01-04', 'train', 'normal', 100, 3), 'won', 200);
    s = withLogged(s, c('2027-01-11', 'train', 'hard', 100, 5), 'won', 300, { showed: 2, fired: 1 });
    s = withLogged(s, c('2027-01-18', 'water', 'normal', 250, 5), 'lost', 0);
    s = withLogged(s, c('2027-01-25', 'steps', 'easy', 100, 3), 'voided', 100);
    const st = contractStats(s);
    assert.deepEqual([st.n, st.won, st.lost, st.rest, st.net], [4, 2, 1, 1, 100 + 200 - 250]);
    assert.deepEqual(st.favourite, { goal: 'train', n: 2 });
    assert.equal(st.hardest?.week, '2027-01-11');
    assert.equal(netOf(s.contractLog![3]), 0, 'voided nets zero');
    assert.equal(s.contractLog![1].woop, undefined, 'a tally only with a WOOP');
    const wl = withLogged(base(), { ...c('2027-02-01', 'water', 'normal', 100, 5), woop: woopOf(base(), 'water', '', 'gaming') }, 'won', 200, { showed: 2, fired: 1 });
    assert.deepEqual(wl.contractLog![0].woop, { obstacle: 'gaming', showed: 2, fired: 1 });
    // one entry per week and goal; the newest 52 kept
    assert.equal(withLogged(s, c('2027-01-18', 'water', 'normal', 250, 5), 'lost', 0).contractLog!.length, 4);
    let many = base();
    for (let i = 0; i < 60; i++) many = withLogged(many, c(dayKey(addDays(at('2026-01-05'), 7 * i)), 'train', 'normal', 100, 3), 'won', 200);
    assert.equal(many.contractLog!.length, LOG_KEEP);
    assert.equal(contractStats(base()).n, 0);
    assert.equal(contractStats(base()).favourite, null);
  }

  // the new lines: both pools filled, none of the phrases other pools keep for themselves
  for (const k of ['shotCalled', 'shotHistory', 'shotHit', 'shotMiss', 'shotMonth', 'shotMonthFew', 'woopScouted', 'woopRecap', 'woopNoShow', 'habitMini', 'salvageDone', 'chapterSealed', 'chapterFirst', 'bossPicked', 'sealedDouble', 'sealedHalf', 'sealedEven'] as const) {
    const pool = LINES[k];
    assert.ok(pool.mild.length > 0 && pool.savage.length > 0, k);
    for (const t of [...pool.mild, ...pool.savage]) {
      assert.ok(!/\b(bold|excuse|suspicious|houseplant|couch|draft)|look at you|missing person|painfully mid|fil(ed|ing) a\b|who are you|who replaced you/i.test(t), `${k}: ${t}`);
      assert.ok(!/in a row|streak/i.test(t), `${k}: ${t}`);
    }
  }
}
step8GameTests();

// step 8 terrarium: the tank follows the app (tank-life.ts), egg sacs hatch by walking (egg-sacs.ts), and the 3D
// world acts it all out (terrarium-3d.ts) without leaving the tank
function step8TerrariumTests() {
  const DAY = 86_400_000;
  // ---- the real sun over Stockholm, within a few minutes ----
  const near = (a: number, b: number, min = 6) => Math.abs(a - b) <= min * 60_000;
  const june = sunTimes(new Date(2026, 5, 21));
  assert.ok(near(june.sunrise, Date.UTC(2026, 5, 21, 1, 31)) && near(june.sunset, Date.UTC(2026, 5, 21, 20, 8)), 'midsummer: 03:31 to 22:08');
  const dec = sunTimes(new Date(2026, 11, 21));
  assert.ok(near(dec.sunrise, Date.UTC(2026, 11, 21, 7, 43)) && near(dec.sunset, Date.UTC(2026, 11, 21, 13, 48)), 'midwinter: 08:43 to 14:48');
  assert.equal(daylightAt(Date.UTC(2026, 11, 21, 10, 45), dec.sunrise, dec.sunset), 1);
  assert.equal(daylightAt(Date.UTC(2026, 11, 21, 21), dec.sunrise, dec.sunset), 0);
  assert.equal(daylightAt(Date.UTC(2026, 11, 21, 3), dec.sunrise, dec.sunset), 0);
  const dawn = daylightAt(dec.sunrise, dec.sunrise, dec.sunset);
  assert.ok(dawn > 0.3 && dawn < 0.7, `dawn is half light: ${dawn}`);
  const noonL = lighting(1, false);
  const nightL = lighting(0, false);
  const cosyL = lighting(1, true);
  assert.ok(noonL.lamp === 1 && nightL.lamp === 0, 'the heat lamp goes off after dark');
  assert.ok(nightL.glow > noonL.glow && nightL.hemi < noonL.hemi, 'the mushrooms and the crystal light up at night');
  assert.ok(cosyL.hemi < noonL.hemi && cosyL.warm === 1 && cosyL.lamp < 1, 'cosy: warm and dim');

  // ---- the owner's sleep window: bedtime to the real wake time (the watch's), else the usual one ----
  const at = (h: number, m = 0) => new Date(2027, 0, 13, h, m);
  const usual = { sleepHour: 23, wakeHour: 7 };
  assert.deepEqual([at(23, 30), at(3), at(6, 59), at(7, 30), at(12), at(22, 59)].map((t) => asleepAt(t, usual)), [true, true, true, false, false, false]);
  assert.equal(asleepAt(at(6, 30), { ...usual, wakeAt: at(6, 10).getTime() }), false, 'up when the watch says so');
  assert.equal(asleepAt(at(6), { ...usual, wakeAt: at(6, 10).getTime() }), true);
  assert.equal(asleepAt(at(6, 30), { ...usual, wakeAt: at(6, 10).getTime() - DAY }), true, "yesterday's wake time doesn't count");
  assert.deepEqual([at(0, 30), at(2), at(8, 5), at(23)].map((t) => asleepAt(t, { sleepHour: 1, wakeHour: 8 })), [false, true, false, false], 'a bedtime after midnight');

  // ---- what it's up to ----
  const none = { focus: false, game: false, asleep: false, storm: false, kind: false };
  assert.equal(tankMode(none), 'wander');
  assert.equal(tankMode({ ...none, kind: true }), 'cosy');
  assert.equal(tankMode({ ...none, kind: true, storm: true }), 'storm');
  assert.equal(tankMode({ ...none, asleep: true, storm: true, kind: true }), 'sleep');
  assert.equal(tankMode({ ...none, asleep: true, game: true }), 'game');
  assert.equal(tankMode({ ...none, game: true, focus: true }), 'focus');
  // a kind day looks the same whatever made it kind: a low mood, a sick day or a period day
  const noon = at(12);
  const key = dayKey(noon);
  const base = { ...defaultState(), onboarded: true };
  const lowMood = { ...base, days: { [key]: { ...emptyDay(), moods: [{ id: 'm', level: 1 as const, emotions: [], at: noon.getTime() - 3600_000 }] } } };
  const sick = { ...base, days: { [key]: emptyDay() }, pauses: [{ from: key, to: key, kind: 'sick' as const }] };
  const period = { ...base, days: { [key]: { ...emptyDay(), period: { flow: 'medium' as const, symptoms: [] } } } };
  const lives = [lowMood, sick, period].map((x) => tankLifeOf(x, { now: noon.getTime() }));
  assert.equal(lives[0].mode, 'cosy');
  assert.deepEqual(lives[1], lives[0], 'sick looks like a low mood');
  assert.deepEqual(lives[2], lives[0], 'a period day looks the same too');
  assert.equal(tankLifeOf(base, { now: noon.getTime() }).mode, 'wander');
  assert.equal(tankLifeOf({ ...base, activeFocus: { start: noon.getTime() - 5 * 60_000, minutes: 25 } }, { now: noon.getTime() }).mode, 'focus');
  assert.equal(tankLifeOf({ ...base, activeFocus: { start: noon.getTime() - 50 * 60_000, minutes: 25 } }, { now: noon.getTime() }).mode, 'wander', 'a finished session is over');
  assert.equal(tankLifeOf({ ...base, activeGame: { start: noon.getTime() - 60_000 } }, { now: noon.getTime() }).mode, 'game');
  assert.equal(tankLifeOf(base, { now: at(23, 30).getTime() }).mode, 'sleep');
  const night = tankLifeOf(base, { now: at(23, 30).getTime() });
  assert.ok(night.light.lamp === 0 && night.daylight === 0, 'January at 23:30 is dark');
  const sunny = { date: key, max: 1, min: -3, rainPct: 0, code: 0, rainMm: 0, sunrise: at(8, 40).getTime(), sunset: at(15, 10).getTime(), daylightMin: 390, sunshineMin: 300 };
  assert.equal(tankLifeOf(base, { now: at(12).getTime(), forecast: sunny }).daylight, 1, "the forecast's sunrise and sunset");
  assert.equal(tankLifeOf(base, { now: at(16).getTime(), forecast: sunny }).daylight, 0);

  // ---- molting: premolt near the next new level, one molt per level reached, a little bigger each time ----
  const m = { ...base, xp: 575, maxLevel: 3, moltSeen: 3 }; // level 3 runs from 300 to 600 XP
  assert.deepEqual([moltState(m).premolt, moltState(m).toGo, moltState(m).due], [true, 25, false]);
  assert.equal(moltState({ ...m, xp: 500 }).premolt, false);
  const up = { ...m, xp: 610, maxLevel: 4 };
  assert.ok(moltState(up).due);
  const molted = withMolt(up);
  assert.deepEqual([molted.moltSeen, molted.molts, molted.xp, molted.coins], [4, 1, 610, up.coins], 'looks only: no XP, no coins');
  assert.equal(withMolt(molted), molted, 'once per level');
  assert.equal(moltState({ ...molted, xp: 590 }).premolt, false, 'no premolt for a level it already molted for');
  assert.ok(sizeAfter(1) > sizeAfter(0) && sizeAfter(50) === sizeAfter(MOLT_GROWTH_MAX), 'a little bigger, up to a cap');
  // old saves: no molt for levels reached before the tank could show one; older pieces grow from first sight
  const old = hydrate({ ...defaultState(), xp: 610, maxLevel: 4, lair: ['web', 'rug'] });
  assert.equal(old.moltSeen, 4);
  assert.ok(old.lairAt?.web && old.lairAt?.rug);
  assert.equal(hydrate({ ...defaultState(), xp: 610, moltSeen: 2 }).moltSeen, 2);
  const bought = withPiece({ ...base, lairAt: { web: 5 } }, 'lamp', 99);
  assert.deepEqual(bought.lairAt, { web: 5, lamp: 99 });

  // ---- plants grow with days and steps (lifetime totals) and never shrink; fully grown they bloom ----
  const t0 = new Date(2027, 0, 1, 12).getTime();
  const g0 = { ...base, lair: ['rug', 'plant'], lairAt: { rug: t0, plant: t0 } };
  assert.equal(plantGrowth(g0, 'rug', t0), SPROUT);
  const walked = { ...g0, days: { '2027-01-05': { ...emptyDay(), steps: 100_000 }, '2026-12-30': { ...emptyDay(), steps: 90_000 } } };
  assert.equal(plantGrowth(walked, 'rug', t0 + 14 * DAY), 0.65, 'half the days and half the steps (steps before it went in left out)');
  const full = { ...walked, days: { ...walked.days, '2027-01-20': { ...emptyDay(), steps: 120_000 } } };
  assert.equal(plantGrowth(full, 'rug', t0 + 40 * DAY), 1);
  assert.equal(plantGrowth({ ...walked, days: {}, lairGrowth: { rug: 0.65 } }, 'rug', t0 + 14 * DAY), 0.65, 'what it reached is kept');
  assert.equal(grewSince({ ...walked, lairGrowth: { rug: 0.62 } }, { rug: 0.65 }), null);
  assert.deepEqual(grewSince({ ...walked, lairGrowth: { rug: 0.55 } }, { rug: 0.65 }), { rug: 0.65 });
  assert.deepEqual(grewSince({ ...walked, lairGrowth: { rug: 0.98 } }, { rug: 1 }), { rug: 1 }, 'full size is always worth keeping');
  assert.deepEqual(Object.keys(growthOf(g0, t0)).sort(), ['plant', 'rug']);
  assert.ok(buildPiece('plant', { growth: SPROUT }).children.length < buildPiece('plant', { growth: 1 }).children.length, 'more fronds as it grows');
  assert.equal(buildPiece('plant', { growth: 1, bloom: true }).children.length, buildPiece('plant', { growth: 1 }).children.length + 1, 'blooming');

  // ---- today's web ----
  const wd = { ...base, days: { [key]: { ...emptyDay(), water: [{ id: 'a', ml: 250, at: 1 }, { id: 'b', ml: 250, at: 2 }], questsDone: ['q1', 'q2'], sleepMin: 420, doneTasks: [{ id: 't', at: 3 }] } } };
  assert.deepEqual(webFor(wd, key), { radials: 5, rings: 2, dew: DEW_DROPS, bundles: 1 });
  assert.deepEqual(webFor(base, key), { radials: 3, rings: 0, dew: 0, bundles: 0 }, 'a new day starts with three threads');

  // ---- weather in the glass ----
  const jan = new Date(2027, 0, 13, 12);
  const fc = (o: Partial<DayForecast>): DayForecast => ({ date: key, max: 8, min: 2, rainPct: 10, code: 1, rainMm: 0, sunrise: 0, sunset: 0, daylightMin: 500, sunshineMin: 300, ...o });
  assert.ok(tankWeather(fc({ code: 63, rainPct: 90 }), { now: jan }).rain);
  const snowy = tankWeather(fc({ code: 73, max: -2 }), { now: jan });
  assert.ok(snowy.snowing && snowy.frost >= 0.5 && snowy.snowLid);
  assert.ok(tankWeather(fc({ code: 0, max: 1 }), { now: jan }).frost > 0, 'cold frosts the corners');
  assert.ok(tankWeather(fc({ code: 0, sunshineMin: 400 }), { now: jan }).sun);
  assert.deepEqual(tankWeather(fc({ code: 3, sunshineMin: 0 }), { now: jan }), NO_WEATHER, 'a grey day leaves the glass alone');
  assert.equal(tankWeather(null, { now: jan, firstSnow: winterOf(jan) }).snowLid, true, 'the lid keeps the first snow');
  assert.equal(tankWeather(null, { now: new Date(2027, 5, 1), firstSnow: winterOf(new Date(2027, 5, 1)) }).snowLid, false, 'but not in June');

  // ---- the season's dressing: free, temporary, looks only ----
  assert.equal(dressingFor(new Date(2026, 11, 5))?.item, 'star');
  assert.equal(dressingFor(new Date(2026, 11, 13))?.item, 'candles');
  assert.deepEqual(dressingFor(new Date(2026, 11, 24)), { item: 'sprig', snow: true });
  assert.equal(dressingFor(new Date(2026, 11, 31))?.item, 'sparkles');
  assert.equal(dressingFor(new Date(2027, 2, 25))?.item, 'feathers');
  assert.equal(dressingFor(new Date(2027, 3, 30))?.item, 'embers');
  assert.equal(dressingFor(new Date(2027, 5, 25))?.item, 'pole');
  assert.equal(dressingFor(new Date(2026, 9, 28))?.item, 'pumpkin');
  assert.ok(isAllSaintsDay(new Date(2026, 9, 31)) && dressingFor(new Date(2026, 9, 31)) === null, 'no pumpkin on Alla helgons dag');
  assert.equal(dressingFor(new Date(2027, 1, 10)), null);
  for (const f of FLIES) assert.ok(PET_MOTION[f.id], `${f.id} moves somehow`);
  assert.deepEqual(['cap', 'top_hat', 'crown', 'grad_cap', 'pumpkin', 'tomte_hat', 'silk_bow'].map(hatShape), ['cap', 'top', 'crown', 'grad', 'pumpkin', 'tomte', 'beanie']);

  // ---- replays: what was just logged (today's, one of each kind), never food ----
  const nowT = new Date(2027, 0, 13, 10);
  const tk = dayKey(nowT);
  const t = nowT.getTime();
  const e0 = { ...base, days: { [tk]: emptyDay() }, tasks: [{ id: 'task1', title: 'x', done: false, createdAt: t - 1000 }] };
  const e1 = {
    ...e0,
    days: {
      [tk]: {
        ...emptyDay(),
        water: [{ id: 'w1', ml: 250, at: t }, { id: 'w2', ml: 250, at: t }],
        sets: [{ id: 's1', exercise: 'Squat', weight: 50, reps: 5, at: t }],
        food: [{ id: 'f1', name: 'x', kcal: 100, protein: 1, at: t }],
      },
    },
    tasks: [{ id: 'task1', title: 'x', done: true, createdAt: t - 1000, doneAt: t }],
  };
  assert.deepEqual(tankEventsOf(e0, e1, nowT).map((e) => e.kind).sort(), ['task', 'train', 'water']);
  const fed = { ...e0, days: { [tk]: { ...emptyDay(), food: [{ id: 'f1', name: 'x', kcal: 100, protein: 1, at: t }] } } };
  assert.deepEqual(tankEventsOf(e0, fed, nowT), [], 'nothing for food');
  const buzzing = { ...e0, pendingFly: { id: 'house_fly', until: t + 60_000 } };
  assert.deepEqual(tankEventsOf(buzzing, { ...e0, pendingFly: null, flies: { house_fly: { firstAt: t, count: 1 } } }, nowT).map((e) => e.kind), ['fly']);
  assert.deepEqual(tankEventsOf(buzzing, { ...e0, pendingFly: null }, nowT), [], 'one that got away is no catch');
  const many = Array.from({ length: 10 }, (_, i) => ({ id: `e${i}`, kind: 'water' as const, at: t }));
  assert.equal(withTankEvents([], many, t).length, TANK_QUEUE);
  assert.deepEqual(withTankEvents([{ id: 'old', kind: 'task', at: t - TANK_EVENT_MS - 1 }], [many[0]], t).map((e) => e.id), ['e0'], 'old ones go');

  // ---- egg sacs: a gold chest or a boss sometimes drops one; walking hatches it; coins, never XP ----
  const chestDays = Array.from({ length: 80 }, (_, i) => dayKey(addDays(new Date(2027, 0, 1, 12), i)));
  const dropDay = chestDays.find((k) => roll(`egg:chest:${k}`) < EGG_CHANCE.chest)!;
  const missDay = chestDays.find((k) => roll(`egg:chest:${k}`) >= EGG_CHANCE.chest)!;
  assert.ok(dropDay && missDay);
  const gold = { kind: 'coins' as const, amount: 50, text: '', gold: true };
  const chestState = (k: string) => ({ ...base, days: { [k]: { ...emptyDay(), chestReady: true, steps: 3000 } } });
  const opened = (st: ReturnType<typeof chestState>, k: string, g = true) => ({ ...st, days: { [k]: { ...st.days[k], chest: g ? gold : { ...gold, gold: undefined } } } });
  const when = new Date(`${dropDay}T15:00`);
  const c0 = chestState(dropDay);
  const laid = eggDrops(c0, opened(c0, dropDay), when);
  assert.equal(laid.laid.length, 1);
  const egg = laid.laid[0];
  assert.ok((EGG_KMS as readonly number[]).includes(egg.km));
  assert.equal(egg.skip, 3000, "that day's earlier steps don't count");
  assert.equal(eggDrops(c0, laid.state, when).laid.length, 0, 'the same chest never drops twice');
  assert.equal(eggDrops(c0, opened(c0, dropDay, false), when).laid.length, 0, 'a plain chest drops nothing');
  const m0 = chestState(missDay);
  assert.equal(eggDrops(m0, opened(m0, missDay), new Date(`${missDay}T15:00`)).laid.length, 0, 'and a gold one only sometimes');
  const weeks = Array.from({ length: 60 }, (_, i) => dayKey(addDays(new Date(2027, 0, 4, 12), i * 7)));
  const bossWeek = weeks.find((wk) => roll(`egg:boss:${wk}`) < EGG_CHANCE.boss)!;
  assert.equal(eggDrops(base, { ...base, bossesDefeated: { [bossWeek]: 'x' } }, when).laid[0]?.from, 'boss');
  const fullUp = { ...base, eggSacs: [egg, { ...egg, id: 'b', key: 'b' }, { ...egg, id: 'c', key: 'c' }] };
  assert.equal(fullUp.eggSacs.length, MAX_EGGS);
  assert.equal(eggDrops(fullUp, { ...fullUp, bossesDefeated: { [bossWeek]: 'x' } }, when).laid.length, 0, 'no more than three waiting');
  // walking: the steps after it dropped, at the step length, totals only (a day without steps just waits)
  const need = Math.ceil((egg.km * 1000) / egg.stepM);
  const later = new Date(when.getTime() + 2 * DAY);
  const almost = { ...laid.state, days: { ...laid.state.days, [dropDay]: { ...laid.state.days[dropDay], steps: 3000 + need - 1 }, [dayKey(addDays(when, 1))]: { ...emptyDay(), steps: 0 } } };
  assert.ok(eggKm(almost, egg, later) < egg.km);
  assert.equal(hatchEggs(almost, later).hatched.length, 0);
  const walkedOn = { ...almost, days: { ...almost.days, [dayKey(later)]: { ...emptyDay(), steps: 5 } } };
  const h = hatchEggs(walkedOn, later);
  assert.equal(h.hatched.length, 1);
  assert.deepEqual([h.state.coins - walkedOn.coins, h.state.xp, h.state.eggSacs?.length, h.state.spiderlings?.length], [EGG_COINS[egg.km], walkedOn.xp, 0, 1]);
  assert.equal(eggDrops(c0, { ...opened(c0, dropDay), spiderlings: h.state.spiderlings }, when).laid.length, 0, 'a hatched one stays hatched');

  // ---- snapshots for Wrapped ----
  const snaps = { ...base, tankSnaps: { '2027-01': 'a', '2027-05': 'b', '2027-12': 'c', '2026-12': 'z' } };
  assert.deepEqual(tankSnapsFor(snaps, '2027').map((x) => x.label), ['January', 'December']);
  assert.deepEqual(tankSnapsFor(snaps, '2027-05').map((x) => x.uri), ['b']);
  assert.deepEqual(tankSnapsFor(snaps, '2025'), []);

  // ---- the 3D world acts it out ----
  const all = LAIR.map((x) => x.id);
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const life = (o: Partial<TankLife>): TankLife => ({ ...IDLE_LIFE, ...o });
  const w = createWorld({ ids: all, next: null, marking: '#E23636', background: '#10141F', random: rnd });
  let outside = 0;
  const run = (sec: number, each?: () => void) => {
    for (let i = 0; i < sec * 30; i++) {
      w.step(1 / 30);
      const p = w.pose().pos;
      if (Math.abs(p.x) > TANK.w / 2 || Math.abs(p.z) > TANK.d / 2 || p.y < -0.001 || p.y > TANK.h) outside++;
      each?.();
    }
  };
  // night: the heat lamp off, the glow up
  const dayGlow = w.shown().glow ?? 0;
  w.setLife(life({ daylight: 0, light: lighting(0, false) }));
  assert.equal(w.shown().lamp, 0);
  assert.ok((w.shown().glow ?? 0) > dayGlow);
  // asleep on a thread under the web; Web Focus still in it; gaming at the crystal; a storm in the hide; cosy at the front
  w.setLife(life({ mode: 'sleep', daylight: 0, light: lighting(0, false) }));
  run(40);
  assert.ok(w.spotId() === 'web' && w.pose().thread && w.act() === '💤', `asleep on its thread: ${w.spotId()}`);
  w.setLife(life({ mode: 'focus' }));
  const still = w.pose().pos.clone();
  run(10);
  assert.ok(w.spotId() === 'web' && w.pose().pos.distanceTo(still) < 1e-6, 'still in its web');
  w.setLife(life({ mode: 'game' }));
  run(40);
  assert.ok(w.spotId() === 'arcade' && w.act() === '🎮', `at the crystal: ${w.spotId()}`);
  w.setLife(life({ mode: 'storm' }));
  run(40);
  assert.equal(w.spotId(), 'couch', 'calm in the hide');
  w.setLife(life({ mode: 'cosy', light: lighting(1, true) }));
  run(60);
  assert.ok(w.spotId() === 'cosy' && w.pose().pos.z > 1.8, 'by the moss at the front glass');
  // replays, once it's wandering again
  w.setLife(life({}));
  const replayed = (kind: 'water' | 'train' | 'task' | 'fly', act: string, spot?: string) => {
    w.replay([{ id: kind, kind, at: 0 }]);
    let seen = false;
    run(40, () => {
      if (w.act() === act && (!spot || w.spotId() === spot)) seen = true;
    });
    assert.ok(seen, `${kind} acted out`);
  };
  replayed('water', '💧', 'radio');
  replayed('train', '💪', 'rack');
  replayed('task', '🎁');
  replayed('fly', '😋');
  // a molt: acted out once, a signal for the app, a skin left behind, a little bigger
  const size0 = w.pose().size;
  w.setLife(life({ molt: true }));
  let signal: string | null = null;
  let flipped = false;
  run(45, () => {
    signal ??= w.takeSignal();
    if (w.pose().roll > 3) flipped = true;
  });
  assert.equal(signal, 'molted');
  assert.ok(flipped, 'it flips onto its back to pull free');
  assert.equal(w.shown().skins, 1);
  w.setLife(life({ molt: false, molts: 1 }));
  run(2);
  assert.ok(w.pose().size > size0 && w.takeSignal() === null, 'bigger, and only once');
  // taps: the spider, a fly to catch, or nothing
  w.setYaw(0.4);
  run(0.2);
  const ndc = (p: THREE.Vector3) => {
    const q = p.clone().project(w.camera);
    return [(q.x + 1) / 2, (1 - q.y) / 2] as const;
  };
  const [sx, sy] = ndc(w.pose().pos.add(new THREE.Vector3(0, 0.4, 0)));
  assert.equal(w.pick(sx, sy), 'spider');
  assert.equal(w.pick(0.02, 0.03), null);
  w.poke();
  run(0.5);
  assert.equal(w.busy(), 'poke');
  run(4);
  assert.equal(w.busy(), null, 'then it goes on');
  w.setLife(life({ fly: true }));
  run(0.1);
  const fly = w.scene.getObjectByName('catchable')!;
  assert.ok(fly.visible);
  const [fx, fy] = ndc(fly.position);
  assert.equal(w.pick(fx, fy), 'fly');
  // the pet, the hat, the season, the weather, egg sacs and spiderlings
  w.setLife(life({ pet: { fly: 'iron_beetle', motion: 'trundle' }, hat: { id: 'crown', shape: 'crown' }, dressing: 'star', weather: { ...NO_WEATHER, rain: true, frost: 0.6, snowLid: true }, eggs: 2, spiderlings: 3 }));
  w.settle();
  const shown = w.shown();
  assert.deepEqual([shown.pet, shown.hat, shown.dressing, shown.rain, shown.snowLid, shown.frost, shown.eggs, shown.spiderlings, shown.fly], ['trundle', true, 'star', true, true, 0.6, 2, 3, false]);
  run(20);
  const petOf = () => w.scene.getObjectByName('pet')!.children[0].position;
  assert.ok(Math.abs(petOf().x) <= TANK.w / 2 && Math.abs(petOf().z) <= TANK.d / 2 && petOf().y < 0.3, 'a trundling pet stays on the floor');
  for (const motion of ['buzz', 'lamp', 'glow', 'hop'] as const) {
    w.setLife(life({ pet: { fly: `x_${motion}`, motion } }));
    run(5);
    const p = petOf();
    assert.ok(Math.abs(p.x) <= TANK.w / 2 && Math.abs(p.z) <= TANK.d / 2 && p.y >= 0 && p.y <= TANK.h, `${motion} stays in the tank`);
  }
  for (const d of ['candles', 'sprig', 'sparkles', 'feathers', 'embers', 'pole', 'pumpkin'] as const) {
    w.setLife(life({ dressing: d }));
    run(0.2);
    assert.equal(w.shown().dressing, d);
  }
  // the web grows with the day
  w.setLife(life({ web: { radials: 3, rings: 0, dew: 0, bundles: 0 } }));
  assert.equal(w.shown().webLines, 3);
  w.setLife(life({ web: { radials: 9, rings: 4, dew: DEW_DROPS, bundles: 2 } }));
  assert.deepEqual([w.shown().webLines, w.shown().dew, w.shown().bundles], [9 + 4 * 8 * 2, DEW_DROPS, 2]);
  // plants grow in place, without sending the spider home
  const spotBefore = w.spotId();
  w.setLife(life({ growth: { plant: SPROUT, rug: 1 } }));
  assert.equal(w.spotId(), spotBefore);
  assert.equal(outside, 0, 'never through the glass or the floor');
  w.collect();
  w.dispose();
}
step8TerrariumTests();

// The async blocks above (persistence, fetch checks) report on their own once they finish.
// step 8 bug fixes: sick days before planned trips, months of calls paid, Monday's boss pick, the siren note,
// used one-tap tasks, the app's own night use, plants bought before they could grow
function step8FixTests() {
  // being sick comes first: a planned trip that would leave no room is cut short, the cap still holds
  const sick = defaultState();
  sick.pauses = [
    { from: '2027-01-02', to: '2027-01-06', kind: 'sick' },
    { from: '2027-01-12', to: '2027-01-13', kind: 'away' },
  ];
  assert.equal(pausedDaysInMonth(sick, '2027-01-10'), 7);
  const ill = startPause(sick, 'sick', 1, '2027-01-10');
  assert.equal(ill.pauses?.find((x) => x.from === '2027-01-10')?.kind, 'sick', 'sick mode starts');
  assert.deepEqual(ill.pauses?.find((x) => x.kind === 'away'), { from: '2027-01-12', to: '2027-01-12', kind: 'away' }, 'the trip gives way');
  assert.equal(pausedDaysInMonth(ill, '2027-01-10'), 7);
  // away mode still can't push past the cap
  assert.equal(startPause(sick, 'away', 1, '2027-01-10'), sick);

  // calls: every month since the last paid one is scored (the app wasn't opened in November)
  const calls = defaultState();
  calls.days['2026-10-05'] = { ...emptyDay(), shot: { q: 'gym', call: 'lock', p: 0.95, at: 0, result: 'hit' } };
  calls.days['2026-10-06'] = { ...emptyDay(), shot: { q: 'gym', call: 'probably', p: 0.75, at: 0, result: 'void' } };
  calls.shotsPaid = '2026-09';
  const paid = settleShotMonth(calls, new Date(2026, 11, 2, 9));
  assert.equal(paid.state.shotsPaid, '2026-11');
  const expected = Math.round(SHOT_COINS * (1 - (0.95 - 1) ** 2) + SHOT_COINS * (1 - VOID_BRIER));
  assert.equal(paid.state.coins - calls.coins, expected, "October's calls paid, the void as a coin flip");
  assert.equal(paid.award?.month, '2026-10');
  assert.equal(settleShotMonth(paid.state, new Date(2026, 11, 3, 9)).state, paid.state, 'once');

  // Monday's boss pick: open until noon whatever the rollover paid, closed once the week's boss is named
  const pick = { ...defaultState(), onboarded: true };
  const mon = new Date(2027, 2, 1, 9);
  pick.days['2027-03-01'] = { ...emptyDay(), xpEarned: 10 }; // last week's medals, paid onto Monday
  assert.equal(pickWeek(pick, mon), '2027-03-01');
  assert.equal(pickWeek(pick, new Date(2027, 2, 1, 13)), null, 'until noon');
  assert.equal(pickWeek(withBossName(pick, 'Sir Snoozealot', mon), mon), null, 'a named boss keeps its week');

  // Hesa Fredrik's note on HQ lasts until 15:15 on the test day
  assert.ok(sirenToday(defaultState(), new Date(2026, 11, 7, 15, 5)));
  assert.ok(!sirenToday(defaultState(), new Date(2026, 11, 7, 15, 20)));

  // a one-tap task that was done and cleared still counts as used
  const used = defaultState();
  used.days['2026-11-08'] = { ...emptyDay(), doneTasks: [{ id: 't1', at: 0 }] };
  assert.ok(taskUsed(used, 't1') && !taskUsed(used, 't2') && !taskUsed(used, null));

  // the app's own late use isn't phone in bed
  const bed = new Date(2026, 10, 6, 23).getTime();
  const own = nightPhone([{ label: 'S.P.I.D.E.R', packageName: 'app.spider.assistant', start: bed, end: bed + 30 * 60_000 }], bed, bed + 6 * 3_600_000);
  assert.equal(own.lateMin, 0);

  // pieces bought before plants could grow stay full-grown; newer saves keep their own growth
  const old = hydrate({ ...defaultState(), lair: ['web', 'lamp', 'rug'] } as Parameters<typeof hydrate>[0]);
  assert.deepEqual(old.lairGrowth, { web: 1, lamp: 1, rug: 1 });
  const newer = hydrate({ ...defaultState(), lair: ['rug'], lairAt: { rug: 1 }, lairGrowth: { rug: 0.4 } } as Parameters<typeof hydrate>[0]);
  assert.deepEqual(newer.lairGrowth, { rug: 0.4 });

  // the weekend's events are asked for from today on
  assert.ok(eventsUrl(['music'], ['2026-11-06', '2026-11-07', '2026-11-08'], 1, '2026-11-07').includes('date_from=2026-11-07&date_to=2026-11-08'));
}
step8FixTests();

// ---------- step 9 care ----------
// The joy menu, the night shift, the self-compassion break, worry parking and the shutdown, name it then one step,
// fuel before gym and the meal rhythm, the meeting-marathon reset.
function step9CareTests() {
  const T0 = new Date(2027, 2, 2, 10).getTime(); // Tuesday 2 March 2027, 10:00
  const care = () => ({ ...defaultState(), onboarded: true });
  const water = (at: number) => [{ id: `w${at}`, ml: 250, at }];
  const ev = (key: string, start: number, end: number, allDay = false) => ({ key, title: key, start, end, allDay, location: null, calendarId: 'c' });
  const at = (d: number, h: number, m = 0) => new Date(2027, 2, d, h, m).getTime();

  // ---- joy menu: offers fit today's energy, the best lifter first, stable per offer, never XP ----
  let j = care();
  j = withJoyItem(j, { title: '  Call Mia ', size: 2 }, T0, 'a');
  j = withJoyItem(j, { title: 'Bake', size: 15 }, T0, 'b');
  j = withJoyItem(j, { title: 'Djurgården loop', size: 60, social: true }, T0, 'c');
  assert.equal(withJoyItem(j, { title: 'call mia', size: 15 }, T0, 'd'), j, 'no item twice');
  assert.equal(withJoyItem(j, { title: '   ', size: 15 }, T0, 'd'), j, 'no empty item');
  assert.equal(j.joy?.items[0].title, 'Call Mia');
  j = { ...j, joy: { items: j.joy!.items.map((x) => (x.id === 'a' ? { ...x, tries: 4, lifted: 1 } : x.id === 'b' ? { ...x, tries: 4, lifted: 4 } : x)) } };
  const withEnergy = (s: typeof j, e: number | undefined) => ({ ...s, days: { ...s.days, '2027-03-02': { ...emptyDay(), energy: e as DayLog['energy'] } } });
  assert.equal(energyCap(withEnergy(j, 2), '2027-03-02'), 2);
  assert.equal(energyCap(withEnergy(j, 3), '2027-03-02'), 15);
  assert.equal(energyCap(j, '2027-03-02'), 15, 'an unrated morning: up to 15 minutes');
  assert.equal(energyCap(withEnergy(j, 5), '2027-03-02'), 60);
  assert.equal(joyPick(withEnergy(j, 2), { key: '2027-03-02', seed: 's' })?.id, 'a', 'low battery: only the 2-minute things');
  assert.equal(joyPick(j, { key: '2027-03-02', seed: 's' })?.id, 'b', 'the one that lifted most often, if it fits');
  assert.equal(joyPick(withEnergy(j, 5), { key: '2027-03-02', seed: 's' })?.id, 'b');
  assert.equal(joyPick(withEnergy(j, 5), { key: '2027-03-02', seed: 's', social: true })?.id, 'c', 'lonely: social items only');
  assert.equal(joyPick(j, { key: '2027-03-02', seed: 's', social: true }), null, 'nothing social fits a 15-minute day');
  assert.equal(joyPick(j, { key: '2027-03-02', seed: 's', skip: 1 })?.id, 'a', 'something else');
  assert.equal(joyPick(j, { key: '2027-03-02', seed: 'x' })?.id, joyPick(j, { key: '2027-03-02', seed: 'x' })?.id, 'stable for one offer');
  assert.equal(joyPick(care(), { seed: 's' }), null, 'an empty menu offers nothing');
  // done now: asked about once its time has passed, then let go after a day
  let t = withJoyTry(j, 'a', null, T0);
  assert.deepEqual(t.joy?.open, { id: 'a', at: T0, askAt: T0 + 2 * MIN });
  assert.equal(joyAsk(t, T0 + MIN), null);
  assert.equal(joyAsk(t, T0 + 3 * MIN)?.item.id, 'a');
  assert.equal(joyAsk(t, T0 + 2 * MIN + JOY_ASK_FOR_MS + 1), null, 'a stale question lets go');
  assert.equal(joyReminders(t, T0).length, 0, 'done now: no ping');
  const better = withJoyAnswer(t, true);
  assert.deepEqual([better.joy?.items[0].tries, better.joy?.items[0].lifted, better.joy?.open], [5, 2, null]);
  assert.equal(liftText(better.joy!.items[0]), 'lifted you 2 of 5 times');
  const same = withJoyAnswer(t, false);
  assert.deepEqual([same.joy?.items[0].tries, same.joy?.items[0].lifted], [5, 1]);
  assert.deepEqual(withJoyAnswer(t, null).joy?.items, t.joy?.items, 'waved off: nothing counted');
  assert.equal(liftText(j.joy!.items[2]), 'not tried yet');
  assert.equal(liftText({ id: 'z', title: 'z', size: 2, at: 0, tries: 1, lifted: 1 }), 'lifted you 1 of 1 time');
  for (const x of [t, better, same]) assert.equal(x.xp, j.xp, 'no XP in the joy menu');
  // booked into a free slot: a ping at its start, the question after it
  const events = [ev('m1', at(2, 10), at(2, 12)), ev('m2', at(2, 12, 10), at(2, 15)), ev('all', at(2, 0), at(3, 0), true)];
  const now = new Date(at(2, 9, 50));
  assert.deepEqual(joySlot(events, 2, 7, 23, now), { at: at(2, 9, 50), end: at(2, 10), day: '2027-03-02' }, 'a 2-minute thing fits a 10-minute gap');
  assert.equal(joySlot(events, 15, 7, 23, now)?.at, at(2, 15), 'a 15-minute one waits for the first gap that long');
  assert.equal(joySlot([ev('long', at(2, 9), at(2, 23, 30))], 60, 7, 23, now)?.at, at(3, 8), 'no room today: tomorrow, an hour after waking');
  t = withJoyTry(j, 'b', at(2, 15), now.getTime());
  assert.deepEqual(t.joy?.open, { id: 'b', at: at(2, 15), askAt: at(2, 15, 15), booked: true });
  assert.deepEqual(joyReminders(t, now.getTime()), [{ id: 'joy-2027-03-02-b', day: '2027-03-02', at: at(2, 15), title: 'Bake' }]);
  assert.deepEqual(joyReminders(t, at(2, 15, 1)), [], 'never a past slot');
  assert.equal(withoutJoyItem(t, 'b').joy?.open, null, 'removing the item drops its try');

  // ---- name it, then one matched step ----
  for (const e of EMOTIONS.filter((x) => x.low)) assert.ok(STEP_OF[e.name], `${e.name} has a step`);
  for (const name of Object.keys(STEP_OF)) assert.ok(EMOTIONS.some((e) => e.name === name), `${name} is a saved emotion name`);
  assert.equal(stepFor(['Stressed']), 'breathe');
  assert.equal(stepFor(['Overwhelmed']), 'breathe');
  assert.equal(stepFor(['Restless']), 'breathe');
  assert.equal(stepFor(['Anxious']), 'park');
  assert.equal(stepFor(['Lonely']), 'social');
  assert.equal(stepFor(['Sad']), 'joy');
  assert.equal(stepFor(['Numb']), 'joy');
  assert.equal(stepFor(['Bored']), 'joy');
  assert.equal(stepFor(['Tired']), 'rest');
  assert.equal(stepFor(['Angry']), 'move');
  assert.equal(stepFor(['Irritable']), 'move');
  assert.equal(stepFor(['Happy', 'Calm']), null);
  assert.equal(stepFor(['Sad', 'Tired', 'Anxious']), 'park', 'the lightest lift first');
  assert.equal(stepFor(['Bored', 'Tired']), 'rest');
  const checkIn = (level: number, emotions: string[], extra: Partial<MoodEntry> = {}) => {
    const s = care();
    s.days['2027-03-02'] = { ...emptyDay(), moods: [{ id: 'm1', level: level as MoodEntry['level'], emotions, at: at(2, 9, 30), ...extra }] };
    return s;
  };
  assert.equal(careOffer(checkIn(2, []), T0), null, '"Want to name it?" comes first');
  assert.equal(careOffer(checkIn(2, [], { asked: true }), T0), null, 'no joy offer without a menu');
  const menu = (s: typeof j) => ({ ...s, joy: j.joy });
  assert.deepEqual(careOffer(menu(checkIn(2, [], { asked: true })), T0), { key: 'joy:m1', mood: menu(checkIn(2, [], { asked: true })).days['2027-03-02'].moods![0], step: null });
  assert.equal(careOffer(menu(checkIn(3, [], { asked: true })), T0), null, 'an okay check-in without words gets nothing');
  assert.equal(careOffer(checkIn(2, ['Anxious']), T0)?.step, 'park');
  assert.equal(careOffer(checkIn(3, ['Stressed']), T0)?.step, 'breathe', 'named on the Mood screen: okay is enough');
  assert.equal(careOffer(checkIn(4, ['Stressed']), T0), null);
  assert.equal(careOffer(withCareSeen(checkIn(2, ['Anxious']), 'step:m1'), T0), null, 'offered once');
  assert.equal(careOffer(checkIn(2, ['Anxious']), at(2, 9, 30) + OFFER_FOR_MS + 1), null, 'hours later it is a different moment');
  assert.equal(careOffer(checkIn(2, ['Anxious'], { late: true }), T0), null, 'never for a check-in added afterwards');
  assert.equal(withCareSeen(withCareSeen(care(), 'a'), 'a').careSeen?.length, 1);

  // ---- self-compassion break: the morning after a real slip, opt-in, once per event ----
  const slip = care();
  slip.days['2027-03-01'] = { ...emptyDay(), water: water(at(1, 9)) }; // Monday: Push, not trained
  assert.equal(slipCard(slip, new Date(T0)), null, 'off unless turned on');
  slip.settings = { ...slip.settings, selfCompassion: true };
  const card = slipCard(slip, new Date(T0));
  assert.deepEqual(card?.slips.map((x) => [x.kind, x.happened]), [['gym', 'Push day slipped by']]);
  assert.equal(slipCard(withCareSeen(slip, 'slip:gym:2027-03-01'), new Date(T0)), null, 'once per event');
  assert.equal(slipCard(slip, new Date(at(3, 9))), null, 'only the morning after');
  for (const [why, patch] of [
    ['low mood', { moods: [{ id: 'x', level: 2, emotions: [], at: at(1, 9) }] }],
    ['low battery', { energy: 2 }],
    ['period', { period: { flow: 'medium', symptoms: [] } }],
    ['trained', { activities: [{ id: 'a', kind: 'cardio', minutes: 30, at: at(1, 18) }] }],
  ] as [string, Partial<DayLog>][]) {
    const s = { ...slip, days: { ...slip.days, '2027-03-01': { ...slip.days['2027-03-01'], ...patch } } };
    assert.equal(slipsOn(s, '2027-03-01').length, 0, why);
  }
  assert.equal(slipsOn({ ...slip, pauses: [{ from: '2027-03-01', to: '2027-03-01', kind: 'sick' }] }, '2027-03-01').length, 0, 'a sick day has no slips');
  assert.equal(slipsOn(slip, '2027-03-03').length, 0, 'a rest day has none');
  // a confident call that missed is a slip; a "no chance" that missed (she went) isn't
  const shot = (call: 'lock' | 'no', p: number) => ({ ...slip, days: { ...slip.days, '2027-03-01': { ...slip.days['2027-03-01'], shot: { q: 'gym' as const, call, p, at: at(1, 8), result: 'miss' as const } } } });
  assert.deepEqual(slipsOn(shot('lock', 0.95), '2027-03-01').map((x) => x.kind), ['gym', 'shot']);
  const went = shot('no', 0.1);
  went.days['2027-03-01'] = { ...went.days['2027-03-01'], activities: [{ id: 'a', kind: 'cardio', minutes: 30, at: at(1, 18) }] };
  assert.deepEqual(slipsOn(went, '2027-03-01'), []);
  // the week's slips are dated on its Sunday: a lost contract (a voided one is rest)
  const week = { ...slip, contractLog: [{ week: '2027-03-01', goal: 'water' as const, difficulty: 'normal' as const, stake: 50, target: 5, status: 'lost' as const, payout: 0, at: at(8, 8) }] };
  assert.ok(slipsOn(week, '2027-03-07').some((x) => x.key === 'slip:contract:2027-03-01'));
  assert.ok(!slipsOn({ ...week, contractLog: [{ ...week.contractLog[0], status: 'voided' }] }, '2027-03-07').some((x) => x.kind === 'contract'));
  assert.ok(slipCard({ ...week, settings: { ...week.settings, selfCompassion: true } }, new Date(at(8, 9)))?.slips.some((x) => x.kind === 'contract'), 'Monday morning');
  // what she'd tell a friend: optional, kept, shown next time
  assert.equal(withKindWord(slip, '2027-03-01', '   '), slip);
  const kind = withKindWord(slip, '2027-03-01', 'You were tired. Tomorrow is fine.', T0);
  assert.equal(lastKindWord(kind, '2027-03-05')?.text, 'You were tired. Tomorrow is fine.');
  assert.equal(lastKindWord(kind, '2027-03-01'), null);

  // ---- worry parking, the worry slot and the shutdown ----
  let w = care();
  assert.equal(slotAt(w, '2027-03-02'), at(2, 17, 30), '17:30 unless set');
  w = withWorry(w, ' the dentist bill ', T0, 'w1');
  assert.deepEqual(w.worries, [{ id: 'w1', text: 'the dentist bill', at: T0, until: '2027-03-02' }]);
  assert.deepEqual(worriesDue(w, at(2, 17)), [], 'parked: out of sight until the slot');
  assert.deepEqual(worriesDue(w, at(2, 17, 31)).map((x) => x.id), ['w1']);
  w = withWorry(w, 'the talk on Friday', at(2, 18), 'w2');
  assert.equal(w.worries?.[1].until, '2027-03-03', "parked after today's slot: tomorrow's");
  assert.deepEqual(worriesDue(w, at(2, 18, 1)).map((x) => x.id), ['w1']);
  assert.deepEqual(withWorrySettled(w, 'w1', 'done', at(2, 18)).worries?.map((x) => x.id), ['w2'], 'a task or let go: off the list');
  assert.equal(withWorrySettled(w, 'w1', 'tomorrow', at(2, 18)).worries?.[0].until, '2027-03-03');
  assert.equal(withWorry(w, '  ', T0), w);
  const sd = withShutdown(w, at(2, 18, 5));
  assert.deepEqual(sd.shutdown, { day: '2027-03-02', at: at(2, 18, 5) });
  assert.deepEqual(sd.worries?.map((x) => x.until), ['2027-03-03', '2027-03-03'], "what's left waits for tomorrow");
  assert.ok(!shutdownQuiet(sd, at(2, 18)) && shutdownQuiet(sd, at(2, 18, 5)) && shutdownQuiet(sd, at(3, 6, 59)), 'quiet until morning');
  assert.ok(!shutdownQuiet(sd, at(3, 7)), 'the wake-up hour ends it');
  assert.equal(quietUntil(sd, at(3, 0, 30)), at(3, 7), 'a shutdown after midnight lasts until that morning');
  assert.ok(!shutdownQuiet(care(), T0));
  // the slot's reminder: opt-in, only on a day something waits, not after that day's shutdown, not on paused days
  assert.deepEqual(worryPings(w, T0), []);
  const ping = { ...w, settings: { ...w.settings, worryPing: true } };
  assert.deepEqual(worryPings(ping, T0).map((x) => x.id), ['worry-2027-03-02', 'worry-2027-03-03', 'worry-2027-03-04']);
  assert.deepEqual(worryPings({ ...ping, worries: [ping.worries![1]] }, T0).map((x) => x.id), ['worry-2027-03-03', 'worry-2027-03-04'], 'nothing waits today');
  assert.deepEqual(worryPings({ ...ping, shutdown: { day: '2027-03-02', at: T0 } }, T0).map((x) => x.id), ['worry-2027-03-03', 'worry-2027-03-04']);
  assert.deepEqual(worryPings({ ...ping, pauses: [{ from: '2027-03-03', to: '2027-03-03', kind: 'sick' }] }, T0).map((x) => x.id), ['worry-2027-03-02', 'worry-2027-03-04']);
  assert.deepEqual(worryPings({ ...ping, worries: [] }, T0), []);

  // ---- the night shift ----
  const night = (h: number, m: number, sleepHour = 23, nightShift?: boolean) => nightShiftNow({ sleepHour, nightShift }, new Date(2027, 2, h < 12 ? 3 : 2, h, m));
  assert.ok(!night(23, 29) && night(23, 30) && night(2, 0) && night(4, 59), 'bedtime + 30 min until 05:00');
  assert.ok(!night(5, 0) && !night(12, 0) && !night(19, 0));
  assert.ok(!night(0, 29, 24) && night(0, 30, 24) && !night(23, 50, 24), 'a midnight bedtime opens at 00:30');
  assert.ok(night(19, 30, 19) && !night(19, 29, 19));
  assert.ok(!night(2, 0, 23, false), 'off in Settings');
  const shuffled = new Set(NIGHT_WORDS.map((_, i) => nightWord(42, i)));
  assert.equal(shuffled.size, NIGHT_WORDS.length, 'every word once before any repeats');
  assert.ok(NIGHT_WORDS.every((x) => !/\d/.test(x)), 'no numbers at night');
  assert.deepEqual(thoughtsOf('- call the bank\n\nbuy milk; Call the bank\n• email Anna '), ['call the bank', 'buy milk', 'email Anna']);
  assert.deepEqual(thoughtsOf(' \n ; '), []);

  // ---- fuel before gym, and the meal rhythm ----
  const fed = care();
  for (let d = 1; d <= 7; d++) fed.days[`2027-03-0${d}`] = { ...emptyDay(), food: d === 3 ? [] : [{ id: `f${d}`, name: 'Lunch', kcal: 500, protein: 30, at: at(d, 12) }] };
  assert.ok(logsFoodMostDays(fed, '2027-03-08'), '6 of the last 7 days');
  const sparse = { ...fed, days: { ...fed.days, '2027-03-01': emptyDay(), '2027-03-02': emptyDay(), '2027-03-04': emptyDay() } };
  assert.ok(!logsFoodMostDays(sparse, '2027-03-08'), 'only 3 of 7: an unlogged meal proves nothing');
  assert.ok(!logsFoodMostDays({ ...fed, pauses: [{ from: '2027-03-01', to: '2027-03-04', kind: 'away' }] }, '2027-03-08'), 'too few days to tell');
  const gym = at(8, 18); // Monday 8 March: Push
  assert.ok(fuelBeforeGym(fed, '2027-03-08', gym, '2027-03-08'), 'nothing logged in the 4 hours before');
  const snack = (h: number) => ({ ...fed, days: { ...fed.days, '2027-03-08': { ...emptyDay(), food: [{ id: 's', name: 'Banana', kcal: 100, protein: 1, at: at(8, h) }] } } });
  assert.ok(!fuelBeforeGym(snack(16), '2027-03-08', gym, '2027-03-08'), 'a snack 2 h before: no line');
  assert.ok(fuelBeforeGym(snack(13), '2027-03-08', gym, '2027-03-08'), 'lunch 5 h before is outside the window');
  assert.ok(!fuelBeforeGym(fed, '2027-03-07', at(7, 18), '2027-03-08'), 'a rest day');
  assert.ok(!fuelBeforeGym(sparse, '2027-03-08', gym, '2027-03-08'), 'not while food is rarely logged');
  const trained = { ...fed, days: { ...fed.days, '2027-03-08': { ...emptyDay(), activities: [{ id: 'a', kind: 'cardio' as const, minutes: 30, at: at(8, 7) }] } } };
  assert.ok(!fuelBeforeGym(trained, '2027-03-08', gym, '2027-03-08'), 'already trained');
  const rhythm = care();
  rhythm.days['2027-03-01'] = { ...emptyDay(), food: [8 * 60, 8 * 60 + 20, 12 * 60 + 30].map((m, i) => ({ id: `r${i}`, name: 'x', kcal: 1, protein: 0, at: at(1, 0, m) })) };
  rhythm.days['2027-03-02'] = { ...emptyDay(), food: [{ id: 'q', name: 'x', kcal: 1, protein: 0, at: at(2, 19) }] };
  const strip = mealRhythm(rhythm, new Date(at(3, 12)));
  assert.deepEqual(strip.map((d) => d.key), ['2027-03-01', '2027-03-02', '2027-03-03', '2027-03-04', '2027-03-05', '2027-03-06', '2027-03-07']);
  assert.deepEqual(strip[0].meals, [480, 750], 'items 20 minutes apart are one meal');
  assert.deepEqual(strip[1].meals, [1140]);
  assert.deepEqual(strip.map((d) => d.future), [false, false, false, true, true, true, true]);
  assert.ok(Object.keys(strip[0]).every((k) => ['key', 'meals', 'future'].includes(k)), 'times only, no kcal');
  // the week switcher: last week, seen from Wednesday 10 March, has its meals and no days still ahead
  const lastWeek = mealRhythm(rhythm, new Date(at(3, 12)), '2027-03-10');
  assert.equal(lastWeek[0].key, '2027-03-01');
  assert.deepEqual(lastWeek[1].meals, [1140]);
  assert.ok(lastWeek.every((d) => !d.future), 'a past week has nothing ahead');

  // ---- the meeting-marathon reset, and its cap shared with the move nudge ----
  const marathon = [ev('a', at(2, 9), at(2, 10)), ev('b', at(2, 10), at(2, 10, 30)), ev('c', at(2, 10, 33), at(2, 11, 5)), ev('d', at(2, 11, 30), at(2, 12))];
  assert.deepEqual(marathonGap(marathon, new Date(T0)), { at: at(2, 11, 5), from: at(2, 9), gap: 25 * MIN }, 'back to back (3 minutes apart counts) for 2 h 5 min');
  assert.equal(marathonGap(marathon.slice(0, 2), new Date(T0)), null, 'an hour and a half is no marathon');
  const broken = [ev('a', at(2, 9), at(2, 10)), ev('b', at(2, 10, 15), at(2, 11, 30))];
  assert.equal(marathonGap(broken, new Date(T0)), null, 'a 15-minute break in between ends the run');
  const noGap = [ev('a', at(2, 9), at(2, 11)), ev('b', at(2, 11, 8), at(2, 11, 30)), ev('c', at(2, 14), at(2, 15))];
  assert.equal(marathonGap(noGap, new Date(T0))?.at, at(2, 11, 30), 'a gap of 8 minutes is back to back, so the run goes on to the real gap');
  const tooShort = [ev('a', at(2, 9), at(2, 11)), ev('b', at(2, 11, 7), at(2, 12)), ev('c', at(2, 12, 6), at(2, 13)), ev('d', at(2, 13, 9), at(2, 14))];
  assert.equal(marathonGap(tooShort, new Date(T0))?.at, at(2, 14), 'gaps under 10 minutes leave no room for a reset: the ping waits for the first real gap');
  assert.equal(marathonGap([ev('x', at(2, 0), at(3, 0), true)], new Date(T0)), null, 'all-day events are no meetings');
  assert.equal(marathonGap([ev('a', at(2, 13), at(2, 15, 30))], new Date(T0))?.at, at(2, 15, 30), 'one long meeting counts, the day after it is the gap');
  assert.deepEqual(movePingOf(at(2, 14, 5), at(2, 11, 5), T0), { kind: 'reset', at: at(2, 11, 5) }, 'the earlier one wins');
  assert.deepEqual(movePingOf(at(2, 14, 5), at(2, 16), T0), { kind: 'move', at: at(2, 14, 5) });
  assert.equal(movePingOf(at(2, 14, 5), at(2, 16), at(2, 15)), null, 'the move nudge went out: no reset on top');
  assert.equal(movePingOf(at(2, 9, 5), at(2, 11, 5), T0), null, 'one move ping a day');
  assert.deepEqual(movePingOf(null, at(2, 11, 5), T0), { kind: 'reset', at: at(2, 11, 5) });
  assert.equal(movePingOf(null, null, T0), null);

  // ---- reminders: new planned prefixes, kind words only (so the Storm protocol has nothing to take back) ----
  for (const id of ['joy-2027-03-02-b', 'worry-2027-03-02', 'reset-2027-03-02']) assert.ok(isPlanned(id), id);
  assert.deepEqual(stormPlan(['joy-2027-03-02-b', 'worry-2027-03-02', 'reset-2027-03-02'], ['2027-03-02']), { cancel: [], soften: [] });
  assert.ok(HQ_SECTIONS.some((x) => x.id === 'worry') && hqVisible().includes('worry'));

  // ---- the lines: kind in both lists, plain, never about amounts ----
  const pools = LINES as Record<string, { mild: string[]; savage: string[] }>;
  const CARE = ['joyOffer', 'joyAsk', 'joyPing', 'joyBooked', 'stepBreathe', 'stepPark', 'stepSocial', 'stepJoy', 'stepRest', 'stepMove', 'slipHard', 'slipEveryone', 'slipFriend', 'worryParked', 'worrySlotPing', 'shutdownDone', 'shutdownQuiet', 'nightShift', 'nightParked', 'gymFuel', 'meetingReset'];
  for (const k of CARE) assert.deepEqual(pools[k].mild, pools[k].savage, `${k} is kind in both lists`);
  for (const k of ['joyOffer', 'worrySlotPing', 'shutdownQuiet', 'nightShift', 'gymFuel', 'meetingReset']) assert.ok(pools[k].mild.length >= 6, `${k}: 6+ lines`);
  for (const k of ['nightShift', 'nightParked']) for (const x of pools[k].mild) assert.ok(!/\d/.test(x), `${k}: no numbers at night: ${x}`);
  for (const x of pools.gymFuel.mild) assert.ok(!/skip|too late|late|missed|portion|amount|\d|kcal|calorie/i.test(x) && x.includes('{workout}'), x);
  for (const x of pools.meetingReset.mild) assert.ok(/stand|up/i.test(x) && /window|far away/i.test(x) && /water/i.test(x), x);
  for (const k of ['worryParked', 'worrySlotPing', 'shutdownDone']) for (const x of pools[k].mild) assert.ok(!/\d/.test(x.replace(/\{\w+\}/g, '')), `${k}: never a count: ${x}`);
}
step9CareTests();

// step 9 admin: the chore rota, the due-back shelf, the War room and task horizons
function step9AdminTests() {
  const base: AdminState = { ...defaultState(), onboarded: true };
  const at = new Date(2026, 10, 1, 10).getTime(); // Sunday 1 Nov

  // chores: a bar that drains over its days, never past due; paused days don't drain it
  const st = withChore(base, { name: 'Change the sheets', emoji: '🛏️', every: 14 }, 'c1', at);
  const c1 = (x: AdminState) => x.chores!.find((c) => c.id === 'c1')!;
  assert.equal(choreDays(st, c1(st), '2026-11-01'), 0);
  assert.equal(grimOf(st, c1(st), '2026-11-01'), 0);
  assert.equal(grimText(st, c1(st), '2026-11-08'), '50% grim');
  assert.equal(dueOn(st, c1(st), '2026-11-01'), '2026-11-15');
  assert.ok(!isDue(st, c1(st), '2026-11-14') && isDue(st, c1(st), '2026-11-15'));
  assert.equal(grimOf(st, c1(st), '2026-12-30'), 1, 'overdue is just due, never more');
  assert.equal(grimText(st, c1(st), '2026-12-30'), 'due');
  const sick: AdminState = { ...st, pauses: [{ from: '2026-11-03', to: '2026-11-05', kind: 'sick' }] };
  assert.equal(choreDays(sick, c1(sick), '2026-11-08'), 4, 'three sick days left out');
  assert.equal(dueOn(sick, c1(sick), '2026-11-08'), '2026-11-18');
  const trip: AdminState = { ...st, pauses: [{ from: '2026-11-10', to: '2026-11-12', kind: 'away' }] };
  assert.equal(dueOn(trip, c1(trip), '2026-11-08'), '2026-11-18', 'a planned trip ahead pushes the due day');
  const two = withChore(st, { name: 'Dentist checkup', emoji: '🦷', every: 182, due: true }, 'c2', at);
  assert.ok(isDue(two, two.chores![1], '2026-11-01'), 'added as due');
  assert.deepEqual(choresDueBy(two, '2026-11-01', '2026-11-01').map((c) => c.id), ['c2']);
  assert.deepEqual(choresDueBy(two, '2026-11-15', '2026-11-01').map((c) => c.id), ['c2', 'c1']);
  assert.deepEqual(choresForWeek(two, '2026-11-09', '2026-11-08').map((c) => c.id), ['c2', 'c1'], 'the War room lists what comes due by Sunday');
  assert.equal(withChore(st, { name: ' x ', emoji: '', every: 3 }, 'c3', at), st, 'a name is needed');

  // done: reset with its XP under the chore's own ref, once a day; the same-day undo takes back exactly that
  const key = '2026-11-20';
  const doneAt = new Date(2026, 10, 20, 9).getTime();
  const done = credit(withChoreReset(st, 'c1', doneAt, 'done', { xp: true }), key, CHORE_XP, 0, choreRef('c1'));
  assert.ok(paidToday(done, 'c1', key) && !paidToday(st, 'c1', key));
  assert.equal(grimOf(done, c1(done), key), 0);
  assert.ok(undoable(done, 'c1', key)?.xp);
  assert.equal(undoable(done, 'c1', '2026-11-21'), null, 'an undo is for the same day');
  const undone = unreward(withoutChoreReset(done, 'c1'), key, choreRef('c1'), CHORE_XP);
  assert.equal(undone.xp, st.xp);
  assert.equal(undone.coins, st.coins);
  assert.equal(c1(undone).last, at, 'back to when it was last done');

  // the shop's "Skip one chore": a pass, used on a chore without XP, back on an undo
  assert.ok(isChoreSkip({ title: 'Skip one chore' }) && !isChoreSkip({ title: 'Pizza night' }));
  const idea = { title: 'Skip one chore', emoji: '🧹', cost: 500 };
  const bought = withChoreSkipBought({ ...st, coins: 600 }, idea, 'p1', at);
  assert.deepEqual([bought.coins, bought.choreSkips, bought.purchases.at(-1)?.title], [100, 1, 'Skip one chore']);
  assert.equal(withChoreSkipBought({ ...st, coins: 100 }, idea, 'p2', at).choreSkips, undefined, 'too poor: nothing bought');
  const skipped = withChoreReset(bought, 'c1', doneAt, 'skip');
  assert.deepEqual([skipped.choreSkips, skipped.xp, c1(skipped).last], [0, bought.xp, doneAt], 'a pass pays no XP');
  assert.equal(withoutChoreReset(skipped, 'c1').choreSkips, 1, 'undoing a skip gives the pass back');

  // a chore's task (the debrief's top-3 picker): made once, checking it off resets the chore, unchecking puts it back
  const made = withChoreTask(st, 'c1', 't1', at);
  assert.deepEqual([made.id, made.state.tasks[0].chore, made.state.tasks[0].title], ['t1', 'c1', '🛏️ Change the sheets']);
  assert.equal(withChoreTask(made.state, 'c1', 't2', at).id, 't1', 'once');
  const checked: AdminState = { ...made.state, tasks: made.state.tasks.map((t) => (t.id === 't1' ? { ...t, done: true, doneAt } : t)) };
  const synced = syncChoreTasks(made.state, checked);
  assert.deepEqual([c1(synced).last, c1(synced).undo?.task, synced.xp], [doneAt, 't1', checked.xp], 'the task paid, the chore only resets');
  assert.equal(undoable(synced, 'c1', key), null, "the task's own uncheck undoes it");
  const unchecked: AdminState = { ...synced, tasks: synced.tasks.map((t) => (t.id === 't1' ? { ...t, done: false, doneAt: undefined } : t)) };
  assert.equal(c1(syncChoreTasks(synced, unchecked)).last, at);
  assert.ok(!withChoreReset({ ...made.state, choreSkips: 1 }, 'c1', doneAt, 'skip').tasks.some((t) => t.id === 't1'), "a skip takes the chore's task off too");

  // share texts: pickup codes and last days, Swedish and English dates; nothing guessed when the text has none
  const today = '2026-11-07';
  const pn = parseShelfText('PostNord: Ditt paket från Zalando finns att hämta hos ICA Nära Hornstull. Utlämningskod: 482913. Hämtas senast 21/11.', today);
  assert.deepEqual([pn.kind, pn.carrier, pn.code, pn.until, pn.title], ['parcel', 'PostNord', '482913', '2026-11-21', 'Parcel · Zalando · PostNord']);
  const ib = parseShelfText('Instabox: Din order från Apotea ligger i boxen. Din kod: 7KX4Q2. Hämta senast fre. 13 nov kl 23.59.', today);
  assert.deepEqual([ib.carrier, ib.code, ib.until], ['Instabox', '7KX4Q2', '2026-11-13']);
  const dhl = parseShelfText('DHL Express: Your shipment is ready for collection at DHL Service Point. Pickup code 123 456. Collect by 14.11.2026.', today);
  assert.deepEqual([dhl.kind, dhl.code, dhl.until], ['parcel', '123456', '2026-11-14']);
  const bb = parseShelfText('Budbee: Paketet levererades till din Budbee Box 2026-11-06. Koden till boxen är 5521. Paketet ligger kvar till och med 2026-11-12.', today);
  assert.deepEqual([bb.carrier, bb.code, bb.delivered, bb.until], ['Budbee', '5521', '2026-11-06', '2026-11-12']);
  const from = parseShelfText('Paketet kan hämtas från och med 7/11 till och med 21/11-26 hos ombudet. Kolli 1/2. Vikt 2.5 kg.', today);
  assert.equal(from.until, '2026-11-21', 'a start date is not the deadline');
  assert.deepEqual(from.dates, ['2026-11-07', '2026-11-21'], 'a parcel count and a weight are not dates');
  assert.deepEqual(
    datesIn('21:e november, 22 nov., Nov 23rd 2026, 24.11, 25/11-2026, 2026-11-26, kl. 12.30', today).map((d) => d.key),
    ['2026-11-21', '2026-11-22', '2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26'],
  );
  assert.equal(parseShelfText('Hämtas senast 3 jan.', today).until, '2027-01-03', 'no year: the next 3 January');
  assert.equal(datesIn('levererad 28 dec', '2027-01-02')[0].key, '2026-12-28', 'no year, just gone: last year');
  const bare = parseShelfText('Ditt paket har kommit till ombudet. Kod 4821', today);
  assert.deepEqual([bare.until, bare.code, bare.kind], [null, '4821', 'parcel'], 'no date in the text: the form asks');
  assert.equal(codeIn('Visa QR-koden 99887766 i appen.'), null, 'a QR code is not the code');
  assert.equal(codeIn('Kod giltig till 2026'), null, 'a year is not a code');
  assert.equal(codeIn('Din kod är 0042 för boxen'), '0042');

  // an online order's return window: 14 days from the day after delivery, a weekend or red last day moves on
  const order = parseShelfText('Hej! Din beställning från Ellos levererades 5 november.', today);
  assert.deepEqual([order.kind, order.delivered, order.until], ['return', '2026-11-05', null]);
  assert.equal(returnBy('2026-11-05'), '2026-11-19');
  assert.equal(returnBy('2026-11-07'), '2026-11-23', 'a Saturday last day moves to Monday');
  assert.equal(returnBy('2026-12-10'), '2026-12-28', 'julafton and the red days after it move it on');
  const back = parseShelfText('Your parcel was delivered by PostNord on Nov 5. Return before 19 November 2026.', today);
  assert.deepEqual([back.kind, back.delivered, back.until], ['return', '2026-11-05', '2026-11-19']);
  const loan = parseShelfText('Påminnelse från Stockholms stadsbibliotek: Lånet "Kallocain" ska återlämnas senast 2026-11-28.', today);
  assert.deepEqual([loan.kind, loan.until, loan.title], ['loan', '2026-11-28', 'Library loan · Kallocain']);

  // the shelf: soonest first, a return gets its ångerrätt day, one opt-in reminder worked out from when it was added
  const addAt = new Date(2026, 10, 7, 12).getTime();
  let sh = withShelfItem(base, { kind: 'return', title: 'Return · Ellos', delivered: '2026-11-05', remind: true }, 'x1', addAt);
  assert.equal(sh.shelf![0].until, '2026-11-19');
  sh = withShelfItem(sh, { kind: 'parcel', title: 'Parcel · PostNord', code: '48-29 13', until: '2026-11-08', remind: true }, 'x2', addAt);
  assert.equal(sh.shelf![1].code, '482913');
  assert.equal(withShelfItem(sh, { kind: 'parcel', title: '  ' }, 'x3', addAt), sh);
  assert.deepEqual(shelfList(sh, addAt).map((x) => x.id), ['x2', 'x1']);
  assert.equal(deadlineText(sh.shelf![1], today), 'pick up by tomorrow');
  assert.deepEqual(shelfRemindAt(sh.shelf![0], 7), new Date(2026, 10, 18, 18), 'the evening before');
  const late = withShelfItem(base, { kind: 'parcel', title: 'P', until: '2026-11-08', remind: true }, 'x4', new Date(2026, 10, 7, 19).getTime());
  assert.deepEqual(shelfRemindAt(late.shelf![0], 7), new Date(2026, 10, 8, 8), 'added after that: the morning of');
  assert.equal(shelfRemindAt(withShelfItem(base, { kind: 'parcel', title: 'P', until: '2026-11-08' }, 'x5', addAt).shelf![0], 7), null, 'opt-in only');
  const pings = shelfPings(sh, new Date(addAt));
  assert.deepEqual(pings.map((p) => p.id).sort(), ['shelf-x1', 'shelf-x2']);
  assert.ok(pings.every((p) => isPlanned(p.id)), 'a planned prefix: replanned, quiet in the Kalle Anka hour');
  assert.equal(pings.find((p) => p.id === 'shelf-x2')?.code, '482913');
  assert.equal(shelfPings(withShelfDone(sh, 'x2', true, addAt), new Date(addAt)).length, 1, 'picked up: no reminder');
  for (const k of ['shelfRemindPickup', 'shelfRemindReturn', 'shelfRemindLoan', 'choreDone', 'choreSkipped', 'reviewIntro', 'reviewSealed', 'zombieBurned', 'horizonLater', 'horizonSomeday', 'horizonWaiting', 'shelfAdded', 'shelfDone'] as const) {
    assert.ok(LINES[k].mild.length >= 2 && LINES[k].savage.length >= 2, k);
  }

  // the War room: Sunday closes the week (Monday morning still does), sealing pays coins once a week and never XP
  const sun = new Date(2026, 10, 8, 10);
  assert.equal(reviewWeek(sun), '2026-11-02');
  assert.equal(reviewWeek(new Date(2026, 10, 9, 9)), '2026-11-02', 'Monday morning closes last week');
  assert.equal(reviewWeek(new Date(2026, 10, 9, 13)), null);
  assert.equal(reviewWeek(new Date(2026, 10, 11, 10)), null);
  assert.deepEqual([planWeekOf(sun), planWeekOf(new Date(2026, 10, 9, 9))], ['2026-11-09', '2026-11-09']);
  const rv: AdminState = { ...base, coins: 0, coinsEarned: 0 };
  const sealed = withReviewSealed(rv, sun);
  assert.deepEqual([sealed.coins, sealed.state.coins, sealed.state.xp], [REVIEW_COINS, REVIEW_COINS, rv.xp], 'coins, never XP');
  assert.equal(withReviewSealed(sealed.state, new Date(2026, 10, 9, 9)).coins, 0, 'once a week: Monday morning is the same week');
  assert.equal(withReviewSealed(sealed.state, new Date(2026, 10, 15, 10)).coins, REVIEW_COINS, 'next Sunday pays again');
  assert.equal(withReviewSealed(rv, new Date(2026, 10, 11, 10)).coins, 0, 'midweek pays nothing');
  assert.equal(reviewPrompt(rv, sun), '2026-11-02');
  assert.equal(reviewPrompt({ ...rv, dismissed: ['review:2026-11-02'] }, sun), null, 'closed for the week');
  assert.equal(reviewPrompt(sealed.state, sun), null);
  assert.equal(reviewPrompt(rv, new Date(2026, 10, 11, 10)), null, 'only on Sunday and Monday morning');
  let many = rv;
  for (let i = 0; i < 15; i++) many = withReviewSealed(many, new Date(2026, 10, 8 + 7 * i, 10)).state;
  assert.deepEqual([many.reviews?.length, many.coins], [12, 15 * REVIEW_COINS], 'kept only to pay once; skipped weeks simply pay nothing');

  // the week's done list
  const doneAtTue = new Date(2026, 10, 3, 9).getTime();
  const dw: AdminState = { ...rv, days: { '2026-11-03': { ...emptyDay(), doneTasks: [{ id: 'a', at: doneAtTue, title: 'Tax form' }] }, '2026-10-30': { ...emptyDay(), doneTasks: [{ id: 'b', at: doneAtTue, title: 'Old' }] } } };
  assert.deepEqual(weekDone(dw, '2026-11-02', sun).map((x) => x.title), ['Tax form']);

  // zombies: active a week or more since they became active again; a first step, the bonfire (no XP)
  const task = (id: string, created: Date, extra: Partial<AdminTask> = {}): AdminTask => ({ id, title: id, done: false, createdAt: created.getTime(), ...extra });
  const zt: AdminState = {
    ...rv,
    tasks: [
      task('z1', new Date(2026, 9, 1, 12)),
      task('z2', new Date(2026, 10, 6, 12)),
      task('z3', new Date(2026, 9, 1, 12), { horizon: { kind: 'someday', at: 0 } }),
      task('z4', new Date(2026, 9, 1, 12), { horizon: { kind: 'later', until: '2026-11-05', at: 0 } }),
    ],
  };
  assert.deepEqual(zombiesOf(zt, sun.getTime()).map((t) => t.id), ['z1'], 'Someday is no zombie, and z4 is active only since the 5th');
  assert.equal(withFirstStep(zt, 'z1', '  open   the form ').tasks[0].step, 'open the form');
  const burned = withBurned(zt, 'z1', sun.getTime());
  assert.deepEqual([burned.tasks.some((t) => t.id === 'z1'), burned.days['2026-11-08']?.burned, burned.xp], [false, 1, zt.xp]);

  // next week's calendar: a meeting that runs into gym time is flagged, the workout can move to a free day of that week
  const mtg = (day: number, h1: number, h2: number): CalEvent => ({ key: `e${day}`, title: 'Board meeting', start: new Date(2026, 10, day, h1).getTime(), end: new Date(2026, 10, day, h2).getTime(), allDay: false, location: null, calendarId: 'c' });
  const clashes = gymClashes(rv, [mtg(10, 16, 18), mtg(12, 9, 10)], '2026-11-09', sun);
  assert.deepEqual(clashes.map((c) => [c.day, c.workout]), [['2026-11-10', 'Pull']], 'Tuesday until 18:00 clashes, a morning meeting does not');
  assert.deepEqual(clashes[0].moveTo, ['2026-11-11', '2026-11-14', '2026-11-15']);
  const moved = withAheadMove(rv, '2026-11-10', '2026-11-11', sun.getTime());
  assert.equal(moved.workoutMoves?.at(-1)?.why, 'late', 'no "what got in the way?" afterwards');
  assert.equal(workoutFor(moved, new Date(2026, 10, 10, 12)), null);
  assert.equal(workoutFor(moved, new Date(2026, 10, 11, 12))?.name, 'Pull');
  assert.equal(withAheadMove(rv, '2026-11-10', '2026-11-12', sun.getTime()), rv, 'not onto another workout day');
  assert.deepEqual(aheadTargets(rv, '2026-11-17', '2026-11-08'), [], 'two weeks ahead: no');
  assert.deepEqual(aheadTargets(rv, '2026-11-10', '2026-11-07'), [], 'on Saturday next week is not open yet');
  assert.ok(aheadTargets(rv, '2026-11-12', '2026-11-09').length > 0, 'this week: the usual move rules');

  // the week's big ones: 1–3 real tasks, shown on Plan for that week (next week's on Sunday)
  const wb = withWeekBig(zt, '2026-11-09', ['z1', 'z2', 'z1', 'nope', 'z4']);
  assert.deepEqual(wb.weekBig, { week: '2026-11-09', ids: ['z1', 'z2', 'z4'] });
  assert.equal(weekBigOn(wb, '2026-11-08')?.next, true);
  assert.equal(weekBigOn(wb, '2026-11-10')?.next, false);
  assert.equal(weekBigOn(wb, '2026-11-16'), null);
  assert.equal(weekBigOn(wb, '2026-11-07'), null);

  // horizons: "Not today" hides until its day, then the zombie age counts from that day
  const nowH = new Date(2026, 10, 7, 12).getTime();
  const hz: AdminState = { ...rv, tasks: [task('h1', new Date(2026, 9, 1, 12), { title: 'Call the bank' })] };
  const later = withHorizon(hz, 'h1', { kind: 'later', until: '2026-11-10' }, nowH);
  assert.equal(placeOf(later.tasks[0], '2026-11-07'), 'later');
  assert.deepEqual(activeTasks(later, '2026-11-09'), []);
  assert.equal(activeTasks(later, '2026-11-10').length, 1, 'back on its day');
  assert.equal(activeSinceOf(later.tasks[0]), new Date(2026, 10, 10, 0).getTime());
  assert.equal(taskAgeDays(later.tasks[0], new Date(2026, 10, 12, 12).getTime()), 2);
  assert.equal(immortalTask(later, new Date(2026, 10, 8, 12).getTime()), null, 'a hidden task is no zombie');
  assert.equal(immortalTask(hz, nowH)?.task.id, 'h1');
  assert.equal(withHorizon(hz, 'h1', { kind: 'later', until: '2026-11-07' }, nowH), hz, 'later needs a day ahead');
  // Someday: out of the count for good, out of the bonfire; back by hand, the zombie clock starts again
  const sd = withHorizon(hz, 'h1', { kind: 'someday' }, nowH);
  assert.deepEqual(onHorizon(sd, 'someday', '2027-06-01').map((t) => t.id), ['h1']);
  assert.equal(activeTasks(sd, '2027-06-01').length, 0);
  assert.deepEqual([staleTasks(sd, nowH).length, staleTasks(hz, nowH).length], [0, 1]);
  const again = withHorizon(sd, 'h1', null, nowH + 1000);
  assert.deepEqual([again.tasks[0].activeSince, taskAgeDays(again.tasks[0], nowH + 1000), isActive(again.tasks[0], today)], [nowH + 1000, 0, true]);
  assert.equal(withHorizon(later, 'h1', null, new Date(2026, 10, 12, 12).getTime()).tasks[0].activeSince, new Date(2026, 10, 10, 0).getTime(), 'a horizon that ran out keeps its day');
  // Waiting on: held until the chase day, then a task again ("Chase: …")
  const wt = withWaiting(hz, ' Försäkringskassan reply ', '2026-11-14', 'w1', nowH);
  assert.equal(wt.tasks[0].title, 'Försäkringskassan reply');
  assert.ok(!isActive(wt.tasks[0], '2026-11-13') && chasing(wt.tasks[0], '2026-11-14'));
  assert.equal(taskLabel(wt.tasks[0], '2026-11-14'), 'Chase: Försäkringskassan reply');
  assert.equal(taskLabel(wt.tasks[0], '2026-11-13'), 'Försäkringskassan reply');
  assert.equal(withWaiting(hz, 'Reply', '2026-11-07', 'w2', nowH), hz, 'a chase day must be ahead');
  assert.deepEqual(horizonDays('2026-11-08').map((d) => d.key), ['2026-11-09', '2026-11-11', '2026-11-15', '2026-11-22'], "from Sunday, tomorrow is next Monday: offered once");
  // quests, contracts and booked slots leave hidden tasks out
  const tasksGoal = CONTRACT_GOALS.find((g) => g.id === 'tasks')!;
  assert.ok(tasksGoal.available(hz) && !tasksGoal.available(sd), "a contract on tasks needs an active one");
  const drafts = (x: AdminState) => Array.from({ length: 40 }, (_, i) => draftFor(x, new Date(2027, 1, 1 + i, 9)).candidates).flat();
  assert.ok(!drafts(sd).includes('tasks') && drafts(hz).includes('tasks'), 'the task quest needs an active task');
  const slotDay = '2026-11-09';
  const slotAt = new Date(2026, 10, 9, 14).getTime();
  const booked: AdminState = { ...later, slotPlans: [{ id: 'sp', day: slotDay, at: slotAt, end: slotAt + 3_600_000, kind: 'task', taskId: 'h1' }] };
  assert.equal(slotReminders(booked, new Date(2026, 10, 8, 12), 3).length, 0, 'no ping for a task hidden that day');
  assert.equal(slotReminders({ ...booked, tasks: hz.tasks }, new Date(2026, 10, 8, 12), 3).length, 1);
}
step9AdminTests();

// ---------- step 9 tank: nights out, rare guests, sten sax påse, hatch day ----------
function step9TankTests() {
  const DAY = 86_400_000;
  const noonOf = (k: string) => new Date(`${k}T12:00`);
  const next = (k: string, n = 1) => dayKey(addDays(noonOf(k), n));
  const base = { ...defaultState(), onboarded: true };

  // ---- nights out: 2 or 3 a week, seeded per week, never from sleep ----
  let monday = '2026-11-02';
  for (let w = 0; w < 60; w++, monday = next(monday, 7)) {
    const m = tripMornings(monday);
    assert.ok(m.length === 2 || m.length === 3, `${monday}: ${m.length} nights out`);
    assert.deepEqual(tripMornings(monday), m, 'seeded');
    assert.ok(m.every((d) => d >= monday && d <= next(monday, 6) && tripPlanned(d)));
  }
  const week = tripMornings('2026-11-09');
  const tripDay = week[0];
  const homeDay = [0, 1, 2, 3, 4, 5, 6].map((i) => next('2026-11-09', i)).find((d) => !week.includes(d))!;
  const evening = next(tripDay, -1);
  assert.ok(tripOn(base, tripDay) && !tripOn(base, homeDay));
  const slept = { ...base, days: { [tripDay]: { ...emptyDay(), sleepMin: 190, sleepRating: 1 as const }, [evening]: { ...emptyDay(), sleepMin: 600 } } };
  assert.ok(tripOn(slept, tripDay), 'how she slept has nothing to do with it');
  // a kind night it stays home: a low mood that evening, a sick day, Julfrid
  const low = { ...base, days: { [evening]: { ...emptyDay(), moods: [{ id: 'm', level: 2 as const, emotions: [], at: noonOf(evening).getTime() }] } } };
  assert.ok(!tripOn(low, tripDay));
  assert.ok(!tripOn({ ...base, pauses: [{ from: tripDay, to: tripDay, kind: 'sick' as const }] }, tripDay));
  for (const d of ['2026-12-24', '2026-12-25', '2026-12-26', '2026-12-27']) assert.ok(!tripOn(base, d), `Julfrid: ${d}`);
  // which night it is, and when it's over (the watch's wake time, else the usual hour)
  assert.equal(morningOf(new Date(2026, 10, 10, 23, 30)), '2026-11-11');
  assert.equal(morningOf(new Date(2026, 10, 11, 3)), '2026-11-11');
  const at = (k: string, h: number, m = 0) => new Date(`${k}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  assert.ok(!nightOver(base, tripDay, at(tripDay, 6, 30)) && nightOver(base, tripDay, at(tripDay, 7, 5)));
  assert.ok(nightOver(base, tripDay, at(tripDay, 6, 30), at(tripDay, 6, 10).getTime()), 'up early, by the watch');
  assert.ok(nightOver(base, evening, at(tripDay, 3)), 'an earlier morning is over');
  // the tank: empty through her sleep window on a night out, asleep on a thread on any other night
  const out = tankLifeOf(base, { now: at(tripDay, 3).getTime() });
  assert.equal(out.mode, 'out');
  assert.equal(tankLifeOf(base, { now: at(homeDay, 3).getTime() }).mode, 'sleep');
  assert.equal(tankLifeOf(base, { now: at(evening, 23, 30).getTime() }).mode, 'out', 'gone from bedtime');
  assert.equal(tankLifeOf(low, { now: at(tripDay, 3).getTime() }).mode, 'sleep', 'a kind night it stays');
  assert.equal(tankMode({ focus: true, game: false, asleep: true, storm: false, kind: false, out: true }), 'focus', 'Web Focus still comes first');
  // back in the morning with a souvenir and a two-line story; nothing once it's afternoon
  const back = backThisMorning(base, at(tripDay, 8));
  assert.ok(back && back.souvenir.id === souvenirFor(tripDay).id && back.story.length === 2 && back.story.every((x) => x.length > 10 && !x.includes('{')));
  assert.equal(backThisMorning(base, at(tripDay, 6)), null, 'not before she is up');
  assert.equal(backThisMorning(base, at(tripDay, 13)), null);
  assert.equal(backThisMorning(base, at(homeDay, 8)), null);
  // souvenirs fit the night's month (seeded per night)
  for (let i = 0; i < 400; i++) {
    const d = next('2026-11-07', i);
    const sv = souvenirFor(d);
    const month = noonOf(next(d, -1)).getMonth() + 1;
    assert.ok(!sv.months || sv.months.includes(month), `${d}: ${sv.id}`);
    assert.equal(souvenirFor(d), sv);
  }
  assert.ok(new Set(SOUVENIRS.map((x) => x.id)).size === SOUVENIRS.length);
  // the story: the season (or that evening's holiday) and the night's real weather
  assert.deepEqual(storyKeys('2026-12-14', null), { where: 'tripFeast', weather: 'tripNoWeather', feast: 'Lucia' });
  assert.equal(storyKeys('2026-11-12', { t: 4, code: 3 }).where, 'tripAutumn');
  assert.equal(storyKeys('2027-01-20', { t: -2, code: 73 }).weather, 'tripSnow');
  assert.equal(storyKeys('2027-01-20', { t: -6, code: 0 }).weather, 'tripFrost');
  assert.equal(storyKeys('2027-07-20', { t: 15, code: 1 }).weather, 'tripWarm');
  assert.equal(storyKeys('2027-07-20', { t: 15, code: 61 }).weather, 'tripRain');
  assert.equal(storyKeys('2027-07-20', { t: 9, code: 45 }).weather, 'tripFog');
  assert.equal(storyKeys('2027-04-20', { t: 5, code: 2 }).where, 'tripSpring');
  assert.deepEqual([degrees(-4.6), degrees(3.2), degrees(-0.2)], ['−5°', '3°', '0°']);
  const story = tripStory({ night: '2027-01-20', id: 'sl_ticket', t: -6, code: 0 });
  assert.ok(story[0].includes('an SL ticket') && story[1].includes('−6°'), story.join(' / '));
  assert.deepEqual(tripStory({ night: '2027-01-20', id: 'sl_ticket', t: -6, code: 0 }), story, 'the same story every time');
  // the shelf: each night out once, the weather kept for its story, looks only
  const fc = [{ date: tripDay, max: 2, min: -3, rainPct: 0, code: 71, rainMm: 0, sunrise: 0, sunset: 0, daylightMin: 480, sunshineMin: 0 }];
  const s1 = settleTrips(base, at(tripDay, 8), { forecast: fc });
  assert.deepEqual(s1.back.map((x) => [x.night, x.id, x.t, x.code]), [[tripDay, souvenirFor(tripDay).id, -3, 71]]);
  assert.deepEqual([s1.state.trips?.since, s1.state.trips?.checked, s1.state.trips?.total, s1.state.xp, s1.state.coins], [tripDay, tripDay, 1, base.xp, base.coins]);
  assert.equal(settleTrips(s1.state, at(tripDay, 9)).state, s1.state, 'once');
  assert.ok(!tripsDue(s1.state, at(tripDay, 9)) && tripsDue(s1.state, at(next(tripDay), 9)));
  assert.equal(settleTrips(base, at(tripDay, 6)).state.trips?.checked, undefined, 'not before she is up');
  // days without the app: up to TRIP_BACKFILL mornings are looked back on, kind nights left out
  const away = { ...base, trips: { since: '2026-09-01', checked: '2026-09-01', shelf: [], total: 0 } };
  const later = settleTrips(away, at('2026-11-20', 9));
  assert.ok(later.back.length > 0 && later.back.every((x) => x.night >= next('2026-11-20', -TRIP_BACKFILL) && tripPlanned(x.night)));
  assert.equal(later.state.trips?.checked, '2026-11-20');
  assert.equal(settleTrips(low, at(tripDay, 8)).back.length, 0);
  // the tank's shelf shows the newest few
  const many = { ...base, trips: { since: '2026-01-01', shelf: SOUVENIRS.slice(0, 8).map((x, i) => ({ night: `2026-02-${10 + i}`, id: x.id, at: i })), total: 8 } };
  assert.equal(tankLifeOf(many, { now: at('2026-11-12', 12).getTime() }).souvenirs.length, SHELF_SHOWN);

  // ---- rare guests: every 2 or 3 weeks, never two weeks running, one day each ----
  const guestWeeks: string[] = [];
  for (let k = 0, wk = GUEST_EPOCH; k < 160; k++, wk = next(wk, 7)) if (guestWeek(wk)) guestWeeks.push(wk);
  assert.equal(guestWeeks[0], GUEST_EPOCH);
  for (let i = 1; i < guestWeeks.length; i++) {
    const gap = Math.round((noonOf(guestWeeks[i]).getTime() - noonOf(guestWeeks[i - 1]).getTime()) / (7 * DAY));
    assert.ok(gap === 2 || gap === 3, `${guestWeeks[i]}: ${gap} weeks`);
  }
  for (const wk of guestWeeks.slice(0, 30)) {
    const days = [0, 1, 2, 3, 4, 5, 6].map((i) => next(wk, i)).filter((d) => guestOn(base, d));
    assert.deepEqual(days, [guestDayOf(wk)], `one guest day in ${wk}`);
  }
  assert.ok(!guestWeek(next(guestWeeks[3], 7)));
  // who: the spy in a Couch King week, the house spider at jul, the orb weaver only in autumn
  const kingWeek = guestWeeks.find((wk) => wk > '2026-03-01')!;
  assert.equal(guestFor({ ...base, kingWeeks: [kingWeek] }, guestDayOf(kingWeek)), 'spy');
  assert.equal(guestFor(base, '2026-12-20'), 'house');
  assert.equal(guestFor(base, '2027-01-04'), 'house');
  for (let i = 0; i < 200; i++) {
    const d = next('2027-02-01', i);
    const g = guestFor(base, d);
    const m = noonOf(d).getMonth() + 1;
    if (g === 'orb') assert.ok(m === 9 || m === 10, d);
    assert.notEqual(g, 'spy');
  }
  // a guest day: asleep until tapped, then its own voice on the day's logs (kind days: only company)
  const gDay = guestDayOf(guestWeeks.find((wk) => wk > '2026-11-01' && guestFor(base, guestDayOf(wk)) !== 'house')!);
  const gid = guestOn(base, gDay)!;
  assert.ok(gid);
  const woken = withGuestAwake(base, at(gDay, 10));
  assert.deepEqual(woken.guests?.visits, [{ day: gDay, guest: gid, woke: at(gDay, 10).getTime() }]);
  assert.equal(withGuestAwake(woken, at(gDay, 11)), woken, 'once');
  assert.equal(withGuestAwake(base, at(next(gDay), 10)), base, 'no guest, nothing to wake');
  assert.ok(tankLifeOf(woken, { now: at(gDay, 12).getTime() }).guest?.awake && !tankLifeOf(base, { now: at(gDay, 12).getTime() }).guest?.awake);
  const logged = { ...base, days: { [gDay]: { ...emptyDay(), water: [{ id: 'a', ml: 250, at: 1 }, { id: 'b', ml: 250, at: 2 }], food: [{ id: 'f', name: 'Bulle', kcal: 300, protein: 5, at: 3 }], steps: 4200 } } };
  assert.equal(daySummary(logged, gDay), '2 glasses of water and 4.2k steps', 'never food');
  assert.equal(daySummary({ ...base, days: { [gDay]: { ...emptyDay(), food: [{ id: 'f', name: 'x', kcal: 1, protein: 1, at: 1 }] } } }, gDay), null);
  assert.deepEqual(guestLineKey(logged, gid, gDay, at(gDay, 12)), { key: GUESTS[gid].voice, summary: '2 glasses of water and 4.2k steps' });
  const sad = { ...logged, days: { [gDay]: { ...logged.days[gDay], moods: [{ id: 'm', level: 1 as const, emotions: [], at: at(gDay, 9).getTime() }] } } };
  assert.deepEqual(guestLineKey(sad, gid, gDay, at(gDay, 12)), { key: GUESTS[gid].quiet, summary: '' }, 'a kind day: just company');
  assert.equal(guestLineKey(base, gid, gDay, at(gDay, 12)).key, GUESTS[gid].quiet, 'nothing logged: company');
  // Sir Reginald narrates for an hour once woken
  const rDay = guestWeeks.map(guestDayOf).find((d) => d > '2026-11-01' && guestFor(base, d) === 'reginald')!;
  const sir = withGuestAwake(base, at(rDay, 10));
  assert.ok(narrating(sir, at(rDay, 10).getTime() + NARRATE_MS - 60_000) && !narrating(sir, at(rDay, 10).getTime() + NARRATE_MS + 1));
  assert.ok(!narrating(base, at(rDay, 10, 30).getTime()), 'asleep, he says nothing');
  // by the next morning it has gone and left a gift: coins or its keepsake (an owned one pays coins), never XP
  const first = settleGuests(base, at(gDay, 12));
  assert.deepEqual([first.state.guests?.since, first.left.length], [gDay, 0], 'the guestbook starts today');
  const g1 = settleGuests(woken, at(next(gDay), 9));
  assert.equal(g1.left.length, 1);
  const left = g1.left[0];
  assert.ok(left.day === gDay && left.woke && left.gift && (left.gift.coins != null) !== (left.gift.cosmetic != null));
  if (left.gift?.coins) assert.equal(g1.state.coins - woken.coins, left.gift.coins);
  else assert.ok(g1.state.cosmetics?.owned.includes(GUESTS[gid].gift) && g1.state.coins === woken.coins);
  assert.equal(g1.state.xp, woken.xp, 'never XP');
  assert.equal(g1.state.guests?.checked, gDay);
  assert.ok(!guestsDue(g1.state, at(next(gDay), 10)));
  assert.equal(settleGuests(g1.state, at(next(gDay), 10)).left.length, 0, 'once');
  const owned = { ...woken, cosmetics: { owned: Object.values(GUESTS).map((x) => x.gift), worn: {} } };
  const g2 = settleGuests(owned, at(next(gDay), 9));
  assert.ok(g2.left[0].gift?.coins && !g2.left[0].gift.cosmetic, 'a keepsake already owned pays coins');
  // a guest she slept through still leaves its gift, and goes in the book
  const slept2 = settleGuests({ ...base, guests: { since: next(gDay, -3), visits: [] } }, at(next(gDay), 9));
  assert.ok(slept2.left.length === 1 && slept2.left[0].woke == null && slept2.state.guests?.visits.length === 1);

  // ---- sten, sax, påse ----
  const play = (r: RpsState, me: RpsThrow, it: RpsThrow, when = new Date(2026, 10, 9, 12)) => playRound(r, me, it, when);
  let r = emptyRps();
  assert.equal(rpsFinding(r), null, 'nothing to say yet');
  assert.deepEqual(nextOdds(r), { r: 1 / 3, p: 1 / 3, s: 1 / 3 });
  // decided once nobody can catch up: six straight rounds, or all ten
  assert.ok(!decided('rsrsrsrsrs') && decided('rsrsrsrsrsrs') && decided('rr'.repeat(ROUNDS)));
  assert.deepEqual(scoreOf('rspsss'), { you: 1, spider: 1, played: 3 });
  // a won match pays coins, at most RPS_DAILY_COINS a day; a lost one pays nothing; the week keeps the tally
  const winMatch = (x: RpsState, when?: Date) => {
    let res = play(x, 'r', 's', when);
    for (let i = 1; i < 6; i++) res = play(res.rps, 'r', 's', when);
    return res;
  };
  const w1 = winMatch(r);
  assert.deepEqual([w1.ended, w1.coins, w1.rps.live, w1.rps.past.length], ['won', RPS_WIN_COINS, undefined, 1]);
  const w2 = winMatch(w1.rps);
  const w3 = winMatch(w2.rps);
  assert.deepEqual([w2.coins, w3.coins, w3.rps.paid?.coins], [RPS_WIN_COINS, 0, RPS_DAILY_COINS], 'the daily cap');
  assert.equal(winMatch(w3.rps, new Date(2026, 10, 10, 12)).coins, RPS_WIN_COINS, 'a new day');
  let lost = play(w3.rps, 's', 'r');
  for (let i = 1; i < 6; i++) lost = play(lost.rps, 's', 'r');
  assert.deepEqual([lost.ended, lost.coins], ['lost', 0]);
  assert.deepEqual(weekTally(lost.rps, new Date(2026, 10, 12)), { w: 3, l: 1, d: 0 });
  assert.deepEqual(weekTally(lost.rps, new Date(2026, 10, 17)), { w: 0, l: 0, d: 0 }, 'a new week starts at 0');
  // it learns: someone who always throws rock gets paper
  r = emptyRps();
  for (let m = 0; m < 3; m++) for (let i = 0; i < 6; i++) r = play(r, 'r', 's').rps;
  assert.equal(guessOf(r), 'r');
  assert.equal(spiderThrow(r, () => 0.5), 'p');
  // what she opens with, quoted with the real number
  r = emptyRps();
  for (let m = 0; m < 10; m++) {
    r = play(r, m < 8 ? 'r' : 'p', 'r').rps;
    for (let i = 0; i < 9; i++) r = play(r, 'r', 'r').rps; // draws to the end
  }
  assert.equal(rpsFinding(r), 'You open with rock 80% of the time.');
  assert.equal(guessOf(r), 'r');
  // after losing a round she goes scissors: the spider knows, and says so
  r = emptyRps();
  for (let m = 0; m < 10; m++) {
    r = play(r, 'p', 's').rps; // she loses
    r = play(r, 's', 'p').rps; // and goes scissors (two matches of ten, never decided early)
  }
  assert.deepEqual([r.past.length, r.live], [2, undefined]);
  r = play(r, 'p', 's').rps; // she just lost again
  assert.match(rpsFinding(r) ?? '', /^After losing a round you go scissors \d+% of the time\.$/);
  assert.equal(guessOf(r), 's');
  assert.equal(BEATEN_BY[guessOf(r)], 'r');
  // a player on a fixed cycle (rock, paper, scissors) loses more rounds than she wins
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  r = emptyRps();
  let you = 0;
  let it = 0;
  const cycle: RpsThrow[] = ['r', 'p', 's'];
  for (let k = 0; k < 300; k++) {
    const spider = spiderThrow(r, rnd);
    const res = playRound(r, cycle[k % 3], spider, new Date(2026, 10, 9, 12));
    if (res.outcome === 'win') you++;
    if (res.outcome === 'loss') it++;
    r = res.rps;
  }
  assert.ok(it > you * 1.5, `the spider reads the cycle: ${it} to ${you}`);
  assert.ok(throwCount(r) <= RPS_KEEP + ROUNDS, `kept throws: ${throwCount(r)}`);
  assert.ok(habitsOf(r).all.r > 0);

  // ---- hatch day and the hundreds: a party, gentle on a rough day ----
  assert.deepEqual(
    [anniversaryYears('2025-03-14', '2026-03-14'), anniversaryYears('2025-03-14', '2026-03-15'), anniversaryYears('2025-03-14', '2025-03-14'), anniversaryYears('2024-02-29', '2025-02-28'), anniversaryYears('2024-02-29', '2028-02-29'), anniversaryYears('2024-02-29', '2028-02-28')],
    [1, 0, 0, 1, 4, 0],
  );
  const used: SweState['days'] = {};
  for (let i = 0; i < 210; i++) {
    const k = next('2026-01-01', i * 2); // every other day: a total, never a run
    used[k] = { ...emptyDay(), water: [{ id: `w${i}`, ml: 250, at: noonOf(k).getTime() }] };
  }
  const hs = { ...base, days: used };
  const d100 = next('2026-01-01', 99 * 2);
  assert.equal(dayNumber(hs, d100), PARTY_EVERY);
  assert.equal(dayNumber(hs, next(d100)), 0, 'a day with nothing logged has no number');
  assert.deepEqual(partyOn(hs, d100, noonOf(d100)), { day: d100, kind: 'hundred', n: 100, gentle: false });
  assert.equal(partyOn(hs, next(d100, -2), noonOf(d100)), null, 'day 99');
  assert.equal(partyOn(hs, next('2026-01-01', 199 * 2), noonOf(d100))?.n, 200);
  assert.deepEqual(partyOn(hs, '2027-01-01', noonOf('2027-01-01')), { day: '2027-01-01', kind: 'year', n: 1, gentle: false }, 'hatch day comes round');
  const rough = { ...hs, days: { ...hs.days, [d100]: { ...hs.days[d100], moods: [{ id: 'm', level: 1 as const, emotions: [], at: noonOf(d100).getTime() }] } } };
  assert.equal(partyOn(rough, d100, noonOf(d100))?.gentle, true, 'a rough day: the gentle party');
  assert.equal(partyOn(base, d100), null, 'nothing logged, no hatch day');
  // the tank: cake and tiny rivals, none on a gentle day
  assert.deepEqual(tankLifeOf(hs, { now: noonOf(d100).getTime() }).party, { gentle: false, guests: 3, candles: 1 });
  assert.deepEqual(tankLifeOf(rough, { now: noonOf(d100).getTime() }).party, { gentle: true, guests: 0, candles: 1 });
  // the scroll of firsts: in order, never food, the body, mood or sleep; the task still alive only on a normal day
  const t0 = noonOf('2026-01-01').getTime();
  const fs = {
    ...hs,
    days: { ...hs.days, '2026-01-03': { ...hs.days['2026-01-03'], sets: [{ id: 's', exercise: 'Squat', weight: 40, reps: 5, at: t0 + 2 * DAY }], food: [{ id: 'f', name: 'x', kcal: 1, protein: 1, at: t0 }], sleepMin: 400 } },
    flies: { house_fly: { firstAt: t0 + 5 * DAY, count: 2 } },
    achievements: { first_sip: t0 + DAY },
    bossKilledAt: { '2026-01-05': t0 + 9 * DAY },
    tasks: [{ id: 'old', title: 'Fix the bike', done: false, createdAt: t0 }],
  };
  const scroll = firstsOf(fs, { now: t0 + 30 * DAY });
  assert.deepEqual(scroll.slice(0, 3).map((f) => f.label), ['First glass of water', "First trophy: Baby's First Sip", 'First workout']);
  assert.ok(scroll.some((f) => f.label === 'First workout' && f.at === t0 + 2 * DAY));
  assert.ok(scroll.some((f) => f.label.startsWith('First fly caught')) && scroll.some((f) => f.label === 'First boss beaten'));
  for (let i = 1; i < scroll.length - 1; i++) assert.ok(scroll[i].at >= scroll[i - 1].at, 'oldest first');
  assert.match(scroll.at(-1)?.label ?? '', /Fix the bike.*still alive/);
  assert.ok(!firstsOf(fs, { now: t0 + 30 * DAY, gentle: true }).some((f) => f.emoji === '🧟'), 'nothing cheeky on a gentle day');
  for (const f of scroll) assert.ok(!/food|meal|kcal|weigh|body|mood|sleep/i.test(f.label), f.label);

  // ---- the 3D world: an empty tank, the shelf, a guest, the party, a throw ----
  const life = (o: Partial<TankLife>): TankLife => ({ ...IDLE_LIFE, ...o });
  let s3 = 3;
  const w = createWorld({ ids: ['web', 'lamp', 'rug', 'plant', 'couch', 'books', 'rack', 'radio', 'fireplace', 'arcade'], next: null, marking: '#E23636', background: '#10141F', random: () => (s3 = (s3 * 16807) % 2147483647) / 2147483647 });
  const runW = (sec: number, each?: () => void) => {
    for (let i = 0; i < sec * 30; i++) {
      w.step(1 / 30);
      each?.();
    }
  };
  const ndc = (p: THREE.Vector3) => {
    const q = p.clone().project(w.camera);
    return [(q.x + 1) / 2, (1 - q.y) / 2] as const;
  };
  runW(2);
  w.setLife(life({ mode: 'out', daylight: 0, light: lighting(0, false) }));
  runW(5);
  assert.deepEqual([w.shown().home, w.shown().note, w.act()], [false, true, null], 'out: an empty tank and a note');
  const [ox, oy] = ndc(w.pose().pos.add(new THREE.Vector3(0, 0.4, 0)));
  assert.notEqual(w.pick(ox, oy), 'spider', 'nobody home to poke');
  w.sign('✊');
  runW(0.2);
  assert.equal(w.act(), null, 'no game while it is out');
  w.setLife(life({}));
  runW(0.5);
  assert.deepEqual([w.shown().home, w.shown().note], [true, false], 'back');
  assert.ok(['home', 'rug'].includes(w.spotId()) || w.busy() === null);
  // the souvenir shelf
  w.setLife(life({ souvenirs: SOUVENIRS.slice(0, 3).map((x) => ({ shape: x.shape, color: x.color })) }));
  assert.equal(w.shown().shelf, 3);
  w.setLife(life({ souvenirs: SOUVENIRS.slice(0, 10).map((x) => ({ shape: x.shape, color: x.color })) }));
  assert.equal(w.shown().shelf, 10);
  // a guest: curled up asleep, a tap wakes it
  w.setLife(life({ mode: 'sleep', daylight: 0, light: lighting(0, false), guest: { id: 'reginald', awake: false, look: GUESTS.reginald.look } }));
  runW(40);
  assert.ok(w.shown().guest === 'reginald' && w.shown().guestCurl > 0.9, 'asleep in the corner');
  const gp = w.scene.getObjectByName('guest-spider')!;
  assert.ok(Math.abs(gp.position.x) < TANK.w / 2 && Math.abs(gp.position.z) < TANK.d / 2);
  const [gx, gy] = ndc(gp.position.clone().add(new THREE.Vector3(0, 0.3, 0)));
  assert.equal(w.pick(gx, gy), 'guest');
  w.greetGuest();
  w.setLife(life({ mode: 'sleep', daylight: 0, light: lighting(0, false), guest: { id: 'reginald', awake: true, look: GUESTS.reginald.look } }));
  runW(3);
  assert.ok(w.shown().guestCurl < 0.1, 'awake');
  for (const id of ['jumper', 'orb', 'house', 'spy'] as const) {
    w.setLife(life({ guest: { id, awake: false, look: GUESTS[id].look } }));
    runW(0.3);
    assert.equal(w.shown().guest, id);
  }
  w.setLife(life({}));
  assert.equal(w.shown().guest, null);
  // the party: a cake, tiny rivals in hats, and the spider reads its scroll at the cake
  w.setLife(life({ party: { gentle: false, guests: 3, candles: 2 } }));
  assert.deepEqual([w.shown().cake, w.shown().partyGuests], [true, 3]);
  let read = false;
  runW(90, () => {
    if (w.act() === '📜' && w.spotId() === 'party' && w.shown().scroll) read = true;
  });
  assert.ok(read, 'reading the scroll of firsts by the cake');
  w.setLife(life({ party: { gentle: true, guests: 0, candles: 1 } }));
  assert.deepEqual([w.shown().cake, w.shown().partyGuests], [true, 0], 'gentle: just the cake');
  w.setLife(life({}));
  assert.equal(w.shown().cake, false);
  // its throw in sten, sax, påse, shown over its head
  w.sign('✌️');
  runW(0.2);
  assert.equal(w.act(), '✌️');
  runW(4);
  assert.equal(w.busy(), null, 'then back to its day');
  w.collect();
  w.dispose();
}
step9TankTests();

// step 9 story: once-only remarks, the mailbox, big days, intercepted memos, the other timeline
function step9StoryTests() {
  const base = (): SweState => ({ ...defaultState(), onboarded: true, settings: { ...defaultState().settings, userName: 'Elena' } });
  const at9 = new Date(2026, 10, 9, 10); // Monday 9 Nov 2026
  const glasses = (n: number, day = '2026-11-02') => Array.from({ length: n }, (_, i) => ({ id: `w${day}${i}`, ml: 250, at: new Date(`${day}T12:00`).getTime() + i }));

  // ---- remarks: 100+, unique, house rules ----
  assert.ok(REMARKS.length >= 100, `${REMARKS.length} remarks`);
  assert.equal(new Set(REMARKS.map((r) => r.id)).size, REMARKS.length, 'remark ids are unique');
  const texts = REMARKS.flatMap((r) => [r.text, ...(r.kind ? [r.kind] : [])]);
  assert.equal(new Set(texts).size, texts.length, 'remark texts are unique');
  const linesSaid = new Set(Object.values(LINES).flatMap((p) => [...p.mild, ...p.savage]));
  for (const t of texts) {
    assert.ok(!linesSaid.has(t), `remark repeats a line: ${t}`);
    assert.ok(!/\b(bold|excuse|suspicious|houseplant|draft|streak)|\bcouch\b|look at you|missing person|painfully mid|fil(ed|ing) a\b|who are you|who replaced you|in a row/i.test(t), `house words: ${t}`);
    assert.ok(!/\b(weight|kg|kcal|calorie|protein|diet|body|mood|period|sleep)\b/i.test(t), `body, food or mood in a remark: ${t}`);
    for (const m of t.matchAll(/\{(\w+)\}/g)) assert.equal(m[1], 'name', `${t}: only {name}`);
  }
  for (const r of REMARKS) for (const k of r.replaces ?? []) assert.ok(k in LINES, `${r.id} replaces ${k}`);
  // no condition counts consecutive days: the module never walks from one day to the next
  const remarkSrc = readFileSync(join(process.cwd(), 'src/lib/remarks.ts'), 'utf8');
  assert.ok(!/streak|consecutive|in a row|inarow|addDays|-\s*1\s*\)/i.test(remarkSrc), 'remarks.ts looks at days one by one, never in sequence');
  // ...and no condition reads the body log, photos, food, mood, periods or check-ins: factsOf runs on a state that records every field it touches
  const touched = new Set<string>();
  const watch = <T,>(o: T): T =>
    o && typeof o === 'object'
      ? (new Proxy(o as object, {
          get(t, k, r) {
            if (typeof k === 'string') touched.add(k);
            return watch(Reflect.get(t, k, r));
          },
        }) as T)
      : o;
  const rich = base();
  rich.bodyLog = [{ id: 'b', at: 1, weight: 70, waist: 80 }];
  rich.progressPhotos = [{ id: 'p', uri: 'x', at: 1 }];
  rich.tasks = [{ id: 't', title: 'Taxes', done: true, createdAt: 0, doneAt: 5e9, firstDoneAt: 5e9 }, { id: 'u', title: 'Open', done: false, createdAt: 0 }];
  rich.days['2026-11-02'] = {
    ...emptyDay(),
    water: glasses(3),
    food: [{ id: 'f', name: 'Bun', kcal: 300, protein: 5, at: 1 }],
    moods: [{ id: 'm', level: 2, emotions: ['tired'], note: 'meh', at: 1 }],
    period: { flow: 'light', symptoms: [] },
    sleepRating: 2,
    energy: 2,
    sets: [{ id: 's', exercise: 'Squat', weight: 60, reps: 5, at: new Date('2026-11-02T21:30').getTime() }],
    coffee: [{ id: 'c', mg: 90, at: 1 }],
    activities: [{ id: 'a', kind: 'cardio', minutes: 30, at: 1 }],
    focus: [{ id: 'x', start: 0, end: 1, minutes: 40 }],
    games: [{ start: 0, end: 3_600_000 }],
    workoutCounted: true,
    weather: { max: -8, min: -12, rainMm: 0, sunMin: 0, code: 73 },
    doneTasks: [{ id: 't', at: 5e9, since: 0 }],
    shot: { q: 'gym', call: 'no', p: 0.1, at: 1, result: 'hit' },
    chest: { kind: 'coins', amount: 5, text: '', gold: true },
    habits: ['h'],
    steps: 21000,
  };
  rich.bossesDefeated = { '2026-11-02': 'snooze' };
  rich.bossKilledAt = { '2026-11-02': new Date('2026-11-03T10:00').getTime() };
  rich.bossNames = { '2026-09-07': 'Bob' };
  rich.lastRollover = '2026-11-02';
  rich.flies = { house_fly: { firstAt: 1, count: 3 } };
  const facts = factsOf(watch(rich));
  for (const k of ['bodyLog', 'progressPhotos', 'food', 'moods', 'period', 'sleepRating', 'energy', 'emotions', 'note', 'kcal', 'protein', 'kcalGoal', 'proteinGoal', 'proteinGoalHit']) {
    assert.ok(!touched.has(k), `a remark condition read ${k}`);
  }
  assert.equal(facts.glasses, 3);
  assert.equal(facts.coldTrain, 1);
  assert.equal(facts.snowTrain, 1);
  assert.equal(facts.noChanceHits, 1);
  assert.equal(facts.goldChests, 1);
  assert.ok(facts.oldestDone >= 57, 'a task done 57 days after it was added');
  assert.ok(facts.fastestKillH < 48 && facts.fastestKillH > 24);
  assert.equal(facts.maxSteps, 21000);

  // fires once, at its moment: the 500th glass, never on an update that finds 600 already
  const g499 = base();
  g499.days['2026-11-02'] = { ...emptyDay(), water: glasses(499) };
  const g500 = { ...g499, days: { ...g499.days, '2026-11-09': { ...emptyDay(), water: glasses(1, '2026-11-09') } } };
  assert.deepEqual(remarksEarned(g499, g500).map((r) => r.id), ['w500']);
  assert.deepEqual(remarksEarned(g500, { ...g500 }).map((r) => r.id), [], 'nothing new, nothing said');
  assert.deepEqual(remarksEarned(g499, { ...g500, remarks: { w500: { at: 1 } } }).map((r) => r.id), [], 'never twice');
  // ...and it takes the place of the usual line in that toast
  const msgs: { text: string; tone: 'info' | 'good' | 'bad' | 'epic' }[] = [];
  const usual = freshLine('waterLogged', 10, { ml: 250, left: 2250, name: 'Elena' });
  msgs.push({ text: `${usual}`, tone: 'good' });
  const told = checkStory(g499, g500, msgs, { now: at9 });
  assert.ok(msgs[0].text.includes(remarkOf('w500')!.text) && !msgs[0].text.includes(usual), msgs[0].text);
  assert.ok(told.remarks?.w500 && !told.remarks.w500.wait);
  assert.equal(told.xp, g500.xp, 'no XP');
  // on a quiet day the kind version is said, or the remark waits for a day that isn't quiet
  const sick = (s: SweState): SweState => ({ ...s, pauses: [{ from: '2026-11-09', to: '2026-11-09', kind: 'sick' }] });
  const kind = remarksNow(sick(g499), sick(g500), true, at9);
  assert.equal(kind.told?.text, remarkOf('w500')!.kind);
  assert.deepEqual(kind.state.remarks?.w500, { at: at9.getTime(), kind: true });
  const c99 = base();
  c99.days['2026-11-02'] = { ...emptyDay(), coffee: Array.from({ length: 99 }, (_, i) => ({ id: `c${i}`, mg: 90, at: i })) };
  const c100 = { ...c99, days: { ...c99.days, '2026-11-09': { ...emptyDay(), coffee: [{ id: 'cx', mg: 90, at: at9.getTime() }] } } };
  const waits = remarksNow(sick(c99), sick(c100), true, at9);
  assert.equal(waits.told, null);
  assert.deepEqual(waits.state.remarks?.c100, { at: at9.getTime(), wait: true });
  const later = remarksNow(waits.state, { ...waits.state, pauses: [] }, false, new Date(2026, 10, 10, 10));
  assert.equal(later.told?.r.id, 'c100', 'told on the next day that is not quiet');
  assert.ok(!later.state.remarks?.c100?.wait);
  // a quiet run (body logging) says nothing, but keeps what it earned for later
  const silent = remarksNow(g499, g500, false, at9, true);
  assert.equal(silent.told, null);
  assert.ok(silent.state.remarks?.w500?.wait);
  // dates come from the save's own day start: an anniversary, a renamed boss coming back
  const first = base();
  first.days['2025-11-07'] = { ...emptyDay(), water: glasses(1, '2025-11-07') };
  assert.equal(factsOf({ ...first, lastRollover: '2026-11-06' }).yearsSince, 0);
  assert.equal(factsOf({ ...first, lastRollover: '2026-11-08' }).yearsSince, 1);
  const named = { ...base(), bossNames: { '2026-09-14': 'Bob' } };
  assert.equal(factsOf({ ...named, lastRollover: '2026-11-08' }).renamedBack, 0);
  assert.equal(factsOf({ ...named, lastRollover: '2026-11-09' }).renamedBack, 1, 'eight weeks on, the same boss is back');

  // ---- the mailbox ----
  const mamma = withMail(base(), at9);
  assert.equal(mamma.letter?.from, 'mamma');
  assert.equal(mamma.letter?.ref, 'mamma:2026-11');
  assert.equal(withMail(mamma.state, new Date(2026, 10, 9, 18)).letter, null, 'one letter a day');
  assert.equal(withMail(mamma.state, new Date(2026, 10, 10, 9)).letter, null, 'Mamma writes once a month');
  assert.equal(withMail(mamma.state, new Date(2026, 11, 1, 9)).letter?.ref, 'mamma:2026-12');
  // a beaten boss resigns, citing the real kill time, before Mamma's letter
  const kill = { ...base(), bossesDefeated: { '2026-11-09': 'snooze' }, bossKilledAt: { '2026-11-09': new Date(2026, 10, 11, 18, 42).getTime() } };
  const resign = withMail(kill, new Date(2026, 10, 12, 9));
  assert.equal(resign.letter?.ref, 'resign:2026-11-09');
  assert.ok(resign.letter?.body.includes('on Wednesday at 18:42, 2 days and 18 hours into the week'), resign.letter?.body);
  assert.equal(withMail(resign.state, new Date(2026, 10, 13, 9)).letter?.from, 'mamma', 'the next day');
  // the second resignation carries an intercepted memo in its P.S.
  const two = { ...resign.state, bossesDefeated: { ...kill.bossesDefeated, '2026-11-16': 'dehydration' }, bossKilledAt: { ...kill.bossKilledAt, '2026-11-16': new Date(2026, 10, 17, 20, 5).getTime() } };
  const second = withMail(two, new Date(2026, 10, 18, 9));
  assert.ok(second.letter?.memo && memoFound(second.state, 'letter'));
  assert.ok(second.letter?.body.includes('1 day and 20 hours'), second.letter?.body);
  // a late kill says so instead of a time
  assert.equal(killedText('2026-11-09', 0, true), 'after the final whistle, on numbers that came in late');
  // a care package when the rough-patch card would show: knitting, never XP, at most every 30 days
  const care = withMail(mamma.state, new Date(2026, 10, 10, 9), { rough: true });
  assert.equal(care.letter?.gift, 'knit_scarf');
  assert.ok(owns(care.state, 'knit_scarf'));
  assert.equal(care.state.xp, mamma.state.xp);
  assert.equal(withMail(care.state, new Date(2026, 10, 20, 9), { rough: true }).letter, null, 'not again within the month');
  let knitted = mamma.state;
  for (const id of KNITS) knitted = withOwned(knitted, id);
  const bus = withMail(knitted, new Date(2026, 10, 10, 9), { rough: true });
  assert.equal(bus.letter?.coins, CARE_COINS);
  assert.equal(bus.state.coins, knitted.coins + CARE_COINS);
  // Mamma's letters stay kind and private: nothing about the body, food or mood, in any month or parcel
  for (let m = 0; m < 12; m++) {
    for (const letter of [withMail(base(), new Date(2027, m, 3, 9)).letter, withMail(base(), new Date(2027, m, 3, 9), { rough: true }).letter]) {
      assert.ok(letter && letter.from === 'mamma');
      assert.ok(!/\b(food|eat|ate|eaten|meal|dinner|lunch|breakfast|kcal|calorie|protein|weight|kg|body|mood|diet|cake|bun|buns|coffee|fika|berries|lingon|sleep|slept|tired|sad)\b/i.test(letter.body), letter.body);
    }
  }
  // a co-op partner's postcard once the week is settled
  const coop = { ...mamma.state, coop: { week: '2026-11-02', partner: { name: 'Hydro Hanna', emoji: '💧' }, goal: 'water' as const, base: 4, result: { count: 5, target: 4, won: true, coins: 80 } } };
  const card = withMail(coop, new Date(2026, 10, 10, 9));
  assert.equal(card.letter?.ref, 'coop:2026-11-02');
  assert.ok(card.letter?.body.includes('5 of 4 water-goal days'));
  // the Couch King writes from exile once he's down, every four weeks while he stays down
  const exile = { ...mamma.state, syndicateBroken: 1, bossesDefeated: { '2026-10-19': 'couch_king' }, bossKilledAt: { '2026-10-19': new Date(2026, 9, 21).getTime() }, kingWeeks: ['2026-10-19'], mail: [...(mamma.state.mail ?? []), { id: 'r', from: 'king' as const, sender: 'K', emoji: '👑', subject: '', body: '', at: new Date(2026, 9, 22).getTime(), day: '2026-10-22', ref: 'resign:2026-10-19' }] };
  const fromExile = withMail(exile, new Date(2026, 10, 10, 9));
  assert.equal(fromExile.letter?.ref, 'exile:2026-11-09');
  assert.equal(withMail(fromExile.state, new Date(2026, 10, 30, 9)).letter, null, 'not again within four weeks');
  // kept for good, but capped
  let lots = base();
  for (let i = 0; i < MAIL_KEEP + 5; i++) lots = { ...lots, mail: [...(lots.mail ?? []), { ...mamma.letter!, id: `l${i}`, day: `d${i}` }] };
  assert.equal(withMail(lots, new Date(2027, 0, 5, 9)).state.mail?.length, MAIL_KEEP);
  // the banner: unread mail until it's read or its banner is closed
  assert.equal(mailBanner(mamma.state)?.id, mamma.letter?.id);
  assert.equal(mailBanner(withRead(mamma.state, mamma.letter?.id)), null);
  assert.equal(mailBanner({ ...mamma.state, dismissed: [mailBannerKey(mamma.letter!)] }), null);

  // ---- big days ----
  const kinds: [string, string | null][] = [
    ['Tandläkare 14:00', 'dentist'],
    ['Läkarbesök vårdcentralen', 'doctor'],
    ['Intervju hos Spotify', 'interview'],
    ['Tenta i statistik', 'exam'],
    ['Final exam', 'exam'],
    ['Example review', null],
    ['Tentative hold', null],
    ['Flyg till Malaga', 'flight'],
    ['Födelsedagsfest', 'party'],
    ['Manifest planning', null],
    ['Weekly sync', null],
    ['Uppkörning', 'driving'],
    ['Bröllop: Anna & Erik', 'wedding'],
  ];
  for (const [title, kind] of kinds) assert.equal(bigKindOf(title), kind, title);
  const ev = (key: string, title: string, start: Date, o: Partial<CalEvent> = {}): CalEvent => ({ key, title, start: start.getTime(), end: start.getTime() + 3_600_000, allDay: false, location: null, calendarId: 'c', ...o });
  const week = [
    ev('a', 'Tandläkare', new Date(2026, 10, 9, 14)),
    ev('b', 'Party planning', new Date(2026, 10, 9, 9), { recurring: true }),
    ev('c', 'Flyg standup', new Date(2026, 10, 9, 8)),
    ev('d', 'Flyg standup', new Date(2026, 10, 10, 8)),
    ev('e', 'Intervju', new Date(2026, 10, 10, 10)),
  ];
  assert.deepEqual(bigDaysOn(week, '2026-11-09').map((b) => b.kind), ['dentist'], 'one-off events only');
  const brief = briefParts(base(), week, '2026-11-09');
  assert.deepEqual(brief, { key: 'bigDayLuck', vars: { title: 'the dentist', time: '14:00' }, last: null });
  const dentist = bigDaysOn(week, '2026-11-09')[0];
  const survived = withBigAnswer(base(), dentist, '2026-11-09', 'survived', 1);
  assert.equal(briefParts(survived, [ev('f', 'Tandläkaren', new Date(2026, 11, 3, 9))], '2026-12-03')?.last, 'bigDayLastSurvived', 'remembered for the next one');
  const rough = withBigAnswer(base(), dentist, '2026-11-09', 'rough', 1);
  assert.equal(briefParts(rough, [ev('f', 'Tandläkaren', new Date(2026, 11, 3, 9))], '2026-12-03')?.last, null, 'a rough one is never brought up');
  assert.ok(!JSON.stringify(rough.bigDays).includes('Tandläkare'), 'no titles saved');
  assert.equal(withBigAnswer(survived, dentist, '2026-11-09', 'nailed', 2).bigDays?.length, 1, 'one answer per event');
  assert.equal(briefParts(base(), [ev('g', 'Flyg till Malaga', new Date(2026, 10, 9), { allDay: true })], '2026-11-09')?.key, 'bigDayLuckAllDay');
  // "rough" feeds nothing: the tone, the rough-day filters and every other module stay as they were, and only big-days.ts reads the answers
  for (const k of ['2026-11-09', '2026-11-10']) {
    assert.deepEqual(toneOn(rough, k, at9), toneOn(base(), k, at9));
    assert.equal(quietDay(rough, k, at9), quietDay(base(), k, at9));
    assert.equal(roughDay(rough, k), roughDay(base(), k));
  }
  const srcFiles = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? srcFiles(join(dir, f)) : /\.tsx?$/.test(f) ? [join(dir, f)] : []));
  for (const f of srcFiles(join(process.cwd(), 'src'))) {
    if (['big-days.ts', 'types.ts'].includes(basename(f))) continue;
    assert.ok(!/\.bigDays\b|\bbigDays:/.test(readFileSync(f, 'utf8')), `${relative(process.cwd(), f)} reads the big-day answers`);
  }

  // ---- intercepted memos ----
  assert.equal(new Set(RUNES).size, 26);
  const map = runeMap(base());
  assert.equal(new Set(Object.values(map)).size, 26, 'one rune per letter');
  const clues = ROSTER_LIST.map((r) => JSON.stringify(cluesOf(r)));
  assert.equal(new Set(clues).size, ROSTER_LIST.length, 'the memos together point at exactly one rival');
  for (const r of ROSTER_LIST) for (const t of memoTexts(r)) assert.ok(/^[A-Z .,']+$/.test(t), t);
  assert.equal(memoTexts(ROSTER_LIST.find((r) => r.name === 'Caffeine Kalle')!)[2], 'OUR FRIEND HAS A FIRST NAME THAT BEGINS WITH K. DESTROY THIS MEMO.');
  // the key: 2 letters a boss, 1 a fly species
  const keyed = { ...base(), bossesDefeated: { a: 'snooze', b: 'binge', c: 'binge' }, flies: { house_fly: { firstAt: 1, count: 9 }, gym_gnat: { firstAt: 1, count: 1 } } };
  assert.equal(lettersKnown(keyed), 8);
  assert.ok(!/[A-Z]/.test(memoLine(base(), 'ABC XYZ')), 'nothing known: all runes');
  assert.equal(memoLine({ ...keyed, bossesDefeated: Object.fromEntries(Array.from({ length: 13 }, (_, i) => [`w${i}`, 'snooze'])) }, 'THE KING.'), 'THE KING.');
  // a place gives its memo once; the first seeds the save's runes and its mole
  const m1 = withMemo(base(), 'version', 100);
  assert.equal(m1.cipher?.found.length, 1);
  assert.equal(withMemo(m1, 'version', 200), m1);
  const mole = moleOf(m1);
  assert.equal(moleOf(withMemo(m1, 'postcard', 300)).name, mole.name, 'the mole stays put');
  assert.equal(memosFound(m1)[0].text, memoTexts(mole)[0]);
  // accusations: one per memo found, wrong ones crossed off, the right one pays a cosmetic and never XP
  assert.equal(accuse(base(), mole.name), null, 'no memo, no case');
  const suspect = ROSTER_LIST.find((r) => r.name !== mole.name)!.name;
  const wrong = accuse(m1, suspect)!;
  assert.equal(wrong.right, false);
  assert.deepEqual(wrong.state.cipher?.wrong, [suspect]);
  assert.equal(guessesLeft(wrong.state), 0);
  assert.equal(accuse(wrong.state, mole.name), null, 'out of accusations until the next memo');
  const m2 = withMemo(wrong.state, 'leet', 400);
  const right = accuse(m2, mole.name)!;
  assert.ok(right.right && owns(right.state, MOLE_PRIZE) && right.state.cipher?.solved?.name === mole.name);
  assert.equal(right.state.xp, m2.xp);
  assert.equal(accuse(right.state, suspect), null, 'case closed');
  // the 13th fly and 13:37 (once each)
  const flies12 = { ...base(), flies: { house_fly: { firstAt: 1, count: 12 } } };
  const flies13 = { ...flies12, flies: { house_fly: { firstAt: 1, count: 13 } } };
  assert.ok(memoFound(checkStory(flies12, flies13, [], { now: at9 }), 'fly13'));
  const flies27 = { ...flies12, flies: { house_fly: { firstAt: 1, count: 27 } } };
  assert.ok(memoFound(checkStory({ ...flies12, flies: { house_fly: { firstAt: 1, count: 25 } } }, flies27, [], { now: at9 }), 'fly13'), 'a collection past 13 finds it on the 26th');
  const leetMsgs: { text: string; tone: 'info' | 'good' | 'bad' | 'epic' }[] = [];
  const leet = checkStory(mamma.state, { ...mamma.state }, leetMsgs, { now: new Date(2026, 10, 9, 13, 37) });
  assert.ok(memoFound(leet, 'leet') && leetMsgs.some((m) => m.text.startsWith('📡 13:37')));
  const again: { text: string; tone: 'info' | 'good' | 'bad' | 'epic' }[] = [];
  checkStory(leet, { ...leet }, again, { now: new Date(2026, 10, 10, 13, 37) });
  assert.ok(!again.some((m) => m.text.startsWith('📡')), 'once');

  // ---- the other timeline ----
  let opened = mamma.state;
  for (let i = 0; i < OPENS_WINK - 1; i++) opened = withOpen(opened, at9.getTime() + i * 60_000);
  assert.ok(!opened.meta?.pending?.length);
  opened = withOpen(opened, at9.getTime() + 20 * 60_000);
  assert.deepEqual(opened.meta?.pending, ['opens']);
  const winkMsgs: { text: string; tone: 'info' | 'good' | 'bad' | 'epic' }[] = [];
  const winked = checkStory(mamma.state, opened, winkMsgs, { now: new Date(at9.getTime() + 20 * 60_000) });
  assert.ok(winkMsgs.some((m) => m.text.startsWith('🌀') && m.text.includes(String(OPENS_WINK))), JSON.stringify(winkMsgs));
  assert.ok(!winked.meta?.pending?.length && saidThisWeek(winked, 'opens', at9.getTime()));
  const noMore: { text: string; tone: 'info' | 'good' | 'bad' | 'epic' }[] = [];
  checkStory(winked, withOpen(winked, at9.getTime() + 30 * 60_000), noMore, { now: new Date(at9.getTime() + 30 * 60_000) });
  assert.ok(!noMore.some((m) => m.text.startsWith('🌀')), 'once a week');
  assert.equal(winked.xp, mamma.state.xp, 'no XP');
  // never on a quiet day: the wink is dropped, not saved for later
  const quiet: { text: string; tone: 'info' | 'good' | 'bad' | 'epic' }[] = [];
  const hush = checkStory(sick(mamma.state), sick(opened), quiet, { now: new Date(at9.getTime() + 20 * 60_000) });
  assert.ok(!quiet.some((m) => m.text.startsWith('🌀')) && !hush.meta?.pending?.length);
  // three themes in a day; a restore, and a restore from another install (a new phone)
  let themes = base();
  for (let i = 0; i < THEMES_WINK; i++) themes = withThemeSwitch(themes, at9.getTime() + i);
  assert.deepEqual(themes.meta?.pending, ['theme']);
  assert.deepEqual(withRestore({ ...base(), install: 'A' }, 'A').meta?.pending, ['restore']);
  const moved = withRestore({ ...base(), install: 'A' }, 'B');
  assert.deepEqual(moved.meta?.pending, ['newPhone']);
  assert.equal(moved.install, 'B');
  assert.deepEqual(withRestore(base(), 'B').meta?.pending, ['restore'], 'a backup from before installs were stamped');
  // undo a glass and pour the same one straight back
  const today = '2026-11-09';
  const one = { ...base(), days: { [today]: { ...emptyDay(), water: [{ id: 'g1', ml: 250, at: at9.getTime() }] } } };
  const undone = metaEvents(one, { ...one, days: { [today]: { ...emptyDay(), water: [] } } }, at9.getTime());
  assert.deepEqual(undone.state.meta?.undo, { at: at9.getTime(), ml: 250 });
  const back = metaEvents(undone.state, { ...undone.state, days: { [today]: { ...emptyDay(), water: [{ id: 'g2', ml: 250, at: at9.getTime() + 30_000 }] } } }, at9.getTime() + 30_000);
  assert.deepEqual(back.events.map((e) => e.kind), ['relog']);
  assert.equal(back.state.meta?.undo, undefined);
  const otherGlass = metaEvents(undone.state, { ...undone.state, days: { [today]: { ...emptyDay(), water: [{ id: 'g3', ml: 500, at: at9.getTime() }] } } }, at9.getTime() + 30_000);
  assert.deepEqual(otherGlass.events, [], 'a different glass is just a glass');
  // an edit to a day two weeks back (not to last week)
  const hist = { ...base(), days: { '2026-10-20': { ...emptyDay() }, '2026-11-01': { ...emptyDay() } } };
  const oldEdit = metaEvents(hist, { ...hist, days: { ...hist.days, '2026-10-20': { ...emptyDay(), water: glasses(1, '2026-10-20') } } }, at9.getTime());
  assert.deepEqual(oldEdit.events, [{ kind: 'backdated', vars: { days: 20 } }]);
  const recent = metaEvents(hist, { ...hist, days: { ...hist.days, '2026-11-01': { ...emptyDay(), water: glasses(1, '2026-11-01') } } }, at9.getTime());
  assert.deepEqual(recent.events, []);
  const appOnly = metaEvents(hist, { ...hist, days: { ...hist.days, '2026-10-20': { ...hist.days['2026-10-20'], banked: 3 } } }, at9.getTime());
  assert.deepEqual(appOnly.events, [], "the app's own bookkeeping isn't an edit");
}
step9StoryTests();

console.log('synchronous logic tests passed');
