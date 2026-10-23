// The Monday boss recap: how last week's fight went, from what the boss maths already keeps per day
// (bossFor's perDay), so every past week can be told, not only the ones since this existed. Theme-free.
import { addDays, dayKey, startOfWeek, WEEKDAYS_LONG } from './dates';
import { bossFor, firstXpDay, questXpOf, weekKey } from './quests';
import { dayOf } from './selectors';
import type { State } from './types';

export type BossRecap = {
  week: string;
  boss: string;
  emoji: string;
  beaten: boolean;
  /** Finished off by numbers that came in after its week (a watch sync, a binge day that ended). */
  late: boolean;
  /** The weekday it fell, if it did within its week. */
  fellOn: string | null;
  maxHp: number;
  damage: number;
  /** What's left of it (0 when beaten). */
  hp: number;
  /** Damage by source. `xp` is everything logged that isn't a quest; doomscrolling healing is apart. */
  sources: { quests: number; xp: number; weakness: number; crits: number; bombs: number };
  healed: number;
  /** Days that hit its weakness (with XP, so the bonus counted). */
  weakDays: number;
  /** The two days that hurt it most. */
  top: { day: string; damage: number }[];
};

const weekdayOf = (key: string) => WEEKDAYS_LONG[new Date(`${key}T12:00`).getDay()];

/** The recap of the week starting `week` (a Monday's key), or null for a week with no fight in it. */
export function bossRecap(s: State, week: string): BossRecap | null {
  const monday = new Date(`${week}T12:00`);
  const sunday = dayKey(addDays(monday, 6));
  const first = firstXpDay(s);
  if (!first || first > sunday) return null;
  const b = bossFor(s, monday);
  const sources = { quests: 0, xp: 0, weakness: 0, crits: 0, bombs: b.bombs };
  const days = b.perDay.map((p) => {
    const quests = Math.min(
      p.xp,
      (dayOf(s, p.key).questsDone ?? []).reduce((a, id) => a + questXpOf(id), 0),
    );
    sources.quests += quests;
    sources.xp += p.xp - quests;
    sources.weakness += p.bonus;
    sources.crits += p.crit;
    return { day: p.key, damage: p.xp + p.bonus + p.crit, weak: p.bonus > 0 };
  });
  if (!days.some((d) => d.damage > 0) && !b.bombs) return null;
  const killedAt = s.bossKilledAt?.[week];
  const late = b.defeated && !!s.bossLateKills?.includes(week);
  return {
    week,
    boss: b.name,
    emoji: b.emoji,
    beaten: b.defeated,
    late,
    fellOn: b.defeated && killedAt != null && !late ? weekdayOf(dayKey(killedAt)) : null,
    maxHp: b.maxHp,
    damage: b.damage,
    hp: b.defeated ? 0 : b.hp,
    sources,
    healed: b.healed,
    weakDays: days.filter((d) => d.weak).length,
    top: days
      .filter((d) => d.damage > 0)
      .sort((a, c) => c.damage - a.damage)
      .slice(0, 2)
      .map((d) => ({ day: weekdayOf(d.day), damage: d.damage })),
  };
}

/** Last week's week key, seen from `now`. */
export const lastWeekKey = (now = new Date()) => weekKey(addDays(startOfWeek(now), -7));

/** Recaps of the weeks before this one, newest first (weeks with no fight left out). */
export function recentRecaps(s: State, weeks = 4, now = new Date()): BossRecap[] {
  const out: BossRecap[] = [];
  for (let i = 1; i <= weeks; i++) {
    const r = bossRecap(s, weekKey(addDays(startOfWeek(now), -7 * i)));
    if (r) out.push(r);
  }
  return out;
}

/** The recap HQ shows this week: last week's, until it's dismissed. */
export function pendingRecap(s: State, now = new Date()): BossRecap | null {
  const week = lastWeekKey(now);
  if (s.bossRecapSeen === week) return null;
  return bossRecap(s, week);
}
