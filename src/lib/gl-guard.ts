// A guard against native GL crashes, which no try/catch can see: while a 3D view is drawing on screen a flag is
// set in AsyncStorage, and it's cleared when the view stops (hidden, the app in the background, unmounted). If the
// app starts with the flag still set, the last session died while drawing in 3D, so the terrarium goes flat
// until the owner asks for 3D again (components/lair-card.tsx TerrariumView).
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'spider:terr3d:live';

let live = 0;
let written: '0' | '1' | null = null;
let checked: Promise<boolean> | null = null;

const write = (v: '0' | '1') => {
  if (written === v) return;
  written = v;
  AsyncStorage.setItem(KEY, v).catch(() => {});
};

/** A 3D view started (true) or stopped (false) drawing on screen. Several can be live at once (HQ and the shop). */
export function glLive(on: boolean) {
  live = Math.max(0, live + (on ? 1 : -1));
  write(live > 0 ? '1' : '0');
}

/** Whether the last session ended while a 3D view was drawing: read once per app start, before any view writes. */
export const crashedInGl = () => (checked ??= AsyncStorage.getItem(KEY).then((v) => v === '1').catch(() => false));

/** Before the app reloads itself (an update, a theme switch): no React cleanup runs then, so the flag goes down here. */
export async function glReset() {
  written = '0';
  live = 0;
  await AsyncStorage.setItem(KEY, '0').catch(() => {});
}

/** The owner asked for 3D again after a crash. */
export function glForgive() {
  checked = Promise.resolve(false);
  write('0');
}

// Real shadows (the terrarium round) are new GL work: they're tried once, kept once a few frames drew fine, and
// switched off for good after a crash while they were still being tried (or a shader that failed with them).
const SHADOWS = 'spider:terr3d:shadows';
let shadowState: Promise<'ok' | 'off' | 'new'> | null = null;
let shadowWritten = false;

/** Whether the 3D tank may draw real shadows. */
export const shadowsAllowed = () =>
  (shadowState ??= Promise.all([AsyncStorage.getItem(SHADOWS), crashedInGl()])
    .then(([v, crashed]): 'ok' | 'off' | 'new' => {
      if (v === 'off') return 'off';
      if (v !== 'ok' && crashed) {
        AsyncStorage.setItem(SHADOWS, 'off').catch(() => {});
        return 'off';
      }
      return v === 'ok' ? 'ok' : 'new';
    })
    .catch((): 'off' => 'off')).then((x) => x !== 'off');

/** Shadows drew fine for a while: keep them. */
export function shadowsWorked() {
  if (shadowWritten) return;
  shadowWritten = true;
  AsyncStorage.setItem(SHADOWS, 'ok').catch(() => {});
}

/** A shader failed with shadows on: the tank goes on without them, for good. */
export function shadowsFailed() {
  shadowWritten = true;
  shadowState = Promise.resolve('off');
  AsyncStorage.setItem(SHADOWS, 'off').catch(() => {});
}
