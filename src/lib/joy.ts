// The joy menu (step 9 care): a short list of small things that reliably lift the owner ("call Mia", "bake",
// "Djurgården loop"), each 2 min, 15 min or 1 h. After a low check-in or on the rough-patch card, one that fits
// today's energy is offered, to do now or booked into a free calendar slot; afterwards one tap says whether it
// helped. The list shows a plain count of that ("lifted you 7 of 9 times"). No XP, never a quest, never graded.
// Pure (no expo, no theme), so logic-test can check it.
import { addDays, atTime, dayKey, MIN, uid } from './dates';
import { slotStart } from './plan-slots';
import { dayOf, eventsOn } from './selectors';
import type { CalEvent, JoyItem, JoyMenu, JoySize, JoyTry, State } from './types';

export const JOY_SIZES: { min: JoySize; label: string }[] = [
  { min: 2, label: '2 min' },
  { min: 15, label: '15 min' },
  { min: 60, label: '1 h' },
];
export const sizeLabel = (size: JoySize) => JOY_SIZES.find((x) => x.min === size)?.label ?? `${size} min`;
/** Items kept at most, and a title's length. */
export const JOY_MAX = 20;
export const JOY_CHARS = 60;
/** A follow-up waits this long after it's due, then it lets go without asking. */
export const JOY_ASK_FOR_MS = 24 * 60 * MIN;
/** A booked try is asked about this long after its start at the earliest, however short it is. */
const ASK_AFTER_MIN = 10;

export const joyOf = (s: State): JoyMenu => s.joy ?? { items: [] };

/**
 * The biggest size today's energy allows: low-battery mode (energy 1–2) only the 2-minute things, a middling or
 * unrated morning up to 15 minutes, a good one (4–5) anything.
 */
export function energyCap(s: State, key = dayKey()): JoySize {
  const e = dayOf(s, key).energy;
  if (e != null && e <= 2) return 2;
  if (e != null && e >= 4) return 60;
  return 15;
}

/** A small stable hash, so the same day and offer pick the same item on every render. */
const hash = (text: string) => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
};

/** How often an item helped, with one try either way assumed (a new item isn't zero or perfect). */
const liftScore = (x: JoyItem) => ((x.lifted ?? 0) + 1) / ((x.tries ?? 0) + 2);

/** The items that fit today's energy (and are tagged social, when asked for). */
export function joyFits(s: State, opts: { key?: string; social?: boolean } = {}): JoyItem[] {
  const cap = energyCap(s, opts.key);
  return joyOf(s).items.filter((x) => x.size <= cap && (!opts.social || x.social));
}

/**
 * The item to offer: one that fits today's energy (and is tagged social, when asked for), the one that has
 * lifted her most often first, ties broken by a seed (the offer's own key) so it doesn't jump around. `skip`
 * steps to the next one ("something else"). Null when nothing fits.
 */
export function joyPick(s: State, opts: { key?: string; seed: string; social?: boolean; skip?: number }): JoyItem | null {
  const fits = joyFits(s, opts);
  if (!fits.length) return null;
  const ranked = [...fits].sort((a, b) => liftScore(b) - liftScore(a) || hash(opts.seed + a.id) - hash(opts.seed + b.id));
  return ranked[(opts.skip ?? 0) % ranked.length];
}

/** The list's plain count: "lifted you 7 of 9 times", or that it's untried. */
export function liftText(x: JoyItem) {
  const tries = x.tries ?? 0;
  if (!tries) return 'not tried yet';
  return `lifted you ${x.lifted ?? 0} of ${tries} time${tries === 1 ? '' : 's'}`;
}

const withMenu = (s: State, joy: JoyMenu): State => ({ ...s, joy });

export function withJoyItem(s: State, item: { title: string; size: JoySize; social?: boolean }, now = Date.now(), id = uid()): State {
  const title = item.title.trim().slice(0, JOY_CHARS);
  const menu = joyOf(s);
  if (!title || menu.items.length >= JOY_MAX || menu.items.some((x) => x.title.toLowerCase() === title.toLowerCase())) return s;
  return withMenu(s, { ...menu, items: [...menu.items, { id, title, size: item.size, social: item.social || undefined, at: now }] });
}

export function withJoyEdit(s: State, id: string, patch: { title?: string; size?: JoySize; social?: boolean }): State {
  const menu = joyOf(s);
  const title = patch.title?.trim().slice(0, JOY_CHARS);
  if (patch.title != null && !title) return s;
  return withMenu(s, {
    ...menu,
    items: menu.items.map((x) =>
      x.id === id ? { ...x, ...(title ? { title } : {}), ...(patch.size ? { size: patch.size } : {}), ...(patch.social != null ? { social: patch.social || undefined } : {}) } : x,
    ),
  });
}

export function withoutJoyItem(s: State, id: string): State {
  const menu = joyOf(s);
  return withMenu(s, { items: menu.items.filter((x) => x.id !== id), open: menu.open?.id === id ? null : menu.open });
}

/** Item `id` started now, or booked for a free slot starting `at`: asked about once its time has passed. */
export function withJoyTry(s: State, id: string, at: number | null, now = Date.now()): State {
  const menu = joyOf(s);
  const item = menu.items.find((x) => x.id === id);
  if (!item) return s;
  const start = at != null && at > now ? at : now;
  const open: JoyTry = { id, at: start, askAt: start + Math.max(item.size, at != null && at > now ? ASK_AFTER_MIN : 0) * MIN, ...(at != null && at > now ? { booked: true } : {}) };
  return withMenu(s, { ...menu, open });
}

/** The try to ask about now ("Did it help?"), or null: not due yet, or gone stale (then it just lets go). */
export function joyAsk(s: State, now = Date.now()): { item: JoyItem; open: JoyTry } | null {
  const menu = joyOf(s);
  const open = menu.open;
  const item = open && menu.items.find((x) => x.id === open.id);
  if (!open || !item || now < open.askAt || now - open.askAt > JOY_ASK_FOR_MS) return null;
  return { item, open };
}

/** The follow-up answered: "a bit better" (true) or "same" (false) count; null lets it go without counting. */
export function withJoyAnswer(s: State, better: boolean | null): State {
  const menu = joyOf(s);
  const open = menu.open;
  if (!open) return s;
  const items = better == null ? menu.items : menu.items.map((x) => (x.id === open.id ? { ...x, tries: (x.tries ?? 0) + 1, lifted: (x.lifted ?? 0) + (better ? 1 : 0) } : x));
  return withMenu(s, { items, open: null });
}

/**
 * The first free calendar slot long enough for `size` minutes, from now until an hour before bedtime: today's,
 * else tomorrow's from an hour after waking. Starts on the next 5 minutes (plan-slots.ts slotStart).
 */
export function joySlot(events: CalEvent[], size: JoySize, wakeHour: number, sleepHour: number, now = new Date()): { at: number; end: number; day: string } | null {
  const need = Math.max(size, 5) * MIN;
  for (const d of [0, 1]) {
    const date = addDays(now, d);
    const from = Math.max(atTime(date, 0, wakeHour + 1).getTime(), now.getTime());
    const until = atTime(date, 0, sleepHour - 1).getTime();
    // The plan's free gaps (selectors freeSlots), worked out from `now` rather than the clock, so tests can pick the time.
    const busy = eventsOn(events, date)
      .filter((e) => !e.allDay)
      .sort((a, b) => a.start - b.start);
    let cursor = from;
    const gaps: { start: number; end: number }[] = [];
    for (const e of busy) {
      if (e.start > cursor) gaps.push({ start: cursor, end: Math.min(e.start, until) });
      cursor = Math.max(cursor, e.end);
    }
    gaps.push({ start: cursor, end: until });
    for (const g of gaps) {
      const at = slotStart(g.start).at;
      if (g.end - at >= need) return { at, end: g.end, day: dayKey(at) };
    }
  }
  return null;
}

/** The reminder a booked try asks for: one at its start, while it's still ahead. Never on a past slot. */
export function joyReminders(s: State, now = Date.now()): { id: string; day: string; at: number; title: string }[] {
  const menu = joyOf(s);
  const open = menu.open;
  const item = open && menu.items.find((x) => x.id === open.id);
  if (!open?.booked || !item || open.at <= now) return [];
  const day = dayKey(open.at);
  return [{ id: `joy-${day}-${item.id}`, day, at: open.at, title: item.title }];
}

/** When a booked try starts, as a clock time ("at 14:30" today, "tomorrow at 09:00"). */
export function bookedText(at: number, now = new Date()) {
  const t = new Date(at);
  const clock = `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
  return dayKey(at) === dayKey(now) ? `at ${clock}` : dayKey(at) === dayKey(atTime(now, 1, 12)) ? `tomorrow at ${clock}` : clock;
}
