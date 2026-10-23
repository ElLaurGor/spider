// Calendar times that need fixing before use. Pure (calendar.ts loads expo-calendar), so logic-test checks it.

/**
 * An all-day event as local midnight to local midnight. Android stores all-day events at UTC midnight
 * (CalendarContract) and expo-calendar hands that instant over as is, so in Stockholm a Monday all-day event
 * ran Mon 01:00 to Tue 01:00 and showed on Tuesday too. Only UTC midnights are moved: an event already at
 * local midnight is left alone.
 */
export function allDayLocal(start: number, end: number) {
  const s = new Date(start);
  const e = new Date(end);
  if (s.getUTCHours() || s.getUTCMinutes() || e.getUTCHours() || e.getUTCMinutes()) return { start, end };
  const localStart = new Date(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate()).getTime();
  const localEnd = new Date(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate()).getTime();
  return { start: localStart, end: Math.max(localStart, localEnd) };
}
