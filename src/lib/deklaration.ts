// Deklaration (step 8): the yearly tax return. From 1 March HQ counts down to approving it, first to the cut-off
// for the early refund (digital approval by about 31 March), then to the deadline (2 May, or the next weekday).
// Nudges before both; nothing the rest of the year, and nothing once it's marked approved or its task is done.
// Pure: notifications.ts plans the nudges, the store marks it done.
import { addDays, atTime, dayKey } from './dates';
import type { PlannedPing } from './people-days';
import { isDayOff } from './swedish-days';
import type { State } from './types';

export type Deklaration = { year: number; early: string; deadline: string; confirmed: boolean };

/**
 * Skatteverket's dates by year, updated over the air once they're announced. `confirmed: false` is the rule's
 * guess, and HQ says to check. Years not listed follow the rule too.
 */
const TABLE: Record<number, Omit<Deklaration, 'year'>> = {
  2026: { early: '2026-03-31', deadline: '2026-05-04', confirmed: false }, // 2 May was a Saturday
  2027: { early: '2027-03-31', deadline: '2027-05-03', confirmed: false }, // 2 May is a Sunday
};

/** The rule: early refund for approving by 31 March; the deadline is 2 May, or the next day that isn't a day off. */
function byRule(year: number): Deklaration {
  let d = new Date(year, 4, 2, 12);
  while (isDayOff(d)) d = addDays(d, 1);
  return { year, early: `${year}-03-31`, deadline: dayKey(d), confirmed: false };
}

export const deklarationFor = (year: number): Deklaration => (TABLE[year] ? { year, ...TABLE[year] } : byRule(year));

export const DEKL_TASK = 'Approve your tax return';
export const deklTaskKey = (year: number) => `dekl:${year}`;

/** Approved: marked so, or its one-tap task was done (doneTasks survive the task being cleared). */
export function deklDone(s: State, year: number) {
  if (s.sweden?.dekl?.[String(year)]) return true;
  const id = s.sweden?.tasks?.[deklTaskKey(year)];
  if (!id) return false;
  if (s.tasks.some((t) => t.id === id && t.done)) return true;
  return Object.entries(s.days).some(([k, d]) => k.startsWith(`${year}-`) && (d.doneTasks ?? []).some((t) => t.id === id));
}

const SHOW_FROM = '03-01';

/** HQ's countdown on a day: from 1 March to the deadline, while it's on and not done. */
export function deklarationOn(s: State, key: string) {
  if (s.settings.sweden?.deklaration === false) return null;
  const year = Number(key.slice(0, 4));
  const d = deklarationFor(year);
  if (key.slice(5) < SHOW_FROM || key > d.deadline || deklDone(s, year)) return null;
  const early = key <= d.early;
  const target = early ? d.early : d.deadline;
  const days = Math.round((new Date(`${target}T12:00`).getTime() - new Date(`${key}T12:00`).getTime()) / 86_400_000);
  return { ...d, phase: early ? ('early' as const) : ('deadline' as const), target, days };
}

export const deklDayLabel = (key: string) => new Date(`${key}T12:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

const PLAN_AHEAD_DAYS = 45; // planned once they're this close: every replan plans them again anyway

/** The nudges still to come: 2 days before the early cut-off, and a week and a day before the deadline (18:00). */
export function deklPings(s: State, now = new Date()): PlannedPing[] {
  if (s.settings.sweden?.deklaration === false) return [];
  const today = dayKey(now);
  const year = today > deklarationFor(now.getFullYear()).deadline ? now.getFullYear() + 1 : now.getFullYear();
  if (deklDone(s, year)) return [];
  const d = deklarationFor(year);
  const at = (day: string, back: number) => atTime(new Date(`${day}T12:00`), -back, 18);
  const pings: PlannedPing[] = [
    { id: `dekl-${year}-early`, at: at(d.early, 2), day: '', title: '🧾 Deklaration: the early refund', line: 'deklEarly', vars: { day: deklDayLabel(d.early) } },
    { id: `dekl-${year}-week`, at: at(d.deadline, 7), day: '', title: '🧾 Deklaration: a week left', line: 'deklDeadline', vars: { day: deklDayLabel(d.deadline) } },
    { id: `dekl-${year}-eve`, at: at(d.deadline, 1), day: '', title: '🧾 Deklaration: due tomorrow', line: 'deklDeadline', vars: { day: deklDayLabel(d.deadline) } },
  ];
  const until = now.getTime() + PLAN_AHEAD_DAYS * 86_400_000;
  return pings.map((p) => ({ ...p, day: dayKey(p.at) })).filter((p) => p.at.getTime() > now.getTime() && p.at.getTime() < until);
}
