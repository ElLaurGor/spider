// What the background tasks (APK 1.5.0+) need from the app, kept in a key of its own: they run without the
// store when Android starts S.P.I.D.E.R. with no screen, and reading the whole saved state there would be slow.
// The store rewrites it whenever one of these values changes. No theme import here (or anywhere a task loads).
import AsyncStorage from '@react-native-async-storage/async-storage';

export type BgConfig = {
  county?: string; // "Stockholms län": SMHI and VMA are matched on it
  town?: string; // the place name, for municipal VMAs
  notifySmhi: boolean;
  notifyVma: boolean;
  savage: number; // today's effective tone, for lines written in the background
  name: string;
  color: string; // notification accent (the theme's red)
};

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
