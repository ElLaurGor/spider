// Free time that does something (step 8 days). A free calendar gap on Plan can become today's gym time, a focus
// block or a task's slot, each with one reminder at its start; tonight's top 3 for tomorrow can be booked into a
// gap ("09:00–11:30"), after gym or after the first coffee. Only a booking the owner made pings, and only once.
// Pure (no expo, no theme), so logic-test can check it.
import { addDays, dayKey, fmtTime, MIN, uid } from './dates';
import { pausedOn } from './pause';
import { coffeeOf, dayOf, trainedOn } from './selectors';
import type { SlotPlan, State, TopWhen } from './types';

const noon = (key: string) => new Date(`${key}T12:00`);

/** The gym time on day `key`: a time moved to a free slot that day (DayLog.gymAt), else the usual one from Settings. */
export function gymTimeOn(s: State, key = dayKey()): { hour: number; minute: number } {
  return s.days[key]?.gymAt ?? { hour: s.settings.gymHour, minute: s.settings.gymMinute };
}

/** A slot's start rounded up to the next 5 minutes (a gap that starts "now" starts at a sane time). */
export function slotStart(at: number) {
  const step = 5 * MIN;
  const d = new Date(Math.ceil(at / step) * step);
  return { hour: d.getHours(), minute: d.getMinutes(), at: d.getTime() };
}

/** Day `key`'s gym time moved to `at` (null: back to the usual time). Only for today or later. */
export function withGymAt(s: State, key: string, at: number | null, today = dayKey()): State {
  if (key < today) return s;
  const d = dayOf(s, key);
  if (at == null) {
    if (!d.gymAt) return s;
    const rest = { ...d };
    delete rest.gymAt;
    return { ...s, days: { ...s.days, [key]: rest } };
  }
  const { hour, minute } = slotStart(Math.max(at, Date.now()));
  return { ...s, days: { ...s.days, [key]: { ...d, gymAt: { hour, minute } } } };
}

const plansOf = (s: State) => s.slotPlans ?? [];

/** The jobs given to free slots on day `key`, earliest first. */
export const slotPlansOn = (s: State, key: string) => plansOf(s).filter((p) => p.day === key).sort((a, b) => a.at - b.at);

/**
 * A free slot given a job: a focus block, or task `taskId` (its title kept, so the reminder still reads well).
 * One job per slot start: a new one replaces what was there. Past days' plans are dropped on the way.
 */
export function withSlotPlan(
  s: State,
  plan: { day: string; at: number; end: number; kind: SlotPlan['kind']; taskId?: string },
  today = dayKey(),
  id = uid(),
): State {
  if (plan.day < today) return s;
  // Slots were worked out a while ago: one already running starts now; one that's over can't be booked.
  const at = Math.max(plan.at, slotStart(Date.now()).at);
  if (at >= plan.end) return s;
  plan = { ...plan, at };
  const task = plan.taskId ? s.tasks.find((t) => t.id === plan.taskId) : undefined;
  if (plan.kind === 'task' && !task) return s;
  const next: SlotPlan = { id, day: plan.day, at: plan.at, end: plan.end, kind: plan.kind, ...(task ? { taskId: task.id, title: task.title } : {}) };
  const kept = plansOf(s).filter((p) => p.day >= today && !(p.day === plan.day && p.at === plan.at));
  return { ...s, slotPlans: [...kept, next].slice(-30) };
}

export const withoutSlotPlan = (s: State, id: string): State => ({ ...s, slotPlans: plansOf(s).filter((p) => p.id !== id) });

/** A booked top-3 task's "when", for HQ's card and the debrief: "09:00–11:30", "after gym", "after first coffee". */
export function whenLabel(w: TopWhen) {
  if (w.kind === 'gym') return 'after gym';
  if (w.kind === 'coffee') return 'after first coffee';
  return `${fmtTime(w.at)}–${fmtTime(w.end)}${w.ping ? ' 🔔' : ''}`;
}

/** Whether a booked "when" has come on day `key`: gym trained, the first coffee had, or the slot's start passed. */
export function whenNow(s: State, w: TopWhen, key: string, now = Date.now()) {
  const d = dayOf(s, key);
  if (w.kind === 'gym') return trainedOn(d);
  if (w.kind === 'coffee') return coffeeOf(d).length > 0;
  return now >= w.at && now < w.end;
}

/** The bookings kept when the top 3 for `day` is re-picked: those of tasks still picked, on the same day. */
export function keptWhen(top: State['topTomorrow'], day: string, ids: string[]): Record<string, TopWhen> | undefined {
  if (!top?.when || top.day !== day) return undefined;
  const kept = Object.fromEntries(Object.entries(top.when).filter(([id]) => ids.includes(id)));
  return Object.keys(kept).length ? kept : undefined;
}

/** Task `id` in the top 3 for `day` booked for `when` (null: not booked). A task that isn't picked can't be booked. */
export function withTopWhen(s: State, day: string, id: string, when: TopWhen | null): State {
  const top = s.topTomorrow;
  if (!top || top.day !== day || !top.ids.includes(id)) return s;
  const all = { ...top.when };
  if (when) all[id] = when;
  else delete all[id];
  return { ...s, topTomorrow: { ...top, when: Object.keys(all).length ? all : undefined } };
}

/** A reminder a booking asks for. `top3`: a top-3 task's slot with its ping on. */
export type SlotReminder = { id: string; day: string; at: number; kind: 'focus' | 'task' | 'top3'; title: string };

/**
 * The reminders the bookings ask for, from now until `days` days ahead: one at each focus block's and task
 * slot's start, and one for each booked top-3 slot with its ping on. Not for a task that's done or gone, and not
 * on paused days (sick or away: nothing nags then).
 */
export function slotReminders(s: State, now = new Date(), days = 3): SlotReminder[] {
  const from = dayKey(now);
  const until = dayKey(addDays(noon(from), days - 1));
  const open = (id?: string) => !!id && s.tasks.some((t) => t.id === id && !t.done);
  const title = (id?: string, fallback = 'A task') => s.tasks.find((t) => t.id === id)?.title ?? fallback;
  const out: SlotReminder[] = [];
  for (const p of plansOf(s)) {
    if (p.day < from || p.day > until || p.at <= now.getTime() || pausedOn(s, p.day)) continue;
    if (p.kind === 'task' && !open(p.taskId)) continue;
    out.push({ id: `slot-${p.kind}-${p.id}`, day: p.day, at: p.at, kind: p.kind, title: p.kind === 'task' ? title(p.taskId, p.title) : 'Focus block' });
  }
  const top = s.topTomorrow;
  if (top?.when && top.day >= from && top.day <= until && !pausedOn(s, top.day)) {
    for (const [id, w] of Object.entries(top.when)) {
      if (w.kind !== 'slot' || !w.ping || w.at <= now.getTime() || !top.ids.includes(id) || !open(id)) continue;
      out.push({ id: `top3-${top.day}-${id}`, day: top.day, at: w.at, kind: 'top3', title: title(id) });
    }
  }
  return out.sort((a, b) => a.at - b.at);
}
