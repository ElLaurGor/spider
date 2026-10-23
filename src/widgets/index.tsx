// Home-screen widget plumbing (APK 1.5.0+). The app pushes a snapshot when its numbers change (pushWidget);
// Android asks the task handler to draw on add, resize, every 30 minutes and on taps. "+1 glass" and "+1 coffee"
// go through the same queue as the silent reminder buttons (lib/pending-actions.ts), and the widget shows them
// at once. Without the native module (Expo Go, older installs) everything here does nothing.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform, TurboModuleRegistry } from 'react-native';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { dayKey } from '@/lib/dates';
import { enqueue } from '@/lib/pending-actions';
import { forToday, withTap, type WidgetSnapshot } from '@/lib/widget-data';

const KEY = 'spider:widget';

export const widgetsSupported =
  Platform.OS === 'android' && (TurboModuleRegistry.get('AndroidWidget') != null || NativeModules.AndroidWidget != null);

// Required on use: the library looks its native module up as it loads, which throws where it's missing.
/* eslint-disable @typescript-eslint/no-require-imports */
const lib = () => require('react-native-android-widget') as typeof import('react-native-android-widget');
const view = () => require('./hq-widget') as typeof import('./hq-widget');
/* eslint-enable @typescript-eslint/no-require-imports */

async function readSnapshot(): Promise<WidgetSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as WidgetSnapshot) : null;
  } catch {
    return null;
  }
}

let lastPushed = '';

/** Saves the snapshot and redraws any widget on the home screen. Called by the app; skips unchanged snapshots. */
export async function pushWidget(snap: WidgetSnapshot) {
  if (!widgetsSupported) return;
  const json = JSON.stringify(snap);
  if (json === lastPushed) return;
  lastPushed = json;
  await AsyncStorage.setItem(KEY, json);
  const { HqWidget, HQ_WIDGET } = view();
  await lib().requestWidgetUpdate({ widgetName: HQ_WIDGET, renderWidget: () => <HqWidget snap={snap} /> });
}

async function handle(props: WidgetTaskHandlerProps) {
  if (props.widgetAction === 'WIDGET_DELETED') return;
  const now = Date.now();
  const saved = await readSnapshot();
  let snap = saved && forToday(saved, now);
  const { HqWidget, OpenOnce } = view();
  if (props.widgetAction === 'WIDGET_CLICK') {
    const kind = props.clickAction === 'GLASS' ? 'glass' : props.clickAction === 'COFFEE' ? 'coffee' : null;
    if (!kind) return; // "open the app" is handled natively
    if (snap) {
      snap = withTap(snap, kind, now);
      lastPushed = JSON.stringify(snap);
      await AsyncStorage.setItem(KEY, lastPushed);
    }
    props.renderWidget(snap ? <HqWidget snap={snap} /> : <OpenOnce />);
    await enqueue({ kind, day: dayKey(now), at: now });
    return;
  }
  props.renderWidget(snap ? <HqWidget snap={snap} /> : <OpenOnce />);
}

/** Registers the task handler. Called from the app entry, since a widget can start the app without a screen. */
export function setUpWidgets() {
  if (!widgetsSupported) return;
  lib().registerWidgetTaskHandler(handle);
}
