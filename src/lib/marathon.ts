// The meeting-marathon reset (step 9 care): when the calendar shows 2 hours or more of back-to-back meetings
// that end in a gap of 10 minutes or more, one ping at the gap: "2 minutes: stand, window, water". At most one
// move ping a day: it shares its cap with the move nudge (Settings → movement), so the two never stack. Not on
// paused or low-battery days (notifications.ts checks those). Pure, so logic-test can check it.
import { MIN } from './dates';
import { eventsOn } from './selectors';
import type { CalEvent } from './types';

/** A run of meetings this long counts as a marathon. */
export const MARATHON_MIN = 120;
/**
 * The gap that ends a run, and that two minutes fit in. Anything shorter between two meetings is back to back:
 * no time for a reset there, so the run goes on.
 */
export const GAP_MIN = 10;

/**
 * The day's first meeting marathon: `at` is when the gap after it starts (the ping), `from` when the run began,
 * `gap` how long the gap is (Infinity after the day's last meeting). Timed events only; overlapping ones merge.
 */
export function marathonGap(events: CalEvent[], date: Date | number): { at: number; from: number; gap: number } | null {
  const timed = eventsOn(events, date)
    .filter((e) => !e.allDay && e.end > e.start)
    .sort((a, b) => a.start - b.start);
  let i = 0;
  while (i < timed.length) {
    const from = timed[i].start;
    let end = timed[i].end;
    let j = i + 1;
    while (j < timed.length && timed[j].start - end < GAP_MIN * MIN) {
      end = Math.max(end, timed[j].end);
      j++;
    }
    if (end - from >= MARATHON_MIN * MIN) return { at: end, from, gap: (timed[j]?.start ?? Infinity) - end };
    i = j;
  }
  return null;
}

export type MovePing = { kind: 'move' | 'reset'; at: number };

/**
 * The day's one move ping, from its candidates (null where it isn't on, or doesn't apply): the earliest wins.
 * Once that one's time has passed it went out, so the day has had its ping and nothing else is planned.
 */
export function movePingOf(move: number | null, reset: number | null, now = Date.now()): MovePing | null {
  const all: MovePing[] = [];
  if (move != null) all.push({ kind: 'move', at: move });
  if (reset != null) all.push({ kind: 'reset', at: reset });
  const first = all.sort((a, b) => a.at - b.at)[0];
  return first && first.at > now ? first : null;
}
