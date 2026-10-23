// The app side of the background work (APK 1.5.0+): keeps the small keys the background tasks read up to date,
// and takes in what they did. The tasks themselves live in silent-buttons.ts, bg-alerts.ts and src/widgets;
// they never load the store.
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { C } from '@/constants/theme';
import { pushWidget } from '@/widgets';

import { addToSeenLedger, readSeenLedger } from './bg-alerts';
import { writeBgConfig } from './bg-config';
import { effectiveSavage } from './selectors';
import type { State } from './types';
import { snapshotOf } from './widget-data';

type Sync = {
  ready: boolean;
  state: State;
  getState: () => State;
  /** Warnings the background check announced, to add to state.seenAlerts so the app doesn't announce them again. */
  addSeen: (seen: Record<string, number>) => void;
};

export function useBackgroundSync({ ready, state, getState, addSeen }: Sync) {
  const { weather, notify, userName } = state.settings;
  const savage = effectiveSavage(state);
  useEffect(() => {
    if (!ready) return;
    writeBgConfig({
      county: weather?.county,
      town: weather?.name.split(',')[0],
      notifySmhi: notify.smhi,
      notifyVma: notify.vma,
      savage,
      name: userName || 'boss',
      color: C.red,
    }).catch((e) => console.warn('[spider] background config failed', e));
  }, [ready, weather?.county, weather?.name, notify.smhi, notify.vma, savage, userName]);

  // What the app announced goes into the shared ledger, and what the background check announced comes back.
  const seen = state.seenAlerts;
  useEffect(() => {
    if (!ready) return;
    addToSeenLedger(seen).catch((e) => console.warn('[spider] seen ledger failed', e));
  }, [ready, seen]);
  useEffect(() => {
    if (!ready) return;
    const pull = () =>
      void readSeenLedger().then((ledger) => {
        const mine = getState().seenAlerts;
        // Only "id:LEVEL" keys: bare ids are old saves' keys that triageAlerts already moved on from.
        const news = Object.fromEntries(Object.entries(ledger).filter(([k]) => k.includes(':') && !mine[k]));
        if (Object.keys(news).length) addSeen(news);
      });
    pull();
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') pull();
    });
    return () => sub.remove();
  }, [ready, getState, addSeen]);

  // The home-screen widget's numbers, redrawn when they change. Colors come from the theme as it is now: a
  // theme switch reloads the app, which pushes again.
  const widget = JSON.stringify(
    snapshotOf(state, { bg: C.bg, card: C.card2, text: C.text, dim: C.dim, accent: C.red, water: C.blue, coffee: C.yellow, game: C.purple }),
  );
  useEffect(() => {
    if (!ready) return;
    pushWidget(JSON.parse(widget)).catch((e) => console.warn('[spider] widget update failed', e));
  }, [ready, widget]);
}
