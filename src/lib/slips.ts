// A self-compassion break after a slip (step 9 care, opt-in in Settings). The morning after a real slip (a planned
// workout that didn't happen on a normal day, a lost contract, a confident call that missed, a boss that got
// away), one card in HQ's care area walks through Kristin Neff's three steps: that was hard, everyone skips,
// what would you tell a friend? The answer is optional and stays private. Once per event (and the events of one
// day share one card), mild words only, never on a rough day's slip, no XP. Pure, so logic-test can check it.
import { addDays, dayKey } from './dates';
import { bossRecap } from './boss-recap';
import { countedDay } from './day-filters';
import { outcomeOf } from './prediction';
import { weekKey } from './quests';
import { dayOf, lowBattery, trainedOn, workoutFor } from './selectors';
import { toneOn } from './tone';
import type { KindWord, State } from './types';

export type SlipKind = 'gym' | 'contract' | 'shot' | 'boss';
/** A slip on `day`, said as `happened` ("Push day slipped by"). `key`: its careSeen key. */
export type Slip = { key: string; kind: SlipKind; day: string; happened: string };

/** A call only counts as a slip when it was a confident one: "probably" or "lock". */
export const CONFIDENT_P = 0.75;
/** A boss week with fewer counted days than this was a rough week, not a slip. */
const BOSS_WEEK_DAYS = 4;
/** The kind words kept, and a line's length. */
const KIND_KEEP = 10;
export const KIND_CHARS = 140;

const noon = (key: string) => new Date(`${key}T12:00`);

/** The real slips of day `day`, seen or not. A rough day (paused, low mood, period, low battery, kind tone) has none. */
export function slipsOn(s: State, day: string): Slip[] {
  const out: Slip[] = [];
  const d = dayOf(s, day);
  const normal = countedDay(s, day) && !lowBattery(d) && !toneOn(s, day, noon(day)).kind;
  const plan = workoutFor(s, noon(day));
  if (normal && plan && !trainedOn(d)) out.push({ key: `slip:gym:${day}`, kind: 'gym', day, happened: `${plan.name} day slipped by` });
  const shot = d.shot;
  if (normal && shot && shot.p >= CONFIDENT_P && (shot.result ?? outcomeOf(s, day, shot)) === 'miss') {
    out.push({ key: `slip:shot:${day}`, kind: 'shot', day, happened: shot.q === 'gym' ? 'your confident call on the gym missed' : 'your confident call on the quests missed' });
  }
  // The week's own slips are dated on its Sunday: the contract and the boss end there.
  if (noon(day).getDay() === 0) {
    const week = weekKey(noon(day));
    if ((s.contractLog ?? []).some((e) => e.week === week && e.status === 'lost')) out.push({ key: `slip:contract:${week}`, kind: 'contract', day, happened: "this week's contract got away" });
    const recap = bossRecap(s, week);
    const counted = Array.from({ length: 7 }, (_, i) => dayKey(addDays(noon(week), i))).filter((k) => countedDay(s, k)).length;
    if (recap && !recap.beaten && counted >= BOSS_WEEK_DAYS) out.push({ key: `slip:boss:${week}`, kind: 'boss', day, happened: `${recap.boss} got away this week` });
  }
  return out;
}

/**
 * The card for this morning: yesterday's slips not yet seen, when the owner turned the card on. Null on a
 * paused day (sick or away: not the time). The newest slip leads; closing the card sees all of that day's.
 */
export function slipCard(s: State, now = new Date()): { day: string; slips: Slip[] } | null {
  if (!s.settings.selfCompassion || !s.onboarded) return null;
  const today = dayKey(now);
  if ((s.pauses ?? []).some((p) => p.from <= today && today <= p.to)) return null;
  const day = dayKey(addDays(noon(today), -1));
  const seen = s.careSeen ?? [];
  const slips = slipsOn(s, day).filter((x) => !seen.includes(x.key));
  return slips.length ? { day, slips } : null;
}

/** What she'd tell a friend, kept (the newest 10). Empty text keeps nothing. */
export function withKindWord(s: State, day: string, text: string, now = Date.now()): State {
  const t = text.trim().slice(0, KIND_CHARS);
  if (!t) return s;
  const word: KindWord = { day, text: t, at: now };
  return { ...s, kindWords: [...(s.kindWords ?? []).filter((w) => w.day !== day), word].slice(-KIND_KEEP) };
}

/** The last thing she told herself on an earlier card, to show next time. */
export const lastKindWord = (s: State, before: string): KindWord | null => (s.kindWords ?? []).filter((w) => w.day < before).at(-1) ?? null;
