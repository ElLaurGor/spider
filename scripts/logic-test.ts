/// <reference types="node" />
// Offline logic checks for the pure modules in src/lib. Run: npm run test:logic
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { addDays, atTime, dayKey, fmtClock, fmtDuration, isDayKey, MIN, startOfWeek } from '../src/lib/dates';
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
} from '../src/lib/selectors';
import { SECRET_ACHIEVEMENTS } from '../src/lib/xp';
import { changeOver, recentAverage, rolling, series } from '../src/lib/body-log';
import { ACHIEVEMENTS, activityXp, focusXp, levelForXp, levelProgress } from '../src/lib/xp';
import { HQ_SECTIONS, hqOrder, hqVisible, moveSection, toggleSection } from '../src/lib/hq-layout';
import { fmtTime } from '../src/lib/dates';
import { allRivalLines, rivalTalk } from '../src/lib/rival-talk';
import { eveningKey, IMMORTAL_DAYS, immortalTask, taskAgeDays, tomorrowKey, topToday, yesterdayHighlight } from '../src/lib/memory';
import { newLeague, rivalXp, settle, standings, weekKeyOf, TIERS } from '../src/lib/league';
import { coinsFor, rollChest } from '../src/lib/economy';
import { daysLeft, nextDate, upcoming } from '../src/lib/countdowns';
import { insights } from '../src/lib/insights';
import { countedDay, firstDataDay, roughDay, usedOn } from '../src/lib/day-filters';
import { hallOfFame } from '../src/lib/records';
import { monthWrapped } from '../src/lib/wrapped';
import { cycleInfo, periodStarts, isPredictedPeriod } from '../src/lib/body';
import { trainedOn, recentGames, gameTotals, gamePenalty, syncedSleep, waterGoalFor, waterGoalParts, waterMl, withPastHealth } from '../src/lib/selectors';
import { searchFoods } from '../src/lib/food-db';
import { pickQuests, questsFor, bossFor, BOSSES, WEAKNESS, xpPace } from '../src/lib/quests';
import { habitsFor } from '../src/lib/habits';
import { weekReport, gradeOf, dayScoreFor } from '../src/lib/report';
import { RESPECT, respectFor } from '../src/lib/respect';
import { isSnow, seasonOn, winterOf } from '../src/lib/seasons';
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
import { bedtimeCaffeine, bedtimeOn, caffeineCurve, caffeineLeft } from '../src/lib/caffeine';
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
import { cycleHeadsUpAt, wrappedReminder } from '../src/lib/reminder-times';
import { EASE_STEP, gentleDay, goldenAllowed, periodDay, toneOn } from '../src/lib/tone';
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
import { applyFixes, recheckCoffeeGremlin } from '../src/lib/fixes';
import { credit, earnBonus, ledgerOn, penalize, refundPenalty, unreward, withoutUndoRecords } from '../src/lib/ledger';
import { withoutCrit } from '../src/lib/critters';
import { actionFromButton, SILENT_BUTTONS, tapKey } from '../src/lib/reminder-actions';
import { mergeSeen as mergeSeenLists } from '../src/lib/outside';
import { DEFAULT_WIDGET_COLORS, forToday, snapshotOf, widgetLines, withTap } from '../src/lib/widget-data';
// cluster B
import { bankFor, PITY_AFTER, rollChest as rollChestB, shopPrice } from '../src/lib/economy';
import { daysLeftInWeek, difficultyOk, payoutOf, targetFor } from '../src/lib/contracts';
// step 4 plans: if-then plans, the comeback bonus, weekly range habits
import { newMission } from '../src/lib/contracts';
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
import { nightPhone, nightWindow } from '../src/lib/night';
import { autoBackupDue } from '../src/lib/backup-due';
import { workoutFor } from '../src/lib/selectors';
import { clockLabel, nightClock, nightOf, rhythmOf, withNights } from '../src/lib/sleep';
import { nightWindow as sleepWindow, ZEPP } from '../src/lib/sleep';
import { allDayLocal } from '../src/lib/calendar-days';
import { pickBackup, skipAutoBackup } from '../src/lib/backup-pick';
import { isDoomscroll } from '../src/lib/doomscroll';
import { eventsOn } from '../src/lib/selectors';
import { meteoTime, needsPlaceInfo, samePlace, staleNote } from '../src/lib/weather';
// step 4 hq
import { departureText, leaveInMin, nextDepartures, parseDepartures, parseDeviations, parseStops, plannedText, relevantDeviations, routesOf, siteIdOf, slRetryMs } from '../src/lib/sl';
import { readinessFor } from '../src/lib/readiness';
import { heartIn, workoutWindows } from '../src/lib/workout-heart';
import { movementMap, stillestHour } from '../src/lib/movement';
// step 2b progress
import { MEDALS, medalList, medalsFor, medalTotals, needFor, openDays, settleMedals } from '../src/lib/medals';
import { ghostOf, ghostText, withoutOldXpHours, withXpHour, xpByHour } from '../src/lib/xp-timeline';
import { NEMESIS_PRIZE, nemesisOf } from '../src/lib/league';

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
const now = Date.now();
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

  // lint: lines seen every day have at least 4 savage variants (kind pools are the same in both and exempt)...
  const DAILY = ['greetMorning', 'greetAfternoon', 'greetEvening', 'greetNight', 'spiderTap', 'waterLogged', 'waterRemind', 'coffeeLogged', 'foodLogged', 'gymSet', 'gymToday', 'gymRemind', 'taskDone', 'habitDone', 'habitRemind', 'moodRemind', 'questDone', 'energyLow', 'energyOk', 'energyHigh', 'windDownRemind', 'windDownDone', 'breathDone', 'sleepRemind', 'rateSleepBad', 'rateSleepOk', 'rateSleepGreat', 'sleepShort', 'sleepGood', 'verdictTragic', 'verdictMid', 'verdictGood', 'verdictGreat', 'verdictMorning', 'weatherRain', 'weatherCold', 'weatherHot', 'weatherNice', 'gameStart', 'stepsLow', 'stepsMid', 'stepsHigh', 'morningBrief', 'eveningReport', 'eveningReady'];
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

// just-in-time insights: only what the data shows, once a day, never on a sick day
{
  const blank = (extra: Partial<DayLog> = {}): DayLog => ({ water: [], food: [], sets: [], games: [], bonusGameMin: 0, ...extra });
  const g = defaultState();
  const fri = new Date(2027, 0, 15, 22); // Fri 15 Jan 2027, 22:00 (bedtime 23:00)
  for (let i = 10; i >= 1; i--) {
    const d = addDays(fri, -i);
    const late = i % 2 === 0; // every other evening: a game until 23:30
    const end = new Date(d);
    end.setHours(late ? 23 : 20, 30, 0, 0);
    g.days[dayKey(d)] = blank({ games: [{ start: end.getTime() - 3_600_000, end: end.getTime() }] });
  }
  // the morning after rates the night: worse after late gaming
  for (let i = 9; i >= 0; i--) {
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
  for (let i = 10; i >= 1; i--) {
    const d = addDays(fri, -i);
    const late = i % 2 === 0;
    const cup = new Date(d);
    cup.setHours(late ? 17 : 9, 0, 0, 0);
    c.days[dayKey(d)] = blank({ coffee: [{ id: `c${i}`, mg: 90, at: cup.getTime() }] });
  }
  for (let i = 9; i >= 0; i--) {
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
const fc = (f: { date?: string; max: number; min: number; rainPct: number; code: number; daylightMin?: number }) => ({
  date: 'x', rainMm: 0, sunrise: 0, sunset: 0, daylightMin: 600, sunshineMin: 0, ...f,
});
assert.equal(weatherKey(fc({ max: 10, min: 2, rainPct: 80, code: 3 })), 'weatherRain');
assert.equal(weatherKey(fc({ max: 30, min: 18, rainPct: 0, code: 0 })), 'weatherHot');
assert.equal(weatherKey(fc({ max: 1, min: -5, rainPct: 0, code: 0 })), 'weatherCold');
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

  // medals: the bar scales with the week's non-rough days, never below 1
  assert.deepEqual(needFor([3, 5, 7], 7), { bronze: 3, silver: 5, gold: 7 });
  assert.deepEqual(needFor([3, 5, 7], 5), { bronze: 3, silver: 4, gold: 5 });
  assert.deepEqual(needFor([1, 2, 3], 1), { bronze: 1, silver: 1, gold: 1 });
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
  md.days[mk(0)].steps = 9000;
  assert.ok(medalsFor(md, week, end).some((m) => m.def.id === 'steps'));
  // two sick days lower the bar: the same 5 water days are gold
  const sick = { ...md, pauses: [{ from: mk(5), to: mk(6), kind: 'sick' as const }] };
  assert.equal(openDays(sick, week), 5);
  assert.equal(medalsFor(sick, week, end).find((m) => m.def.id === 'water')!.tier, 'gold');
  assert.deepEqual(medalsFor({ ...md, pauses: [{ from: mk(0), to: mk(6), kind: 'away' as const }] }, week, end), []); // a week away: nothing to win, nothing missed
  // settling: the first rollover only marks where medals start; the next week's pays last week once
  const first = settleMedals(md, new Date(2027, 0, 13, 8));
  assert.equal(first.award, null);
  assert.equal(first.state.medalsSince, '2027-01-11');
  const monday = new Date(2027, 0, 18, 8);
  const paid = settleMedals(first.state, monday);
  assert.equal(paid.award?.week, week);
  assert.deepEqual(paid.state.medals?.[week], { train: 'gold', water: 'silver', gaming: 'silver' }); // one step-goal day isn't a medal yet
  assert.equal(paid.award?.xp, 30 + 20 + 20);
  assert.ok(medalList(paid.award!.won).includes('🥇 Training'));
  assert.equal(settleMedals(paid.state, new Date(2027, 0, 18, 20)).award, null); // once per week
  assert.equal(settleMedals({ ...md, medalsSince: '2027-01-18' }, monday).award, null); // weeks before medals arrived aren't paid
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
  assert.equal(seasonOn(new Date(2026, 11, 13))?.id, 'lucia');
  assert.equal(seasonOn(new Date(2026, 11, 21))?.id, 'solstice');
  assert.equal(seasonOn(new Date(2026, 11, 22)), null);
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
  // only bosses beaten while spooky season was on (not just in a week that overlaps it)
  assert.ok(haunted.test({ ...defaultState(), seasonWins: ['halloween-2026'] }));
  assert.ok(!haunted.test({ ...defaultState(), bossesDefeated: { '2026-10-19': 'procrastinator' } }));
  assert.ok(!haunted.test({ ...defaultState(), seasonWins: ['lucia-2026'] }));
  assert.equal(winterOf(new Date(2026, 10, 20)), '2026');
  assert.equal(winterOf(new Date(2027, 2, 1)), '2026');
  assert.ok(isSnow(73) && !isSnow(61));
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
  for (let i = 1; i <= 12; i++) {
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
  assert.equal(next.days[y2].sleepMin, 480); // typed-in sleep wins
  assert.equal(next.days[gone], undefined);
  assert.equal(next.xp, hs.xp);
  assert.equal(withPastHealth(next, [{ key: y, steps: hs.settings.stepGoal + 100, sleepMin: 410 }]), next); // nothing new: same object
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
  assert.equal(phaseOn(cy, '2026-05-01'), 'period');
  assert.equal(phaseOn(cy, '2026-05-08'), 'follicular');
  assert.equal(phaseOn(cy, '2026-05-15'), 'ovulation');
  assert.equal(phaseOn(cy, '2026-05-20'), 'luteal');
  assert.equal(phaseOn(defaultState(), '2026-05-20'), null);
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
  for (let i = 1; i <= 20; i++) {
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
  assert.equal(hd.logged, 20);
  assert.equal(hd.clues[0]?.id, 'short_sleep', JSON.stringify(hd.clues));
  assert.ok(hd.clues[0].text.includes('higher'));
  const al = detective(dt, dt.trackers[1], cnow);
  assert.equal(al.clues[0]?.id, 'pressure', JSON.stringify(al.clues));
  assert.ok(al.clues[0].detail.startsWith('100% vs 0%'));
  for (const c of [...hd.clues, ...al.clues]) assert.ok(!/caus/i.test(c.text), c.text);
  assert.equal(detective(defaultState(), dt.trackers[0], cnow).clues.length, 0);

  // self-experiments: the days she did it vs the two weeks before; any days count, never "in a row"
  const ex = defaultState();
  for (let i = 0; i < 30; i++) {
    const key = dayKey(addDays(new Date(2026, 5, 1, 12), i));
    ex.days[key] = { ...blank(), sleepMin: ['2026-06-16', '2026-06-18', '2026-06-20', '2026-06-22'].includes(key) ? 480 : 420 };
  }
  const exp = { id: 'e', title: 'No screens after 22:00', emoji: 'x', metric: 'sleepMin' as const, from: '2026-06-15', days: 14, done: ['2026-06-15', '2026-06-17', '2026-06-19', '2026-06-21'], startedAt: 0 };
  assert.deepEqual([experimentDays(exp)[0], experimentDays(exp)[13]], ['2026-06-15', '2026-06-28']);
  const done = experimentResult(ex, exp, new Date(2026, 5, 30, 12));
  assert.ok(done.ended);
  assert.equal(done.day, 14);
  assert.equal(done.during, 480);
  assert.equal(done.before, 420);
  assert.equal(done.verdict, 'better');
  assert.ok(verdictText(exp, done).includes('better'));
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
  // a water goal met once stays met when the goal grows (a gym set later that day)
  const met = { ...empty(), water: [{ id: 'w', ml: 2500, at: 0 }], waterGoalHit: true, sets: [{ id: 's', exercise: 'Squat', weight: 50, reps: 5, at: 0 }] };
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
  assert.ok(COMEBACK.xp > 0 && COMEBACK.min > 0);

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
  assert.deepEqual(nov2.state.silk, { month: '2026-11', tier: 1 });
  assert.equal(checkSilkTrack(nov2.state, '2026-11-02').unlocked.length, 0);
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
  assert.notEqual(bossFor(defaultState(), new Date(2026, 11, 28, 12)).name, 'The Old Year');

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
  assert.deepEqual(nightPhone([{ label: 'X', start: at(23, 0), end: at(23, 5) }], win.bed, win.end), { lateMin: 5, lastAt: null, top: null });

  // automatic backup: Sundays without one yet, or anything over a week old
  const sunday = new Date(2026, 9, 18, 10);
  assert.ok(autoBackupDue(null, sunday));
  assert.ok(autoBackupDue(sunday.getTime() - 2 * 86_400_000, sunday));
  assert.ok(!autoBackupDue(sunday.getTime() - 3_600_000, sunday)); // already today
  assert.ok(!autoBackupDue(sunday.getTime() - 3 * 86_400_000, new Date(2026, 9, 19, 10))); // Monday
  assert.ok(autoBackupDue(sunday.getTime() - 8 * 86_400_000, new Date(2026, 9, 19, 10)));

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
  assert.deepEqual(hqOrder({ order: ['achievements', 'gone', 'weather'], hidden: [] }).slice(0, 3), ['achievements', 'weather', 'commute']); // the SL card sits right after weather
  const saved = hqOrder({ order: ['achievements', 'weather'], hidden: [] });
  assert.equal(saved.length, ids.length);
  assert.equal(new Set(saved).size, ids.length);
  const moved = moveSection(null, 'quests', -1);
  assert.equal(moved.order.indexOf('quests'), ids.indexOf('quests') - 1);
  assert.deepEqual(moveSection(null, 'weather', -1).order, ids); // already first
  const hidden = toggleSection(null, 'league');
  assert.ok(!hqVisible(hidden).includes('league'));
  assert.ok(hqVisible(toggleSection(hidden, 'league')).includes('league'));

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
// adaptive water: hot days and training days raise the goal; off means the plain goal
{
  const w = defaultState();
  const sunday = '2027-01-10'; // a rest day in the default plan
  const monday = '2027-01-11'; // Push day
  w.days[sunday] = { water: [], food: [], sets: [], games: [], bonusGameMin: 0 };
  assert.equal(waterGoalFor(w, sunday), w.settings.waterGoalMl);
  assert.equal(waterGoalFor(w, monday), w.settings.waterGoalMl + 400);
  w.days[sunday] = { ...w.days[sunday], weather: { max: 23, min: 14, rainMm: 0, sunMin: 300, code: 0 } };
  assert.equal(waterGoalFor(w, sunday), w.settings.waterGoalMl + 300);
  w.days[sunday] = { ...w.days[sunday], weather: { max: 27, min: 16, rainMm: 0, sunMin: 500, code: 0 } };
  w.days[sunday].activities = [{ id: 'a', kind: 'cardio', minutes: 30, at: 0 }]; // trained on a rest day
  const parts = waterGoalParts(w, sunday);
  assert.equal(parts.ml, w.settings.waterGoalMl + 900);
  assert.deepEqual(parts.why, ['+500 ml: 27°', '+400 ml: training day']);
  w.settings.adaptiveWater = false;
  assert.equal(waterGoalFor(w, sunday), w.settings.waterGoalMl);
}

// sleep nights: the main session plus a split-off piece, stages summed; typed-in nights stay the watch's own business
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
  const first = rowsFor(s0, null, [], 111);
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
    const rows = rowsFor(hydrate(v1.saved), null, [], 222).pairs;
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
    const next = rowsFor(s1, s0.days, ['2026-09', '2026-10'], 222);
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

    // v1 written along with v2: code that only knows v1 (a rolled-back update) finds current data, and what it writes wins
    assert.notEqual(fingerprint('{"xp":1}'), fingerprint('{"xp":2}'));
    assert.equal(fingerprint('abc'), fingerprint('abc'));
    const v1Now = JSON.stringify(s0);
    const dual = rowsFor(s0, null, [], 111, v1Now);
    assert.deepEqual(dual.pairs.find(([k]) => k === V1_KEY), [V1_KEY, v1Now]); // in the same multiSet as the v2 rows
    assert.equal(JSON.parse(dual.pairs[1][1]).v1, fingerprint(v1Now));
    assert.ok(!rowsFor(s0, null, [], 111).pairs.some(([k]) => k === V1_KEY)); // without v1Raw, v1 is left alone
    const both = memStore(Object.fromEntries(dual.pairs));
    const same = await readSaved(both);
    assert.equal(same.source, 'v2'); // v1 unchanged since: v2 is read
    both.m.set(V1_KEY, JSON.stringify({ ...s0, xp: 9999 })); // older code saved to v1 only
    const rolled = await readSaved(both);
    assert.ok(rolled.source === 'v1' && rolled.newer && rolled.saved.xp === 9999);
    both.m.set(V1_KEY, '{"days": {'); // an unreadable v1 never hides a good v2
    assert.equal((await readSaved(both)).source, 'v2');
    both.m.delete(V1_KEY);
    assert.equal((await readSaved(both)).source, 'v2');
    const noDual = memStore(Object.fromEntries(first.pairs)); // v1 no longer written alongside: v2 wins whatever v1 holds
    noDual.m.set(V1_KEY, JSON.stringify({ ...s0, xp: 1 }));
    assert.equal((await readSaved(noDual)).source, 'v2');
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
}

// shared seen-list (APK 1.5.0): the app and the background check merge theirs; the later time wins, 30 days max
{
  const day = 86_400_000;
  const now = new Date(2027, 0, 13, 12).getTime();
  const merged = mergeSeenLists({ 'a:YELLOW': now - 25 * day, old: now - 31 * day }, { 'a:YELLOW': now - day, 'b:VMA': now }, now);
  assert.deepEqual(merged, { 'a:YELLOW': now - day, 'b:VMA': now }); // triage's "still active" refresh carries over
  assert.deepEqual(mergeSeenLists({}, {}, now), {});
}

// home-screen widget (APK 1.5.0): today's numbers, zero on a new day, its own taps shown at once
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
  const tapped = withTap(snap, 'glass', at);
  assert.equal(tapped.waterMl, 1000);
  assert.equal(withTap(snap, 'coffee', at).coffees, 2);
  // the next morning: yesterday's numbers don't carry over; the gaming budget is unknown until the app runs
  const tomorrow = new Date(2027, 0, 14, 8).getTime();
  const next = forToday(snap, tomorrow);
  assert.deepEqual([next.day, next.waterMl, next.coffees, next.gameLeftMin], ['2027-01-14', 0, 0, null]);
  assert.equal(widgetLines(next).game, '–');
  assert.equal(withTap(snap, 'glass', tomorrow).waterMl, 250); // a tap after midnight starts the new day
  assert.equal(widgetLines({ ...snap, gameLeftMin: -75 }).game, '1h 15m over');
  assert.equal(widgetLines({ ...snap, gaming: true }).game, 'playing');
}

// The async blocks above (persistence, fetch checks) report on their own once they finish.
console.log('synchronous logic tests passed');
