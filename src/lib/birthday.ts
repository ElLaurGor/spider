// step 10: her birthday and her own name day. On the birthday the cast sends one card (mail.ts), HQ greets her and
// shows "your year since your last birthday" (counts only: tasks, training days, glasses, bosses, focus, habits;
// never the body, food, mood or sleep, and never anything in a row), and the day's roasts get an affectionate turn
// (lines.ts birthdayTurn). On her name day (settings.userName in the almanac, name-days.ts) the cast says grattis.
// Nothing here pays XP. Pure, so logic-test.ts checks it.
import { cleanBirthday } from './chapters';
import { addDays, dayKey } from './dates';
import { firstDataDay } from './day-filters';
import { birthdayFalls } from './lines';
import { nameDayOf, type YearNames } from './name-days';
import { trainedOn } from './selectors';
import type { State } from './types';

const noon = (key: string) => new Date(`${key}T12:00`);

/** Her birthday as 'MM-DD', or null when none (or no real date) is set. */
export const birthdayOf = (s: State) => cleanBirthday(s.settings.birthday);

/** Whether day `key` is her birthday (29 February: the 28th in other years). */
export const isBirthday = (s: State, key: string) => birthdayFalls(birthdayOf(s), key);

/** The name she goes by, or null for none ("boss" is the app's own fallback, not a name). */
export function ownName(s: State): string | null {
  const n = s.settings.userName?.trim();
  return n && n.toLowerCase() !== 'boss' ? n : null;
}

/** Whether day `key` is her own name day in the almanac `data`. False when the almanac isn't there, or her name isn't in it. */
export function isOwnNameDay(s: State, data: YearNames | null, key: string): boolean {
  const name = ownName(s);
  if (!name || !data || s.settings.sweden?.nameDays === false) return false;
  return nameDayOf(data, name) === key.slice(5, 10);
}

/** HQ's banner keys (State.dismissed): closed with ×, they stay closed for that year. */
export const birthdayBannerKey = (key: string) => `birthday:${key.slice(0, 4)}`;
export const nameDayBannerKey = (key: string) => `nameday:${key.slice(0, 4)}`;

/** Her year since her last birthday, in totals. `from`: last year's birthday, or the first day anything was logged when that's later. */
export type BirthdayYear = { from: string; to: string; partial: boolean; tasks: number; trained: number; glasses: number; bosses: number; focus: number; habits: number };

/** The day of her last birthday before `key` (one year back; 29 February falls on the 28th in other years). */
function lastBirthday(md: string, key: string) {
  const year = Number(key.slice(0, 4)) - 1;
  const [m, d] = md.split('-').map(Number);
  return dayKey(new Date(year, m - 1, Math.min(d, new Date(year, m, 0).getDate()), 12));
}

/**
 * The year up to (not including) birthday `key`: totals only, from the days' own records. Null when she has no
 * birthday set or nothing was logged in that year.
 */
export function birthdayYear(s: State, key: string): BirthdayYear | null {
  const md = birthdayOf(s);
  const first = firstDataDay(s);
  if (!md || !first) return null;
  const last = lastBirthday(md, key);
  const from = first > last ? first : last;
  const to = dayKey(addDays(noon(key), -1));
  if (from > to) return null;
  const out: BirthdayYear = { from, to, partial: from !== last, tasks: 0, trained: 0, glasses: 0, bosses: 0, focus: 0, habits: 0 };
  for (const [k, d] of Object.entries(s.days)) {
    if (k < from || k > to) continue;
    out.tasks += d.doneTasks?.length ?? 0;
    if (trainedOn(d)) out.trained += 1;
    out.glasses += d.water?.length ?? 0;
    out.focus += (d.focus ?? []).filter((f) => !f.snapped).length;
    out.habits += d.habits?.length ?? 0;
  }
  for (const week of Object.keys(s.bossesDefeated)) {
    const fell = s.bossKilledAt?.[week] ? dayKey(s.bossKilledAt[week]) : week;
    if (fell >= from && fell <= to) out.bosses += 1;
  }
  return out;
}

const n = (x: number) => x.toLocaleString('en-GB');
const count = (x: number, one: string, many: string) => `${n(x)} ${x === 1 ? one : many}`;

/** The totals in words, the non-zero ones: "212 tasks done · 96 training days · 1,840 glasses of water · 31 bosses beaten". */
export function birthdayYearText(y: BirthdayYear): string | null {
  const parts = [
    y.tasks ? count(y.tasks, 'task done', 'tasks done') : '',
    y.trained ? count(y.trained, 'training day', 'training days') : '',
    y.glasses ? count(y.glasses, 'glass of water', 'glasses of water') : '',
    y.bosses ? count(y.bosses, 'boss beaten', 'bosses beaten') : '',
    y.focus ? count(y.focus, 'Web Focus session', 'Web Focus sessions') : '',
    y.habits ? count(y.habits, 'habit checked off', 'habits checked off') : '',
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}

/** "Since your last birthday" or, for a first year that began later, "Since 3 March, when we started". */
export function birthdayYearLabel(y: BirthdayYear): string {
  if (!y.partial) return 'Your year since your last birthday';
  return `Since ${noon(y.from).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}, when we started`;
}
