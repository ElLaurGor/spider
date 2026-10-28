// Fuel's week of food: calories and protein per day, Monday to Sunday. Numbers only, never a verdict: amounts
// eaten are never roasted or graded. Averages count finished days with something counted (a photo-only meal has
// no numbers, so it doesn't drag a day to 0); today joins them once it's over.
import { addDays, dayKey, startOfWeek } from './dates';
import { foodKey } from './quick-add';
import { dayOf, foodBase, kcalOf, proteinGoalOn, proteinOf } from './selectors';
import type { State } from './types';

export type FoodDay = {
  key: string;
  kcal: number;
  protein: number;
  logged: boolean; // something with numbers was logged
  done: boolean; // the day is over
  proteinGoal: number; // that day's (proteinGoalOn), 0 = none
};

export type FoodWeek = {
  monday: string;
  days: FoodDay[];
  counted: number; // finished days with something logged: what the averages go by
  avgKcal: number | null;
  avgProtein: number | null;
  proteinPct: number | null; // share of the counted days' calories that came from protein (4 kcal per g)
  proteinDays: number; // counted days at or over their protein goal
  goalDays: number; // counted days that had a protein goal
  topProtein: FoodDay | null; // the counted day with the most protein
  totalKcal: number; // the whole week, today so far included
  totalProtein: number;
  top: { name: string; n: number }[]; // foods logged at least twice this week, most first (3 at most)
};

export function foodWeek(s: State, date: Date | number, today = dayKey()): FoodWeek {
  const monday = startOfWeek(date);
  const days: FoodDay[] = Array.from({ length: 7 }, (_, i) => {
    const key = dayKey(addDays(monday, i));
    const d = dayOf(s, key);
    const kcal = kcalOf(d);
    const protein = proteinOf(d);
    return { key, kcal, protein, logged: kcal > 0 || protein > 0, done: key < today, proteinGoal: proteinGoalOn(s, key) };
  });
  const counted = days.filter((d) => d.done && d.logged);
  const sum = (xs: FoodDay[], f: (d: FoodDay) => number) => xs.reduce((a, d) => a + f(d), 0);
  const kcal = sum(counted, (d) => d.kcal);
  const protein = sum(counted, (d) => d.protein);
  const withGoal = counted.filter((d) => d.proteinGoal > 0);

  const foods = new Map<string, { name: string; n: number }>();
  for (const day of days) {
    for (const f of dayOf(s, day.key).food) {
      if (!f.kcal && !f.protein) continue;
      const k = foodKey(f.name);
      foods.set(k, { name: foods.get(k)?.name ?? foodBase(f.name), n: (foods.get(k)?.n ?? 0) + 1 });
    }
  }

  return {
    monday: days[0].key,
    days,
    counted: counted.length,
    avgKcal: counted.length ? Math.round(kcal / counted.length) : null,
    avgProtein: counted.length ? Math.round(protein / counted.length) : null,
    proteinPct: kcal > 0 ? Math.round(((protein * 4) / kcal) * 100) : null,
    proteinDays: withGoal.filter((d) => d.protein >= d.proteinGoal).length,
    goalDays: withGoal.length,
    topProtein: counted.reduce<FoodDay | null>((a, d) => (d.protein > 0 && (!a || d.protein > a.protein) ? d : a), null),
    totalKcal: sum(days, (d) => d.kcal),
    totalProtein: sum(days, (d) => d.protein),
    top: [...foods.values()]
      .filter((f) => f.n >= 2)
      .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name))
      .slice(0, 3),
  };
}
