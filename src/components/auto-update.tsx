import * as Updates from 'expo-updates';
import { useEffect } from 'react';

import { useStore } from '@/lib/store';

/** Applies a downloaded over-the-air update right away instead of on the next launch. */
export function AutoUpdate() {
  const { isUpdatePending } = Updates.useUpdates();
  const { saveNow } = useStore();

  useEffect(() => {
    if (!isUpdatePending) return;
    // Write any unsaved changes first; nothing should run after reloadAsync.
    saveNow()
      .catch(() => {})
      .then(() => Updates.reloadAsync());
  }, [isUpdatePending, saveNow]);

  return null;
}
