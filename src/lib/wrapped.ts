// Monthly "Wrapped": a story-style recap of one month.
import { activityInfo, sleepInfo } from './body';
import { dayKey, fmtDuration, fmtTime, MIN } from './dates';
import { countedDay, firstDataDay, roughDay, usedOn } from './day-filters';
import { emotionEmoji, moodInfo } from './mood';
import { BOSSES } from './quests';
import { dayScoreFor, gradeOf, type Grade } from './report';
import { activitiesOf, avgMood, coffeeOf, dayOf, effectiveSavage, gamingBudgetMin, gamingUsedMs, moodsOf, trainedOn, trainMinutes, waterGoalFor, waterMl } from './selectors';
import type { ActivityKind, State } from './types';

export type SlideColor = 'red' | 'water' | 'yellow' | 'green' | 'purple' | 'cyan' | 'blue';
export type Slide = { id: string; emoji: string; title: string; big: string; sub: string; quip: string; color: SlideColor };

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const sv = (n: number) => Math.round(n).toLocaleString('sv-SE');
const short = (d: Date) => d.toLocaleDateString('sv-SE').slice(5);
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * The month from the first day anything was logged (days before the app was in use don't count). Scores
 * and "X of N days" only judge counted days: rough ones (sick or away, a low mood, a period day) are left
 * out and shown as rest. The quips go gentle when the tone is down or the month was a rough one.
 */
export function monthWrapped(s: State, year: number, month: number, now = new Date()) {
  const first = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0).getDate();
  const isCurrent = year === now.getFullYear() && month === now.getMonth();
  const lastDay = isCurrent ? now.getDate() : lastOfMonth;
  const since = firstDataDay(s);
  const dates = Array.from({ length: Math.max(0, lastDay) }, (_, i) => new Date(year, month, i + 1)).filter((d) => !since || dayKey(d) >= since);
  const inRange = dates.map((d) => ({ date: d, key: dayKey(d), log: dayOf(s, dayKey(d)) }));
  const logs = inRange.filter((x) => countedDay(s, x.key));
  const n = Math.max(1, logs.length);
  const active = inRange.filter((x) => usedOn(s.days[x.key])).length;
  const restDays = inRange.filter((x) => roughDay(s, x.key)).length;
  const label = first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const monthName = first.toLocaleDateString('en-GB', { month: 'long' });
  const slides: Slide[] = [];

  const moods = inRange.map((x) => avgMood(x.log)).filter((m): m is number => m != null);
  // Gentle quips when the tone is down (low mood, sick, a low savage setting) or the month was a rough one.
  const roughMonth = restDays >= Math.max(3, (logs.length + restDays) / 3) || (moods.length >= 3 && avg(moods) < 2.5);
  const kind = effectiveSavage(s, now) <= 2 || roughMonth;
  const pick = (savage: string, gentle: string) => (kind ? gentle : savage);

  const xp = inRange.reduce((a, x) => a + (x.log.xpEarned ?? 0), 0);
  const startedLate = dates.length > 0 && dates[0].getDate() > 1;
  slides.push({
    id: 'intro',
    emoji: '🎁',
    title: `${monthName} Wrapped`,
    big: `${sv(xp)} XP`,
    sub: `${plural(active, 'active day')}${startedLate ? ` since ${short(dates[0])}` : ''}${isCurrent ? ' so far' : ''}${restDays ? ` · ${plural(restDays, 'rest day')}` : ''}`,
    quip: pick("Let's see what you did. And what you didn't.", "Here's your month."),
    color: 'red',
  });

  // Water
  const water = inRange.map((x) => waterMl(x.log));
  const goalDays = logs.filter((x) => waterMl(x.log) >= waterGoalFor(s, x.key)).length;
  if (water.some((ml) => ml > 0)) {
    const ratio = goalDays / n;
    slides.push({
      id: 'water',
      emoji: '💧',
      title: 'Water',
      big: `${(water.reduce((a, b) => a + b, 0) / 1000).toFixed(1)} L`,
      sub: `goal hit on ${goalDays} of ${plural(logs.length, 'day')}`,
      quip:
        ratio >= 0.7
          ? pick('Basically a fish. Respect.', 'Well hydrated. That one is all yours.')
          : ratio >= 0.4
            ? pick('Decently hydrated. Decently.', 'Steady on water.')
            : pick('Your kidneys would like a word.', 'Water is an easy win to pick up next month.'),
      color: 'water',
    });
  }

  // Coffee
  const cups = inRange.flatMap((x) => coffeeOf(x.log));
  if (cups.length) {
    const latest = cups.reduce((a, c) => {
      const mins = (t: number) => {
        const d = new Date(t);
        return ((d.getHours() + 20) % 24) * 60 + d.getMinutes(); // counts 00–04 as "later" than 23:00
      };
      return mins(c.at) > mins(a.at) ? c : a;
    });
    const perDay = cups.length / Math.max(1, active);
    slides.push({
      id: 'coffee',
      emoji: '☕',
      title: 'Coffee',
      big: `${cups.length} cups`,
      sub: `${sv(cups.reduce((a, c) => a + c.mg, 0))} mg caffeine · latest at ${fmtTime(latest.at)} on ${short(new Date(latest.at))}`,
      quip:
        perDay >= 3
          ? pick('Your blood type is now espresso.', 'A lot of coffee. Worth a look if your nights run short.')
          : perDay >= 1.5
            ? pick('A healthy relationship with beans. Mostly.', 'A fair amount of coffee.')
            : pick('Reasonable. Suspiciously reasonable.', 'Coffee kept in check.'),
      color: 'yellow',
    });
  }

  // Training (a workout on a rest day still counts)
  const trainedDays = inRange.filter((x) => trainedOn(x.log)).length;
  const minutes = inRange.reduce((a, x) => a + trainMinutes(x.log), 0);
  if (trainedDays) {
    const byKind = new Map<ActivityKind, number>();
    for (const x of inRange) for (const a of activitiesOf(x.log)) byKind.set(a.kind, (byKind.get(a.kind) ?? 0) + a.minutes);
    const fav = [...byKind.entries()].sort((a, b) => b[1] - a[1])[0];
    slides.push({
      id: 'training',
      emoji: '🏋️',
      title: 'Training',
      big: `${trainedDays} workouts`,
      sub: [minutes ? `${fmtDuration(minutes * MIN)} trained` : '', fav ? `favorite: ${activityInfo(fav[0]).emoji} ${activityInfo(fav[0]).label}` : ''].filter(Boolean).join(' · '),
      quip:
        trainedDays >= n * 0.5
          ? pick('Gym rat certified. The couch has filed a missing person report.', 'A strong month of training.')
          : trainedDays >= 6
            ? pick('Solid. The weights know your name.', 'Good, steady training.')
            : pick('The gym misses you. It told me.', 'Every workout counted. More will come when they can.'),
      color: 'red',
    });
  }

  // Steps
  const stepDays = inRange.filter((x) => x.log.steps != null);
  if (stepDays.length) {
    const total = stepDays.reduce((a, x) => a + (x.log.steps ?? 0), 0);
    const best = stepDays.reduce((a, x) => ((x.log.steps ?? 0) > (a.log.steps ?? 0) ? x : a));
    slides.push({
      id: 'steps',
      emoji: '👣',
      title: 'Steps',
      big: sv(total),
      sub: `≈ ${(total * 0.00075).toFixed(0)} km · best day ${short(best.date)} with ${sv(best.log.steps ?? 0)}`,
      quip:
        total / stepDays.length >= s.settings.stepGoal
          ? pick('You walked. A lot. Your legs deserve a raise.', 'Lots of walking. Nice.')
          : pick('Some walking happened. Not enough, but some.', 'Some walking. Every bit counts.'),
      color: 'green',
    });
  }

  // Sleep (the habit is bedtime; a short night is never the person's fault)
  const slept = inRange.filter((x) => x.log.sleepMin != null);
  const rated = inRange.filter((x) => x.log.sleepRating != null);
  if (slept.length || rated.length) {
    const avgMin = avg(slept.map((x) => x.log.sleepMin ?? 0));
    const avgRate = avg(rated.map((x) => x.log.sleepRating ?? 3));
    slides.push({
      id: 'sleep',
      emoji: '😴',
      title: 'Sleep',
      big: slept.length ? fmtDuration(avgMin * MIN) : sleepInfo(avgRate).emoji,
      sub: [slept.length ? 'average night' : '', rated.length ? `rated ${avgRate.toFixed(1)}/5 ${sleepInfo(avgRate).emoji}` : ''].filter(Boolean).join(' · '),
      quip:
        slept.length && avgMin < 360
          ? pick('Short nights all month. Bedtime is a habit too, and it skipped practice.', 'Short nights this month. Rest where you can.')
          : avgRate >= 4
            ? pick('Well rested. No excuses were available.', 'Well rested. Good.')
            : pick('Sleep: present, but not thriving.', 'Sleep was okay. Nothing to fix in a hurry.'),
      color: 'purple',
    });
  }

  // Gaming
  const gameMs = inRange.reduce((a, x) => a + gamingUsedMs(s, x.key), 0);
  const overDays = logs.filter((x) => gamingUsedMs(s, x.key) > gamingBudgetMin(s, x.key) * MIN).length;
  if (gameMs > 0) {
    const perGame = new Map<string, number>();
    for (const x of inRange) for (const g of x.log.games) if (g.game) perGame.set(g.game, (perGame.get(g.game) ?? 0) + (g.end - g.start));
    const top = [...perGame.entries()].sort((a, b) => b[1] - a[1])[0];
    slides.push({
      id: 'gaming',
      emoji: '🎮',
      title: 'Gaming',
      big: fmtDuration(gameMs),
      sub: [top ? `#1: ${top[0]} (${fmtDuration(top[1])})` : '', `${overDays} days over budget`].filter(Boolean).join(' · '),
      quip:
        gameMs / Math.max(1, active) >= 2 * 60 * MIN
          ? pick("That's a part-time job. Unpaid.", 'A lot of gaming. Hope it was fun.')
          : overDays === 0
            ? pick('Never over budget. Who are you?', 'Never over budget.')
            : pick('Gamer energy, mostly under control.', 'Gaming mostly within budget.'),
      color: 'blue',
    });
  }

  // Phone
  const phoneDays = inRange.filter((x) => x.log.screen);
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
      quip:
        perDay >= 240
          ? pick('Your phone worked overtime all month. Give it a day off.', 'Lots of phone time. A screen-free evening might feel good.')
          : perDay >= 150
            ? pick('A committed relationship with your screen.', 'A fair bit of screen time.')
            : pick('Phone time under control. Touch grass bonus unlocked.', 'Phone time under control.'),
      color: 'blue',
    });
  }

  // Mood (shown, never graded, always kind)
  if (moods.length) {
    const emotions = new Map<string, number>();
    for (const x of inRange) for (const m of moodsOf(x.log)) for (const e of m.emotions) emotions.set(e, (emotions.get(e) ?? 0) + 1);
    const topEmotion = [...emotions.entries()].sort((a, b) => b[1] - a[1])[0];
    const m = avg(moods);
    slides.push({
      id: 'mood',
      emoji: moodInfo(m).emoji,
      title: 'Mood',
      big: `${m.toFixed(1)}/5`,
      sub: topEmotion ? `most felt: ${emotionEmoji(topEmotion[0])} ${topEmotion[0]} (×${topEmotion[1]})` : `${moods.length} days checked in`,
      quip: m >= 4 ? 'A good month, emotionally. Love that for you.' : m >= 3 ? 'Ups and downs. Mostly steady.' : 'A heavy month. Be gentle with yourself. I mean it.',
      color: 'cyan',
    });
  }

  // Quests & bosses
  const quests = inRange.reduce((a, x) => a + (x.log.questsDone?.length ?? 0), 0);
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
      quip: bossNames.length
        ? pick('Bosses fell. Bards are writing songs. Quiet ones.', 'Bosses fell. Nice work.')
        : pick('The bosses are still laughing. Next month.', 'The bosses can wait for next month.'),
      color: 'yellow',
    });
  }

  // Finale: word of the month + grade, from the counted days only
  const score = logs.length ? Math.round(avg(logs.map((x) => dayScoreFor(s, x.date)))) : null;
  const grade: Grade | null = score == null ? null : gradeOf(score);
  const candidates: [string, number][] = [
    ['Hydrated', goalDays / n / 0.6],
    ['Caffeinated', cups.length / Math.max(1, active) / 3],
    ['Gym Rat', trainedDays / (n * 0.5)],
    ['Gamer', gameMs / Math.max(1, active) / (2 * 60 * MIN)],
    ['Walker', stepDays.length ? avg(stepDays.map((x) => x.log.steps ?? 0)) / 10_000 : 0],
    ['Zen', moods.length >= 5 ? avg(moods) / 4.2 : 0],
  ];
  const word = candidates.filter(([, v]) => v >= 1).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Work in Progress';
  const finale: Record<Grade, [string, string]> = {
    A: ['Elite month. I have no notes. Unsettling.', 'A great month.'],
    B: ['Strong month. Not perfect. Strong.', 'A strong month.'],
    C: ['Mid month. Next month: less mid.', 'An okay month. That counts.'],
    D: ['This month was a draft. Next month, we rewrite it.', 'Whatever this month asked of you, you got through it. Next month is a fresh page.'],
    F: ['This month was a draft. Next month, we rewrite it.', 'Whatever this month asked of you, you got through it. Next month is a fresh page.'],
  };
  slides.push({
    id: 'finale',
    emoji: '🏆',
    title: 'Your month in one word',
    big: word,
    sub: grade && score != null ? `Overall grade ${grade} · ${score}/100` : restDays ? 'No grade: mostly rest days' : 'Not enough days logged for a grade',
    quip: grade ? pick(...finale[grade]) : 'Rest counts too. Next month is a fresh page.',
    color: 'red',
  });

  return { label, partial: isCurrent, slides, grade, score, restDays };
}
