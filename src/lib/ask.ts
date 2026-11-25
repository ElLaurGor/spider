// Ask S.P.I.D.E.R. (step 10): three fixed questions, each answered J.A.R.V.I.S. style with a verdict and the real
// reasons from her own data. "Gym or skip?" weighs the plan, readiness, the calendar around gym time, rain then,
// the training contract and bedtime. "One more game?" weighs the gaming budget left, bedtime and the first thing
// on tomorrow's calendar. "Say yes to tonight?" weighs tomorrow's calendar and tonight's; today's energy and mood
// check-in is shown as context only and never changes the verdict (and it's never "no": evenings out are hers).
// Asking is free: nothing is saved, nothing pays XP. The closing line comes from the ask* pools in the day's tone,
// so kind days hear the mild list, and no line talks about the body. Pure, so logic-test can check it.
import { addDays, atTime, dayKey, fmtDuration, fmtTime, MIN, startOfWeek } from './dates';
import { bedtimeOn } from './caffeine';
import { contractProgress, daysLeftInWeek } from './contracts';
import { rainAtGym } from './if-then';
import type { LineKey } from './lines';
import { marathonGap } from './marathon';
import { dayLoad, EVENING_HOUR } from './meeting-load';
import { moodInfo } from './mood';
import { pauseOn, pausedOn } from './pause';
import { gymTimeOn, slotStart } from './plan-slots';
import { readinessFor, type ReadinessTier } from './readiness';
import { dayOf, eventsOn, gamingBudgetMin, gamingUsedMs, lowBattery, trainedOn, trainMinutes, workoutFor } from './selectors';
import { holidayOn, isDayOff } from './swedish-days';
import { toneOn } from './tone';
import type { CalEvent, State } from './types';
import type { Weather } from './weather';
import { LONG_DAY_MIN } from './woop';

export type AskId = 'gym' | 'game' | 'tonight';

export const QUESTIONS: { id: AskId; label: string; emoji: string }[] = [
  { id: 'gym', label: 'Gym or skip?', emoji: '🏋️' },
  { id: 'game', label: 'One more game?', emoji: '🎮' },
  { id: 'tonight', label: 'Say yes to tonight?', emoji: '🌆' },
];

/** go: yes, easy: yes with a catch, stop: not now. */
export type AskTone = 'go' | 'easy' | 'stop';

export type Answer = {
  id: AskId;
  /** The verdict, short: "Go.", "Go easy.", "One last one." */
  verdict: string;
  tone: AskTone;
  /** The facts it rests on, from her data. */
  reasons: string[];
  /** Shown for context only, never weighed (tonight: today's energy and mood). */
  context: string[];
  /** The closing line's pool and its placeholders. */
  line: LineKey;
  vars: Record<string, string | number>;
};

export type AskInput = {
  now: Date;
  /** The calendar events the app has loaded (today and the week ahead). */
  events: CalEvent[];
  /** Whether the calendar can be read at all (without it, nothing is said about it). */
  calendar: boolean;
  weather: Weather | null;
  /** The watch's resting heart rate per day, for readiness (readiness.ts). */
  resting?: { key: string; bpm: number | null }[];
};

/** A meeting this close before gym time, or starting before it's an hour in, gets in its way (as in the War room). */
const CLASH_BEFORE_MIN = 30;
const CLASH_AFTER_MIN = 60;
/** Gym this close to bedtime isn't on: tomorrow is the better shot. */
export const GYM_BED_MIN = 120;
/** A game, roughly: less budget than this left means one last short one. */
export const ONE_GAME_MIN = 30;
/** A first thing tomorrow before this hour makes it an early start. */
export const EARLY_HOUR = 9;
/** Home by this long before bedtime on a night before an early or packed day. */
const HOME_BEFORE_BED_MIN = 60;
/** The workout itself in the calendar isn't something in its way. */
const GYM_TITLE = /\b(gym|workout|träning|training)/i;

const noon = (key: string) => new Date(`${key}T12:00`);
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
const dur = (min: number) => fmtDuration(Math.max(0, Math.round(min)) * MIN);
const timed = (e: CalEvent) => !e.allDay && !e.free && e.end > e.start;

/** Tonight's bedtime: before 05:00 it's the one of the evening that's still going. */
export function bedtimeFor(s: State, now: Date) {
  const evening = now.getHours() < 5 ? dayKey(addDays(now, -1)) : dayKey(now);
  return bedtimeOn(evening, s.settings.sleepHour);
}

/** The morning ahead: after midnight (before 05:00) that's today's, else tomorrow's. */
const morningOf = (now: Date) => (now.getHours() < 5 ? dayKey(now) : dayKey(addDays(now, 1)));

/** The first timed, busy event on day `key` (a dentist at 07:30 matters as much as a meeting). */
function firstThing(events: CalEvent[], key: string): CalEvent | null {
  return eventsOn(events, noon(key)).filter((e) => timed(e) && dayKey(e.start) === key).sort((a, b) => a.start - b.start)[0] ?? null;
}

/** A free stretch of `min` minutes or more today, from now until `until`, between the busy events. */
export function freeGap(events: CalEvent[], now: Date, until: number, min = 60): { start: number; end: number } | null {
  let cursor = now.getTime();
  const busy = eventsOn(events, now)
    .filter((e) => timed(e) && !GYM_TITLE.test(e.title) && e.end > cursor)
    .sort((a, b) => a.start - b.start);
  for (const e of busy) {
    if (e.start >= until) break;
    if (e.start - cursor >= min * MIN) return { start: cursor, end: e.start };
    cursor = Math.max(cursor, e.end);
  }
  return until - cursor >= min * MIN ? { start: cursor, end: until } : null;
}

const TIER_WORD: Record<ReadinessTier, string> = { ready: 'ready', steady: 'steady', easy: 'take it easy' };

/** "Gym or skip?" */
export function askGym(s: State, input: AskInput): Answer {
  const { now, events, calendar, weather, resting = [] } = input;
  const key = dayKey(now);
  const d = dayOf(s, key);
  const plan = workoutFor(s, now);
  const g = gymTimeOn(s, key);
  const gymAt = atTime(now, 0, g.hour, g.minute).getTime();
  const answer = (verdict: string, tone: AskTone, line: LineKey, reasons: string[]): Answer => ({ id: 'gym', verdict, tone, reasons, context: [], line, vars: {} });

  if (trainedOn(d)) {
    const min = trainMinutes(d);
    return answer('Already done.', 'go', 'askGymDone', [`${plan ? `${plan.name}: ` : ''}trained today${min ? `, ${dur(min)} logged` : ''}`]);
  }
  const pause = pauseOn(s, key);
  if (pause) return answer('Skip it.', 'stop', 'askGymSkip', [pause.kind === 'sick' ? 'Sick mode is on: rest is the whole plan today' : 'Away mode is on: no workouts are planned']);

  const reasons: string[] = [plan ? `${plan.name} is on the plan today, gym time ${fmtTime(gymAt)}` : 'Not a gym day on the plan'];
  const r = readinessFor(s, resting, now);
  if (r) reasons.push(`Readiness: ${TIER_WORD[r.tier]} (${r.reasons.join(' · ')})`);
  const kind = toneOn(s, key, now).kind;
  if (kind) reasons.push('A go-easy day: nothing gets roasted, whichever you pick');
  else if (lowBattery(d)) reasons.push('Low-battery mode is on');

  const bed = bedtimeFor(s, now);
  const toBed = (bed - now.getTime()) / MIN;
  const nearBed = toBed < GYM_BED_MIN;
  if (nearBed) reasons.push(toBed > 0 ? `Bedtime ${fmtTime(bed)} is ${dur(toBed)} away` : `Bedtime ${fmtTime(bed)} has been and gone`);

  // A meeting in the way: the verdict names the free gap instead (none left: a short one, go easy).
  let blocked: { gap: number | null } | null = null;
  if (calendar && !nearBed) {
    const at = Math.max(gymAt, now.getTime());
    const hit = eventsOn(events, now)
      .filter((e) => timed(e) && !GYM_TITLE.test(e.title) && e.end > at - CLASH_BEFORE_MIN * MIN && e.start < at + CLASH_AFTER_MIN * MIN)
      .sort((a, b) => b.end - a.end)[0];
    if (hit) {
      reasons.push(`"${hit.title}" runs ${fmtTime(hit.start)}–${fmtTime(hit.end)}, right around gym time`);
      const gap = freeGap(events, now, bed - GYM_BED_MIN * MIN);
      reasons.push(gap ? `Free gap: ${fmtTime(gap.start)}–${fmtTime(gap.end)}` : 'No free hour left before bedtime');
      blocked = { gap: gap ? slotStart(gap.start).at : null };
    } else reasons.push(`Calendar is clear around ${fmtTime(at)}`);
  }
  if (!nearBed && rainAtGym(weather, now, g.hour, g.minute)) reasons.push(`Rain around ${fmtTime(gymAt)}: an umbrella, or the indoor plan B`);

  const c = s.contract?.week === dayKey(startOfWeek(now)) && s.contract.goal === 'train' ? s.contract : null;
  let contractNeeds = false;
  if (c?.status === 'won') reasons.push('Training contract: already won this week');
  else if (c?.status === 'open') {
    const done = contractProgress(s, c, now);
    const left = daysLeftInWeek(now);
    const need = c.target - done;
    contractNeeds = need > 0 && need >= left;
    reasons.push(
      need <= 0
        ? `Training contract: ${done}/${c.target}, reached`
        : `Training contract: ${done}/${c.target}, ${plural(left, 'day')} left${contractNeeds ? ': every one counts now' : ''}`,
    );
  }

  if (nearBed) return answer('Skip it.', 'stop', 'askGymSkip', reasons);
  if (kind || lowBattery(d) || r?.tier === 'easy') return plan || contractNeeds ? answer('Go easy.', 'easy', 'askGymEasy', reasons) : answer('Skip it.', 'stop', 'askGymSkip', reasons);
  if (plan || contractNeeds || r?.tier === 'ready') {
    if (blocked?.gap == null && blocked) return answer('Go easy.', 'easy', 'askGymEasy', reasons);
    if (blocked?.gap != null) return answer(blocked.gap <= now.getTime() + 5 * MIN ? 'Go now, before the meeting.' : `Go at ${fmtTime(blocked.gap)}.`, 'go', 'askGymGo', reasons);
    return answer(plan ? 'Go.' : 'Go: a bonus one.', 'go', 'askGymGo', reasons);
  }
  return answer('Skip it.', 'stop', 'askGymSkip', reasons);
}

/** "One more game?" */
export function askGame(s: State, input: AskInput): Answer {
  const { now, events, calendar } = input;
  const key = dayKey(now);
  const budget = gamingBudgetMin(s, key);
  const used = gamingUsedMs(s, key, now.getTime()) / MIN;
  const left = budget - used;
  const reasons = [`Gaming budget: ${dur(used)} of ${dur(budget)} used, ${left > 0 ? `${dur(left)} left` : `${dur(-left)} over`}`];
  if (s.activeGame) reasons.push(`A session has been running for ${dur((now.getTime() - s.activeGame.start) / MIN)}`);
  const bed = bedtimeFor(s, now);
  const toBed = (bed - now.getTime()) / MIN;
  reasons.push(toBed > 0 ? `Bedtime ${fmtTime(bed)}, ${dur(toBed)} away` : `Bedtime ${fmtTime(bed)} was ${dur(-toBed)} ago`);
  const morning = morningOf(now);
  const word = morning === key ? 'this morning' : 'tomorrow';
  const first = calendar ? firstThing(events, morning) : null;
  const early = !!first && new Date(first.start).getHours() < EARLY_HOUR;
  if (calendar) reasons.push(first ? `First thing ${word}: "${first.title}" at ${fmtTime(first.start)}` : `Nothing booked ${word}`);

  const answer = (verdict: string, tone: AskTone, line: LineKey): Answer => ({ id: 'game', verdict, tone, reasons, context: [], line, vars: {} });
  if (left <= 0 || toBed <= 15) return answer('No.', 'stop', 'askGameNo');
  if (toBed < 60 || left < ONE_GAME_MIN || early) return answer('One last one.', 'easy', 'askGameLast');
  return answer('Yes.', 'go', 'askGameYes');
}

/** "Say yes to tonight?" Never a no: a yes, a yes with a curfew, or "check the calendar first". */
export function askTonight(s: State, input: AskInput): Answer {
  const { now, events, calendar } = input;
  const key = dayKey(now);
  const morning = morningOf(now);
  const word = morning === key ? 'this morning' : 'tomorrow';
  const bed = bedtimeFor(s, now);
  const homeBy = fmtTime(bed - HOME_BEFORE_BED_MIN * MIN);
  const reasons: string[] = [];

  const off = holidayOn(noon(morning));
  if (pausedOn(s, morning)) reasons.push(`${word === 'tomorrow' ? 'Tomorrow' : 'Today'} is a paused day`);
  else if (isDayOff(noon(morning))) reasons.push(`${word === 'tomorrow' ? 'Tomorrow' : 'Today'} is a day off${off ? ` (${off.name})` : ''}`);

  let early = false;
  let packed = false;
  let clash: CalEvent | null = null;
  if (calendar) {
    const first = firstThing(events, morning);
    early = !!first && new Date(first.start).getHours() < EARLY_HOUR;
    reasons.push(first ? `First thing ${word}: "${first.title}" at ${fmtTime(first.start)}` : `Nothing booked ${word}`);
    const load = dayLoad(s, events, morning);
    if (load.minutes) reasons.push(`${dur(load.minutes)} of meetings ${word}`);
    const run = marathonGap(events, noon(morning));
    if (run) reasons.push(`Back to back ${fmtTime(run.from)}–${fmtTime(run.at)}`);
    packed = load.minutes >= LONG_DAY_MIN || !!run;
    // Something already booked this evening: starting from EVENING_HOUR until bedtime, not over yet (a work meeting running late isn't a plan).
    const evening = atTime(noon(key), 0, EVENING_HOUR).getTime();
    clash = now.getHours() < 5 ? null : (eventsOn(events, now).filter((e) => timed(e) && e.start >= evening && e.start < bed && e.end > now.getTime()).sort((a, b) => a.start - b.start)[0] ?? null);
    if (clash) reasons.push(`Already booked tonight: "${clash.title}" at ${fmtTime(clash.start)}`);
  }
  const gym = workoutFor(s, noon(morning));
  if (gym && !pausedOn(s, morning)) {
    const g = gymTimeOn(s, morning);
    reasons.push(`${gym.name} is planned ${word} at ${fmtTime(atTime(noon(morning), 0, g.hour, g.minute))}`);
  }
  if (!calendar) reasons.push('No calendar connected: I can only see the plan');
  else if (reasons.length === 1 && !early && !packed && !clash) reasons.push('Nothing on the calendar says no');

  // Today's check-in, for context only: shown, never weighed.
  const d = dayOf(s, key);
  const context: string[] = [];
  if (d.energy != null) context.push(`Energy today: ${d.energy}/5`);
  const mood = d.moods?.at(-1);
  if (mood) context.push(`Mood check-in: ${moodInfo(mood.level).emoji} ${moodInfo(mood.level).label}`);

  const answer = (verdict: string, tone: AskTone, line: LineKey): Answer => ({ id: 'tonight', verdict, tone, reasons, context, line, vars: { time: homeBy } });
  if (clash) return answer('Check the calendar first.', 'easy', 'askTonightClash');
  if (early || packed) return answer(`Yes, home by ${homeBy}.`, 'easy', 'askTonightEarly');
  return answer('Yes.', 'go', 'askTonightYes');
}

export function askSpider(s: State, id: AskId, input: AskInput): Answer {
  if (id === 'gym') return askGym(s, input);
  if (id === 'game') return askGame(s, input);
  return askTonight(s, input);
}
