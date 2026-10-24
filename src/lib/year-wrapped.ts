// The yearly Wrapped: the whole year (from the first day anything was logged) in slides, on 1 January.
// Same rules as the monthly one (wrapped.ts): counted days only, rough days are rest, mood is shown but
// never graded, nothing about a body, and totals only, never a streak.
import { addDays, dayKey, fmtDuration, MIN } from './dates';
import { countedDay, firstDataDay, roughDay, usedOn } from './day-filters';
import { medalTotals } from './medals';
import { emotionEmoji, moodInfo } from './mood';
import { BOSSES, FINAL_BOSS } from './quests';
import { dayScoreFor, gradeOf, type Grade } from './report';
import { avgMood, coffeeOf, dayOf, effectiveSavage, gamingUsedMs, moodsOf, trainedOn, trainMinutes, waterGoalFor, waterMl } from './selectors';
import { monthName, silkStatus } from './silk-track';
import type { State } from './types';
import type { Slide } from './wrapped';

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const sv = (n: number) => Math.round(n).toLocaleString('sv-SE');
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** The yearly Wrapped shows from 1 January (its banner and notification) until the 7th. */
export const yearWrappedDue = (date: Date | number = new Date()) => {
  const d = new Date(date);
  return d.getMonth() === 0 && d.getDate() <= 7;
};

/** The year's nemesis log entry for a league week (league.ts settle), kept for the yearly Wrapped. */
export function withNemesis(s: State, week: string, nemesis: { name: string; emoji: string; beaten: boolean } | null): State {
  if (!nemesis) return s;
  const log = Object.fromEntries(Object.entries({ ...s.nemesisLog, [week]: nemesis }).slice(-60)); // about a year of weeks
  return { ...s, nemesisLog: log };
}

/** The rival who was your nemesis most often in a year (by the week's Monday), with how often you beat them. */
export function nemesisOfYear(s: State, year: number) {
  const counts = new Map<string, { name: string; emoji: string; weeks: number; beaten: number }>();
  for (const [week, n] of Object.entries(s.nemesisLog ?? {})) {
    if (!week.startsWith(String(year))) continue;
    const c = counts.get(n.name) ?? { name: n.name, emoji: n.emoji, weeks: 0, beaten: 0 };
    c.weeks++;
    if (n.beaten) c.beaten++;
    counts.set(n.name, c);
  }
  return [...counts.values()].sort((a, b) => b.weeks - a.weeks || b.beaten - a.beaten)[0] ?? null;
}

/**
 * A year in slides, from its first logged day (so "since October" for a first year), up to today for the
 * year still running. Scores and "X of N days" only judge counted days; rough ones are rest.
 */
export function yearWrapped(s: State, year: number, now = new Date()) {
  const since = firstDataDay(s);
  const isCurrent = year === now.getFullYear();
  const end = isCurrent ? dayKey(now) : `${year}-12-31`;
  const keys: string[] = [];
  for (let d = new Date(year, 0, 1, 12); dayKey(d) <= end; d = addDays(d, 1)) if (!since || dayKey(d) >= since) keys.push(dayKey(d));
  const days = keys.map((key) => ({ key, date: new Date(`${key}T12:00`), log: dayOf(s, key) }));
  const counted = days.filter((x) => countedDay(s, x.key));
  const n = Math.max(1, counted.length);
  const active = days.filter((x) => usedOn(s.days[x.key])).length;
  const restDays = days.filter((x) => roughDay(s, x.key)).length;
  const startMonth = since && since.startsWith(String(year)) && since > `${year}-01-01` ? MONTHS[Number(since.slice(5, 7)) - 1] : null;
  const slides: Slide[] = [];

  const moods = days.map((x) => avgMood(x.log)).filter((m): m is number => m != null);
  const roughYear = restDays >= Math.max(10, (counted.length + restDays) / 3) || (moods.length >= 10 && avg(moods) < 2.5);
  const kind = effectiveSavage(s, now) <= 2 || roughYear;
  const pick = (savage: string, gentle: string) => (kind ? gentle : savage);

  const xp = days.reduce((a, x) => a + (x.log.xpEarned ?? 0), 0);
  slides.push({
    id: 'intro',
    emoji: '🎆',
    title: `${year} Wrapped`,
    big: `${sv(xp)} XP`,
    sub: `${plural(active, 'active day')}${startMonth ? ` since ${startMonth}` : ''}${isCurrent ? ' so far' : ''}${restDays ? ` · ${plural(restDays, 'rest day')}` : ''}`,
    quip: pick('A whole year of evidence. I kept all of it.', 'Here is your year.'),
    color: 'red',
  });

  // Best month, by XP
  const byMonth = new Map<string, number>();
  for (const x of days) byMonth.set(x.key.slice(0, 7), (byMonth.get(x.key.slice(0, 7)) ?? 0) + (x.log.xpEarned ?? 0));
  const best = [...byMonth.entries()].sort((a, b) => b[1] - a[1])[0];
  if (best && best[1] > 0 && byMonth.size > 1) {
    slides.push({
      id: 'month',
      emoji: '📅',
      title: 'Best month',
      big: MONTHS[Number(best[0].slice(5, 7)) - 1],
      sub: `${sv(best[1])} XP`,
      quip: pick('Peak performance, briefly achieved. Noted for reference.', 'Your strongest month.'),
      color: 'yellow',
    });
  }

  // Water
  const litres = days.reduce((a, x) => a + waterMl(x.log), 0) / 1000;
  if (litres > 0) {
    const goalDays = counted.filter((x) => waterMl(x.log) >= waterGoalFor(s, x.key)).length;
    slides.push({
      id: 'water',
      emoji: '💧',
      title: 'Water',
      big: `${litres.toFixed(0)} L`,
      sub: `goal hit on ${goalDays} of ${plural(counted.length, 'day')}`,
      quip: goalDays / n >= 0.6 ? pick('Enough water to float a small boat. Respect.', 'Well hydrated all year.') : pick('The tap and you remain acquaintances.', 'Water is an easy win to carry into next year.'),
      color: 'water',
    });
  }

  // Training (a workout on a rest day still counts)
  const workouts = days.filter((x) => trainedOn(x.log)).length;
  if (workouts) {
    const minutes = days.reduce((a, x) => a + trainMinutes(x.log), 0);
    slides.push({
      id: 'training',
      emoji: '🏋️',
      title: 'Training',
      big: plural(workouts, 'workout'),
      sub: minutes ? `${fmtDuration(minutes * MIN)} trained` : 'every one counted',
      quip: workouts >= n * 0.4 ? pick('The couch has given up on you. It told me.', 'A strong year of training.') : pick('The weights remember you. Fondly. Occasionally.', 'Every workout counted.'),
      color: 'red',
    });
  }

  // Bosses felled
  const felled = Object.entries(s.bossesDefeated)
    .filter(([week]) => week.startsWith(String(year)))
    .flatMap(([, id]): { name: string; emoji: string }[] => {
      const b = id === FINAL_BOSS.id ? FINAL_BOSS : BOSSES.find((x) => x.id === id);
      return b ? [b] : [];
    });
  const quests = days.reduce((a, x) => a + (x.log.questsDone?.length ?? 0), 0);
  if (felled.length || quests) {
    const kinds = [...new Set(felled.map((b) => b.emoji))].join(' ');
    slides.push({
      id: 'bosses',
      emoji: '🗡️',
      title: 'Bosses felled',
      big: `${felled.length}`,
      sub: `${plural(quests, 'quest')} done${kinds ? ` · ${kinds}` : ''}`,
      quip: felled.length ? pick('Bosses fell. The bards are composing. Slowly.', 'Bosses fell. Well fought.') : pick('The bosses had a good year. Next year they will not.', 'The bosses can wait for next year.'),
      color: 'yellow',
    });
  }

  // Silk Track tiers, month by month
  const months = [...byMonth.keys()];
  const tiers = months.map((m) => ({ m, tier: silkStatus(s, m).tier }));
  const totalTiers = tiers.reduce((a, t) => a + t.tier, 0);
  if (totalTiers) {
    const top = tiers.sort((a, b) => b.tier - a.tier)[0];
    slides.push({
      id: 'silk',
      emoji: '🧵',
      title: 'Silk Track',
      big: plural(totalTiers, 'tier'),
      sub: `best: tier ${top.tier} in ${monthName(top.m).split(' ')[0]}`,
      quip: pick('Silk spun, cosmetics hoarded. The spider approves of the hoarding.', 'A lot of silk spun.'),
      color: 'purple',
    });
  }

  // Weekly medals
  const yearMedals = medalTotals({ ...s, medals: Object.fromEntries(Object.entries(s.medals ?? {}).filter(([week]) => week.startsWith(String(year)))) });
  const medalCount = yearMedals.bronze + yearMedals.silver + yearMedals.gold;
  if (medalCount) {
    slides.push({
      id: 'medals',
      emoji: '🏅',
      title: 'Weekly medals',
      big: `${medalCount}`,
      sub: `🥇 ${yearMedals.gold} · 🥈 ${yearMedals.silver} · 🥉 ${yearMedals.bronze} over ${plural(yearMedals.weeks, 'week')}`,
      quip: pick('A cabinet is being cleared for these. A small one.', 'Medals, earned week by week.'),
      color: 'yellow',
    });
  }

  // Gaming
  const gameMs = days.reduce((a, x) => a + gamingUsedMs(s, x.key, now.getTime()), 0);
  if (gameMs > 0) {
    const perGame = new Map<string, number>();
    for (const x of days) for (const g of x.log.games) if (g.game) perGame.set(g.game, (perGame.get(g.game) ?? 0) + (g.end - g.start));
    const top = [...perGame.entries()].sort((a, b) => b[1] - a[1])[0];
    slides.push({
      id: 'gaming',
      emoji: '🎮',
      title: 'Game of the year',
      big: top ? top[0] : fmtDuration(gameMs),
      sub: top ? `${fmtDuration(top[1])} of ${fmtDuration(gameMs)} played` : 'played, unnamed',
      quip: pick('I would call it a hobby. The hours call it a second job.', 'Hope it was fun.'),
      color: 'blue',
    });
  }

  // Nemesis of the year (league.ts, logged weekly)
  const nem = nemesisOfYear(s, year);
  if (nem) {
    slides.push({
      id: 'nemesis',
      emoji: nem.emoji,
      title: 'Nemesis of the year',
      big: nem.name,
      sub: `your nemesis ${plural(nem.weeks, 'week')} · beaten ${nem.beaten}`,
      quip: nem.beaten * 2 >= nem.weeks ? pick('They have asked for a transfer.', 'You held your own.') : pick('They are already looking forward to next year.', 'A worthy rival.'),
      color: 'cyan',
    });
  }

  // Diary pages and the oldest open task
  const pages = (s.diary ?? []).filter((p) => p.day.startsWith(String(year))).length;
  const endAt = isCurrent ? now.getTime() : new Date(year, 11, 31, 23, 59).getTime();
  const open = s.tasks.filter((t) => !t.done && t.createdAt <= endAt).sort((a, b) => a.createdAt - b.createdAt)[0];
  const age = open ? Math.floor((endAt - open.createdAt) / 86_400_000) : 0;
  if (pages || age >= 7) {
    slides.push({
      id: 'diary',
      emoji: '📓',
      title: 'Paperwork',
      big: pages ? plural(pages, 'diary page') : `${age} days`,
      sub: [pages ? `${plural(pages, 'page')} of my diary` : '', open && age >= 7 ? `oldest open task: "${open.title}", ${age} days` : ''].filter(Boolean).join(' · '),
      quip: open && age >= 30 ? pick(`"${open.title}" has been on the list for ${age} days. It has a lease now.`, 'Some tasks can come along into next year.') : pick('I wrote about you. All true. Mostly.', 'A year on paper.'),
      color: 'purple',
    });
  }

  // Lines retired as "too far"
  const retired = s.lineMemory?.banned?.length ?? 0;
  if (retired) {
    slides.push({
      id: 'retired',
      emoji: '✂️',
      title: 'Lines retired',
      big: `${retired}`,
      sub: `line${retired === 1 ? '' : 's'} you called too far`,
      quip: `${retired}. I've grown.`,
      color: 'green',
    });
  }

  // Mood (shown, never graded, always kind)
  if (moods.length) {
    const emotions = new Map<string, number>();
    for (const x of days) for (const m of moodsOf(x.log)) for (const e of m.emotions) emotions.set(e, (emotions.get(e) ?? 0) + 1);
    const topEmotion = [...emotions.entries()].sort((a, b) => b[1] - a[1])[0];
    const m = avg(moods);
    slides.push({
      id: 'mood',
      emoji: moodInfo(m).emoji,
      title: 'Mood',
      big: `${m.toFixed(1)}/5`,
      sub: topEmotion ? `most felt: ${emotionEmoji(topEmotion[0])} ${topEmotion[0]} (×${topEmotion[1]})` : `${plural(moods.length, 'day')} checked in`,
      quip: m >= 4 ? 'A good year, emotionally. Keep that.' : m >= 3 ? 'Ups and downs. Mostly steady.' : 'A heavy year in places. Be gentle with yourself. I mean it.',
      color: 'cyan',
    });
  }

  // Finale: word of the year + grade, from the counted days only
  const score = counted.length ? Math.round(avg(counted.map((x) => dayScoreFor(s, x.date)))) : null;
  const grade: Grade | null = score == null ? null : gradeOf(score);
  const cups = days.reduce((a, x) => a + coffeeOf(x.log).length, 0);
  const steps = days.filter((x) => x.log.steps != null);
  const candidates: [string, number][] = [
    ['Hydrated', counted.filter((x) => waterMl(x.log) >= waterGoalFor(s, x.key)).length / n / 0.6],
    ['Caffeinated', cups / Math.max(1, active) / 3],
    ['Gym Rat', workouts / (n * 0.4)],
    ['Gamer', gameMs / Math.max(1, active) / (2 * 60 * MIN)],
    ['Walker', steps.length ? avg(steps.map((x) => x.log.steps ?? 0)) / 10_000 : 0],
    ['Zen', moods.length >= 20 ? avg(moods) / 4.2 : 0],
  ];
  const word = candidates.filter(([, v]) => v >= 1).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Work in Progress';
  const finale: Record<Grade, [string, string]> = {
    A: ['An elite year. I have no notes. I am unsettled.', 'A great year.'],
    B: ['A strong year. Not perfect. Strong.', 'A strong year.'],
    C: ['A solid draft of a year. Next year, the final copy.', 'An okay year. That counts.'],
    D: ['This year was a rough draft. Next year we edit.', 'Whatever this year asked of you, you got through it. Next year is a fresh page.'],
    F: ['This year was a rough draft. Next year we edit.', 'Whatever this year asked of you, you got through it. Next year is a fresh page.'],
  };
  slides.push({
    id: 'finale',
    emoji: '🏆',
    title: 'Your year in one word',
    big: word,
    sub: grade && score != null ? `Overall grade ${grade} · ${score}/100` : restDays ? 'No grade: mostly rest days' : 'Not enough days logged for a grade',
    quip: grade ? pick(...finale[grade]) : 'Rest counts too. Next year is a fresh page.',
    color: 'red',
  });

  return { label: `${year}`, partial: isCurrent, slides, grade, score, restDays };
}
