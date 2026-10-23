// Reads the phone's own calendar database. On Android that already contains
// Google Calendar, and Outlook too once "Sync calendars" is on in the Outlook app,
// so no logins are needed. Not available inside Expo Go (needs the installed APK).
import { isRunningInExpoGo } from 'expo';
import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';

import { allDayLocal } from './calendar-days';
import type { CalEvent, CalInfo, CalStatus } from './types';

export const calendarSupported = Platform.OS !== 'web' && !isRunningInExpoGo();

export async function calendarPermission(ask: boolean): Promise<CalStatus> {
  if (!calendarSupported) return 'unsupported';
  const res = ask ? await Calendar.requestCalendarPermissions() : await Calendar.getCalendarPermissions();
  if (res.granted) return 'granted';
  return res.canAskAgain ? 'unknown' : 'denied';
}

export async function loadCalendars(): Promise<CalInfo[]> {
  const cals = await Calendar.getCalendars(Calendar.EntityTypes.EVENT);
  return cals
    .filter((c) => c.isVisible !== false)
    .map((c) => ({ id: c.id, title: c.title, account: c.source?.name ?? '', color: c.color }));
}

export async function loadEvents(cals: CalInfo[], start: Date, end: Date): Promise<CalEvent[]> {
  if (cals.length === 0) return [];
  const colors = new Map(cals.map((c) => [c.id, c.color]));
  const events = await Calendar.listEvents(
    cals.map((c) => c.id),
    start,
    end,
  );
  return events
    .filter((e) => e.startDate && e.endDate)
    .map((e) => {
      const s = new Date(e.startDate as string | Date).getTime();
      const raw = { start: s, end: new Date(e.endDate as string | Date).getTime() };
      // All-day events come as UTC midnights: as local days they'd spill into the next day.
      const { start, end } = e.allDay ? allDayLocal(raw.start, raw.end) : raw;
      return {
        key: `${e.id}-${s}`,
        title: e.title || '(no title)',
        start,
        end,
        allDay: !!e.allDay,
        location: e.location || null,
        calendarId: e.calendarId,
        color: colors.get(e.calendarId),
      };
    })
    .sort((a, b) => a.start - b.start);
}
