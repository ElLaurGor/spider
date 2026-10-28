// Fuel's quick-add row: one tap logs a food. Pinned foods (picked by hand, with their own numbers) come first,
// in the order they were pinned; the month's most-logged foods fill the rest up to QUICK_MAX unless that's off.
// A food taken off the row stays off (`hidden`), even when it's logged again, until it's put back or pinned.
import { foodBase, recentFoods } from './selectors';
import type { QuickAdd, QuickFood, State } from './types';

/** Chips the most-logged foods fill up to. Pinned foods all show, however many. */
export const QUICK_MAX = 8;
const HIDDEN_MAX = 100;

/** A food's identity on the row: its name without the portion, any case ("Havregryn (60 g)" is "havregryn"). */
export const foodKey = (name: string) => foodBase(name).toLowerCase();

export const quickAddOf = (s: State): QuickAdd => s.settings.quickAdd ?? { pinned: [], hidden: [] };

export type QuickChip = QuickFood & { pinned: boolean };

export function quickFoods(s: State): QuickChip[] {
  const q = quickAddOf(s);
  const pinned = q.pinned.map((f) => ({ ...f, pinned: true }));
  if (q.auto === false) return pinned;
  const taken = new Set([...q.pinned.map((f) => foodKey(f.name)), ...q.hidden]);
  const auto = recentFoods(s, Infinity)
    .filter((f) => !taken.has(foodKey(f.name)))
    .slice(0, Math.max(0, QUICK_MAX - pinned.length))
    .map((f) => ({ name: f.name, kcal: f.kcal, protein: f.protein, pinned: false }));
  return [...pinned, ...auto];
}

/** Foods taken off the row that the most-logged fill would otherwise offer (most-logged first), so they can be put back. */
export function hiddenFoods(s: State): string[] {
  const q = quickAddOf(s);
  if (q.auto === false) return [];
  const hidden = new Set(q.hidden);
  return recentFoods(s, Infinity)
    .filter((f) => hidden.has(foodKey(f.name)))
    .map((f) => foodBase(f.name));
}

/**
 * Pins a food, or saves an edited one in place of `was` (pinned or most-logged). It comes off the hidden list;
 * a renamed food's old name goes on it, so the old one doesn't come back beside it.
 */
export function withPinned(q: QuickAdd, food: QuickFood, was?: string): QuickAdd {
  const clean = { name: food.name.trim(), kcal: Math.max(0, Math.round(food.kcal)), protein: Math.max(0, Math.round(food.protein)) };
  const key = foodKey(clean.name);
  if (!key) return q;
  const old = was === undefined ? key : foodKey(was);
  const at = q.pinned.findIndex((f) => foodKey(f.name) === old);
  let pinned = q.pinned.map((f, i) => (i === at ? clean : f)).filter((f, i) => i === at || foodKey(f.name) !== key);
  if (at < 0) pinned = [...pinned, clean];
  const hidden = q.hidden.filter((k) => k !== key);
  return { ...q, pinned, hidden: old !== key && !hidden.includes(old) ? [...hidden, old].slice(-HIDDEN_MAX) : hidden };
}

/** Takes a food off the row: unpinned, and kept out of the most-logged fill. */
export function withRemoved(q: QuickAdd, name: string): QuickAdd {
  const key = foodKey(name);
  return { ...q, pinned: q.pinned.filter((f) => foodKey(f.name) !== key), hidden: [...q.hidden.filter((k) => k !== key), key].slice(-HIDDEN_MAX) };
}

/** Lets a taken-off food back into the most-logged fill. */
export const withRestored = (q: QuickAdd, name: string): QuickAdd => ({ ...q, hidden: q.hidden.filter((k) => k !== foodKey(name)) });
