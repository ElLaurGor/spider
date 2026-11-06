// Pick next week's boss (step 8). From Sunday, and on Monday until this week's boss has taken any damage, the
// owner picks one of three bosses for the week; each shows its weakness, so the pick is the week's focus. Kept per
// week key (State.bossPicks, like bossNames) and read by bossFor through weekBossOf (quests.ts). Couch King weeks
// and seasonal costumes stay as they are, HP sizing doesn't change, and bossRank counts the weeks a boss was
// actually the boss, so ranks, the bestiary and the recaps stay right. Theme-free, so logic-test can check it.
import { addDays, dayKey, startOfWeek } from './dates';
import { BOSSES, bossFor, finalBossDue, kingRematchFor, kingWeeksOf, rotationBossOf, WEAKNESS } from './quests';
import type { State } from './types';

type OrdinaryId = (typeof BOSSES)[number]['id'];
/** Bosses on offer for a week. */
export const PICK_CHOICES = 3;
/** Picks kept: the newest weeks. */

const hash = (str: string) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
};
const noon = (key: string) => new Date(`${key}T12:00`);

/** Whether the Couch King has (or is about to get) a week: then there's nothing to pick. */
function kingWeek(s: State, week: string) {
  return kingWeeksOf(s).includes(week) || finalBossDue(s, week) || kingRematchFor(s, week) === week;
}

/**
 * The week a pick is open for now, or null: on Sunday next week's, on Monday this week's until noon (not "until
 * the first damage": the rollover pays last week's medals onto Monday before the owner sees anything). Never for
 * a Couch King week or a boss already down.
 */
/** Monday's pick closes at this hour. */
export const PICK_UNTIL_HOUR = 12;

export function pickWeek(s: State, now = new Date()): string | null {
  if (!s.onboarded) return null;
  const day = now.getDay();
  if (day !== 0 && day !== 1) return null;
  const week = dayKey(day === 0 ? addDays(startOfWeek(now), 7) : startOfWeek(now));
  if (kingWeek(s, week)) return null;
  if (day === 1) {
    if (now.getHours() >= PICK_UNTIL_HOUR || s.bossNames?.[week]) return null; // a named boss keeps its name and its week
    const boss = bossFor(s, now, now);
    if (boss.final || boss.defeated) return null;
  }
  return week;
}

/**
 * The three bosses on offer for a week: the rotation's own first, then two more by the week's seed, ones not
 * beaten yet first (so the bestiary can fill up). Never last week's boss again, unless nothing else is left.
 */
export function bossOptions(s: State, week: string): OrdinaryId[] {
  const rotation = rotationBossOf(noon(week)).id;
  const lastWeek = dayKey(addDays(noon(week), -7));
  const last = bossFor(s, noon(lastWeek)).id;
  const beaten = new Set(Object.values(s.bossesDefeated));
  const rest = BOSSES.map((b) => b.id)
    .filter((id) => id !== rotation && id !== last)
    .map((id) => ({ id, r: hash(`${week}:pick:${id}`), fresh: !beaten.has(id) }))
    .sort((a, b) => Number(b.fresh) - Number(a.fresh) || a.r - b.r)
    .map((x) => x.id);
  return [rotation, ...rest].slice(0, PICK_CHOICES);
}

/** The boss picked for a week, if any (an id that isn't an ordinary boss is ignored). */
export function pickedFor(s: State, week: string): OrdinaryId | null {
  const id = s.bossPicks?.[week];
  return BOSSES.some((b) => b.id === id) ? (id as OrdinaryId) : null;
}

/** `s` with boss `id` picked for the open week. Unchanged when no pick is open or `id` isn't on offer. */
export function withBossPick(s: State, id: string, now = new Date()): State {
  const week = pickWeek(s, now);
  if (!week || !(bossOptions(s, week) as string[]).includes(id)) return s;
  // Never trimmed: weekBossOf, bossRank and the bestiary read old picks, and the map stays tiny (one entry a week).
  return { ...s, bossPicks: { ...s.bossPicks, [week]: id } };
}

/** A boss on offer as the pick shows it: name, emoji and weakness. */
export const pickInfo = (id: string) => {
  const b = BOSSES.find((x) => x.id === id) ?? BOSSES[0];
  return { id: b.id, name: b.name, emoji: b.emoji, weakness: WEAKNESS[b.id].label };
};
