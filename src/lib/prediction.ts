// Call your shot (step 8). Each normal morning the owner makes one call about the day ahead: on a planned gym
// day "Gym today?", otherwise "All quests today?", answered no chance / coin flip / probably / lock. It's
// settled at the day's rollover, and void (not scored) when the day isn't a counted one (day-filters.ts): a
// rough day is rest, never a missed call. Each month is scored with the Brier score, which gives a title and a
// few coins. The payout is an affine function of the Brier score, a proper scoring rule: what pays best on
// average is the call that says what you really expect, so sandbagging never pays. Coins only, never XP.
// Theme-free, so logic-test can check it.
import { addDays, dayKey } from './dates';
import { countedDay, roughDay } from './day-filters';
import { pausedOn } from './pause';
import { DRAFT_UNTIL_HOUR, reducedDay } from './quests';
import { dayOf, trainedOn, workoutFor } from './selectors';
import { movedFrom } from './workout-move';
import type { Shot, ShotCall, State } from './types';

export const CALLS: { id: ShotCall; label: string; p: number }[] = [
  { id: 'no', label: 'No chance', p: 0.1 },
  { id: 'flip', label: 'Coin flip', p: 0.5 },
  { id: 'probably', label: 'Probably', p: 0.75 },
  { id: 'lock', label: 'Lock', p: 0.95 },
];
export const callOf = (id: ShotCall) => CALLS.find((c) => c.id === id) ?? CALLS[1];

/** Calls the morning allows: until the draft closes (noon). */
export const SHOT_UNTIL_HOUR = DRAFT_UNTIL_HOUR;
/** Coins per settled call at a perfect score: each pays SHOT_COINS × (1 − its Brier score), summed over the month. */
export const SHOT_COINS = 4;
/** Calls a month needs before it gets a title. */
export const MIN_CALLS = 5;
/** How far the average call may sit from the hit rate and still count as calibrated. */
export const BIAS_LIMIT = 0.15;

const noon = (key: string) => new Date(`${key}T12:00`);

/** The question a day asks: a planned gym day asks about the gym, any other day about all the quests. */
export const shotQuestion = (s: State, date: Date | number = new Date()): Shot['q'] => (workoutFor(s, date) ? 'gym' : 'quests');
export const questionText = (q: Shot['q']) => (q === 'gym' ? 'Gym today?' : 'All quests today?');

/**
 * Whether today's call can still be made: a normal day (not reduced, not a rough one), before noon, no call yet,
 * and the answer not known already (trained, or every quest done).
 */
export function shotOpen(s: State, now = new Date()) {
  const key = dayKey(now);
  const d = dayOf(s, key);
  if (!s.onboarded || d.shot || now.getHours() >= SHOT_UNTIL_HOUR) return false;
  if (reducedDay(s, key) || pausedOn(s, key) || roughDay(s, key) != null) return false;
  return shotQuestion(s, now) === 'gym' ? !trainedOn(d) : !d.questsAllDone && !!d.quests?.length;
}

/** Today with the call made. Unchanged when no call can be made now. */
export function withShot(s: State, call: ShotCall, now = new Date()): State {
  if (!shotOpen(s, now)) return s;
  const key = dayKey(now);
  const shot: Shot = { q: shotQuestion(s, now), call, p: callOf(call).p, at: now.getTime() };
  return { ...s, days: { ...s.days, [key]: { ...dayOf(s, key), shot } } };
}

/**
 * How a finished day's call went. Void when the day isn't counted (nothing logged, or a rough day), when its
 * workout moved to another day (moving is never a miss) or when a quest call's day turned reduced.
 */
export function outcomeOf(s: State, key: string, shot: Shot): NonNullable<Shot['result']> {
  if (!countedDay(s, key)) return 'void';
  const d = dayOf(s, key);
  if (shot.q === 'gym') {
    const moved = movedFrom(s, key);
    // Moving it before the call takes the question away; moving it after the call is how the day went.
    if ((moved && moved.at < shot.at) || (!moved && !workoutFor(s, noon(key)))) return 'void';
    return trainedOn(d) ? 'hit' : 'miss';
  }
  if (reducedDay(s, key)) return 'void';
  return d.questsAllDone ? 'hit' : 'miss';
}

/** Settles every call on a day before `today` that isn't settled yet (the rollover runs this). */
export function settleShots(s: State, today = dayKey()): { state: State; settled: { key: string; shot: Shot }[] } {
  const settled: { key: string; shot: Shot }[] = [];
  let days = s.days;
  for (const [key, d] of Object.entries(s.days)) {
    if (key >= today || !d.shot || d.shot.result) continue;
    const shot = { ...d.shot, result: outcomeOf(s, key, d.shot) };
    if (days === s.days) days = { ...s.days };
    days[key] = { ...d, shot };
    settled.push({ key, shot });
  }
  settled.sort((a, b) => a.key.localeCompare(b.key));
  return { state: days === s.days ? s : { ...s, days }, settled };
}

/** Scored calls (hit or miss, never void), oldest first; `month` ('YYYY-MM') narrows it to one month. */
export function scoredShots(s: State, month?: string): { key: string; shot: Shot }[] {
  return Object.entries(s.days)
    .filter(([k, d]) => (!month || k.startsWith(month)) && (d.shot?.result === 'hit' || d.shot?.result === 'miss'))
    .map(([key, d]) => ({ key, shot: d.shot as Shot }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

/** A voided call (a rough day, a move made before the call) pays like a coin flip: neither a loss nor a way out of a miss. */
export const VOID_BRIER = 0.25;
const voidCount = (s: State, month: string) => Object.entries(s.days).filter(([k, d]) => k.startsWith(month) && d.shot?.result === 'void').length;

/** A call's Brier score: the squared distance between the chance it gave and what happened (0 best, 1 worst). */
export const brierOf = (shot: Shot) => (shot.p - (shot.result === 'hit' ? 1 : 0)) ** 2;

export type Calibration = { n: number; brier: number | null; meanP: number; hitRate: number; bias: number; title: string | null; coins: number };

/**
 * A month's calibration: its Brier score, how far the average call sat from the hit rate (positive: overconfident),
 * a title once it has MIN_CALLS calls, and the coins it pays.
 */
export function calibration(s: State, month: string): Calibration {
  const shots = scoredShots(s, month).map((x) => x.shot);
  const n = shots.length;
  if (!n) return { n, brier: null, meanP: 0, hitRate: 0, bias: 0, title: null, coins: Math.round(voidCount(s, month) * SHOT_COINS * (1 - VOID_BRIER)) };
  const brier = shots.reduce((a, x) => a + brierOf(x), 0) / n;
  const meanP = shots.reduce((a, x) => a + x.p, 0) / n;
  const hitRate = shots.filter((x) => x.result === 'hit').length / n;
  const bias = meanP - hitRate;
  const coins = Math.round(shots.reduce((a, x) => a + SHOT_COINS * (1 - brierOf(x)), 0) + voidCount(s, month) * SHOT_COINS * (1 - VOID_BRIER));
  return { n, brier, meanP, hitRate, bias, title: titleFor(n, bias, brier), coins };
}

/** The month's title: over- or under-confident first, then how sharp the calls were. */
export function titleFor(n: number, bias: number, brier: number): string | null {
  if (n < MIN_CALLS) return null;
  if (bias > BIAS_LIMIT) return 'Overconfident Oracle';
  if (bias < -BIAS_LIMIT) return 'Sandbagger';
  if (brier <= 0.1) return 'Dead-Eye Oracle';
  if (brier <= 0.2) return 'Calibrated';
  return 'Coin Flipper';
}

export const monthOf = (date: Date | number) => dayKey(date).slice(0, 7);
const prevMonth = (date: Date) => monthOf(new Date(date.getFullYear(), date.getMonth() - 1, 15));

/**
 * At month start: last month's calls scored and paid, once (`shotsPaid` remembers the month). A month without
 * scored calls is only marked. Null award when there's nothing to say.
 */
export function settleShotMonth(s: State, now = new Date()): { state: State; award: (Calibration & { month: string }) | null } {
  const last = prevMonth(now);
  if (s.shotsPaid && s.shotsPaid >= last) return { state: s, award: null };
  // Every month since the last one paid (the app may not have been opened for weeks); the newest with calls is announced.
  const first = s.shotsPaid ? nextMonth(s.shotsPaid) : (Object.keys(s.days).filter((k) => s.days[k].shot).sort()[0]?.slice(0, 7) ?? last);
  let state: State = s;
  let award: (Calibration & { month: string }) | null = null;
  for (let m = first < last ? first : last; m <= last; m = nextMonth(m)) {
    const c = calibration(state, m);
    state = { ...state, shotsPaid: m, coins: state.coins + c.coins, coinsEarned: state.coinsEarned + c.coins };
    if (c.n) award = { ...c, month: m };
  }
  return { state, award };
}

const nextMonth = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  return monthOf(new Date(y, m, 15));
};

/** How a kind of call has gone before (scored calls only): for "You said lock. History says 55 %." */
export function callHistory(s: State, call: ShotCall, before = dayKey()) {
  const xs = scoredShots(s).filter((x) => x.key < before && x.shot.call === call);
  const hits = xs.filter((x) => x.shot.result === 'hit').length;
  return { n: xs.length, pct: xs.length ? Math.round((hits / xs.length) * 100) : null };
}

/** The settled call of the day before `today`, if it was scored: for the morning's toast. */
export function yesterdayShot(settled: { key: string; shot: Shot }[], today = dayKey()) {
  const y = dayKey(addDays(noon(today), -1));
  const x = settled.find((t) => t.key === y);
  return x && x.shot.result !== 'void' ? x.shot : null;
}

/** "gym" or "all quests", for the lines. */
export const questionWord = (q: Shot['q']) => (q === 'gym' ? 'the gym' : 'all quests');
