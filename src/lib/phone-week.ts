// Phone week (step 8 days): the Game tab's screen-time card gets the last 7 days, each with its total, unlocks
// and top app, plus the week's top apps added up. Its line roasts the scrolling, never the person, and on a
// kind day it's the mild pool like everything else. Pure, so logic-test can check it.
import { addDays, dayKey, WEEKDAYS } from './dates';
import type { ScreenDay, State } from './types';

export type PhoneDay = { key: string; label: string; screen: ScreenDay | null };
export type PhoneApp = { label: string; min: number; doom: boolean; game: boolean };

/** Days with phone data needed before the week gets a line. */
export const PHONE_WEEK_MIN_DAYS = 3;

/** Today and the 6 days before it, oldest first, each with its phone data (null where there's none). */
export function phoneDays(s: State, now = new Date()): PhoneDay[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(now, i - 6);
    const key = dayKey(d);
    return { key, label: WEEKDAYS[d.getDay()], screen: s.days[key]?.screen ?? null };
  });
}

/**
 * The week's numbers: its days, the top apps added up across them (5 at most), the average day and its line:
 * a social or video app that took an hour a day or more, a week over the daily limit on average, or a calm one.
 */
export function phoneWeek(s: State, now = new Date()) {
  const days = phoneDays(s, now);
  const known = days.filter((d) => d.screen);
  const apps = new Map<string, PhoneApp>();
  for (const d of known) {
    for (const a of d.screen?.top ?? []) {
      const was = apps.get(a.label);
      apps.set(a.label, { label: a.label, min: (was?.min ?? 0) + a.min, doom: a.doom, game: a.game });
    }
  }
  const top = [...apps.values()].sort((a, b) => b.min - a.min || a.label.localeCompare(b.label)).slice(0, 5);
  const avgMin = known.length ? Math.round(known.reduce((a, d) => a + (d.screen?.totalMin ?? 0), 0) / known.length) : 0;
  const unlocked = known.filter((d) => d.screen?.unlocks != null);
  const avgUnlocks = unlocked.length ? Math.round(unlocked.reduce((a, d) => a + (d.screen?.unlocks ?? 0), 0) / unlocked.length) : null;
  const doom = top.find((a) => a.doom);
  const doomPerDay = doom && known.length ? Math.round(doom.min / known.length) : 0;
  const lineKey: 'phoneWeekDoom' | 'phoneWeekHeavy' | 'phoneWeekChill' | null =
    known.length < PHONE_WEEK_MIN_DAYS ? null : doom && doomPerDay >= 60 ? 'phoneWeekDoom' : avgMin > s.settings.phoneLimitMin ? 'phoneWeekHeavy' : 'phoneWeekChill';
  return { days, top, avgMin, avgUnlocks, doom: doom ? { label: doom.label, perDay: doomPerDay } : null, known: known.length, lineKey };
}
