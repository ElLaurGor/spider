// step 9 story: this install's id, kept in its own AsyncStorage row outside the saved state, so a backup restored
// on another install (a new phone) can tell (meta-winks.ts withRestore). Clearing the app's data makes a new one.
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'spider:install:v1';
let cached: string | null = null;

/** This install's id, made the first time it's asked for. Null when storage can't be read (nothing is compared then). */
export async function installId(): Promise<string | null> {
  if (cached) return cached;
  try {
    const had = await AsyncStorage.getItem(KEY);
    if (had) return (cached = had);
    const id = `i${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    await AsyncStorage.setItem(KEY, id);
    return (cached = id);
  } catch (e) {
    console.warn('[spider] install id unavailable', e);
    return null;
  }
}
