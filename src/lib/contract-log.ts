// The contract ledger (step 8): every contract as it settled (week, goal, difficulty, stake, target, status,
// what it paid back), the newest 52, and the totals Records shows: won and lost, net coins, the favourite goal
// and the hardest win. A voided contract (a rough week) is rest, never a loss: it nets zero and isn't counted
// as lost. Theme-free, so logic-test can check it.
import { DIFFICULTIES } from './contracts';
import type { Contract, ContractEntry, ContractGoal, State } from './types';

export const LOG_KEEP = 52;

export const contractLogOf = (s: State) => s.contractLog ?? [];

/** `s` with contract `c` logged as settled (`payout`: coins paid back). One entry per week and goal: a re-log replaces it. */
export function withLogged(s: State, c: Contract, status: ContractEntry['status'], payout: number, tally?: { showed: number; fired: number }, at = Date.now()): State {
  const entry: ContractEntry = {
    week: c.week,
    goal: c.goal,
    difficulty: c.difficulty ?? 'normal',
    stake: c.stake,
    target: c.target,
    status,
    payout,
    at,
    ...(c.woop && tally ? { woop: { obstacle: c.woop.obstacle, ...tally } } : {}),
  };
  const rest = contractLogOf(s).filter((e) => !(e.week === c.week && e.goal === c.goal));
  return { ...s, contractLog: [...rest, entry].slice(-LOG_KEEP) };
}

/** What an entry did to the coins: the payout minus the stake once won, the stake once lost, nothing when voided. */
export const netOf = (e: ContractEntry) => (e.status === 'won' ? e.payout - e.stake : e.status === 'lost' ? -e.stake : 0);

export type ContractStats = {
  n: number;
  won: number;
  lost: number;
  rest: number; // voided: rough weeks
  net: number;
  favourite: { goal: ContractGoal; n: number } | null;
  hardest: ContractEntry | null;
};

/** The ledger's totals. Favourite: the goal signed most (the latest of a tie). Hardest win: the highest multiplier, then target. */
export function contractStats(s: State): ContractStats {
  const log = contractLogOf(s);
  const count = new Map<ContractGoal, { n: number; last: number }>();
  log.forEach((e, i) => count.set(e.goal, { n: (count.get(e.goal)?.n ?? 0) + 1, last: i }));
  const fav = [...count].sort((a, b) => b[1].n - a[1].n || b[1].last - a[1].last)[0];
  const mult = (e: ContractEntry) => DIFFICULTIES[e.difficulty].mult;
  const hardest =
    log
      .filter((e) => e.status === 'won')
      .sort((a, b) => mult(b) - mult(a) || b.target - a.target || b.week.localeCompare(a.week))[0] ?? null;
  return {
    n: log.length,
    won: log.filter((e) => e.status === 'won').length,
    lost: log.filter((e) => e.status === 'lost').length,
    rest: log.filter((e) => e.status === 'voided').length,
    net: log.reduce((a, e) => a + netOf(e), 0),
    favourite: fav ? { goal: fav[0], n: fav[1].n } : null,
    hardest,
  };
}
