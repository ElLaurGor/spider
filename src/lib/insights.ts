// Patterns in the user's own data: compares two kinds of days and reports clear differences.
import { periodStarts, PHASE_NAMES, phaseOn } from './body';
import { BED_MG, bedtimeCaffeine } from './caffeine';
import { cycleNotes, cycleStats } from './cycle-stats';
import { addDays, dayKey, fmtDuration, WEEKDAYS_LONG } from './dates';
import { countedDay } from './day-filters';
import { dayScoreFor } from './report';
import { avgMood, coffeeOf, dayOf, effectiveSavage, gamingUsedMs, trainedOn, waterGoalFor, waterMl } from './selectors';
import { clockLabel, nightClock, rhythmOf } from './sleep';
import type { DayLog, State } from './types';

export type Insight = { id: string; emoji: string; text: string; detail: string; strength: number };

type Day = { key: string; date: Date; log: DayLog; next: DayLog };

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const MIN_EACH = 3; // days needed on each side of a comparison

/** Average of `value` on days that match vs. days that don't, if both sides have enough data. */
function compare(days: Day[], match: (d: Day) => boolean, value: (d: Day) => number | null) {
  const yes: number[] = [];
  const no: number[] = [];
  for (const d of days) {
    const v = value(d);
    if (v == null) continue;
    (match(d) ? yes : no).push(v);
  }
  if (yes.length < MIN_EACH || no.length < MIN_EACH) return null;
  return { yes: avg(yes), no: avg(no), n: yes.length + no.length };
}

const lateHour = (ts: number) => {
  const h = new Date(ts).getHours();
  return h >= 23 || h < 4;
};

export function insights(s: State, now = new Date(), windowDays = 60): Insight[] {
  // Completed days only (today is still in progress); `next` = the day after (its sleep = that night).
  const days: Day[] = [];
  for (let i = windowDays; i >= 1; i--) {
    const date = addDays(now, -i);
    const key = dayKey(date);
    if (!s.days[key]) continue;
    days.push({ key, date, log: dayOf(s, key), next: dayOf(s, dayKey(addDays(date, 1))) });
  }
  const out: Insight[] = [];
  const add = (i: Insight) => out.push(i);
  // The finding always, the joke only when the tone allows it (not on a low-mood or sick day, not at savage 1–2).
  const kind = effectiveSavage(s, now) <= 2;
  const wink = (finding: string, joke: string) => (kind ? finding : `${finding} ${joke}`);

  // Sleep after training days.
  const trainSleep = compare(days, (d) => trainedOn(d.log), (d) => d.next.sleepMin ?? null);
  if (trainSleep && Math.abs(trainSleep.yes - trainSleep.no) >= 20) {
    const diff = trainSleep.yes - trainSleep.no;
    add({
      id: 'train_sleep',
      emoji: '🏋️',
      text: `You sleep ${fmtDuration(Math.abs(diff) * 60_000)} ${diff > 0 ? 'longer' : 'shorter'} after days you train.`,
      detail: `${fmtDuration(trainSleep.yes * 60_000)} vs ${fmtDuration(trainSleep.no * 60_000)} · ${trainSleep.n} nights`,
      strength: Math.abs(diff) / 30,
    });
  }

  // Mood on training days.
  const trainMood = compare(days, (d) => trainedOn(d.log), (d) => avgMood(d.log));
  if (trainMood && Math.abs(trainMood.yes - trainMood.no) >= 0.3) {
    const up = trainMood.yes > trainMood.no;
    add({
      id: 'train_mood',
      emoji: up ? '💪' : '🤔',
      text: up ? wink('Your mood is better on days you train.', 'Science agrees with me for once.') : 'Your mood dips on training days. Maybe too hard, or too early?',
      detail: `${trainMood.yes.toFixed(1)}/5 vs ${trainMood.no.toFixed(1)}/5 · ${trainMood.n} days`,
      strength: Math.abs(trainMood.yes - trainMood.no) / 0.5,
    });
  }

  // Mood with lots of coffee.
  const coffeeMood = compare(days, (d) => coffeeOf(d.log).length >= 3, (d) => avgMood(d.log));
  if (coffeeMood && Math.abs(coffeeMood.yes - coffeeMood.no) >= 0.3) {
    const worse = coffeeMood.yes < coffeeMood.no;
    add({
      id: 'coffee_mood',
      emoji: '☕',
      text: worse ? wink('Your mood drops on 3+ coffee days.', 'The beans are not your friends.') : wink('You are happier on 3+ coffee days.', 'I am not encouraging this.'),
      detail: `${coffeeMood.yes.toFixed(1)}/5 vs ${coffeeMood.no.toFixed(1)}/5 · ${coffeeMood.n} days`,
      strength: Math.abs(coffeeMood.yes - coffeeMood.no) / 0.5,
    });
  }

  // Late coffee vs that night's sleep.
  const cutoff = s.settings.coffeeCutoffHour;
  const lateCoffee = compare(
    days,
    (d) => coffeeOf(d.log).some((c) => new Date(c.at).getHours() >= cutoff),
    (d) => d.next.sleepMin ?? null,
  );
  if (lateCoffee && lateCoffee.no - lateCoffee.yes >= 15) {
    add({
      id: 'late_coffee',
      emoji: '🌙',
      text: `Coffee after ${cutoff}:00 costs you ${fmtDuration((lateCoffee.no - lateCoffee.yes) * 60_000)} of sleep.`,
      detail: `${fmtDuration(lateCoffee.yes * 60_000)} vs ${fmtDuration(lateCoffee.no * 60_000)} · ${lateCoffee.n} nights`,
      strength: (lateCoffee.no - lateCoffee.yes) / 30,
    });
  }

  // Caffeine still in the body at bedtime vs how that night felt.
  const bedCaf = compare(days, (d) => bedtimeCaffeine(s, d.key) >= BED_MG, (d) => d.next.sleepRating ?? null);
  if (bedCaf && bedCaf.no - bedCaf.yes >= 0.4) {
    add({
      id: 'caffeine_bed',
      emoji: '☕',
      text: wink(`On nights you go to bed with ${BED_MG}+ mg of caffeine still in you, you rate your sleep worse.`, 'The beans clock out later than you do.'),
      detail: `${bedCaf.yes.toFixed(1)}/5 vs ${bedCaf.no.toFixed(1)}/5 · ${bedCaf.n} nights`,
      strength: (bedCaf.no - bedCaf.yes) / 0.6,
    });
  }

  // Late gaming vs that night's sleep rating.
  const lateGame = compare(days, (d) => d.log.games.some((g) => lateHour(g.end)), (d) => d.next.sleepRating ?? null);
  if (lateGame && lateGame.no - lateGame.yes >= 0.4) {
    add({
      id: 'late_game',
      emoji: '🎮',
      text: wink('Gaming past 23:00 makes you rate your sleep worse.', 'The final boss is your bedtime.'),
      detail: `${lateGame.yes.toFixed(1)}/5 vs ${lateGame.no.toFixed(1)}/5 · ${lateGame.n} nights`,
      strength: (lateGame.no - lateGame.yes) / 0.6,
    });
  }

  // Gaming on water-goal days.
  const waterGame = compare(days, (d) => waterMl(d.log) >= waterGoalFor(s, d.key), (d) => gamingUsedMs(s, d.key) / 60_000);
  if (waterGame && Math.abs(waterGame.yes - waterGame.no) >= 20) {
    const more = waterGame.no > waterGame.yes;
    add({
      id: 'water_game',
      emoji: '💧',
      text: more
        ? wink(`You game ${Math.round(waterGame.no - waterGame.yes)} min more on days you skip your water.`, 'Dehydrated and distracted.')
        : wink(`You game ${Math.round(waterGame.yes - waterGame.no)} min more on water-goal days.`, 'Hydrated gamer energy.'),
      detail: `${Math.round(waterGame.yes)} vs ${Math.round(waterGame.no)} min/day · ${waterGame.n} days`,
      strength: Math.abs(waterGame.yes - waterGame.no) / 30,
    });
  }

  // Steps vs mood.
  const stepMood = compare(days, (d) => (d.log.steps ?? 0) >= s.settings.stepGoal, (d) => (d.log.steps != null ? avgMood(d.log) : null));
  if (stepMood && stepMood.yes - stepMood.no >= 0.3) {
    add({
      id: 'steps_mood',
      emoji: '👣',
      text: wink('Your mood is better on days you hit your step goal.', 'Walking: free therapy.'),
      detail: `${stepMood.yes.toFixed(1)}/5 vs ${stepMood.no.toFixed(1)}/5 · ${stepMood.n} days`,
      strength: (stepMood.yes - stepMood.no) / 0.5,
    });
  }

  // Weekend vs weekday water.
  const weekend = compare(days, (d) => d.date.getDay() === 0 || d.date.getDay() === 6, (d) => (d.log.water.length ? waterMl(d.log) : null));
  if (weekend && weekend.no > 0 && (weekend.no - weekend.yes) / weekend.no >= 0.15) {
    add({
      id: 'weekend_water',
      emoji: '🏝️',
      text: wink(`You drink ${Math.round(((weekend.no - weekend.yes) / weekend.no) * 100)}% less water on weekends.`, 'Hydration takes no days off.'),
      detail: `${(weekend.yes / 1000).toFixed(1)} L vs ${(weekend.no / 1000).toFixed(1)} L`,
      strength: (weekend.no - weekend.yes) / weekend.no / 0.2,
    });
  }

  // Energy after a good night.
  const energySleep = compare(days, (d) => (d.log.sleepMin ?? 0) >= 420, (d) => (d.log.sleepMin != null ? (d.log.energy ?? null) : null));
  if (energySleep && energySleep.yes - energySleep.no >= 0.5) {
    add({
      id: 'energy_sleep',
      emoji: '🔋',
      text: wink('Your energy is clearly higher after 7+ hours of sleep.', 'Shocking, I know.'),
      detail: `${energySleep.yes.toFixed(1)}/5 vs ${energySleep.no.toFixed(1)}/5 · ${energySleep.n} days`,
      strength: (energySleep.yes - energySleep.no) / 0.7,
    });
  }

  // Wind-down vs the next morning's sleep rating.
  const wind = compare(days, (d) => !!d.log.windDownDone, (d) => d.next.sleepRating ?? null);
  if (wind && wind.yes - wind.no >= 0.4) {
    add({
      id: 'wind_down',
      emoji: '🌙',
      text: 'You rate your sleep better after doing your wind-down routine. Keep it.',
      detail: `${wind.yes.toFixed(1)}/5 vs ${wind.no.toFixed(1)}/5 · ${wind.n} nights`,
      strength: (wind.yes - wind.no) / 0.6,
    });
  }

  // Custom trackers: does anything move with sleep, training or mood?
  for (const t of s.trackers) {
    const val = (d: Day) => d.log.tracks?.[t.id] ?? null;
    const name = `${t.emoji} ${t.name}`;
    if (t.kind === 'check') {
      const sleepAfter = compare(days, (d) => val(d) === 1, (d) => (val(d) != null ? (d.next.sleepRating ?? null) : null));
      if (sleepAfter && Math.abs(sleepAfter.yes - sleepAfter.no) >= 0.5) {
        const worse = sleepAfter.yes < sleepAfter.no;
        add({
          id: `trk_sleep_${t.id}`,
          emoji: t.emoji,
          text: `On ${name} days you rate that night's sleep ${worse ? 'worse' : 'better'}.`,
          detail: `${sleepAfter.yes.toFixed(1)}/5 vs ${sleepAfter.no.toFixed(1)}/5 · ${sleepAfter.n} nights`,
          strength: Math.abs(sleepAfter.yes - sleepAfter.no) / 0.7,
        });
      }
      const moodOn = compare(days, (d) => val(d) === 1, (d) => (val(d) != null ? avgMood(d.log) : null));
      if (moodOn && Math.abs(moodOn.yes - moodOn.no) >= 0.4) {
        add({
          id: `trk_mood_${t.id}`,
          emoji: t.emoji,
          text: `Your mood is ${moodOn.yes > moodOn.no ? 'better' : 'lower'} on ${name} days.`,
          detail: `${moodOn.yes.toFixed(1)}/5 vs ${moodOn.no.toFixed(1)}/5 · ${moodOn.n} days`,
          strength: Math.abs(moodOn.yes - moodOn.no) / 0.6,
        });
      }
    } else {
      const unit = t.kind === 'scale' ? '/5' : t.unit ? ` ${t.unit}` : '';
      const fmt = (x: number) => (t.kind === 'scale' ? x.toFixed(1) : String(Math.round(x * 10) / 10));
      const shortSleep = compare(days, (d) => d.log.sleepMin != null && d.log.sleepMin < 390, (d) => (d.log.sleepMin != null ? val(d) : null));
      const threshold = t.kind === 'scale' ? 0.6 : 0;
      if (shortSleep && Math.abs(shortSleep.yes - shortSleep.no) > Math.max(threshold, Math.abs(shortSleep.no) * 0.2)) {
        add({
          id: `trk_short_${t.id}`,
          emoji: t.emoji,
          text: `${name} is ${shortSleep.yes > shortSleep.no ? 'higher' : 'lower'} after nights under 6.5 h of sleep.`,
          detail: `${fmt(shortSleep.yes)}${unit} vs ${fmt(shortSleep.no)}${unit} · ${shortSleep.n} days`,
          strength: Math.abs(shortSleep.yes - shortSleep.no) / Math.max(0.5, Math.abs(shortSleep.no) * 0.3),
        });
      }
      const train = compare(days, (d) => trainedOn(d.log), val);
      if (train && Math.abs(train.yes - train.no) > Math.max(threshold, Math.abs(train.no) * 0.2)) {
        add({
          id: `trk_train_${t.id}`,
          emoji: t.emoji,
          text: `${name} is ${train.yes > train.no ? 'higher' : 'lower'} on days you train.`,
          detail: `${fmt(train.yes)}${unit} vs ${fmt(train.no)}${unit} · ${train.n} days`,
          strength: Math.abs(train.yes - train.no) / Math.max(0.5, Math.abs(train.no) * 0.3),
        });
      }
    }
  }

  // Doomscrolling vs mood and that night's sleep.
  const doomMood = compare(days, (d) => (d.log.screen?.doomMin ?? 0) >= 120, (d) => (d.log.screen ? avgMood(d.log) : null));
  if (doomMood && doomMood.no - doomMood.yes >= 0.3) {
    add({
      id: 'doom_mood',
      emoji: '💀',
      text: wink('Your mood is lower on days with 2+ hours of social apps.', 'Lord Doomscroll feeds on this.'),
      detail: `${doomMood.yes.toFixed(1)}/5 vs ${doomMood.no.toFixed(1)}/5 · ${doomMood.n} days`,
      strength: (doomMood.no - doomMood.yes) / 0.5,
    });
  }
  const phoneSleep = compare(days, (d) => (d.log.screen?.totalMin ?? 0) >= s.settings.phoneLimitMin, (d) => (d.log.screen ? (d.next.sleepRating ?? null) : null));
  if (phoneSleep && phoneSleep.no - phoneSleep.yes >= 0.4) {
    add({
      id: 'phone_sleep',
      emoji: '📱',
      text: 'On days you go over your phone limit, you rate your sleep worse.',
      detail: `${phoneSleep.yes.toFixed(1)}/5 vs ${phoneSleep.no.toFixed(1)}/5 · ${phoneSleep.n} nights`,
      strength: (phoneSleep.no - phoneSleep.yes) / 0.6,
    });
  }
  // Phone in bed (cluster F, night.ts) vs the sleep that night: both sit on the morning after.
  const bedPhone = compare(days, (d) => (d.log.night?.lateMin ?? 0) >= 30, (d) => (d.log.night ? (d.log.sleepMin ?? null) : null));
  if (bedPhone && bedPhone.no - bedPhone.yes >= 20) {
    add({
      id: 'bed_phone_sleep',
      emoji: '🛌',
      text: `Nights with 30+ minutes of phone in bed, you sleep ${fmtDuration((bedPhone.no - bedPhone.yes) * 60_000)} less.`,
      detail: `${fmtDuration(bedPhone.yes * 60_000)} vs ${fmtDuration(bedPhone.no * 60_000)} · ${bedPhone.n} nights`,
      strength: (bedPhone.no - bedPhone.yes) / 40,
    });
  }

  // Custom trackers vs high-pollen days (allergy symptoms, headaches…).
  const allergens = s.settings.allergies.length ? s.settings.allergies : (['alder', 'birch', 'grass', 'mugwort', 'ragweed'] as const);
  const highPollen = (d: Day) => !!d.log.air && allergens.some((t) => (d.log.air?.pollen[t] ?? 0) >= (t === 'ragweed' ? 5 : 10));
  for (const t of s.trackers) {
    if (t.kind === 'check') continue;
    const pol = compare(days, highPollen, (d) => (d.log.air ? (d.log.tracks?.[t.id] ?? null) : null));
    const threshold = t.kind === 'scale' ? 0.6 : 0;
    if (pol && Math.abs(pol.yes - pol.no) > Math.max(threshold, Math.abs(pol.no) * 0.2)) {
      add({
        id: `trk_pollen_${t.id}`,
        emoji: '🌳',
        text: `${t.emoji} ${t.name} is ${pol.yes > pol.no ? 'higher' : 'lower'} on high-pollen days.`,
        detail: `${pol.yes.toFixed(1)} vs ${pol.no.toFixed(1)} · ${pol.n} days`,
        strength: Math.abs(pol.yes - pol.no) / Math.max(0.5, Math.abs(pol.no) * 0.3),
      });
    }
  }

  // Weather (saved per day): sunny days vs the rest, rainy days vs dry ones. Helpful, not judgy:
  // Stockholm winters are dark for everyone.
  const sunny = (d: Day) => (d.log.weather?.sunMin ?? 0) >= 180;
  const sunMood = compare(days, sunny, (d) => (d.log.weather ? avgMood(d.log) : null));
  if (sunMood && sunMood.yes - sunMood.no >= 0.3) {
    add({
      id: 'sun_mood',
      emoji: '☀️',
      text: 'Your mood is better on sunny days. On grey ones, a walk at lunch catches what light there is.',
      detail: `${sunMood.yes.toFixed(1)}/5 vs ${sunMood.no.toFixed(1)}/5 · ${sunMood.n} days`,
      strength: (sunMood.yes - sunMood.no) / 0.5,
    });
  }
  const sunEnergy = compare(days, sunny, (d) => (d.log.weather ? (d.log.energy ?? null) : null));
  if (sunEnergy && sunEnergy.yes - sunEnergy.no >= 0.5) {
    add({
      id: 'sun_energy',
      emoji: '🔆',
      text: 'You have more energy on sunny days. Grey days: go easy on yourself, and get outside while it is light.',
      detail: `${sunEnergy.yes.toFixed(1)}/5 vs ${sunEnergy.no.toFixed(1)}/5 · ${sunEnergy.n} days`,
      strength: (sunEnergy.yes - sunEnergy.no) / 0.7,
    });
  }
  const rainSteps = compare(days, (d) => (d.log.weather?.rainMm ?? 0) >= 2, (d) => (d.log.weather && d.log.steps != null ? d.log.steps : null));
  if (rainSteps && rainSteps.no > 0 && (rainSteps.no - rainSteps.yes) / rainSteps.no >= 0.15) {
    add({
      id: 'rain_steps',
      emoji: '🌧️',
      text: wink(`You walk ${Math.round(((rainSteps.no - rainSteps.yes) / rainSteps.no) * 100)}% less on rainy days.`, 'An umbrella is cheaper than a treadmill.'),
      detail: `${Math.round(rainSteps.yes).toLocaleString('sv-SE')} vs ${Math.round(rainSteps.no).toLocaleString('sv-SE')} steps · ${rainSteps.n} days`,
      strength: (rainSteps.no - rainSteps.yes) / rainSteps.no / 0.2,
    });
  }

  // Best and worst weekday, from counted days: a sick Tuesday doesn't make Tuesdays bad.
  const byWeekday = new Map<number, number[]>();
  for (const d of days) {
    if (!countedDay(s, d.key)) continue;
    const list = byWeekday.get(d.date.getDay()) ?? [];
    list.push(dayScoreFor(s, d.date));
    byWeekday.set(d.date.getDay(), list);
  }
  const ranked = [...byWeekday.entries()].filter(([, v]) => v.length >= 2).map(([wd, v]) => ({ wd, score: avg(v) }));
  if (ranked.length >= 4) {
    ranked.sort((a, b) => b.score - a.score);
    const best = ranked[0];
    const worst = ranked[ranked.length - 1];
    if (best.score - worst.score >= 10) {
      add({
        id: 'weekday',
        emoji: '📅',
        text: kind ? `${WEEKDAYS_LONG[best.wd]}s are your best days. ${WEEKDAYS_LONG[worst.wd]}s are harder ones.` : `${WEEKDAYS_LONG[best.wd]}s are your best days. ${WEEKDAYS_LONG[worst.wd]}s are… a work in progress.`,
        detail: `day score ${Math.round(best.score)} vs ${Math.round(worst.score)}`,
        strength: (best.score - worst.score) / 15,
      });
    }
  }

  // Mood by cycle phase (kind wording).
  const starts = periodStarts(s);
  if (starts.length >= 2) {
    const moods = new Map<keyof typeof PHASE_NAMES, number[]>();
    for (const d of days) {
      const m = avgMood(d.log);
      const p = phaseOn(s, d.key, starts);
      if (m == null || !p) continue;
      moods.set(p, [...(moods.get(p) ?? []), m]);
    }
    const phases = [...moods.entries()].filter(([, v]) => v.length >= 2).map(([p, v]) => ({ p, m: avg(v) }));
    if (phases.length >= 2) {
      phases.sort((a, b) => a.m - b.m);
      const low = phases[0];
      const high = phases[phases.length - 1];
      if (high.m - low.m >= 0.4) {
        add({
          id: 'cycle_mood',
          emoji: '🩸',
          text: `Your mood tends to be lowest during ${PHASE_NAMES[low.p]} and highest during ${PHASE_NAMES[high.p]}. Plan easier days then. No roast.`,
          detail: `${low.m.toFixed(1)}/5 vs ${high.m.toFixed(1)}/5`,
          strength: (high.m - low.m) / 0.6,
        });
      }
    }
    // The clearest other shift through the cycle (sleep, energy, steps, training). Mood has its own line above.
    const note = cycleNotes(cycleStats(s, now, windowDays)).find((n) => !n.id.startsWith('mood_'));
    if (note) add({ id: 'cycle_body', emoji: '🌙', text: note.text, detail: 'From your cycle and your own logs · more on the Cycle screen', strength: note.strength });
  }

  // ---- cluster C: sleep rhythm (the watch's bed and wake times) ----
  // A regular bedtime vs the next morning's energy and mood. `d.next` holds the night after `d`.
  const beds = days.filter((d) => d.next.bedAt != null).map((d) => nightClock(d.next.bedAt!, dayKey(addDays(d.date, 1))));
  if (beds.length >= 2 * MIN_EACH) {
    const usual = [...beds].sort((a, b) => a - b)[Math.floor(beds.length / 2)];
    const regular = (d: Day) => d.next.bedAt != null && Math.abs(nightClock(d.next.bedAt, dayKey(addDays(d.date, 1))) - usual) <= 45;
    const onlyNights = (v: number | null | undefined, d: Day) => (d.next.bedAt != null ? (v ?? null) : null);
    const energy = compare(days, regular, (d) => onlyNights(d.next.energy, d));
    const mood = compare(days, regular, (d) => onlyNights(avgMood(d.next), d));
    const best = [energy && { what: 'energy', r: energy }, mood && { what: 'mood', r: mood }]
      .filter((x): x is { what: string; r: NonNullable<typeof energy> } => !!x && x.r.yes - x.r.no >= 0.3)
      .sort((a, b) => b.r.yes - b.r.no - (a.r.yes - a.r.no))[0];
    if (best) {
      add({
        id: 'regular_bed',
        emoji: '🛏️',
        text: `After nights you go to bed near your usual ${clockLabel(usual)}, your ${best.what} the next day is better.`,
        detail: `${best.r.yes.toFixed(1)}/5 vs ${best.r.no.toFixed(1)}/5 · within 45 min · ${best.r.n} mornings`,
        strength: (best.r.yes - best.r.no) / 0.5,
      });
    }
  }
  const rhythm = rhythmOf(s, now, 28);
  if (rhythm?.jetlag != null && rhythm.jetlag >= 60) {
    add({
      id: 'social_jetlag',
      emoji: '🛫',
      text: `Weekends move your sleep ${fmtDuration(rhythm.jetlag * 60_000)} later. Monday mornings feel like landing from another time zone.`,
      detail: `middle of the night, weekend vs weekday · ${rhythm.nights.length} nights`,
      strength: rhythm.jetlag / 90,
    });
  }

  return out.sort((a, b) => b.strength - a.strength);
}

/** One insight to feature on HQ, rotating daily among the strongest few. */
export function insightOfTheDay(s: State, now = new Date()) {
  const all = insights(s, now);
  if (!all.length) return null;
  const top = all.slice(0, 3);
  return top[Math.floor(now.getTime() / 86_400_000) % top.length];
}
