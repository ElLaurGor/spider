// The night shift (step 9 care): opened between bedtime + 30 minutes and 05:00, the app shows a dim can't-sleep
// corner first, with no clock, no numbers and no roasts: "busy brain" (thoughts go straight onto the task list
// for tomorrow), a picture game (calm words to imagine one by one, a cognitive shuffle) and "awake a while?".
// Nothing about it is logged or counted, so Insights never sees it. Pure, so logic-test can check it.
import type { Settings } from './types';

/** Minutes after bedtime before the corner opens, and the hour it closes. */
export const NIGHT_AFTER_MIN = 30;
export const NIGHT_ENDS_HOUR = 5;

/** Whether `now` is in the night shift for a bedtime of `sleepHour` (19–24; 24 is midnight). Off with `nightShift: false`. */
export function nightShiftNow(st: Pick<Settings, 'sleepHour' | 'nightShift'>, now = new Date()) {
  if (st.nightShift === false) return false;
  const mins = now.getHours() * 60 + now.getMinutes();
  const start = (st.sleepHour * 60 + NIGHT_AFTER_MIN) % 1440;
  const end = NIGHT_ENDS_HOUR * 60;
  // A bedtime after midnight opens and closes the same night; an evening one runs across midnight.
  return start < end ? mins >= start && mins < end : mins >= start || mins < end;
}

/** Calm, concrete things to picture, one at a time (the cognitive shuffle): nothing to solve, nothing that worries. */
export const NIGHT_WORDS = [
  'a lighthouse', 'warm bread', 'a red canoe', 'pine needles', 'a sleeping fox', 'a teacup', 'falling snow', 'a wool blanket',
  'a pebble beach', 'a ripe pear', 'a paper boat', 'moss on a rock', 'a candle flame', 'a ferry at dusk', 'a field of oats',
  'an old library', 'a kite', 'a bowl of cherries', 'a garden gate', 'a cello', 'a hedgehog', 'lily pads', 'a striped scarf',
  'a hot-air balloon', 'a cinnamon bun', 'a wooden jetty', 'a window seat', 'a sleepy owl', 'a seashell', 'blueberry bushes',
  'a rowing boat', 'a stone bridge', 'a cat in the sun', 'a glass of milk', 'birch trees', 'a quiet tram', 'a knitted mitten',
  'an apple orchard', 'a sailboat', 'clouds over water', 'a sandcastle', 'a hammock', 'a jar of honey', 'a fern', 'a snow globe',
  'a fishing village', 'a watering can', 'a meadow', 'a crackling fire', 'a deer at the edge of a forest', 'a pinecone',
  'a red cottage', 'a slow river', 'a clay pot', 'a bicycle bell', 'a lantern', 'a plum', 'a duck on a pond', 'an island',
  'a pair of slippers', 'a library card', 'a summer meadow', 'a starfish', 'a hot water bottle', 'a dandelion', 'a rain barrel',
] as const;

/** The word at turn `n` of a shuffle seeded by `seed`: every word once before any repeats. */
export function nightWord(seed: number, n: number) {
  const len = NIGHT_WORDS.length;
  const step = [7, 11, 13, 17, 19, 23].find((p) => len % p !== 0) ?? 1; // co-prime with the list: a full cycle
  const start = Math.abs(Math.floor(seed)) % len;
  return NIGHT_WORDS[(start + n * step) % len];
}

/** "Busy brain": what she typed, one thought per line (or split on ";"), each a task for tomorrow. */
export function thoughtsOf(text: string, max = 12): string[] {
  const seen = new Set<string>();
  return text
    .split(/[\n;]+/)
    .map((x) => x.replace(/^\s*[-•*]\s*/, '').trim().slice(0, 120))
    .filter((x) => x && !seen.has(x.toLowerCase()) && seen.add(x.toLowerCase()))
    .slice(0, max);
}
