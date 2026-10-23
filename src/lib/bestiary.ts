// Every boss you've met: how often it showed up, how often it fell, your fastest kill, and its
// Lazy Syndicate file once you've beaten it. Bosses come back every 8 weeks, a rank stronger.
import { addDays, dayKey, fmtTime, startOfWeek, WEEKDAYS_LONG } from './dates';
import { BOSSES, FINAL_BOSS, firstXpDay, kingWeeksOf, WEAKNESS, type BossId } from './quests';
import type { State } from './types';

/** Each boss's file in the Lazy Syndicate dossier, unlocked by beating it once. */
export const LORE: Record<BossId, string> = {
  procrastinator: 'Founding member of the Lazy Syndicate. Has been "about to start" since 2009. Keeps the minutes of every meeting, never finishes them.',
  couch_goblin: 'Lives in the gap between the cushions. Feeds on "five more minutes". Allergic to step counters and the sound of trainers.',
  doomscroll: 'Lord of the infinite feed. Knows what you will tap next before you do. Fears one thing: a phone lying face down.',
  snooze: 'Nine minutes at a time, it has stolen years. Signs every Syndicate memo with the word "later".',
  dehydration: 'Captain of a very dry ship. Pours every glass you forget straight into the sea. Its crew is mostly headaches.',
  leg_day: 'A knight of the Syndicate who has never been seen below the waist. Claims squats are a myth. Wears very long trousers.',
  sugar_baron: 'Runs the Syndicate\'s money. Takes a cut of every routine you skip and every habit left unchecked.',
  binge: 'Raises "one more episode" from the dead every night at midnight. The Syndicate\'s night shift.',
  couch_king: 'Ruler of the Lazy Syndicate. Built his throne from every "tomorrow" you ever said. Once all eight of his lieutenants fall, he gets up himself, and he keeps coming back until someone puts him down.',
};

export type BeastRow = {
  id: BossId;
  name: string;
  emoji: string;
  weakness: string;
  fights: number; // weeks it was your boss, this one included
  wins: number;
  fastest: { day: string; time: string } | null; // earliest point in its week that you finished it
  lastWin: string | null; // week key
  lore: string | null; // after the first win
};

const weekIndexOf = (monday: Date) => Math.floor(monday.getTime() / (7 * 86_400_000));
const winsOf = (s: State, id: BossId) => Object.entries(s.bossesDefeated).filter(([, b]) => b === id);

function fastestOf(s: State, id: BossId) {
  let best: { offset: number; at: number } | null = null;
  for (const [week] of winsOf(s, id)) {
    const at = s.bossKilledAt?.[week];
    if (at == null) continue; // won before kill times were kept
    const offset = at - new Date(`${week}T00:00`).getTime();
    if (!best || offset < best.offset) best = { offset, at };
  }
  return best ? { day: WEEKDAYS_LONG[new Date(best.at).getDay()], time: fmtTime(best.at) } : null;
}

/** The 8 bosses (and the Couch King once he has shown up), with your record against each. */
export function bestiary(s: State, now = new Date()): BeastRow[] {
  const first = firstXpDay(s);
  // Your weeks so far, Monday by Monday, and whose week each was.
  const mondays: Date[] = [];
  if (first) {
    for (let m = startOfWeek(new Date(`${first}T12:00`)); m <= now; m = addDays(m, 7)) mondays.push(m);
  }
  const kings = kingWeeksOf(s);
  const rows: BeastRow[] = BOSSES.map((b, i) => {
    const fights = mondays.filter((m) => weekIndexOf(m) % BOSSES.length === i && !kings.includes(dayKey(m))).length;
    const wins = winsOf(s, b.id);
    return {
      id: b.id,
      name: b.name,
      emoji: b.emoji,
      weakness: WEAKNESS[b.id].label,
      fights,
      wins: wins.length,
      fastest: fastestOf(s, b.id),
      lastWin: wins.map(([w]) => w).sort().at(-1) ?? null,
      lore: wins.length ? LORE[b.id] : null,
    };
  });
  if (kings.length) {
    const wins = winsOf(s, FINAL_BOSS.id);
    rows.push({
      id: FINAL_BOSS.id,
      name: FINAL_BOSS.name,
      emoji: FINAL_BOSS.emoji,
      weakness: "any boss's weakness",
      fights: kings.filter((w) => w <= dayKey(now)).length,
      wins: wins.length,
      fastest: fastestOf(s, FINAL_BOSS.id),
      lastWin: wins.map(([w]) => w).sort().at(-1) ?? null,
      lore: wins.length ? LORE[FINAL_BOSS.id] : null,
    });
  }
  return rows;
}

/** Weekday this boss last fell on, in an earlier week: for its rematch taunt. Null if never, or no time kept. */
export function lastKillDay(s: State, id: BossId, before: string): string | null {
  const weeks = winsOf(s, id)
    .map(([w]) => w)
    .filter((w) => w < before && s.bossKilledAt?.[w] != null)
    .sort();
  const at = weeks.length ? s.bossKilledAt![weeks[weeks.length - 1]] : null;
  return at == null ? null : WEEKDAYS_LONG[new Date(at).getDay()];
}

/** Weeks until this week's boss rotation brings a given boss back (0 = it's this week's). */
export function weeksUntil(index: number, now = new Date()) {
  const w = weekIndexOf(startOfWeek(now));
  return (index - (w % BOSSES.length) + BOSSES.length) % BOSSES.length;
}
