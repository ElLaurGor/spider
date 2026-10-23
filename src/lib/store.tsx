import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { router, type Href } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Updates from 'expo-updates';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { autoBackup, createBackup, keepCopy, pickAutoBackupFolder, readBackup } from './backup';
import { DUAL_WRITE_LIMIT, olderCopy, readSaved, ReadError, rowsFor, utf8Bytes, V1_KEY, wouldWipe, writeVerified } from './persist';
import { autoBackupDue } from './backup-due';
import { THEMES } from '@/constants/theme';

import { activityInfo } from './body';
import { calendarPermission, calendarSupported, loadCalendars, loadEvents } from './calendar';
import { bankFor, coinsFor, PITY_AFTER, rollChest, shopPrice, SHOP_ITEMS, type ShopItemId } from './economy';
import { stageFor, themesUnlockedBetween } from './evolution';
import { addDays, dayKey, fmtDuration, isDayKey, MIN, startOfDay, uid, WEEKDAYS_LONG } from './dates';
import { defaultState, hydrate } from './defaults';
import { connectHealth, healthStatus, healthSupported, readHealth, type HealthData, type HealthStatus } from './health';
import { habitsDone, habitsFor } from './habits';
import { newLeague, settle, TIERS, weekKeyOf } from './league';
import { fillLine, freshLine, GOLDEN, GOLDEN_CHANCE, poolFor, type LineKey } from './lines';
import { IMMORTAL_DAYS, taskAgeDays, tomorrowKey } from './memory';
import { moodInfo } from './mood';
import {
  cancelEverything,
  cancelGameAlerts,
  cancelFocusDone,
  cancelRestDone,
  initNotifications,
  notifyNow,
  replanNotifications,
  scheduleGameAlerts,
  onNotificationTap,
  scheduleFocusDone,
  scheduleRestDone,
  snoozeWater,
} from './notifications';
import { deleteAllPhotos, deletePhoto, getPhoto, type PhotoSource } from './photos';
import { bossFor, finalBossDue, gentleQuestFor, MINION_COINS, pickQuestsWithFocus, QUEST_REROLL_COST, questsFor, reducedDay, rerollFor, weekKey } from './quests';
import { endPause as pauseEnded, pauseOn, startPause as pauseStarted } from './pause';
import { canSign, contractProgress, difficultyOk, goalOf, payoutOf, roughWeek, targetFor, type Difficulty } from './contracts';
import { respectFor } from './respect';
import { rivalTalk } from './rival-talk';
import { withNights } from './sleep';
import { isSnow, seasonOn, winterOf } from './seasons';
import { catchFly as catchPendingFly, caughtCount, FLIES, rollCritters } from './critters';
import { unlockPages } from './diary';
import { focusBreaker, hasUsageAccess, isDoomscroll, screenTimeSupported, spansBetween, startFocusGuard, stopFocusGuard, unlocksBetween, usageBetween } from './screentime';
import { nightPhone, nightWindow } from './night';
import { BURN_XP, BURN_XP_MAX, EGG_COINS, eggsLeft, eggsThisYear, staleTasks, type EggId } from './traditions';
import {
  activitiesOf,
  caffeineMg,
  coffeeOf,
  dayOf,
  effectiveSavage,
  gamePenalty,
  gamingBudgetMin,
  gamingUsedMs,
  moodsOf,
  proteinOf,
  syncedSleep,
  waterGoalFor,
  waterMl,
  withPastHealth,
} from './selectors';
import type {
  ActivityKind,
  BodyEntry,
  CalEvent,
  CalInfo,
  CalStatus,
  ContractGoal,
  DayLog,
  Experiment,
  ExperimentMetric,
  Habit,
  MoodLevel,
  PeriodLog,
  Tracker,
  Rating,
  Reward,
  ScreenDay,
  Settings,
  State,
  Weekday,
  WorkoutDay,
} from './types';
import { dayWeatherOf, fetchWeather, fetchWeatherHistory, weatherMissing, withCounty, type Weather } from './weather';
import { activeExperiment, EXPERIMENT_DAYS, experimentDays, experimentResult } from './experiments';
import { activeAlerts, ALERT_LABEL, fetchAir, fetchSmhi, fetchVma, sourceAfter, triageAlerts, warningsOf, type Air, type Alert, type SourceStatus } from './outside';
import { ACHIEVEMENTS, activityXp, BONUS_MIN, focusXp, levelForXp, SECRET_ACHIEVEMENTS, SECRET_COINS, titleFor, XP } from './xp';
// cluster B: economy & progression
import { buyable, cosmeticOf, legendaryDrop, owns, withOwned, withTitle, withWorn, type Slot } from './cosmetics';
import { goldChest } from './loot';
import { bankRate, chestLuck, contractBonus, focusBonusMin, hasPerk, perkBlocker, perkOf, RESPEC_COST, workoutBonusMin, type PerkId } from './perks';
import { restedAfter, restedGain, restedSplit } from './rested';

export type Tone = 'info' | 'good' | 'bad' | 'epic';
/** A button on a toast (cluster G: "Catch it!" on a fly). */
export type ToastAction = 'catchFly';
export type Toast = { id: number; text: string; tone: Tone; action?: ToastAction };
type Msg = { text: string; tone: Tone; action?: ToastAction };

// ---------- pure state helpers ----------

const L = (s: State, key: LineKey, vars: Record<string, string | number> = {}) =>
  freshLine(key, effectiveSavage(s), { name: s.settings.userName || 'boss', ...vars });

const patchDay = (s: State, key: string, fn: (d: DayLog) => DayLog): State => ({
  ...s,
  days: { ...s.days, [key]: fn(dayOf(s, key)) },
});

/** A past day's key, or null for today. Back-dated entries earn no XP (and remove none); goal rewards stay today's. */
const pastKey = (key?: string) => (isDayKey(key) && key !== dayKey() ? key : null);

/** Now's clock time on another day: where entries added to a past day land. */
const nowOn = (key: string) => {
  const d = new Date(`${key}T12:00`);
  const now = new Date();
  d.setHours(now.getHours(), now.getMinutes(), 0, 0);
  return d.getTime();
};

const dayName = (key: string) => (key === dayKey(addDays(new Date(), -1)) ? 'yesterday' : WEEKDAYS_LONG[new Date(`${key}T12:00`).getDay()]);
const backdated = (key: string, what: string): Msg => ({ text: `${what} added to ${dayName(key)}. Back-dated, so no XP.`, tone: 'info' });

const bump = (s: State, counter: keyof State['counters'], by = 1): State => ({
  ...s,
  counters: { ...s.counters, [counter]: Math.max(0, s.counters[counter] + by) },
});

function reward(s: State, msgs: Msg[], rawXp: number, bonusMin = 0): State {
  const before = levelForXp(s.xp);
  const base = rawXp > 0 && s.doubleXpUntil && Date.now() < s.doubleXpUntil ? rawXp * 2 : rawXp;
  const rested = restedSplit(s.rested ?? 0, rawXp); // back from a break: +50 % until the pool is used up
  const xp = base + rested.extra;
  const coins = coinsFor(xp);
  let next: State = { ...s, xp: Math.max(0, s.xp + xp), coins: s.coins + coins, coinsEarned: s.coinsEarned + coins };
  if (rested.extra) next = { ...next, rested: rested.left };
  next = patchDay(next, dayKey(), (d) => ({ ...d, xpEarned: Math.max(0, (d.xpEarned ?? 0) + xp) }));
  if (bonusMin) next = patchDay(next, dayKey(), (d) => ({ ...d, bonusGameMin: Math.max(0, d.bonusGameMin + bonusMin) }));
  const after = levelForXp(next.xp);
  if (after > before) {
    msgs.push({ text: L(next, 'levelUp', { level: after, title: titleFor(after) }), tone: 'epic' });
    const stage = stageFor(after);
    if (stage !== stageFor(before)) msgs.push({ text: `🧬 Your spider evolved: ${stage.name}${stage.badge ? ` ${stage.badge}` : ''}!`, tone: 'epic' });
    for (const id of themesUnlockedBetween(before, after)) {
      msgs.push({ text: `🎨 New theme unlocked: ${THEMES[id].name}. Settings → Themes.`, tone: 'epic' });
    }
  }
  return next;
}

/**
 * After a finished session on day `key` was edited or deleted: charges the extra over-budget XP, or
 * gives back what no longer applies. Refunds skip `reward()`: penalties never took coins or boss damage.
 */
function regradeGaming(prev: State, next: State, key: string, msgs: Msg[], plain: string): State {
  // The running session pays its own penalty when it stops.
  const over = (x: State) => Math.max(0, gamingUsedMs({ ...x, activeGame: null }, key) - gamingBudgetMin(x, key) * MIN);
  const diff = gamePenalty(over(next)) - gamePenalty(over(prev));
  if (diff > 0) {
    msgs.push({ text: L(next, 'gameEditOver', { over: fmtDuration(over(next)), penalty: diff }), tone: 'bad' });
    return reward(next, msgs, -diff);
  }
  if (diff < 0) {
    msgs.push({ text: L(next, 'gameEditRefund', { xp: -diff }), tone: 'info' });
    return { ...next, xp: next.xp - diff };
  }
  msgs.push({ text: plain, tone: 'info' });
  return next;
}

/** Edits to today's sessions move the alerts of a session that's running now. */
function rescheduleGameAlerts(s: State, key: string) {
  if (s.activeGame && dayKey(s.activeGame.start) === key) void scheduleGameAlerts(s, gamingBudgetMin(s, key) - gamingUsedMs(s, key) / MIN);
}

/** Starts the league, and settles last week's (promotion, demotion, prize) when a new week begins. */
function checkLeague(s: State, msgs: Msg[]): State {
  if (!s.onboarded) return s;
  const week = weekKeyOf();
  if (!s.league) return { ...s, league: newLeague(0, week) };
  if (s.league.week === week) return s;
  const r = settle(s);
  const old = s.league;
  const tier = TIERS[r.tier];
  const vars = { tier: `${tier.emoji} ${tier.name}`, rank: r.rank };
  const key = r.tier > old.tier ? 'leaguePromoted' : r.tier < old.tier ? 'leagueDemoted' : 'leagueStayed';
  msgs.push({ text: L(s, key, vars) + (r.prize ? ` +${r.prize} 🪙` : ''), tone: r.tier > old.tier ? 'epic' : r.tier < old.tier ? 'bad' : 'info' });
  const history = [...old.history, { week: old.week, tier: old.tier, rank: r.rank, xp: r.xp }].slice(-26);
  return { ...s, league: newLeague(r.tier, week, history), coins: s.coins + r.prize, coinsEarned: s.coinsEarned + r.prize };
}

/** Fixes today's quests, completes any that are done, and settles the weekly boss. */
function checkQuests(s: State, msgs: Msg[]): State {
  if (!s.onboarded) return s;
  const key = dayKey();
  let next = s;
  if (!dayOf(next, key).quests) {
    const picked = pickQuestsWithFocus(next);
    next = patchDay(next, key, (d) => ({ ...d, quests: picked.ids, questFocus: picked.focus ?? undefined }));
  }
  // A reduced day's gentle quest is fixed the first time the day is reduced, so it can't change under you.
  if (reducedDay(next, key) && !dayOf(next, key).questReduced) {
    const id = gentleQuestFor(next);
    next = patchDay(next, key, (d) => ({ ...d, questReduced: id }));
  }

  for (const q of questsFor(next)) {
    if ((dayOf(next, key).questsDone ?? []).includes(q.id) || q.progress < q.target) continue;
    next = bump(patchDay(next, key, (d) => ({ ...d, questsDone: [...(d.questsDone ?? []), q.id] })), 'quests');
    msgs.push({ text: `🗡️ ${L(next, 'questDone', { quest: q.title, xp: q.xp })}`, tone: 'epic' });
    next = reward(next, msgs, q.xp);
  }

  const d = dayOf(next, key);
  const ids = questsFor(next).map((q) => q.id); // ignores retired quest ids saved earlier
  if (!d.questsAllDone && ids.length > 0 && ids.every((id) => (d.questsDone ?? []).includes(id))) {
    next = patchDay(next, key, (x) => ({ ...x, questsAllDone: true, questsAllDoneAt: Date.now(), chestReady: true }));
    msgs.push({ text: `${L(next, 'questsAllDone')} 🎁 A loot chest is waiting on HQ.`, tone: 'epic' });
    next = reward(next, msgs, XP.questsAll, BONUS_MIN.questsAll);
  }

  // The week after all 8 bosses have fallen, the Lazy Syndicate's ruler shows up instead.
  const week = weekKey();
  if (finalBossDue(next, week) && !next.bossesDefeated[week]) {
    next = { ...next, finalBossWeek: week };
    const king = bossFor(next);
    msgs.push({ text: `${king.emoji} ${L(next, 'finalBossArrives', { boss: king.name })}`, tone: 'epic' });
  }

  const boss = bossFor(next);
  if (!boss.defeated && boss.hp <= 0) {
    next = bump(
      { ...next, bossesDefeated: { ...next.bossesDefeated, [boss.key]: boss.id }, bossKilledAt: { ...next.bossKilledAt, [boss.key]: Date.now() } },
      'bosses',
    );
    const season = seasonOn();
    if (season) next = { ...next, seasonWins: [...(next.seasonWins ?? []), `${season.id}-${new Date().getFullYear()}`] };
    msgs.push({ text: `${boss.emoji} ${L(next, 'bossDefeated', { boss: boss.name })}`, tone: 'epic' });
    next = reward(next, msgs, XP.boss, BONUS_MIN.boss);
    if (boss.final) {
      next = { ...next, syndicateBroken: Date.now(), coins: next.coins + 500, coinsEarned: next.coinsEarned + 500 };
      msgs.push({ text: `👑 ${L(next, 'syndicateBroken', { boss: boss.name })}`, tone: 'epic' });
    }
  } else if (!boss.defeated && boss.rageWeakness && next.bossPhaseSeen !== boss.key) {
    next = { ...next, bossPhaseSeen: boss.key };
    msgs.push({ text: `${boss.emoji} ${L(next, 'bossEnraged', { boss: boss.name, weakness: boss.rageWeakness })}`, tone: 'epic' });
  }

  // Overkill: every wave of henchmen beaten after the boss pays coins (not XP, so levels don't inflate).
  const after = bossFor(next);
  const paid = next.minionsPaid?.[after.key] ?? 0;
  if (after.defeated && after.minions > paid) {
    const coins = (after.minions - paid) * MINION_COINS;
    next = { ...next, coins: next.coins + coins, coinsEarned: next.coinsEarned + coins, minionsPaid: { ...next.minionsPaid, [after.key]: after.minions } };
    msgs.push({ text: `👾 ${L(next, 'minionDown', { n: after.minions, coins })}`, tone: 'good' });
  }
  return next;
}

/** Flies to catch and critical hits on the boss, for whatever was just logged (lib/critters.ts). */
function checkCritters(prev: State, s: State, msgs: Msg[]): State {
  const r = rollCritters(prev, s);
  for (const m of r.msgs) msgs.push({ text: L(r.state, m.key, m.vars), tone: 'epic', action: m.action });
  return r.state;
}

/** A page of S.P.I.D.E.R.'s secret diary for every 10 quests (lib/diary.ts). */
function checkDiary(s: State, msgs: Msg[]): State {
  const r = unlockPages(s);
  if (r.added) msgs.push({ text: L(r.state, 'diaryPage'), tone: 'epic' });
  return r.state;
}

function checkAchievements(s: State, msgs: Msg[]): State {
  let next = s;
  for (const a of ACHIEVEMENTS) {
    if (next.achievements[a.id] || !a.test(next)) continue;
    next = { ...next, achievements: { ...next.achievements, [a.id]: Date.now() } };
    msgs.push({ text: `🏆 ${L(next, 'achievement', { title: a.title })} +${XP.achievement} XP`, tone: 'epic' });
    next = reward(next, msgs, XP.achievement);
  }
  for (const a of SECRET_ACHIEVEMENTS) {
    if (next.secrets[a.id] || !a.test(next)) continue;
    next = { ...next, secrets: { ...next.secrets, [a.id]: Date.now() } };
    msgs.push({ text: `🔓 SECRET ACHIEVEMENT: ${a.title}! ${a.desc}. +${XP.secret} XP +${SECRET_COINS} 🪙`, tone: 'epic' });
    next = reward(next, msgs, XP.secret);
    next = { ...next, coins: next.coins + SECRET_COINS, coinsEarned: next.coinsEarned + SECRET_COINS };
  }
  return next;
}

/** A day's phone use from Android's per-app totals. */
function screenDayOf(apps: Awaited<ReturnType<typeof usageBetween>>): ScreenDay {
  const min = (ms: number) => Math.round(ms / MIN);
  return {
    totalMin: min(apps.reduce((a, x) => a + x.foregroundMs, 0)),
    doomMin: min(apps.filter((x) => isDoomscroll(x.packageName)).reduce((a, x) => a + x.foregroundMs, 0)),
    gamesMin: min(apps.filter((x) => x.isGame).reduce((a, x) => a + x.foregroundMs, 0)),
    top: apps.slice(0, 6).map((x) => ({ label: x.label, min: min(x.foregroundMs), game: x.isGame, doom: isDoomscroll(x.packageName) })),
  };
}

/** Remembers S.P.I.D.E.R.'s respect tier and announces it going up. Drops pass quietly. */
function checkRespect(s: State, msgs: Msg[]): State {
  const r = respectFor(s);
  const tier = r?.tier ?? null;
  if (tier === (s.respectTier ?? null)) return s;
  if (r && s.respectTier != null && r.tier > s.respectTier) {
    msgs.push({ text: `${r.emoji} ${L(s, 'respectUp', { tier: r.name })}`, tone: 'epic' });
  }
  return { ...s, respectTier: tier };
}

/** A league rival reacts when your rank changes (rival-talk.ts: at most two a day). */
function checkRivalTalk(s: State, msgs: Msg[]): State {
  if (!s.onboarded) return s;
  const r = rivalTalk(s);
  if (!r) return s;
  if (r.line) msgs.push(r.line);
  return { ...s, rivalTalk: r.talk };
}

/** Pays out a weekly contract as soon as it's reached, and settles a missed one once its week is over. */
function checkContract(s: State, msgs: Msg[]): State {
  const c = s.contract;
  if (!c || c.status !== 'open') return s;
  const payout = payoutOf(c, contractBonus(s));
  const vars = { goal: goalOf(c.goal).title(c.target), stake: c.stake, coins: payout };
  if (contractProgress(s, c) >= c.target) {
    msgs.push({ text: `📜 ${L(s, 'contractWon', vars)}`, tone: 'epic' });
    return { ...s, contract: { ...c, status: 'won' }, coins: s.coins + payout, coinsEarned: s.coinsEarned + payout - c.stake };
  }
  if (c.week === weekKeyOf()) return s;
  if (roughWeek(s, c)) {
    msgs.push({ text: `📜 ${L(s, 'contractVoided', vars)}`, tone: 'info' });
    return { ...s, contract: { ...c, status: 'voided' }, coins: s.coins + c.stake };
  }
  msgs.push({ text: `📜 ${L(s, 'contractLost', vars)}`, tone: 'bad' });
  return { ...s, contract: { ...c, status: 'lost' } };
}

// ---- cluster B: economy & progression ----

/** Once a day, at the first change: fills the rested pool for missed days and banks unused bonus gaming minutes. */
function checkDayRollover(s: State, msgs: Msg[]): State {
  if (!s.onboarded) return s;
  const today = dayKey();
  if (s.lastRollover === today) return s;
  const now = new Date();
  const yesterday = dayKey(addDays(now, -1));
  const weekAgo = dayKey(addDays(now, -7));
  let next: State = { ...s, lastRollover: today };
  // From the last day the app was opened (which may have stayed empty too), a week back at most.
  const since = s.lastRollover && s.lastRollover < today ? s.lastRollover : yesterday;
  const pool = restedAfter(s.rested ?? 0, restedGain(s, since < weekAgo ? weekAgo : since, yesterday));
  if (pool > (s.rested ?? 0)) {
    next = { ...next, rested: pool };
    msgs.push({ text: `😴 ${L(next, 'restedReady', { xp: pool })}`, tone: 'info' });
  }
  for (const key of [dayKey(addDays(now, -2)), yesterday]) next = bankGaming(next, key, msgs);
  return next;
}

/** Pays coins once for a finished day's unused bonus gaming minutes. */
function bankGaming(s: State, key: string, msgs: Msg[]): State {
  const d = s.days[key];
  if (!d || d.banked != null || d.bonusGameMin <= 0) return s;
  if (s.activeGame && dayKey(s.activeGame.start) === key) return s; // still playing: tomorrow's rollover banks it
  const { rate, cap } = bankRate(s);
  const b = bankFor(d.bonusGameMin, gamingBudgetMin(s, key), gamingUsedMs(s, key) / MIN, rate, cap);
  const next = patchDay(s, key, (x) => ({ ...x, banked: b.coins }));
  if (!b.coins) return next;
  msgs.push({ text: `🏦 ${L(next, 'gamingBanked', { minutes: b.minutes, coins: b.coins })}`, tone: 'good' });
  return { ...next, coins: next.coins + b.coins, coinsEarned: next.coinsEarned + b.coins };
}

/** Coins from an ability. */
function perkCoins(s: State, msgs: Msg[], coins: number, label: string): State {
  msgs.push({ text: `${label}: +${coins} 🪙`, tone: 'good' });
  return { ...s, coins: s.coins + coins, coinsEarned: s.coinsEarned + coins };
}

/** Boss damage from an ability, on this week's boss. */
function perkBomb(s: State, msgs: Msg[], damage: number, label: string): State {
  const week = weekKeyOf();
  msgs.push({ text: `${label}: ${damage} damage to the boss.`, tone: 'good' });
  return { ...s, bossBombs: { ...s.bossBombs, [week]: (s.bossBombs[week] ?? 0) + damage } };
}

/** Anything that got a reaction has a small chance to turn up a golden line for the Roast Book. Not while going easy. */
function checkGolden(s: State, msgs: Msg[]): State {
  if (!msgs.length || effectiveSavage(s) < s.settings.savageLevel || Math.random() >= GOLDEN_CHANCE) return s;
  const found = s.goldenFound ?? {};
  const fresh = GOLDEN.filter((g) => !found[g.id]);
  const g = (fresh.length ? fresh : GOLDEN)[Math.floor(Math.random() * (fresh.length || GOLDEN.length))];
  const text = fillLine(g.text, { name: s.settings.userName || 'boss' });
  msgs.push({ text: `✨ Golden line${fresh.length ? ` (${Object.keys(found).length + 1}/${GOLDEN.length})` : ''}: ${text}`, tone: 'epic' });
  return fresh.length ? { ...s, goldenFound: { ...found, [g.id]: Date.now() } } : s;
}

/** The first training of the day counts as a workout: XP, bonus gaming time, counter. */
function startWorkout(s: State, msgs: Msg[]): State {
  const key = dayKey();
  if (dayOf(s, key).workoutCounted) return s;
  const next = bump(patchDay(s, key, (d) => ({ ...d, workoutCounted: true })), 'workouts');
  msgs.push({ text: L(next, 'gymStarted'), tone: 'epic' });
  return reward(next, msgs, XP.workout, workoutBonusMin(next));
}

function recomputePr(s: State, exercise: string): State {
  const id = exercise.trim().toLowerCase();
  let best: number | undefined;
  for (const d of Object.values(s.days)) {
    for (const x of d.sets) if (x.exercise.trim().toLowerCase() === id) best = Math.max(best ?? 0, x.weight);
  }
  const prs = { ...s.prs };
  if (best === undefined) delete prs[id];
  else prs[id] = best;
  return { ...s, prs };
}

// ---------- persistence bookkeeping ----------

type Disk = {
  /** 'v1' only for a run where moving to v2 failed (it's tried again next launch). */
  mode: 'v1' | 'v2';
  /** The days as last written: v2 rewrites only the months whose days changed since. */
  days: State['days'] | null;
  months: string[];
  migratedAt?: number;
  /** v1 is still written alongside v2, for code that only knows v1 (until the state outgrows DUAL_WRITE_LIMIT). */
  dual: boolean;
  /** Days in the last load or save, for the shrink guard. */
  dayCount: number;
  /** Reset, restore and "start fresh" may shrink the history; the next save clears it. */
  allowShrink: boolean;
  warnedShrink: boolean;
  /** Bytes per stored row, as last read or written. */
  sizes: Record<string, number>;
  savedAt: number | null;
  failures: number;
};
const freshDisk = (): Disk => ({
  mode: 'v2',
  days: null,
  months: [],
  migratedAt: undefined,
  dual: true,
  dayCount: 0,
  allowShrink: false,
  warnedShrink: false,
  sizes: {},
  savedAt: null,
  failures: 0,
});

/** A restored backup: nothing left running from the day it was made. */
const restored = (s: State): State => ({ ...s, onboarded: true, activeGame: null, restEndsAt: null, activeFocus: null, pendingFly: null });

// ---------- context ----------

type Store = ReturnType<typeof useStoreValue>;
const StoreContext = createContext<Store | null>(null);

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}

/** What the recovery screen gets when the saved data couldn't be read. */
export type RecoveryProps = {
  message: string;
  /** The pre-v2 copy (still in storage), with the time it was moved to v2 if known. */
  older: { at: number | null } | null;
  retry: () => Promise<void>;
  /** Picks a backup folder; false if cancelled. */
  restore: () => Promise<boolean>;
  loadOlder: () => Promise<void>;
  startFresh: () => Promise<void>;
};

export function StoreProvider({ children, recovery: Recovery }: { children: ReactNode; recovery: ComponentType<RecoveryProps> }) {
  const value = useStoreValue();
  if (value.recovery) return <Recovery {...value.recovery} />;
  if (!value.ready) return null; // splash screen stays up until data is loaded
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

/** Opens a tapped notification's screen. On a cold start the navigator may still be mounting, so it retries for a few seconds. */
export function openSoon(href: Href, tries = 20) {
  try {
    router.navigate(href);
  } catch {
    if (tries > 0) setTimeout(() => openSoon(href, tries - 1), 150);
  }
}

function haptic(tone: Tone) {
  const p =
    tone === 'epic'
      ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      : tone === 'bad'
        ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
        : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  p.catch(() => {});
}

function useStoreValue() {
  const [state, setState] = useState<State>(defaultState);
  const stateRef = useRef<State>(state);
  const [ready, setReady] = useState(false);
  const [notifReady, setNotifReady] = useState(false);
  const [tick, setTick] = useState(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ----- toasts -----
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);
  const say = useCallback((text: string, tone: Tone = 'info', action?: ToastAction) => {
    haptic(tone);
    toastId.current += 1;
    const id = toastId.current;
    setToasts((q) => [...q.slice(-3), { id, text, tone, action }]);
  }, []);
  const dismissToast = useCallback(() => setToasts((q) => q.slice(1)), []);

  // ----- persistence (layout in persist.ts) -----
  /** Nothing is written until a load succeeded: a failed read must never be saved over. */
  const loaded = useRef(false);
  const [failure, setFailure] = useState<{ message: string; older: RecoveryProps['older'] } | null>(null);
  const disk = useRef<Disk>(freshDisk());
  const saving = useRef<Promise<void>>(Promise.resolve());
  const retrySave = useRef<() => void>(() => {});

  /** Writes the current state once (v2: the base plus the months that changed). Throws on a storage error. */
  const writeOnce = useCallback(async () => {
    const s = stateRef.current;
    const d = disk.current;
    const count = Object.keys(s.days).length;
    if (!d.allowShrink && wouldWipe(d.dayCount, count)) {
      console.warn('[spider] refused a save that would erase most of the history', d.dayCount, '->', count);
      if (!d.warnedShrink) say("💾 I didn't save that: it would have erased most of your history. What's saved is untouched. Restart the app.", 'bad');
      d.warnedShrink = true;
      return;
    }
    if (d.mode === 'v1') {
      const raw = JSON.stringify(s);
      await AsyncStorage.setItem(V1_KEY, raw);
      d.sizes = { [V1_KEY]: utf8Bytes(raw) };
    } else {
      let v1Raw: string | undefined;
      if (d.dual) {
        const raw = JSON.stringify(s);
        if (utf8Bytes(raw) <= DUAL_WRITE_LIMIT) v1Raw = raw;
        else {
          d.dual = false; // too close to the row limit: v2 only from now on (v1 keeps its last copy)
          delete d.sizes[V1_KEY];
        }
      }
      const { pairs, gone, months } = rowsFor(s, d.days, d.months, d.migratedAt, v1Raw);
      await AsyncStorage.multiSet(pairs);
      if (gone.length) await AsyncStorage.multiRemove(gone);
      for (const [k, v] of pairs) d.sizes[k] = utf8Bytes(v);
      for (const k of gone) delete d.sizes[k];
      d.days = s.days;
      d.months = months;
    }
    d.dayCount = count;
    d.allowShrink = false;
    d.savedAt = Date.now();
  }, [say]);

  /** Saves now, after any save still running. Does nothing before a successful load. */
  const saveNow = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (!loaded.current) return Promise.resolve();
    const next = saving.current.then(writeOnce);
    saving.current = next.catch(() => {});
    return next;
  }, [writeOnce]);
  const save = useCallback(() => {
    saveNow().then(
      () => {
        if (!disk.current.failures) return;
        disk.current.failures = 0;
        say('💾 Saving works again. Nothing was lost.', 'good');
      },
      (e) => {
        const d = disk.current;
        d.failures += 1;
        console.warn('[spider] save failed', e);
        if (d.failures === 1) say("💾 Couldn't save just now. I'll keep trying in the background.", 'bad');
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => retrySave.current(), Math.min(60_000, 2_000 * 2 ** (d.failures - 1)));
      },
    );
  }, [saveNow, say]);
  useEffect(() => {
    retrySave.current = save;
  }, [save]);

  const commit = useCallback(
    (next: State) => {
      stateRef.current = next;
      setState(next);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(save, 400);
    },
    [save],
  );

  /** First launch on v2: keep a file copy of the old row, write the months, read them back, then switch. */
  const moveToV2 = useCallback(async (raw: string, s: State) => {
    const d = disk.current;
    const migratedAt = Date.now();
    const v1Raw = utf8Bytes(raw) <= DUAL_WRITE_LIMIT ? raw : undefined;
    const { pairs, months } = rowsFor(s, null, [], migratedAt, v1Raw);
    try {
      try {
        keepCopy('spider-state-v1.json', raw);
      } catch (e) {
        // Only an extra copy: the v1 row itself stays in storage untouched, so the move can go ahead.
        console.warn('[spider] no file copy of the v1 state', e);
      }
      if (!(await writeVerified(AsyncStorage, pairs))) throw new Error('read-back mismatch');
      Object.assign(d, { mode: 'v2', days: s.days, months, migratedAt, dual: v1Raw != null, sizes: Object.fromEntries(pairs.map(([k, v]) => [k, utf8Bytes(v)])) });
    } catch (e) {
      // Stay on v1 for this run (saves keep going there) and try again next launch. Rows half-written
      // here would be read first next time, so they go (never the v1 row itself).
      console.warn('[spider] moving to v2 failed, staying on v1', e);
      await AsyncStorage.multiRemove(pairs.map(([k]) => k).filter((k) => k !== V1_KEY)).catch(() => {});
      Object.assign(d, { mode: 'v1', days: null, months: [], sizes: { [V1_KEY]: utf8Bytes(raw) } });
    }
  }, []);

  /** Reads the saved state. If it's there but can't be read, nothing is loaded and nothing saved: the recovery screen takes over. */
  const load = useCallback(async () => {
    try {
      const got = await readSaved(AsyncStorage);
      let next: State;
      try {
        next = hydrate(got.saved);
      } catch (e) {
        throw new ReadError(got.source === 'v2' ? 'v2' : 'v1', e);
      }
      const d = disk.current;
      Object.assign(d, freshDisk(), { dayCount: Object.keys(next.days).length });
      if (got.source === 'v2') {
        // The days as stored: anything hydrate() changed goes out with the next save.
        Object.assign(d, { days: got.saved.days ?? {}, months: got.index.months, migratedAt: got.index.migratedAt, dual: !!got.index.v1, sizes: got.sizes });
      } else if (got.source === 'v1') {
        if (got.newer) console.warn('[spider] v1 changed since the last v2 save (older code ran): moving it over again');
        await moveToV2(got.raw, next);
      }
      loaded.current = true;
      if (got.source === 'v2' && next.days !== got.saved.days) commit(next);
      else {
        stateRef.current = next;
        setState(next);
      }
      setFailure(null);
      setReady(true);
    } catch (e) {
      console.warn('[spider] load failed, nothing will be saved over it', e);
      const older = e instanceof ReadError && e.stage === 'v2' ? await olderCopy(AsyncStorage) : null;
      setFailure({ message: e instanceof Error ? e.message : String(e), older });
    }
    SplashScreen.hideAsync().catch(() => {});
  }, [commit, moveToV2]);
  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  /** A state picked on the recovery screen replaces whatever couldn't be read, and the app opens. */
  const adopt = useCallback(
    (s: State) => {
      Object.assign(disk.current, freshDisk(), { allowShrink: true });
      loaded.current = true;
      setFailure(null);
      setReady(true);
      commit(s);
    },
    [commit],
  );
  const recovery: RecoveryProps | null = failure && {
    ...failure,
    retry: load,
    async restore() {
      const result = await readBackup();
      if (!result) return false;
      await cancelEverything();
      adopt(restored(result.state));
      return true;
    },
    async loadOlder() {
      const raw = await AsyncStorage.getItem(V1_KEY);
      if (raw == null) throw new Error('The older copy is gone.');
      adopt(hydrate(JSON.parse(raw) as Partial<State>));
    },
    async startFresh() {
      await cancelEverything();
      adopt(defaultState());
    },
  };
  /** For Settings: when the last save landed and how big the stored rows are. */
  const storageInfo = () => {
    const d = disk.current;
    const sizes = Object.values(d.sizes);
    return { savedAt: d.savedAt, bytes: sizes.reduce((a, b) => a + b, 0), largest: Math.max(0, ...sizes), rows: sizes.length, failing: d.failures > 0 };
  };

  /** Apply a change, award achievements, save, and show S.P.I.D.E.R.'s reactions. */
  const run = useCallback(
    (fn: (s: State, msgs: Msg[]) => State) => {
      const prev = stateRef.current;
      const msgs: Msg[] = [];
      const rolled = checkDayRollover(prev, msgs);
      const checked = checkCritters(prev, checkContract(checkQuests(checkLeague(fn(rolled, msgs), msgs), msgs), msgs), msgs);
      const next = checkRivalTalk(checkDiary(checkGolden(checkRespect(checkAchievements(checked, msgs), msgs), msgs), msgs), msgs);
      commit(next);
      msgs.forEach((m) => say(m.text, m.tone, m.action));
      // Earned bonus minutes mid-session move the gaming alerts.
      if (next.activeGame && dayOf(next).bonusGameMin !== dayOf(prev).bonusGameMin) {
        void scheduleGameAlerts(next, gamingBudgetMin(next) - gamingUsedMs(next) / MIN);
      }
      return next;
    },
    [commit, say],
  );

  // ----- calendar -----
  const [calStatus, setCalStatus] = useState<CalStatus>(calendarSupported ? 'unknown' : 'unsupported');
  const [calendars, setCalendars] = useState<CalInfo[]>([]);
  const [events, setEvents] = useState<CalEvent[]>([]);

  const refreshCalendar = useCallback(async (ask = false) => {
    try {
      const status = await calendarPermission(ask);
      setCalStatus(status);
      if (status !== 'granted') return;
      const cals = await loadCalendars();
      setCalendars(cals);
      const ids = stateRef.current.settings.calendarIds;
      const chosen = ids ? cals.filter((c) => ids.includes(c.id)) : cals;
      const start = startOfDay();
      setEvents(await loadEvents(chosen, start, addDays(start, 8)));
    } catch (e) {
      console.warn('[spider] calendar failed', e);
    }
  }, []);

  const calendarIdsKey = (state.settings.calendarIds ?? ['*']).join(',');
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => void refreshCalendar(false), 0);
    return () => clearTimeout(t);
  }, [ready, calendarIdsKey, refreshCalendar]);

  // ----- over-the-air updates: announce a freshly applied version -----
  useEffect(() => {
    if (!ready || !Updates.isEnabled || !Updates.updateId) return;
    const s = stateRef.current;
    if (s.lastUpdateId === Updates.updateId) return;
    if (s.lastUpdateId && s.onboarded && !Updates.isEmbeddedLaunch) say(L(s, 'upgraded'), 'epic');
    commit({ ...s, lastUpdateId: Updates.updateId });
  }, [ready, commit, say]);

  // ----- watch data (Health Connect) -----
  const [healthState, setHealthState] = useState<HealthStatus>(healthSupported ? 'needs-permission' : 'unsupported');
  const [health, setHealth] = useState<HealthData | null>(null);

  /** Applies the watch's numbers: today's (awarding the step goal once), and the final ones for the past week. */
  const applyHealth = useCallback(
    (data: HealthData) => {
      const { steps } = data;
      const s0 = stateRef.current;
      const key = dayKey();
      const today = dayOf(s0, key);
      const sleep = syncedSleep(today, data.sleepMin);
      const past = data.stepsWeek
        .filter((x) => x.key !== key)
        .map((x) => ({ key: x.key, steps: x.steps, sleepMin: data.sleepWeek.find((y) => y.key === x.key)?.sleepMin ?? null }));
      const pastChanged = withPastHealth(s0, past) !== s0 || withNights(s0, data.nights, key) !== s0;
      if (!pastChanged && today.steps === steps && today.sleepMin === sleep && (today.stepGoalHit || steps < s0.settings.stepGoal)) return;
      run((s, msgs) => {
        let next = patchDay(withNights(withPastHealth(s, past), data.nights, key), key, (d) => ({ ...d, steps, sleepMin: sleep }));
        if (!dayOf(s, key).stepGoalHit && steps >= s.settings.stepGoal) {
          next = patchDay(next, key, (d) => ({ ...d, stepGoalHit: true }));
          msgs.push({
            text: `${L(next, 'stepGoal', { steps: steps.toLocaleString('sv-SE') })} +${XP.stepGoal} XP · +${BONUS_MIN.stepGoal} min gaming`,
            tone: 'epic',
          });
          next = reward(next, msgs, XP.stepGoal, BONUS_MIN.stepGoal);
          if (hasPerk(next, 'second_wind')) next = perkBomb(next, msgs, 50, '👣 Second Wind');
        }
        return next;
      });
    },
    [run],
  );

  const refreshHealth = useCallback(
    async (ask = false) => {
      try {
        const status = ask ? await connectHealth() : await healthStatus();
        setHealthState(status);
        if (status !== 'connected') return;
        const data = await readHealth();
        if (!data) return;
        setHealth(data);
        applyHealth(data);
      } catch (e) {
        console.warn('[spider] health failed', e);
      }
    },
    [applyHealth],
  );

  useEffect(() => {
    if (!ready || !state.onboarded) return;
    const first = setTimeout(() => void refreshHealth(false), 0);
    const every = setInterval(() => void refreshHealth(false), 5 * 60_000);
    return () => {
      clearTimeout(first);
      clearInterval(every);
    };
  }, [ready, state.onboarded, refreshHealth]);

  // ----- phone screen time (native module from APK 1.3.0) -----
  const [screenStatus, setScreenStatus] = useState<'unsupported' | 'needs-permission' | 'connected'>(
    screenTimeSupported ? 'needs-permission' : 'unsupported',
  );
  const screenHistoryDone = useRef(false); // past days' final screen time, once per app run
  const refreshScreen = useCallback(async () => {
    if (!screenTimeSupported) return;
    if (!hasUsageAccess()) {
      setScreenStatus('needs-permission');
      return;
    }
    setScreenStatus('connected');
    try {
      const screen = screenDayOf(await usageBetween(startOfDay().getTime(), Date.now()));
      const unlocks = await unlocksBetween(startOfDay().getTime(), Date.now());
      if (unlocks != null) screen.unlocks = unlocks;
      const old = dayOf(stateRef.current).screen;
      if (!old || old.totalMin !== screen.totalMin || old.top.length !== screen.top.length || old.unlocks !== screen.unlocks) {
        run((s) => patchDay(s, dayKey(), (d) => ({ ...d, screen })));
      }
      // Each day's number froze at the last time the app was open; now that those days are over, take the
      // final totals for the past days you used the app (only while Android still has them, so only if higher).
      if (!screenHistoryDone.current) {
        screenHistoryDone.current = true;
        const finals: { key: string; screen: ScreenDay }[] = [];
        for (let i = 1; i <= 6; i++) {
          const start = startOfDay(addDays(new Date(), -i));
          const key = dayKey(start);
          const before = stateRef.current.days[key];
          if (!before) continue;
          const full = screenDayOf(await usageBetween(start.getTime(), addDays(start, 1).getTime()));
          if (full.totalMin > (before.screen?.totalMin ?? 0)) finals.push({ key, screen: full });
        }
        if (finals.length) run((s) => finals.reduce((next, f) => patchDay(next, f.key, (d) => ({ ...d, screen: f.screen })), s));
      }
      // Last night's phone use in bed, read once a day after 05:00 (cluster F).
      const now = new Date();
      if (now.getHours() >= 5 && !dayOf(stateRef.current).night) {
        const { bed, end } = nightWindow(now, stateRef.current.settings.sleepHour);
        const night = nightPhone(await spansBetween(bed, end), bed, end);
        run((s) => patchDay(s, dayKey(), (d) => ({ ...d, night })));
      }
    } catch (e) {
      console.warn('[spider] screen time failed', e);
    }
  }, [run]);
  useEffect(() => {
    if (!ready || !state.onboarded || !screenTimeSupported) return;
    const first = setTimeout(() => void refreshScreen(), 0);
    const every = setInterval(() => void refreshScreen(), 5 * 60_000);
    return () => {
      clearTimeout(first);
      clearInterval(every);
    };
  }, [ready, state.onboarded, refreshScreen]);

  // ----- weather -----
  const [weather, setWeather] = useState<Weather | null>(null);
  const weatherAt = useRef(0);
  const historyDone = useRef(false); // past days' weather filled in once per app run
  const refreshWeather = useCallback(async (force = false) => {
    const place = stateRef.current.settings.weather;
    if (!place) {
      setWeather(null);
      return;
    }
    if (!force && Date.now() - weatherAt.current < 30 * 60_000) return;
    try {
      const w = await fetchWeather(place);
      weatherAt.current = w.fetchedAt;
      setWeather(w);
      // Remember each day's weather for Insights: today from the forecast, then once per run, the past
      // 60 days you used the app (yesterday again too, now that it's measured rather than forecast).
      const key = dayKey();
      const forecast = w.days.find((d) => d.date === key);
      if (forecast && JSON.stringify(dayOf(stateRef.current, key).weather) !== JSON.stringify(dayWeatherOf(forecast))) {
        run((s) => patchDay(s, key, (d) => ({ ...d, weather: dayWeatherOf(forecast) })));
      }
      if (!historyDone.current) {
        historyDone.current = true;
        const since = dayKey(addDays(new Date(), -60));
        const yesterday = dayKey(addDays(new Date(), -1));
        const missing = Object.entries(stateRef.current.days)
          .filter(([k, d]) => k >= since && k < key && (weatherMissing(d.weather) || k === yesterday))
          .map(([k]) => k);
        if (missing.length) {
          const past = await fetchWeatherHistory(place, 60);
          run((s) => missing.reduce((next, k) => (past[k] && next.days[k] ? patchDay(next, k, (d) => ({ ...d, weather: past[k] })) : next), s));
        }
      }
      // The winter's first snow, announced once.
      if ((isSnow(w.code) || isSnow(w.days.find((d) => d.date === dayKey())?.code ?? 0)) && stateRef.current.firstSnow !== winterOf()) {
        run((s, msgs) => {
          msgs.push({ text: L(s, 'firstSnow'), tone: 'info' });
          return { ...s, firstSnow: winterOf() };
        });
      }
    } catch (e) {
      console.warn('[spider] weather failed', e);
    }
  }, [run]);
  const placeKey = state.settings.weather ? `${state.settings.weather.lat},${state.settings.weather.lon}` : '';
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => void refreshWeather(true), 0);
    return () => clearTimeout(t);
  }, [ready, placeKey, refreshWeather]);

  // ----- outside: air quality, pollen, SMHI warnings, VMA -----
  const [air, setAir] = useState<Air | null>(null);
  // The last good list per source. A failed check keeps it and says so, instead of reading as "no warnings".
  const [smhiAlerts, setSmhiAlerts] = useState<Alert[]>([]);
  const [vmaAlerts, setVmaAlerts] = useState<Alert[]>([]);
  const [alertStatus, setAlertStatus] = useState<{ smhi: SourceStatus | null; vma: SourceStatus | null }>({ smhi: null, vma: null });
  const outsideDue = useRef(0); // when the next check may run (sooner after a failure)
  const outsideFails = useRef(0);
  const refreshOutside = useCallback(
    async (force = false) => {
      let place = stateRef.current.settings.weather;
      if (!place) {
        setAir(null);
        setSmhiAlerts([]);
        setVmaAlerts([]);
        setAlertStatus({ smhi: null, vma: null });
        return;
      }
      if (!force && Date.now() < outsideDue.current) return;
      // Just under the 15-minute rhythm, so a tick that lands a few ms early isn't skipped. Set before the
      // fetches so a second call can't overlap this one.
      outsideDue.current = Date.now() + 14 * 60_000;
      let failed = false;
      try {
        if (!place.county) {
          const withC = await withCounty(place);
          if (withC.county) {
            place = withC;
            run((s) => ({ ...s, settings: { ...s.settings, weather: withC } }));
          }
        }
        const county = place.county;
        const [a, smhi, vma] = await Promise.all([
          fetchAir(place).catch(() => null),
          county ? fetchSmhi(county).catch(() => null) : null,
          county ? fetchVma(county, place.name.split(',')[0]).catch(() => null) : null,
        ]);
        if (a) {
          setAir(a);
          const today = a.days.find((d) => d.date === dayKey());
          const stored = dayOf(stateRef.current).air;
          if (today && JSON.stringify(stored) !== JSON.stringify({ aqi: today.aqi, pollen: today.pollen })) {
            run((s) => patchDay(s, dayKey(), (d) => ({ ...d, air: { aqi: today.aqi, pollen: today.pollen } })));
          }
        }
        failed = !a || !county || !smhi || !vma;
        if (county) {
          if (smhi) setSmhiAlerts(smhi);
          if (vma) setVmaAlerts(vma);
          setAlertStatus((st) => ({ smhi: sourceAfter(st.smhi, !!smhi), vma: sourceAfter(st.vma, !!vma) }));
          // New warnings (yellow and up, again when one escalates) and every VMA: notify once, right away.
          // Everything shown is triaged, pings on or off, so turning them back on doesn't replay old ones.
          const shown = [...(vma ?? []), ...(smhi ?? [])];
          const now = Date.now();
          const { fresh, changed } = triageAlerts(shown, stateRef.current.seenAlerts, now);
          const notify = stateRef.current.settings.notify;
          for (const x of fresh) {
            if (!notify[x.source === 'VMA' ? 'vma' : 'smhi']) continue;
            const head = x.source === 'VMA' ? '🚨 VMA' : `⚠️ ${ALERT_LABEL[x.level]}`;
            void notifyNow(x.id, `${head}: ${x.title}`, x.text.slice(0, 200));
            say(`${head}: ${x.title}`, 'bad');
          }
          if (changed) run((s) => ({ ...s, seenAlerts: triageAlerts(shown, s.seenAlerts, now).seen }));
        }
      } catch (e) {
        failed = true;
        console.warn('[spider] outside failed', e);
      }
      if (failed) {
        // Don't sit on a failure for a quarter of an hour: try again in 2, then 5, then every 10 minutes.
        outsideFails.current += 1;
        outsideDue.current = Date.now() + [2, 5, 10][Math.min(outsideFails.current, 3) - 1] * 60_000;
      } else {
        outsideFails.current = 0;
      }
    },
    [run, say],
  );
  useEffect(() => {
    if (!ready || !state.onboarded) return;
    const first = setTimeout(() => void refreshOutside(true), 0);
    // Every minute, but refreshOutside only fetches when it's due (14 min, or sooner after a failure).
    const every = setInterval(() => void refreshOutside(false), 60_000);
    return () => {
      clearTimeout(first);
      clearInterval(every);
    };
  }, [ready, state.onboarded, placeKey, refreshOutside]);
  const shownAlerts = activeAlerts([...vmaAlerts, ...smhiAlerts]);

  // ----- day start: fix today's quests -----
  useEffect(() => {
    if (!ready || !state.onboarded || dayOf(state).quests) return;
    const t = setTimeout(() => run((s) => s), 0);
    return () => clearTimeout(t);
  }, [ready, state, tick, run]);

  // ----- league rivals earn XP through the day, so they can pass you while the app sits open -----
  useEffect(() => {
    if (!ready || !state.onboarded) return;
    const check = () => {
      if (rivalTalk(stateRef.current)) run((s) => s);
    };
    const first = setTimeout(check, 5_000);
    const every = setInterval(check, 5 * 60_000);
    return () => {
      clearTimeout(first);
      clearInterval(every);
    };
  }, [ready, state.onboarded, tick, run]);

  // ----- app foreground / background -----
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') {
        setTick((t) => t + 1);
        void refreshCalendar(false);
        void refreshHealth(false);
        void refreshWeather(false);
        void refreshScreen();
        void refreshOutside(false);
      } else {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        save();
      }
    });
    return () => sub.remove();
  }, [refreshCalendar, refreshHealth, refreshWeather, refreshScreen, refreshOutside, save]);

  // ----- automatic weekly backup (cluster F): off the startup path, at most one try a day -----
  const autoBackupTried = useRef('');
  const runAutoBackup = useCallback(
    async (force = false) => {
      const s = stateRef.current;
      const uri = s.backupFolderUri;
      if (!uri) return;
      if (!force && (autoBackupTried.current === dayKey() || !autoBackupDue(s.lastBackupAt))) return;
      autoBackupTried.current = dayKey();
      try {
        const r = await autoBackup(s, uri);
        commit({ ...stateRef.current, lastBackupAt: Date.now() });
        say(`💾 Weekly backup saved${r.photos ? ` (+${r.photos} new photo${r.photos === 1 ? '' : 's'})` : ''}.`, 'info');
      } catch (e) {
        console.warn('[spider] auto backup failed', e);
        say("💾 The weekly backup couldn't reach its folder. Pick it again in Settings → Backup.", 'bad');
      }
    },
    [commit, say],
  );
  useEffect(() => {
    if (!ready || !state.onboarded || !state.backupFolderUri) return;
    const t = setTimeout(() => void runAutoBackup(), 20_000);
    return () => clearTimeout(t);
  }, [ready, state.onboarded, state.backupFolderUri, tick, runAutoBackup]);

  // ----- notifications -----
  useEffect(() => {
    if (!ready || !state.onboarded) return;
    // Asks only if Android still allows asking (never after a "Don't allow").
    initNotifications(true)
      .then(() => setNotifReady(true))
      .catch((e) => console.warn('[spider] notifications init failed', e));
  }, [ready, state.onboarded]);

  useEffect(() => {
    if (!notifReady || !state.onboarded) return;
    const t = setTimeout(() => void replanNotifications(state, events, weather, air), 1500);
    return () => clearTimeout(t);
  }, [notifReady, state, events, weather, air, tick]);

  // ----- actions -----
  const actions = useMemo(
    () => ({
      completeOnboarding(userName: string, savageLevel: number) {
        run((s) => ({ ...s, onboarded: true, settings: { ...s.settings, userName: userName.trim(), savageLevel } }));
      },

      updateSettings(patch: Partial<Settings>) {
        run((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
      },

      setPlanDay(day: Weekday, workout: WorkoutDay | null) {
        run((s) => ({ ...s, plan: { ...s.plan, [day]: workout } }));
      },

      // --- water ---
      addWater(ml: number, key?: string) {
        const past = pastKey(key);
        if (past) {
          run((s, msgs) => {
            msgs.push(backdated(past, `💧 ${ml} ml`));
            return patchDay(s, past, (d) => ({ ...d, water: [...d.water, { id: uid(), ml, at: nowOn(past), late: true }] }));
          });
          return;
        }
        run((s, msgs) => {
          const key = dayKey();
          let next = patchDay(s, key, (d) => ({ ...d, water: [...d.water, { id: uid(), ml, at: Date.now() }] }));
          const d = dayOf(next, key);
          const total = waterMl(d);
          const goal = waterGoalFor(next, key);
          if (!d.waterGoalHit && total >= goal) {
            next = patchDay(next, key, (x) => ({ ...x, waterGoalHit: true }));
            msgs.push({
              text: `${L(next, 'waterGoal')} +${XP.waterGoal} XP · +${BONUS_MIN.waterGoal} min gaming`,
              tone: 'epic',
            });
            next = reward(next, msgs, XP.water + XP.waterGoal, BONUS_MIN.waterGoal);
            return hasPerk(next, 'hydro_glands') ? perkCoins(next, msgs, 25, '💧 Hydro Glands') : next;
          }
          msgs.push({ text: L(next, 'waterLogged', { ml, left: Math.max(0, goal - total) }), tone: 'good' });
          return reward(next, msgs, XP.water);
        });
      },

      undoWater(key?: string) {
        const past = pastKey(key);
        if (past) {
          run((s) => patchDay(s, past, (d) => ({ ...d, water: d.water.slice(0, -1) })));
          return;
        }
        run((s, msgs) => {
          const d = dayOf(s);
          if (d.water.length === 0) return s;
          const next = patchDay(s, dayKey(), (x) => ({ ...x, water: x.water.slice(0, -1) }));
          msgs.push({ text: 'Undone. I saw that, though.', tone: 'info' });
          return reward(next, msgs, -XP.water);
        });
      },

      // --- food ---
      addFood(food: { name: string; kcal: number; protein: number; photo?: string }, key?: string) {
        const past = pastKey(key);
        if (past) {
          run((s, msgs) => {
            msgs.push(backdated(past, `🍽️ ${food.name}`));
            return patchDay(s, past, (d) => ({ ...d, food: [...d.food, { id: uid(), ...food, at: nowOn(past), late: true }] }));
          });
          return;
        }
        run((s, msgs) => {
          const key = dayKey();
          let next = patchDay(s, key, (d) => ({ ...d, food: [...d.food, { id: uid(), ...food, at: Date.now() }] }));
          const d = dayOf(next, key);
          if (!d.proteinGoalHit && s.settings.proteinGoal > 0 && proteinOf(d) >= s.settings.proteinGoal) {
            next = patchDay(next, key, (x) => ({ ...x, proteinGoalHit: true }));
            msgs.push({ text: `${L(next, 'proteinGoal')} +${XP.proteinGoal} XP`, tone: 'epic' });
            return reward(next, msgs, XP.food + XP.proteinGoal);
          }
          msgs.push({ text: L(next, food.photo ? 'mealPhoto' : 'foodLogged'), tone: 'good' });
          return reward(next, msgs, XP.food);
        });
      },

      updateFood(id: string, patch: { at?: number; name?: string; kcal?: number; protein?: number }, key = dayKey()) {
        run((s) => patchDay(s, key, (d) => ({ ...d, food: d.food.map((f) => (f.id === id ? { ...f, ...patch } : f)) })));
      },

      removeFood(id: string, key = dayKey()) {
        deletePhoto(dayOf(stateRef.current, key).food.find((f) => f.id === id)?.photo);
        run((s, msgs) => {
          const next = patchDay(s, key, (d) => ({ ...d, food: d.food.filter((f) => f.id !== id) }));
          return pastKey(key) ? next : reward(next, msgs, -XP.food);
        });
      },

      // --- progress photos ---
      async addProgressPhoto(source: PhotoSource) {
        const uri = await getPhoto('progress', source);
        if (uri) actions.addProgressPhotoFrom(uri);
      },

      /** A progress photo already saved in the app's storage (e.g. shared from another app). */
      addProgressPhotoFrom(uri: string) {
        run((s, msgs) => {
          const todayStart = startOfDay().getTime();
          const firstToday = !s.progressPhotos.some((p) => p.at >= todayStart);
          const next = { ...s, progressPhotos: [...s.progressPhotos, { id: uid(), uri, at: Date.now() }] };
          msgs.push({ text: L(next, 'progressPhoto') + (firstToday ? ` +${XP.progressPhoto} XP` : ''), tone: 'good' });
          return firstToday ? reward(next, msgs, XP.progressPhoto) : next;
        });
      },

      removeProgressPhoto(id: string) {
        deletePhoto(stateRef.current.progressPhotos.find((p) => p.id === id)?.uri);
        run((s) => ({ ...s, progressPhotos: s.progressPhotos.filter((p) => p.id !== id) }));
      },

      // --- coffee ---
      addCoffee(key?: string) {
        const past = pastKey(key);
        if (past) {
          run((s, msgs) => {
            msgs.push(backdated(past, '☕ A coffee'));
            return patchDay(s, past, (d) => ({ ...d, coffee: [...coffeeOf(d), { id: uid(), mg: s.settings.caffeinePerCupMg, at: nowOn(past), late: true }] }));
          });
          return;
        }
        run((s, msgs) => {
          const key = dayKey();
          const { caffeinePerCupMg, coffeeLimit, coffeeCutoffHour } = s.settings;
          const next = patchDay(s, key, (d) => ({ ...d, coffee: [...coffeeOf(d), { id: uid(), mg: caffeinePerCupMg, at: Date.now() }] }));
          const d = dayOf(next, key);
          const vars = { n: coffeeOf(d).length, mg: caffeineMg(d), limit: coffeeLimit, cutoff: coffeeCutoffHour };
          if (vars.n > coffeeLimit) msgs.push({ text: L(next, 'coffeeOver', vars), tone: 'bad' });
          else if (new Date().getHours() >= coffeeCutoffHour) msgs.push({ text: L(next, 'coffeeLate', vars), tone: 'bad' });
          else msgs.push({ text: L(next, 'coffeeLogged', vars), tone: 'info' });
          return next;
        });
      },

      undoCoffee(key = dayKey()) {
        run((s) => patchDay(s, key, (d) => ({ ...d, coffee: coffeeOf(d).slice(0, -1) })));
      },

      updateCoffee(id: string, at: number, key = dayKey()) {
        run((s) =>
          patchDay(s, key, (d) => ({ ...d, coffee: coffeeOf(d).map((c) => (c.id === id ? { ...c, at } : c)).sort((a, b) => a.at - b.at) })),
        );
      },

      removeCoffee(id: string, key = dayKey()) {
        run((s) => patchDay(s, key, (d) => ({ ...d, coffee: coffeeOf(d).filter((c) => c.id !== id) })));
      },

      // --- timed training (Maskiner / Kondition / Fria vikter) ---
      addActivity(kind: ActivityKind, minutes: number) {
        run((s, msgs) => {
          let next = patchDay(s, dayKey(), (d) => ({
            ...d,
            activities: [...activitiesOf(d), { id: uid(), kind, minutes, at: Date.now() }],
          }));
          next = startWorkout(next, msgs);
          msgs.push({ text: L(next, 'activityLogged', { activity: activityInfo(kind).label, minutes }), tone: 'good' });
          return reward(next, msgs, activityXp(minutes));
        });
      },

      updateActivity(id: string, patch: { minutes?: number; at?: number; kind?: ActivityKind }) {
        run((s, msgs) => {
          const old = activitiesOf(dayOf(s)).find((a) => a.id === id);
          if (!old) return s;
          const next = patchDay(s, dayKey(), (d) => ({ ...d, activities: activitiesOf(d).map((a) => (a.id === id ? { ...a, ...patch } : a)) }));
          const xpDiff = activityXp(patch.minutes ?? old.minutes) - activityXp(old.minutes);
          return xpDiff ? reward(next, msgs, xpDiff) : next;
        });
      },

      removeActivity(id: string) {
        run((s, msgs) => {
          const old = activitiesOf(dayOf(s)).find((a) => a.id === id);
          if (!old) return s;
          const next = patchDay(s, dayKey(), (d) => ({ ...d, activities: activitiesOf(d).filter((a) => a.id !== id) }));
          return reward(next, msgs, -activityXp(old.minutes));
        });
      },

      // --- period & sleep ---
      logPeriod(key: string, period: PeriodLog | null) {
        run((s, msgs) => {
          const wasOn = s.days[key]?.period?.flow != null;
          const next = patchDay(s, key, (d) => ({ ...d, period: period && (period.flow || period.symptoms.length) ? period : undefined }));
          if (period?.flow && !wasOn && key === dayKey()) msgs.push({ text: L(next, 'periodLogged'), tone: 'info' });
          return next;
        });
      },

      rateSleep(rating: Rating) {
        run((s, msgs) => {
          const first = dayOf(s).sleepRating == null;
          const next = patchDay(s, dayKey(), (d) => ({ ...d, sleepRating: rating }));
          msgs.push({ text: L(next, rating <= 2 ? 'rateSleepBad' : rating === 3 ? 'rateSleepOk' : 'rateSleepGreat'), tone: 'info' });
          return first ? reward(next, msgs, XP.sleepRating) : next;
        });
      },

      /** Hours slept, typed in by hand. `key` is the morning after, like the watch's. null hands the night back to the watch. */
      logSleep(key: string, minutes: number | null) {
        run((s, msgs) => {
          if (minutes == null) return patchDay(s, key, (d) => ({ ...d, sleepMin: undefined, sleepManual: undefined }));
          const next = patchDay(s, key, (d) => ({ ...d, sleepMin: minutes, sleepManual: true }));
          const sleep = fmtDuration(minutes * MIN);
          msgs.push(
            key === dayKey()
              ? { text: L(next, minutes < 6 * 60 ? 'sleepShort' : 'sleepGood', { sleep }), tone: 'info' }
              : { text: `Sleep logged: ${sleep}.`, tone: 'info' },
          );
          return next;
        });
        if (minutes == null && key === dayKey()) void refreshHealth(false);
      },

      // --- mood ---
      logMood(level: MoodLevel, emotions: string[], note: string, key?: string) {
        const past = pastKey(key);
        if (past) {
          run((s, msgs) => {
            msgs.push(backdated(past, `${moodInfo(level).emoji} A check-in`));
            const entry = { id: uid(), level, emotions, note: note.trim() || undefined, at: nowOn(past), late: true };
            return patchDay(s, past, (d) => ({ ...d, moods: [...moodsOf(d), entry] }));
          });
          return;
        }
        run((s, msgs) => {
          const key = dayKey();
          const earlier = moodsOf(dayOf(s, key)).length;
          const entry = { id: uid(), level, emotions, note: note.trim() || undefined, at: Date.now() };
          const next = patchDay(s, key, (d) => ({ ...d, moods: [...moodsOf(d), entry] }));
          msgs.push({ text: L(next, moodInfo(level).line), tone: level <= 2 ? 'info' : 'good' });
          // XP for the first three check-ins a day, so it can't be farmed.
          return earlier < 3 ? reward(next, msgs, XP.mood) : next;
        });
      },

      removeMood(id: string, key = dayKey()) {
        run((s) => patchDay(s, key, (d) => ({ ...d, moods: moodsOf(d).filter((m) => m.id !== id) })));
      },

      /** Fixes a check-in's mood, emotions or note. Its time and XP stay as they were. */
      updateMood(id: string, patch: { level: MoodLevel; emotions: string[]; note: string }, key = dayKey()) {
        run((s) =>
          patchDay(s, key, (d) => ({
            ...d,
            moods: moodsOf(d).map((m) => (m.id === id ? { ...m, level: patch.level, emotions: patch.emotions, note: patch.note.trim() || undefined } : m)),
          })),
        );
      },

      // --- gym ---
      logSet(exercise: string, weight: number, reps: number) {
        const next = run((s, msgs) => {
          const key = dayKey();
          const name = exercise.trim();
          const id = name.toLowerCase();
          const firstOfDay = !dayOf(s, key).workoutCounted;
          const prevBest = s.prs[id];
          let next = patchDay(s, key, (d) => ({
            ...d,
            workoutCounted: true,
            sets: [...d.sets, { id: uid(), exercise: name, weight, reps, at: Date.now() }],
          }));
          if (prevBest === undefined || weight > prevBest) next = { ...next, prs: { ...next.prs, [id]: weight } };
          const isPR = prevBest !== undefined && weight > prevBest;

          if (firstOfDay) {
            next = bump(next, 'workouts');
            msgs.push({ text: `${L(next, 'gymStarted')}`, tone: 'epic' });
            next = reward(next, msgs, XP.workout + XP.set, workoutBonusMin(next));
          }
          if (isPR) {
            next = bump(next, 'prs');
            msgs.push({ text: `🔥 ${L(next, 'gymPR', { exercise: name, weight })} +${XP.pr} XP`, tone: 'epic' });
            next = reward(next, msgs, XP.pr + (firstOfDay ? 0 : XP.set));
          } else if (!firstOfDay) {
            msgs.push({ text: L(next, 'gymSet', { weight, reps, exercise: name }), tone: 'good' });
            next = reward(next, msgs, XP.set);
          }
          if (s.settings.restSeconds > 0) next = { ...next, restEndsAt: Date.now() + s.settings.restSeconds * 1000 };
          return next;
        });
        if (next.restEndsAt) void scheduleRestDone(next, next.restEndsAt);
      },

      removeSet(id: string) {
        run((s, msgs) => {
          const set = dayOf(s).sets.find((x) => x.id === id);
          if (!set) return s;
          const next = patchDay(s, dayKey(), (d) => ({ ...d, sets: d.sets.filter((x) => x.id !== id) }));
          return reward(recomputePr(next, set.exercise), msgs, -XP.set);
        });
      },

      /** Fixes a typo in one of today's sets. The record follows the new numbers; no XP changes hands. */
      updateSet(id: string, patch: { weight: number; reps: number }) {
        run((s) => {
          const set = dayOf(s).sets.find((x) => x.id === id);
          if (!set) return s;
          const next = patchDay(s, dayKey(), (d) => ({ ...d, sets: d.sets.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
          return recomputePr(next, set.exercise);
        });
      },

      addRest(seconds: number) {
        const s = stateRef.current;
        const endsAt = Math.max(Date.now(), s.restEndsAt ?? 0) + seconds * 1000;
        commit({ ...s, restEndsAt: endsAt });
        void scheduleRestDone(stateRef.current, endsAt);
      },

      skipRest() {
        commit({ ...stateRef.current, restEndsAt: null });
        void cancelRestDone();
      },

      // --- gaming ---
      startGame(game?: string) {
        const s0 = stateRef.current;
        if (s0.activeGame) return;
        const name = game?.trim() || undefined;
        const remainingMin = gamingBudgetMin(s0) - gamingUsedMs(s0) / MIN;
        const next = run((s, msgs) => {
          const named = name ? `${L(s, 'gameNamed', { game: name })} ` : '';
          msgs.push(
            remainingMin > 0
              ? { text: named + L(s, 'gameStart', { left: fmtDuration(remainingMin * MIN) }), tone: 'info' }
              : { text: named + L(s, 'gameStartOver'), tone: 'bad' },
          );
          return { ...s, activeGame: { start: Date.now(), game: name } };
        });
        void scheduleGameAlerts(next, remainingMin);
      },

      /** Names (or renames) the game of the running session. */
      setGame(game: string) {
        const s0 = stateRef.current;
        if (!s0.activeGame) return;
        const next = run((s) => (s.activeGame ? { ...s, activeGame: { ...s.activeGame, game: game.trim() || undefined } } : s));
        void scheduleGameAlerts(next, gamingBudgetMin(next) - gamingUsedMs(next) / MIN);
      },

      stopGame() {
        const s0 = stateRef.current;
        if (!s0.activeGame) return;
        const start = s0.activeGame.start;
        const game = s0.activeGame.game;
        const end = Date.now();
        const key = dayKey(start);
        const budgetMs = gamingBudgetMin(s0, key) * MIN;
        const usedBefore = gamingUsedMs({ ...s0, activeGame: null }, key);
        const dur = end - start;
        run((s, msgs) => {
          let next = patchDay({ ...s, activeGame: null }, key, (d) => ({ ...d, games: [...d.games, { start, end, game }] }));
          const overMs = Math.min(dur, usedBefore + dur - budgetMs);
          const penalty = gamePenalty(overMs);
          if (penalty) {
            msgs.push({ text: L(next, 'gameStopBad', { over: fmtDuration(overMs), penalty }), tone: 'bad' });
            next = reward(next, msgs, -penalty);
          } else if (dur >= 10 * MIN) {
            next = bump(next, 'disciplinedStops');
            msgs.push({ text: L(next, 'gameStopGood'), tone: 'good' });
          } else {
            msgs.push({ text: `Session ended after ${fmtDuration(dur)}. Speedrun?`, tone: 'info' });
          }
          return next;
        });
        void cancelGameAlerts();
      },

      /** Fixes a finished session on day `key` (found by its start): new start, length and name. */
      updateGame(key: string, start: number, patch: { start: number; ms: number; game?: string }) {
        const next = run((s, msgs) => {
          const old = dayOf(s, key).games.find((g) => g.start === start);
          if (!old) return s;
          const ms = Math.max(MIN, patch.ms);
          const end = Math.min(patch.start + ms, Date.now()); // a fixed session can't end in the future
          const others = dayOf(s, key).games.filter((g) => g.start !== start);
          let from = end - ms;
          while (others.some((g) => g.start === from)) from--; // the start identifies a session, keep it unique
          const game = patch.game !== undefined ? patch.game.trim() || undefined : old.game;
          const games = [...others, { start: from, end, game }].sort((a, b) => a.start - b.start);
          return regradeGaming(s, patchDay(s, key, (d) => ({ ...d, games })), key, msgs, L(s, 'gameEdited', { time: fmtDuration(ms) }));
        });
        rescheduleGameAlerts(next, key);
      },

      removeGame(key: string, start: number) {
        const next = run((s, msgs) => {
          if (!dayOf(s, key).games.some((g) => g.start === start)) return s;
          const games = dayOf(s, key).games.filter((g) => g.start !== start);
          return regradeGaming(s, patchDay(s, key, (d) => ({ ...d, games })), key, msgs, 'Session deleted.');
        });
        rescheduleGameAlerts(next, key);
      },

      // --- tasks ---
      addTask(title: string) {
        const t = title.trim();
        if (!t) return;
        run((s, msgs) => {
          msgs.push({ text: L(s, 'taskAdded'), tone: 'info' });
          return { ...s, tasks: [{ id: uid(), title: t, done: false, createdAt: Date.now() }, ...s.tasks] };
        });
      },

      toggleTask(id: string) {
        run((s, msgs) => {
          const task = s.tasks.find((t) => t.id === id);
          if (!task) return s;
          const tasks = s.tasks.map((t) => (t.id === id ? { ...t, done: !t.done, doneAt: t.done ? undefined : Date.now() } : t));
          if (!task.done) {
            const age = taskAgeDays(task);
            if (age >= IMMORTAL_DAYS) msgs.push({ text: L(s, 'immortalSlain', { task: task.title, days: age }), tone: 'epic' });
            else msgs.push({ text: L(s, 'taskDone'), tone: 'good' });
            return reward(bump({ ...s, tasks }, 'tasksDone'), msgs, XP.task, BONUS_MIN.task);
          }
          const doneToday = task.doneAt && dayKey(task.doneAt) === dayKey();
          return reward(bump({ ...s, tasks }, 'tasksDone', -1), msgs, -XP.task, doneToday ? -BONUS_MIN.task : 0);
        });
      },

      deleteTask(id: string) {
        run((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) }));
      },

      /** Tonight's picks for tomorrow's top 3 (the evening debrief). */
      setTopTomorrow(ids: string[]) {
        run((s) => ({ ...s, topTomorrow: { day: tomorrowKey(), ids: ids.slice(0, 3) } }));
      },

      renameTask(id: string, title: string) {
        const t = title.trim();
        if (!t) return;
        run((s) => ({ ...s, tasks: s.tasks.map((x) => (x.id === id ? { ...x, title: t } : x)) }));
      },

      clearDoneTasks() {
        run((s) => ({ ...s, tasks: s.tasks.filter((t) => !t.done) }));
      },

      // --- habits ---
      addHabit(h: Omit<Habit, 'id' | 'createdAt'>) {
        run((s) => ({ ...s, habits: [...s.habits, { ...h, id: uid(), createdAt: Date.now() }] }));
      },

      updateHabit(id: string, patch: Partial<Omit<Habit, 'id' | 'createdAt'>>) {
        run((s) => ({ ...s, habits: s.habits.map((h) => (h.id === id ? { ...h, ...patch } : h)) }));
      },

      deleteHabit(id: string) {
        run((s) => ({ ...s, habits: s.habits.filter((h) => h.id !== id) }));
      },

      toggleHabit(id: string) {
        run((s, msgs) => {
          const key = dayKey();
          const habit = s.habits.find((h) => h.id === id);
          if (!habit) return s;
          const done = habitsDone(s, key);
          if (done.includes(id)) return reward(patchDay(s, key, (d) => ({ ...d, habits: done.filter((x) => x !== id) })), msgs, -XP.habit);

          let next = patchDay(s, key, (d) => ({ ...d, habits: [...done, id] }));
          msgs.push({ text: L(next, 'habitDone', { habit: `${habit.emoji} ${habit.name}` }), tone: 'good' });
          next = reward(next, msgs, XP.habit);
          const due = habitsFor(next);
          const nowDone = habitsDone(next, key);
          if (!dayOf(next, key).habitsAllDone && due.length > 0 && due.every((h) => nowDone.includes(h.id))) {
            next = patchDay(next, key, (d) => ({ ...d, habitsAllDone: true }));
            msgs.push({ text: L(next, 'habitAllDone'), tone: 'epic' });
            next = reward(next, msgs, XP.habitsAll);
          }
          return next;
        });
      },

      // --- fly collection (cluster G) ---
      catchFly() {
        run((s, msgs) => {
          const r = catchPendingFly(s);
          if (r.key) {
            const extra = r.newSpecies ? ` New species: ${caughtCount(r.state)}/${FLIES.length}.` : '';
            msgs.push({ text: L(r.state, r.key, r.vars) + extra, tone: r.key === 'flyGone' ? 'info' : 'epic' });
          }
          return r.state;
        });
      },

      // --- quest swap (once a day, for coins) ---
      rerollQuest(id: string) {
        run((s, msgs) => {
          const swap = rerollFor(s, id);
          if (!swap) return s;
          if (s.coins < QUEST_REROLL_COST) {
            msgs.push({ text: L(s, 'tooPoor', { missing: QUEST_REROLL_COST - s.coins }), tone: 'bad' });
            return s;
          }
          const next = patchDay({ ...s, coins: s.coins - QUEST_REROLL_COST }, dayKey(), (d) => ({
            ...d,
            quests: (d.quests ?? []).map((q) => (q === id ? swap : q)),
            questRerolled: true,
            questFocus: d.questFocus?.id === id ? undefined : d.questFocus,
          }));
          const title = questsFor(next).find((q) => q.id === swap)?.title ?? swap;
          msgs.push({ text: `⟳ ${L(next, 'questRerolled', { quest: title })}`, tone: 'info' });
          return next;
        });
      },

      // --- sick / away mode ---
      startPause(kind: 'sick' | 'away', days: number) {
        run((s, msgs) => {
          const next = pauseStarted(s, kind, days);
          const p = pauseOn(next);
          if (next === s || !p) {
            msgs.push({ text: 'This month already has 7 paused days. That is the limit, sorry.', tone: 'info' });
            return s;
          }
          const until = p.to === dayKey() ? 'tonight' : WEEKDAYS_LONG[new Date(`${p.to}T12:00`).getDay()];
          msgs.push({ text: L(next, kind === 'sick' ? 'pauseSick' : 'pauseAway', { until }), tone: 'info' });
          return next;
        });
      },

      endPause() {
        run((s, msgs) => {
          if (!pauseOn(s)) return s;
          const next = pauseEnded(s);
          msgs.push({ text: L(next, 'pauseOff'), tone: 'info' });
          return next;
        });
      },

      // --- loot chest & shop ---
      openChest() {
        run((s, msgs) => {
          const key = dayKey();
          const d = dayOf(s, key);
          if (!d.chestReady || d.chest) return s;
          const since = s.chestsSinceLegendary ?? 0;
          const prize = rollChest(Math.random(), { gold: goldChest(s), pity: since >= PITY_AFTER, luck: chestLuck(s) });
          let next = patchDay(s, key, (x) => ({ ...x, chest: prize }));
          next = { ...next, chestsSinceLegendary: prize.kind === 'legendary' ? 0 : since + 1 };
          const drop = prize.kind === 'legendary' ? legendaryDrop(next) : null;
          if (drop) {
            next = withOwned(next, drop.id);
            msgs.push({ text: `${drop.emoji} Rare drop: ${drop.name} for your spider. Wear it from the Shop.`, tone: 'epic' });
          }
          if (prize.kind === 'coins' || prize.kind === 'legendary') {
            next = { ...next, coins: next.coins + prize.amount, coinsEarned: next.coinsEarned + prize.amount };
          }
          if (prize.kind === 'gaming') next = patchDay(next, key, (x) => ({ ...x, bonusGameMin: x.bonusGameMin + prize.amount }));
          if (prize.kind === 'double_xp') next = { ...next, doubleXpUntil: Date.now() + prize.amount * MIN };
          if (prize.kind === 'boss_bomb') {
            const week = weekKeyOf();
            next = { ...next, bossBombs: { ...next.bossBombs, [week]: (next.bossBombs[week] ?? 0) + prize.amount } };
          }
          const text = prize.kind === 'legendary' ? L(next, 'legendaryRoast') : L(next, 'chestOpened', { prize: prize.text });
          msgs.push({ text: prize.gold ? `✨ Gold chest! ${text}` : text, tone: 'epic' });
          return next;
        });
      },

      buyItem(id: ShopItemId) {
        run((s, msgs) => {
          const item = SHOP_ITEMS.find((i) => i.id === id);
          if (!item) return s;
          const cost = shopPrice(id, s.perks);
          if (s.coins < cost) {
            msgs.push({ text: L(s, 'tooPoor', { missing: cost - s.coins }), tone: 'bad' });
            return s;
          }
          let next: State = { ...s, coins: s.coins - cost, purchases: [...s.purchases, { id: uid(), title: item.title, emoji: item.emoji, cost, at: Date.now() }].slice(-100) };
          if (id === 'gaming30') next = patchDay(next, dayKey(), (d) => ({ ...d, bonusGameMin: d.bonusGameMin + 30 }));
          if (id === 'double_xp') next = { ...next, doubleXpUntil: Math.max(Date.now(), next.doubleXpUntil ?? 0) + 60 * MIN };
          if (id === 'bomb') {
            const week = weekKeyOf();
            next = { ...next, bossBombs: { ...next.bossBombs, [week]: (next.bossBombs[week] ?? 0) + 100 } };
          }
          msgs.push({ text: L(next, 'rewardBought', { reward: `${item.emoji} ${item.title}` }), tone: 'good' });
          return next;
        });
      },

      /** Stakes coins on a weekly goal (Monday to Wednesday, one per week), at a difficulty that sets target and payout. */
      signContract(goal: ContractGoal, stake: number, difficulty: Difficulty = 'normal') {
        run((s0, msgs) => {
          const s = checkContract(s0, msgs); // last week's, if it's still open
          const week = weekKeyOf();
          if (!canSign() || s.contract?.week === week || !difficultyOk(goal, difficulty)) return s;
          if (s.coins < stake) {
            msgs.push({ text: L(s, 'tooPoor', { missing: stake - s.coins }), tone: 'bad' });
            return s;
          }
          const target = targetFor(goal, difficulty);
          msgs.push({ text: `📜 ${L(s, 'contractSigned', { goal: goalOf(goal).title(target), stake })}`, tone: 'info' });
          return {
            ...s,
            coins: s.coins - stake,
            contract: { week, from: dayKey(), signedAt: Date.now(), goal, target, stake, status: 'open', difficulty },
          };
        });
      },

      // --- abilities & wardrobe (cluster B) ---
      takePerk(id: PerkId) {
        run((s, msgs) => {
          const p = perkOf(id);
          if (!p || perkBlocker(s, id)) return s;
          msgs.push({ text: `${p.emoji} ${L(s, 'perkTaken', { title: p.name })}`, tone: 'epic' });
          return { ...s, perks: [...(s.perks ?? []), id] };
        });
      },

      /** Gives every ability point back, for a price. */
      respecPerks() {
        run((s, msgs) => {
          if (!(s.perks ?? []).length) return s;
          if (s.coins < RESPEC_COST) {
            msgs.push({ text: L(s, 'tooPoor', { missing: RESPEC_COST - s.coins }), tone: 'bad' });
            return s;
          }
          msgs.push({ text: 'Abilities reset. Every point is yours to spend again.', tone: 'info' });
          return { ...s, perks: [], coins: s.coins - RESPEC_COST };
        });
      },

      buyCosmetic(id: string) {
        run((s, msgs) => {
          const c = cosmeticOf(id);
          if (!c || c.price == null || owns(s, id) || !buyable(c)) return s;
          if (s.coins < c.price) {
            msgs.push({ text: L(s, 'tooPoor', { missing: c.price - s.coins }), tone: 'bad' });
            return s;
          }
          msgs.push({ text: `${c.emoji} ${L(s, 'cosmeticBought', { title: c.name })}`, tone: 'good' });
          const next = withWorn(withOwned(s, id), c.slot, id);
          const purchase = { id: uid(), title: c.name, emoji: c.emoji, cost: c.price, at: Date.now() };
          return { ...next, coins: next.coins - c.price, purchases: [...next.purchases, purchase].slice(-100) };
        });
      },

      /** Puts on an owned item, or takes the slot off (null). */
      wearCosmetic(slot: Slot, id: string | null) {
        run((s) => (id && !owns(s, id) ? s : withWorn(s, slot, id)));
      },

      /** The title shown on HQ; null goes back to the current level's. */
      setTitle(title: string | null) {
        run((s) => withTitle(s, title));
      },

      addReward(r: Omit<Reward, 'id'>) {
        run((s) => ({ ...s, rewards: [...s.rewards, { ...r, id: uid() }] }));
      },

      deleteReward(id: string) {
        run((s) => ({ ...s, rewards: s.rewards.filter((r) => r.id !== id) }));
      },

      buyReward(id: string) {
        run((s, msgs) => {
          const r = s.rewards.find((x) => x.id === id);
          if (!r) return s;
          if (s.coins < r.cost) {
            msgs.push({ text: L(s, 'tooPoor', { missing: r.cost - s.coins }), tone: 'bad' });
            return s;
          }
          msgs.push({ text: L(s, 'rewardBought', { reward: `${r.emoji} ${r.title}` }), tone: 'epic' });
          return { ...s, coins: s.coins - r.cost, purchases: [...s.purchases, { id: uid(), title: r.title, emoji: r.emoji, cost: r.cost, at: Date.now() }].slice(-100) };
        });
      },

      // --- Web Focus ---
      startFocus(minutes: number, label?: string) {
        if (stateRef.current.activeFocus) return;
        const start = Date.now();
        const next = run((s) => ({ ...s, activeFocus: { start, minutes, label: label?.trim() || undefined } }));
        void scheduleFocusDone(next, start + minutes * MIN);
      },

      /** Ends the running focus session; a reason (an app name or "gave up") means the web snapped. */
      finishFocus(snapped?: string) {
        run((s, msgs) => {
          const f = s.activeFocus;
          if (!f) return s;
          const end = Math.min(Date.now(), f.start + f.minutes * MIN);
          const entry = { id: uid(), start: f.start, end, minutes: f.minutes, label: f.label, snapped };
          const next = patchDay({ ...s, activeFocus: null }, dayKey(f.start), (d) => ({ ...d, focus: [...(d.focus ?? []), entry] }));
          if (snapped === 'gave up') {
            msgs.push({ text: L(next, 'focusGaveUp'), tone: 'bad' });
            return next;
          }
          if (snapped) {
            msgs.push({ text: `🕸️ ${L(next, 'focusSnapped', { app: snapped })}`, tone: 'bad' });
            return next;
          }
          const bonus = focusBonusMin(s, f.minutes);
          msgs.push({ text: `🕸️ ${L(next, 'focusDone', { minutes: f.minutes })} +${bonus} min gaming`, tone: 'epic' });
          return reward(next, msgs, focusXp(f.minutes), bonus);
        });
        void cancelFocusDone();
      },

      // --- energy, wind-down, breathing ---
      rateEnergy(rating: Rating) {
        run((s, msgs) => {
          const first = dayOf(s).energy == null;
          const next = patchDay(s, dayKey(), (d) => ({ ...d, energy: rating }));
          msgs.push({ text: L(next, rating <= 2 ? 'energyLow' : rating >= 4 ? 'energyHigh' : 'energyOk'), tone: 'info' });
          return first ? reward(next, msgs, XP.energy) : next;
        });
      },

      toggleWindDown(item: string) {
        run((s, msgs) => {
          const key = dayKey(new Date(Date.now() - 4 * 3_600_000)); // after midnight still counts as "tonight"
          const done = dayOf(s, key).windDown ?? [];
          const list = done.includes(item) ? done.filter((x) => x !== item) : [...done, item];
          let next = patchDay(s, key, (d) => ({ ...d, windDown: list }));
          if (!dayOf(s, key).windDownDone && s.windDownItems.every((i) => list.includes(i))) {
            next = patchDay(next, key, (d) => ({ ...d, windDownDone: true }));
            msgs.push({ text: L(next, 'windDownDone'), tone: 'epic' });
            next = reward(next, msgs, XP.windDown);
          }
          return next;
        });
      },

      setWindDownItems(items: string[]) {
        run((s) => ({ ...s, windDownItems: items }));
      },

      logBreath() {
        run((s, msgs) => {
          const first = !dayOf(s).breaths;
          const next = patchDay(s, dayKey(), (d) => ({ ...d, breaths: (d.breaths ?? 0) + 1 }));
          msgs.push({ text: L(next, 'breathDone'), tone: 'good' });
          return first ? reward(next, msgs, XP.breath) : next;
        });
      },

      // --- custom trackers ---
      addTracker(t: Omit<Tracker, 'id' | 'createdAt'>) {
        run((s) => ({ ...s, trackers: [...s.trackers, { ...t, id: uid(), createdAt: Date.now() }] }));
      },

      deleteTracker(id: string) {
        run((s) => ({ ...s, trackers: s.trackers.filter((t) => t.id !== id) }));
      },

      setTrack(id: string, value: number | null, key = dayKey()) {
        run((s) =>
          patchDay(s, key, (d) => {
            const tracks = { ...(d.tracks ?? {}) };
            if (value == null) delete tracks[id];
            else tracks[id] = value;
            return { ...d, tracks };
          }),
        );
      },

      // --- body tracking (neutral, never roasted) ---
      addBody(values: Omit<BodyEntry, 'id' | 'at'>) {
        run((s, msgs) => {
          const todayStart = startOfDay().getTime();
          const first = !s.bodyLog.some((b) => b.at >= todayStart);
          const next = { ...s, bodyLog: [...s.bodyLog, { ...values, id: uid(), at: Date.now() }] };
          msgs.push({ text: L(next, 'bodyLogged'), tone: 'info' });
          return first ? reward(next, msgs, XP.body) : next;
        });
      },

      deleteBody(id: string) {
        run((s) => ({ ...s, bodyLog: s.bodyLog.filter((b) => b.id !== id) }));
      },

      // --- countdowns ---
      addCountdown(c: { title: string; emoji: string; date: string; yearly: boolean }) {
        run((s) => ({ ...s, countdowns: [...s.countdowns, { ...c, id: uid(), createdAt: Date.now() }] }));
      },

      deleteCountdown(id: string) {
        run((s) => ({ ...s, countdowns: s.countdowns.filter((c) => c.id !== id) }));
      },

      // --- self-experiments (cluster D): no XP, no penalty ---
      startExperiment(x: { title: string; emoji: string; metric: ExperimentMetric }) {
        run((s, msgs) => {
          const title = x.title.trim();
          if (activeExperiment(s) || !title) return s;
          const e: Experiment = { id: uid(), title, emoji: x.emoji, metric: x.metric, from: dayKey(), days: EXPERIMENT_DAYS, done: [], startedAt: Date.now() };
          msgs.push({ text: `🧪 ${L(s, 'experimentStarted', { title })}`, tone: 'info' });
          return { ...s, experiments: [...(s.experiments ?? []), e].slice(-20) };
        });
      },

      /** Ticks one of the running experiment's days on or off. Never a future day. */
      toggleExperimentDay(key: string) {
        run((s) => {
          const e = activeExperiment(s);
          if (!e || key > dayKey() || !experimentDays(e).includes(key)) return s;
          const done = e.done.includes(key) ? e.done.filter((k) => k !== key) : [...e.done, key].sort();
          return { ...s, experiments: (s.experiments ?? []).map((x) => (x.id === e.id ? { ...x, done } : x)) };
        });
      },

      /** Closes the running experiment, finished or stopped early. */
      closeExperiment() {
        run((s, msgs) => {
          const e = activeExperiment(s);
          if (!e) return s;
          const r = experimentResult(s, e);
          msgs.push(
            r.ended
              ? { text: `🧪 ${L(s, 'experimentDone', { title: e.title, n: r.doneCount, count: e.days })}`, tone: 'epic' }
              : { text: L(s, 'experimentStopped'), tone: 'info' },
          );
          return { ...s, experiments: (s.experiments ?? []).map((x) => (x.id === e.id ? { ...x, closedAt: Date.now() } : x)) };
        });
      },

      // --- backup ---
      async backup() {
        const result = await createBackup(stateRef.current);
        if (!result) return;
        commit({ ...stateRef.current, lastBackupAt: Date.now() });
        say(`Backup saved: ${result.folder} (${result.photos} photos). Copy that folder to Google Drive for extra safety.`, 'good');
      },

      /** Picks the folder for automatic weekly backups and writes the first one right away. */
      async setAutoBackupFolder() {
        const folder = await pickAutoBackupFolder();
        if (!folder) return;
        commit({ ...stateRef.current, backupFolderUri: folder.uri });
        await runAutoBackup(true);
      },

      stopAutoBackup() {
        commit({ ...stateRef.current, backupFolderUri: null });
      },

      // --- the Swedish year (cluster F) ---
      findEgg(id: EggId) {
        run((s, msgs) => {
          if (seasonOn()?.id !== 'easter') return s;
          const found = eggsThisYear(s);
          if (id in found) return s;
          const year = String(new Date().getFullYear());
          const next: State = {
            ...s,
            eggsFound: { ...s.eggsFound, [year]: { ...found, [id]: Date.now() } },
            coins: s.coins + EGG_COINS,
            coinsEarned: s.coinsEarned + EGG_COINS,
          };
          const left = eggsLeft(next);
          msgs.push({ text: L(next, 'eggFound', { coins: EGG_COINS, left }), tone: 'epic' });
          if (left === 0) msgs.push({ text: L(next, 'eggAllFound'), tone: 'epic' });
          return next;
        });
      },

      /** Valborg: open tasks older than 30 days go on the bonfire, for a little XP. Caller confirms first. */
      burnOldTasks() {
        run((s, msgs) => {
          const old = staleTasks(s);
          if (!old.length) return s;
          const ids = new Set(old.map((t) => t.id));
          const xp = Math.min(BURN_XP_MAX, old.length * BURN_XP);
          const next = patchDay({ ...s, tasks: s.tasks.filter((t) => !ids.has(t.id)) }, dayKey(), (d) => ({ ...d, burned: (d.burned ?? 0) + old.length }));
          msgs.push({ text: L(next, 'valborgBurn', { n: old.length, xp }), tone: 'epic' });
          return reward(next, msgs, xp);
        });
      },

      /** Picks a backup folder and replaces everything with it. Caller confirms first. */
      async restore() {
        const result = await readBackup();
        if (!result) return;
        await cancelEverything();
        disk.current.allowShrink = true; // a backup may hold fewer days than the phone
        commit(restored(result.state));
        say(`Restored backup from ${new Date(result.createdAt).toLocaleString('sv-SE').slice(0, 16)} (${result.photos} photos). Welcome back.`, 'epic');
      },

      async resetAll() {
        await cancelEverything();
        deleteAllPhotos();
        disk.current.allowShrink = true;
        commit(defaultState());
      },
    }),
    [run, commit, say, refreshHealth, runAutoBackup],
  );

  // ----- tapped notifications: the body opens its screen; reminder buttons ("+1 glass", "Snooze 30 min", habit "Done", mood) do their thing -----
  useEffect(() => {
    if (!ready) return;
    return onNotificationTap((a) => {
      const s = stateRef.current;
      if (a.kind === 'glass') actions.addWater(s.settings.glassMl);
      else if (a.kind === 'snooze') {
        void snoozeWater(s);
        say(L(s, 'waterSnoozed'), 'info');
      } else if (a.kind === 'habit') {
        if (!habitsDone(s, dayKey()).includes(a.habitId)) actions.toggleHabit(a.habitId);
      } else if (a.kind === 'focus') {
        if (!s.activeFocus) actions.startFocus(25);
      } else actions.logMood(a.level, [], '');
    }, openSoon);
  }, [ready, actions, say]);

  // ----- Web Focus guard (APK 1.4.0+): runs while a session is on, also after a restart mid-session -----
  const guardOn = !!state.activeFocus && state.settings.focusGuard !== false;
  const guardEnd = state.activeFocus ? state.activeFocus.start + state.activeFocus.minutes * MIN : 0;
  useEffect(() => {
    if (!ready) return;
    if (!guardOn || guardEnd <= Date.now()) {
      stopFocusGuard();
      return;
    }
    const s = stateRef.current;
    const lines = poolFor('focusGuard', effectiveSavage(s), { name: s.settings.userName || 'boss' }, ['app']);
    startFocusGuard(guardEnd, lines, `🕸️ Web Focus${s.activeFocus?.label ? ` · ${s.activeFocus.label}` : ''}`);
  }, [ready, guardOn, guardEnd]);

  // ----- Web Focus: complete (or snap) when the time is up -----
  const activeFocus = state.activeFocus;
  useEffect(() => {
    if (!activeFocus) return;
    const end = activeFocus.start + activeFocus.minutes * MIN;
    const t = setTimeout(
      async () => {
        const breaker = await focusBreaker(activeFocus.start, end).catch(() => null);
        if (stateRef.current.activeFocus?.start === activeFocus.start) actions.finishFocus(breaker ?? undefined);
      },
      Math.max(0, end - Date.now()),
    );
    return () => clearTimeout(t);
  }, [activeFocus, tick, actions]);

  // Screens memoize their lines on `quip`, so it changes with the tone: a low mood or sick mode re-picks them gently.
  const savage = effectiveSavage(state);
  const quip = useCallback(
    (key: LineKey, vars: Record<string, string | number> = {}) => freshLine(key, savage, { name: stateRef.current.settings.userName || 'boss', ...vars }),
    [savage],
  );

  return {
    ready,
    recovery,
    storageInfo,
    state,
    actions,
    say,
    quip,
    saveNow,
    toast: toasts[0] ?? null,
    dismissToast,
    tick,
    outside: {
      air,
      alerts: shownAlerts,
      warnings: warningsOf(shownAlerts), // without SMHI's long-running messages
      status: alertStatus, // whether SMHI and Krisinformation could be reached
      refresh: () => refreshOutside(true),
    },
    screen: {
      status: screenStatus,
      refresh: refreshScreen,
    },
    weather: {
      data: weather,
      refresh: () => refreshWeather(true),
    },
    health: {
      status: healthState,
      data: health,
      refresh: () => refreshHealth(false),
      connect: () => refreshHealth(true),
    },
    cal: {
      status: calStatus,
      calendars,
      events,
      refresh: () => refreshCalendar(false),
      connect: () => refreshCalendar(true),
    },
  };
}
