// Sten, sax, påse against the spider, played from the terrarium: a match is up to ROUNDS rounds, decided once one
// side can't be caught. The spider guesses her next throw from her own past throws (how often she throws each, what
// she opens a match with, what follows her last throw, and whether she stays or switches after winning or losing a
// round) and throws what beats it, now and then something random so it can't be read back. Its taunts quote the
// real numbers. A won match pays a few coins, at most RPS_DAILY_COINS a day, never XP. The week's wins, losses and
// draws are a tally, never a run of anything. Pure, so the tests can play it.
import { dayKey, startOfWeek } from './dates';
import type { RpsLast, RpsState, RpsTally, RpsThrow } from './types';

export const THROWS: readonly RpsThrow[] = ['r', 'p', 's'];
export const THROW_NAME: Record<RpsThrow, string> = { r: 'rock', p: 'paper', s: 'scissors' };
export const THROW_EMOJI: Record<RpsThrow, string> = { r: '✊', p: '✋', s: '✌️' };
/** What each throw beats: rock blunts scissors, scissors cut paper, paper wraps rock. */
export const BEATS: Record<RpsThrow, RpsThrow> = { r: 's', s: 'p', p: 'r' };
/** What beats each throw. */
export const BEATEN_BY: Record<RpsThrow, RpsThrow> = { r: 'p', p: 's', s: 'r' };

/** Rounds in a match at most ("best of 10"). */
export const ROUNDS = 10;
/** Throws kept for the guessing (hers, with the spider's answer). */
export const RPS_KEEP = 500;
/** What a won match pays, and the most the game pays in a day. Coins only. */
export const RPS_WIN_COINS = 5;
export const RPS_DAILY_COINS = 10;
/** Weeks the tally keeps. */
export const RPS_WEEKS = 8;
/** How often the spider throws something random instead of its guess. */
export const EXPLORE = 0.12;
/** A taunt needs this many throws behind its number. */
export const TAUNT_MIN = 8;

export const isThrow = (x: unknown): x is RpsThrow => x === 'r' || x === 'p' || x === 's';

/** A round from her side. */
export type Outcome = 'win' | 'loss' | 'draw';
export const outcomeOf = (me: RpsThrow, it: RpsThrow): Outcome => (me === it ? 'draw' : BEATS[me] === it ? 'win' : 'loss');

export const emptyRps = (): RpsState => ({ past: [] });
export const rpsOf = (s: { rps?: RpsState }): RpsState => s.rps ?? emptyRps();

/** A match string's rounds: [her throw, the spider's]. Anything that isn't a throw is skipped. */
export function pairsOf(match: string | undefined): [RpsThrow, RpsThrow][] {
  const out: [RpsThrow, RpsThrow][] = [];
  const m = match ?? '';
  for (let i = 0; i + 1 < m.length; i += 2) {
    const a = m[i];
    const b = m[i + 1];
    if (isThrow(a) && isThrow(b)) out.push([a, b]);
  }
  return out;
}

/** A match so far: rounds she won, rounds the spider won, rounds played. */
export function scoreOf(match: string | undefined) {
  let you = 0;
  let spider = 0;
  const rounds = pairsOf(match);
  for (const [me, it] of rounds) {
    const o = outcomeOf(me, it);
    if (o === 'win') you++;
    else if (o === 'loss') spider++;
  }
  return { you, spider, played: rounds.length };
}

/** A match is over once ROUNDS are played or one side is ahead by more than the rounds left. */
export function decided(match: string | undefined): boolean {
  const { you, spider, played } = scoreOf(match);
  const left = ROUNDS - played;
  return left <= 0 || you > spider + left || spider > you + left;
}

// ---------- what she tends to throw ----------

type Counts = Record<RpsThrow, number>;
const zero = (): Counts => ({ r: 0, p: 0, s: 0 });
const sum = (c: Counts) => c.r + c.p + c.s;
/** After a round: her next throw the same (`stay`), the one that beats her last (`up`), or the one her last beats (`down`). */
type Shift = { stay: number; up: number; down: number };

export type RpsHabits = {
  all: Counts; // every throw
  open: Counts; // the first throw of a match
  after: Record<RpsThrow, Counts>; // the throw after each of hers, in the same match
  afterOutcome: Record<Outcome, Shift>; // after a round won, lost or drawn
  afterLoss: Counts; // the throw after a round she lost
};

/** Her habits over every kept throw, the match being played included. */
export function habitsOf(rps: RpsState): RpsHabits {
  const h: RpsHabits = {
    all: zero(),
    open: zero(),
    after: { r: zero(), p: zero(), s: zero() },
    afterOutcome: { win: { stay: 0, up: 0, down: 0 }, loss: { stay: 0, up: 0, down: 0 }, draw: { stay: 0, up: 0, down: 0 } },
    afterLoss: zero(),
  };
  for (const match of [...rps.past, rps.live ?? '']) {
    const rounds = pairsOf(match);
    rounds.forEach(([me], i) => {
      h.all[me]++;
      if (i === 0) {
        h.open[me]++;
        return;
      }
      const [prev, prevIt] = rounds[i - 1];
      h.after[prev][me]++;
      const o = outcomeOf(prev, prevIt);
      const shift = h.afterOutcome[o];
      if (me === prev) shift.stay++;
      else if (me === BEATEN_BY[prev]) shift.up++;
      else shift.down++;
      if (o === 'loss') h.afterLoss[me]++;
    });
  }
  return h;
}

/** How likely each throw of hers is next (summing to 1), from her habits and where the match is. Even odds with nothing to go on. */
export function nextOdds(rps: RpsState): Record<RpsThrow, number> {
  const h = habitsOf(rps);
  const live = pairsOf(rps.live);
  const parts: { w: number; p: Counts }[] = [];
  // Each source weighs more the more throws are behind it; smoothed so one throw isn't a certainty.
  const add = (c: Counts, k: number) => {
    const n = sum(c);
    if (!n) return;
    parts.push({ w: (k * n) / (n + 6), p: { r: (c.r + 1) / (n + 3), p: (c.p + 1) / (n + 3), s: (c.s + 1) / (n + 3) } });
  };
  add(h.all, 1);
  const last = live.at(-1);
  if (!last) add(h.open, 2);
  else {
    const [me, it] = last;
    add(h.after[me], 2);
    const sh = h.afterOutcome[outcomeOf(me, it)];
    const c = zero();
    c[me] += sh.stay;
    c[BEATEN_BY[me]] += sh.up;
    c[BEATS[me]] += sh.down;
    add(c, 2);
  }
  const total = parts.reduce((a, x) => a + x.w, 0);
  if (!total) return { r: 1 / 3, p: 1 / 3, s: 1 / 3 };
  const out = zero();
  for (const x of parts) for (const t of THROWS) out[t] += (x.w * x.p[t]) / total;
  return out;
}

/** Her likeliest next throw (ties go to `rnd`). */
export function guessOf(rps: RpsState, rnd: () => number = Math.random): RpsThrow {
  const odds = nextOdds(rps);
  const best = Math.max(...THROWS.map((t) => odds[t]));
  const top = THROWS.filter((t) => odds[t] >= best - 1e-9);
  return top[Math.min(top.length - 1, Math.floor(rnd() * top.length))];
}

/** The spider's throw: what beats her likeliest next throw, now and then (EXPLORE) a random one. */
export function spiderThrow(rps: RpsState, rnd: () => number = Math.random): RpsThrow {
  if (rnd() < EXPLORE) return THROWS[Math.min(2, Math.floor(rnd() * 3))];
  return BEATEN_BY[guessOf(rps, rnd)];
}

// ---------- playing ----------

const weekOf = (now: Date) => dayKey(startOfWeek(now));
const throwsIn = (matches: string[]) => matches.reduce((a, m) => a + pairsOf(m).length, 0);

/** The finished matches, dropping the oldest until at most RPS_KEEP throws are left. */
function trimmed(past: string[]): string[] {
  const out = [...past];
  while (out.length > 1 && throwsIn(out) > RPS_KEEP) out.shift();
  return out;
}

export type RoundResult = { rps: RpsState; outcome: Outcome; ended?: 'won' | 'lost' | 'draw'; coins: number };

/**
 * A round: her throw `me` against the spider's `it` (chosen before hers was known). Once the match is decided it
 * goes into the kept throws, the week's tally counts it, and a win pays RPS_WIN_COINS within today's cap.
 */
export function playRound(rps: RpsState, me: RpsThrow, it: RpsThrow, now = new Date()): RoundResult {
  const live = (rps.live ?? '') + me + it;
  const score = scoreOf(live);
  const outcome = outcomeOf(me, it);
  const base: RpsLast = { me, it, at: now.getTime(), you: score.you, spider: score.spider };
  if (!decided(live)) return { rps: { ...rps, live, last: base }, outcome, coins: 0 };
  const ended = score.you > score.spider ? 'won' : score.you < score.spider ? 'lost' : 'draw';
  const day = dayKey(now);
  const paidToday = rps.paid?.day === day ? rps.paid.coins : 0;
  const coins = ended === 'won' ? Math.max(0, Math.min(RPS_WIN_COINS, RPS_DAILY_COINS - paidToday)) : 0;
  const week = weekOf(now);
  const t = rps.weeks?.[week] ?? { w: 0, l: 0, d: 0 };
  const tally: RpsTally = ended === 'won' ? { ...t, w: t.w + 1 } : ended === 'lost' ? { ...t, l: t.l + 1 } : { ...t, d: t.d + 1 };
  const weeks = Object.fromEntries(
    Object.entries({ ...rps.weeks, [week]: tally })
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .slice(-RPS_WEEKS),
  );
  const next: RpsState = { past: trimmed([...rps.past, live]), weeks, paid: { day, coins: paidToday + coins }, last: { ...base, ended, coins } };
  return { rps: next, outcome, ended, coins };
}

/** This week's won, lost and drawn matches. */
export const weekTally = (rps: RpsState, now = new Date()): RpsTally => rps.weeks?.[weekOf(now)] ?? { w: 0, l: 0, d: 0 };

/** Coins the game can still pay today. */
export const coinsLeftToday = (rps: RpsState, now = new Date()) => Math.max(0, RPS_DAILY_COINS - (rps.paid?.day === dayKey(now) ? rps.paid.coins : 0));

/** Every throw kept, hers. */
export const throwCount = (rps: RpsState) => throwsIn([...rps.past, rps.live ?? '']);

// ---------- taunts, with her real numbers ----------

const pct = (a: number, n: number) => Math.round((100 * a) / n);
const topOf = (c: Counts) => {
  const t = THROWS.reduce((a, b) => (c[b] > c[a] ? b : a));
  const n = sum(c);
  return { t, n, share: n ? c[t] / n : 0 };
};
const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);

/**
 * A taunt quoting her own numbers, for where the match is: what she opens with (at the start), what she throws
 * after losing a round, whether she repeats after winning one, what follows her last throw, or what she throws
 * most. Null until a pattern has TAUNT_MIN throws behind it and is clear enough to be worth saying.
 */
export function rpsFinding(rps: RpsState): string | null {
  const h = habitsOf(rps);
  const last = pairsOf(rps.live).at(-1);
  if (!last) {
    const o = topOf(h.open);
    if (o.n >= TAUNT_MIN && o.share >= 0.4) return `You open with ${THROW_NAME[o.t]} ${pct(o.share * o.n, o.n)}% of the time.`;
  } else {
    const [me, it] = last;
    const o = outcomeOf(me, it);
    if (o === 'loss') {
      const l = topOf(h.afterLoss);
      if (l.n >= TAUNT_MIN && l.share >= 0.4) return `After losing a round you go ${THROW_NAME[l.t]} ${pct(l.share * l.n, l.n)}% of the time.`;
    }
    if (o === 'win') {
      const w = h.afterOutcome.win;
      const n = w.stay + w.up + w.down;
      if (n >= TAUNT_MIN && w.stay / n >= 0.45) return `After winning a round you throw the same again ${pct(w.stay, n)}% of the time.`;
    }
    const a = topOf(h.after[me]);
    if (a.n >= TAUNT_MIN && a.share >= 0.45)
      return a.t === me ? `After ${THROW_NAME[me]} you throw ${THROW_NAME[me]} again ${pct(a.share * a.n, a.n)}% of the time.` : `After ${THROW_NAME[me]} you go ${THROW_NAME[a.t]} ${pct(a.share * a.n, a.n)}% of the time.`;
  }
  const all = topOf(h.all);
  if (all.n >= TAUNT_MIN * 2 && all.share >= 0.38) return `${cap(THROW_NAME[all.t])} is ${pct(all.share * all.n, all.n)}% of everything you throw.`;
  return null;
}
