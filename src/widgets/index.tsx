// Home-screen widget plumbing (APK 1.5.0+). The app pushes a snapshot when its numbers change (pushWidget);
// Android asks the task handler to draw on add, resize, every 30 minutes and on taps. "+1 glass" and "+1 coffee"
// go through the same queue as the silent reminder buttons (lib/pending-actions.ts). The widget always draws the
// snapshot plus whatever is still queued for today (withQueued), so a tap shows at once, also one made on a
// notification while the app isn't running, and never twice once the app has taken it in.
// Without the native module (Expo Go, older installs) everything here does nothing.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform, TurboModuleRegistry } from 'react-native';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { dayKey } from '@/lib/dates';
import { enqueue, locked, readQueued } from '@/lib/pending-actions';
import { withQueued, type WidgetSnapshot } from '@/lib/widget-data';

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

let lastSaved = '';
let lastShown = '';

/** Draws `snap` on every widget on the home screen, unless that's what was drawn last. */
async function draw(snap: WidgetSnapshot) {
  const json = JSON.stringify(snap);
  if (json === lastShown) return;
  lastShown = json;
  const { HqWidget, HQ_WIDGET } = view();
  await lib().requestWidgetUpdate({ widgetName: HQ_WIDGET, renderWidget: () => <HqWidget snap={snap} /> });
}

/**
 * What to draw: the saved snapshot plus today's queued taps, read in one go (the queue's lock: the store drains
 * the queue and pushes its snapshot under it). Null before the app ever pushed one.
 */
function currentSnapshot(now = Date.now()): Promise<WidgetSnapshot | null> {
  return locked(async () => {
    const saved = await readSnapshot();
    return saved && withQueued(saved, await readQueued(), now);
  });
}

/**
 * Saves the snapshot and redraws the widget with what's still queued on top. Called by the app, also from inside
 * the queue's lock (right after a drain), so it reads the queue without taking the lock. What's drawn is compared,
 * not the snapshot: a push while a drain was applying the queue showed some taps twice, and the push after the
 * drain must still redraw.
 */
export async function pushWidget(snap: WidgetSnapshot) {
  if (!widgetsSupported) return;
  const json = JSON.stringify(snap);
  if (json !== lastSaved) {
    lastSaved = json;
    await AsyncStorage.setItem(KEY, json);
  }
  await draw(withQueued(snap, await readQueued()));
}

/** Redraws the widget from what's saved and queued, for a tap queued while the app isn't running. */
export async function refreshWidget() {
  if (!widgetsSupported) return;
  const snap = await currentSnapshot();
  if (snap) await draw(snap);
}

async function handle(props: WidgetTaskHandlerProps) {
  if (props.widgetAction === 'WIDGET_DELETED') return;
  const now = Date.now();
  const { HqWidget, OpenOnce } = view();
  if (props.widgetAction === 'WIDGET_CLICK') {
    const kind = props.clickAction === 'GLASS' ? 'glass' : props.clickAction === 'COFFEE' ? 'coffee' : null;
    if (!kind) return; // "open the app" is handled natively
    // Queued first, so the tap survives even if Android ends this task while it draws.
    await enqueue({ kind, day: dayKey(now), at: now });
  }
  const snap = await currentSnapshot(now);
  if (snap) lastShown = JSON.stringify(snap);
  props.renderWidget(snap ? <HqWidget snap={snap} /> : <OpenOnce />);
}

/** Registers the task handler. Called from the app entry, since a widget can start the app without a screen. */
export function setUpWidgets() {
  if (!widgetsSupported) return;
  lib().registerWidgetTaskHandler(handle);
}
