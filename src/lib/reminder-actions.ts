// What a reminder button or a widget tap asks for. Pure, so the background tasks, the app and the logic tests
// share it (see pending-actions.ts for the queue it travels through).
import { dayKey } from './dates';
import type { MoodLevel } from './types';

/** Actions that can wait in the queue until the app runs. Each carries the day it's about and when it was tapped. */
export type QueuedAction =
  | { kind: 'glass'; day: string; at: number }
  | { kind: 'coffee'; day: string; at: number }
  | { kind: 'habit'; habitId: string; day: string; at: number }
  | { kind: 'mood'; level: MoodLevel; day: string; at: number };

export type ReminderAction = QueuedAction | { kind: 'snooze' } | { kind: 'focus' };

export const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** A reminder button's action, from its id and the notification's data. Null for anything else. */
export function actionFromButton(actionId: string, data: Record<string, unknown> | null | undefined, now = Date.now()): ReminderAction | null {
  const day = dayKey(now);
  if (actionId === 'water_glass') return { kind: 'glass', day, at: now };
  if (actionId === 'water_snooze') return { kind: 'snooze' };
  if (actionId === 'focus_start') return { kind: 'focus' };
  if (actionId === 'habit_done' && typeof data?.habitId === 'string') {
    // The reminder's own day, so "Done" tapped after midnight ticks the day it was about.
    const remindDay = typeof data.day === 'string' && DAY_KEY_RE.test(data.day) ? data.day : day;
    return { kind: 'habit', habitId: data.habitId, day: remindDay, at: now };
  }
  const mood = /^mood_([1-5])$/.exec(actionId);
  if (mood) return { kind: 'mood', level: Number(mood[1]) as MoodLevel, day, at: now };
  return null;
}

/** Buttons that do their thing without opening the app (APK 1.5.0+). Focus opens it: you want to see the web. */
export const SILENT_BUTTONS = new Set(['water_glass', 'water_snooze', 'habit_done', 'mood_4', 'mood_3', 'mood_2']);

/** One tap, the same key whichever path sees it (the background task or the app's listener). */
export const tapKey = (notificationId: string, actionId: string, date: number) => `${notificationId}|${actionId}|${date}`;
