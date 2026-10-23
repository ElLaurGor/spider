// The ghost of last week: you against your own XP from the same point last week. Each day records its
// running XP total per hour (`xpHours`) from step 2b on, so "last Friday at this time" is exact. For a day
// recorded before that, its whole day stands in, and the ghost says so. Weekly totals, never a chain of days.
import { addDays, dayKey, startOfWeek, WEEKDAYS_LONG } from './dates';
import type { DayLog, State } from './types';

/** Timelines older than this go at rollover: the ghost only looks one week back. */
export const XP_HOURS_KEEP_DAYS = 14;

/** Today's running XP total, noted under the current hour. The same state when nothing changed. */
export function withXpHour(s: State, now = new Date()): State {
  const key = dayKey(now);
  const d = s.days[key];
  if (!d) return s;
  const xp = d.xpEarned ?? 0;
  const h = now.getHours();
  if (d.xpHours?.[h] === xp || (!d.xpHours && xp === 0)) return s;
  return { ...s, days: { ...s.days, [key]: { ...d, xpHours: { ...d.xpHours, [h]: xp } } } };
}

/** Drops timelines older than XP_HOURS_KEEP_DAYS. The same state when there's nothing to drop. */
export function withoutOldXpHours(s: State, today = dayKey()): State {
  const cutoff = dayKey(addDays(new Date(`${today}T12:00`), -XP_HOURS_KEEP_DAYS));
  let days = s.days;
  for (const [k, d] of Object.entries(s.days)) {
    if (k >= cutoff || !d.xpHours) continue;
    if (days === s.days) days = { ...s.days };
    days[k] = { ...d, xpHours: undefined };
  }
  return days === s.days ? s : { ...s, days };
}

/** XP a day had earned by the end of hour `h` (its last note at or before then), or null when the day has no timeline. */
export function xpByHour(d: DayLog | undefined, h: number): number | null {
  if (!d?.xpHours) return null;
  let best = -1;
  let xp = 0;
  for (const [k, v] of Object.entries(d.xpHours)) {
    const hour = Number(k);
    if (hour <= h && hour > best) {
      best = hour;
      xp = v;
    }
  }
  return xp;
}

/**
 * `then`: last week's XP up to the same weekday and hour. `exact` is false when last week's day has no
 * timeline: then its whole day counts ("by the end of last Friday"). `now`: this week so far. Null when
 * last week earned nothing to race against (a first week, or a week away).
 */
export type Ghost = { then: number; now: number; exact: boolean; weekday: string };

export function ghostOf(s: State, now = new Date()): Ghost | null {
  const monday = startOfWeek(now);
  const lastMonday = addDays(monday, -7);
  const today = dayKey(now);
  let mine = 0;
  let then = 0;
  let lastWeek = 0;
  let exact = false;
  for (let i = 0; i < 7; i++) {
    const past = s.days[dayKey(addDays(lastMonday, i))];
    lastWeek += past?.xpEarned ?? 0;
  }
  for (let i = 0; i < 7; i++) {
    const key = dayKey(addDays(monday, i));
    const past = s.days[dayKey(addDays(lastMonday, i))];
    mine += s.days[key]?.xpEarned ?? 0;
    if (key === today) {
      const at = xpByHour(past, now.getHours());
      exact = at != null;
      then += at ?? past?.xpEarned ?? 0;
      break;
    }
    then += past?.xpEarned ?? 0;
  }
  if (lastWeek === 0) return null;
  return { then, now: mine, exact, weekday: WEEKDAYS_LONG[now.getDay()] };
}

/** "You, last Friday at this time: 612 XP · now: 540", or with a whole day standing in, "by the end of last Friday". */
export const ghostText = (g: Ghost) =>
  `👻 You, ${g.exact ? `last ${g.weekday} at this time` : `last week by the end of ${g.weekday}`}: ${g.then} XP · now: ${g.now}`;
