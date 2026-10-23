import * as Updates from 'expo-updates';
import { useEffect } from 'react';
import { AppState, Keyboard } from 'react-native';

import { useStore } from '@/lib/store';

const IDLE_MS = 30_000; // untouched this long (and no keyboard up): nothing half-typed to lose
const CHECK_EVERY_MS = 60 * 60_000;

let lastTouch = 0;
let lastCheck = Date.now(); // the launch itself checks for an update
/** Called on every touch (from the root layout), so an update never reloads under someone's fingers. */
export const noteTouch = () => {
  lastTouch = Date.now();
};

/**
 * Applies a downloaded over-the-air update without wiping what's being typed: when the app goes to the
 * background, or once the screen has been left alone for 30 s with the keyboard down. Reloading the moment
 * it downloaded threw away a meal or task draft a few seconds after launch. The app announces the new
 * version with a roast after the reload (store.tsx).
 *
 * Also checks for an update when the app comes back to the front, at most hourly: expo-updates only checks on
 * a cold start, so a fix used to wait until Android happened to kill the app.
 */
export function AutoUpdate() {
  const { isUpdatePending } = Updates.useUpdates();
  const { saveNow } = useStore();

  useEffect(() => {
    if (!isUpdatePending) return;
    let applying = false;
    let keyboardUp = Keyboard.isVisible();
    const apply = () => {
      if (applying) return;
      applying = true;
      // Write any unsaved changes first; nothing should run after reloadAsync.
      saveNow()
        .catch(() => {})
        .then(() => Updates.reloadAsync())
        .catch(() => {
          applying = false;
        });
    };
    const idle = setInterval(() => {
      if (!keyboardUp && Date.now() - lastTouch >= IDLE_MS) apply();
    }, 5_000);
    const subs = [
      AppState.addEventListener('change', (st) => {
        if (st === 'background') apply();
      }),
      Keyboard.addListener('keyboardDidShow', () => {
        keyboardUp = true;
      }),
      Keyboard.addListener('keyboardDidHide', () => {
        keyboardUp = false;
        noteTouch(); // closing the keyboard is still part of typing: start the 30 s from here
      }),
    ];
    return () => {
      clearInterval(idle);
      for (const s of subs) s.remove();
    };
  }, [isUpdatePending, saveNow]);

  useEffect(() => {
    if (!Updates.isEnabled) return;
    const sub = AppState.addEventListener('change', (st) => {
      if (st !== 'active' || Date.now() - lastCheck < CHECK_EVERY_MS) return;
      lastCheck = Date.now();
      Updates.checkForUpdateAsync()
        .then((r) => (r.isAvailable ? Updates.fetchUpdateAsync() : null))
        .catch(() => {}); // offline or no update server: the next launch checks again
    });
    return () => sub.remove();
  }, []);

  return null;
}
