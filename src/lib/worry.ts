// Worry parking and the shutdown (step 9 care). "Park it" takes a worry off her mind from HQ (or right after
// Anxious or Stressed is named); it comes back at the worry slot (17:30 unless set, an opt-in reminder then),
// where each one becomes a task, is let go, or waits for tomorrow's slot. Then "Shutdown complete": task and
// immortal-task roasts and calendar lines stay quiet until the next morning. A worry count is never a score:
// nothing here counts them out loud. Pure (no expo, no theme), so logic-test can check it.
import { addDays, atTime, dayKey, uid } from './dates';
import { pausedOn } from './pause';
import type { State, Worry } from './types';

export const WORRY_SLOT = { hour: 17, minute: 30 };
/** A worry's length, and how many wait at most. */
export const WORRY_CHARS = 140;
const WORRY_MAX = 30;

const noon = (key: string) => new Date(`${key}T12:00`);
export const worrySlotOf = (s: State) => s.settings.worrySlot ?? WORRY_SLOT;
/** The worry slot's time on day `key`. */
export const slotAt = (s: State, key: string) => {
  const t = worrySlotOf(s);
  return atTime(noon(key), 0, t.hour, t.minute).getTime();
};
export const worriesOf = (s: State) => s.worries ?? [];

/** A worry parked now: back at today's slot, or tomorrow's once today's has passed. */
export function withWorry(s: State, text: string, now = Date.now(), id = uid()): State {
  const t = text.trim().slice(0, WORRY_CHARS);
  if (!t || worriesOf(s).length >= WORRY_MAX) return s;
  const today = dayKey(now);
  const until = now < slotAt(s, today) ? today : dayKey(addDays(noon(today), 1));
  const worry: Worry = { id, text: t, at: now, until };
  return { ...s, worries: [...worriesOf(s), worry] };
}

/** The worries back for review now: from the day's slot on, those due that day or earlier. */
export function worriesDue(s: State, now = Date.now()): Worry[] {
  const today = dayKey(now);
  if (now < slotAt(s, today)) return [];
  return worriesOf(s).filter((w) => w.until <= today);
}

/** A worry handled at its slot: off the list (it became a task, or was let go), or kept for tomorrow's slot. */
export function withWorrySettled(s: State, id: string, how: 'done' | 'tomorrow', now = Date.now()): State {
  const list = worriesOf(s);
  if (!list.some((w) => w.id === id)) return s;
  const tomorrow = dayKey(addDays(noon(dayKey(now)), 1));
  return { ...s, worries: how === 'done' ? list.filter((w) => w.id !== id) : list.map((w) => (w.id === id ? { ...w, until: tomorrow } : w)) };
}

/** Whether the shutdown can be done now: from the day's worry slot until the night is over. */
export const shutdownOpen = (s: State, now = Date.now()) => now >= slotAt(s, dayKey(now)) && !shutdownQuiet(s, now);

/** "Shutdown complete": what's still waiting goes to tomorrow's slot, and the quiet starts. */
export function withShutdown(s: State, now = Date.now()): State {
  let next = s;
  for (const w of worriesDue(s, now)) next = withWorrySettled(next, w.id, 'tomorrow', now);
  return { ...next, shutdown: { day: dayKey(now), at: now } };
}

/** The next morning after a shutdown at `at`: the first wake-up hour after it. */
export function quietUntil(s: State, at: number) {
  const wake = atTime(at, 0, s.settings.wakeHour).getTime();
  return wake > at ? wake : atTime(at, 1, s.settings.wakeHour).getTime();
}

/** Inside the shutdown's quiet: task roasts, the immortal task and calendar lines say nothing until morning. */
export function shutdownQuiet(s: State, t = Date.now()) {
  const sd = s.shutdown;
  return !!sd && t >= sd.at && t < quietUntil(s, sd.at);
}

/**
 * The worry slot's reminder for the next `days` days (opt-in): only on a day worries will be waiting, not once
 * that day is shut down, and not on paused days.
 */
export function worryPings(s: State, now = Date.now(), days = 3): { id: string; day: string; at: number }[] {
  if (!s.settings.worryPing) return [];
  const out: { id: string; day: string; at: number }[] = [];
  for (let d = 0; d < days; d++) {
    const day = dayKey(addDays(new Date(now), d));
    const at = slotAt(s, day);
    if (at <= now || pausedOn(s, day) || s.shutdown?.day === day) continue;
    if (worriesOf(s).some((w) => w.until <= day)) out.push({ id: `worry-${day}`, day, at });
  }
  return out;
}

/** "17:30", for the card and Settings. */
export const slotText = (s: State) => {
  const t = worrySlotOf(s);
  return `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`;
};
