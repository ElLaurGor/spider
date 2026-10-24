// Patterns in the user's own data: compares two kinds of days and reports clear differences. "Clear" is a
// statistical bar (stats.ts): at least 8 days on each side, a permutation test, and the Benjamini–Hochberg cut
// across every comparison made here, so 30 tries don't turn up a finding by luck. Paused (sick, away) days are
// left out: a sick day has no gym and a low mood, which would make training look like a mood fix. The wording
// says "goes with", never "makes": these are the owner's patterns, not causes.
import { cycleMap, PHASE_NAMES, PHASES, phaseOn } from './body';
import { BED_MG, bedtimeCaffeine } from './caffeine';
import { cycleNotes, cycleStats } from './cycle-stats';
import { addDays, dayKey, fmtDuration, WEEKDAYS_LONG } from './dates';
import { countedDay } from './day-filters';
import { pausedOn } from './pause';
import { avgMood, coffeeOf, dayOf, effectiveSavage, gamingUsedMs, trainedOn, waterGoalFor, waterMl } from './selectors';
import { clockLabel, nightClock, rhythmOf } from './sleep';
import { family, MIN_SIDE, permP } from './stats';
import type { DayLog, State } from './types';

export type Insight = { id: string; emoji: string; text: string; detail: string; strength: number };

type Day = { key: string; date: Date; log: DayLog; next: DayLog };

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

const lateHour = (ts: number) => {
  const h = new Date(ts).getHours();
  return h >= 23 || h < 4;
};

/** Completed days in the window (today is still in progress), paused days left out. `next` = the day after (its sleep = that night). */
function daysOf(s: State, now: Date, windowDays: number, keep: (key: string) => boolean = (key) => !pausedOn(s, key)): Day[] {
  const days: Day[] = [];
  for (let i = windowDays; i >= 1; i--) {
    const date = addDays(now, -i);
    const key = dayKey(date);
    if (!s.days[key] || !keep(key)) continue;
    days.push({ key, date, log: dayOf(s, key), next: dayOf(s, dayKey(addDays(date, 1))) });
  }
  return days;
}

export function insights(s: State, now = new Date(), windowDays = 60): Insight[] {
  const days = daysOf(s, now, windowDays);
  const fam = family<Insight>();
  /** Average of `value` on days that match vs. days that don't, with its test, if both sides have enough data. */
  const compare = (list: Day[], match: (d: Day) => boolean, value: (d: Day) => number | null) => {
    const yes: number[] = [];
    const no: number[] = [];
    for (const d of list) {
      const v = value(d);
      if (v == null) continue;
      (match(d) ? yes : no).push(v);
    }
    if (yes.length < MIN_SIDE || no.length < MIN_SIDE) return null;
    return { yes: avg(yes), no: avg(no), n: yes.length + no.length, test: fam.test(() => permP(yes, no)) };
  };
  const add = (i: Insight, r: { test: number }) => fam.add(i, r.test);
  // The finding always, the joke only when the tone allows it (not on a low-mood or sick day, not at savage 1–2).
  const kind = effectiveSavage(s, now) <= 2;
  const wink = (finding: string, joke: string) => (kind ? finding : `${finding} ${joke}`);

  // Sleep after training days.
  const trainSleep = compare(days, (d) => trainedOn(d.log), (d) => d.next.sleepMin ?? null);
  if (trainSleep && Math.abs(trainSleep.yes - trainSleep.no) >= 20) {
    const diff = trainSleep.yes - trainSleep.no;
    add(
      {
        id: 'train_sleep',
        emoji: '🏋️',
        text: `You sleep ${fmtDuration(Math.abs(diff) * 60_000)} ${diff > 0 ? 'longer' : 'shorter'} after days you train.`,
        detail: `${fmtDuration(trainSleep.yes * 60_000)} vs ${fmtDuration(trainSleep.no * 60_000)} · ${trainSleep.n} nights`,
        strength: Math.abs(diff) / 30,
      },
      trainSleep,
    );
  }

  // Mood on training days.
  const trainMood = compare(days, (d) => trainedOn(d.log), (d) => avgMood(d.log));
  if (trainMood && Math.abs(trainMood.yes - trainMood.no) >= 0.3) {
    const up = trainMood.yes > trainMood.no;
    add(
      {
        id: 'train_mood',
        emoji: up ? '💪' : '🤔',
        text: up ? wink('Your mood is better on days you train.', 'Science agrees with me for once.') : 'Your mood dips on training days. Maybe too hard, or too early?',
        detail: `${trainMood.yes.toFixed(1)}/5 vs ${trainMood.no.toFixed(1)}/5 · ${trainMood.n} days`,
        strength: Math.abs(trainMood.yes - trainMood.no) / 0.5,
      },
      trainMood,
    );
  }

  // Mood with lots of coffee.
  const coffeeMood = compare(days, (d) => coffeeOf(d.log).length >= 3, (d) => avgMood(d.log));
  if (coffeeMood && Math.abs(coffeeMood.yes - coffeeMood.no) >= 0.3) {
    const worse = coffeeMood.yes < coffeeMood.no;
    add(
      {
        id: 'coffee_mood',
        emoji: '☕',
        text: worse ? wink('Your mood drops on 3+ coffee days.', 'The beans are not your friends.') : wink('You are happier on 3+ coffee days.', 'I am not encouraging this.'),
        detail: `${coffeeMood.yes.toFixed(1)}/5 vs ${coffeeMood.no.toFixed(1)}/5 · ${coffeeMood.n} days`,
        strength: Math.abs(coffeeMood.yes - coffeeMood.no) / 0.5,
      },
      coffeeMood,
    );
  }

  // Late coffee vs that night's sleep.
  const cutoff = s.settings.coffeeCutoffHour;
  const lateCoffee = compare(
    days,
    (d) => coffeeOf(d.log).some((c) => new Date(c.at).getHours() >= cutoff),
    (d) => d.next.sleepMin ?? null,
  );
  if (lateCoffee && lateCoffee.no - lateCoffee.yes >= 15) {
    add(
      {
        id: 'late_coffee',
        emoji: '🌙',
        text: `Coffee after ${cutoff}:00 goes with ${fmtDuration((lateCoffee.no - lateCoffee.yes) * 60_000)} less sleep that night.`,
        detail: `${fmtDuration(lateCoffee.yes * 60_000)} vs ${fmtDuration(lateCoffee.no * 60_000)} · ${lateCoffee.n} nights`,
        strength: (lateCoffee.no - lateCoffee.yes) / 30,
      },
      lateCoffee,
    );
  }

  // Caffeine still in the body at bedtime vs how that night felt.
  const bedCaf = compare(days, (d) => bedtimeCaffeine(s, d.key) >= BED_MG, (d) => d.next.sleepRating ?? null);
  if (bedCaf && bedCaf.no - bedCaf.yes >= 0.4) {
    add(
      {
        id: 'caffeine_bed',
        emoji: '☕',
        text: wink(`On nights you go to bed with ${BED_MG}+ mg of caffeine still in you, you rate your sleep worse.`, 'The beans clock out later than you do.'),
        detail: `${bedCaf.yes.toFixed(1)}/5 vs ${bedCaf.no.toFixed(1)}/5 · ${bedCaf.n} nights`,
        strength: (bedCaf.no - bedCaf.yes) / 0.6,
      },
      bedCaf,
    );
  }

  // Late gaming vs that night's sleep rating.
  const lateGame = compare(days, (d) => d.log.games.some((g) => lateHour(g.end)), (d) => d.next.sleepRating ?? null);
  if (lateGame && lateGame.no - lateGame.yes >= 0.4) {
    add(
      {
        id: 'late_game',
        emoji: '🎮',
        text: wink('Gaming past 23:00 goes with nights you rate worse.', 'The final boss is your bedtime.'),
        detail: `${lateGame.yes.toFixed(1)}/5 vs ${lateGame.no.toFixed(1)}/5 · ${lateGame.n} nights`,
        strength: (lateGame.no - lateGame.yes) / 0.6,
      },
      lateGame,
    );
  }

  // Gaming on water-goal days.
  const waterGame = compare(days, (d) => waterMl(d.log) >= waterGoalFor(s, d.key), (d) => gamingUsedMs(s, d.key) / 60_000);
  if (waterGame && Math.abs(waterGame.yes - waterGame.no) >= 20) {
    const more = waterGame.no > waterGame.yes;
    add(
      {
        id: 'water_game',
        emoji: '💧',
        text: more
          ? wink(`You game ${Math.round(waterGame.no - waterGame.yes)} min more on days you skip your water.`, 'Dehydrated and distracted.')
          : wink(`You game ${Math.round(waterGame.yes - waterGame.no)} min more on water-goal days.`, 'Hydrated gamer energy.'),
        detail: `${Math.round(waterGame.yes)} vs ${Math.round(waterGame.no)} min/day · ${waterGame.n} days`,
        strength: Math.abs(waterGame.yes - waterGame.no) / 30,
      },
      waterGame,
    );
  }

  // Steps vs mood.
  const stepMood = compare(days, (d) => (d.log.steps ?? 0) >= s.settings.stepGoal, (d) => (d.log.steps != null ? avgMood(d.log) : null));
  if (stepMood && stepMood.yes - stepMood.no >= 0.3) {
    add(
      {
        id: 'steps_mood',
        emoji: '👣',
        text: wink('Your mood is better on days you hit your step goal.', 'Walking: free therapy.'),
        detail: `${stepMood.yes.toFixed(1)}/5 vs ${stepMood.no.toFixed(1)}/5 · ${stepMood.n} days`,
        strength: (stepMood.yes - stepMood.no) / 0.5,
      },
      stepMood,
    );
  }

  // Weekend vs weekday water.
  const weekend = compare(days, (d) => d.date.getDay() === 0 || d.date.getDay() === 6, (d) => (d.log.water.length ? waterMl(d.log) : null));
  if (weekend && weekend.no > 0 && (weekend.no - weekend.yes) / weekend.no >= 0.15) {
    add(
      {
        id: 'weekend_water',
        emoji: '🏝️',
        text: wink(`You drink ${Math.round(((weekend.no - weekend.yes) / weekend.no) * 100)}% less water on weekends.`, 'Hydration takes no days off.'),
        detail: `${(weekend.yes / 1000).toFixed(1)} L vs ${(weekend.no / 1000).toFixed(1)} L`,
        strength: (weekend.no - weekend.yes) / weekend.no / 0.2,
      },
      weekend,
    );
  }

  // Energy after a good night.
  const energySleep = compare(days, (d) => (d.log.sleepMin ?? 0) >= 420, (d) => (d.log.sleepMin != null ? (d.log.energy ?? null) : null));
  if (energySleep && energySleep.yes - energySleep.no >= 0.5) {
    add(
      {
        id: 'energy_sleep',
        emoji: '🔋',
        text: wink('Your energy is clearly higher after 7+ hours of sleep.', 'Shocking, I know.'),
        detail: `${energySleep.yes.toFixed(1)}/5 vs ${energySleep.no.toFixed(1)}/5 · ${energySleep.n} days`,
        strength: (energySleep.yes - energySleep.no) / 0.7,
      },
      energySleep,
    );
  }

  // Wind-down vs the next morning's sleep rating.
  const wind = compare(days, (d) => !!d.log.windDownDone, (d) => d.next.sleepRating ?? null);
  if (wind && wind.yes - wind.no >= 0.4) {
    add(
      {
        id: 'wind_down',
        emoji: '🌙',
        text: 'You rate your sleep better after doing your wind-down routine. Keep it.',
        detail: `${wind.yes.toFixed(1)}/5 vs ${wind.no.toFixed(1)}/5 · ${wind.n} nights`,
        strength: (wind.yes - wind.no) / 0.6,
      },
      wind,
    );
  }

  // Custom trackers: does anything move with sleep, training or mood?
  for (const t of s.trackers) {
    const val = (d: Day) => d.log.tracks?.[t.id] ?? null;
    const name = `${t.emoji} ${t.name}`;
    if (t.kind === 'check') {
      const sleepAfter = compare(days, (d) => val(d) === 1, (d) => (val(d) != null ? (d.next.sleepRating ?? null) : null));
      if (sleepAfter && Math.abs(sleepAfter.yes - sleepAfter.no) >= 0.5) {
        const worse = sleepAfter.yes < sleepAfter.no;
        add(
          {
            id: `trk_sleep_${t.id}`,
            emoji: t.emoji,
            text: `On ${name} days you rate that night's sleep ${worse ? 'worse' : 'better'}.`,
            detail: `${sleepAfter.yes.toFixed(1)}/5 vs ${sleepAfter.no.toFixed(1)}/5 · ${sleepAfter.n} nights`,
            strength: Math.abs(sleepAfter.yes - sleepAfter.no) / 0.7,
          },
          sleepAfter,
        );
      }
      const moodOn = compare(days, (d) => val(d) === 1, (d) => (val(d) != null ? avgMood(d.log) : null));
      if (moodOn && Math.abs(moodOn.yes - moodOn.no) >= 0.4) {
        add(
          {
            id: `trk_mood_${t.id}`,
            emoji: t.emoji,
            text: `Your mood is ${moodOn.yes > moodOn.no ? 'better' : 'lower'} on ${name} days.`,
            detail: `${moodOn.yes.toFixed(1)}/5 vs ${moodOn.no.toFixed(1)}/5 · ${moodOn.n} days`,
            strength: Math.abs(moodOn.yes - moodOn.no) / 0.6,
          },
          moodOn,
        );
      }
    } else {
      const unit = t.kind === 'scale' ? '/5' : t.unit ? ` ${t.unit}` : '';
      const fmt = (x: number) => (t.kind === 'scale' ? x.toFixed(1) : String(Math.round(x * 10) / 10));
      const shortSleep = compare(days, (d) => d.log.sleepMin != null && d.log.sleepMin < 390, (d) => (d.log.sleepMin != null ? val(d) : null));
      const threshold = t.kind === 'scale' ? 0.6 : 0;
      if (shortSleep && Math.abs(shortSleep.yes - shortSleep.no) > Math.max(threshold, Math.abs(shortSleep.no) * 0.2)) {
        add(
          {
            id: `trk_short_${t.id}`,
            emoji: t.emoji,
            text: `${name} is ${shortSleep.yes > shortSleep.no ? 'higher' : 'lower'} after nights under 6.5 h of sleep.`,
            detail: `${fmt(shortSleep.yes)}${unit} vs ${fmt(shortSleep.no)}${unit} · ${shortSleep.n} days`,
            strength: Math.abs(shortSleep.yes - shortSleep.no) / Math.max(0.5, Math.abs(shortSleep.no) * 0.3),
          },
          shortSleep,
        );
      }
      const train = compare(days, (d) => trainedOn(d.log), val);
      if (train && Math.abs(train.yes - train.no) > Math.max(threshold, Math.abs(train.no) * 0.2)) {
        add(
          {
            id: `trk_train_${t.id}`,
            emoji: t.emoji,
            text: `${name} is ${train.yes > train.no ? 'higher' : 'lower'} on days you train.`,
            detail: `${fmt(train.yes)}${unit} vs ${fmt(train.no)}${unit} · ${train.n} days`,
            strength: Math.abs(train.yes - train.no) / Math.max(0.5, Math.abs(train.no) * 0.3),
          },
          train,
        );
      }
    }
  }

  // Doomscrolling vs mood and that night's sleep.
  const doomMood = compare(days, (d) => (d.log.screen?.doomMin ?? 0) >= 120, (d) => (d.log.screen ? avgMood(d.log) : null));
  if (doomMood && doomMood.no - doomMood.yes >= 0.3) {
    add(
      {
        id: 'doom_mood',
        emoji: '💀',
        text: wink('Your mood is lower on days with 2+ hours of social apps.', 'Lord Doomscroll feeds on this.'),
        detail: `${doomMood.yes.toFixed(1)}/5 vs ${doomMood.no.toFixed(1)}/5 · ${doomMood.n} days`,
        strength: (doomMood.no - doomMood.yes) / 0.5,
      },
      doomMood,
    );
  }
  const phoneSleep = compare(days, (d) => (d.log.screen?.totalMin ?? 0) >= s.settings.phoneLimitMin, (d) => (d.log.screen ? (d.next.sleepRating ?? null) : null));
  if (phoneSleep && phoneSleep.no - phoneSleep.yes >= 0.4) {
    add(
      {
        id: 'phone_sleep',
        emoji: '📱',
        text: 'On days you go over your phone limit, you rate your sleep worse.',
        detail: `${phoneSleep.yes.toFixed(1)}/5 vs ${phoneSleep.no.toFixed(1)}/5 · ${phoneSleep.n} nights`,
        strength: (phoneSleep.no - phoneSleep.yes) / 0.6,
      },
      phoneSleep,
    );
  }
  // Phone in bed (cluster F, night.ts) vs the sleep that night: both sit on the morning after.
  const bedPhone = compare(days, (d) => (d.log.night?.lateMin ?? 0) >= 30, (d) => (d.log.night ? (d.log.sleepMin ?? null) : null));
  if (bedPhone && bedPhone.no - bedPhone.yes >= 20) {
    add(
      {
        id: 'bed_phone_sleep',
        emoji: '🛌',
        text: `Nights with 30+ minutes of phone in bed, you sleep ${fmtDuration((bedPhone.no - bedPhone.yes) * 60_000)} less.`,
        detail: `${fmtDuration(bedPhone.yes * 60_000)} vs ${fmtDuration(bedPhone.no * 60_000)} · ${bedPhone.n} nights`,
        strength: (bedPhone.no - bedPhone.yes) / 40,
      },
      bedPhone,
    );
  }

  // Custom trackers vs high-pollen days (allergy symptoms, headaches…).
  const allergens = s.settings.allergies.length ? s.settings.allergies : (['alder', 'birch', 'grass', 'mugwort', 'ragweed'] as const);
  const highPollen = (d: Day) => !!d.log.air && allergens.some((t) => (d.log.air?.pollen[t] ?? 0) >= (t === 'ragweed' ? 5 : 10));
  for (const t of s.trackers) {
    if (t.kind === 'check') continue;
    const pol = compare(days, highPollen, (d) => (d.log.air ? (d.log.tracks?.[t.id] ?? null) : null));
    const threshold = t.kind === 'scale' ? 0.6 : 0;
    if (pol && Math.abs(pol.yes - pol.no) > Math.max(threshold, Math.abs(pol.no) * 0.2)) {
      add(
        {
          id: `trk_pollen_${t.id}`,
          emoji: '🌳',
          text: `${t.emoji} ${t.name} is ${pol.yes > pol.no ? 'higher' : 'lower'} on high-pollen days.`,
          detail: `${pol.yes.toFixed(1)} vs ${pol.no.toFixed(1)} · ${pol.n} days`,
          strength: Math.abs(pol.yes - pol.no) / Math.max(0.5, Math.abs(pol.no) * 0.3),
        },
        pol,
      );
    }
  }

  // Weather (saved per day): sunny days vs the rest, rainy days vs dry ones. Helpful, not judgy:
  // Stockholm winters are dark for everyone.
  const sunny = (d: Day) => (d.log.weather?.sunMin ?? 0) >= 180;
  const sunMood = compare(days, sunny, (d) => (d.log.weather ? avgMood(d.log) : null));
  if (sunMood && sunMood.yes - sunMood.no >= 0.3) {
    add(
      {
        id: 'sun_mood',
        emoji: '☀️',
        text: 'Your mood is better on sunny days. On grey ones, a walk at lunch catches what light there is.',
        detail: `${sunMood.yes.toFixed(1)}/5 vs ${sunMood.no.toFixed(1)}/5 · ${sunMood.n} days`,
        strength: (sunMood.yes - sunMood.no) / 0.5,
      },
      sunMood,
    );
  }
  const sunEnergy = compare(days, sunny, (d) => (d.log.weather ? (d.log.energy ?? null) : null));
  if (sunEnergy && sunEnergy.yes - sunEnergy.no >= 0.5) {
    add(
      {
        id: 'sun_energy',
        emoji: '🔆',
        text: 'You have more energy on sunny days. Grey days: go easy on yourself, and get outside while it is light.',
        detail: `${sunEnergy.yes.toFixed(1)}/5 vs ${sunEnergy.no.toFixed(1)}/5 · ${sunEnergy.n} days`,
        strength: (sunEnergy.yes - sunEnergy.no) / 0.7,
      },
      sunEnergy,
    );
  }
  const rainSteps = compare(days, (d) => (d.log.weather?.rainMm ?? 0) >= 2, (d) => (d.log.weather && d.log.steps != null ? d.log.steps : null));
  if (rainSteps && rainSteps.no > 0 && (rainSteps.no - rainSteps.yes) / rainSteps.no >= 0.15) {
    add(
      {
        id: 'rain_steps',
        emoji: '🌧️',
        text: wink(`You walk ${Math.round(((rainSteps.no - rainSteps.yes) / rainSteps.no) * 100)}% less on rainy days.`, 'An umbrella is cheaper than a treadmill.'),
        detail: `${Math.round(rainSteps.yes).toLocaleString('sv-SE')} vs ${Math.round(rainSteps.no).toLocaleString('sv-SE')} steps · ${rainSteps.n} days`,
        strength: (rainSteps.no - rainSteps.yes) / rainSteps.no / 0.2,
      },
      rainSteps,
    );
  }

  // Weekdays, one metric at a time, from counted days over the last 13 weeks (a sick Tuesday says nothing about
  // Tuesdays). Not the day score: that mostly says which days have a workout planned.
  const week = daysOf(s, now, 91, (key) => countedDay(s, key));
  for (let wd = 0; wd < 7; wd++) {
    const on = (d: Day) => d.date.getDay() === wd;
    const name = WEEKDAYS_LONG[wd];
    const water = compare(week, on, (d) => (d.log.water.length ? waterMl(d.log) / waterGoalFor(s, d.key) : null));
    if (water && water.no > 0 && Math.abs(water.no - water.yes) / water.no >= 0.15) {
      const pct = Math.round((Math.abs(water.no - water.yes) / water.no) * 100);
      add(
        {
          id: 'weekday',
          emoji: '📅',
          text: `${name}s: you drink about ${pct}% ${water.yes < water.no ? 'less' : 'more'} water than on other days.`,
          detail: `${Math.round(water.yes * 100)}% vs ${Math.round(water.no * 100)}% of the goal · ${water.n} days`,
          strength: pct / 20,
        },
        water,
      );
    }
    const steps = compare(week, on, (d) => d.log.steps ?? null);
    if (steps && steps.no > 0 && Math.abs(steps.no - steps.yes) / steps.no >= 0.2) {
      const pct = Math.round((Math.abs(steps.no - steps.yes) / steps.no) * 100);
      add(
        {
          id: 'weekday',
          emoji: '📅',
          text: `${name}s: about ${pct}% ${steps.yes < steps.no ? 'fewer' : 'more'} steps than other days.`,
          detail: `${Math.round(steps.yes).toLocaleString('sv-SE')} vs ${Math.round(steps.no).toLocaleString('sv-SE')} · ${steps.n} days`,
          strength: pct / 25,
        },
        steps,
      );
    }
    const sleep = compare(week, on, (d) => d.next.sleepMin ?? null);
    if (sleep && Math.abs(sleep.yes - sleep.no) >= 30) {
      const diff = sleep.yes - sleep.no;
      add(
        {
          id: 'weekday',
          emoji: '📅',
          text: `${name} nights you sleep about ${fmtDuration(Math.abs(diff) * 60_000)} ${diff < 0 ? 'less' : 'more'} than other nights.`,
          detail: `${fmtDuration(sleep.yes * 60_000)} vs ${fmtDuration(sleep.no * 60_000)} · ${sleep.n} nights`,
          strength: Math.abs(diff) / 40,
        },
        sleep,
      );
    }
    const bed = compare(week, on, (d) => (d.next.bedAt != null ? nightClock(d.next.bedAt, dayKey(addDays(d.date, 1))) : null));
    if (bed && Math.abs(bed.yes - bed.no) >= 45) {
      const diff = bed.yes - bed.no;
      add(
        {
          id: 'weekday',
          emoji: '📅',
          text: `${name}s you go to bed about ${fmtDuration(Math.abs(diff) * 60_000)} ${diff > 0 ? 'later' : 'earlier'} than other nights.`,
          detail: `${clockLabel(bed.yes)} vs ${clockLabel(bed.no)} · ${bed.n} nights`,
          strength: Math.abs(diff) / 60,
        },
        bed,
      );
    }
  }

  // Mood by cycle phase (kind wording): each phase against the rest of the cycle.
  const map = cycleMap(s);
  if (map.runs.length >= 2) {
    const phase = new Map(days.map((d) => [d.key, phaseOn(s, d.key, map)]));
    for (const p of PHASES) {
      const r = compare(days, (d) => phase.get(d.key) === p, (d) => (phase.get(d.key) ? avgMood(d.log) : null));
      if (!r || Math.abs(r.yes - r.no) < 0.4) continue;
      const low = r.yes < r.no;
      add(
        {
          id: 'cycle_mood',
          emoji: '🩸',
          text: low
            ? `Your mood tends to be lower during ${PHASE_NAMES[p]}. Plan easier days then. No roast.`
            : `Your mood tends to be brighter during ${PHASE_NAMES[p]}.`,
          detail: `${r.yes.toFixed(1)}/5 vs ${r.no.toFixed(1)}/5 the rest of the cycle · ${r.n} days`,
          strength: Math.abs(r.yes - r.no) / 0.6,
        },
        r,
      );
    }
    // The clearest other shift through the cycle (sleep, energy, steps, training). Mood has its own line above.
    const note = cycleNotes(cycleStats(s, now, windowDays)).find((n) => !n.id.startsWith('mood_'));
    if (note) {
      const detail = 'From your cycle and your own logs · more on the Cycle screen';
      add({ id: 'cycle_body', emoji: '🌙', text: note.text, detail, strength: note.strength }, { test: fam.test(note.p) });
    }
  }

  // ---- cluster C: sleep rhythm (the watch's bed and wake times) ----
  // A regular bedtime vs the next morning's energy and mood. `d.next` holds the night after `d`.
  const beds = days.filter((d) => d.next.bedAt != null).map((d) => nightClock(d.next.bedAt!, dayKey(addDays(d.date, 1))));
  if (beds.length >= 2 * MIN_SIDE) {
    const usual = [...beds].sort((a, b) => a - b)[Math.floor(beds.length / 2)];
    const regular = (d: Day) => d.next.bedAt != null && Math.abs(nightClock(d.next.bedAt, dayKey(addDays(d.date, 1))) - usual) <= 45;
    const onlyNights = (v: number | null | undefined, d: Day) => (d.next.bedAt != null ? (v ?? null) : null);
    const energy = compare(days, regular, (d) => onlyNights(d.next.energy, d));
    const mood = compare(days, regular, (d) => onlyNights(avgMood(d.next), d));
    for (const [what, r] of [
      ['energy', energy],
      ['mood', mood],
    ] as const) {
      if (!r || r.yes - r.no < 0.3) continue;
      add(
        {
          id: 'regular_bed',
          emoji: '🛏️',
          text: `After nights you go to bed near your usual ${clockLabel(usual)}, your ${what} the next day is better.`,
          detail: `${r.yes.toFixed(1)}/5 vs ${r.no.toFixed(1)}/5 · within 45 min · ${r.n} mornings`,
          strength: (r.yes - r.no) / 0.5,
        },
        r,
      );
    }
  }
  // Weekend nights vs weekday ones (the middle of the night), over six weeks so each side has enough nights.
  const rhythm = rhythmOf(s, now, 42);
  if (rhythm?.jetlag != null && rhythm.jetlag >= 60) {
    const mid = (x: { bed: number; wake: number }) => (x.bed + x.wake) / 2;
    const weekend = rhythm.nights.filter((x) => x.weekend).map(mid);
    const weekday = rhythm.nights.filter((x) => !x.weekend).map(mid);
    if (weekend.length >= MIN_SIDE && weekday.length >= MIN_SIDE) {
      add(
        {
          id: 'social_jetlag',
          emoji: '🛫',
          text: `Weekends move your sleep ${fmtDuration(rhythm.jetlag * 60_000)} later. Monday mornings feel like landing from another time zone.`,
          detail: `middle of the night, weekend vs weekday · ${rhythm.nights.length} nights`,
          strength: rhythm.jetlag / 90,
        },
        { test: fam.test(() => permP(weekend, weekday)) },
      );
    }
  }

  // One line per kind of finding (the strongest weekday, the strongest cycle phase…).
  const seen = new Set<string>();
  return fam
    .kept()
    .sort((a, b) => b.strength - a.strength)
    .filter((i) => !seen.has(i.id) && !!seen.add(i.id));
}

/** One insight to feature on HQ, rotating daily among the strongest few. */
export function insightOfTheDay(s: State, now = new Date()) {
  const all = insights(s, now);
  if (!all.length) return null;
  const top = all.slice(0, 3);
  return top[Math.floor(now.getTime() / 86_400_000) % top.length];
}
