// The symptom detective: for one custom tracker (headache, allergy, stomach…), which of her usual suspects
// show up together with it, ranked by how big the difference is. "More often when", never "caused by".
import { periodStarts, phaseOn } from './body';
import { BED_MG, bedtimeCaffeine } from './caffeine';
import { addDays, dayKey } from './dates';
import { coffeeOf, dayOf, onPeriod, trainedOn, waterMl } from './selectors';
import type { DayLog, State, Tracker } from './types';

type Ctx = { key: string; log: DayLog; prev: DayLog; prevKey: string; starts: string[] };

/** A suspect: true/false for a day, or null when that day can't tell (e.g. no weather saved). */
type Suspect = { id: string; emoji: string; when: string; test: (s: State, c: Ctx) => boolean | null };

const POLLEN = ['alder', 'birch', 'grass', 'mugwort', 'ragweed'] as const;

export const SUSPECTS: Suspect[] = [
  { id: 'short_sleep', emoji: '😴', when: 'after nights under 6 h of sleep', test: (_s, c) => (c.log.sleepMin != null ? c.log.sleepMin < 360 : null) },
  { id: 'caffeine_bed', emoji: '☕', when: `after going to bed with ${BED_MG}+ mg of caffeine in you`, test: (s, c) => (s.days[c.prevKey] ? bedtimeCaffeine(s, c.prevKey) >= BED_MG : null) },
  { id: 'coffee', emoji: '☕', when: 'on 3+ coffee days', test: (_s, c) => coffeeOf(c.log).length >= 3 },
  {
    id: 'low_water',
    emoji: '💧',
    when: 'on days you drink under 60% of your water goal',
    test: (s, c) => (c.log.water.length ? waterMl(c.log) < s.settings.waterGoalMl * 0.6 : null),
  },
  {
    id: 'pollen',
    emoji: '🌳',
    when: 'on high-pollen days',
    test: (s, c) => {
      if (!c.log.air) return null;
      const types = s.settings.allergies.length ? s.settings.allergies : POLLEN;
      return types.some((t) => (c.log.air?.pollen[t] ?? 0) >= (t === 'ragweed' ? 5 : 10));
    },
  },
  {
    id: 'pressure',
    emoji: '🌡️',
    when: 'when the air pressure falls fast (5+ hPa in a day)',
    test: (_s, c) => (c.log.weather?.pressureDrop != null ? c.log.weather.pressureDrop >= 5 : null),
  },
  { id: 'hot', emoji: '🥵', when: 'on hot days (25°+)', test: (_s, c) => (c.log.weather ? c.log.weather.max >= 25 : null) },
  { id: 'social', emoji: '📱', when: 'on days with 2+ h of social apps', test: (_s, c) => (c.log.screen ? c.log.screen.doomMin >= 120 : null) },
  {
    id: 'late_gaming',
    emoji: '🎮',
    when: 'after gaming past 23:00',
    test: (_s, c) =>
      c.prev.games.some((g) => {
        const h = new Date(g.end).getHours();
        return h >= 23 || h < 4;
      }),
  },
  { id: 'rest_day', emoji: '🛋️', when: 'on days without training', test: (_s, c) => !trainedOn(c.log) },
  { id: 'period', emoji: '🩸', when: 'on period days', test: (_s, c) => (c.starts.length ? onPeriod(c.log) : null) },
  {
    id: 'premenstrual',
    emoji: '🌙',
    when: 'in the week before your period',
    test: (s, c) => (c.starts.length >= 2 ? phaseOn(s, c.key, c.starts) === 'luteal' : null),
  },
];

export type Clue = {
  id: string;
  emoji: string;
  text: string;
  detail: string;
  strength: number;
};

const MIN_EACH = 3;
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** Ranked clues for one tracker over the last `windowDays` finished days, plus how many days it was logged. */
export function detective(s: State, tracker: Tracker, now = new Date(), windowDays = 90): { logged: number; clues: Clue[] } {
  const days: Ctx[] = [];
  const starts = periodStarts(s);
  for (let i = windowDays; i >= 1; i--) {
    const date = addDays(now, -i);
    const key = dayKey(date);
    if (s.days[key]?.tracks?.[tracker.id] == null) continue;
    const prevKey = dayKey(addDays(date, -1));
    days.push({ key, log: dayOf(s, key), prev: dayOf(s, prevKey), prevKey, starts });
  }
  const name = `${tracker.emoji} ${tracker.name}`;
  const clues: Clue[] = [];
  for (const sus of SUSPECTS) {
    const yes: number[] = [];
    const no: number[] = [];
    for (const c of days) {
      const hit = sus.test(s, c);
      if (hit == null) continue;
      (hit ? yes : no).push(c.log.tracks![tracker.id]);
    }
    if (yes.length < MIN_EACH || no.length < MIN_EACH) continue;
    const a = avg(yes);
    const b = avg(no);
    const n = `${yes.length} vs ${no.length} days`;
    if (tracker.kind === 'check') {
      const diff = a - b; // share of days it happened
      if (Math.abs(diff) < 0.2) continue;
      clues.push({
        id: sus.id,
        emoji: sus.emoji,
        text: `${name} shows up ${diff > 0 ? 'more' : 'less'} often ${sus.when}.`,
        detail: `${Math.round(a * 100)}% vs ${Math.round(b * 100)}% of days · ${n}`,
        strength: Math.abs(diff) / 0.3,
      });
    } else {
      const fmt = (x: number) => (tracker.kind === 'scale' ? x.toFixed(1) : String(Math.round(x * 10) / 10));
      const unit = tracker.kind === 'scale' ? '/5' : tracker.unit ? ` ${tracker.unit}` : '';
      const enough = tracker.kind === 'scale' ? Math.abs(a - b) >= 0.6 : Math.abs(a - b) >= Math.max(0.5, Math.abs(b) * 0.2);
      if (!enough) continue;
      clues.push({
        id: sus.id,
        emoji: sus.emoji,
        text: `${name} tends to be ${a > b ? 'higher' : 'lower'} ${sus.when}.`,
        detail: `${fmt(a)}${unit} vs ${fmt(b)}${unit} · ${n}`,
        strength: Math.abs(a - b) / (tracker.kind === 'scale' ? 0.8 : Math.max(0.5, Math.abs(b) * 0.3)),
      });
    }
  }
  return { logged: days.length, clues: clues.sort((x, y) => y.strength - x.strength) };
}
