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

/** Reminders planned again on every app change, by id prefix. Gaming, rest, focus, snooze, the status line and warnings are managed apart. */
export const PLANNED_PREFIXES = ['water-', 'gym-', 'morning-', 'evening-', 'comeback-', 'mood-', 'habit-', 'report-', 'backup-', 'sleep-', 'cycle-', 'countdown-', 'wrapped-', 'winddown-', 'league-', 'pollen-', 'air-', 'move-', 'weekendboss-', 'ifthen-', 'prizes-'];
export const isPlanned = (id: string) => PLANNED_PREFIXES.some((p) => id.startsWith(p));

/**
 * A planned reminder this close to going off is left alone by a replan. One moved to "now + 5 s" by a replan
 * moments ago is past its own time by the next replan, so cancelling it there would lose it for good.
 */
export const IMMINENT_MS = 15_000;

/** The scheduled ids a replan cancels: every planned one except those about to go off (Android's date trigger carries its time as `value`). */
export function plannedToCancel(scheduled: readonly { identifier: string; trigger?: unknown }[], now = Date.now()) {
  return scheduled
    .filter((n) => {
      const at = n.trigger && typeof n.trigger === 'object' ? (n.trigger as { value?: unknown }).value : undefined;
      return isPlanned(n.identifier) && !(typeof at === 'number' && at <= now + IMMINENT_MS);
    })
    .map((n) => n.identifier);
}

/**
 * A storm that starts while the app is closed (bg-alerts.ts): of the reminders already planned for the days it
 * covers, the roasts are taken back (gym shame, the slipping-workout nudge, the move break, the evening verdict
 * with its immortal-task joke, the weekend boss push) and the water reminders get kind words. The app plans
 * everything in the Storm protocol's tone again once it's opened.
 */
export function stormPlan(ids: readonly string[], days: readonly string[]) {
  const roasts = new Set(days.flatMap((d) => [`gym-${d}-shame`, `gym-${d}-move`, `move-${d}`, `evening-${d}`, `weekendboss-${d}`]));
  return {
    cancel: ids.filter((id) => roasts.has(id)),
    soften: ids.filter((id) => days.some((d) => id.startsWith(`water-${d}-`))),
  };
}
