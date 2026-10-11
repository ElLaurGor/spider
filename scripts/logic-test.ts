/// <reference types="node" />
// Offline logic checks for the pure modules in src/lib. Run: npm run test:logic
import assert from 'node:assert/strict';

import { atTime, dayKey, fmtClock, fmtDuration, MIN } from '../src/lib/dates';
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
import { ACHIEVEMENTS, levelForXp, levelProgress } from '../src/lib/xp';
import { newLeague, rivalXp, settle, standings, weekKeyOf, TIERS } from '../src/lib/league';
import { coinsFor, rollChest } from '../src/lib/economy';
import { daysLeft, nextDate, upcoming } from '../src/lib/countdowns';
import { insights } from '../src/lib/insights';
import { monthWrapped } from '../src/lib/wrapped';
import { cycleInfo, periodStarts, isPredictedPeriod } from '../src/lib/body';
import { trainedOn, recentGames, gameTotals, gamePenalty, syncedSleep } from '../src/lib/selectors';
import { searchFoods } from '../src/lib/food-db';
import { pickQuests, questsFor, bossFor, BOSSES, WEAKNESS } from '../src/lib/quests';
import { habitsFor } from '../src/lib/habits';
import { weekReport, gradeOf, dayScoreFor } from '../src/lib/report';
import { RESPECT, respectFor } from '../src/lib/respect';
import { describe as wx, weatherKey } from '../src/lib/weather';
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
const known = new Set(['name', 'ml', 'left', 'workout', 'weight', 'reps', 'exercise', 'over', 'penalty', 'count', 'events', 'summary', 'level', 'title', 'n', 'limit', 'cutoff', 'mg', 'steps', 'sleep', 'habit', 'quest', 'boss', 'forecast', 'xp', 'product', 'kcal', 'activity', 'minutes', 'game', 'title', 'month', 'prize', 'reward', 'missing', 'tier', 'rank', 'app', 'time', 'pollen', 'aqi', 'band']);
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
assert.equal(weatherKey({ date: 'x', max: 10, min: 2, rainPct: 80, code: 3 }), 'weatherRain');
assert.equal(weatherKey({ date: 'x', max: 30, min: 18, rainPct: 0, code: 0 }), 'weatherHot');
assert.equal(weatherKey({ date: 'x', max: 1, min: -5, rainPct: 0, code: 0 }), 'weatherCold');

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

// gaming penalty (also used to re-grade edited sessions): first minute free, then 2 XP per started 5 min
assert.equal(gamePenalty(0), 0);
assert.equal(gamePenalty(-10 * 60_000), 0);
assert.equal(gamePenalty(60_000), 0);
assert.equal(gamePenalty(61_000), 2);
assert.equal(gamePenalty(5 * 60_000), 2);
assert.equal(gamePenalty(20 * 60_000), 8);
assert.equal(gamePenalty(21 * 60_000), 10);
// shortening a 2h session to 1h on a 60 min budget refunds everything it cost
assert.equal(gamePenalty(0) - gamePenalty(60 * 60_000), -24);

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

// economy
assert.equal(coinsFor(10), 5);
assert.equal(coinsFor(3), 2);
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

// screen time: social apps over 60 min/day heal the boss; phone games count toward the budget (toggleable)
const sc = defaultState();
sc.days[dayKey()] = { water: [], food: [], sets: [], games: [], bonusGameMin: 0, screen: { totalMin: 300, doomMin: 150, gamesMin: 40, top: [] } };
const base = bossFor(defaultState());
const healedBoss = bossFor(sc);
assert.equal(healedBoss.healed, 90);
assert.equal(healedBoss.maxHp, base.maxHp + 90);
assert.equal(Math.round(gamingUsedMs(sc) / 60_000), 40);
sc.settings.phoneGamesCount = false;
assert.equal(gamingUsedMs(sc), 0);

// secret achievements: 20, unique, none unlocked on a fresh state, some trigger correctly
assert.equal(SECRET_ACHIEVEMENTS.length, 20);
assert.equal(new Set(SECRET_ACHIEVEMENTS.map((a) => a.id)).size, 20);
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

// boss weaknesses: XP earned on days that hit the weakness counts twice; every boss has its weakness and taunts
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
  // when this week's boss is weak to the day, the bonus equals the day's XP
  const now = bossFor(b);
  assert.equal(now.bonus, WEAKNESS[now.id].hit(b, b.days[k], k) ? 100 : 0);
}
