// Monthly "Wrapped": a story-style recap of one month.
import { activityInfo, sleepInfo } from './body';
import { dayKey, fmtDuration, fmtTime, MIN } from './dates';
import { emotionEmoji, moodInfo } from './mood';
import { BOSSES } from './quests';
import { dayScoreFor, gradeOf, type Grade } from './report';
import { activitiesOf, avgMood, coffeeOf, dayOf, gamingBudgetMin, gamingUsedMs, moodsOf, trainedOn, trainMinutes, waterMl } from './selectors';
import type { ActivityKind, State } from './types';

export type SlideColor = 'red' | 'water' | 'yellow' | 'green' | 'purple' | 'cyan' | 'blue';
export type Slide = { id: string; emoji: string; title: string; big: string; sub: string; quip: string; color: SlideColor };

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const sv = (n: number) => Math.round(n).toLocaleString('sv-SE');
const short = (d: Date) => d.toLocaleDateString('sv-SE').slice(5);

export function monthWrapped(s: State, year: number, month: number, now = new Date()) {
  const first = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0).getDate();
  const isCurrent = year === now.getFullYear() && month === now.getMonth();
  const lastDay = isCurrent ? now.getDate() : lastOfMonth;
  const dates = Array.from({ length: Math.max(0, lastDay) }, (_, i) => new Date(year, month, i + 1));
  const logs = dates.map((d) => ({ date: d, key: dayKey(d), log: dayOf(s, dayKey(d)) }));
  const n = Math.max(1, logs.length);
  const label = first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const monthName = first.toLocaleDateString('en-GB', { month: 'long' });
  const slides: Slide[] = [];

  const xp = logs.reduce((a, x) => a + (x.log.xpEarned ?? 0), 0);
  const active = logs.filter((x) => s.days[x.key]).length;
  slides.push({
    id: 'intro',
    emoji: '🎁',
    title: `${monthName} Wrapped`,
    big: `${sv(xp)} XP`,
    sub: `${active} active days${isCurrent ? ' so far' : ''}`,
    quip: "Let's see what you did. And what you didn't.",
    color: 'red',
  });

  // Water
  const water = logs.map((x) => waterMl(x.log));
  const goalDays = water.filter((ml) => ml >= s.settings.waterGoalMl).length;
  if (water.some((ml) => ml > 0)) {
    const ratio = goalDays / n;
    slides.push({
      id: 'water',
      emoji: '💧',
      title: 'Water',
      big: `${(water.reduce((a, b) => a + b, 0) / 1000).toFixed(1)} L`,
      sub: `goal hit on ${goalDays} of ${n} days`,
      quip: ratio >= 0.7 ? 'Basically a fish. Respect.' : ratio >= 0.4 ? 'Decently hydrated. Decently.' : 'Your kidneys would like a word.',
      color: 'water',
    });
  }

  // Coffee
  const cups = logs.flatMap((x) => coffeeOf(x.log));
  if (cups.length) {
    const latest = cups.reduce((a, c) => {
      const mins = (t: number) => {
        const d = new Date(t);
        return ((d.getHours() + 20) % 24) * 60 + d.getMinutes(); // counts 00–04 as "later" than 23:00
      };
      return mins(c.at) > mins(a.at) ? c : a;
    });
    const perDay = cups.length / n;
    slides.push({
      id: 'coffee',
      emoji: '☕',
      title: 'Coffee',
      big: `${cups.length} cups`,
      sub: `${sv(cups.reduce((a, c) => a + c.mg, 0))} mg caffeine · latest at ${fmtTime(latest.at)} on ${short(new Date(latest.at))}`,
      quip: perDay >= 3 ? 'Your blood type is now espresso.' : perDay >= 1.5 ? 'A healthy relationship with beans. Mostly.' : 'Reasonable. Suspiciously reasonable.',
      color: 'yellow',
    });
  }

  // Training
  const trainedDays = logs.filter((x) => trainedOn(x.log)).length;
  const minutes = logs.reduce((a, x) => a + trainMinutes(x.log), 0);
  if (trainedDays) {
    const byKind = new Map<ActivityKind, number>();
    for (const x of logs) for (const a of activitiesOf(x.log)) byKind.set(a.kind, (byKind.get(a.kind) ?? 0) + a.minutes);
    const fav = [...byKind.entries()].sort((a, b) => b[1] - a[1])[0];
    slides.push({
      id: 'training',
      emoji: '🏋️',
      title: 'Training',
      big: `${trainedDays} workouts`,
      sub: [minutes ? `${fmtDuration(minutes * MIN)} trained` : '', fav ? `favorite: ${activityInfo(fav[0]).emoji} ${activityInfo(fav[0]).label}` : ''].filter(Boolean).join(' · '),
      quip: trainedDays >= n * 0.5 ? 'Gym rat certified. The couch has filed a missing person report.' : trainedDays >= 6 ? 'Solid. The weights know your name.' : 'The gym misses you. It told me.',
      color: 'red',
    });
  }

  // Steps
  const stepDays = logs.filter((x) => x.log.steps != null);
  if (stepDays.length) {
    const total = stepDays.reduce((a, x) => a + (x.log.steps ?? 0), 0);
    const best = stepDays.reduce((a, x) => ((x.log.steps ?? 0) > (a.log.steps ?? 0) ? x : a));
    slides.push({
      id: 'steps',
      emoji: '👣',
      title: 'Steps',
      big: sv(total),
      sub: `≈ ${(total * 0.00075).toFixed(0)} km · best day ${short(best.date)} with ${sv(best.log.steps ?? 0)}`,
      quip: total / stepDays.length >= s.settings.stepGoal ? 'You walked. A lot. Your legs deserve a raise.' : 'Some walking happened. Not enough, but some.',
      color: 'green',
    });
  }

  // Sleep
  const slept = logs.filter((x) => x.log.sleepMin != null);
  const rated = logs.filter((x) => x.log.sleepRating != null);
  if (slept.length || rated.length) {
    const avgMin = avg(slept.map((x) => x.log.sleepMin ?? 0));
    const avgRate = avg(rated.map((x) => x.log.sleepRating ?? 3));
    slides.push({
      id: 'sleep',
      emoji: '😴',
      title: 'Sleep',
      big: slept.length ? fmtDuration(avgMin * MIN) : sleepInfo(avgRate).emoji,
      sub: [slept.length ? 'average night' : '', rated.length ? `rated ${avgRate.toFixed(1)}/5 ${sleepInfo(avgRate).emoji}` : ''].filter(Boolean).join(' · '),
      quip: slept.length && avgMin < 360 ? 'Zombie mode was your main personality.' : avgRate >= 4 ? 'Well rested. No excuses were available.' : 'Sleep: present, but not thriving.',
      color: 'purple',
    });
  }

  // Gaming
  const gameMs = logs.reduce((a, x) => a + gamingUsedMs(s, x.key), 0);
  if (gameMs > 0) {
    const perGame = new Map<string, number>();
    for (const x of logs) for (const g of x.log.games) if (g.game) perGame.set(g.game, (perGame.get(g.game) ?? 0) + (g.end - g.start));
    const top = [...perGame.entries()].sort((a, b) => b[1] - a[1])[0];
    const overDays = logs.filter((x) => gamingUsedMs(s, x.key) > gamingBudgetMin(s, x.key) * MIN).length;
    slides.push({
      id: 'gaming',
      emoji: '🎮',
      title: 'Gaming',
      big: fmtDuration(gameMs),
      sub: [top ? `#1: ${top[0]} (${fmtDuration(top[1])})` : '', `${overDays} days over budget`].filter(Boolean).join(' · '),
      quip: gameMs / n >= 2 * 60 * MIN ? "That's a part-time job. Unpaid." : overDays === 0 ? 'Never over budget. Who are you?' : 'Gamer energy, mostly under control.',
      color: 'blue',
    });
  }

  // Phone
  const phoneDays = logs.filter((x) => x.log.screen);
  if (phoneDays.length) {
    const total = phoneDays.reduce((a, x) => a + (x.log.screen?.totalMin ?? 0), 0);
    const perApp = new Map<string, number>();
    for (const x of phoneDays) for (const a of x.log.screen?.top ?? []) perApp.set(a.label, (perApp.get(a.label) ?? 0) + a.min);
    const top = [...perApp.entries()].sort((a, b) => b[1] - a[1])[0];
    const perDay = total / phoneDays.length;
    slides.push({
      id: 'phone',
      emoji: '📱',
      title: 'Phone',
      big: fmtDuration(total * MIN),
      sub: `${fmtDuration(perDay * MIN)} a day${top ? ` · #1 app: ${top[0]} (${fmtDuration(top[1] * MIN)})` : ''}`,
      quip: perDay >= 240 ? 'Your phone has seen more of you than your friends have.' : perDay >= 150 ? 'A committed relationship with your screen.' : 'Phone time under control. Touch grass bonus unlocked.',
      color: 'blue',
    });
  }

  // Mood
  const moods = logs.map((x) => avgMood(x.log)).filter((m): m is number => m != null);
  if (moods.length) {
    const emotions = new Map<string, number>();
    for (const x of logs) for (const m of moodsOf(x.log)) for (const e of m.emotions) emotions.set(e, (emotions.get(e) ?? 0) + 1);
    const topEmotion = [...emotions.entries()].sort((a, b) => b[1] - a[1])[0];
    const m = avg(moods);
    slides.push({
      id: 'mood',
      emoji: moodInfo(m).emoji,
      title: 'Mood',
      big: `${m.toFixed(1)}/5`,
      sub: topEmotion ? `most felt: ${emotionEmoji(topEmotion[0])} ${topEmotion[0]} (×${topEmotion[1]})` : `${moods.length} days checked in`,
      quip: m >= 4 ? 'A good month, emotionally. Love that for you.' : m >= 3 ? 'Ups and downs. Mostly steady.' : "A heavy month. Be gentle with yourself. I mean it.",
      color: 'cyan',
    });
  }

  // Quests & bosses
  const quests = logs.reduce((a, x) => a + (x.log.questsDone?.length ?? 0), 0);
  const bossNames = Object.entries(s.bossesDefeated)
    .filter(([week]) => {
      const t = new Date(`${week}T12:00`);
      return t.getFullYear() === year && t.getMonth() === month;
    })
    .map(([, id]) => BOSSES.find((b) => b.id === id))
    .filter((b): b is (typeof BOSSES)[number] => !!b);
  if (quests || bossNames.length) {
    slides.push({
      id: 'quests',
      emoji: '🗡️',
      title: 'Quests & bosses',
      big: `${quests} quests`,
      sub: bossNames.length ? `defeated: ${bossNames.map((b) => `${b.emoji} ${b.name}`).join(', ')}` : 'no bosses defeated',
      quip: bossNames.length ? 'Bosses fell. Bards are writing songs. Quiet ones.' : 'The bosses are still laughing. Next month.',
      color: 'yellow',
    });
  }

  // Finale: word of the month + grade
  const score = Math.round(avg(dates.map((d) => dayScoreFor(s, d))));
  const grade: Grade = gradeOf(score);
  const candidates: [string, number][] = [
    ['Hydrated', goalDays / n / 0.6],
    ['Caffeinated', cups.length / n / 3],
    ['Gym Rat', trainedDays / (n * 0.5)],
    ['Gamer', gameMs / n / (2 * 60 * MIN)],
    ['Walker', stepDays.length ? avg(stepDays.map((x) => x.log.steps ?? 0)) / 10_000 : 0],
    ['Zen', moods.length >= 5 ? avg(moods) / 4.2 : 0],
  ];
  const word = candidates.filter(([, v]) => v >= 1).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Work in Progress';
  slides.push({
    id: 'finale',
    emoji: '🏆',
    title: 'Your month in one word',
    big: word,
    sub: `Overall grade ${grade} · ${score}/100`,
    quip:
      grade === 'A' ? 'Elite month. I have no notes. Unsettling.' : grade === 'B' ? 'Strong month. Not perfect. Strong.' : grade === 'C' ? 'Mid month. Next month: less mid.' : 'This month was a draft. Next month, we rewrite it.',
    color: 'red',
  });

  return { label, partial: isCurrent, slides, grade, score };
}
