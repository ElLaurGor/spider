import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useToday } from '@/components/use-today';
import { climateDue, fetchSthlmObs, nearStockholm } from '@/lib/sthlm-climate';
import { useStore } from '@/lib/store';

/** No call to SMHI before this (2 h after a call that didn't have yesterday's readings yet, 30 min after a failure). */
let nextTry = 0;
let busy = false;

/**
 * Draws nothing: while the app is in front, asks SMHI once a day for Stockholm's latest readings (lib/sthlm-climate.ts)
 * so a record yesterday gets its toast and each month its mean for Wrapped. Mounted on HQ, which stays mounted.
 */
export function SthlmClimateSync() {
  const { state, actions } = useStore();
  const today = useToday();
  const near = nearStockholm(state.settings.weather);
  const due = climateDue(state.sthlmClimate, near, today);

  useEffect(() => {
    if (!due) return;
    const check = async () => {
      if (busy || AppState.currentState !== 'active' || Date.now() < nextTry) return;
      busy = true;
      try {
        const obs = await fetchSthlmObs();
        nextTry = Date.now() + 2 * 3_600_000; // the day's readings in: no more calls today (see climateDue)
        actions.sthlmClimateIn(obs);
      } catch (e) {
        console.warn('[spider] SMHI observations failed', e);
        nextTry = Date.now() + 30 * 60_000;
      } finally {
        busy = false;
      }
    };
    const first = setTimeout(() => void check(), 3_000); // after startup's own fetches
    const every = setInterval(() => void check(), 10 * 60_000);
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') void check();
    });
    return () => {
      clearTimeout(first);
      clearInterval(every);
      sub.remove();
    };
  }, [due, actions]);

  return null;
}
