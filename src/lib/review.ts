// The War room (step 9 admin): a guided Sunday review, about ten minutes. The week's done list (done-list.ts),
// the zombie tasks one at a time (write the first physical step, Someday, delete or the bonfire), next week's
// calendar with late meetings on gym days flagged and a move offered (workout-move.ts rules, a week ahead on
// Sunday), the chores due next week, the boss pick and the contract, and 1–3 big tasks for the week (shown on
// Plan). Sealing it pays REVIEW_COINS once a week, never XP. A skipped Sunday counts for nothing, and nothing here
// counts weeks in a row. Pure, so logic-test can check it.
import { addDays, atTime, dayKey, MIN, startOfWeek } from './dates';
import { choresDueBy } from './chores';
import { doneBetween } from './done-list';
import { activeSinceOf, activeTasks } from './horizons';
import { IMMORTAL_DAYS, taskAgeDays } from './memory';
import { pausedOn } from './pause';
import { gymTimeOn } from './plan-slots';
import { dayOf, eventsOn, trainedOn, workoutFor } from './selectors';
import { holidayOn } from './swedish-days';
import type { CalEvent, State, Task } from './types';
import { MOVE_CHOICES, movedFrom, movedTo, moveTargets, withMove, withWhy } from './workout-move';

/** What sealing a week's review pays: coins only. */
export const REVIEW_COINS = 60;
/** Sealed weeks remembered (only to pay once; nothing counts them). */
const REVIEW_KEEP = 12;
/** A Sunday review can still be done on Monday until noon. */
export const REVIEW_UNTIL_HOUR = 12;
/** Big tasks for a week, at most. */
export const BIG_MAX = 3;
/** A meeting runs into gym time when it ends after this long before it, or starts before it's an hour in. */
const CLASH_BEFORE_MIN = 30;
const CLASH_AFTER_MIN = 60;

const noon = (key: string) => new Date(`${key}T12:00`);
const weekOf = (key: string) => dayKey(startOfWeek(noon(key)));

/** The week a review closes now (its Monday): on Sunday this one, on Monday until noon the one that just ended. Else null. */
export function reviewWeek(now = new Date()): string | null {
  const day = now.getDay();
  if (day === 0) return dayKey(startOfWeek(now));
  if (day === 1 && now.getHours() < REVIEW_UNTIL_HOUR) return dayKey(addDays(startOfWeek(now), -7));
  return null;
}

/** The week being planned (its Monday): on Sunday the next one, any other day this one. */
export const planWeekOf = (now = new Date()) => dayKey(now.getDay() === 0 ? addDays(startOfWeek(now), 7) : startOfWeek(now));

export const reviewed = (s: State, week: string) => (s.reviews ?? []).includes(week);

/** The week whose review can be sealed and paid now, or null (outside Sunday and Monday morning, or already sealed). */
export const reviewOpen = (s: State, now = new Date()) => {
  const week = s.onboarded ? reviewWeek(now) : null;
  return week && !reviewed(s, week) ? week : null;
};

/** HQ's prompt: while a review is open and its card wasn't closed (`dismissed` 'review:<week>'). */
export function reviewPrompt(s: State, now = new Date()): string | null {
  const week = reviewOpen(s, now);
  return week && !(s.dismissed ?? []).includes(`review:${week}`) ? week : null;
}

/** The week's review sealed: REVIEW_COINS once per week, never XP. `coins` is 0 when nothing was paid. */
export function withReviewSealed(s: State, now = new Date()): { state: State; coins: number; week: string | null } {
  const week = reviewOpen(s, now);
  if (!week) return { state: s, coins: 0, week: null };
  const reviews = [...(s.reviews ?? []), week].slice(-REVIEW_KEEP);
  return { state: { ...s, reviews, coins: s.coins + REVIEW_COINS, coinsEarned: s.coinsEarned + REVIEW_COINS }, coins: REVIEW_COINS, week };
}

/** What got done in the review's week, Monday until today (or its Sunday). */
export function weekDone(s: State, week: string, now = new Date()) {
  const sunday = dayKey(addDays(noon(week), 6));
  const today = dayKey(now);
  return doneBetween(s, week, sunday < today ? sunday : today);
}

/** Zombie tasks: active, open a week or more since they became active, oldest first. */
export function zombiesOf(s: State, now = Date.now()): Task[] {
  return activeTasks(s, dayKey(now))
    .filter((t) => taskAgeDays(t, now) >= IMMORTAL_DAYS)
    .sort((a, b) => activeSinceOf(a) - activeSinceOf(b));
}

/** A task's first physical step, written in the War room (empty takes it off). */
export function withFirstStep(s: State, id: string, step: string): State {
  const text = step.replace(/\s+/g, ' ').trim().slice(0, 120);
  if (!s.tasks.some((t) => t.id === id && !t.done)) return s;
  return { ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, step: text || undefined } : t)) };
}

/** A zombie on the bonfire: gone for good, noted as burned on the day (the Valborg quest counts those). No XP. */
export function withBurned(s: State, id: string, now = Date.now()): State {
  if (!s.tasks.some((t) => t.id === id && !t.done)) return s;
  const key = dayKey(now);
  const d = dayOf(s, key);
  return { ...s, tasks: s.tasks.filter((t) => t.id !== id), days: { ...s.days, [key]: { ...d, burned: (d.burned ?? 0) + 1 } } };
}

// ---------- next week ----------

/** The timed meeting that runs into gym time on a gym day, if any (the one that ends latest). */
export function clashOn(s: State, events: CalEvent[], key: string): CalEvent | null {
  const date = noon(key);
  if (!workoutFor(s, date) || pausedOn(s, key)) return null;
  const g = gymTimeOn(s, key);
  const gymAt = atTime(date, 0, g.hour, g.minute).getTime();
  const hits = eventsOn(events, date).filter((e) => !e.allDay && e.end > gymAt - CLASH_BEFORE_MIN * MIN && e.start < gymAt + CLASH_AFTER_MIN * MIN);
  return hits.sort((a, b) => b.end - a.end)[0] ?? null;
}

/**
 * The days the workout on `from` could move to. In the current week, workout-move.ts's own rules. On Sunday,
 * for next week, the same rules a week ahead: a free day of that week with no workout, no pause and no red day
 * off, not a day another workout left; with `events`, days whose gym time clashes too are left out.
 */
export function aheadTargets(s: State, from: string, today = dayKey(), events?: CalEvent[]): string[] {
  const thisWeek = weekOf(today);
  if (weekOf(from) === thisWeek) return moveTargets(s, from, today).filter((k) => !events || !meetingAtGym(s, events, k));
  if (noon(today).getDay() !== 0 || weekOf(from) !== dayKey(addDays(noon(thisWeek), 7))) return [];
  if (s.days[from]?.goals || movedTo(s, from) || movedFrom(s, from)) return [];
  if (!workoutFor(s, noon(from)) || trainedOn(dayOf(s, from)) || pausedOn(s, from)) return [];
  const monday = noon(weekOf(from));
  const free = Array.from({ length: 7 }, (_, i) => dayKey(addDays(monday, i))).filter(
    (k) =>
      k !== from &&
      !s.days[k]?.goals &&
      !workoutFor(s, noon(k)) &&
      !movedFrom(s, k) &&
      !pausedOn(s, k) &&
      !(s.settings.redDaysOff && holidayOn(noon(k))?.red) &&
      !(events && meetingAtGym(s, events, k)),
  );
  const later = free.filter((k) => k > from);
  const earlier = free.filter((k) => k < from).reverse();
  return [...later, ...earlier].slice(0, MOVE_CHOICES);
}

/** A timed meeting around the usual gym time on day `key` (a rest day can have one too: then it's no place to move to). */
function meetingAtGym(s: State, events: CalEvent[], key: string) {
  const date = noon(key);
  const g = gymTimeOn(s, key);
  const gymAt = atTime(date, 0, g.hour, g.minute).getTime();
  return eventsOn(events, date).some((e) => !e.allDay && e.end > gymAt - CLASH_BEFORE_MIN * MIN && e.start < gymAt + CLASH_AFTER_MIN * MIN);
}

/**
 * The workout on `from` moved to `to` from the War room. Its reason is the late meeting, so the Gym tab doesn't
 * ask "what got in the way?". Unchanged when `to` isn't one of the offered days.
 */
export function withAheadMove(s: State, from: string, to: string, at = Date.now()): State {
  const today = dayKey(at);
  if (!aheadTargets(s, from, today).includes(to)) return s;
  if (weekOf(from) === weekOf(today)) {
    const moved = withMove(s, from, to, at);
    return moved === s ? s : withWhy(moved, from, 'late');
  }
  const name = workoutFor(s, noon(from))?.name ?? 'Workout';
  return { ...s, workoutMoves: [...(s.workoutMoves ?? []), { from, to, name, at, why: 'late' }] };
}

export type GymClash = { day: string; workout: string; gymAt: number; event: CalEvent; moveTo: string[] };

/** The plan week's gym days (from today on) with a meeting that runs into gym time, and where each workout could go instead. */
export function gymClashes(s: State, events: CalEvent[], week: string, now = new Date()): GymClash[] {
  const today = dayKey(now);
  const out: GymClash[] = [];
  for (let i = 0; i < 7; i++) {
    const key = dayKey(addDays(noon(week), i));
    if (key < today) continue;
    const event = clashOn(s, events, key);
    const plan = workoutFor(s, noon(key));
    if (!event || !plan) continue;
    const g = gymTimeOn(s, key);
    out.push({ day: key, workout: plan.name, gymAt: atTime(noon(key), 0, g.hour, g.minute).getTime(), event, moveTo: aheadTargets(s, key, today, events) });
  }
  return out;
}

/** Each day of the plan week with its timed meetings and its workout, for the calendar step. */
export function weekAhead(s: State, events: CalEvent[], week: string) {
  return Array.from({ length: 7 }, (_, i) => {
    const key = dayKey(addDays(noon(week), i));
    const date = noon(key);
    return { day: key, meetings: eventsOn(events, date).filter((e) => !e.allDay).length, workout: workoutFor(s, date)?.name ?? null, off: holidayOn(date)?.name ?? null, paused: pausedOn(s, key) };
  });
}

/** Chores that come due by the end of the plan week (the ones already due included). */
export const choresForWeek = (s: State, week: string, today = dayKey()) => choresDueBy(s, dayKey(addDays(noon(week), 6)), today);

// ---------- the week's big ones ----------

/** The week's big tasks picked (1–3, tasks that exist, open or done). */
export function withWeekBig(s: State, week: string, ids: string[]): State {
  const keep = [...new Set(ids)].filter((id) => s.tasks.some((t) => t.id === id)).slice(0, BIG_MAX);
  return { ...s, weekBig: keep.length ? { week, ids: keep } : null };
}

/** The big ones Plan shows: this week's, or (on Sunday, after the review) next week's. */
export function weekBigOn(s: State, today = dayKey()): { week: string; next: boolean; tasks: Task[] } | null {
  const big = s.weekBig;
  if (!big) return null;
  const thisWeek = weekOf(today);
  const next = noon(today).getDay() === 0 && big.week === dayKey(addDays(noon(thisWeek), 7));
  if (big.week !== thisWeek && !next) return null;
  const tasks = big.ids.flatMap((id) => s.tasks.filter((t) => t.id === id));
  return tasks.length ? { week: big.week, next, tasks } : null;
}
