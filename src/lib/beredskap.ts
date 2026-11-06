// Beredskap (step 8): Hesa Fredrik's quarterly test, with a heads-up at 14:50 that 15:00 is only the test (never
// while a VMA is out), and Krisberedskapsveckan's checklist once a year, which pays a few coins once (never XP).
// Pure: notifications.ts plans the heads-up, the store ticks the checklist.
import { addDays, dayKey, startOfWeek } from './dates';
import type { PlannedPing } from './people-days';
import { stormOn } from './storm';
import { sirenTests } from './swedish-days';
import type { State } from './types';

const HEADS_UP_MIN = 10; // before 15:00

/** The next siren test from `now` (later today's included until it has sounded), or null if none is planned. */
export function nextSirenTest(now = new Date()): Date | null {
  for (const year of [now.getFullYear(), now.getFullYear() + 1]) {
    const next = sirenTests(year).find((t) => t.getTime() + 60_000 > now.getTime());
    if (next) return next;
  }
  return null;
}

/** A VMA covering that day (State.storm): the heads-up would then be wrong, so it isn't planned. */
export const vmaOn = (s: Pick<State, 'storm'>, key: string, now = Date.now()) => (s.storm ?? []).some((a) => a.level === 'VMA' && stormOn({ storm: [a] }, key, now));

/** The heads-up before the next siren test: 14:50, unless it's switched off or a VMA is out that day. */
export function sirenPing(s: State, now = new Date()): PlannedPing | null {
  if (s.settings.sweden?.siren === false) return null;
  const test = nextSirenTest(now);
  if (!test) return null;
  const key = dayKey(test);
  const at = new Date(test.getTime() - HEADS_UP_MIN * 60_000);
  if (at.getTime() <= now.getTime() || vmaOn(s, key, now.getTime())) return null;
  return { id: `siren-${key}`, at, day: key, title: '📢 Hesa Fredrik at 15:00', line: 'sirenTest', vars: {} };
}

/** HQ on a test day: until 15:15, unless a VMA is out. */
export function sirenToday(s: State, now = new Date()) {
  if (s.settings.sweden?.siren === false) return false;
  const test = nextSirenTest(now);
  return !!test && dayKey(test) === dayKey(now) && now.getTime() < test.getTime() + 15 * 60_000 && !vmaOn(s, dayKey(now), now.getTime());
}

/**
 * Krisberedskapsveckan, MSB's (now MCF's) preparedness week: Monday to Sunday of ISO week 39, which is where it has
 * fallen in recent years (2021–2024, from memory: not confirmed against MCF). A year that breaks the rule can be
 * pinned here, over the air, once MCF announces it.
 */
const PREP_KNOWN: Record<number, { from: string; to: string }> = {};

export function prepWeek(year: number): { from: string; to: string } {
  const known = PREP_KNOWN[year];
  if (known) return known;
  // Week 39's Monday: 4 January is always in week 1, so week 1's Monday plus 38 weeks.
  const monday = addDays(startOfWeek(new Date(year, 0, 4, 12)), 38 * 7);
  return { from: dayKey(monday), to: dayKey(addDays(monday, 6)) };
}

/** The preparedness week a day falls in, if any. */
export function prepWeekOn(key: string) {
  const w = prepWeek(Number(key.slice(0, 4)));
  return key >= w.from && key <= w.to ? w : null;
}

export const PREP_ITEMS = [
  { id: 'water', emoji: '💧', label: 'Water: a few litres stored, and something to carry it in' },
  { id: 'radio', emoji: '📻', label: 'A radio that runs on batteries, solar or a crank' },
  { id: 'cash', emoji: '💵', label: 'Some cash, for when cards and Swish are down' },
  { id: 'torch', emoji: '🔦', label: 'A torch, with batteries that work' },
  { id: 'meds', emoji: '💊', label: 'Medicines you need, for a week' },
] as const;
export type PrepItem = (typeof PREP_ITEMS)[number]['id'];
export const PREP_COINS = 25;

export const prepTicked = (s: State, year: number) => s.sweden?.prep?.[String(year)] ?? [];
export const prepPaid = (s: State, year: number) => (s.sweden?.prepPaid ?? []).includes(String(year));

/** Ticks (or unticks) an item; the first time all of them are ticked that year it pays PREP_COINS. */
export function tickPrep(s: State, item: PrepItem, year: number): { state: State; paid: number } {
  const y = String(year);
  const was = prepTicked(s, year);
  const ticked = was.includes(item) ? was.filter((x) => x !== item) : [...was, item];
  const all = PREP_ITEMS.every((x) => ticked.includes(x.id));
  const pay = all && !prepPaid(s, year) ? PREP_COINS : 0;
  const sweden = { ...s.sweden, prep: { ...s.sweden?.prep, [y]: ticked }, ...(pay ? { prepPaid: [...(s.sweden?.prepPaid ?? []), y] } : {}) };
  return { state: { ...s, sweden, coins: s.coins + pay, coinsEarned: s.coinsEarned + pay }, paid: pay };
}
