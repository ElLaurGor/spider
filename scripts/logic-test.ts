/// <reference types="node" />
// Offline logic checks for the pure modules in src/lib. Run: npm run test:logic
import assert from 'node:assert/strict';

import { addDays, atTime, dayKey, fmtClock, fmtDuration, MIN, startOfWeek } from '../src/lib/dates';
import { defaultState, hydrate } from '../src/lib/defaults';
import { freshLine, GOLDEN, LINES, line } from '../src/lib/lines';
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
import { newLeague, rivalXp, settle, standings, weekKeyOf, TIERS } from '../src/lib/league';
import { coinsFor, rollChest } from '../src/lib/economy';
import { daysLeft, nextDate, upcoming } from '../src/lib/countdowns';
import { insights } from '../src/lib/insights';
import { monthWrapped } from '../src/lib/wrapped';
import { cycleInfo, periodStarts, isPredictedPeriod } from '../src/lib/body';
import { trainedOn, recentGames, gameTotals, gamePenalty, syncedSleep, waterMl, withPastHealth } from '../src/lib/selectors';
import { searchFoods } from '../src/lib/food-db';
import { pickQuests, questsFor, bossFor, BOSSES, WEAKNESS, xpPace } from '../src/lib/quests';
import { habitsFor } from '../src/lib/habits';
import { weekReport, gradeOf, dayScoreFor } from '../src/lib/report';
import { RESPECT, respectFor } from '../src/lib/respect';
import { isSnow, seasonOn, winterOf } from '../src/lib/seasons';
import { canSign, contractProgress, roughWeek } from '../src/lib/contracts';
import { daylightGain, describe as wx, rainNote, weatherKey } from '../src/lib/weather';
import { aqiBand, isMine, pollenLevel } from '../src/lib/outside';
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
import { FINAL_BOSS, finalBossDue, pickQuestsWithFocus, rageWeaknessOf, rerollFor, xpPace as paceOf } from '../src/lib/quests';
import { WEAK_SPOT_QUESTS, weakSpot } from '../src/lib/weak-spot';

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
const known = new Set(['name', 'ml', 'left', 'workout', 'weight', 'reps', 'exercise', 'over', 'penalty', 'count', 'events', 'summary', 'level', 'title', 'n', 'limit', 'cutoff', 'mg', 'steps', 'sleep', 'habit', 'quest', 'boss', 'forecast', 'xp', 'product', 'kcal', 'activity', 'minutes', 'game', 'title', 'month', 'prize', 'reward', 'missing', 'tier', 'rank', 'app', 'time', 'pollen', 'aqi', 'band', 'goal', 'stake', 'coins']);
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
// latest mood is low (2) -> roasts dialed down to 2 even at savage 10
assert.equal(m.settings.savageLevel, 10);
assert.equal(effectiveSavage(m), 2);
m.days[k].moods!.push({ id: 'm3', level: 5, emotions: [], at: 3 });
assert.equal(effectiveSavage(m), 10);
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

console.log('all logic tests passed');

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
  b.days[k] = { ...b.days[k], water: [{ id: 'w', ml: b.settings.waterGoalMl, at: Date.now() }] };
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
