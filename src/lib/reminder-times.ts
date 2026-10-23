// When some planned reminders go out. Pure (no expo, no theme), so logic-test can check them.
import { atTime } from './dates';

/**
 * The period heads-up: 10:00 two days before the predicted start. It's still planned on its own morning
 * (two days to go), or a replan before 10:00 would cancel it without putting it back.
 */
export const cycleHeadsUpAt = (info: { daysUntil: number; nextStart: Date }) => (info.daysUntil >= 2 ? atTime(info.nextStart, -2, 10) : null);

/** Monthly Wrapped: the next 1st at 10:00 (today's, on the 1st before 10:00), for the month before it. */
export function wrappedReminder(now = new Date()) {
  const thisFirst = new Date(now.getFullYear(), now.getMonth(), 1, 10);
  const at = thisFirst.getTime() > now.getTime() ? thisFirst : new Date(now.getFullYear(), now.getMonth() + 1, 1, 10);
  const month = new Date(at.getFullYear(), at.getMonth() - 1, 1).toLocaleDateString('en-GB', { month: 'long' });
  return { at, month };
}
