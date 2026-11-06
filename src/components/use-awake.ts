import { useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, AppState } from 'react-native';

/** Whether something may keep moving: its screen is showing, the app is in front, and the phone doesn't ask for less motion. */
export function useAwake() {
  const focused = useIsFocused();
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [still, setStill] = useState(false);
  useEffect(() => {
    const app = AppState.addEventListener('change', (st) => setActive(st === 'active'));
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setStill);
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setStill)
      .catch(() => {});
    return () => {
      app.remove();
      motion.remove();
    };
  }, []);
  return focused && active && !still;
}
