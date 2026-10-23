// Reminder buttons and widget taps that work without opening the app (APK 1.5.0+).
//
// A tap while S.P.I.D.E.R. isn't on screen runs a background task (headless if the app was killed). The task
// only queues the action here. The store applies the queue when it loads, whenever the app comes back, and
// right away if it's alive in the background (onQueued). expo also replays a button tap to the app's response
// listener, so each tap is claimed once by its key and whichever path comes second skips it.
// No theme import here: background tasks load this.
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { QueuedAction } from './reminder-actions';

const QUEUE_KEY = 'spider:pending-actions';
const TAPS_KEY = 'spider:pending-actions:taps';
const TAP_KEEP_MS = 2 * 86_400_000;

// Read-modify-write on AsyncStorage, one at a time: the task and the listener can share a JS runtime.
let lock: Promise<unknown> = Promise.resolve();
function locked<T>(fn: () => Promise<T>): Promise<T> {
  const next = lock.then(fn, fn);
  lock = next.catch(() => {});
  return next;
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** True the first time a tap is seen, false if the other path already took it. */
export function claimTap(key: string, now = Date.now()): Promise<boolean> {
  return locked(async () => {
    const taps = await readJson<Record<string, number>>(TAPS_KEY, {});
    if (taps[key]) return false;
    const keep = Object.fromEntries(Object.entries(taps).filter(([, t]) => t > now - TAP_KEEP_MS));
    await AsyncStorage.setItem(TAPS_KEY, JSON.stringify({ ...keep, [key]: now }));
    return true;
  });
}

const listeners = new Set<() => void>();

/** Runs `fn` whenever something is queued in this JS runtime. Returns the unsubscribe. */
export function onQueued(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export async function enqueue(a: QueuedAction) {
  await locked(async () => {
    const q = await readJson<QueuedAction[]>(QUEUE_KEY, []);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify([...q, a]));
  });
  listeners.forEach((fn) => fn());
}

/** Everything queued, oldest first, and an empty queue. */
export function takeQueued(): Promise<QueuedAction[]> {
  return locked(async () => {
    const q = await readJson<QueuedAction[]>(QUEUE_KEY, []);
    if (q.length) await AsyncStorage.setItem(QUEUE_KEY, '[]');
    return q;
  });
}

// Set by the app entry once the background task for buttons is registered (src/background.ts).
let silentReady: Promise<boolean> = Promise.resolve(false);
export const setSilentButtonsReady = (p: Promise<boolean>) => {
  silentReady = p.catch(() => false);
};
/** Whether reminder buttons can work without opening the app. False in Expo Go and on older installs. */
export const silentButtonsReady = () => silentReady;
