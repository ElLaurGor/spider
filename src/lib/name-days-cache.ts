// The almanac's year (name-days.ts), fetched once per year and kept on the phone in its own small row
// (`spider:namedays:v1:<year>`, about 10 kB), outside the saved state. A failed fetch keeps nothing and shows
// nothing; it's tried again on a later run, or after RETRY_MS in the same one.
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getJson } from './http';
import { NAME_DAYS_URL, parseNameDays, type YearNames } from './name-days';

const KEY = (year: number) => `spider:namedays:v1:${year}`;
const RETRY_MS = 10 * 60_000;

const memory = new Map<number, YearNames>();
const loading = new Map<number, Promise<YearNames | null>>();
const failedAt = new Map<number, number>();

/** The year's almanac if it's already loaded in this run (notifications use it as it is). */
export const cachedNameDays = (year: number) => memory.get(year) ?? null;

/** The year's almanac: from memory, from the phone, or fetched (then kept). Null when none can be had right now. */
export function loadNameDays(year: number): Promise<YearNames | null> {
  const hit = memory.get(year);
  if (hit) return Promise.resolve(hit);
  const running = loading.get(year);
  if (running) return running;
  const job = (async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY(year));
      const saved = raw ? (JSON.parse(raw) as YearNames) : null;
      if (saved?.year === year && saved.days) {
        memory.set(year, saved);
        return saved;
      }
    } catch {
      // an unreadable row: fetch it again
    }
    if (Date.now() - (failedAt.get(year) ?? 0) < RETRY_MS) return null;
    try {
      const data = parseNameDays(await getJson<unknown>(NAME_DAYS_URL(year), 'Name days', { timeoutMs: 20_000 }), year);
      if (!data) throw new Error('Name days: not a whole year');
      memory.set(year, data);
      await AsyncStorage.setItem(KEY(year), JSON.stringify(data)).catch(() => {});
      return data;
    } catch (e) {
      failedAt.set(year, Date.now());
      console.warn('[spider] name days unavailable', e);
      return null;
    }
  })().finally(() => loading.delete(year));
  loading.set(year, job);
  return job;
}
