// How S.P.I.D.E.R. may sound on a given day. Every line picks its pool through here (effectiveSavage in
// selectors.ts is toneOn(today).level), so the house rules hold everywhere: a low mood and sick mode pause
// the roasts, a period day is kind (with "go easy on period days" on), low-battery mode turns it down.
// Imports nothing that imports selectors.ts, since selectors.ts imports this.
import { addDays, dayKey } from './dates';
import { pauseOn } from './pause';
import type { DayLog, State } from './types';

/** How far one "too far" turns the day's savage level down. */
export const EASE_STEP = 2;

/** `kind`: no roasts at all that day (level 1, mild lines only). */
export type DayTone = { level: number; kind: boolean };

/** The predicted next period, as cycleInfo() in body.ts gives it (only these two fields are needed). */
export type PeriodForecast = { nextStart: Date; avgPeriodDays: number };

const noon = (key: string) => new Date(`${key}T12:00`);
const before = (key: string, n = 1) => dayKey(addDays(noon(key), -n));
const flowOn = (d?: DayLog) => d?.period?.flow != null;
/** Real flow (light or more). Spotting alone doesn't start a period or count toward one (body.ts uses this too). */
export const realFlow = (d?: DayLog) => flowOn(d) && d?.period?.flow !== 'spotting';

/** How many days a period usually lasts: the average run of logged flow days (5 until one has ended). A run of spotting only isn't a period. */
function usualPeriodDays(s: State, running: string) {
  const keys = Object.keys(s.days)
    .filter((k) => flowOn(s.days[k]))
    .sort();
  const runs: { last: string; n: number; real: boolean }[] = [];
  for (const k of keys) {
    const prev = runs.at(-1);
    if (prev && before(k) === prev.last) {
      prev.last = k;
      prev.n++;
      prev.real ||= realFlow(s.days[k]);
    } else runs.push({ last: k, n: 1, real: realFlow(s.days[k]) });
  }
  const done = runs.filter((r) => r.real && r.last !== running); // the period still going doesn't count yet
  return done.length ? Math.round(done.reduce((a, r) => a + r.n, 0) / done.length) : 5;
}

/**
 * A period day: flow logged that day (spotting too: a kind day costs nothing), or a period still running
 * (real flow in the run up to yesterday and the run not yet longer than usual), so day 2 counts before it's
 * logged. A day of spotting doesn't make tomorrow a period day. A day with its own period entry (say,
 * symptoms only) goes by that entry.
 */
export function periodDay(s: State, key: string) {
  const d = s.days[key];
  if (flowOn(d)) return true;
  if (d?.period) return false;
  let run = 0;
  let real = false;
  for (let k = before(key); flowOn(s.days[k]); k = before(k)) {
    run++;
    real ||= realFlow(s.days[k]);
  }
  return real && run + 1 <= usualPeriodDays(s, before(key));
}

/** Whether a day falls inside the predicted next period. */
const predicted = (f: PeriodForecast | null | undefined, key: string) => {
  if (!f) return false;
  const start = new Date(f.nextStart);
  start.setHours(12, 0, 0, 0);
  const t = noon(key).getTime();
  return t >= start.getTime() && t < addDays(start, f.avgPeriodDays).getTime(); // noon to noon, so DST can't shift it
};

/**
 * The tone for a day. A low mood (that day's latest; with none logged yet, the day before's carries over)
 * or a sick pause make it kind. So does a period day when "go easy on period days" is on: logged, still
 * running, or (for a future day, given a forecast) predicted. Low-battery mode caps it at 5. Away mode
 * keeps the usual tone (it only stops the nagging). Each line called "too far" that day turns it down
 * another step (State.toneEase).
 */
export function toneOn(s: State, key: string, now = new Date(), forecast?: PeriodForecast | null): DayTone {
  const ease = s.toneEase?.day === key ? s.toneEase.steps : 0;
  const set = Math.max(1, s.settings.savageLevel - EASE_STEP * ease);
  const d = s.days[key];
  const latest = d?.moods?.at(-1) ?? s.days[before(key)]?.moods?.at(-1);
  if ((latest && latest.level <= 2) || pauseOn(s, key)?.kind === 'sick') return { level: 1, kind: true };
  if (s.settings.easyOnPeriod && (periodDay(s, key) || (key > dayKey(now) && predicted(forecast, key)))) return { level: 1, kind: true };
  if (d?.energy != null && d.energy <= 2) return { level: Math.min(set, 5), kind: false };
  return { level: set, kind: false };
}

/**
 * A gentle day for recaps (diary, morning callbacks, rival talk): a low mood that day, a period day
 * (logged or running, whatever the setting) or any pause. Nothing on such a day gets roasted afterwards.
 */
export function gentleDay(s: State, key: string) {
  return (s.days[key]?.moods?.at(-1)?.level ?? 5) <= 2 || periodDay(s, key) || pauseOn(s, key) != null;
}

/** Golden lines are roasts too: never on a kind day, never below level 4, never while the tone is turned down. */
export function goldenAllowed(s: State, now = new Date()) {
  const t = toneOn(s, dayKey(now), now);
  return !t.kind && t.level >= 4 && t.level >= s.settings.savageLevel;
}
