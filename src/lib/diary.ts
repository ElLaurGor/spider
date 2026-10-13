// S.P.I.D.E.R.'s secret observation log. A page unlocks for every 10 quests completed (a total,
// never days in a row). Each page is written once, from one of the last 7 days, and kept.
// It never mentions food, kcal, the body or weight. Low-mood and period days get kind pages.
import { addDays, dayKey, fmtDuration, MIN } from './dates';
import { habitsDone } from './habits';
import { dayOf, gamingBudgetMin, gamingUsedMs, moodsOf, onPeriod, trainMinutes, trainedOn, waterMl } from './selectors';
import type { DayLog, DiaryPage, State } from './types';

export const QUESTS_PER_PAGE = 10;

/** Quests needed for the next page, and how many pages should be unlocked by now. */
export const nextPageAt = (s: State) => QUESTS_PER_PAGE * ((s.diary?.length ?? 0) + 1);
export const pageDue = (s: State) => s.onboarded && s.counters.quests >= nextPageAt(s);

const hash = (str: string) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
};
const pick = <T,>(list: T[], seed: string) => list[hash(seed) % list.length];

type Fact = { id: string; text: string };

const liters = (ml: number) => (ml / 1000).toFixed(1).replace(/\.0$/, '');

/** What happened that day, as sentences. `kind` keeps it gentle (no roasting at all). */
function factsOf(s: State, key: string, d: DayLog, kind: boolean, seed: string): Fact[] {
  const out: Fact[] = [];
  const say = (id: string, savage: string[], gentle: string[]) => out.push({ id, text: pick(kind ? gentle : savage, `${seed}:${id}`) });

  const ml = waterMl(d);
  if (ml > 0) {
    const goal = ml >= s.settings.waterGoalMl;
    say(
      'water',
      goal
        ? [`The human drank ${liters(ml)} L of water. For a carbon-based unit, that is a personal best.`, `${liters(ml)} L of water consumed. The houseplants are jealous.`]
        : [`Water intake: ${liters(ml)} L. The houseplants have started a petition.`, `${liters(ml)} L of water. A cactus would call that a dry spell.`],
      [`She drank ${liters(ml)} L of water. Small sips count too.`],
    );
  }
  if (d.steps != null && d.steps > 0) {
    const steps = d.steps.toLocaleString('sv-SE');
    say(
      'steps',
      d.steps >= s.settings.stepGoal
        ? [`${steps} steps recorded. She moves. Voluntarily.`, `${steps} steps. I suspect she is training for something. Or fleeing.`]
        : [`${steps} steps. The couch logged heavy usage.`, `Only ${steps} steps. The floor barely noticed her.`],
      [`${steps} steps today. Moving at her own pace.`],
    );
  }
  if (trainedOn(d)) {
    const min = trainMinutes(d);
    say(
      'train',
      d.sets.length
        ? [`She lifted heavy objects ${d.sets.length} times. On purpose. I checked.`, `${d.sets.length} sets logged. The barbell has filed a complaint.`]
        : [`${min} minutes of training. Nobody forced her. I would know.`],
      [`She trained today. ${d.sets.length ? `${d.sets.length} sets` : `${min} minutes`}, logged with care.`],
    );
  }
  const tasks = s.tasks.filter((t) => t.done && t.doneAt && dayKey(t.doneAt) === key).length;
  if (tasks > 0) {
    say(
      'tasks',
      [`${tasks} task${tasks === 1 ? '' : 's'} completed. The to-do list is nervous.`, `${tasks} task${tasks === 1 ? '' : 's'} eliminated. I have upgraded her threat level.`],
      [`${tasks} task${tasks === 1 ? '' : 's'} done. Each one counts.`],
    );
  }
  const focus = (d.focus ?? []).filter((f) => !f.snapped).reduce((a, f) => a + f.minutes, 0);
  if (focus > 0) {
    say('focus', [`${focus} minutes of Web Focus. Not one app opened. Suspicious.`], [`${focus} quiet minutes of focus.`]);
  }
  const usedMs = gamingUsedMs({ ...s, activeGame: null }, key);
  const budgetMs = gamingBudgetMin(s, key) * MIN;
  if (usedMs > 0 && !kind) {
    say(
      'gaming',
      usedMs > budgetMs
        ? [`Gaming ran ${fmtDuration(usedMs - budgetMs)} past the budget. I have filed a report.`, `The gaming budget was exceeded by ${fmtDuration(usedMs - budgetMs)}. The controller looked guilty.`]
        : [`Gaming stayed inside the budget. I am confused and slightly proud.`],
      [],
    );
  }
  if (d.sleepMin != null && d.sleepMin > 0) {
    const sleep = fmtDuration(d.sleepMin * MIN);
    say(
      'sleep',
      d.sleepMin < 6 * 60
        ? [`${sleep} of sleep. The human runs on spite.`, `Sleep: ${sleep}. Powered by stubbornness.`]
        : d.sleepMin >= 8 * 60
          ? [`${sleep} of sleep. Fully recharged. Dangerous.`]
          : [`${sleep} of sleep. Adequate. I will allow it.`],
      [`She slept ${sleep}. Rest is part of the work.`],
    );
  }
  const habits = habitsDone(s, key).length;
  if (habits > 0) {
    say('habits', [`${habits} habit${habits === 1 ? '' : 's'} checked off. Routine detected.`], [`${habits} habit${habits === 1 ? '' : 's'} kept. Steady.`]);
  }
  if (d.questsAllDone) say('quests', ['Every quest cleared. I am updating my threat assessment.'], ['Every quest done, even on a slow day.']);
  if (!kind && moodsOf(d).some((m) => m.level >= 4)) say('mood', ['She reported feeling good. I logged it as an anomaly.'], []);
  return out;
}

const OPENERS = ['Observation log, day {day}.', 'Field notes, day {day}.', 'Classified. Day {day}.'];
const CLOSERS = [
  'Conclusion: she is planning something.',
  'Further observation required.',
  'End of log. Do not tell her I keep this.',
  'I suspect she knows I am watching. Good.',
  'Note to self: increase surveillance.',
];
const KIND_OPENERS = ['Observation log, day {day}. A quieter day.', 'Field notes, day {day}. She was running low.'];
const KIND_CLOSERS = ['I turned my sarcasm module down and kept watch.', 'Conclusion: she is doing more than she thinks.', 'Rest logged. That counts too.'];

/** Day number since the first day S.P.I.D.E.R. has data for. */
export function dayNumber(s: State, key: string) {
  const first = Object.keys(s.days).sort()[0] ?? key;
  return Math.round((new Date(`${key}T12:00`).getTime() - new Date(`${first}T12:00`).getTime()) / 86_400_000) + 1;
}

/** A gentle page: the day's latest mood was low, or it was a period day. */
export const kindDay = (d: DayLog) => (moodsOf(d).at(-1)?.level ?? 5) <= 2 || onPeriod(d);

/** Writes page `n` from the busiest of the last 7 days (today if nothing else has data). */
export function writePage(s: State, n: number, now = new Date()): DiaryPage {
  const keys = Array.from({ length: 7 }, (_, i) => dayKey(addDays(now, -(i + 1))));
  const scored = keys.map((key) => ({ key, facts: factsOf(s, key, dayOf(s, key), kindDay(dayOf(s, key)), `${n}:${key}`).length }));
  const best = scored.reduce((a, b) => (b.facts > a.facts ? b : a), { key: dayKey(now), facts: 0 });
  const key = best.facts > 0 ? best.key : dayKey(now);
  const d = dayOf(s, key);
  const kind = kindDay(d);
  const seed = `${n}:${key}`;
  const facts = factsOf(s, key, d, kind, seed);
  // Up to three facts, in a stable shuffled order.
  const chosen = facts
    .map((f) => ({ f, r: hash(`${seed}:${f.id}`) }))
    .sort((a, b) => a.r - b.r)
    .slice(0, 3)
    .map((x) => x.f.text);
  const opener = pick(kind ? KIND_OPENERS : OPENERS, `${seed}:open`).replace('{day}', String(dayNumber(s, key)));
  const closer = pick(kind ? KIND_CLOSERS : CLOSERS, `${seed}:close`);
  const body = chosen.length ? chosen.join(' ') : 'Nothing logged. The human went dark. I waited.';
  return { n, at: now.getTime(), day: key, text: `${opener} ${body} ${closer}` };
}

/** Adds every page that's due (a few at most at once, for saves from before the diary existed). */
export function unlockPages(s: State, now = new Date()): { state: State; added: number } {
  let next = s;
  let added = 0;
  while (pageDue(next) && added < 3) {
    const n = (next.diary?.length ?? 0) + 1;
    next = { ...next, diary: [...(next.diary ?? []), writePage(next, n, now)] };
    added++;
  }
  return { state: next, added };
}
