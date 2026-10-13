import { useShareIntentContext } from 'expo-share-intent';
import { useEffect } from 'react';

import { openSoon } from '@/lib/store';

/** Opens the share screen when another app shares something with S.P.I.D.E.R. (APK 1.4.0+). */
export function ShareInbox() {
  const { hasShareIntent } = useShareIntentContext();
  useEffect(() => {
    if (hasShareIntent) openSoon('/share');
  }, [hasShareIntent]);
  return null;
}
