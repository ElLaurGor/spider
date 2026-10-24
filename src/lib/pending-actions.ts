// Reminder buttons and widget taps that work without opening the app (APK 1.5.0+).
//
// A tap while S.P.I.D.E.R. isn't on screen runs a background task (headless if the app was killed). The task
// only queues the action here. The store applies the queue when it loads, whenever the app comes back, and
// right away if it's alive in the background (onQueued): the task waits for that, since RN stops the app's
// timers (its save among them) once the task ends. An action leaves the queue only after the store saved it
// (drainQueued). expo also replays a button tap to the app's response listener, so each tap is claimed once
// by its key and whichever path comes second skips it. The queue itself is in action-queue.ts.
// No theme import here: background tasks load this.
import AsyncStorage from '@react-native-async-storage/async-storage';

import { createQueue } from './action-queue';

export const { locked, claimTap, onQueued, enqueue, readQueued, drainQueued } = createQueue(AsyncStorage);

// Set by the app entry once the background task for buttons is registered (src/background.ts).
let silentReady: Promise<boolean> = Promise.resolve(false);
export const setSilentButtonsReady = (p: Promise<boolean>) => {
  silentReady = p.catch(() => false);
};
/** Whether reminder buttons can work without opening the app. False in Expo Go and on older installs. */
export const silentButtonsReady = () => silentReady;
