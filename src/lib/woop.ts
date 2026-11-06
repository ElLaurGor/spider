// Obstacle scouting at contract signing (step 8, WOOP: wish, outcome, obstacle, plan). The owner names the best
// outcome, picks the situation most likely to wreck the week from ones the app can see (late meetings or a long
// workday in the calendar, rain at gym time, the gaming timer running long, the phone), and gets a ready if-then
// plan on that cue, run by the existing machinery (if-then.ts cues; reminders under "ifthen-woop-"). Obstacles
// are situations, never the body. When the contract settles: "Your obstacle showed up N×, your plan fired M×"
// (fired: the goal still moved on a day the obstacle showed up). Rough days are left out of that tally.
// Mental contrasting with implementation intentions (Oettingen & Gollwitzer). Theme-free, so logic-test can check it.
import { addDays, atTime, dayKey, MIN, startOfWeek } from './dates';
import { roughDay, usedOn } from './day-filters';
import { goalOf } from './contracts';
import { cueTimes, firedEvents, rainAtGym, type CuePrompt } from './if-then';
import { pausedOn } from './pause';
import { DOOM_FREE_MIN } from './quests';
import { dayOf, eventsOn, gamingBudgetMin, gamingUsedMs, workoutFor } from './selectors';
import type { CalEvent, Contract, ContractGoal, Cue, IfThen, ObstacleId, State, Woop } from './types';
import type { Weather } from './weather';

/** A meeting ending at or after this hour is a late one. */
export const LATE_HOUR = 17;
/** Minutes of meetings that make a long workday. */
export const LONG_DAY_MIN = 240;
/** A day with this much rain counts as a wet one (the saved day weather). */
export const RAIN_MM = 1;
/** Days looked back on to rank the obstacles that come from saved data. */
const LOOK_BACK = 28;

export type Obstacle = { id: ObstacleId; label: string; about: string; calendar?: true };

export const OBSTACLES: Obstacle[] = [
  { id: 'late_meetings', label: 'Meetings that run late', about: 'a meeting that ends after 17:00', calendar: true },
  { id: 'long_day', label: 'A long workday', about: '4+ hours of meetings in a day', calendar: true },
  { id: 'rain', label: 'Rain at gym time', about: 'a wet day' },
  { id: 'gaming', label: 'The gaming timer running long', about: 'a day over the gaming budget' },
  { id: 'doomscroll', label: 'The phone', about: `${DOOM_FREE_MIN / 60}+ hours of social apps in a day` },
];
export const obstacleOf = (id: ObstacleId) => OBSTACLES.find((o) => o.id === id) ?? OBSTACLES[0];

const noon = (key: string) => new Date(`${key}T12:00`);

/** What each goal's plan does once the cue goes off. */
const ACTION: Record<ContractGoal, string> = {
  train: 'do the short version: 20 minutes, then decide',
  water: 'drink a full glass of water',
  steps: 'walk for 15 minutes',
  focus: 'start a 25-minute Web Focus',
  habits: "do today's habits (a mini version counts)",
  gaming: 'put the controller away for the night',
  tasks: 'finish the smallest task on the list',
};

/** The cue an obstacle sets the plan off with. */
export function obstacleCue(s: State, id: ObstacleId): Cue {
  if (id === 'late_meetings') return { kind: 'calendar', match: '' };
  if (id === 'long_day') return { kind: 'time', hour: LATE_HOUR, minute: 0 };
  if (id === 'rain') return { kind: 'rain' };
  if (id === 'gaming') return { kind: 'event', event: 'gaming' };
  // The phone: two hours before bedtime, when the scrolling usually starts.
  return { kind: 'time', hour: Math.max(s.settings.wakeHour + 1, Math.min(22, s.settings.sleepHour - 2)), minute: 0 };
}

/** The ready plan for a goal and its obstacle: "When <cue>, I will <then>". */
export function planFor(s: State, goal: ContractGoal, id: ObstacleId): IfThen {
  const action = ACTION[goal];
  const then =
    id === 'rain'
      ? goal === 'train'
        ? 'do a 20-minute home circuit instead'
        : 'walk indoors for 15 minutes: stairs or a mall loop'
      : id === 'doomscroll'
        ? `put the phone on the charger and ${action}`
        : action;
  return { cue: obstacleCue(s, id), then };
}

/** Obstacles that matter for a goal: rain only gets in the way of training and steps, the gaming timer not of the gaming goal itself. */
const fits = (id: ObstacleId, goal: ContractGoal) => (id === 'rain' ? goal === 'train' || goal === 'steps' : id === 'gaming' ? goal !== 'gaming' : true);

/** A calendar obstacle in a day's events: a meeting ending late, or 4+ hours of meetings. */
export function calendarObstacleOn(id: ObstacleId, events: CalEvent[], date: Date | number) {
  const key = dayKey(date);
  const timed = eventsOn(events, date).filter((e) => !e.allDay);
  if (id === 'late_meetings') return timed.some((e) => dayKey(e.end) === key && new Date(e.end).getHours() >= LATE_HOUR);
  if (id === 'long_day') {
    const from = atTime(date, 0, 0).getTime();
    const to = atTime(date, 1, 0).getTime();
    return timed.reduce((a, e) => a + Math.max(0, Math.min(e.end, to) - Math.max(e.start, from)), 0) >= LONG_DAY_MIN * MIN;
  }
  return false;
}

/** An obstacle the saved data shows on a day (the calendar ones aren't saved: those come from `woop.seen`). */
export function dataObstacleOn(s: State, id: ObstacleId, key: string) {
  const d = dayOf(s, key);
  if (id === 'rain') return (d.weather?.rainMm ?? 0) >= RAIN_MM;
  if (id === 'gaming') return gamingUsedMs({ ...s, activeGame: null }, key) > gamingBudgetMin(s, key) * MIN;
  if (id === 'doomscroll') return (d.screen?.doomMin ?? 0) >= DOOM_FREE_MIN;
  return false;
}

/** Whether a contract's obstacle showed up on a day. */
export function obstacleOn(s: State, w: Woop, key: string) {
  return obstacleOf(w.obstacle).calendar ? (w.seen ?? []).includes(key) : dataObstacleOn(s, w.obstacle, key);
}

export type ObstacleOption = Obstacle & { rate: number; plan: IfThen };

/**
 * The obstacles the app can see for a goal, most likely first: the saved ones by how often they showed up on the
 * days used in the last 4 weeks, the calendar ones by the days left this week. `calendar`: events can be read.
 */
export function obstacleOptions(s: State, goal: ContractGoal, now = new Date(), events: CalEvent[] = [], calendar = false): ObstacleOption[] {
  const past = Array.from({ length: LOOK_BACK }, (_, i) => dayKey(addDays(now, -(i + 1)))).filter((k) => usedOn(s.days[k]));
  const sunday = dayKey(addDays(startOfWeek(now), 6));
  const left: Date[] = [];
  for (let d = new Date(now); dayKey(d) <= sunday; d = addDays(d, 1)) left.push(new Date(d));
  const screen = past.some((k) => s.days[k]?.screen);
  const out: ObstacleOption[] = [];
  for (const o of OBSTACLES) {
    if (!fits(o.id, goal)) continue;
    if (o.calendar && !calendar) continue;
    if (o.id === 'rain' && !s.settings.weather) continue;
    if (o.id === 'doomscroll' && !screen) continue;
    const rate = o.calendar
      ? left.filter((d) => calendarObstacleOn(o.id, events, d)).length / Math.max(1, left.length)
      : past.filter((k) => dataObstacleOn(s, o.id, k)).length / Math.max(1, past.length);
    out.push({ ...o, rate, plan: planFor(s, goal, o.id) });
  }
  return out.sort((a, b) => b.rate - a.rate);
}

/** A WOOP for signing: outcome tidied (short), plan with its "then" (the ready one when left empty). */
export function woopOf(s: State, goal: ContractGoal, outcome: string, obstacle: ObstacleId, then?: string): Woop {
  const plan = planFor(s, goal, obstacle);
  const own = then?.trim().slice(0, 120);
  return { outcome: outcome.trim().slice(0, 80), obstacle, plan: own ? { ...plan, then: own } : plan };
}

/** The contract's days so far: from the day it was signed to today or its Sunday, whichever comes first. */
function contractDays(c: Contract, now: Date) {
  const sunday = dayKey(addDays(noon(c.week), 6));
  const today = dayKey(now);
  const out: { key: string; final: boolean }[] = [];
  for (let d = noon(c.from); dayKey(d) <= sunday && dayKey(d) <= today; d = addDays(d, 1)) out.push({ key: dayKey(d), final: dayKey(d) < today });
  return out;
}

/** Days a contract's obstacle showed up, and how many of those the goal still moved on. Rough days are left out. */
export function woopTally(s: State, c: Contract, now = new Date()): { showed: number; fired: number } {
  const w = c.woop;
  if (!w) return { showed: 0, fired: 0 };
  const goal = goalOf(c.goal);
  let showed = 0;
  let fired = 0;
  for (const { key, final } of contractDays(c, now)) {
    if (roughDay(s, key) != null || !obstacleOn(s, w, key)) continue;
    showed++;
    if (goal.count(s, key, final, c.signedAt ?? 0) > 0) fired++;
  }
  return { showed, fired };
}

/** An open contract with a plan, and today one of its days (not paused): its cues can go off. */
function liveWoop(s: State, now: Date): (Contract & { woop: Woop }) | null {
  const c = s.contract;
  if (!c?.woop || c.status !== 'open') return null;
  const key = dayKey(now);
  const sunday = dayKey(addDays(noon(c.week), 6));
  if (key < c.from || key > sunday || pausedOn(s, key)) return null;
  return c as Contract & { woop: Woop };
}

/** Today's calendar obstacle noted on the contract once the calendar shows it. Unchanged when there's nothing new. */
export function withSeen(s: State, events: CalEvent[], now = new Date()): State {
  const c = liveWoop(s, now);
  if (!c || !obstacleOf(c.woop.obstacle).calendar) return s;
  const key = dayKey(now);
  if ((c.woop.seen ?? []).includes(key) || !calendarObstacleOn(c.woop.obstacle, events, now)) return s;
  return { ...s, contract: { ...c, woop: { ...c.woop, seen: [...(c.woop.seen ?? []), key] } } };
}

/**
 * The plan's in-app cue (the gaming timer stopped): noted on the day once, and a prompt like a habit's. Only on
 * the contract's days, and not once a goal counted in days already counts today.
 */
export function woopCue(prev: State, next: State, now = new Date()): { state: State; prompt: CuePrompt | null } {
  const c = liveWoop(next, now);
  const p = c?.woop.plan;
  if (!c || !p || p.cue.kind !== 'event' || !p.then.trim()) return { state: next, prompt: null };
  const key = dayKey(now);
  const day = dayOf(next, key);
  if (day.cues?.woop != null || !firedEvents(prev, next, now).includes(p.cue.event)) return { state: next, prompt: null };
  if (doneToday(next, c, key)) return { state: next, prompt: null };
  const t = now.getTime();
  return { state: { ...next, days: { ...next.days, [key]: { ...day, cues: { ...day.cues, woop: t } } } }, prompt: { target: 'woop', plan: p, at: t } };
}

/** A goal counted in days that already counts on `key` needs no nudge that day. */
const PER_DAY: ContractGoal[] = ['train', 'water', 'steps', 'habits'];
const doneToday = (s: State, c: Contract, key: string) => PER_DAY.includes(c.goal) && goalOf(c.goal).count(s, key, false, c.signedAt ?? 0) > 0;

export type WoopReminder = { id: string; at: number; plan: IfThen; key: string; planB?: boolean };

/**
 * The plan's reminders for the day `offset` days from `now` (notifications.ts): a time, the last meeting ending,
 * or an hour before gym time when rain is due then; a calendar obstacle's only on days the calendar shows it.
 * Event cues prompt in the app instead.
 */
export function woopReminders(s: State, offset: number, now: Date, events: CalEvent[], weather: Weather | null): WoopReminder[] {
  const date = addDays(now, offset);
  const c = liveWoop(s, date);
  if (!c || !c.woop.plan.then.trim()) return [];
  const key = dayKey(date);
  if (offset === 0 && doneToday(s, c, key)) return [];
  // A calendar obstacle only on the days the calendar shows it (no 17:00 ping on a quiet Saturday).
  if (obstacleOf(c.woop.obstacle).calendar && !calendarObstacleOn(c.woop.obstacle, events, date)) return [];
  const plan = c.woop.plan;
  const out: WoopReminder[] = [];
  if (plan.cue.kind === 'rain') {
    const { gymHour, gymMinute } = s.settings;
    if ((c.goal !== 'train' || workoutFor(s, date)) && rainAtGym(weather, date, gymHour, gymMinute)) {
      out.push({ id: `ifthen-woop-${key}`, at: atTime(date, 0, gymHour, gymMinute).getTime() - 60 * MIN, plan, key, planB: true });
    }
  } else cueTimes(s, plan, date, events).forEach((at, n) => out.push({ id: `ifthen-woop-${key}-${n}`, at, plan, key }));
  return out.filter((r) => r.at > now.getTime());
}
