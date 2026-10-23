// Hall of Fame (personal bests) and Hall of Shame (personal worsts, for laughs). Theme-free, so it
// loads under tsx: the screen passes the theme count in.
import { dayKey, fmtDuration, fmtTime } from './dates';
import { countedDay, usedOn } from './day-filters';
import { TIERS } from './league';
import { dayScoreFor } from './report';
import { coffeeOf, trainedOn, waterMl } from './selectors';
import type { State } from './types';
import { levelForXp } from './xp';

export type Rec = { emoji: string; label: string; value: string; detail?: string };

const noon = (key: string) => new Date(`${key}T12:00`);
const short = (key: string) => key.slice(5);

function maxBy<T>(items: T[], score: (t: T) => number) {
  let best: T | null = null;
  let bestScore = -Infinity;
  for (const t of items) {
    const v = score(t);
    if (v > bestScore) {
      best = t;
      bestScore = v;
    }
  }
  return best ? { item: best, score: bestScore } : null;
}

/**
 * `themes` is how many themes are unlocked, trophy included (evolution's themeUnlocked, which needs the
 * theme file). The Hall of Shame only looks at counted days: a sick, away, low-mood or period day is never
 * a record anyone gets roasted for.
 */
export function hallOfFame(s: State, themes?: { unlocked: number; total: number }) {
  const entries = Object.entries(s.days);
  const counted = entries.filter(([k]) => countedDay(s, k));
  const fame: Rec[] = [];
  const shame: Rec[] = [];
  const level = levelForXp(s.xp);

  fame.push({ emoji: '🏆', label: 'Level', value: `LVL ${level}`, detail: `${s.xp.toLocaleString('sv-SE')} XP total` });

  const waterDays = entries.filter(([, d]) => d.waterGoalHit).length;
  if (waterDays) fame.push({ emoji: '💧', label: 'Water goal hit', value: `${waterDays} days` });

  const trainingDays = entries.filter(([, d]) => trainedOn(d)).length;
  if (trainingDays) fame.push({ emoji: '🏋️', label: 'Training days', value: `${trainingDays}`, detail: `${s.counters.workouts} workouts total` });

  const bestDay = maxBy(
    entries.filter(([, d]) => usedOn(d)),
    ([k]) => dayScoreFor(s, noon(k)),
  );
  if (bestDay) fame.push({ emoji: '⭐', label: 'Best day ever', value: `${bestDay.score}/100`, detail: short(bestDay.item[0]) });

  const steps = maxBy(entries.filter(([, d]) => d.steps != null), ([, d]) => d.steps ?? 0);
  if (steps) fame.push({ emoji: '👣', label: 'Most steps in a day', value: steps.score.toLocaleString('sv-SE'), detail: short(steps.item[0]) });

  const mostWater = maxBy(entries, ([, d]) => waterMl(d));
  if (mostWater && mostWater.score > 0) fame.push({ emoji: '🌊', label: 'Most water in a day', value: `${(mostWater.score / 1000).toFixed(1)} L`, detail: short(mostWater.item[0]) });

  const sleep = maxBy(entries.filter(([, d]) => d.sleepMin != null), ([, d]) => d.sleepMin ?? 0);
  if (sleep) fame.push({ emoji: '😴', label: 'Longest sleep', value: fmtDuration(sleep.score * 60_000), detail: short(sleep.item[0]) });

  const habitChecks = entries.reduce((n, [, d]) => n + (d.habits?.length ?? 0), 0);
  if (habitChecks) fame.push({ emoji: '✅', label: 'Habits checked off', value: `${habitChecks}` });

  const lift = maxBy(Object.entries(s.prs), ([, w]) => w);
  if (lift && lift.score > 0) fame.push({ emoji: '🏋️', label: 'Heaviest lift', value: `${lift.score} kg`, detail: lift.item[0] });

  const focus = entries.flatMap(([, d]) => (d.focus ?? []).filter((f) => !f.snapped));
  if (focus.length) {
    const longest = maxBy(focus, (f) => f.minutes)!;
    const total = focus.reduce((a, f) => a + f.minutes, 0);
    fame.push({ emoji: '🕸️', label: 'Longest focus', value: `${longest.score} min`, detail: `${fmtDuration(total * 60_000)} focused in total` });
  }

  if (s.counters.quests) fame.push({ emoji: '🗡️', label: 'Quests completed', value: String(s.counters.quests) });
  if (s.counters.bosses) fame.push({ emoji: '👹', label: 'Bosses defeated', value: String(s.counters.bosses) });
  const bestTier = Math.max(s.league?.tier ?? 0, ...(s.league?.history ?? []).map((h) => h.tier));
  if (s.league) fame.push({ emoji: TIERS[bestTier].emoji, label: 'Best league', value: TIERS[bestTier].name });
  if (s.coinsEarned) fame.push({ emoji: '🪙', label: 'Coins earned', value: s.coinsEarned.toLocaleString('sv-SE') });
  if (themes) fame.push({ emoji: '🎨', label: 'Themes unlocked', value: `${themes.unlocked}/${themes.total}` });

  // --- Hall of Shame (counted days only) ---
  const coffee = maxBy(counted, ([, d]) => coffeeOf(d).length);
  if (coffee && coffee.score >= 3) shame.push({ emoji: '☕', label: 'Most coffees in a day', value: `${coffee.score} cups`, detail: short(coffee.item[0]) });

  const sessions = counted.flatMap(([k, d]) => d.games.map((g) => ({ k, g })));
  const longestGame = maxBy(sessions, (x) => x.g.end - x.g.start);
  if (longestGame) {
    const { g, k } = longestGame.item;
    shame.push({ emoji: '🎮', label: 'Longest gaming session', value: fmtDuration(g.end - g.start), detail: `${g.game ?? 'Unnamed'} · ${short(k)}` });
  }
  // Latest finish, counting 00–05 as later than 23:59.
  const latest = maxBy(sessions, (x) => {
    const d = new Date(x.g.end);
    return ((d.getHours() + 19) % 24) * 60 + d.getMinutes();
  });
  if (latest) {
    const end = new Date(latest.item.g.end).getHours();
    if (end >= 23 || end < 5) shame.push({ emoji: '🌙', label: 'Latest gaming night', value: fmtTime(latest.item.g.end), detail: `${latest.item.g.game ?? 'Unnamed'} · ${short(latest.item.k)}` });
  }
  const worst = maxBy(
    counted.filter(([k]) => k < dayKey()),
    ([k]) => -dayScoreFor(s, noon(k)),
  );
  if (worst) shame.push({ emoji: '💀', label: 'Worst day', value: `${-worst.score}/100`, detail: short(worst.item[0]) });

  return { fame, shame };
}

