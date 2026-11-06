// People days (step 8): name days and dates of people the owner adds, and the built-in Mors dag, Fars dag and
// Alla hjärtans dag, each opt-in. A heads-up 3 days ahead with a one-tap task on HQ ("Call Dad"), and a nudge on
// the day. These days can hurt, so every line about them is kind. Pure: notifications.ts plans what this returns.
import { atTime, dayKey } from './dates';
import type { LineKey } from './lines';
import { fathersDay, mothersDay } from './swedish-days';
import type { PeopleDayId, Person, State, SwedenPrefs } from './types';

export const swedenOf = (s: State): SwedenPrefs => s.settings.sweden ?? {};

export type PeopleDayDef = { id: PeopleDayId; name: string; emoji: string; role: string; dateOf: (year: number) => Date; task: (who: string) => string };

export const PEOPLE_DAYS: PeopleDayDef[] = [
  { id: 'mors', name: 'Mors dag', emoji: '💐', role: 'Mum', dateOf: mothersDay, task: (who) => `Call ${who}` },
  { id: 'fars', name: 'Fars dag', emoji: '👔', role: 'Dad', dateOf: fathersDay, task: (who) => `Call ${who}` },
  { id: 'valentine', name: 'Alla hjärtans dag', emoji: '❤️', role: 'your person', dateOf: (year) => new Date(year, 1, 14, 12), task: (who) => `Something small for ${who}` },
];

/** Days ahead the heads-up (and HQ's one-tap task) comes. */
export const AHEAD_DAYS = 3;
const AHEAD_HOUR = 18;

const noon = (key: string) => new Date(`${key}T12:00`);
const daysBetween = (from: string, to: string) => Math.round((noon(to).getTime() - noon(from).getTime()) / 86_400_000);

/** A built-in day's next date on or after `today` (a day key). */
export function nextPeopleDay(def: PeopleDayDef, today: string) {
  const year = Number(today.slice(0, 4));
  const d = def.dateOf(year);
  return dayKey(d) >= today ? d : def.dateOf(year + 1);
}

/** A person's next day on or after `today`: 29 Feb is 28 Feb in other years. */
export function nextPersonDay(p: Pick<Person, 'md'>, today: string) {
  const [m, d] = p.md.split('-').map(Number);
  const inYear = (y: number) => new Date(y, m - 1, Math.min(d, new Date(y, m, 0).getDate()), 12);
  const year = Number(today.slice(0, 4));
  const here = inYear(year);
  return dayKey(here) >= today ? here : inYear(year + 1);
}

/** What the task and the lines call the person a built-in day is for: the name given, or the role. */
export const whoFor = (def: PeopleDayDef, prefs: SwedenPrefs) => prefs.days?.[def.id]?.who.trim() || def.role;

/** "Vendela's name day", "Anna's birthday". */
export const personTitle = (p: Pick<Person, 'name' | 'nameDay' | 'what'>) => `${p.name}'s ${p.nameDay ? 'name day' : p.what?.trim() || 'day'}`;

export type PeopleSoon =
  | { kind: 'builtin'; def: PeopleDayDef; day: string; in: number; task: string; taskKey: string }
  | { kind: 'person'; person: Person; day: string; in: number; title: string };

/** HQ: built-in days within AHEAD_DAYS (with their one-tap task) and people's days today or tomorrow. Soonest first. */
export function peopleSoon(s: State, today: string): PeopleSoon[] {
  const prefs = swedenOf(s);
  const out: PeopleSoon[] = [];
  for (const def of PEOPLE_DAYS) {
    if (!prefs.days?.[def.id]) continue;
    const day = dayKey(nextPeopleDay(def, today));
    const n = daysBetween(today, day);
    if (n <= AHEAD_DAYS) out.push({ kind: 'builtin', def, day, in: n, task: def.task(whoFor(def, prefs)), taskKey: `${def.id}:${day.slice(0, 4)}` });
  }
  for (const person of prefs.people ?? []) {
    const day = dayKey(nextPersonDay(person, today));
    const n = daysBetween(today, day);
    if (n <= 1) out.push({ kind: 'person', person, day, in: n, title: personTitle(person) });
  }
  return out.sort((a, b) => a.in - b.in);
}

/** A planned reminder, in the words of `line` (sayOn in notifications.ts, in the tone of `day`). */
export type PlannedPing = { id: string; at: Date; day: string; title: string; line: LineKey; vars: Record<string, string | number> };

/**
 * When the heads-up for a day on `day` goes: 3 days ahead at 18:00. Turned on after that, the first 18:00 after
 * it was turned on, as long as that's still before the day (on the day itself only the nudge goes). It never
 * depends on the time of the replan, so one that already went out isn't sent again the next evening.
 */
export function aheadAt(day: string, since: number): Date | null {
  const nominal = atTime(noon(day), -AHEAD_DAYS, AHEAD_HOUR);
  if (since <= nominal.getTime()) return nominal;
  const first = atTime(since, 0, AHEAD_HOUR);
  const at = first.getTime() > since ? first : atTime(since, 1, AHEAD_HOUR);
  return dayKey(at) < day ? at : null;
}

const dayWord = (from: Date, day: string) =>
  daysBetween(dayKey(from), day) === 1 ? 'tomorrow' : `on ${noon(day).toLocaleDateString('en-GB', { weekday: 'long' })}`;

/** The people-day reminders still to come: heads-ups and day-of nudges for the built-in days, a morning note for each person. */
export function peoplePings(s: State, now = new Date()): PlannedPing[] {
  const prefs = swedenOf(s);
  const today = dayKey(now);
  const wake = s.settings.wakeHour;
  const out: PlannedPing[] = [];
  for (const def of PEOPLE_DAYS) {
    const on = prefs.days?.[def.id];
    if (!on) continue;
    const day = dayKey(nextPeopleDay(def, today));
    const task = def.task(whoFor(def, prefs));
    const ahead = aheadAt(day, on.since);
    if (ahead) {
      out.push({ id: `people-${def.id}-${day}-ahead`, at: ahead, day: dayKey(ahead), title: `${def.emoji} ${def.name} ${dayWord(ahead, day)}`, line: 'peopleDayAhead', vars: { title: def.name, day: dayWord(ahead, day), task } });
    }
    const nudge = atTime(noon(day), 0, wake, 30);
    if (nudge.getTime() > on.since) out.push({ id: `people-${def.id}-${day}-day`, at: nudge, day, title: `${def.emoji} ${def.name} today`, line: 'peopleDayToday', vars: { title: def.name, task } });
  }
  for (const p of prefs.people ?? []) {
    const day = dayKey(nextPersonDay(p, today));
    const at = atTime(noon(day), 0, wake, 30);
    if (at.getTime() <= p.since) continue;
    const title = personTitle(p);
    out.push({ id: `people-p${p.id}-${day}`, at, day, title: `${p.nameDay ? '📛' : '🗓️'} ${title}`, line: 'personDayToday', vars: { title } });
  }
  return out.filter((x) => x.at.getTime() > now.getTime());
}

/** The task a built-in day's one tap added this year, if it did (State.sweden.tasks). */
export const addedTask = (s: State, taskKey: string) => s.sweden?.tasks?.[taskKey] ?? null;

/** Days from `today` to `day` (both day keys). */
export const daysUntil = (today: string, day: string) => daysBetween(today, day);
