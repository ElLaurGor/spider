// Just-in-time insights: the patterns insights() finds in the owner's own data, said at the moment they apply
// (a game started near bedtime, a coffee after the curfew, a Friday evening; the wind-down reminder in
// notifications.ts) instead of
// waiting on the Insights screen. Only what the data actually shows, never a made-up number; once a day
// each, and never on a sick day. Theme-free, so logic-test can check it.
import { bedtimeCaffeine } from './caffeine';
import { dayKey } from './dates';
import { insights } from './insights';
import { pauseOn } from './pause';
import type { State } from './types';

export type JitKind = 'late_game' | 'late_coffee' | 'social_jetlag';

/** An insight by id, if the data has it right now. */
export const insightById = (s: State, id: string, now = new Date()) => insights(s, now).find((i) => i.id === id) ?? null;

const sick = (s: State, now: Date) => pauseOn(s, dayKey(now))?.kind === 'sick';

/** Whether a kind of remark may be made now: not yet today, and not on a sick day. */
export const jitAllowed = (s: State, kind: JitKind, now = new Date()) => s.jitSaid?.[kind] !== dayKey(now) && !sick(s, now);

/** Notes that a kind of remark was made today. */
export const withJitSaid = (s: State, kind: JitKind, now = new Date()): State => ({ ...s, jitSaid: { ...s.jitSaid, [kind]: dayKey(now) } });

/** Within 90 minutes of bedtime (settings.sleepHour), past it, or after midnight before 4:00. */
export function nearBedtime(s: State, now = new Date()) {
  if (now.getHours() < 4) return true;
  const bed = new Date(now);
  bed.setHours(s.settings.sleepHour, 0, 0, 0);
  return now.getTime() >= bed.getTime() - 90 * 60_000;
}

/** A game started near bedtime: the late-gaming finding, if there is one. */
export function lateGameRemark(s: State, now = new Date()) {
  if (!jitAllowed(s, 'late_game', now) || !nearBedtime(s, now)) return null;
  const i = insightById(s, 'late_game', now);
  return i ? { finding: i.text } : null;
}

/**
 * A coffee after the curfew: what late coffee does to sleep (or how caffeine at bedtime does), plus about
 * how much will still be in the body at bedtime, counting the cup just logged. `s` already has the cup.
 */
export function lateCoffeeRemark(s: State, at: number, now = new Date()) {
  if (new Date(at).getHours() < s.settings.coffeeCutoffHour || !jitAllowed(s, 'late_coffee', now)) return null;
  const i = insightById(s, 'late_coffee', now) ?? insightById(s, 'caffeine_bed', now);
  if (!i) return null;
  const mg = Math.round(bedtimeCaffeine(s, dayKey(at)) / 10) * 10;
  return { finding: i.text, mg };
}

/** Friday from 17:00: the weekend sleep drift, as a heads-up before the weekend starts. */
export function jetlagRemark(s: State, now = new Date()) {
  if (now.getDay() !== 5 || now.getHours() < 17 || !jitAllowed(s, 'social_jetlag', now)) return null;
  const i = insightById(s, 'social_jetlag', now);
  return i ? { finding: i.text } : null;
}
