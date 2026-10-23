import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { dayKey, HOUR } from '@/lib/dates';

/**
 * Today's key, kept current. Tabs stay mounted for days and the compiler computes a bare `dayKey()`
 * only once, so screens use this instead: it re-renders just after the next local midnight (a 23- or
 * 25-hour day included) and whenever the app comes back to the front, since timers sleep in the background.
 */
export function useToday() {
  const [today, setToday] = useState(() => dayKey());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const check = () => {
      setToday(dayKey());
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0); // the next local midnight, however long today is
      clearTimeout(timer);
      // Checks again at least hourly, in case a long timer sleeps through midnight.
      timer = setTimeout(check, Math.min(midnight.getTime() - Date.now() + 1000, HOUR));
    };
    timer = setTimeout(check, 0);
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') check();
    });
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, []);
  return today;
}

/** Noon on a day key: a safe Date for day-level maths (no DST edge at midnight). */
export const noonOf = (key: string) => new Date(`${key}T12:00`);
