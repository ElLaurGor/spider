/// <reference types="node" />
// Offline logic checks for the pure modules in src/lib. Run: npm run test:logic
import assert from 'node:assert/strict';

import { addDays, atTime, dayKey, fmtClock, fmtDuration, isDayKey, MIN, startOfWeek } from '../src/lib/dates';
import { defaultState, emptyDay, hydrate, idTime, withRealDays } from '../src/lib/defaults';
import { BASE_KEY, changedMonths, daysByMonth, fingerprint, INDEX_KEY, monthKey, olderCopy, readSaved, ReadError, ROW_LIMIT, rowsFor, utf8Bytes, V1_KEY, wouldWipe, writeVerified } from '../src/lib/persist';
import { fillLine, freshLine, GOLDEN, LINES, line } from '../src/lib/lines';
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
import { FINAL_BOSS, finalBossDue, pickQuestsWithFocus, rageWeaknessOf, rerollFor, xpPace as paceOf } from '../src/lib/quests';
import { WEAK_SPOT_QUESTS, weakSpot } from '../src/lib/weak-spot';
import { actionFromButton, SILENT_BUTTONS, tapKey } from '../src/lib/reminder-actions';
import { mergeSeen as mergeSeenLists } from '../src/lib/outside';
import { DEFAULT_WIDGET_COLORS, forToday, snapshotOf, widgetLines, withTap } from '../src/lib/widget-data';
// cluster B
import { bankFor, PITY_AFTER, rollChest as rollChestB, shopPrice } from '../src/lib/economy';
import { daysLeftInWeek, difficultyOk, payoutOf, targetFor } from '../src/lib/contracts';
import { bankRate, focusBonusMin, healShare, perkBlocker, perkPoints, workoutBonusMin } from '../src/lib/perks';
import { restedAfter, restedGain, restedSplit, RESTED_CAP } from '../src/lib/rested';
import { buyable, COSMETICS, legendaryDrop, shownTitle, titlesEarned, worn, withOwned, withWorn } from '../src/lib/cosmetics';
import { goldChest } from '../src/lib/loot';
import { xpForLevel } from '../src/lib/xp';
// cluster F
import { allSaintsDay, easterSunday, holidayOn, holidaysOf, isDayOff, isKlamdag, isPayday, midsummerEve, paydayOf, upcomingDays } from '../src/lib/swedish-days';
import { allEggsSomeYear, EGGS, eggsFoundOn, eggsLeft, oldTasksDoneOn, staleTasks } from '../src/lib/traditions';
import { nightPhone, nightWindow } from '../src/lib/night';
import { autoBackupDue } from '../src/lib/backup-due';
import { workoutFor } from '../src/lib/selectors';
import { clockLabel, nightClock, nightOf, rhythmOf, withNights } from '../src/lib/sleep';
import { readinessFor } from '../src/lib/readiness';
import { heartIn, workoutWindows } from '../src/lib/workout-heart';
import { movementMap, stillestHour } from '../src/lib/movement';

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
  assert.equal(effectiveSavage(endPause(sick)), 10);
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
assert.ok(['A', 'B', 'C', 'D', 'F'].includes(r0.grade));
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

// period: go easy (level 4) unless turned off; never overrides a lower setting
const p = defaultState();
p.days[dayKey()] = { water: [], food: [], sets: [], games: [], bonusGameMin: 0, period: { flow: 'medium', symptoms: [] } };
assert.equal(effectiveSavage(p), 4);
p.settings.easyOnPeriod = false;
assert.equal(effectiveSavage(p), 10);
p.settings.easyOnPeriod = true;
p.settings.savageLevel = 2;
assert.equal(effectiveSavage(p), 2);
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
assert.ok(['A', 'B', 'C', 'D', 'F'].includes(wFull.grade));

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
  const ctx = { now: at, day: empty(), prevDay: empty(), season: undefined };
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
  assert.ok(kindDay(low.days[y]));
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
  assert.ok(pausedOn(ps, '2027-03-11') && !pausedOn(ps, '2027-03-12'));
  assert.equal(endPause(startPause(defaultState(), 'sick', 2, '2027-03-10'), '2027-03-10').pauses?.length, 0);
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
  assert.equal(bossFor(pz, monday).maxHp, 550); // 750 x 5/7 = 536 -> 550
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
  assert.deepEqual(hqOrder({ order: ['achievements', 'gone', 'weather'], hidden: [] }).slice(0, 3), ['achievements', 'weather', 'countdowns']);
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
