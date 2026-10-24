// What the background tasks (APK 1.5.0+) need from the app, kept in a key of its own: they run without the
// store when Android starts S.P.I.D.E.R. with no screen, and reading the whole saved state there would be slow.
// The store rewrites it whenever one of these values changes. No theme import here (or anywhere a task loads).
import AsyncStorage from '@react-native-async-storage/async-storage';

export type BgConfig = {
  county?: string; // "Stockholms län": SMHI and VMA are matched on it
  town?: string; // the place name, for municipal VMAs
  municipality?: string; // the kommun (geocoder admin2), also for municipal VMAs
  notifySmhi: boolean;
  notifyVma: boolean;
  /** The tone per day (toneOn) for today and the next two, for lines written in the background; other days get 1. */
  tones: Record<string, number>;
  /** Retired lines (lineMemory.banned): the background never picks them either. */
  banned: string[];
  glassMl: number; // what "+1 glass" adds, for the status line redrawn in the background
  name: string;
  color: string; // notification accent (the theme's red)
};

/** The tone a line written in the background uses on `day`: kind (1) when the app didn't say. */
export const bgTone = (cfg: Pick<BgConfig, 'tones'> | null, day: string) => cfg?.tones?.[day] ?? 1;

const KEY = 'spider:bg:config';
let lastWritten = '';

export async function writeBgConfig(cfg: BgConfig) {
  const json = JSON.stringify(cfg);
  if (json === lastWritten) return;
  lastWritten = json;
  await AsyncStorage.setItem(KEY, json);
}

export async function readBgConfig(): Promise<BgConfig | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as BgConfig) : null;
  } catch {
    return null;
  }
}

// Set by the background check when a storm started while the app was closed: the app's next warnings check
// doesn't wait for its 15-minute rhythm, so the Storm protocol (State.storm) takes over at once.
const STORM_KEY = 'spider:bg:storm';
export const markStormWaiting = () => AsyncStorage.setItem(STORM_KEY, String(Date.now())).catch(() => {});
export const clearStormWaiting = () => AsyncStorage.removeItem(STORM_KEY).catch(() => {});
export async function stormWaiting() {
  try {
    return (await AsyncStorage.getItem(STORM_KEY)) != null;
  } catch {
    return false;
  }
}
