import type { Href } from 'expo-router';
import { Platform } from 'react-native';

import { C } from '@/constants/theme';

import { addDays, atTime, dayKey, fmtDuration, fmtTime, MIN } from './dates';
import { habitsDone, isScheduled } from './habits';
import { line, type LineKey } from './lines';
import * as Notifications from './local-notifications';
import { cycleInfo } from './body';
import { standings } from './league';
import { pausedOn } from './pause';
import { immortalTask } from './memory';
import { nextDate } from './countdowns';
import {
  coffeeOf,
  dayOf,
  effectiveSavage,
  eventsOn,
  gamingUsedMs,
  inMeeting,
  moodsOf,
  lowBattery,
  onPeriod,
  trainedOn,
  waterGoalFor,
  waterMl,
  waterSlots,
  workoutFor,
} from './selectors';
import { moodInfo } from './mood';
import { claimTap, silentButtonsReady } from './pending-actions';
import { actionFromButton, tapKey, type ReminderAction } from './reminder-actions';
import type { CalEvent, MoodLevel, State } from './types';
import { forecastText, type Weather } from './weather';
import { aqiBand, LEVEL_LABEL, pollenInfo, pollenLevel, type Air } from './outside';
import { bossFor, questsFor } from './quests';
import { cycleHeadsUpAt, wrappedReminder } from './reminder-times';
import { upcomingDays } from './swedish-days';

const CH = { remind: 'spider-reminders', gym: 'spider-gym', game: 'spider-gaming', status: 'spider-status', warn: 'spider-warnings' } as const;

// Notifications re-planned on every app change; gaming/rest alerts are managed separately.
const PLANNED_PREFIXES = ['water-', 'gym-', 'morning-', 'evening-', 'comeback-', 'mood-', 'habit-', 'report-', 'backup-', 'sleep-', 'cycle-', 'countdown-', 'wrapped-', 'winddown-', 'league-', 'pollen-', 'air-', 'move-'];
const MOOD_HOURS = [13, 20];
const GAME_IDS = ['game-warn', 'game-over', 'game-way-over'];
const REST_ID = 'rest-done';
const FOCUS_ID = 'focus-done';
const DAYS_AHEAD = 3;
const SNOOZE_ID = 'snooze-water'; // not a planned prefix, so a replan leaves it alone

// Buttons on reminders. From APK 1.5.0 most work without opening the app (silent-buttons.ts); before that,
// or in Expo Go, a tap opens the app, which does the thing (onNotificationTap).
const CATEGORY = { water: 'spider_water', habit: 'spider_habit', mood: 'spider_mood', status: 'spider_status' } as const;
const STATUS_ID = 'status-line'; // the ongoing summary in the shade (cluster F); not a planned prefix
const MOOD_BUTTONS: MoodLevel[] = [4, 3, 2];

// Where tapping a notification takes you, by its id's prefix (so ones scheduled before this existed work too).
const LINKS: [prefix: string, href: Href][] = [
  ['water-', '/fuel'],
  [SNOOZE_ID, '/fuel'],
  ['gym-', '/gym'],
  [REST_ID, '/gym'],
  ['mood-', '/mood'],
  ['habit-', '/plan'],
  ['countdown-', '/plan'],
  ['report-', '/report'],
  ['league-', '/league'],
  ['wrapped-', '/wrapped'],
  ['cycle-', '/cycle'],
  ['pollen-', '/outside'],
  ['air-', '/outside'],
  ['alert-', '/outside'],
  ['game-', '/game'],
  [FOCUS_ID, '/focus'],
  ['backup-', '/settings'],
  ['evening-', '/debrief'],
  ['move-', '/movement'],
];
/** The screen a notification opens. Morning, sleep, wind-down and comeback ones open HQ. */
export const linkFor = (id: string): Href => LINKS.find(([p]) => id.startsWith(p))?.[1] ?? '/';

Notifications.setNotificationHandler({
  handleNotification: async (n) => {
    const quiet = n.request.identifier === STATUS_ID; // the status line never pings or pops up
    return { shouldPlaySound: !quiet, shouldSetBadge: false, shouldShowBanner: !quiet, shouldShowList: true };
  },
});

let permitted = false;
// Expo Go on Android can't create channels; notifications then land on expo's
// built-in high-importance fallback channel instead.
let channelsOk = true;

export async function initNotifications(askIfNeeded: boolean) {
  if (Platform.OS === 'android' && channelsOk) {
    // Channels must exist before Android 13+ will show the permission prompt.
    const base = { importance: Notifications.AndroidImportance.HIGH, vibrationPattern: [0, 200, 120, 200], lightColor: C.red };
    try {
      await Notifications.setNotificationChannelAsync(CH.remind, { name: 'Reminders & roasts', ...base });
      await Notifications.setNotificationChannelAsync(CH.gym, { name: 'Gym', ...base });
      await Notifications.setNotificationChannelAsync(CH.game, { name: 'Gaming timer', ...base });
      // Its own channel, so muting the roasts never silences an SMHI warning or a VMA.
      await Notifications.setNotificationChannelAsync(CH.warn, {
        name: 'Warnings (SMHI & VMA)',
        description: 'Weather warnings for your county and Viktigt meddelande till allmänheten',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 400, 200, 400],
        lightColor: C.red,
      });
      await Notifications.setNotificationChannelAsync(CH.status, {
        name: 'Status line',
        importance: Notifications.AndroidImportance.LOW,
        sound: null,
        enableVibrate: false,
        vibrationPattern: null,
        showBadge: false,
      });
    } catch {
      channelsOk = false;
    }
  }
  try {
    const options = { opensAppToForeground: !(await silentButtonsReady()) };
    await Notifications.setNotificationCategoryAsync(CATEGORY.water, [
      { identifier: 'water_glass', buttonTitle: '+1 glass', options },
      { identifier: 'water_snooze', buttonTitle: 'Snooze 30 min', options },
    ]);
    await Notifications.setNotificationCategoryAsync(CATEGORY.habit, [{ identifier: 'habit_done', buttonTitle: 'Done ✓', options }]);
    await Notifications.setNotificationCategoryAsync(CATEGORY.status, [
      { identifier: 'water_glass', buttonTitle: '+1 glass', options },
      { identifier: 'focus_start', buttonTitle: '🕸️ Focus 25 min' },
    ]);
    await Notifications.setNotificationCategoryAsync(
      CATEGORY.mood,
      MOOD_BUTTONS.map((level) => ({ identifier: `mood_${level}`, buttonTitle: `${moodInfo(level).emoji} ${moodInfo(level).label}`, options })),
    );
  } catch (e) {
    console.warn('[spider] notification buttons unavailable', e); // Expo Go: plain reminders still work
  }
  const current = await Notifications.getPermissionsAsync();
  permitted = current.granted;
  if (!permitted && askIfNeeded && current.canAskAgain) {
    permitted = (await Notifications.requestPermissionsAsync()).granted;
  }
  return permitted;
}

async function scheduleAt(
  id: string,
  when: Date | number,
  title: string,
  body: string,
  channelId: string,
  buttons?: { category: (typeof CATEGORY)[keyof typeof CATEGORY]; data?: Record<string, string> },
) {
  const date = new Date(when);
  if (date.getTime() < Date.now() + 5_000) return;
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: { title, body, color: C.red, categoryIdentifier: buttons?.category, data: buttons?.data },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: channelsOk ? channelId : undefined },
  });
}

const say = (s: State, key: LineKey, vars: Record<string, string | number> = {}) =>
  line(key, effectiveSavage(s), { name: s.settings.userName || 'boss', ...vars });

function daySummary(s: State, now: Date) {
  const d = dayOf(s, dayKey(now));
  const plan = workoutFor(s, now);
  const gym = plan ? (trainedOn(d) ? 'gym ✓' : 'gym skipped') : 'rest day';
  const tasks = s.tasks.filter((t) => t.done && t.doneAt && dayKey(t.doneAt) === dayKey(now)).length;
  const coffee = coffeeOf(d).length;
  const steps =
    (d.steps != null ? ` · 👣 ${d.steps.toLocaleString('sv-SE')}` : '') + (d.screen ? ` · 📱 ${fmtDuration(d.screen.totalMin * MIN)}` : '');
  return `💧 ${waterMl(d)}/${waterGoalFor(s, dayKey(now))} ml · 🏋️ ${gym} · ☕ ${coffee} · 🎮 ${fmtDuration(gamingUsedMs(s))} · ✅ ${tasks} tasks${steps}`;
}

let running: Promise<void> | null = null;
let queued: { s: State; events: CalEvent[]; weather: Weather | null; air: Air | null } | null = null;

/** Cancel and rebuild every recurring reminder for the next few days. */
export function replanNotifications(s: State, events: CalEvent[], weather: Weather | null, air: Air | null) {
  if (running) {
    queued = { s, events, weather, air };
    return running;
  }
  running = doReplan(s, events, weather, air)
    .catch((e) => console.warn('[spider] replan failed', e))
    .finally(() => {
      running = null;
      if (queued) {
        const next = queued;
        queued = null;
        void replanNotifications(next.s, next.events, next.weather, next.air);
      }
    });
  return running;
}

async function doReplan(s: State, events: CalEvent[], weather: Weather | null, air: Air | null) {
  if (!permitted || !s.onboarded) return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => PLANNED_PREFIXES.some((p) => n.identifier.startsWith(p)))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );

  const { settings: st } = s;
  const now = new Date();
  const jobs: Promise<void>[] = [];
  // A snoozed water reminder is pointless once the goal is hit or water reminders are off.
  if (!st.notify.water || waterMl(dayOf(s, dayKey(now))) >= waterGoalFor(s, dayKey(now))) {
    jobs.push(Notifications.cancelScheduledNotificationAsync(SNOOZE_ID).catch(() => {}));
  }

  for (let d = 0; d < DAYS_AHEAD; d++) {
    const date = addDays(now, d);
    const key = dayKey(date);
    const log = dayOf(s, key);
    const plan = workoutFor(s, date);
    const paused = pausedOn(s, key); // sick or away: no water or gym nagging

    const waterGoal = waterGoalFor(s, key);
    if (st.notify.water && !paused && !(d === 0 && waterMl(log) >= waterGoal)) {
      for (const t of waterSlots(s)) {
        const when = atTime(now, d, Math.floor(t / 60), t % 60);
        if (st.respectMeetings && inMeeting(events, when.getTime())) continue;
        const progress = d === 0 ? ` (${waterMl(log)}/${waterGoal} ml)` : '';
        jobs.push(scheduleAt(`water-${key}-${t}`, when, '💧 Hydration check', say(s, 'waterRemind') + progress, CH.remind, { category: CATEGORY.water }));
      }
    }

    if (st.notify.gym && plan && !paused && !trainedOn(log)) {
      const gymAt = atTime(now, d, st.gymHour, st.gymMinute).getTime();
      jobs.push(scheduleAt(`gym-${key}-pre`, gymAt - 30 * MIN, `🏋️ ${plan.name} day`, say(s, 'gymRemind', { workout: plan.name }), CH.gym));
      const shameAt = Math.min(gymAt + 3 * 60 * MIN, atTime(now, d, st.sleepHour).getTime() - 30 * MIN);
      if (shameAt > gymAt && !(d === 0 && lowBattery(log))) {
        jobs.push(scheduleAt(`gym-${key}-shame`, shameAt, '🕷️ S.P.I.D.E.R. noticed something', say(s, 'gymShame', { workout: plan.name }), CH.gym));
      }
    }

    if (st.notify.morning) {
      const count = eventsOn(events, date).length;
      const evText = count === 0 ? 'No meetings' : count === 1 ? '1 event' : `${count} events`;
      const wkText = plan ? `${plan.name} day` : 'Rest day';
      const forecast = weather?.days.find((f) => f.date === key);
      const sv = upcomingDays(date, 2).map((n) => `${n.emoji} ${n.text}`).join(' ');
      const body = say(s, 'morningBrief', { events: evText, workout: wkText }) + (forecast ? ` ${forecastText(forecast)}.` : '') + (sv ? ` ${sv}` : '');
      jobs.push(scheduleAt(`morning-${key}`, atTime(now, d, st.wakeHour), `☀️ Good morning, ${st.userName || 'boss'}`, body, CH.remind));
    }

    if (st.notify.mood) {
      const lastMood = moodsOf(log).at(-1)?.at ?? 0;
      for (const h of MOOD_HOURS) {
        if (h <= st.wakeHour || h >= st.sleepHour) continue;
        const when = atTime(now, d, h);
        // Skip a check-in if one was logged in the 4 hours before it.
        if (d === 0 && when.getTime() - lastMood < 4 * 60 * MIN) continue;
        if (st.respectMeetings && inMeeting(events, when.getTime())) continue;
        jobs.push(scheduleAt(`mood-${key}-${h}`, when, '🫀 Vibe check', say(s, 'moodRemind'), CH.remind, { category: CATEGORY.mood }));
      }
    }

    // Pollen and air quality for the day, shortly after waking up.
    const airDay = air?.days.find((x) => x.date === key);
    if (airDay && st.notify.pollen && st.allergies.length) {
      const worst = st.allergies
        .map((t) => ({ t, level: pollenLevel(t, airDay.pollen[t] ?? 0) }))
        .sort((a, b) => b.level - a.level)[0];
      if (worst && worst.level >= st.pollenAlertLevel) {
        const info = pollenInfo(worst.t);
        jobs.push(
          scheduleAt(`pollen-${key}`, atTime(now, d, st.wakeHour, 20), `${info.emoji} ${info.label.split(' ')[0]} pollen: ${LEVEL_LABEL[worst.level]}`, say(s, 'pollenHigh', { pollen: info.label.split(' ')[0], level: LEVEL_LABEL[worst.level] }), CH.remind),
        );
      }
    }
    if (airDay && st.notify.air && airDay.aqi >= st.aqiAlert) {
      const band = aqiBand(airDay.aqi).label;
      jobs.push(scheduleAt(`air-${key}`, atTime(now, d, st.wakeHour, 25), `😷 Air quality: ${band}`, say(s, 'airPoor', { aqi: airDay.aqi, band }), CH.remind));
    }

    if (st.notify.sleep && !(d === 0 && log.sleepRating != null)) {
      jobs.push(scheduleAt(`sleep-${key}`, atTime(now, d, st.wakeHour + 1), '😴 How did you sleep?', say(s, 'sleepRemind'), CH.remind));
    }

    if (st.notify.habits) {
      const done = habitsDone(s, key);
      for (const h of s.habits) {
        if (h.remindHour == null || !isScheduled(h, date) || (d === 0 && done.includes(h.id))) continue;
        jobs.push(
          scheduleAt(`habit-${h.id}-${key}`, atTime(now, d, h.remindHour), `📌 ${h.emoji} ${h.name}`, say(s, 'habitRemind', { habit: h.name }), CH.remind, {
            category: CATEGORY.habit,
            data: { habitId: h.id, day: key },
          }),
        );
      }
    }

    // Workdays at her stillest hour (movement map), if she turned it on. Not on low-battery days or in meetings.
    const moveHour = st.moveNudgeHour;
    if (moveHour != null && date.getDay() >= 1 && date.getDay() <= 5 && moveHour > st.wakeHour && moveHour < st.sleepHour) {
      const when = atTime(now, d, moveHour, 5);
      if (!(d === 0 && lowBattery(log)) && !(st.respectMeetings && inMeeting(events, when.getTime()))) {
        jobs.push(scheduleAt(`move-${key}`, when, '🚶 Move break', say(s, 'moveNudge'), CH.remind));
      }
    }

    if (st.notify.windDown && !(d === 0 && log.windDownDone)) {
      jobs.push(scheduleAt(`winddown-${key}`, atTime(now, d, st.sleepHour - 1), '🌙 Wind-down time', say(s, 'windDownRemind'), CH.remind));
    }

    if (st.notify.evening) {
      const zombie = immortalTask(s, atTime(now, d, st.sleepHour - 2, 30).getTime());
      const body =
        (d === 0 ? say(s, 'eveningReport', { summary: daySummary(s, now) }) : 'Your report card is ready. Open S.P.I.D.E.R. if you dare.') +
        (zombie ? ` ${say(s, 'immortalTask', { task: zombie.task.title, days: zombie.days })}` : '');
      jobs.push(scheduleAt(`evening-${key}`, atTime(now, d, st.sleepHour - 2, 30), '📋 Daily report card', body, CH.remind));
    }
  }

  // Sunday evening: report card, plus a nudge if there's been no backup for two weeks.
  const daysToSunday = (7 - now.getDay()) % 7;
  const reportAt = atTime(now, daysToSunday, 19);
  const sunday = reportAt.getTime() > now.getTime() ? reportAt : atTime(now, daysToSunday + 7, 19);
  if (st.notify.report) {
    jobs.push(scheduleAt(`report-${dayKey(sunday)}`, sunday, '📊 Weekly report card', say(s, 'reportReady'), CH.remind));
  }
  const firstDay = Object.keys(s.days).sort()[0];
  const lastSafe = s.lastBackupAt ?? (firstDay ? new Date(`${firstDay}T12:00`).getTime() : now.getTime());
  if (now.getTime() - lastSafe > 14 * 86_400_000) {
    jobs.push(scheduleAt('backup-remind', sunday.getTime() - 60 * MIN, '💾 Back me up', say(s, 'backupRemind'), CH.remind));
  }

  const cycle = cycleInfo(s, now);
  const headsUp = cycle ? cycleHeadsUpAt(cycle) : null;
  if (st.notify.cycle && cycle && headsUp && !onPeriod(dayOf(s))) {
    jobs.push(scheduleAt(`cycle-${dayKey(cycle.nextStart)}`, headsUp, '🩸 Period heads-up', say(s, 'periodSoon'), CH.remind));
  }

  if (st.notify.countdowns) {
    for (const c of s.countdowns) {
      const day = nextDate(c, now);
      const vars = { title: `${c.emoji} ${c.title}` };
      jobs.push(scheduleAt(`countdown-${c.id}-eve`, atTime(day, -1, 18), `${c.emoji} Tomorrow: ${c.title}`, say(s, 'countdownTomorrow', vars), CH.remind));
      jobs.push(scheduleAt(`countdown-${c.id}-day`, atTime(day, 0, st.wakeHour), `${c.emoji} Today: ${c.title}`, say(s, 'countdownToday', vars), CH.remind));
    }
  }

  // League: Sunday 17:00 heads-up with the rank at planning time.
  if (st.notify.league && s.league && !pausedOn(s, dayKey(now))) {
    const daysToSun = (7 - now.getDay()) % 7;
    const at = atTime(now, daysToSun, 17);
    const rank = standings(s, now).findIndex((r) => r.me) + 1;
    jobs.push(scheduleAt(`league-${dayKey(at)}`, at, '🏆 League ends tonight', `You were #${rank} last I checked. Top 3 get promoted. Go earn XP.`, CH.remind));
  }

  // Monthly Wrapped on the 1st at 10:00, for the month that just ended.
  if (st.notify.wrapped) {
    const { at, month } = wrappedReminder(now);
    jobs.push(scheduleAt(`wrapped-${dayKey(at)}`, at, `🎁 ${month} Wrapped`, say(s, 'wrappedReady', { month }), CH.remind));
  }

  // Pushed forward every time the app is used, so these only fire if it's ignored. Not while sick or away.
  if (!pausedOn(s, dayKey(now))) {
    jobs.push(scheduleAt('comeback-3', atTime(now, 3, 18), '🕷️ Hello?', say(s, 'comeback'), CH.remind));
    jobs.push(scheduleAt('comeback-6', atTime(now, 6, 18), '🕷️ Still here. Still judging.', say(s, 'comeback'), CH.remind));
  }

  jobs.push(updateStatusLine(s, events).catch((e) => console.warn('[spider] status line failed', e)));
  await Promise.all(jobs);
}

let statusCleared = false;

/** The status line: today's water, quests, boss and next event, with "+1 glass" and "Focus" buttons. Off by default. */
async function updateStatusLine(s: State, events: CalEvent[]) {
  if (!s.settings.notify.statusLine) {
    if (!statusCleared) await Notifications.dismissNotificationAsync(STATUS_ID);
    statusCleared = true;
    return;
  }
  statusCleared = false;
  const now = new Date();
  const d = dayOf(s, dayKey(now));
  const quests = questsFor(s, now);
  const done = (d.questsDone ?? []).length;
  const boss = bossFor(s, now);
  const next = events.filter((e) => !e.allDay && e.start > now.getTime() && dayKey(e.start) === dayKey(now)).sort((a, b) => a.start - b.start)[0];
  const parts = [
    `💧 ${(waterMl(d) / 1000).toFixed(1)}/${(s.settings.waterGoalMl / 1000).toFixed(1)} L`,
    quests.length ? `🗡️ ${Math.min(done, quests.length)}/${quests.length} quests` : null,
    boss.defeated ? `${boss.emoji} defeated` : `${boss.emoji} ${boss.hp} HP`,
    next ? `⏭️ ${fmtTime(next.start)} ${next.title}` : null,
  ];
  await Notifications.scheduleNotificationAsync({
    identifier: STATUS_ID,
    content: {
      title: `🕷️ S.P.I.D.E.R. · ${fmtTime(now)}`,
      body: parts.filter(Boolean).join(' · '),
      color: C.red,
      sticky: true,
      autoDismiss: false,
      categoryIdentifier: CATEGORY.status,
    },
    trigger: channelsOk ? { channelId: CH.status } : null,
  });
}

export async function scheduleGameAlerts(s: State, remainingMin: number) {
  await cancelGameAlerts();
  if (!permitted || !s.settings.notify.gaming) return;
  const now = Date.now();
  const jobs: Promise<void>[] = [];
  const game = s.activeGame?.game ? ` · ${s.activeGame.game}` : '';
  if (remainingMin > 15) {
    jobs.push(scheduleAt('game-warn', now + (remainingMin - 15) * MIN, `🎮 15 minutes left${game}`, say(s, 'gameWarn'), CH.game));
  }
  if (remainingMin > 0) {
    jobs.push(scheduleAt('game-over', now + remainingMin * MIN, `🛑 Gaming budget reached${game}`, say(s, 'gameOver'), CH.game));
  }
  jobs.push(
    scheduleAt('game-way-over', now + (Math.max(0, remainingMin) + 30) * MIN, `💀 30 minutes over budget${game}`, say(s, 'gameWayOver'), CH.game),
  );
  await Promise.all(jobs);
}

/** "Snooze 30 min" on a water reminder: one more in a while. */
export async function snoozeWater(s: State, minutes = 30) {
  await scheduleAt(SNOOZE_ID, Date.now() + minutes * MIN, '💧 Hydration check (snoozed)', say(s, 'waterRemind'), CH.remind, { category: CATEGORY.water });
}

export type { ReminderAction };

const handled = new Set<string>(); // module-wide: the response that launched the app is seen twice otherwise

/**
 * Calls `onAction` for reminder buttons and `onOpen` with the screen for a tap on the notification itself,
 * including the tap that opened the app. Returns the unsubscribe.
 */
export function onNotificationTap(onAction: (a: ReminderAction) => void, onOpen: (href: Href) => void): () => void {
  const handle = (r: Notifications.NotificationResponse | null) => {
    if (!r) return;
    const id = tapKey(r.notification.request.identifier, r.actionIdentifier, r.notification.date);
    if (handled.has(id)) return;
    handled.add(id);
    Notifications.clearLastNotificationResponseAsync().catch(() => {}); // or every later launch would open it again
    if (r.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
      onOpen(linkFor(r.notification.request.identifier));
      return;
    }
    const a = actionFromButton(r.actionIdentifier, r.notification.request.content.data);
    if (a?.kind === 'focus') onAction(a);
    // A tap the background task already took (the app was in the background) is skipped here.
    else if (a) void claimTap(id).then((first) => first && onAction(a), () => onAction(a));
    // The status line stays put; it's refreshed by the replan its button causes.
    if (r.notification.request.identifier !== STATUS_ID) Notifications.dismissNotificationAsync(r.notification.request.identifier).catch(() => {});
  };
  Notifications.getLastNotificationResponseAsync()
    .then(handle)
    .catch(() => {});
  const sub = Notifications.addNotificationResponseReceivedListener(handle);
  return () => sub.remove();
}

export async function cancelGameAlerts() {
  await Promise.all(GAME_IDS.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
}

export async function scheduleRestDone(s: State, endsAt: number) {
  await Notifications.cancelScheduledNotificationAsync(REST_ID);
  if (!permitted) return;
  await scheduleAt(REST_ID, endsAt, '⏱️ Rest over', say(s, 'restOver'), CH.gym);
}

export const cancelRestDone = () => Notifications.cancelScheduledNotificationAsync(REST_ID);

export async function scheduleFocusDone(s: State, endsAt: number) {
  await Notifications.cancelScheduledNotificationAsync(FOCUS_ID);
  if (!permitted) return;
  await scheduleAt(FOCUS_ID, endsAt, '🕸️ Web complete', 'Focus session done. Open S.P.I.D.E.R. to collect your XP.', CH.remind);
}

export const cancelFocusDone = () => Notifications.cancelScheduledNotificationAsync(FOCUS_ID);

/**
 * Shows an SMHI warning or a VMA right away. One notification per alert (`alert-<alert id>`), so several at
 * once all show up and an escalation replaces that alert's older one. Opens Outside (linkFor).
 */
export async function notifyNow(alertId: string, title: string, body: string) {
  if (!permitted) return;
  await Notifications.scheduleNotificationAsync({
    identifier: `alert-${alertId}`,
    content: { title, body, color: C.red },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1, channelId: channelsOk ? CH.warn : undefined },
  });
}

export async function sendTestRoast(s: State) {
  if (!permitted) permitted = await initNotifications(true);
  if (!permitted) return false;
  await Notifications.scheduleNotificationAsync({
    content: { title: '🕷️ S.P.I.D.E.R.', body: say(s, 'spiderTap'), color: C.red },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 3,
      channelId: channelsOk ? CH.remind : undefined,
    },
  });
  return true;
}

export async function cancelEverything() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
