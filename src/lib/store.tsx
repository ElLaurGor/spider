import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { router, type Href } from 'expo-router';
import * as Sharing from 'expo-sharing';
import * as SplashScreen from 'expo-splash-screen';
import * as Updates from 'expo-updates';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { autoBackup, createBackup, keepCopy, pickAutoBackupFolder, readBackup, readBackupFromFile, shareableBackup } from './backup';
import { olderCopy, readSaved, ReadError, rowsFor, utf8Bytes, V1_KEY, wouldWipe, writeVerified } from './persist';
import { autoBackupDue } from './backup-due';
import { THEMES } from '@/constants/theme';

import { activityInfo } from './body';
import { calendarPermission, calendarSupported, loadCalendars, loadEvents } from './calendar';
import { bankFor, PITY_AFTER, rollChest, shopPrice, SHOP_ITEMS, type ShopItemId } from './economy';
import { stageFor, themesUnlockedBetween } from './evolution';
import { addDays, atTime, dayKey, fmtDuration, fmtTime, isDayKey, MIN, startOfDay, startOfWeek, uid, WEEKDAYS_LONG } from './dates';
import { defaultState, hydrate } from './defaults';
import { connectHealth, healthStatus, healthSupported, missingHealthAccess, readHealth, type HealthData, type HealthStatus } from './health';
import { withGoals } from './goals';
import { habitsDone, habitsFor, RANGE_TOP_XP, rangeText, rangeWeek } from './habits';
import { newLeague, settle, TIERS, weekKeyOf } from './league';
import { banLine, fillLine, freshLine, GOLDEN, GOLDEN_CHANCE, lineMemory, onLineMemory, poolFor, setLineMemory, unbanLine, type LineKey } from './lines';
import { jetlagRemark, lateCoffeeRemark, lateGameRemark, withJitSaid } from './jit';
import { eveningKey, IMMORTAL_DAYS, taskAgeDays, tomorrowKey } from './memory';
import { moodInfo, withNamed } from './mood';
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
import { pushWidgetFor, useBackgroundSync } from './background-sync';
import { drainQueued, onQueued } from './pending-actions';
import type { ReminderAction } from './reminder-actions';
import { deleteAllPhotos, deletePhoto, getPhoto, type PhotoSource } from './photos';
import { bossFor, bossSeasonOf, DRAFT_UNTIL_HOUR, draftFor, draftOpen, FINAL_BOSS, finalBossDue, gentleQuestFor, kingRematchFor, kingWeeksOf, MINION_COINS, QUEST_REROLL_COST, questsFor, reducedDay, reopenQuests, rerollFor, validDraft, weekKey } from './quests';
import { bossRecap, lastWeekKey } from './boss-recap';
import { endPause as pauseEnded, pauseOn, startPause as pauseStarted } from './pause';
import { canSign, contractProgress, difficultyOk, goalOf, payoutOf, roughWeek, targetFor, type Difficulty } from './contracts';
import { respectFor } from './respect';
import { rivalTalk } from './rival-talk';
import { withNights } from './sleep';
import { isSnow, seasonOn, winterOf } from './seasons';
import { julfridPause, openDoor } from './advent';
import { acceptPrizes } from './prizes';
import { withNemesis } from './year-wrapped';
import { catchFly as catchPendingFly, caughtCount, critDamage, FLIES, rollCritters, withoutCrit } from './critters';
import { unlockPages } from './diary';
import { focusBreaker, hasUsageAccess, isDoomscroll, screenTimeSupported, spansBetween, startFocusGuard, stopFocusGuard, unlocksBetween, usageBetween } from './screentime';
import { inBedFrom, nightPhone, nightWindow } from './night';
import { BURN_XP, BURN_XP_MAX, EGG_COINS, eggsLeft, eggsThisYear, staleTasks, type EggId } from './traditions';
import {
  activitiesOf,
  bestBeforeDay,
  caffeineMg,
  coffeeOf,
  dayOf,
  effectiveSavage,
  gameCapAt,
  gamesInTimerMin,
  gamePenalty,
  gamingBudgetMin,
  gamingUsedMs,
  isRecord,
  moodsOf,
  proteinOf,
  syncedSleep,
  trainedOn,
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
  FoodEntry,
  Habit,
  MoodLevel,
  PeriodLog,
  Tracker,
  Rating,
  Reward,
  ScreenDay,
  Settings,
  State,
  TrekRoute,
  Weekday,
  WorkoutDay,
  MoveWhy,
} from './types';
import { dayWeatherOf, fetchWeather, fetchWeatherHistory, needsPlaceInfo, samePlace, weatherMissing, withCounty, type Weather } from './weather';
import { activeExperiment, EXPERIMENT_DAYS, experimentDays, experimentResult } from './experiments';
import { activeAlerts, ALERT_LABEL, fetchAir, fetchSmhi, fetchVma, sourceAfter, triageAlerts, warningsOf, type Air, type Alert, type SourceStatus } from './outside';
import { ACHIEVEMENTS, activityXp, BADGE_NOTE, BONUS_MIN, focusXp, levelForXp, SECRET_ACHIEVEMENTS, SECRET_COINS, SET_XP_DAILY, titleFor, XP } from './xp';
// cluster B: economy & progression
import { buyable, cosmeticOf, legendaryDrop, owns, withOwned, withTitle, withWorn, type Slot } from './cosmetics';
import { chestShelf, SHELF_MAX, withChestGold } from './loot';
import { credit, earnBonus, penalize, refundPenalty, unreward, withoutUndoRecords } from './ledger';
import { bankRate, chestLuck, contractBonus, focusBonusMin, hasPerk, perkBlocker, perkOf, RESPEC_COST, workoutBonusMin, type PerkId } from './perks';
import { restedAfter, restedGain, restedSplit } from './rested';
import { checkSilkTrack, SILK_TIERS } from './silk-track';
import { goldenAllowed } from './tone';
// step 2b: weekly medals and the ghost of last week
import { medalList, settleMedals } from './medals';
import { coopFor, coopIntro, coopResultText, settleCoop } from './coop';
import { checkTrek, newTrek, ROUTES } from './trek';
import { withoutOldXpHours, withXpHour } from './xp-timeline';
// step 4: if-then plans, the comeback bonus, weekly range habits
import { COMEBACK, lastTrainedBefore, missedGymBefore } from './comeback';
import { recheckDay, recheckTask, recordTask, uncheckTask } from './tasks';
import { checkCues, cueVars, ON_CUE_RETIRE, onCueNow, planBToday, planText, type CuePrompt } from './if-then';
// step 6: moving a slipping workout
import { copingPlan, copingWeekday, movedTo, moveDayName, moveTargets, withMove, withoutMove, withWhy } from './workout-move';

export type Tone = 'info' | 'good' | 'bad' | 'epic';
/** A button on a toast (cluster G: "Catch it!" on a fly). */
/** What a toast's Undo takes back: one entry just logged with one tap (it lasts as long as the toast). */
/** `restoreFood` undoes a delete: the meal comes back (photo included) while its toast is up. */
export type UndoRef = { kind: 'water' | 'coffee' | 'food' | 'set' | 'task' | 'restoreFood' | 'move'; id: string; day: string };
export type ToastAction = 'catchFly' | { undo: UndoRef };
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
/** How long a deleted meal's photo is kept for its Undo: longer than any Undo toast stays up. */
const FOOD_UNDO_MS = 20_000;
const backdated = (key: string, what: string): Msg => ({ text: `${what} added to ${dayName(key)}. Back-dated, so no XP.`, tone: 'info' });

/**
 * A past day a queued tap (reminder button, widget) was made on, so it counts there as on time even when the
 * app applies it after midnight. Null for anything else: those are back-dated.
 */
const tappedOn = (past: string | null, at?: number) => (past && at != null && dayKey(at) === past ? past : null);
const lateTap = (key: string, what: string): Msg => ({ text: `${what} from ${dayName(key)}, tapped before midnight: it counts there.`, tone: 'good' });

const bump = (s: State, counter: keyof State['counters'], by = 1): State => ({
  ...s,
  counters: { ...s.counters, [counter]: Math.max(0, s.counters[counter] + by) },
});

type RewardOpts = { ref?: string; quiet?: boolean };

/**
 * XP (and coins, earned bonus gaming minutes) credited to day `key`, today unless said otherwise. Double
 * XP and the rested pool add to it. `ref` names the entry it's for (a glass, a set, a task), so undoing
 * that entry takes back exactly what it got (`unreward`). `quiet`: a level reached here is announced with
 * the next ordinary action instead (body and photo logging get no fanfare).
 */
function reward(s: State, msgs: Msg[], rawXp: number, bonusMin = 0, key = dayKey(), opts: RewardOpts = {}): State {
  if (rawXp < 0) return unreward(s, key, null, -rawXp, Math.max(0, -bonusMin)); // undos go through unreward
  const before = levelForXp(s.xp);
  const base = s.doubleXpUntil && Date.now() < s.doubleXpUntil ? rawXp * 2 : rawXp;
  const rested = restedSplit(s.rested ?? 0, rawXp); // back from a break: +50 % until the pool is used up
  const xp = base + rested.extra;
  let next = credit(rested.extra ? { ...s, rested: rested.left } : s, key, xp, bonusMin, opts.ref);
  // Only a level never reached before is announced: getting one back after a penalty or an undo isn't news.
  const after = levelForXp(next.xp);
  const peak = s.maxLevel ?? before;
  if (after > peak) {
    if (opts.quiet) return { ...next, maxLevel: peak }; // announced with the next ordinary action
    next = { ...next, maxLevel: after };
    msgs.push({ text: L(next, 'levelUp', { level: after, title: titleFor(after) }), tone: 'epic' });
    const stage = stageFor(after);
    if (stage !== stageFor(peak)) msgs.push({ text: `🧬 Your spider evolved: ${stage.name}${stage.badge ? ` ${stage.badge}` : ''}!`, tone: 'epic' });
    for (const id of themesUnlockedBetween(peak, after)) {
      msgs.push({ text: `🎨 New theme unlocked: ${THEMES[id].name}. Settings → Themes.`, tone: 'epic' });
    }
  }
  return next;
}

/** A sick day's gaming is never charged: the time still shows, the penalty and its roast don't. */
const sickOn = (s: State, key: string) => pauseOn(s, key)?.kind === 'sick';

/**
 * After a finished session on day `key` was edited or deleted: charges the extra over-budget XP, or
 * gives back what no longer applies. Penalties never take coins or boss damage.
 */
function regradeGaming(prev: State, next: State, key: string, msgs: Msg[], plain: string): State {
  // The running session pays its own penalty when it stops.
  const over = (x: State) => Math.max(0, gamingUsedMs({ ...x, activeGame: null }, key) - gamingBudgetMin(x, key) * MIN);
  const diff = sickOn(next, key) ? 0 : gamePenalty(over(next)) - gamePenalty(over(prev));
  if (diff > 0) {
    msgs.push({ text: L(next, 'gameEditOver', { over: fmtDuration(over(next)), penalty: diff }), tone: 'bad' });
    return penalize(next, key, diff);
  }
  if (diff < 0) {
    msgs.push({ text: L(next, 'gameEditRefund', { xp: -diff }), tone: 'info' });
    return refundPenalty(next, key, -diff);
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
  if (r.nemesis?.beaten) msgs.push({ text: L(s, 'nemesisBeaten', { rival: `${r.nemesis.emoji} ${r.nemesis.name}`, coins: r.nemesisPrize }), tone: 'good' });
  const history = [...old.history, { week: old.week, tier: old.tier, rank: r.rank, xp: r.xp }].slice(-26);
  const coins = r.prize + r.nemesisPrize;
  return withNemesis({ ...s, league: newLeague(r.tier, week, history), coins: s.coins + coins, coinsEarned: s.coinsEarned + coins }, old.week, r.nemesis);
}

/** Settles a finished co-op week (once) and starts this week's when it's a co-op week (coop.ts). */
function checkCoop(s: State, msgs: Msg[]): State {
  if (!s.onboarded || !s.league) return s;
  const now = new Date();
  const settled = settleCoop(s, now);
  let next = settled.state;
  if (settled.result && next.coop) {
    msgs.push({ text: coopResultText(next, next.coop, settled.result), tone: settled.result.won ? 'epic' : 'info' });
    for (const id of settled.items) {
      const c = cosmeticOf(id);
      if (c) msgs.push({ text: `${c.emoji} ${c.name} for your spider, from your partner. Wear it from the Shop.`, tone: 'epic' });
    }
  }
  if (next.coop?.week === next.league?.week) return next;
  const fresh = coopFor(next, now);
  if (fresh) {
    next = { ...next, coop: fresh };
    msgs.push({ text: coopIntro(next, fresh), tone: 'info' });
  }
  return next;
}

/** Waypoints the trek's steps reached since the last check: postcards, coins and the odd cosmetic (trek.ts). */
function checkTrekProgress(s: State, msgs: Msg[]): State {
  const r = checkTrek(s);
  if (!r.passed.length) return s;
  const last = r.passed[r.passed.length - 1];
  const more = r.passed.length > 1 ? ` (${r.passed.length} waypoints at once)` : '';
  msgs.push({ text: `📮 Postcard from ${last.name}${more}: ${last.card} +${r.coins} 🪙`, tone: 'good' });
  for (const id of r.items) {
    const c = cosmeticOf(id);
    if (c) msgs.push({ text: `${c.emoji} ${c.name} for your spider. Wear it from the Shop.`, tone: 'epic' });
  }
  if (r.finished && s.trek) msgs.push({ text: `🏁 ${ROUTES[s.trek.route].name}, walked end to end. Pick the next trek whenever you like.`, tone: 'epic' });
  return r.state;
}

/** Fixes today's quests, completes any that are done, and settles the weekly boss (checkBoss). */
function checkQuests(s: State, msgs: Msg[]): State {
  if (!s.onboarded) return s;
  const key = dayKey();
  let next = s;
  const now = new Date();
  if (!dayOf(next, key).quests) {
    // The defaults stand from the start; until noon a normal day may swap them in the morning draft.
    const draft = draftFor(next, now);
    const offer = !reducedDay(next, key) && now.getHours() < DRAFT_UNTIL_HOUR;
    next = patchDay(next, key, (d) => ({
      ...d,
      quests: draft.defaults,
      questFocus: draft.focus ?? undefined,
      ...(offer ? { questDraft: { candidates: draft.candidates, locked: false } } : {}),
    }));
  }
  // The draft closes at noon (or once the day is reduced): whatever is picked by then stands.
  const open = dayOf(next, key).questDraft;
  if (open && !open.locked && !draftOpen(next, now)) next = patchDay(next, key, (d) => ({ ...d, questDraft: { ...open, locked: true } }));
  // A reduced day's gentle quest is fixed the first time the day is reduced, so it can't change under you.
  if (reducedDay(next, key) && !dayOf(next, key).questReduced) {
    const id = gentleQuestFor(next);
    next = patchDay(next, key, (d) => ({ ...d, questReduced: id }));
  }

  for (const q of questsFor(next)) {
    if ((dayOf(next, key).questsDone ?? []).includes(q.id) || q.progress < q.target) continue;
    next = bump(patchDay(next, key, (d) => ({ ...d, questsDone: [...(d.questsDone ?? []), q.id] })), 'quests');
    msgs.push({ text: `🗡️ ${L(next, 'questDone', { quest: q.title, xp: q.xp })}`, tone: 'epic' });
    next = reward(next, msgs, q.xp, 0, key, { ref: `q:${q.id}` });
  }

  const d = dayOf(next, key);
  const ids = questsFor(next).map((q) => q.id); // ignores retired quest ids saved earlier
  if (!d.questsAllDone && ids.length > 0 && ids.every((id) => (d.questsDone ?? []).includes(id))) {
    next = patchDay(next, key, (x) => ({ ...x, questsAllDone: true, questsAllDoneAt: Date.now(), chestReady: true }));
    // Announced with what it actually paid (Double XP and the rested share included), ahead of any level-up it brings.
    const at = msgs.length;
    next = reward(next, msgs, XP.questsAll, BONUS_MIN.questsAll, key, { ref: 'quests-all' });
    const vars = { count: ids.length, xp: dayOf(next, key).xpBy?.['quests-all'] ?? XP.questsAll, min: BONUS_MIN.questsAll };
    msgs.splice(at, 0, { text: `${L(next, 'questsAllDone', vars)} 🎁 A loot chest is waiting on HQ.`, tone: 'epic' });
  }

  return checkBoss(next, msgs);
}

type Boss = ReturnType<typeof bossFor>;

/**
 * Marks a boss as beaten and pays for it. `late`: last week's, finished off by numbers that only came in
 * after its week (a watch sync, a binge day that's now over). Its XP goes to that week's Sunday, so this
 * week's boss doesn't take the hit; the bonus gaming minutes are today's, where they can still be used.
 */
function slay(s: State, msgs: Msg[], boss: Boss, late = false): State {
  const sunday = addDays(new Date(`${boss.key}T12:00`), 6);
  const when = late ? atTime(sunday, 0, 23, 59) : new Date();
  let next = bump(
    {
      ...s,
      bossesDefeated: { ...s.bossesDefeated, [boss.key]: boss.id },
      bossKilledAt: { ...s.bossKilledAt, [boss.key]: when.getTime() },
      ...(late ? { bossLateKills: [...(s.bossLateKills ?? []), boss.key] } : {}),
    },
    'bosses',
  );
  // A costumed boss counts for its season all week, like its name; otherwise the day it fell decides.
  const season = (boss.final ? null : bossSeasonOf(new Date(`${boss.key}T12:00`))) ?? seasonOn(when)?.id;
  if (season) next = { ...next, seasonWins: [...(next.seasonWins ?? []), `${season}-${when.getFullYear()}`] };
  if (late) {
    msgs.push({ text: `${boss.emoji} ${L(next, 'bossLateKill', { boss: boss.name, xp: XP.boss })}`, tone: 'epic' });
    next = earnBonus(reward(next, msgs, XP.boss, 0, dayKey(sunday)), dayKey(), BONUS_MIN.boss);
  } else {
    msgs.push({ text: `${boss.emoji} ${L(next, 'bossDefeated', { boss: boss.name })}`, tone: 'epic' });
    next = reward(next, msgs, XP.boss, BONUS_MIN.boss);
  }
  if (boss.final) {
    next = { ...next, syndicateBroken: Date.now(), coins: next.coins + 500, coinsEarned: next.coinsEarned + 500 };
    msgs.push({ text: `👑 ${L(next, 'syndicateBroken', { boss: boss.name })}`, tone: 'epic' });
  }
  return next;
}

/**
 * The weekly boss: a late kill for last week, the Couch King's weeks (his first once all 8 have fallen,
 * then a rematch every 8 weeks while he stands), this week's kill, its rage and the henchmen after it.
 * Runs after the quests and again after crits and achievements, so their damage can finish it too.
 */
function checkBoss(s: State, msgs: Msg[]): State {
  if (!s.onboarded) return s;
  let next = s;
  const lastWeek = bossFor(next, addDays(startOfWeek(new Date()), -7));
  if (!lastWeek.defeated && lastWeek.hp <= 0) next = slay(next, msgs, lastWeek, true);
  // A new week: once, a word on how last week's fight went (the full recap waits on HQ and in the Bestiary).
  const recapWeek = lastWeekKey();
  if (next.bossRecapAt !== recapWeek) {
    const r = bossRecap(next, recapWeek);
    next = { ...next, bossRecapAt: recapWeek };
    if (r) {
      const text = r.beaten
        ? L(next, 'bossRecapWon', { boss: r.boss, day: r.late ? 'after the whistle' : `on ${r.fellOn ?? 'Sunday'}` })
        : L(next, 'bossRecapLost', { boss: r.boss, hp: r.hp });
      msgs.push({ text: `${r.emoji} ${text}`, tone: r.beaten ? 'good' : 'info' });
    }
  }

  const week = weekKey();
  if (finalBossDue(next, week) && !next.bossesDefeated[week]) next = { ...next, finalBossWeek: week, kingWeeks: [week] };
  const rematch = kingRematchFor(next, week);
  if (rematch) {
    next = { ...next, kingWeeks: [...kingWeeksOf(next), rematch] };
    const day = new Date(`${rematch}T12:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
    if (rematch !== week) msgs.push({ text: `👑 ${L(next, 'kingEscaped', { boss: FINAL_BOSS.name, day })}`, tone: 'info' });
  }
  // Announced once per Couch King week (a save from before kingAnnounced already announced its first one).
  const announced = next.kingAnnounced ?? (s.finalBossWeek === week ? week : undefined);
  const kings = kingWeeksOf(next);
  if (kings.includes(week) && announced !== week && !next.bossesDefeated[week]) {
    next = { ...next, kingAnnounced: week };
    const king = bossFor(next);
    msgs.push({ text: `${king.emoji} ${L(next, kings.indexOf(week) === 0 ? 'finalBossArrives' : 'kingReturns', { boss: king.name })}`, tone: 'epic' });
  }

  const boss = bossFor(next);
  if (!boss.defeated && boss.hp <= 0) {
    next = slay(next, msgs, boss);
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

/** Silk Track tiers the month's XP has reached: the items go in the wardrobe, with one line about them. No XP is paid. */
function checkSilk(s: State, msgs: Msg[]): State {
  const { state, unlocked } = checkSilkTrack(s, dayKey());
  for (const u of unlocked) {
    const top = u.unlocked[u.unlocked.length - 1];
    const reward = `${top.emoji} ${top.name}${top.had ? ' (already yours)' : ''}`;
    const vars = { tier: u.tier, reward, month: u.edition.name, count: u.unlocked.length };
    msgs.push({ text: L(state, u.unlocked.length > 1 ? 'silkTiers' : 'silkTier', vars), tone: 'epic' });
    if (u.tier === SILK_TIERS) msgs.push({ text: L(state, 'silkDone', vars), tone: 'epic' });
  }
  return state;
}

function checkAchievements(s: State, msgs: Msg[], quiet = false): State {
  let next = s;
  for (const a of ACHIEVEMENTS) {
    if (next.achievements[a.id] || !a.test(next)) continue;
    next = { ...next, achievements: { ...next.achievements, [a.id]: Date.now() } };
    msgs.push({ text: `🏆 ${L(next, 'achievement', { title: a.title })} +${XP.achievement} XP`, tone: 'epic' });
    next = reward(next, msgs, XP.achievement, 0, dayKey(), { quiet });
  }
  for (const a of SECRET_ACHIEVEMENTS) {
    if (next.secrets[a.id] || !a.test(next)) continue;
    next = { ...next, secrets: { ...next.secrets, [a.id]: Date.now() } };
    if (a.badge) {
      msgs.push({ text: `🏷️ ${a.title}: ${a.desc}. ${BADGE_NOTE}`, tone: 'info' });
      continue;
    }
    msgs.push({ text: `🔓 SECRET ACHIEVEMENT: ${a.title}! ${a.desc}. +${XP.secret} XP +${SECRET_COINS} 🪙`, tone: 'epic' });
    next = reward(next, msgs, XP.secret, 0, dayKey(), { quiet });
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
  // Yesterday (and anything older) keeps the goals it had, whatever changes from now on.
  let next: State = withoutUndoRecords(withGoals({ ...s, lastRollover: today }, today), today);
  // From the last day the app was opened (which may have stayed empty too), a week back at most.
  const since = s.lastRollover && s.lastRollover < today ? s.lastRollover : yesterday;
  const pool = restedAfter(s.rested ?? 0, restedGain(s, since < weekAgo ? weekAgo : since, yesterday));
  if (pool > (s.rested ?? 0)) {
    next = { ...next, rested: pool };
    msgs.push({ text: `😴 ${L(next, 'restedReady', { xp: pool })}`, tone: 'info' });
  }
  // Every day since the last rollover (two back on a first one), so days away don't lose their unused minutes.
  const bankFrom = s.lastRollover && s.lastRollover < today ? s.lastRollover : dayKey(addDays(now, -2));
  for (let d = new Date(`${bankFrom}T12:00`); dayKey(d) <= yesterday; d = addDays(d, 1)) next = bankGaming(next, dayKey(d), msgs);
  // Unopened chests wait on the shelf with the gold status they earned; past SHELF_MAX the oldest opens itself.
  next = withChestGold(next, today);
  const shelf = chestShelf(next, now);
  for (const c of shelf.slice(0, Math.max(0, shelf.length - SHELF_MAX))) next = openChestOn(next, c.key, c.gold, msgs, true);
  // Finished weeks' medals, once each (medals.ts), and XP timelines older than the ghost needs.
  const medals = settleMedals(withoutOldXpHours(next, today), now);
  next = medals.state;
  for (const award of medals.awards) {
    if (!award.won.length) continue;
    next = reward(next, msgs, award.xp, 0, today, { ref: `medals:${award.week}` });
    msgs.push({ text: L(next, 'medalsWeek', { medals: medalList(award.won), xp: award.xp }), tone: 'epic' });
  }
  return next;
}

/**
 * Opens the chest earned on day `key` and applies its prize: coins, Double XP (added to any time left),
 * a boss bomb on this week's boss, or gaming minutes for today, wherever the chest came from.
 */
function openChestOn(s: State, key: string, gold: boolean, msgs: Msg[], auto = false): State {
  const d = dayOf(s, key);
  if (!d.chestReady || d.chest) return s;
  const since = s.chestsSinceLegendary ?? 0;
  const prize = rollChest(Math.random(), { gold, pity: since >= PITY_AFTER, luck: chestLuck(s) });
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
  if (prize.kind === 'gaming') next = patchDay(next, dayKey(), (x) => ({ ...x, bonusGameMin: x.bonusGameMin + prize.amount }));
  if (prize.kind === 'double_xp') next = { ...next, doubleXpUntil: Math.max(Date.now(), next.doubleXpUntil ?? 0) + prize.amount * MIN };
  if (prize.kind === 'boss_bomb') {
    const week = weekKeyOf();
    next = { ...next, bossBombs: { ...next.bossBombs, [week]: (next.bossBombs[week] ?? 0) + prize.amount } };
  }
  const text = auto
    ? L(next, 'chestAutoOpened', { prize: prize.text })
    : prize.kind === 'legendary'
      ? L(next, 'legendaryRoast')
      : L(next, 'chestOpened', { prize: prize.text });
  msgs.push({ text: prize.gold ? `✨ Gold chest! ${text}` : text, tone: 'epic' });
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
  // Golden lines are roasts too: none on a kind day, below level 4 or while the tone is turned down.
  if (!msgs.length || !goldenAllowed(s) || Math.random() >= GOLDEN_CHANCE) return s;
  const found = s.goldenFound ?? {};
  const fresh = GOLDEN.filter((g) => !found[g.id]);
  const g = (fresh.length ? fresh : GOLDEN)[Math.floor(Math.random() * (fresh.length || GOLDEN.length))];
  const text = fillLine(g.text, { name: s.settings.userName || 'boss' });
  msgs.push({ text: `✨ Golden line${fresh.length ? ` (${Object.keys(found).length + 1}/${GOLDEN.length})` : ''}: ${text}`, tone: 'epic' });
  return fresh.length ? { ...s, goldenFound: { ...found, [g.id]: Date.now() } } : s;
}

/** What the day's workout paid, for its line: the XP as credited (Double XP, rested share) and its bonus minutes (perks). */
const workoutVars = (s: State, key: string) => ({ xp: dayOf(s, key).xpBy?.workout ?? XP.workout, min: workoutBonusMin(s) });

/** The first training of the day counts as a workout: XP, bonus gaming time, counter. */
function startWorkout(s: State, msgs: Msg[]): State {
  const key = dayKey();
  if (dayOf(s, key).workoutCounted) return s;
  const at = msgs.length;
  const next = reward(bump(patchDay(s, key, (d) => ({ ...d, workoutCounted: true })), 'workouts'), msgs, XP.workout, workoutBonusMin(s), key, { ref: 'workout' });
  msgs.splice(at, 0, { text: L(next, 'gymStarted', workoutVars(next, key)), tone: 'epic' }); // ahead of any level-up it brings
  return comebackBonus(next, msgs, key);
}

/**
 * The first workout after a missed planned gym day (comeback.ts): XP and as many coins, bonus gaming minutes
 * and a guaranteed crit on the boss. Undoing the workout takes it all back (undoWorkout).
 */
function comebackBonus(s: State, msgs: Msg[], key = dayKey()): State {
  const missed = missedGymBefore(s);
  if (!missed || dayOf(s, key).comeback) return s;
  const dmg = critDamage(XP.workout);
  const next = patchDay(reward(s, msgs, COMEBACK.xp, COMEBACK.min, key, { ref: 'comeback' }), key, (d) => ({
    ...d,
    comeback: missed,
    critKeys: [...new Set([...(d.critKeys ?? []), 'comeback'])],
    critDamage: (d.critDamage ?? 0) + dmg,
    critBy: { ...d.critBy, comeback: { id: 'comeback', dmg } },
  }));
  // The line names the last workout, never the miss.
  const since = lastTrainedBefore(s);
  const day =
    since == null
      ? 'a while ago'
      : since >= dayKey(addDays(new Date(), -6))
        ? dayName(since)
        : new Date(`${since}T12:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
  msgs.push({ text: L(next, 'comebackWorkout', { day, min: COMEBACK.min, dmg }), tone: 'epic' });
  return next;
}

/**
 * The day's last set or activity was deleted: the workout it counted comes off the books, with its XP,
 * the counter and its bonus minutes. The workout quests reopen in run() (reopenQuests), like any undone quest.
 */
function undoWorkout(s: State, msgs: Msg[], key = dayKey()): State {
  const d = dayOf(s, key);
  if (!d.workoutCounted || trainedOn(d)) return s;
  let next = bump(patchDay(s, key, (x) => ({ ...x, workoutCounted: false })), 'workouts', -1);
  next = unreward(next, key, 'workout', XP.workout, workoutBonusMin(next));
  if (d.comeback) {
    next = unreward(next, key, 'comeback', COMEBACK.xp, COMEBACK.min);
    next = patchDay(next, key, (x) => ({ ...withoutCrit(x, 'comeback'), comeback: undefined }));
  }
  msgs.push({ text: 'Nothing logged for training today anymore, so the workout is off the books.', tone: 'info' });
  return next;
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
  /** When v1 stopped being written alongside v2 (1.4.0's updates did), kept in the index for the "older copy". */
  v1Until?: number;
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
  v1Until: undefined,
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

const TAB_PATHS = ['/', '/plan', '/gym', '/fuel', '/game'];
const isTab = (href: Href) => TAB_PATHS.includes((typeof href === 'string' ? href : href.pathname).split('?')[0]);

/**
 * Goes to a screen from anywhere. A tab pops back to the tabs already at the bottom of the stack (dismissTo),
 * because navigating or replacing from a stack screen put a second copy of all the tabs on top, with its own
 * timers, and Back had to get through both. Anything else is pushed as usual.
 */
export function goTo(href: Href) {
  if (isTab(href)) router.dismissTo(href);
  else router.navigate(href);
}

/** Opens a tapped notification's screen. On a cold start the navigator may still be mounting, so it retries for a few seconds. */
export function openSoon(href: Href, tries = 20) {
  try {
    goTo(href);
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
  /** Meals just deleted with ×, kept (with their photo file) until their Undo has had its chance. */
  const foodTrash = useRef(new Map<string, { entry: FoodEntry; day: string; xp: number }>());

  // ----- toasts -----
  const [toasts, setToasts] = useState<Toast[]>([]);
  // An if-then cue that just went off in the app (if-then.ts), shown with a Done button (CuePromptHost).
  const [cuePrompt, setCuePrompt] = useState<(CuePrompt & { text: string }) | null>(null);
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
  /** Applies the reminder-button and widget taps waiting in the queue (set further down, with applyReminder). */
  const drainRef = useRef<() => Promise<void>>(async () => {});

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
      const { pairs, gone, months } = rowsFor(s, d.days, d.months, { migratedAt: d.migratedAt, v1Until: d.v1Until });
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
    const { pairs, months } = rowsFor(s, null, [], { migratedAt });
    try {
      try {
        keepCopy('spider-state-v1.json', raw);
      } catch (e) {
        // Only an extra copy: the v1 row itself stays in storage untouched, so the move can go ahead.
        console.warn('[spider] no file copy of the v1 state', e);
      }
      if (!(await writeVerified(AsyncStorage, pairs))) throw new Error('read-back mismatch');
      Object.assign(d, { mode: 'v2', days: s.days, months, migratedAt, sizes: Object.fromEntries(pairs.map(([k, v]) => [k, utf8Bytes(v)])) });
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
        // The days as stored: anything hydrate() changed goes out with the next save. v1 written alongside until
        // now (1.4.0's updates) is as old as this load from here on.
        const v1Until = got.index.v1Until ?? (got.index.v1 ? Date.now() : undefined);
        Object.assign(d, { days: got.saved.days ?? {}, months: got.index.months, migratedAt: got.index.migratedAt, v1Until, sizes: got.sizes });
      } else if (got.source === 'v1') {
        if (got.newer) console.warn('[spider] v1 changed since the last v2 save (older code ran): moving it over again');
        await moveToV2(got.raw, next);
      }
      loaded.current = true;
      setLineMemory(next.lineMemory);
      if (got.source === 'v2' && next.days !== got.saved.days) commit(next);
      else {
        stateRef.current = next;
        setState(next);
      }
      // Taps queued while the app was closed come first: one from before midnight lands before the day rolls over.
      await drainRef.current();
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

  // Line picks change lines.ts's memory (each pool's deck), during renders too. It's saved with the state a
  // moment later, without a re-render: nothing on screen shows it, and re-rendering would only pick again.
  const lineSave = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () =>
      onLineMemory(() => {
        if (lineSave.current) return;
        lineSave.current = setTimeout(() => {
          lineSave.current = null;
          const mem = lineMemory();
          if (!loaded.current || stateRef.current.lineMemory === mem) return;
          stateRef.current = { ...stateRef.current, lineMemory: mem };
          if (saveTimer.current) clearTimeout(saveTimer.current);
          saveTimer.current = setTimeout(save, 400);
        }, 1500);
      }),
    [save],
  );

  /** A state picked on the recovery screen replaces whatever couldn't be read, and the app opens. */
  const adopt = useCallback(
    (s: State) => {
      Object.assign(disk.current, freshDisk(), { allowShrink: true });
      loaded.current = true;
      setLineMemory(s.lineMemory);
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
    /**
     * `quiet`: no golden line, rival remark, respect news or level-up toasts (body and photo logging stay neutral).
     * `early`: the change lands before the day rolls over, for a queued tap on a day that may not be closed yet:
     * its goals, medals and banked minutes then count it.
     */
    (fn: (s: State, msgs: Msg[]) => State, opts: { quiet?: boolean; early?: boolean } = {}) => {
      const prev = stateRef.current;
      const msgs: Msg[] = [];
      const quiet = !!opts.quiet;
      // An undo or a delete that took a finished quest back under its target opens it again, with its XP (quests.ts).
      const apply = (base: State) => {
        const reopen = reopenQuests(base, fn(base, msgs));
        if (reopen.reopened.length) msgs.push({ text: `🗡️ Open again: ${reopen.reopened.map((q) => q.title).join(', ')}.`, tone: 'info' });
        return reopen.state;
      };
      const changed = opts.early ? checkDayRollover(apply(prev), msgs) : apply(checkDayRollover(prev, msgs));
      const checked = checkCritters(prev, checkContract(checkQuests(checkTrekProgress(checkCoop(checkLeague(changed, msgs), msgs), msgs), msgs), msgs), msgs);
      // Crits and achievement XP land after the quests: the boss is checked again so they can finish it.
      const scored = checkBoss(checkAchievements(checked, msgs, quiet), msgs);
      // If-then cues that just happened in the app (if-then.ts): noted on the day, and the latest one prompts.
      const cued = checkCues(prev, scored);
      // Silk Track tiers wait for the next ordinary action after body or photo logging (no fanfare there).
      // The hour's running XP total is noted too, for the ghost of last week (xp-timeline.ts).
      const next = withXpHour(quiet ? checkDiary(cued.state, msgs) : checkRivalTalk(checkDiary(checkGolden(checkRespect(checkSilk(cued.state, msgs), msgs), msgs), msgs), msgs));
      commit(next);
      msgs.forEach((m) => say(m.text, m.tone, m.action));
      const cue = cued.prompts.at(-1);
      if (cue) setCuePrompt({ ...cue, text: L(next, 'ifThenCue', cueVars(cue.plan)) });
      // Earned bonus minutes mid-session move the gaming alerts (the session's own day, past midnight too).
      const playKey = next.activeGame ? dayKey(next.activeGame.start) : null;
      if (playKey && dayOf(next, playKey).bonusGameMin !== dayOf(prev, playKey).bonusGameMin) {
        void scheduleGameAlerts(next, gamingBudgetMin(next, playKey) - gamingUsedMs(next, playKey) / MIN);
      }
      return next;
    },
    [commit, say],
  );

  // ----- calendar -----
  const [calStatus, setCalStatus] = useState<CalStatus>(calendarSupported ? 'unknown' : 'unsupported');
  const [calendars, setCalendars] = useState<CalInfo[]>([]);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const eventsRef = useRef<CalEvent[]>([]);
  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

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
  const [healthMissing, setHealthMissing] = useState<string[]>([]); // asked for but not granted ("heart rate", "sleep")
  const watchSleep = useRef(false); // Health Connect is connected: last night's bedtime comes from the watch

  /**
   * Applies the watch's numbers: today's (awarding the step goal once), and the final ones for the past week.
   * A read that started before midnight holds yesterday's "today", so it only goes in as a past day, and a
   * failed steps read leaves today's steps as they were.
   */
  const applyHealth = useCallback(
    (data: HealthData) => {
      const s0 = stateRef.current;
      const key = dayKey();
      const current = data.key === key;
      const steps = current && data.stepsKnown ? data.steps : null;
      const today = dayOf(s0, key);
      const sleep = current ? syncedSleep(today, data.sleepMin) : today.sleepMin;
      const past = data.stepsWeek
        .filter((x) => x.key !== key)
        .map((x) => ({ key: x.key, steps: x.steps ?? 0, sleepMin: data.sleepWeek.find((y) => y.key === x.key)?.sleepMin ?? null }));
      const pastChanged = withPastHealth(s0, past) !== s0 || withNights(s0, data.nights, key) !== s0;
      const todayChanged = steps != null && (today.steps !== steps || (!today.stepGoalHit && steps >= s0.settings.stepGoal));
      if (!pastChanged && !todayChanged && today.sleepMin === sleep) return;
      run((s, msgs) => {
        let next = withNights(withPastHealth(s, past), data.nights, key);
        if (!current) return next;
        next = patchDay(next, key, (d) => ({ ...d, ...(steps != null ? { steps } : {}), sleepMin: sleep }));
        if (steps != null && !dayOf(s, key).stepGoalHit && steps >= s.settings.stepGoal) {
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
        watchSleep.current = status === 'connected';
        if (status !== 'connected') return;
        setHealthMissing(await missingHealthAccess().catch(() => []));
        const data = await readHealth();
        if (!data) return;
        // A failed steps read shows the last known number instead of 0.
        setHealth((prev) =>
          data.stepsKnown ? data : { ...data, steps: (prev?.key === data.key && prev.stepsKnown ? prev.steps : dayOf(stateRef.current, data.key).steps) ?? 0 },
        );
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
  /** Phone games played while the gaming timer ran are already in the timer: remembers how many minutes to take off. */
  const refreshGameOverlap = useCallback(async () => {
    const s0 = stateRef.current;
    const from = startOfDay().getTime();
    const now = Date.now();
    const sessions = [...dayOf(s0).games, ...(s0.activeGame ? [{ start: s0.activeGame.start, end: now }] : [])].filter((g) => g.end > from);
    if (!sessions.length || !s0.settings.phoneGamesCount) return;
    const games = new Set((await usageBetween(from, now)).filter((a) => a.isGame).map((a) => a.packageName));
    const overlap = games.size ? gamesInTimerMin(await spansBetween(from, now), games, sessions) : 0;
    if (overlap !== (dayOf(stateRef.current).phoneGamesInTimerMin ?? 0)) run((s) => patchDay(s, dayKey(), (d) => ({ ...d, phoneGamesInTimerMin: overlap })));
  }, [run]);

  const refreshScreen = useCallback(async () => {
    if (!screenTimeSupported) return;
    if (!hasUsageAccess()) {
      setScreenStatus('needs-permission');
      return;
    }
    setScreenStatus('connected');
    try {
      // One day for the whole refresh: a refresh that crosses midnight writes its numbers to the day it read.
      const dayStart = startOfDay();
      const key = dayKey(dayStart);
      const until = Math.min(Date.now(), addDays(dayStart, 1).getTime());
      const screen = screenDayOf(await usageBetween(dayStart.getTime(), until));
      const unlocks = await unlocksBetween(dayStart.getTime(), until);
      if (unlocks != null) screen.unlocks = unlocks;
      const old = dayOf(stateRef.current, key).screen;
      if (!old || old.totalMin !== screen.totalMin || old.top.length !== screen.top.length || old.unlocks !== screen.unlocks) {
        run((s) => patchDay(s, key, (d) => ({ ...d, screen })));
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
      // Last night's phone use in bed, read once a day after 05:00 (cluster F). It counts from the watch's bedtime
      // when that was later than the target, so with the watch connected it waits for last night's sleep (until
      // 10:00), and counts once more if the watch's bedtime arrives after a first count.
      const now = new Date();
      const nightKey = dayKey(now);
      const today = dayOf(stateRef.current, nightKey);
      const { bed: target, end } = nightWindow(now, stateRef.current.settings.sleepHour);
      const bed = inBedFrom(target, today.bedAt);
      const counted = today.night ? (today.night.from ?? target) : null;
      const waitForWatch = watchSleep.current && today.bedAt == null && now.getHours() < 10;
      if (now.getHours() >= 5 && counted !== bed && !waitForWatch) {
        const night = nightPhone(await spansBetween(bed, end), bed, end);
        run((s) => patchDay(s, nightKey, (d) => ({ ...d, night })));
      }
      await refreshGameOverlap();
    } catch (e) {
      console.warn('[spider] screen time failed', e);
    }
  }, [run, refreshGameOverlap]);
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
        if (needsPlaceInfo(place)) {
          // Saved before counties/municipalities were stored. A failed lookup mustn't stop the warnings below.
          const looked = place;
          const found = await withCounty(looked).catch(() => looked);
          if (found !== looked) {
            place = found;
            // Only onto the place that was looked up: one picked in Settings meanwhile keeps its own details.
            run((s) =>
              s.settings.weather && samePlace(s.settings.weather, looked)
                ? { ...s, settings: { ...s.settings, weather: { ...s.settings.weather, county: found.county, municipality: found.municipality } } }
                : s,
            );
          }
        }
        const county = place.county;
        const [a, smhi, vma] = await Promise.all([
          fetchAir(place).catch(() => null),
          county ? fetchSmhi(county).catch(() => null) : null,
          county ? fetchVma(county, place.name.split(',')[0], place.municipality).catch(() => null) : null,
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

  // ----- Friday evening: the weekend sleep drift from the owner's own data, once (just-in-time insight) -----
  useEffect(() => {
    if (!ready || !state.onboarded) return;
    const check = () => {
      const jit = jetlagRemark(stateRef.current);
      if (!jit) return;
      run((s, msgs) => {
        msgs.push({ text: L(s, 'jitJetlag', { finding: jit.finding }), tone: 'info' });
        return withJitSaid(s, 'social_jetlag');
      });
    };
    check();
    const every = setInterval(check, 10 * 60_000);
    return () => clearInterval(every);
  }, [ready, state.onboarded, tick, run]);

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
        // Queued taps first (see drainRef), then the tick that wakes up everything else, the day's rollover included.
        void drainRef.current().finally(() => setTick((t) => t + 1));
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

  // ----- automatic daily backup: off the startup path, at most one try a day -----
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
        if (r.skipped) {
          // The phone holds far fewer days than the last backup (a wipe?): the good backups stay as they are.
          say("💾 Skipped today's backup: it would hold far fewer days than the last one. Restore from it in Settings → Backup if your history is missing.", 'bad');
          return;
        }
        commit({ ...stateRef.current, lastBackupAt: Date.now() });
        // Daily and quiet: Settings shows when it last ran. The first one (just after picking the folder) says so.
        if (force) say(`💾 Backup saved${r.photos ? ` with ${r.photos} photo${r.photos === 1 ? '' : 's'}` : ''}. From now on it runs every day.`, 'info');
      } catch (e) {
        console.warn('[spider] auto backup failed', e);
        say("💾 The daily backup couldn't reach its folder. Pick it again in Settings → Backup.", 'bad');
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
  // A replan right away, for the queue while the app is in the background (the timer above waits for the foreground).
  const replanNow = useRef<() => Promise<void>>(async () => {});
  useEffect(() => {
    replanNow.current = async () => {
      if (notifReady && stateRef.current.onboarded) await replanNotifications(stateRef.current, events, weather, air);
    };
  }, [notifReady, events, weather, air]);

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

      /** A slipping workout moved to another free day this week (workout-move.ts): a rest day then, not a miss. */
      moveWorkout(from: string, to: string) {
        run((s, msgs) => {
          const next = withMove(s, from, to);
          if (next === s) return s;
          const workout = movedTo(next, to)?.name ?? 'Workout';
          msgs.push({ text: L(next, 'gymMoved', { workout, day: moveDayName(to) }), tone: 'info', action: { undo: { kind: 'move', id: from, day: from } } });
          return next;
        });
      },

      unmoveWorkout(from: string) {
        run((s) => withoutMove(s, from));
      },

      /** What got in the way of a moved workout, and (optionally) the coping plan it suggests, saved on that weekday. */
      noteMoveWhy(from: string, why: MoveWhy, savePlan = false) {
        run((s, msgs) => {
          let next = withWhy(s, from, why);
          const day = copingWeekday(next, from);
          const plan = copingPlan(next, why);
          const w = day == null ? null : next.plan[day];
          if (savePlan && day != null && w && plan) {
            next = { ...next, plan: { ...next.plan, [day]: { ...w, plan } } };
            msgs.push({ text: `🔗 Saved for ${WEEKDAYS_LONG[day]}s: ${planText(plan)}.`, tone: 'good' });
          } else if (why === 'sick') msgs.push({ text: '🫖 Then rest is the plan. If it turns into a sick day, sick mode keeps everything fair.', tone: 'info' });
          return next;
        });
      },

      // --- water ---
      /** `at`: when it was tapped, for taps applied later from the queue (silent buttons, widget). */
      addWater(ml: number, key?: string, at?: number) {
        const past = pastKey(key);
        const tapped = tappedOn(past, at);
        if (past && !tapped) {
          run((s, msgs) => {
            msgs.push(backdated(past, `💧 ${ml} ml`));
            return patchDay(s, past, (d) => ({ ...d, water: [...d.water, { id: uid(), ml, at: at ?? nowOn(past), late: true }] }));
          });
          return;
        }
        run(
          (s, msgs) => {
            const key = tapped ?? dayKey();
            const id = uid();
            let next = patchDay(s, key, (d) => ({ ...d, water: [...d.water, { id, ml, at: at ?? Date.now() }] }));
            const d = dayOf(next, key);
            const total = waterMl(d);
            const goal = waterGoalFor(next, key);
            // Undo is today's only: a tap from before midnight just counts.
            const undo: ToastAction | undefined = tapped ? undefined : { undo: { kind: 'water', id, day: key } };
            if (!d.waterGoalHit && total >= goal) {
              next = patchDay(next, key, (x) => ({ ...x, waterGoalHit: true }));
              msgs.push({
                text: `${L(next, 'waterGoal')} +${XP.waterGoal} XP · +${BONUS_MIN.waterGoal} min gaming`,
                tone: 'epic',
                action: undo,
              });
              // The glass is undoable; the goal it reached stays reached.
              next = reward(reward(next, msgs, XP.water, 0, key, { ref: `w:${id}` }), msgs, XP.waterGoal, BONUS_MIN.waterGoal, key);
              return hasPerk(next, 'hydro_glands') ? perkCoins(next, msgs, 25, '💧 Hydro Glands') : next;
            }
            msgs.push(tapped ? lateTap(key, `💧 ${ml} ml`) : { text: L(next, 'waterLogged', { ml, left: Math.max(0, goal - total) }), tone: 'good', action: undo });
            return reward(next, msgs, XP.water, 0, key, { ref: `w:${id}` });
          },
          { early: !!tapped },
        );
      },

      undoWater(key?: string) {
        const past = pastKey(key);
        if (past) {
          run((s) => patchDay(s, past, (d) => ({ ...d, water: d.water.slice(0, -1) })));
          return;
        }
        run((s, msgs) => {
          const key = dayKey();
          const last = dayOf(s, key).water.at(-1);
          if (!last) return s;
          const next = patchDay(s, key, (x) => withoutCrit({ ...x, water: x.water.slice(0, -1) }, last.id));
          msgs.push({ text: 'Undone. I saw that, though.', tone: 'info' });
          return unreward(next, key, `w:${last.id}`, XP.water);
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
          const id = uid();
          let next = patchDay(s, key, (d) => ({ ...d, food: [...d.food, { id, ...food, at: Date.now() }] }));
          const d = dayOf(next, key);
          next = reward(next, msgs, XP.food, 0, key, { ref: `f:${id}` });
          const undo: ToastAction = { undo: { kind: 'food', id, day: key } };
          if (!d.proteinGoalHit && s.settings.proteinGoal > 0 && proteinOf(d) >= s.settings.proteinGoal) {
            next = patchDay(next, key, (x) => ({ ...x, proteinGoalHit: true }));
            msgs.push({ text: `${L(next, 'proteinGoal')} +${XP.proteinGoal} XP`, tone: 'epic', action: undo });
            return reward(next, msgs, XP.proteinGoal, 0, key);
          }
          msgs.push({ text: L(next, food.photo ? 'mealPhoto' : 'foodLogged'), tone: 'good', action: undo });
          return next;
        });
      },

      updateFood(id: string, patch: { at?: number; name?: string; kcal?: number; protein?: number }, key = dayKey()) {
        run((s) => patchDay(s, key, (d) => ({ ...d, food: d.food.map((f) => (f.id === id ? { ...f, ...patch } : f)) })));
      },

      /** `undoable` (the × and the editor's Delete): a toast offers Undo, and the photo file waits until it's gone. */
      removeFood(id: string, key = dayKey(), undoable = false) {
        const entry = dayOf(stateRef.current, key).food.find((f) => f.id === id);
        if (!entry) return;
        if (undoable) {
          // What the delete takes back is what an undo pays again, so Double XP can't turn it into a farm.
          const xp = pastKey(key) ? 0 : (dayOf(stateRef.current, key).xpBy?.[`f:${id}`] ?? XP.food);
          foodTrash.current.set(id, { entry, day: key, xp });
          setTimeout(() => {
            if (foodTrash.current.delete(id)) deletePhoto(entry.photo);
          }, FOOD_UNDO_MS);
        } else deletePhoto(entry.photo);
        run((s, msgs) => {
          const next = patchDay(s, key, (d) => withoutCrit({ ...d, food: d.food.filter((f) => f.id !== id) }, id));
          if (undoable) msgs.push({ text: `🍽️ ${entry.name} deleted.`, tone: 'info', action: { undo: { kind: 'restoreFood', id, day: key } } });
          return pastKey(key) ? next : unreward(next, key, `f:${id}`, XP.food);
        });
      },

      // --- progress photos ---
      async addProgressPhoto(source: PhotoSource) {
        const uri = await getPhoto('progress', source);
        if (uri) actions.addProgressPhotoFrom(uri);
      },

      /** A progress photo already saved in the app's storage (e.g. shared from another app). */
      addProgressPhotoFrom(uri: string) {
        run(
          (s, msgs) => {
            const key = dayKey();
            const todayStart = startOfDay().getTime();
            // once a day, even if today's photo was deleted and taken again
            const firstToday = !dayOf(s, key).paid?.photo && !s.progressPhotos.some((p) => p.at >= todayStart);
            let next = { ...s, progressPhotos: [...s.progressPhotos, { id: uid(), uri, at: Date.now() }] };
            msgs.push({ text: L(next, 'progressPhoto') + (firstToday ? ` +${XP.progressPhoto} XP` : ''), tone: 'good' });
            if (!firstToday) return next;
            next = patchDay(next, key, (d) => ({ ...d, paid: { ...d.paid, photo: true } }));
            return reward(next, msgs, XP.progressPhoto, 0, key, { quiet: true });
          },
          { quiet: true },
        );
      },

      removeProgressPhoto(id: string) {
        deletePhoto(stateRef.current.progressPhotos.find((p) => p.id === id)?.uri);
        run((s) => ({ ...s, progressPhotos: s.progressPhotos.filter((p) => p.id !== id) }));
      },

      // --- coffee ---
      addCoffee(key?: string, at?: number) {
        const past = pastKey(key);
        const tapped = tappedOn(past, at);
        if (tapped) {
          // Tapped before midnight: on that day as it happened (coffee earns no XP either way).
          run(
            (s, msgs) => {
              msgs.push(lateTap(tapped, '☕ A coffee'));
              return patchDay(s, tapped, (d) => ({ ...d, coffee: [...coffeeOf(d), { id: uid(), mg: s.settings.caffeinePerCupMg, at: at as number }] }));
            },
            { early: true },
          );
          return;
        }
        if (past) {
          run((s, msgs) => {
            msgs.push(backdated(past, '☕ A coffee'));
            return patchDay(s, past, (d) => ({ ...d, coffee: [...coffeeOf(d), { id: uid(), mg: s.settings.caffeinePerCupMg, at: at ?? nowOn(past), late: true }] }));
          });
          return;
        }
        run((s, msgs) => {
          const key = dayKey();
          const { caffeinePerCupMg, coffeeLimit, coffeeCutoffHour } = s.settings;
          const when = at ?? Date.now();
          const id = uid();
          let next = patchDay(s, key, (d) => ({ ...d, coffee: [...coffeeOf(d), { id, mg: caffeinePerCupMg, at: when }] }));
          const d = dayOf(next, key);
          const vars = { n: coffeeOf(d).length, mg: caffeineMg(d), limit: coffeeLimit, cutoff: coffeeCutoffHour };
          // After the curfew, the owner's own data on what late coffee costs (once a day, never on a sick day).
          const jit = lateCoffeeRemark(next, when);
          const extra = jit ? ` ${L(next, 'jitLateCoffee', { finding: jit.finding, mg: jit.mg })}` : '';
          if (jit) next = withJitSaid(next, 'late_coffee');
          const action: ToastAction = { undo: { kind: 'coffee', id, day: key } };
          if (vars.n > coffeeLimit) msgs.push({ text: L(next, 'coffeeOver', vars) + extra, tone: 'bad', action });
          else if (new Date(when).getHours() >= coffeeCutoffHour) msgs.push({ text: L(next, 'coffeeLate', vars) + extra, tone: 'bad', action });
          else msgs.push({ text: L(next, 'coffeeLogged', vars), tone: 'info', action });
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
      /** `planB`: logged from a rainy day's plan B (if-then.ts), which gets its own line. */
      addActivity(kind: ActivityKind, minutes: number, planB = false) {
        run((s, msgs) => {
          const key = dayKey();
          const id = uid();
          let next = patchDay(s, key, (d) => ({
            ...d,
            activities: [...activitiesOf(d), { id, kind, minutes, at: Date.now() }],
          }));
          next = startWorkout(next, msgs);
          const line = planB ? L(next, 'planBDone', { minutes }) : L(next, 'activityLogged', { activity: activityInfo(kind).label, minutes });
          msgs.push({ text: line, tone: 'good' });
          return reward(next, msgs, activityXp(minutes), 0, key, { ref: `a:${id}` });
        });
      },

      updateActivity(id: string, patch: { minutes?: number; at?: number; kind?: ActivityKind }) {
        run((s, msgs) => {
          const old = activitiesOf(dayOf(s)).find((a) => a.id === id);
          if (!old) return s;
          const key = dayKey();
          const next = patchDay(s, key, (d) => ({ ...d, activities: activitiesOf(d).map((a) => (a.id === id ? { ...a, ...patch } : a)) }));
          const xp = activityXp(patch.minutes ?? old.minutes);
          if (xp === activityXp(old.minutes)) return next;
          // What the old length paid goes, what the new one pays comes: the same multipliers both ways.
          return reward(unreward(next, key, `a:${id}`, activityXp(old.minutes)), msgs, xp, 0, key, { ref: `a:${id}` });
        });
      },

      removeActivity(id: string) {
        run((s, msgs) => {
          const old = activitiesOf(dayOf(s)).find((a) => a.id === id);
          if (!old) return s;
          const key = dayKey();
          const next = patchDay(s, key, (d) => withoutCrit({ ...d, activities: activitiesOf(d).filter((a) => a.id !== id) }, id));
          return undoWorkout(unreward(next, key, `a:${id}`, activityXp(old.minutes)), msgs, key);
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
      /** `asked`: the emotion words were offered with it (the Mood screen), so "Want to name it?" won't ask again. */
      logMood(level: MoodLevel, emotions: string[], note: string, key?: string, at?: number, asked = false) {
        const past = pastKey(key);
        const tapped = tappedOn(past, at);
        const offered = asked ? { asked: true as const } : {};
        if (past && !tapped) {
          run((s, msgs) => {
            msgs.push(backdated(past, `${moodInfo(level).emoji} A check-in`));
            const entry = { id: uid(), level, emotions, note: note.trim() || undefined, at: at ?? nowOn(past), late: true, ...offered };
            return patchDay(s, past, (d) => ({ ...d, moods: [...moodsOf(d), entry] }));
          });
          return;
        }
        run(
          (s, msgs) => {
            const key = tapped ?? dayKey();
            const d0 = dayOf(s, key);
            const paid = d0.paid?.mood ?? moodsOf(d0).length; // check-ins already paid that day, deleted ones included
            const entry = { id: uid(), level, emotions, note: note.trim() || undefined, at: at ?? Date.now(), ...offered };
            let next = patchDay(s, key, (d) => ({ ...d, moods: [...moodsOf(d), entry] }));
            msgs.push(tapped ? lateTap(key, `${moodInfo(level).emoji} A check-in`) : { text: L(next, moodInfo(level).line), tone: level <= 2 ? 'info' : 'good' });
            // XP for the first three check-ins a day, so it can't be farmed.
            if (paid >= 3) return next;
            next = patchDay(next, key, (d) => ({ ...d, paid: { ...d.paid, mood: paid + 1 } }));
            return reward(next, msgs, XP.mood, 0, key);
          },
          { early: !!tapped },
        );
      },

      removeMood(id: string, key = dayKey()) {
        run((s) => patchDay(s, key, (d) => withoutCrit({ ...d, moods: moodsOf(d).filter((m) => m.id !== id) }, id)));
      },

      /** "Want to name it?": the words picked for a low check-in (none when skipped). Asked once either way. */
      nameMood(id: string, words: string[], key = dayKey()) {
        run((s) => patchDay(s, key, (d) => ({ ...d, moods: moodsOf(d).map((m) => (m.id === id ? withNamed(m, words) : m)) })), { quiet: true });
      },

      /** Fixes a check-in's mood, emotions or note. Its time and XP stay as they were. */
      updateMood(id: string, patch: { level: MoodLevel; emotions: string[]; note: string }, key = dayKey()) {
        run((s) =>
          patchDay(s, key, (d) => ({
            ...d,
            moods: moodsOf(d).map((m) => (m.id === id ? { ...m, level: patch.level, emotions: patch.emotions, note: patch.note.trim() || undefined, asked: true } : m)),
          })),
        );
      },

      // --- gym ---
      logSet(exercise: string, weight: number, reps: number) {
        const next = run((s, msgs) => {
          const key = dayKey();
          const name = exercise.trim();
          const id = name.toLowerCase();
          const setId = uid();
          const firstOfDay = !dayOf(s, key).workoutCounted;
          // A record beats every earlier day, once per exercise a day: ramping up through today's sets isn't one.
          const isPR = isRecord(s, key, name, weight);
          const paidSets = Object.keys(dayOf(s, key).xpBy ?? {}).filter((k) => k.startsWith('s:')).length;
          let next = patchDay(s, key, (d) => ({
            ...d,
            workoutCounted: true,
            sets: [...d.sets, { id: setId, exercise: name, weight, reps, at: Date.now() }],
          }));
          if (s.prs[id] === undefined || weight > s.prs[id]) next = { ...next, prs: { ...next.prs, [id]: weight } };

          const undo: ToastAction = { undo: { kind: 'set', id: setId, day: key } };
          if (firstOfDay) {
            const at = msgs.length;
            next = reward(bump(next, 'workouts'), msgs, XP.workout, workoutBonusMin(next), key, { ref: 'workout' });
            msgs.splice(at, 0, { text: L(next, 'gymStarted', workoutVars(next, key)), tone: 'epic', ...(isPR ? {} : { action: undo }) });
            next = comebackBonus(next, msgs, key);
          }
          // Each part is recorded so deleting the set takes back exactly it (and the record, if it was one).
          // Sets past the day's cap still count as training, just without XP (no boss or league damage from junk sets).
          if (paidSets < SET_XP_DAILY) next = reward(next, msgs, XP.set, 0, key, { ref: `s:${setId}` });
          if (isPR) {
            next = bump(next, 'prs');
            msgs.push({ text: `🔥 ${L(next, 'gymPR', { exercise: name, weight })} +${XP.pr} XP`, tone: 'epic', action: undo });
            next = reward(next, msgs, XP.pr, 0, key, { ref: `pr:${setId}` });
          } else if (!firstOfDay) {
            msgs.push({ text: L(next, 'gymSet', { weight, reps, exercise: name }), tone: 'good', action: undo });
          }
          if (s.settings.restSeconds > 0) next = { ...next, restEndsAt: Date.now() + s.settings.restSeconds * 1000 };
          return next;
        });
        if (next.restEndsAt) void scheduleRestDone(next, next.restEndsAt);
      },

      removeSet(id: string) {
        const resting = stateRef.current.restEndsAt != null;
        run((s, msgs) => {
          const key = dayKey();
          const set = dayOf(s, key).sets.find((x) => x.id === id);
          if (!set) return s;
          let next = patchDay(s, key, (d) => withoutCrit({ ...d, sets: d.sets.filter((x) => x.id !== id) }, id));
          // Only what it was paid: a set past the day's XP cap got nothing.
          if (dayOf(s, key).xpBy?.[`s:${id}`] != null) next = unreward(next, key, `s:${id}`, XP.set);
          // A record set taken back: its XP and the record count go too, so logging it again isn't a second record.
          if (dayOf(s, key).xpBy?.[`pr:${id}`] != null) next = bump(unreward(next, key, `pr:${id}`, XP.pr), 'prs', -1);
          // The rest that the latest set started goes with it.
          if (s.restEndsAt != null && dayOf(s, key).sets.every((x) => x.at <= set.at)) next = { ...next, restEndsAt: null };
          return undoWorkout(recomputePr(next, set.exercise), msgs, key);
        });
        if (resting && stateRef.current.restEndsAt == null) void cancelRestDone();
      },

      /**
       * Fixes a typo in one of today's sets. The record follows the new numbers and no XP changes hands,
       * except that a set fixed down to no longer be a record gives its record XP back.
       */
      updateSet(id: string, patch: { weight: number; reps: number }) {
        run((s) => {
          const key = dayKey();
          const set = dayOf(s, key).sets.find((x) => x.id === id);
          if (!set) return s;
          let next = patchDay(s, key, (d) => ({ ...d, sets: d.sets.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
          const best = bestBeforeDay(s, set.exercise, key);
          if (dayOf(s, key).xpBy?.[`pr:${id}`] != null && best !== undefined && patch.weight <= best) {
            next = bump(unreward(next, key, `pr:${id}`, XP.pr), 'prs', -1);
          }
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
          // Near bedtime, the owner's own data on late gaming (once a day, never on a sick day).
          const jit = lateGameRemark(s);
          const extra = jit ? ` ${L(s, 'jitLateGame', { finding: jit.finding })}` : '';
          msgs.push(
            remainingMin > 0
              ? { text: named + L(s, 'gameStart', { left: fmtDuration(remainingMin * MIN) }) + extra, tone: 'info' }
              : { text: named + L(s, 'gameStartOver') + extra, tone: 'bad' },
          );
          const started = { ...s, activeGame: { start: Date.now(), game: name } };
          return jit ? withJitSaid(started, 'late_game') : started;
        });
        void scheduleGameAlerts(next, remainingMin);
      },

      /** Names (or renames) the game of the running session. */
      setGame(game: string) {
        const s0 = stateRef.current;
        if (!s0.activeGame) return;
        const next = run((s) => (s.activeGame ? { ...s, activeGame: { ...s.activeGame, game: game.trim() || undefined } } : s));
        const key = dayKey(s0.activeGame.start); // a session past midnight keeps its start day's budget
        void scheduleGameAlerts(next, gamingBudgetMin(next, key) - gamingUsedMs(next, key) / MIN);
      },

      /**
       * Ends the running session, charged to the day it started (past midnight too). `endAt` and `capped`:
       * a forgotten timer stopped at its cap (gameCapAt) instead of now.
       */
      stopGame(endAt?: number, capped = false) {
        const s0 = stateRef.current;
        if (!s0.activeGame) return;
        const start = s0.activeGame.start;
        const game = s0.activeGame.game;
        const end = Math.max(start, Math.min(typeof endAt === 'number' ? endAt : Date.now(), Date.now()));
        const key = dayKey(start);
        const budgetMs = gamingBudgetMin(s0, key) * MIN;
        const usedBefore = gamingUsedMs({ ...s0, activeGame: null }, key);
        const dur = end - start;
        run((s, msgs) => {
          let next = patchDay({ ...s, activeGame: null }, key, (d) => ({ ...d, games: [...d.games, { start, end, game }] }));
          const overMs = Math.min(dur, usedBefore + dur - budgetMs);
          const penalty = gamePenalty(overMs);
          if (capped) msgs.push({ text: L(next, 'gameCapped', { time: fmtTime(end) }), tone: 'info' });
          if (penalty && sickOn(s, key)) {
            msgs.push({ text: `Session ended after ${fmtDuration(dur)}. Rest up.`, tone: 'info' });
          } else if (penalty) {
            msgs.push({ text: L(next, 'gameStopBad', { over: fmtDuration(overMs), penalty }), tone: 'bad' });
            next = penalize(next, key, penalty);
          } else if (capped) {
            // the capped message said it all
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
          const today = dayKey();
          if (!task.done) {
            const back = recheckDay(s, id, today);
            if (back) {
              // Done again after being unchecked: it goes back to the day it was first done, for its plain XP only (tasks.ts).
              msgs.push({ text: `✅ Back to done. It counts for ${dayName(back)}, when you finished it.`, tone: 'info', action: { undo: { kind: 'task', id, day: back } } });
              return recheckTask(s, id, today);
            }
            const now = Date.now();
            const tasks = s.tasks.map((t) => (t.id === id ? { ...t, done: true, doneAt: now, firstDoneAt: t.firstDoneAt ?? now } : t));
            const age = taskAgeDays(task);
            const undo: ToastAction = { undo: { kind: 'task', id, day: today } };
            if (age >= IMMORTAL_DAYS) msgs.push({ text: L(s, 'immortalSlain', { task: task.title, days: age }), tone: 'epic', action: undo });
            else msgs.push({ text: L(s, 'taskDone'), tone: 'good', action: undo });
            return reward(recordTask(bump({ ...s, tasks }, 'tasksDone'), id, today, now), msgs, XP.task, BONUS_MIN.task, today, { ref: `t:${id}` });
          }
          return uncheckTask(s, id, today);
        });
      },

      deleteTask(id: string) {
        run((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) }));
      },

      /**
       * A toast's Undo: takes back the one entry it announced, with exactly what that entry was paid
       * (unreward). Only today's entries, only while they're still there. A task can be an earlier day's
       * ("Back to done"): toggleTask finds its day itself.
       */
      undo(ref: UndoRef) {
        const s = stateRef.current;
        if (ref.kind === 'move') {
          actions.unmoveWorkout(ref.id);
          return;
        }
        if (ref.kind === 'restoreFood') {
          // A deleted meal, on whichever day it was: back in place, with exactly the XP the delete took.
          const trashed = foodTrash.current.get(ref.id);
          if (!trashed || !foodTrash.current.delete(ref.id)) return;
          run((x) => {
            const next = patchDay(x, trashed.day, (d) => ({ ...d, food: [...d.food, trashed.entry].sort((a, b) => a.at - b.at) }));
            if (!trashed.xp) return next;
            // Not an undo any more, so the XP log stops listing it as one.
            return patchDay(credit(next, trashed.day, trashed.xp, 0, `f:${ref.id}`), trashed.day, (d) => ({ ...d, xpUndone: Math.max(0, (d.xpUndone ?? 0) - trashed.xp) }));
          });
          return;
        }
        if (ref.kind !== 'task' && ref.day !== dayKey()) return;
        const d = dayOf(s, ref.day);
        if (ref.kind === 'water') {
          if (!d.water.some((w) => w.id === ref.id)) return;
          run((x, msgs) => {
            const next = patchDay(x, ref.day, (y) => withoutCrit({ ...y, water: y.water.filter((w) => w.id !== ref.id) }, ref.id));
            msgs.push({ text: 'Undone. I saw that, though.', tone: 'info' });
            return unreward(next, ref.day, `w:${ref.id}`, XP.water);
          });
        } else if (ref.kind === 'coffee') {
          if (coffeeOf(d).some((c) => c.id === ref.id)) actions.removeCoffee(ref.id, ref.day);
        } else if (ref.kind === 'food') {
          if (d.food.some((f) => f.id === ref.id)) actions.removeFood(ref.id, ref.day);
        } else if (ref.kind === 'set') {
          if (d.sets.some((x) => x.id === ref.id)) actions.removeSet(ref.id);
        } else if (s.tasks.find((t) => t.id === ref.id)?.done) actions.toggleTask(ref.id);
      },

      /** "Too far" on a toast: that line is retired for good, and today's tone goes down a step. */
      retireLine(id: string) {
        banLine(id);
        run((s, msgs) => {
          const key = dayKey();
          const steps = s.toneEase?.day === key ? s.toneEase.steps + 1 : 1;
          const next = { ...s, toneEase: { day: key, steps }, lineMemory: lineMemory() };
          msgs.push({ text: L(next, 'lineRetired'), tone: 'info' });
          return next;
        });
      },

      /** Settings: lets a retired line come back. */
      unretireLine(id: string) {
        unbanLine(id);
        commit({ ...stateRef.current, lineMemory: lineMemory() });
      },

      /** HQ's Wrapped and season banners: closed for that month or season. */
      /** The rough-patch card closed, or one of its offers taken: it stays away for a week (rough-patch.ts). */
      closeRoughPatch() {
        commit({ ...stateRef.current, roughPatchAt: Date.now() });
      },

      dismissBanner(key: string) {
        const s = stateRef.current;
        if ((s.dismissed ?? []).includes(key)) return;
        commit({ ...s, dismissed: [...(s.dismissed ?? []), key].slice(-20) });
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
          const week = weekKeyOf();
          if (done.includes(id)) {
            let next = unreward(patchDay(s, key, (d) => withoutCrit({ ...d, habits: done.filter((x) => x !== id) }, id)), key, `h:${id}`, XP.habit);
            // The top-of-range bonus goes with the check that earned it (and can be earned again).
            if (s.rangeTop?.[id] === week && dayOf(next, key).xpBy?.[`rt:${id}`] != null) {
              next = unreward(next, key, `rt:${id}`, RANGE_TOP_XP);
              next = { ...next, rangeTop: Object.fromEntries(Object.entries(next.rangeTop ?? {}).filter(([k]) => k !== id)) };
            }
            return next;
          }

          const name = `${habit.emoji} ${habit.name}`;
          let next = patchDay(s, key, (d) => ({ ...d, habits: [...done, id] }));
          msgs.push({ text: L(next, 'habitDone', { habit: name }), tone: 'good' });
          next = reward(next, msgs, XP.habit, 0, key, { ref: `h:${id}` });
          // If-then: done soon after its cue counts as on cue, once a day (a total). At ON_CUE_RETIRE the clock reminder retires.
          const doneKey = `done:${id}`;
          if (habit.plan && dayOf(next, key).cues?.[doneKey] == null && onCueNow(next, habit, new Date(), eventsRef.current)) {
            const n = (habit.plan.onCue ?? 0) + 1;
            next = patchDay(next, key, (d) => ({ ...d, cues: { ...d.cues, [doneKey]: Date.now() } }));
            next = { ...next, habits: next.habits.map((h) => (h.id === id && h.plan ? { ...h, plan: { ...h.plan, onCue: n } } : h)) };
            msgs.push({ text: L(next, n === ON_CUE_RETIRE ? 'ifThenRetired' : 'ifThenDone', { n, habit: name }), tone: 'good' });
          }
          // A weekly range: its low end is the week's win; the top end pays a small bonus, once a week.
          const w = rangeWeek(next, habit);
          if (w && w.target > 0) {
            const vars = { habit: name, done: rangeText(w), xp: RANGE_TOP_XP };
            if (w.done >= w.max && next.rangeTop?.[id] !== week) {
              next = { ...next, rangeTop: { ...next.rangeTop, [id]: week } };
              msgs.push({ text: L(next, 'rangeWeekTop', vars), tone: 'epic' });
              next = reward(next, msgs, RANGE_TOP_XP, 0, key, { ref: `rt:${id}` });
            } else if (w.done === w.target) msgs.push({ text: L(next, 'rangeWeekMin', vars), tone: 'good' });
          }
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

      // --- morning quest draft: pick 3 of the 5 on offer, until noon ---
      draftQuests(ids: string[]) {
        run((s, msgs) => {
          if (!draftOpen(s) || !validDraft(s, ids)) return s;
          const next = patchDay(s, dayKey(), (d) => ({
            ...d,
            quests: ids,
            questDraft: d.questDraft ? { ...d.questDraft, locked: true } : undefined,
            questFocus: d.questFocus && ids.includes(d.questFocus.id) ? d.questFocus : undefined,
          }));
          msgs.push({ text: `🗡️ ${L(next, 'questsLocked')}`, tone: 'info' });
          return next;
        });
      },
      /** Hides last week's boss recap on HQ (it stays in the Bestiary). */
      seenBossRecap(week: string) {
        run((s) => (s.bossRecapSeen === week ? s : { ...s, bossRecapSeen: week }));
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
          const next = pauseEnded(s);
          if (next === s) return s;
          msgs.push({ text: `${L(next, 'pauseOff')} Today stays easy; it all counts again from tomorrow.`, tone: 'info' });
          return next;
        });
      },

      // --- loot chest & shop ---
      /** Opens the oldest chest on the shelf (or the one earned on `key`). Returns the day it came from. */
      openChest(key?: string) {
        let opened: string | null = null;
        run((s, msgs) => {
          const c = chestShelf(s).find((x) => !key || x.key === key);
          if (!c) return s;
          opened = c.key;
          return openChestOn(s, c.key, c.gold, msgs);
        });
        return opened;
      },

      buyItem(id: ShopItemId) {
        run((s, msgs) => {
          const item = SHOP_ITEMS.find((i) => i.id === id);
          if (!item) return s;
          const cost = shopPrice(id, s.perks);
          const boss = bossFor(s);
          if (id === 'bomb' && boss.defeated) {
            msgs.push({ text: L(s, 'bombNoBoss', { boss: boss.name }), tone: 'info' });
            return s;
          }
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

      /** Starts a trek on `route` at 0 km (a new one replaces the old: what it paid stays earned). Steps from now on count. */
      startTrek(route: TrekRoute) {
        run((s) => ({ ...s, trek: newTrek(route, dayKey(), s.trek?.stepM, dayOf(s).steps ?? 0) }));
      },

      /** The trek's step length in metres: the whole walk is counted again with it, waypoints already paid stay paid. */
      setTrekStep(stepM: number) {
        run((s) => (s.trek ? { ...s, trek: { ...s.trek, stepM: Math.max(0.4, Math.min(1.2, Math.round(stepM * 100) / 100)) } } : s));
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
          const key = eveningKey(); // after midnight still counts as "tonight"
          const done = dayOf(s, key).windDown ?? [];
          const list = done.includes(item) ? done.filter((x) => x !== item) : [...done, item];
          let next = patchDay(s, key, (d) => ({ ...d, windDown: list }));
          if (!dayOf(s, key).windDownDone && s.windDownItems.every((i) => list.includes(i))) {
            next = patchDay(next, key, (d) => ({ ...d, windDownDone: true }));
            msgs.push({ text: L(next, 'windDownDone'), tone: 'epic' });
            next = reward(next, msgs, XP.windDown, 0, key);
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
        run(
          (s, msgs) => {
            const key = dayKey();
            const todayStart = startOfDay().getTime();
            // once a day, even if today's entry was deleted and logged again
            const first = !dayOf(s, key).paid?.body && !s.bodyLog.some((b) => b.at >= todayStart);
            let next = { ...s, bodyLog: [...s.bodyLog, { ...values, id: uid(), at: Date.now() }] };
            msgs.push({ text: L(next, 'bodyLogged'), tone: 'info' });
            if (!first) return next;
            next = patchDay(next, key, (d) => ({ ...d, paid: { ...d.paid, body: true } }));
            return reward(next, msgs, XP.body, 0, key, { quiet: true });
          },
          { quiet: true },
        );
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

      /** The data as one file through the share sheet (Drive, mail…): a copy off the phone. Photos stay out. */
      async shareBackup() {
        if (!(await Sharing.isAvailableAsync())) return say('Sharing is not available on this phone.', 'info');
        await Sharing.shareAsync(shareableBackup(stateRef.current), { mimeType: 'application/json', dialogTitle: 'Send your S.P.I.D.E.R. backup' });
        commit({ ...stateRef.current, lastSharedAt: Date.now() });
      },

      /** Picks the folder for automatic daily backups and writes the first one right away. */
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

      /** Advent Web: opens door `n` (coins or a cosmetic, never XP). Missed doors stay openable (advent.ts). */
      openAdventDoor(n: number) {
        run((s, msgs) => {
          const r = openDoor(s, n);
          if (!r) return s;
          msgs.push({ text: L(r.state, 'adventDoor', { n, reward: r.reward }), tone: r.prize.cosmetic ? 'epic' : 'good' });
          return r.state;
        });
      },

      /** Julfrid: away mode until the 27th, within the month's cap of paused days (advent.ts). */
      startJulfrid() {
        run((s, msgs) => {
          const next = julfridPause(s);
          if (next === s) {
            msgs.push({ text: 'This month already has 7 paused days, so Julfrid stays a normal holiday. Still no roasts.', tone: 'info' });
            return s;
          }
          msgs.push({ text: L(next, 'julfridOn'), tone: 'good' });
          return next;
        });
      },

      /** The S.P.I.D.E.R. Prizes: accepted once a year, for a cosmetic medal (prizes.ts). */
      acceptPrizes() {
        run((s, msgs) => {
          const year = new Date().getFullYear();
          const r = acceptPrizes(s, year);
          if (!r) return s;
          msgs.push({ text: L(r.state, 'prizesAccepted', { reward: r.reward }), tone: 'epic' });
          return { ...r.state, dismissed: [...(r.state.dismissed ?? []), `prizes:${year}`].slice(-20) };
        });
      },

      /** Picks a backup folder (or one backup file) and replaces everything with it. Caller confirms first. True once restored. */
      async restore(from: 'folder' | 'file' = 'folder') {
        const result = from === 'file' ? await readBackupFromFile() : await readBackup();
        if (!result) return false;
        await cancelEverything();
        disk.current.allowShrink = true; // a backup may hold fewer days than the phone
        const back = restored(result.state);
        setLineMemory(back.lineMemory);
        commit(back);
        say(`Restored backup from ${new Date(result.createdAt).toLocaleString('sv-SE').slice(0, 16)} (${result.photos} photos). Welcome back.`, 'epic');
        return true;
      },

      async resetAll() {
        await cancelEverything();
        deleteAllPhotos();
        disk.current.allowShrink = true;
        setLineMemory(undefined);
        commit(defaultState());
      },
    }),
    [run, commit, say, refreshHealth, runAutoBackup],
  );

  // ----- tapped notifications: the body opens its screen; reminder buttons ("+1 glass", "Snooze 30 min", habit "Done", mood) do their thing -----
  // Taps on those buttons and on the widget while the app isn't on screen wait in a queue (pending-actions.ts, APK 1.5.0+).
  const applyReminder = useCallback(
    (a: ReminderAction) => {
      const s = stateRef.current;
      if (a.kind === 'glass') actions.addWater(s.settings.glassMl, a.day, a.at);
      else if (a.kind === 'coffee') actions.addCoffee(a.day, a.at);
      else if (a.kind === 'snooze') {
        void snoozeWater(s);
        say(L(s, 'waterSnoozed'), 'info');
      } else if (a.kind === 'habit') {
        if (habitsDone(s, a.day).includes(a.habitId) || !s.habits.some((h) => h.id === a.habitId)) return;
        if (a.day === dayKey()) actions.toggleHabit(a.habitId);
        else if (tappedOn(a.day, a.at)) {
          // Tapped before midnight, applied after: it counts on its day, with its XP (no on-cue or range extras).
          run(
            (x, msgs) => {
              const h = x.habits.find((y) => y.id === a.habitId);
              msgs.push(lateTap(a.day, `📌 ${h ? `${h.emoji} ${h.name}` : 'A habit'}`));
              return reward(patchDay(x, a.day, (d) => ({ ...d, habits: [...habitsDone(x, a.day), a.habitId] })), msgs, XP.habit, 0, a.day, { ref: `h:${a.habitId}` });
            },
            { early: true },
          );
        } else {
          // "Done" on yesterday's reminder, tapped after midnight: back-dated like other late entries.
          run((x, msgs) => {
            msgs.push(backdated(a.day, '📌 A habit'));
            return patchDay(x, a.day, (d) => ({ ...d, habits: [...habitsDone(x, a.day), a.habitId] }));
          });
        }
      } else if (a.kind === 'focus') {
        if (!s.activeFocus) actions.startFocus(25);
      } else if (a.kind === 'gymMove') {
        // "Move it" on the slipping-workout reminder: to the day it named, or the first one still free.
        const targets = moveTargets(s, a.day);
        const to = a.to && targets.includes(a.to) ? a.to : targets[0];
        if (to) actions.moveWorkout(a.day, to);
        openSoon('/gym');
      } else actions.logMood(a.level, [], '', a.day, a.at);
    },
    [actions, run, say],
  );
  useEffect(() => {
    if (!ready) return;
    return onNotificationTap(applyReminder, openSoon);
  }, [ready, applyReminder]);
  // The queue (pending-actions.ts): applied and saved before it lets go of the taps. In the background RN stops this
  // runtime's timers once the task that woke it ends, so the save, the replan and the widget can't wait for theirs.
  // Drained on load and on coming back (before the day rolls over), and while the task waits (onQueued).
  useEffect(() => {
    drainRef.current = () =>
      drainQueued(
        async (q) => {
          q.forEach(applyReminder);
          await saveNow().catch(() => save()); // a failed save keeps retrying (and says so)
        },
        () => pushWidgetFor(stateRef.current),
      )
        .then(async (n) => {
          if (n && AppState.currentState !== 'active') await replanNow.current();
        })
        .catch((e) => console.warn('[spider] queue failed', e));
  }, [applyReminder, saveNow, save]);
  useEffect(() => {
    if (!ready) return;
    return onQueued(() => drainRef.current()); // the background task ran while the app was alive
  }, [ready]);
  // ----- if-then prompts (if-then.ts): Done checks the habit (or, for a gym plan, opens Gym); plan B logs the workout -----
  const cueDone = useCallback(() => {
    const p = cuePrompt;
    setCuePrompt(null);
    if (!p) return;
    if (!p.habit) goTo('/gym');
    else if (!habitsDone(stateRef.current).includes(p.habit.id)) actions.toggleHabit(p.habit.id);
  }, [cuePrompt, actions]);
  const cueLater = useCallback(() => setCuePrompt(null), []);
  const planB = planBToday(state, weather);
  const planBDone = useCallback(() => {
    const b = planBToday(stateRef.current, weather);
    if (b) actions.addActivity('free_weights', b.minutes, true);
  }, [actions, weather]);

  const getState = useCallback(() => stateRef.current, []);
  const addSeen = useCallback((seen: Record<string, number>) => run((s) => ({ ...s, seenAlerts: { ...seen, ...s.seenAlerts } })), [run]);
  useBackgroundSync({ ready, state, getState, addSeen });

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

  // A forgotten gaming timer stops itself at its cap (selectors gameCapAt); checked again whenever the app comes back.
  const gameStart = state.activeGame?.start;
  useEffect(() => {
    if (!ready || gameStart == null) return;
    const cap = gameCapAt(stateRef.current, gameStart);
    const ms = cap - Date.now();
    if (ms <= 0) {
      actions.stopGame(cap, true);
      return;
    }
    const t = setTimeout(() => actions.stopGame(cap, true), Math.min(ms, 2_147_000_000));
    return () => clearTimeout(t);
  }, [ready, gameStart, tick, actions]);

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
    cue: { prompt: cuePrompt, done: cueDone, later: cueLater },
    planB: { today: planB, done: planBDone },
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
      missing: healthMissing, // permissions asked for but not granted, e.g. ["heart rate"]
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
