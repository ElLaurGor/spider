// Morning readiness: last night's sleep and resting heart rate against her own recent normal, plus how
// she rated the night and her energy. Helpful first: a low day gets an easier option, never a roast.
import { activityInfo } from './body';
import { addDays, dayKey, fmtDuration, MIN } from './dates';
import { dayOf, lowBattery, trainedOn, workoutFor } from './selectors';
import type { State } from './types';

export type ReadinessTier = 'ready' | 'steady' | 'easy';
export type Readiness = { tier: ReadinessTier; score: number; reasons: string[]; suggestion: string | null };

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const median = (xs: number[]) => {
  const a = [...xs].sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
};
const dur = (min: number) => fmtDuration(Math.round(min) * MIN);

/**
 * How ready the body looks this morning. `resting` is the watch's resting heart rate per day (oldest
 * first); the latest of today or yesterday is compared with the days before it. Null with nothing to go on.
 */
export function readinessFor(s: State, resting: { key: string; bpm: number | null }[], now = new Date()): Readiness | null {
  const key = dayKey(now);
  const d = dayOf(s, key);
  const reasons: string[] = [];
  let score = 0;
  let signals = 0;

  // Sleep against the 14 nights before.
  const past = Array.from({ length: 14 }, (_, i) => dayOf(s, dayKey(addDays(now, -(i + 1)))).sleepMin).filter(
    (x): x is number => x != null && x > 0,
  );
  if (d.sleepMin != null && d.sleepMin > 0) {
    signals++;
    if (past.length >= 4) {
      const diff = d.sleepMin - avg(past);
      if (diff <= -60) score -= 1;
      else if (diff <= -30) score -= 0.5;
      else if (diff >= 30) score += 0.5;
      reasons.push(
        Math.abs(diff) < 30
          ? `Slept ${dur(d.sleepMin)}, about your usual`
          : `Slept ${dur(d.sleepMin)}, ${dur(Math.abs(diff))} ${diff < 0 ? 'under' : 'over'} your usual ${dur(avg(past))}`,
      );
    } else {
      if (d.sleepMin < 6 * 60) score -= 0.5;
      reasons.push(`Slept ${dur(d.sleepMin)}`);
    }
  }

  // Resting heart rate: the newest reading (today's or yesterday's) against the median of the days before it.
  const recent = [key, dayKey(addDays(now, -1))].map((k) => resting.find((r) => r.key === k && r.bpm != null)).find(Boolean);
  if (recent?.bpm != null) {
    const before = resting.filter((r) => r.key < recent.key && r.bpm != null).map((r) => r.bpm!);
    if (before.length >= 5) {
      signals++;
      const usual = Math.round(median(before));
      const diff = recent.bpm - usual;
      if (diff >= 5) score -= 1;
      else if (diff >= 3) score -= 0.5;
      else if (diff <= -2) score += 0.5;
      reasons.push(
        Math.abs(diff) < 2
          ? `Resting heart rate ${recent.bpm}, your normal`
          : `Resting heart rate ${recent.bpm}, ${Math.abs(diff)} ${diff > 0 ? 'above' : 'below'} your usual ${usual}`,
      );
    }
  }

  if (d.sleepRating != null) {
    signals++;
    if (d.sleepRating <= 2) score -= 1;
    else if (d.sleepRating >= 4) score += 0.5;
    reasons.push(`You rated the night ${d.sleepRating}/5`);
  }
  if (d.energy != null) {
    signals++;
    if (d.energy <= 2) score -= 1;
    else if (d.energy >= 4) score += 0.5;
    reasons.push(`Energy ${d.energy}/5`);
  }
  if (!signals) return null;

  const tier: ReadinessTier = score >= 0.5 ? 'ready' : score <= -1.5 ? 'easy' : 'steady';
  const plan = workoutFor(s, now);
  const gymLeft = plan && !trainedOn(d);
  let suggestion: string | null = null;
  if (tier === 'easy') {
    suggestion = gymLeft
      ? `${plan.name} is on the plan. A lighter session or some ${activityInfo('cardio').label} counts just as much today.`
      : lowBattery(d)
        ? 'Low-battery mode is on: one quest, gentler reminders.'
        : 'Go easy where you can. Rating your energy 1–2 turns on low-battery mode.';
  } else if (tier === 'ready' && gymLeft) {
    suggestion = `Good day for ${plan.name}. If a PR is in reach, today is a fair shot.`;
  }
  return { tier, score, reasons, suggestion };
}
