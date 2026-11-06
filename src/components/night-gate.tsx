import { router, usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { MIN } from '@/lib/dates';
import { nightShiftNow } from '@/lib/night-shift';
import { useStore } from '@/lib/store';

const TABS = ['/', '/plan', '/gym', '/fuel', '/game'];
/** After the corner was left, coming back within this long goes straight to the app. */
const AGAIN_AFTER_MS = 10 * MIN;
let leftAt = 0;
/** The night shift was left (its screen calls this): a quick hop to another app and back doesn't reopen it. */
export const nightLeft = () => {
  leftAt = Date.now();
};

/**
 * step 9 care: opening the app between bedtime + 30 min and 05:00 shows the night shift first (night-shift.ts).
 * Only over a tab: a notification that opened its own screen (a warning, say) is left on top. Draws nothing.
 */
export function NightGate() {
  const { ready, state } = useStore();
  const pathname = usePathname();
  const path = useRef(pathname);
  useEffect(() => {
    path.current = pathname;
  }, [pathname]);
  const onboarded = state.onboarded;
  const sleepHour = state.settings.sleepHour;
  const on = state.settings.nightShift;
  useEffect(() => {
    if (!ready || !onboarded) return;
    let t: ReturnType<typeof setTimeout> | undefined;
    const check = () => {
      clearTimeout(t);
      // A moment's wait, so a tapped notification has opened its screen first.
      t = setTimeout(() => {
        if (!nightShiftNow({ sleepHour, nightShift: on }) || Date.now() - leftAt < AGAIN_AFTER_MS) return;
        if (TABS.includes(path.current)) router.push('/night');
      }, 900);
    };
    check();
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') check();
    });
    return () => {
      clearTimeout(t);
      sub.remove();
    };
  }, [ready, onboarded, sleepHour, on]);
  return null;
}
