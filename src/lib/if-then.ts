// If-then plans ("implementation intentions"): "When <cue>, I will <then>", on a habit or a gym day. A cue
// that happens in the app (the first coffee, an activity logged, a finished Web Focus, the gaming timer
// stopped, the morning check-in) prompts right away; one with a clock time (a time, a meeting ending, 15
// minutes after the last set, rain at gym time) goes out as a reminder (notifications.ts, "ifthen-").
// Doing it soon after its cue counts as "on cue": a total, never a run of days. After ON_CUE_RETIRE of those
// the habit's plain clock reminder retires: the cue does that job now. Theme-free, so logic-test can check it.
import { addDays, atTime, dayKey, MIN, pad } from './dates';
import { habitsDone, isScheduled, rangeWeek } from './habits';
import { pausedOn } from './pause';
import { activitiesOf, coffeeOf, dayOf, trainedOn, workoutFor } from './selectors';
import type { CalEvent, Cue, CueEvent, Habit, IfThen, State, WorkoutDay } from './types';
import type { Weather } from './weather';

/** On-cue completions after which the habit's plain clock reminder retires. */
export const ON_CUE_RETIRE = 10;
/** Done within this long after its cue counts as on cue. */
export const ON_CUE_WINDOW = 90 * MIN;
/** "After training" goes off this long after the last set (no more sets: the session is over). */
export const AFTER_SETS = 15 * MIN;

export const CUE_EVENTS: { event: CueEvent; label: string; said: string; happened: string }[] = [
  { event: 'coffee', label: 'After my first coffee', said: 'after your first coffee', happened: "Coffee's logged." },
  { event: 'training', label: 'After training', said: 'after training', happened: 'Training is logged.' },
  { event: 'focus', label: 'After a Web Focus', said: 'after a Web Focus', happened: 'The web is finished.' },
  { event: 'gaming', label: 'When I stop gaming', said: 'when you stop gaming', happened: 'The controller is down.' },
  { event: 'checkin', label: 'After my morning check-in', said: 'after your morning check-in', happened: "Check-in's done." },
];
const eventInfo = (e: CueEvent) => CUE_EVENTS.find((x) => x.event === e) ?? CUE_EVENTS[0];

const clock = (h: number, m: number) => `${pad(h)}:${pad(m)}`;

/** The cue as said back: "after your first coffee", "at 07:30", "when Standup ends", "if it rains at gym time". */
export function cueSaid(c: Cue): string {
  if (c.kind === 'event') return eventInfo(c.event).said;
  if (c.kind === 'time') return `at ${clock(c.hour, c.minute)}`;
  if (c.kind === 'calendar') return c.match.trim() ? `when ${c.match.trim()} ends` : 'when your last meeting ends';
  return 'if it rains at gym time';
}

/** That it just happened: "Coffee's logged.", "It's 07:30.", "Standup just ended." */
export function cueHappened(c: Cue): string {
  if (c.kind === 'event') return eventInfo(c.event).happened;
  if (c.kind === 'time') return `It's ${clock(c.hour, c.minute)}.`;
  if (c.kind === 'calendar') return c.match.trim() ? `${c.match.trim()} just ended.` : 'Your last meeting just ended.';
  return "Rain's on the way.";
}

/** The plan as one line, for the editors: "After my first coffee → Vitamins". */
export const planText = (p: IfThen) => `${p.cue.kind === 'event' ? eventInfo(p.cue.event).label : cueSaid(p.cue).replace(/^./, (x) => x.toUpperCase())} → ${p.then}`;

/** What a prompt for `plan` says (the ifThenCue line's placeholders). */
export const cueVars = (p: IfThen) => ({ when: cueSaid(p.cue), happened: cueHappened(p.cue), then: p.then.trim() });

/** A range habit at the top of its range is done for the week: no more prompts. */
const weekFull = (s: State, h: Habit, date: Date) => {
  const w = rangeWeek(s, h, date);
  return !!w && w.done >= w.max;
};

/** A habit's cue can go off that day: it has a plan, existed by then, the day isn't paused, it's on (or a range habit with room). */
export function habitCueOn(s: State, h: Habit, date: Date) {
  if (!h.plan?.then.trim() || pausedOn(s, dayKey(date))) return false;
  if ((h.createdAt ?? 0) > date.getTime()) return false;
  return h.perWeek ? !weekFull(s, h, date) : isScheduled(h, date);
}

/** Things that happened in the app between two states, today (back-dated entries don't count). */
export function firedEvents(prev: State, next: State, now = new Date()): CueEvent[] {
  const key = dayKey(now);
  const a = dayOf(prev, key);
  const b = dayOf(next, key);
  const live = (xs: { late?: boolean }[]) => xs.filter((x) => !x.late).length;
  const finished = (xs: { snapped?: string }[] | undefined) => (xs ?? []).filter((f) => !f.snapped).length;
  const out: CueEvent[] = [];
  if (live(coffeeOf(a)) === 0 && live(coffeeOf(b)) > 0) out.push('coffee');
  if (activitiesOf(b).length > activitiesOf(a).length) out.push('training'); // an activity is logged once it's done
  if (finished(b.focus) > finished(a.focus)) out.push('focus');
  if (prev.activeGame && !next.activeGame) out.push('gaming');
  if ((a.sleepRating == null && b.sleepRating != null) || (a.energy == null && b.energy != null)) out.push('checkin');
  return out;
}

export type CuePrompt = { target: string; habit?: Habit; plan: IfThen; at: number };

/**
 * Cues that just went off in the app: each is recorded on the day (once a day per habit or gym plan) and
 * returned as a prompt. Not for a habit already done today, or a workout already trained.
 */
export function checkCues(prev: State, next: State, now = new Date()): { state: State; prompts: CuePrompt[] } {
  const fired = firedEvents(prev, next, now);
  if (!fired.length) return { state: next, prompts: [] };
  const key = dayKey(now);
  const day = dayOf(next, key);
  const cues = { ...day.cues };
  const prompts: CuePrompt[] = [];
  const t = now.getTime();
  for (const h of next.habits) {
    const p = h.plan;
    if (p?.cue.kind !== 'event' || !fired.includes(p.cue.event) || cues[h.id] != null) continue;
    if (habitsDone(next, key).includes(h.id) || !habitCueOn(next, h, now)) continue;
    cues[h.id] = t;
    prompts.push({ target: h.id, habit: h, plan: p, at: t });
  }
  const gym = workoutFor(next, now)?.plan;
  if (gym?.cue.kind === 'event' && fired.includes(gym.cue.event) && cues.gym == null && !trainedOn(day) && !pausedOn(next, key) && gym.then.trim()) {
    cues.gym = t;
    prompts.push({ target: 'gym', plan: gym, at: t });
  }
  if (!prompts.length) return { state: next, prompts };
  return { state: { ...next, days: { ...next.days, [key]: { ...day, cues } } }, prompts };
}

/** The meetings a calendar cue waits for on a day: the last one, or the ones whose title has `match`. */
function meetingsFor(c: Extract<Cue, { kind: 'calendar' }>, events: CalEvent[], date: Date) {
  const key = dayKey(date);
  const day = events.filter((e) => !e.allDay && dayKey(e.end) === key).sort((a, b) => a.end - b.end);
  const m = c.match.trim().toLowerCase();
  return (m ? day.filter((e) => e.title.toLowerCase().includes(m)) : day.slice(-1)).slice(0, 3);
}

/** When the last set of the day was logged, or null. */
const lastSetAt = (s: State, key: string) => Math.max(0, ...dayOf(s, key).sets.map((x) => x.at)) || null;

/**
 * When a cue with a clock time goes off on a day: a time, a meeting ending, or (today) 15 minutes after the
 * last set. Event cues that happen in the app have none: they prompt in the app.
 */
export function cueTimes(s: State, plan: IfThen, date: Date, events: CalEvent[]): number[] {
  const c = plan.cue;
  if (c.kind === 'time') return [atTime(date, 0, c.hour, c.minute).getTime()];
  if (c.kind === 'calendar') return meetingsFor(c, events, date).map((e) => e.end);
  if (c.kind === 'event' && c.event === 'training') {
    const last = lastSetAt(s, dayKey(date));
    return last ? [last + AFTER_SETS] : [];
  }
  return [];
}

/** Rain at gym time: the 15-minute forecast when it reaches that far, else a wet day (60%+, 1 mm+). */
export function rainAtGym(weather: Weather | null, date: Date, hour: number, minute: number) {
  if (!weather) return false;
  const at = atTime(date, 0, hour, minute).getTime();
  const near = weather.soon.filter((x) => Math.abs(x.at - at) <= 30 * MIN);
  if (near.length) return near.some((x) => x.mm >= 0.2);
  const f = weather.days.find((x) => x.date === dayKey(date));
  return !!f && f.rainPct >= 60 && f.rainMm >= 1;
}

export type CueReminder = { id: string; at: number; habit?: Habit; gym?: WorkoutDay; planB?: boolean; key: string };

/**
 * The if-then reminders for the day `offset` days from `now` (notifications.ts schedules them). A habit's are
 * skipped once it's done that day; a gym day's once trained. Paused days get none.
 */
export function cueReminders(s: State, offset: number, now: Date, events: CalEvent[], weather: Weather | null): CueReminder[] {
  const date = addDays(now, offset);
  const key = dayKey(date);
  if (pausedOn(s, key)) return [];
  const out: CueReminder[] = [];
  for (const h of s.habits) {
    if (!h.plan || !habitCueOn(s, h, date) || habitsDone(s, key).includes(h.id)) continue;
    cueTimes(s, h.plan, date, events).forEach((at, n) => out.push({ id: `ifthen-${h.id}-${key}-${n}`, at, habit: h, key }));
  }
  const plan = workoutFor(s, date);
  const p = plan?.plan;
  if (plan && p?.then.trim() && !(offset === 0 && trainedOn(dayOf(s, key)))) {
    if (p.cue.kind === 'rain') {
      if (rainAtGym(weather, date, s.settings.gymHour, s.settings.gymMinute)) {
        out.push({ id: `ifthen-gym-${key}`, at: atTime(date, 0, s.settings.gymHour, s.settings.gymMinute).getTime() - 60 * MIN, gym: plan, planB: true, key });
      }
    } else cueTimes(s, p, date, events).forEach((at, n) => out.push({ id: `ifthen-gym-${key}-${n}`, at, gym: plan, key }));
  }
  return out.filter((r) => r.at > now.getTime());
}

/** Today's plan B, if it's on: a gym day with one, not trained yet, rain at gym time. */
export function planBToday(s: State, weather: Weather | null, now = new Date()) {
  const plan = workoutFor(s, now);
  const p = plan?.plan;
  if (!plan || p?.cue.kind !== 'rain' || !p.then.trim() || trainedOn(dayOf(s, dayKey(now))) || pausedOn(s, dayKey(now))) return null;
  if (!rainAtGym(weather, now, s.settings.gymHour, s.settings.gymMinute)) return null;
  return { then: p.then.trim(), minutes: planMinutes(p.then), time: clock(s.settings.gymHour, s.settings.gymMinute) };
}

/** Minutes in a plan B ("20-min home circuit" → 20), 20 when it doesn't say. */
export function planMinutes(text: string) {
  const m = text.match(/(\d{1,3})\s*(?:-|\s)?\s*(?:min|m\b|minutes?)/i) ?? text.match(/\b(\d{1,3})\b/);
  const n = m ? Number(m[1]) : 20;
  return n >= 5 && n <= 240 ? n : 20;
}

/**
 * Whether a habit checked off now counts as on cue: its cue went off within the last 90 minutes (in the
 * app, at its time, as a meeting ended, or after the last set).
 */
export function onCueNow(s: State, h: Habit, now: Date, events: CalEvent[]) {
  const p = h.plan;
  if (!p) return false;
  const t = now.getTime();
  const within = (at: number) => at <= t && t - at <= ON_CUE_WINDOW;
  const day = dayOf(s, dayKey(now));
  const seen = day.cues?.[h.id];
  if (seen != null && within(seen)) return true;
  if (p.cue.kind === 'event' && p.cue.event === 'training') {
    // Right after the last set counts too, not only once the 15 minutes are up.
    const last = Math.max(0, ...day.sets.map((x) => x.at), ...activitiesOf(day).map((x) => x.at));
    return last > 0 && last <= t && t - last <= AFTER_SETS + ON_CUE_WINDOW;
  }
  return cueTimes(s, p, now, events).some(within);
}

/** The plain clock reminder has retired: done on cue often enough. */
export const reminderRetired = (h: Habit) => !!h.plan && (h.plan.onCue ?? 0) >= ON_CUE_RETIRE;
