// The words on HQ's This week card (components/week-card.tsx). Kept pure so logic-test can check them.
import { MEDAL_EMOJI, type MedalStanding } from './medals';

/** The medals line: the ones won so far this week, then the closest next tier ("🥈 Water goal: 2 days to go"). */
export function medalLine(list: MedalStanding[]): string {
  const won = list.filter((m) => m.tier).map((m) => `${m.def.emoji}${MEDAL_EMOJI[m.tier!]}`);
  const closest = list
    .filter((m) => m.next)
    .map((m) => ({ m, left: m.need[m.next!] - m.count }))
    .sort((a, b) => a.left - b.left)[0];
  const hint = closest ? `${MEDAL_EMOJI[closest.m.next!]} ${closest.m.def.label}: ${closest.m.def.unit(closest.left)} to go` : 'all at gold';
  return won.length ? `${won.join(' ')} · next ${hint}` : `none yet · closest ${hint}`;
}

/** Days left in the week of `date` (Monday to Sunday), today included. */
export const weekDaysLeft = (date: Date) => 7 - ((date.getDay() + 6) % 7);
