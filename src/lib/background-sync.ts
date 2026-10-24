// The app side of the background work (APK 1.5.0+): keeps the small keys the background tasks read up to date,
// and takes in what they did. The tasks themselves live in silent-buttons.ts, bg-alerts.ts and src/widgets;
// they never load the store.
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { C } from '@/constants/theme';
import { pushWidget } from '@/widgets';

import { addToSeenLedger, readSeenLedger } from './bg-alerts';
import { writeBgConfig } from './bg-config';
import { addDays, dayKey } from './dates';
import { effectiveSavage } from './selectors';
import { toneOn } from './tone';
import type { State } from './types';
import { snapshotOf } from './widget-data';

const widgetColors = () => ({ bg: C.bg, card: C.card2, text: C.text, dim: C.dim, accent: C.red, water: C.blue, coffee: C.yellow, game: C.purple });

/** Redraws the widget from `s` now, for the store's queue (in the background, effects wait for the next render). */
export const pushWidgetFor = (s: State) => pushWidget(snapshotOf(s, widgetColors()));

/** Today's tone and the next two days' (a planned period day, a carried low mood), as the background needs them. */
function tonesAhead(s: State, now = new Date()) {
  const out: Record<string, number> = { [dayKey(now)]: effectiveSavage(s, now) };
  for (const n of [1, 2]) {
    const key = dayKey(addDays(now, n));
    out[key] = toneOn(s, key, now).level;
  }
  return out;
}

type Sync = {
  ready: boolean;
  state: State;
  getState: () => State;
  /** Warnings the background check announced, to add to state.seenAlerts so the app doesn't announce them again. */
  addSeen: (seen: Record<string, number>) => void;
};

export function useBackgroundSync({ ready, state, getState, addSeen }: Sync) {
  const { weather, notify, userName, glassMl } = state.settings;
  const tones = JSON.stringify(tonesAhead(state));
  const banned = JSON.stringify(state.lineMemory?.banned ?? []);
  useEffect(() => {
    if (!ready) return;
    writeBgConfig({
      county: weather?.county,
      town: weather?.name.split(',')[0],
      municipality: weather?.municipality,
      notifySmhi: notify.smhi,
      notifyVma: notify.vma,
      tones: JSON.parse(tones) as Record<string, number>,
      banned: JSON.parse(banned) as string[],
      glassMl,
      name: userName || 'boss',
      color: C.red,
    }).catch((e) => console.warn('[spider] background config failed', e));
  }, [ready, weather?.county, weather?.name, weather?.municipality, notify.smhi, notify.vma, tones, banned, glassMl, userName]);

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
  const widget = JSON.stringify(snapshotOf(state, widgetColors()));
  useEffect(() => {
    if (!ready) return;
    pushWidget(JSON.parse(widget)).catch((e) => console.warn('[spider] widget update failed', e));
  }, [ready, widget]);
}
