// Weekly league against rival bots: Bronze → Diamond, top 3 promote, bottom 3 demote.
import { addDays, dayKey, startOfWeek } from './dates';
import { pausedInWeek } from './pause';
import { dayOf } from './selectors';
import type { League, Rival, State } from './types';

export const TIERS = [
  { name: 'Bronze', emoji: '🥉', min: 30, max: 110 },
  { name: 'Silver', emoji: '🥈', min: 50, max: 140 },
  { name: 'Gold', emoji: '🥇', min: 70, max: 170 },
  { name: 'Platinum', emoji: '💠', min: 90, max: 200 },
  { name: 'Diamond', emoji: '💎', min: 110, max: 240 },
];
export const PROMOTE = 3;
export const DEMOTE = 3;

const ROSTER: Omit<Rival, 'id'>[] = [
  { name: 'Gym Bro Gustav', emoji: '💪', power: 1.3 },
  { name: 'Couch Potato Carl', emoji: '🥔', power: 0.5 },
  { name: 'Hydro Hanna', emoji: '💧', power: 1.0 },
  { name: 'Caffeine Kalle', emoji: '☕', power: 0.9 },
  { name: 'Speedrun Sara', emoji: '🏃', power: 1.2 },
  { name: 'Lazy Lars', emoji: '😴', power: 0.6 },
  { name: 'Grindset Greta', emoji: '📈', power: 1.4 },
  { name: 'Noob Niklas', emoji: '🎮', power: 0.7 },
  { name: 'Doomscroll Dennis', emoji: '📱', power: 0.65 },
  { name: 'Zen Zara', emoji: '🧘', power: 1.0 },
  { name: 'Protein Petra', emoji: '🍗', power: 1.15 },
  { name: 'Night Owl Olle', emoji: '🦉', power: 0.85 },
  { name: 'Spreadsheet Sven', emoji: '📊', power: 1.1 },
  { name: 'Snack Attack Stina', emoji: '🍫', power: 0.75 },
  { name: 'Marathon Maja', emoji: '🏅', power: 1.25 },
  { name: 'Procrastinating Pelle', emoji: '⏳', power: 0.55 },
  { name: 'Meme Lord Max', emoji: '🐸', power: 0.8 },
  { name: 'Early Bird Elin', emoji: '🐦', power: 1.1 },
  { name: 'Tryhard Tove', emoji: '🔥', power: 1.35 },
  { name: 'Chill Chris', emoji: '🧊', power: 0.9 },
];

const hash = (str: string) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
};

export const weekKeyOf = (date: Date | number = new Date()) => dayKey(startOfWeek(date));
const mondayOf = (week: string) => new Date(`${week}T00:00`);

export function newLeague(tier: number, week: string, history: League['history'] = []): League {
  const rivals = ROSTER.map((r, i) => ({ r, k: hash(`${week}:${tier}:${i}`) }))
    .sort((a, b) => a.k - b.k)
    .slice(0, 9)
    .map(({ r }, i) => ({ ...r, id: `${week}-${i}` }));
  return { tier, week, rivals, history };
}

/** How far through today's waking hours (07–23) we are, so rivals "earn" XP during the day. */
const dayFraction = (now: Date) => Math.min(1, Math.max(0, (now.getHours() + now.getMinutes() / 60 - 7) / 16));

export function rivalXp(r: Rival, tier: number, week: string, now: Date) {
  const t = TIERS[tier];
  const monday = mondayOf(week);
  let total = 0;
  for (let i = 0; i < 7; i++) {
    const key = dayKey(addDays(monday, i));
    if (key > dayKey(now)) break;
    const roll = hash(`${week}:${r.id}:${i}`) / 2 ** 32;
    let xp = (t.min + (t.max - t.min) * roll) * r.power;
    if (key === dayKey(now)) xp *= dayFraction(now);
    total += xp;
  }
  return Math.round(total);
}

export function userWeekXp(s: State, week: string, now: Date) {
  const monday = mondayOf(week);
  let total = 0;
  for (let i = 0; i < 7; i++) {
    const key = dayKey(addDays(monday, i));
    if (key > dayKey(now)) break;
    total += dayOf(s, key).xpEarned ?? 0;
  }
  return total;
}

export type Standing = { id: string; name: string; emoji: string; xp: number; me: boolean };

export function standings(s: State, now = new Date()): Standing[] {
  const l = s.league;
  if (!l) return [];
  const rows: Standing[] = [
    { id: 'me', name: s.settings.userName || 'You', emoji: '🕷️', xp: userWeekXp(s, l.week, now), me: true },
    ...l.rivals.map((r) => ({ id: r.id, name: r.name, emoji: r.emoji, xp: rivalXp(r, l.tier, l.week, now), me: false })),
  ];
  return rows.sort((a, b) => b.xp - a.xp || (a.me ? -1 : b.me ? 1 : 0));
}

/** Sick/away days in a league week that protect you from demotion. */
export const PAUSE_SAFE_DAYS = 3;

/** Final result of a finished league week, judged at Sunday 23:59. 3+ sick/away days: no demotion. */
export function settle(s: State) {
  const l = s.league!;
  const end = addDays(new Date(`${l.week}T23:59`), 6);
  const table = standings(s, end);
  const rank = table.findIndex((r) => r.me) + 1;
  const demoted = rank > table.length - DEMOTE && pausedInWeek(s, mondayOf(l.week)) < PAUSE_SAFE_DAYS;
  const tier = rank <= PROMOTE ? Math.min(TIERS.length - 1, l.tier + 1) : demoted ? Math.max(0, l.tier - 1) : l.tier;
  const prize = rank === 1 ? 300 : rank === 2 ? 200 : rank === 3 ? 100 : 0;
  return { rank, tier, prize, xp: table.find((r) => r.me)?.xp ?? 0 };
}
