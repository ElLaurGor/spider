import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { router, type Href } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Updates from 'expo-updates';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { createBackup, readBackup } from './backup';
import { THEMES } from '@/constants/theme';

import { activityInfo } from './body';
import { calendarPermission, calendarSupported, loadCalendars, loadEvents } from './calendar';
import { coinsFor, rollChest, SHOP_ITEMS, type ShopItemId } from './economy';
import { stageFor, themesUnlockedBetween } from './evolution';
import { addDays, dayKey, fmtDuration, MIN, startOfDay, uid, WEEKDAYS_LONG } from './dates';
import { defaultState, hydrate } from './defaults';
import { connectHealth, healthStatus, healthSupported, readHealth, type HealthData, type HealthStatus } from './health';
import { habitsDone, habitsFor } from './habits';
import { newLeague, settle, TIERS, weekKeyOf } from './league';
import { fillLine, freshLine, GOLDEN, GOLDEN_CHANCE, type LineKey } from './lines';
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
import { bossFor, pickQuests, questsFor } from './quests';
import { canSign, contractProgress, goalOf, roughWeek } from './contracts';
import { respectFor } from './respect';
import { isSnow, seasonOn, winterOf } from './seasons';
import { focusBreaker, hasUsageAccess, isDoomscroll, screenTimeSupported, usageBetween } from './screentime';
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
import { dayWeatherOf, fetchWeather, fetchWeatherHistory, withCounty, type Weather } from './weather';
import { ALERT_LABEL, fetchAir, fetchSmhi, fetchVma, type Air, type Alert } from './outside';
import { ACHIEVEMENTS, activityXp, BONUS_MIN, focusXp, levelForXp, SECRET_ACHIEVEMENTS, SECRET_COINS, titleFor, XP } from './xp';

const STORAGE_KEY = 'spider:state:v1';

export type Tone = 'info' | 'good' | 'bad' | 'epic';
export type Toast = { id: number; text: string; tone: Tone };
type Msg = { text: string; tone: Tone };

// ---------- pure state helpers ----------

const L = (s: State, key: LineKey, vars: Record<string, string | number> = {}) =>
  freshLine(key, effectiveSavage(s), { name: s.settings.userName || 'boss', ...vars });

const patchDay = (s: State, key: string, fn: (d: DayLog) => DayLog): State => ({
  ...s,
  days: { ...s.days, [key]: fn(dayOf(s, key)) },
});

/** A past day's key, or null for today. Back-dated entries earn no XP (and remove none); goal rewards stay today's. */
const pastKey = (key?: string) => (key && key !== dayKey() ? key : null);

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
  const xp = rawXp > 0 && s.doubleXpUntil && Date.now() < s.doubleXpUntil ? rawXp * 2 : rawXp;
  const coins = coinsFor(xp);
  let next: State = { ...s, xp: Math.max(0, s.xp + xp), coins: s.coins + coins, coinsEarned: s.coinsEarned + coins };
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
  if (!dayOf(next, key).quests) next = patchDay(next, key, (d) => ({ ...d, quests: pickQuests(next) }));

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

  const boss = bossFor(next);
  if (!boss.defeated && boss.hp <= 0) {
    next = bump({ ...next, bossesDefeated: { ...next.bossesDefeated, [boss.key]: boss.id } }, 'bosses');
    const season = seasonOn();
    if (season) next = { ...next, seasonWins: [...(next.seasonWins ?? []), `${season.id}-${new Date().getFullYear()}`] };
    msgs.push({ text: `${boss.emoji} ${L(next, 'bossDefeated', { boss: boss.name })}`, tone: 'epic' });
    next = reward(next, msgs, XP.boss, BONUS_MIN.boss);
  }
  return next;
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

/** Pays out a weekly contract as soon as it's reached, and settles a missed one once its week is over. */
function checkContract(s: State, msgs: Msg[]): State {
  const c = s.contract;
  if (!c || c.status !== 'open') return s;
  const vars = { goal: goalOf(c.goal).title(c.target), stake: c.stake, coins: c.stake * 2 };
  if (contractProgress(s, c) >= c.target) {
    msgs.push({ text: `📜 ${L(s, 'contractWon', vars)}`, tone: 'epic' });
    return { ...s, contract: { ...c, status: 'won' }, coins: s.coins + c.stake * 2, coinsEarned: s.coinsEarned + c.stake };
  }
  if (c.week === weekKeyOf()) return s;
  if (roughWeek(s, c)) {
    msgs.push({ text: `📜 ${L(s, 'contractVoided', vars)}`, tone: 'info' });
    return { ...s, contract: { ...c, status: 'voided' }, coins: s.coins + c.stake };
  }
  msgs.push({ text: `📜 ${L(s, 'contractLost', vars)}`, tone: 'bad' });
  return { ...s, contract: { ...c, status: 'lost' } };
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
  return reward(next, msgs, XP.workout, BONUS_MIN.workout);
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

// ---------- context ----------

type Store = ReturnType<typeof useStoreValue>;
const StoreContext = createContext<Store | null>(null);

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const value = useStoreValue();
  if (!value.ready) return null; // splash screen stays up until data is loaded
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

/** Opens a tapped notification's screen. On a cold start the navigator may still be mounting, so it retries for a few seconds. */
function openSoon(href: Href, tries = 20) {
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
  const say = useCallback((text: string, tone: Tone = 'info') => {
    haptic(tone);
    toastId.current += 1;
    const id = toastId.current;
    setToasts((q) => [...q.slice(-3), { id, text, tone }]);
  }, []);
  const dismissToast = useCallback(() => setToasts((q) => q.slice(1)), []);

  // ----- persistence -----
  const saveNow = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    return AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stateRef.current));
  }, []);
  const save = useCallback(() => {
    saveNow().catch((e) => console.warn('[spider] save failed', e));
  }, [saveNow]);

  const commit = useCallback(
    (next: State) => {
      stateRef.current = next;
      setState(next);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(save, 400);
    },
    [save],
  );

  useEffect(() => {
    (async () => {
      let loaded = defaultState();
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        loaded = hydrate(raw ? (JSON.parse(raw) as Partial<State>) : null);
      } catch (e) {
        console.warn('[spider] load failed, starting fresh', e);
      }
      stateRef.current = loaded;
      setState(loaded);
      setReady(true);
      SplashScreen.hideAsync().catch(() => {});
    })();
  }, []);

  /** Apply a change, award achievements, save, and show S.P.I.D.E.R.'s reactions. */
  const run = useCallback(
    (fn: (s: State, msgs: Msg[]) => State) => {
      const prev = stateRef.current;
      const msgs: Msg[] = [];
      const checked = checkContract(checkQuests(checkLeague(fn(prev, msgs), msgs), msgs), msgs);
      const next = checkGolden(checkRespect(checkAchievements(checked, msgs), msgs), msgs);
      commit(next);
      msgs.forEach((m) => say(m.text, m.tone));
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
      const pastChanged = withPastHealth(s0, past) !== s0;
      if (!pastChanged && today.steps === steps && today.sleepMin === sleep && (today.stepGoalHit || steps < s0.settings.stepGoal)) return;
      run((s, msgs) => {
        let next = patchDay(withPastHealth(s, past), key, (d) => ({ ...d, steps, sleepMin: sleep }));
        if (!dayOf(s, key).stepGoalHit && steps >= s.settings.stepGoal) {
          next = patchDay(next, key, (d) => ({ ...d, stepGoalHit: true }));
          msgs.push({
            text: `${L(next, 'stepGoal', { steps: steps.toLocaleString('sv-SE') })} +${XP.stepGoal} XP · +${BONUS_MIN.stepGoal} min gaming`,
            tone: 'epic',
          });
          next = reward(next, msgs, XP.stepGoal, BONUS_MIN.stepGoal);
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
      const old = dayOf(stateRef.current).screen;
      if (!old || old.totalMin !== screen.totalMin || old.top.length !== screen.top.length) {
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
          .filter(([k, d]) => k >= since && k < key && (!d.weather || k === yesterday))
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
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const outsideAt = useRef(0);
  const refreshOutside = useCallback(
    async (force = false) => {
      let place = stateRef.current.settings.weather;
      if (!place) {
        setAir(null);
        setAlerts([]);
        return;
      }
      if (!force && Date.now() - outsideAt.current < 15 * 60_000) return;
      outsideAt.current = Date.now();
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
          county ? fetchSmhi(county).catch(() => [] as Alert[]) : Promise.resolve([] as Alert[]),
          county ? fetchVma(county, place.name.split(',')[0]).catch(() => [] as Alert[]) : Promise.resolve([] as Alert[]),
        ]);
        if (a) {
          setAir(a);
          const today = a.days.find((d) => d.date === dayKey());
          const stored = dayOf(stateRef.current).air;
          if (today && JSON.stringify(stored) !== JSON.stringify({ aqi: today.aqi, pollen: today.pollen })) {
            run((s) => patchDay(s, dayKey(), (d) => ({ ...d, air: { aqi: today.aqi, pollen: today.pollen } })));
          }
        }
        const notify = stateRef.current.settings.notify;
        const list = [...vma.filter(() => notify.vma), ...smhi.filter(() => notify.smhi)];
        setAlerts(list);
        // New warnings (yellow and up) and every VMA: notify once, right away.
        const fresh = list.filter((x) => x.level !== 'MESSAGE' && !stateRef.current.seenAlerts[x.id]);
        if (fresh.length) {
          for (const x of fresh) {
            const head = x.source === 'VMA' ? '🚨 VMA' : `⚠️ ${ALERT_LABEL[x.level]}`;
            void notifyNow(`${head}: ${x.title}`, x.text.slice(0, 200));
            say(`${head}: ${x.title}`, 'bad');
          }
          run((s) => {
            const keep = Object.fromEntries(Object.entries(s.seenAlerts).filter(([, t]) => t > Date.now() - 30 * 86_400_000));
            return { ...s, seenAlerts: { ...keep, ...Object.fromEntries(fresh.map((x) => [x.id, Date.now()])) } };
          });
        }
      } catch (e) {
        console.warn('[spider] outside failed', e);
      }
    },
    [run, say],
  );
  useEffect(() => {
    if (!ready || !state.onboarded) return;
    const first = setTimeout(() => void refreshOutside(true), 0);
    const every = setInterval(() => void refreshOutside(false), 15 * 60_000);
    return () => {
      clearTimeout(first);
      clearInterval(every);
    };
  }, [ready, state.onboarded, placeKey, refreshOutside]);

  // ----- day start: fix today's quests -----
  useEffect(() => {
    if (!ready || !state.onboarded || dayOf(state).quests) return;
    const t = setTimeout(() => run((s) => s), 0);
    return () => clearTimeout(t);
  }, [ready, state, tick, run]);

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
          if (!d.waterGoalHit && total >= s.settings.waterGoalMl) {
            next = patchDay(next, key, (x) => ({ ...x, waterGoalHit: true }));
            msgs.push({
              text: `${L(next, 'waterGoal')} +${XP.waterGoal} XP · +${BONUS_MIN.waterGoal} min gaming`,
              tone: 'epic',
            });
            return reward(next, msgs, XP.water + XP.waterGoal, BONUS_MIN.waterGoal);
          }
          msgs.push({ text: L(next, 'waterLogged', { ml, left: Math.max(0, s.settings.waterGoalMl - total) }), tone: 'good' });
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
        if (!uri) return;
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
            next = reward(next, msgs, XP.workout + XP.set, BONUS_MIN.workout);
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
            msgs.push({ text: L(s, 'taskDone'), tone: 'good' });
            return reward(bump({ ...s, tasks }, 'tasksDone'), msgs, XP.task, BONUS_MIN.task);
          }
          const doneToday = task.doneAt && dayKey(task.doneAt) === dayKey();
          return reward(bump({ ...s, tasks }, 'tasksDone', -1), msgs, -XP.task, doneToday ? -BONUS_MIN.task : 0);
        });
      },

      deleteTask(id: string) {
        run((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) }));
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

      // --- loot chest & shop ---
      openChest() {
        run((s, msgs) => {
          const key = dayKey();
          const d = dayOf(s, key);
          if (!d.chestReady || d.chest) return s;
          const prize = rollChest();
          let next = patchDay(s, key, (x) => ({ ...x, chest: prize }));
          if (prize.kind === 'coins' || prize.kind === 'legendary') {
            next = { ...next, coins: next.coins + prize.amount, coinsEarned: next.coinsEarned + prize.amount };
          }
          if (prize.kind === 'gaming') next = patchDay(next, key, (x) => ({ ...x, bonusGameMin: x.bonusGameMin + prize.amount }));
          if (prize.kind === 'double_xp') next = { ...next, doubleXpUntil: Date.now() + prize.amount * MIN };
          if (prize.kind === 'boss_bomb') {
            const week = weekKeyOf();
            next = { ...next, bossBombs: { ...next.bossBombs, [week]: (next.bossBombs[week] ?? 0) + prize.amount } };
          }
          msgs.push({ text: prize.kind === 'legendary' ? L(next, 'legendaryRoast') : L(next, 'chestOpened', { prize: prize.text }), tone: 'epic' });
          return next;
        });
      },

      buyItem(id: ShopItemId) {
        run((s, msgs) => {
          const item = SHOP_ITEMS.find((i) => i.id === id);
          if (!item) return s;
          if (s.coins < item.cost) {
            msgs.push({ text: L(s, 'tooPoor', { missing: item.cost - s.coins }), tone: 'bad' });
            return s;
          }
          let next: State = { ...s, coins: s.coins - item.cost, purchases: [...s.purchases, { id: uid(), title: item.title, emoji: item.emoji, cost: item.cost, at: Date.now() }].slice(-100) };
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

      /** Stakes coins on a weekly goal (Monday to Wednesday, one per week). */
      signContract(goal: ContractGoal, stake: number) {
        run((s0, msgs) => {
          const s = checkContract(s0, msgs); // last week's, if it's still open
          const week = weekKeyOf();
          if (!canSign() || s.contract?.week === week) return s;
          if (s.coins < stake) {
            msgs.push({ text: L(s, 'tooPoor', { missing: stake - s.coins }), tone: 'bad' });
            return s;
          }
          const def = goalOf(goal);
          msgs.push({ text: `📜 ${L(s, 'contractSigned', { goal: def.title(def.target), stake })}`, tone: 'info' });
          return { ...s, coins: s.coins - stake, contract: { week, from: dayKey(), signedAt: Date.now(), goal, target: def.target, stake, status: 'open' } };
        });
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
          const bonus = Math.floor(f.minutes / 5);
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

      // --- backup ---
      async backup() {
        const result = await createBackup(stateRef.current);
        if (!result) return;
        commit({ ...stateRef.current, lastBackupAt: Date.now() });
        say(`Backup saved: ${result.folder} (${result.photos} photos). Copy that folder to Google Drive for extra safety.`, 'good');
      },

      /** Picks a backup folder and replaces everything with it. Caller confirms first. */
      async restore() {
        const result = await readBackup();
        if (!result) return;
        await cancelEverything();
        commit({ ...result.state, onboarded: true, activeGame: null, restEndsAt: null });
        say(`Restored backup from ${new Date(result.createdAt).toLocaleString('sv-SE').slice(0, 16)} (${result.photos} photos). Welcome back.`, 'epic');
      },

      async resetAll() {
        await cancelEverything();
        deleteAllPhotos();
        commit(defaultState());
      },
    }),
    [run, commit, say, refreshHealth],
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
      } else actions.logMood(a.level, [], '');
    }, openSoon);
  }, [ready, actions, say]);

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

  const quip = useCallback((key: LineKey, vars: Record<string, string | number> = {}) => L(stateRef.current, key, vars), []);

  return {
    ready,
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
      alerts,
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
