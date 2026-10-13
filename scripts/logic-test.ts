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
import { HQ_SECTIONS, hqOrder, hqVisible, moveSection, toggleSection } from '../src/lib/hq-layout';
import { fmtTime } from '../src/lib/dates';
import { IMMORTAL_DAYS, immortalTask, taskAgeDays, yesterdayHighlight } from '../src/lib/memory';
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
  assert.equal(now.bonus, WEAKNESS[now.id].hit(b, b.days[k], k) ? 50 : 0);
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
}
