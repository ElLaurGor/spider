// Hatch day and the hundreds: the spider hatched on the first day anything was logged (day-filters.ts firstDataDay).
// On every hundredth day used (100, 200, …: a total of days with something logged, never in a row) and on each
// yearly anniversary of hatch day the tank throws a party: a cake on the moss, tiny rival guests, and the spider
// reads a scroll of firsts (the first glass, workout, boss beaten, fly, trophy… and the oldest task "still alive"),
// from achievement and secret unlock dates and the history. Never the body, food, mood or sleep. On a rough day the
// party goes gentle: no crowd, nothing cheeky on the scroll. Looks only. Pure, so the tests can run it.
import { FLY_BY_ID } from './critters';
import { isDayKey } from './dates';
import { firstDataDay, roughDay, usedOn } from './day-filters';
import { immortalTask } from './memory';
import { toneOn } from './tone';
import type { State } from './types';
import { ACHIEVEMENTS, SECRET_ACHIEVEMENTS } from './xp';

/** A party on every this many days used. */
export const PARTY_EVERY = 100;
/** Tiny rival guests at the cake, at most. */
export const PARTY_GUESTS = 4;

const noonAt = (key: string) => new Date(`${key}T12:00`).getTime();

/** Every day with something logged, oldest first. */
export const usedDays = (s: State) =>
  Object.keys(s.days)
    .filter((k) => isDayKey(k) && usedOn(s.days[k]))
    .sort();

/** How many days used `day` is: its place among the days used (0 if nothing was logged on it). */
export function dayNumber(s: State, day: string): number {
  const used = usedDays(s);
  const i = used.indexOf(day);
  return i < 0 ? 0 : i + 1;
}

/** Whole years from hatch day to `day` when `day` is its anniversary, else 0. Hatched on 29 February: the 28th in other years. */
export function anniversaryYears(hatch: string, day: string): number {
  const years = Number(day.slice(0, 4)) - Number(hatch.slice(0, 4));
  if (years < 1) return 0;
  let md = hatch.slice(5);
  const y = Number(day.slice(0, 4));
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  if (md === '02-29' && !leap) md = '02-28';
  return day.slice(5) === md ? years : 0;
}

export type Party = { day: string; kind: 'hundred' | 'year'; n: number; gentle: boolean };

/**
 * The party on `day`, if there is one: a yearly anniversary of hatch day (`n` years), else a hundredth day used
 * (`n` days; it counts once something is logged that day). `gentle` on a rough or kind day.
 */
export function partyOn(s: State, day: string, now = new Date()): Party | null {
  const hatch = firstDataDay(s);
  if (!hatch) return null;
  const years = anniversaryYears(hatch, day);
  const n = years ? 0 : dayNumber(s, day);
  const kind = years ? 'year' : n && n % PARTY_EVERY === 0 ? 'hundred' : null;
  if (!kind) return null;
  return { day, kind, n: years || n, gentle: roughDay(s, day) != null || toneOn(s, day, now).kind };
}

/** HQ's party banner, closed through State.dismissed. */
export const partyKey = (day: string) => `party:${day}`;

export type First = { emoji: string; label: string; at: number };

/**
 * The scroll of firsts, oldest first: the first glass, workout, task, habit, Web Focus, fly, boss beaten, trophy
 * and secret, then (not on a gentle day) the oldest task still on the list. Nothing about food, the body, mood or sleep.
 */
export function firstsOf(s: State, o: { now?: number; gentle?: boolean } = {}): First[] {
  const out: First[] = [];
  const days = usedDays(s);
  const first = (pick: (k: string) => number | null) => {
    for (const k of days) {
      const at = pick(k);
      if (at != null) return at;
    }
    return null;
  };
  const min = (xs: number[]) => (xs.length ? Math.min(...xs) : null);
  const add = (emoji: string, label: string, at: number | null) => {
    if (at != null && Number.isFinite(at)) out.push({ emoji, label, at });
  };
  add('🥛', 'First glass of water', first((k) => min(s.days[k].water.map((w) => w.at))));
  add('🏋️', 'First workout', first((k) => min([...s.days[k].sets.map((x) => x.at), ...(s.days[k].activities ?? []).map((x) => x.at)])));
  const doneAt = min([...Object.values(s.days).flatMap((d) => (d.doneTasks ?? []).map((t) => t.at)), ...s.tasks.flatMap((t) => (t.firstDoneAt ?? t.doneAt) ?? [])]);
  add('✅', 'First task done', doneAt);
  add('📌', 'First habit done', first((k) => (s.days[k].habits?.length ? noonAt(k) : null)));
  add('🕸️', 'First Web Focus', first((k) => min((s.days[k].focus ?? []).map((f) => f.start))));
  const fly = Object.entries(s.flies ?? {}).sort((a, b) => a[1].firstAt - b[1].firstAt)[0];
  if (fly) add(FLY_BY_ID[fly[0]]?.emoji ?? '🪰', `First fly caught: ${FLY_BY_ID[fly[0]]?.name ?? 'a fly'}`, fly[1].firstAt);
  add('⚔️', 'First boss beaten', min([...Object.values(s.bossKilledAt ?? {}), ...Object.keys(s.bossesDefeated).filter((k) => !s.bossKilledAt?.[k]).map(noonAt)]));
  const trophy = Object.entries(s.achievements).sort((a, b) => a[1] - b[1])[0];
  if (trophy) add('🏆', `First trophy: ${ACHIEVEMENTS.find((a) => a.id === trophy[0])?.title ?? 'a trophy'}`, trophy[1]);
  const secret = Object.entries(s.secrets).sort((a, b) => a[1] - b[1])[0];
  if (secret) add('🤫', `First secret: ${SECRET_ACHIEVEMENTS.find((a) => a.id === secret[0])?.title ?? 'a secret'}`, secret[1]);
  out.sort((a, b) => a.at - b.at);
  const zombie = o.gentle ? null : immortalTask(s, o.now ?? Date.now());
  if (zombie) out.push({ emoji: '🧟', label: `Oldest task: "${zombie.task.title}", ${zombie.days} days old and still alive`, at: zombie.task.createdAt });
  return out;
}
