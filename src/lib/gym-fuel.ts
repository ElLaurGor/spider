// Fuel before gym and the meal rhythm (step 9 care). On a planned gym day with no food logged in the 4 hours
// before gym time, the gym reminder gains one line that encourages a snack with some carbs. Only when food gets
// logged on most days lately, so an unlogged meal never reads as an accusation; only ever an encouragement,
// never an amount, never "skipped" or "too late". Fuel's meal-rhythm strip shows when she ate this week as dots,
// no kcal. Pure (no expo, no theme), so logic-test can check it.
import { addDays, dayKey, HOUR, startOfWeek } from './dates';
import { pausedOn } from './pause';
import { dayOf, trainedOn, workoutFor } from './selectors';
import type { State } from './types';

/** The window before gym time that a snack would land in. */
export const FUEL_WINDOW_MS = 4 * HOUR;
/** "Most days lately": of the last 7 days before today (paused ones left out), at least 5 in 7 had food logged, and 4 such days at least. */
const LATELY = 7;

const noon = (key: string) => new Date(`${key}T12:00`);

/** Whether food is logged on most days lately (the days before `today`). */
export function logsFoodMostDays(s: State, today = dayKey()) {
  const days = Array.from({ length: LATELY }, (_, i) => dayKey(addDays(noon(today), -(i + 1)))).filter((k) => !pausedOn(s, k));
  if (days.length < 4) return false;
  const logged = days.filter((k) => dayOf(s, k).food.length > 0).length;
  return logged * LATELY >= days.length * 5;
}

/**
 * Whether the gym reminder for day `key` (gym at `gymAt`) carries the snack line: a planned workout not done
 * yet, food logged on most days lately, and nothing logged in the 4 hours before gym time.
 */
export function fuelBeforeGym(s: State, key: string, gymAt: number, today = dayKey()) {
  const d = dayOf(s, key);
  if (!workoutFor(s, noon(key)) || trainedOn(d) || !logsFoodMostDays(s, today)) return false;
  return !d.food.some((f) => f.at >= gymAt - FUEL_WINDOW_MS && f.at <= gymAt);
}

/** Entries this close together are one meal on the strip. */
const SAME_MEAL_MS = 45 * 60_000;

export type RhythmDay = { key: string; meals: number[]; future: boolean };

/**
 * The meals of the week `date` falls in (Monday to Sunday) as times of day in minutes after midnight, one dot
 * per meal. `today` marks the days still ahead, so an earlier week (Fuel's week switcher) has none.
 */
export function mealRhythm(s: State, date: Date | number = new Date(), today = dayKey(date)): RhythmDay[] {
  const monday = startOfWeek(date);
  return Array.from({ length: 7 }, (_, i) => {
    const key = dayKey(addDays(monday, i));
    const times = dayOf(s, key)
      .food.map((f) => f.at)
      .filter((t) => dayKey(t) === key)
      .sort((a, b) => a - b);
    const meals: number[] = [];
    let last = -Infinity;
    for (const t of times) {
      if (t - last > SAME_MEAL_MS) {
        const d = new Date(t);
        meals.push(d.getHours() * 60 + d.getMinutes());
      }
      last = t;
    }
    return { key, meals, future: key > today };
  });
}
