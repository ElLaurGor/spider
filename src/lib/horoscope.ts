// step 10: Spindelhoroskopet, a parody horoscope on HQ on Mondays, built only from real facts about the week ahead:
// the calendar (meetings running late, long meeting days, a meeting in gym time), the forecast (rain at gym time, the
// week's best weather), the Swedish calendar (fika days, payday, red days, Hesa Fredrik's test, people days she turned
// on) and the week's boss with the day its weakness is easiest to hit. The stars pick the hardest day and the kindest
// one; the words come from line pools (lines.ts horoscope*), whose mild lists are kind, so a kind day stays kind.
// Never about the body, food, mood or sleep (fika days are dates in the almanac, nothing more). Pure: tested offline.
import { isBirthday, birthdayOf } from './birthday';
import { addDays, dayKey, MIN, startOfWeek, WEEKDAYS_LONG } from './dates';
import { fikaOn } from './fika';
import { rainAtGym } from './if-then';
import type { LineKey } from './lines';
import { pausedOn } from './pause';
import { nextPeopleDay, nextPersonDay, PEOPLE_DAYS, personTitle, swedenOf } from './people-days';
import { gymTimeOn } from './plan-slots';
import { bossFor } from './quests';
import { clashOn } from './review';
import { eventsOn, workoutFor } from './selectors';
import { holidayOn, isPayday, sirenTests } from './swedish-days';
import type { CalEvent, State } from './types';
import { describe, weatherKey, type Weather } from './weather';

/** A meeting ending at this hour or later runs late (woop.ts uses the same). */
export const LATE_HOUR = 17;
/** Minutes of meetings that make a long day. */
export const LONG_DAY_MIN = 240;

export type Reading = { day: string | null; line: LineKey; vars: Record<string, string> };
export type Horoscope = { week: string; sign: { name: string; emoji: string } | null; readings: Reading[] };

/** What the stars know about one day of the week. */
export type DayFacts = {
  day: string;
  late: number;
  meetingMin: number;
  gym: string | null;
  rainGym: boolean;
  clash: boolean;
  siren: boolean;
  fika: string | null;
  payday: boolean;
  holiday: string | null;
  people: string[];
  birthday: boolean;
  nameDay: boolean;
  best: string | null; // the week's best weather, on that one day: "sunny, 14°"
  warmest: boolean;
};

const noon = (key: string) => new Date(`${key}T12:00`);
export const weekdayOf = (key: string) => WEEKDAYS_LONG[noon(key).getDay()];

/** HQ's key for the card (State.dismissed): closed with ×, it stays closed for that week. */
export const horoscopeKey = (week: string) => `horoscope:${week}`;

/** Mondays only, once she's set up, not on a paused day, and not after it was closed for the week. */
export function horoscopeDue(s: State, today: string): boolean {
  if (!s.onboarded || noon(today).getDay() !== 1 || pausedOn(s, today)) return false;
  return !(s.dismissed ?? []).includes(horoscopeKey(today));
}

const SIGNS: { name: string; emoji: string; from: string }[] = [
  { name: 'Capricorn', emoji: '♑', from: '01-01' },
  { name: 'Aquarius', emoji: '♒', from: '01-20' },
  { name: 'Pisces', emoji: '♓', from: '02-19' },
  { name: 'Aries', emoji: '♈', from: '03-21' },
  { name: 'Taurus', emoji: '♉', from: '04-20' },
  { name: 'Gemini', emoji: '♊', from: '05-21' },
  { name: 'Cancer', emoji: '♋', from: '06-21' },
  { name: 'Leo', emoji: '♌', from: '07-23' },
  { name: 'Virgo', emoji: '♍', from: '08-23' },
  { name: 'Libra', emoji: '♎', from: '09-23' },
  { name: 'Scorpio', emoji: '♏', from: '10-23' },
  { name: 'Sagittarius', emoji: '♐', from: '11-22' },
  { name: 'Capricorn', emoji: '♑', from: '12-22' },
];

/** Her sun sign from her birthday ('MM-DD'), or null without one. */
export function signOf(md: string | null): { name: string; emoji: string } | null {
  if (!md) return null;
  const sign = [...SIGNS].reverse().find((x) => md >= x.from)!;
  return { name: sign.name, emoji: sign.emoji };
}

/** People days she turned on that fall on `day` (built-in ones and the people she added). */
function peopleOn(s: State, day: string, today: string): string[] {
  const prefs = swedenOf(s);
  const out: string[] = [];
  for (const def of PEOPLE_DAYS) if (prefs.days?.[def.id] && dayKey(nextPeopleDay(def, today)) === day) out.push(def.name);
  for (const p of prefs.people ?? []) if (dayKey(nextPersonDay(p, today)) === day) out.push(personTitle(p));
  return out;
}

/**
 * The facts for each day from `today` to Sunday (paused days left out: away is away). `ownNameDay`: her name day
 * ('MM-DD') when the almanac knows it.
 */
export function weekFacts(s: State, o: { today: string; events: CalEvent[]; weather: Weather | null; ownNameDay?: string | null }): DayFacts[] {
  const monday = startOfWeek(noon(o.today));
  const days = Array.from({ length: 7 }, (_, i) => dayKey(addDays(monday, i))).filter((k) => k >= o.today && !pausedOn(s, k));
  const sweden = s.settings.sweden ?? {};
  const forecast = (o.weather?.days ?? []).filter((f) => days.includes(f.date));
  const nice = forecast.filter((f) => weatherKey(f) === 'weatherNice' || weatherKey(f) === 'weatherHot').sort((a, b) => b.sunshineMin - a.sunshineMin || b.max - a.max)[0];
  const warm = [...forecast].sort((a, b) => b.max - a.max)[0];
  return days.map((day) => {
    const date = noon(day);
    const timed = eventsOn(o.events, date).filter((e) => !e.allDay);
    const from = new Date(`${day}T00:00`).getTime();
    const to = addDays(new Date(`${day}T00:00`), 1).getTime();
    const plan = workoutFor(s, date);
    const g = gymTimeOn(s, day);
    const holiday = holidayOn(date);
    return {
      day,
      late: timed.filter((e) => dayKey(e.end) === day && new Date(e.end).getHours() >= LATE_HOUR).length,
      meetingMin: Math.round(timed.reduce((a, e) => a + Math.max(0, Math.min(e.end, to) - Math.max(e.start, from)), 0) / MIN),
      gym: plan?.name ?? null,
      rainGym: !!plan && rainAtGym(o.weather, date, g.hour, g.minute),
      clash: !!clashOn(s, o.events, day),
      siren: sweden.siren !== false && sirenTests(date.getFullYear()).some((t) => dayKey(t) === day),
      fika: sweden.fika === false ? null : (fikaOn(day)?.name ?? null),
      payday: isPayday(date),
      holiday: holiday ? holiday.name : null,
      people: peopleOn(s, day, o.today),
      birthday: isBirthday(s, day),
      nameDay: !!o.ownNameDay && day.slice(5) === o.ownNameDay,
      best: nice?.date === day ? `${describe(nice.code).label.toLowerCase()}, ${nice.max}°` : null,
      warmest: !!warm && warm.date === day && warm.max >= 15,
    };
  });
}

/** How heavy a day looks, and why ("3 meetings running past 17:00", "rain at gym time"). */
export function badOf(f: DayFacts): { score: number; why: string[] } {
  const why: string[] = [];
  let score = 0;
  if (f.late) {
    score += Math.min(3, f.late);
    why.push(`${f.late} meeting${f.late === 1 ? '' : 's'} running past ${LATE_HOUR}:00`);
  }
  if (f.meetingMin >= LONG_DAY_MIN) {
    score += 2;
    why.push(`${Math.round(f.meetingMin / 60)} hours of meetings`);
  }
  if (f.clash) {
    score += 1;
    why.push('a meeting in gym time');
  }
  if (f.rainGym) {
    score += 2;
    why.push('rain at gym time');
  }
  if (f.siren) {
    score += 1;
    why.push('Hesa Fredrik screams at 15:00');
  }
  return { score, why };
}

/** How kind a day looks, and why ("Kanelbullens dag", "payday", "the week's best weather (clear sky, 14°)"). */
export function goodOf(f: DayFacts): { score: number; why: string[] } {
  const why: string[] = [];
  let score = 0;
  const add = (n: number, text: string) => {
    score += n;
    why.push(text);
  };
  if (f.birthday) add(3, 'your birthday');
  if (f.nameDay) add(2, 'your name day');
  if (f.holiday) add(2, f.holiday);
  if (f.payday) add(2, 'payday');
  if (f.fika) add(2, f.fika);
  if (f.best) add(2, `the week's best weather (${f.best})`);
  return { score, why };
}

/** "a, b and c". */
export const listText = (xs: string[]) => (xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/**
 * The day the week's boss is easiest to hit: a gym day without rain or a clash for the training bosses (else the
 * best weather), the warmest day for Captain Dehydration, the busiest day for the Binge Necromancer (no time to
 * binge), and the lightest workday for the rest.
 */
export function bossDayOf(id: string, facts: DayFacts[]): string | null {
  if (!facts.length) return null;
  const work = facts.filter((f) => noon(f.day).getDay() % 6 !== 0 && !f.holiday);
  const light = [...(work.length ? work : facts)].sort((a, b) => a.meetingMin - b.meetingMin)[0].day;
  if (id === 'leg_day' || id === 'couch_goblin') {
    return facts.find((f) => f.gym && !f.rainGym && !f.clash)?.day ?? facts.find((f) => f.gym)?.day ?? facts.find((f) => f.best)?.day ?? light;
  }
  if (id === 'dehydration') return facts.find((f) => f.warmest)?.day ?? light;
  if (id === 'binge') {
    const busy = [...facts].sort((a, b) => b.meetingMin - a.meetingMin)[0];
    return busy.meetingMin > 0 ? busy.day : light;
  }
  return light;
}

/**
 * Monday's horoscope: the intro, the week's heaviest day (2+ points of trouble), its kindest other day (2+ points of
 * luck), the boss and its day, and the first people day. A week with neither a heavy nor a kind day gets the quiet
 * line. `today` is the Monday it's read on.
 */
export function horoscopeFor(s: State, o: { today: string; events: CalEvent[]; weather: Weather | null; ownNameDay?: string | null; now?: Date }): Horoscope {
  const facts = weekFacts(s, o);
  const sign = signOf(birthdayOf(s));
  const readings: Reading[] = [{ day: null, line: 'horoscopeIntro', vars: { title: sign ? `${sign.emoji} ${sign.name}` : 'spiders' } }];
  const best = <T extends { score: number }>(xs: (T & { f: DayFacts })[]) => xs.filter((x) => x.score >= 2).sort((a, b) => b.score - a.score || (a.f.day < b.f.day ? -1 : 1))[0] ?? null;
  const bad = best(facts.map((f) => ({ f, ...badOf(f) })));
  const good = best(facts.filter((f) => f.day !== bad?.f.day).map((f) => ({ f, ...goodOf(f) })));
  const boss = bossFor(s, noon(o.today), o.now ?? noon(o.today));
  const bossDay = boss.defeated ? null : bossDayOf(boss.id, facts);
  if (bad) readings.push({ day: bad.f.day, line: 'horoscopeBad', vars: { day: weekdayOf(bad.f.day), summary: listText(bad.why) } });
  if (good) {
    const why = good.f.day === bossDay ? [...good.why, 'the boss is weak'] : good.why;
    readings.push({ day: good.f.day, line: 'horoscopeGood', vars: { day: weekdayOf(good.f.day), summary: listText(why) } });
  }
  if (!bad && !good) readings.push({ day: null, line: 'horoscopeQuiet', vars: {} });
  if (bossDay && bossDay !== good?.f.day) readings.push({ day: bossDay, line: 'horoscopeBoss', vars: { boss: boss.name, day: weekdayOf(bossDay), weakness: boss.weakness } });
  const people = facts.find((f) => f.people.length);
  if (people) readings.push({ day: people.day, line: 'horoscopePeople', vars: { title: listText(people.people), day: weekdayOf(people.day) } });
  return { week: dayKey(startOfWeek(noon(o.today))), sign, readings };
}
