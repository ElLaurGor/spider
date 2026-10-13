// The Swedish year's games (seasons.ts): the Easter egg hunt and the Valborg bonfire for old tasks.
import { dayKey } from './dates';
import type { State } from './types';

/** One egg per tab. Each shows up only during Easter season until it's found that year. */
export const EGGS = ['hq', 'plan', 'gym', 'fuel', 'game'] as const;
export type EggId = (typeof EGGS)[number];
export const EGG_COINS = 30;

const yearOf = (date: Date | number) => String(new Date(date).getFullYear());

export const eggsThisYear = (s: State, date: Date | number = new Date()) => s.eggsFound?.[yearOf(date)] ?? {};
export const eggsLeft = (s: State, date: Date | number = new Date()) => EGGS.filter((id) => !(id in eggsThisYear(s, date))).length;
export const eggsFoundOn = (s: State, date: Date | number = new Date()) =>
  Object.values(eggsThisYear(s, date)).filter((at) => dayKey(at) === dayKey(date)).length;
/** True once every egg of some year has been found (the Egg Hunter secret). */
export const allEggsSomeYear = (s: State) => Object.values(s.eggsFound ?? {}).some((found) => EGGS.every((id) => id in found));

/** Open tasks older than this go on the Valborg bonfire. */
export const STALE_DAYS = 30;
export const BURN_XP = 2; // per burned task
export const BURN_XP_MAX = 10;

export const staleTasks = (s: State, now: number = Date.now()) => s.tasks.filter((t) => !t.done && now - t.createdAt > STALE_DAYS * 86_400_000);

/** Old tasks finished on a day: they count toward the bonfire quest like burned ones. */
export const oldTasksDoneOn = (s: State, date: Date | number) =>
  s.tasks.filter((t) => t.done && t.doneAt && dayKey(t.doneAt) === dayKey(date) && t.doneAt - t.createdAt > STALE_DAYS * 86_400_000).length;
