// The app side of the background work (APK 1.5.0+): keeps the small keys the background tasks read up to date.
// The tasks themselves live in silent-buttons.ts, bg-alerts.ts and src/widgets; they never load the store.
import { useEffect } from 'react';

import { C } from '@/constants/theme';

import { writeBgConfig } from './bg-config';
import { effectiveSavage } from './selectors';
import type { State } from './types';

export function useBackgroundSync(ready: boolean, state: State) {
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
}
