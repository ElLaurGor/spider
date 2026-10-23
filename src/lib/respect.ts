// S.P.I.D.E.R.'s opinion of you: the average day score over the last 7 days (today not included,
// it's still being played). A rolling window, not a streak: one bad day only moves it a little.
import { atTime, dayKey } from './dates';
import { countedDay } from './day-filters';
import { dayScoreFor } from './report';
import type { State } from './types';

export const RESPECT = [
  { min: 0, name: 'Disappointed', emoji: '😒', line: 'respect0' },
  { min: 45, name: 'Skeptical', emoji: '🤨', line: 'respect1' },
  { min: 60, name: 'Tolerating you', emoji: '😐', line: 'respect2' },
  { min: 72, name: 'Mildly impressed', emoji: '🧐', line: 'respect3' },
  { min: 85, name: 'Grudging fan', emoji: '😏', line: 'respect4' },
] as const;

export type Respect = { score: number; tier: number; name: string; emoji: string; line: (typeof RESPECT)[number]['line'] };

const WINDOW = 7;
const MIN_DAYS = 3; // fewer days than this: still making up its mind

/**
 * Null until there are a few days to judge. Days nothing was logged and rough days (sick or away, a low
 * mood, a period day) don't count: a hard day never costs respect.
 */
export function respectFor(s: State, now = new Date()): Respect | null {
  const scores: number[] = [];
  for (let i = 1; i <= WINDOW; i++) {
    const noon = atTime(now, -i, 12);
    if (countedDay(s, dayKey(noon))) scores.push(dayScoreFor(s, noon));
  }
  if (scores.length < MIN_DAYS) return null;
  const score = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  let tier = 0;
  RESPECT.forEach((r, i) => {
    if (score >= r.min) tier = i;
  });
  const { name, emoji, line } = RESPECT[tier];
  return { score, tier, name, emoji, line };
}
