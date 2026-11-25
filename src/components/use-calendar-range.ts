// step 10 meetings: a range of days read back from the phone's own calendar, past weeks included, for the meeting
// load (meeting-load.ts) in the War room, the Report and Wrapped. Nothing is saved for it: the phone's calendar is
// the record. Kept in memory for the session: a range that's over is read once, one that reaches today again after
// RANGE_TTL_MS. Read only while the calendar permission is granted (the APK; Expo Go has no calendar).
import { useEffect, useState } from 'react';

import { useToday } from '@/components/use-today';
import { loadEvents } from '@/lib/calendar';
import { MIN } from '@/lib/dates';
import { readRange } from '@/lib/meeting-load';
import { useStore } from '@/lib/store';
import type { CalEvent } from '@/lib/types';

const RANGE_TTL_MS = 10 * MIN;
const CACHE_MAX = 12;
const cache = new Map<string, { at: number; events: CalEvent[] }>();

export type CalendarRange = { status: 'off' | 'loading' | 'ready' | 'failed'; events: CalEvent[] | null };

/** The events from day `from` to day `to` (both included), from the calendars the app reads. `on` false: nothing is read. */
export function useCalendarRange(from: string, to: string, on = true): CalendarRange {
  const { state, cal } = useStore();
  const today = useToday();
  const ids = state.settings.calendarIds;
  const calKey = cal.calendars
    .filter((c) => !ids || ids.includes(c.id))
    .map((c) => c.id)
    .join(',');
  const key = `${from}|${to}|${calKey}`;
  const ready = on && cal.status === 'granted' && calKey !== '';
  const [got, setGot] = useState<{ key: string; events: CalEvent[] | null } | null>(null);

  useEffect(() => {
    if (!ready) return;
    const hit = cache.get(key);
    if (hit && (to < today || Date.now() - hit.at < RANGE_TTL_MS)) return;
    let alive = true;
    const chosen = cal.calendars.filter((c) => calKey.split(',').includes(c.id));
    const { start, end } = readRange(from, to);
    loadEvents(chosen, start, end)
      .then((events) => {
        cache.delete(key);
        cache.set(key, { at: Date.now(), events });
        while (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value as string);
        if (alive) setGot({ key, events });
      })
      .catch((e) => {
        console.warn('[spider] calendar range failed', e);
        if (alive) setGot({ key, events: null });
      });
    return () => {
      alive = false;
    };
  }, [ready, key, from, to, today, calKey, cal.calendars]);

  if (!ready) return { status: 'off', events: null };
  if (got?.key === key) return got.events ? { status: 'ready', events: got.events } : { status: 'failed', events: null };
  const hit = cache.get(key);
  return hit ? { status: 'ready', events: hit.events } : { status: 'loading', events: null };
}
