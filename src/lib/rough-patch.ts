// The rough-patch check: a quiet look at the last two weeks against the owner's own normal. When three or
// more signs line up, HQ offers some slack (low-battery mode, a pause, a breather). Never a diagnosis, never
// XP, never a roast, and a sign without enough data to judge doesn't count. Plain counts, no streaks.
import { addDays, dayKey, fmtDuration, MIN } from './dates';
import { countedDay, usedOn } from './day-filters';
import { pausedOn } from './pause';
import { readinessFor } from './readiness';
import { avgMood, dayOf, gamingUsedMs } from './selectors';
import type { State } from './types';

/** The days looked at (today and the 13 before), and the normal they're held against (the 28 days before those). */
export const PATCH_DAYS = 14;
const BASE_DAYS = 28;
/** Signs needed before the card shows. */
export const PATCH_SIGNS = 3;
/** Once closed (or acted on), the card stays away this long. */
export const PATCH_QUIET_MS = 7 * 86_400_000;

export type PatchSign = 'sleep' | 'mood' | 'screen' | 'readiness';
export type RoughPatch = {
  signs: { id: PatchSign; text: string }[];
  /** Low days filled most of the two weeks: the card also mentions 1177. */
  heavy: boolean;
};

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const median = (xs: number[]) => {
  const a = [...xs].sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
};
const dur = (min: number) => fmtDuration(Math.round(min) * MIN);
const noon = (k: string) => new Date(`${k}T12:00`);

/**
 * What the last 14 days show, or null when fewer than three signs hold. `resting` is the watch's resting heart
 * rate per day (readiness uses it). Sick and away days count as data here: a hard week is still a hard week.
 */
export function roughPatch(s: State, resting: { key: string; bpm: number | null }[] = [], now = new Date()): RoughPatch | null {
  const days = Array.from({ length: PATCH_DAYS }, (_, i) => dayKey(addDays(now, -i)));
  const base = Array.from({ length: BASE_DAYS }, (_, i) => dayKey(addDays(now, -(PATCH_DAYS + i)))).filter((k) => countedDay(s, k));
  const signs: RoughPatch['signs'] = [];

  // Sleep: 7+ watch nights at least 45 min under the usual (typed-in nights are guesses, so they're left out).
  const watched = (k: string) => {
    const d = dayOf(s, k);
    return d.sleepMin != null && d.sleepMin > 0 && !d.sleepManual ? d.sleepMin : null;
  };
  const usualNights = base.map(watched).filter((x): x is number => x != null);
  if (usualNights.length >= 7) {
    const usual = avg(usualNights);
    const short = days.map(watched).filter((x): x is number => x != null && x <= usual - 45);
    if (short.length >= 7) signs.push({ id: 'sleep', text: `${short.length} short nights (about ${dur(usual - avg(short))} under your usual ${dur(usual)})` });
  }

  // Mood: 5+ days whose check-ins averaged 2 or lower.
  const moods = days.map((k) => avgMood(dayOf(s, k))).filter((x): x is number => x != null);
  const low = moods.filter((x) => x <= 2).length;
  if (low >= 5) signs.push({ id: 'mood', text: `${low} low days` });

  // Phone and games: a typical day now at least 30 % (and 15 min) over the usual one.
  const screenMin = (k: string) => (dayOf(s, k).screen?.doomMin ?? 0) + gamingUsedMs(s, k) / MIN;
  const usualScreen = base.filter((k) => usedOn(s.days[k])).map(screenMin);
  const recentScreen = days.filter((k) => usedOn(s.days[k])).map(screenMin);
  if (usualScreen.length >= 10 && recentScreen.length >= 7) {
    const was = median(usualScreen);
    const is = median(recentScreen);
    if (was >= 20 && is >= was * 1.3 && is - was >= 15) {
      signs.push({ id: 'screen', text: `scrolling and games up to about ${dur(is)} a day (usually ${dur(was)})` });
    }
  }

  // Readiness: 5+ mornings that came out "easy".
  const ready = days.map((k) => readinessFor(s, resting, noon(k))).filter((r) => r != null);
  const easy = ready.filter((r) => r.tier === 'easy').length;
  if (ready.length >= 5 && easy >= 5) signs.push({ id: 'readiness', text: `${easy} low-energy mornings` });

  if (signs.length < PATCH_SIGNS) return null;
  return { signs, heavy: low >= 8 };
}

/** Whether HQ shows the card now: not within a week of being closed, and not during or soon after a pause (sick or away). */
export function showRoughPatch(s: State, now = Date.now()) {
  if (now - (s.roughPatchAt ?? 0) < PATCH_QUIET_MS) return false;
  // A pause now or in the past week already gave the slack the card would offer.
  return !Array.from({ length: 7 }, (_, i) => dayKey(addDays(new Date(now), -i))).some((k) => pausedOn(s, k));
}

/** The card's summary line: what was seen, in counts. */
export function patchSummary(p: RoughPatch) {
  const parts = p.signs.map((x) => x.text);
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts[0];
  return `The last two weeks: ${list}.`;
}
