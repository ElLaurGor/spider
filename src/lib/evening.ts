// step 10 ux: HQ's one Evening card (HQ section `evening`, which took over the old `winddown` and `debrief`
// cards and the worry card's shutdown). Which of its three parts shows when; the times are the old cards'.
// Pure, so logic-test can check it.
import { eveningKey, tomorrowKey } from './memory';
import { dayOf } from './selectors';
import type { State } from './types';
import { shutdownOpen, shutdownQuiet } from './worry';

/** Until 04:00 it's still last night (memory.ts' evening). */
const NIGHT_ENDS = 4;

export type EveningParts = {
  /** The wind-down checklist: from 2 h before bedtime until 04:00, until it's all ticked off. */
  windDown: boolean;
  /** "Debrief →": from 3 h before bedtime until 04:00, until tomorrow's top 3 is picked. */
  debrief: boolean;
  /** "Shutdown complete" from the worry slot (`open`), then the quiet line until morning (`quiet`). */
  shutdown: 'open' | 'quiet' | null;
};

export function eveningParts(s: State, now = Date.now()): EveningParts {
  const hour = new Date(now).getHours();
  const night = hour < NIGHT_ENDS;
  const log = dayOf(s, eveningKey(now));
  return {
    windDown: (hour >= s.settings.sleepHour - 2 || night) && !log.windDownDone && s.windDownItems.length > 0,
    debrief: (hour >= s.settings.sleepHour - 3 || night) && s.topTomorrow?.day !== tomorrowKey(now),
    shutdown: shutdownQuiet(s, now) ? 'quiet' : shutdownOpen(s, now) ? 'open' : null,
  };
}
