// How the state is stored. v1 kept everything in one AsyncStorage row, but Android reads a row
// through a 2 MB CursorWindow: past that, writes still work and every read throws. v2 keeps the
// state without its days in one row and each month of days in its own row (~4 KB a day, so a
// month stays far below the limit). Pure apart from the storage it's handed, so it's testable offline.
import { isDayKey } from './dates';
import type { DayLog, State } from './types';

export const V1_KEY = 'spider:state:v1';
export const BASE_KEY = 'spider:state:v2:base';
export const INDEX_KEY = 'spider:state:v2:months';
export const monthKey = (month: string) => `spider:state:v2:days:${month}`;
/** Android's CursorWindow: a single row bigger than this can be written but never read back. */
export const ROW_LIMIT = 2 * 1024 * 1024;

type Days = State['days'];
export type Index = { months: string[]; migratedAt?: number };
/** The bits of AsyncStorage this needs (an in-memory map in the tests). */
export type Storage = {
  getItem(key: string): Promise<string | null>;
  multiGet(keys: readonly string[]): Promise<readonly (readonly [string, string | null])[]>;
  multiSet(pairs: readonly (readonly [string, string])[]): Promise<void>;
  multiRemove(keys: readonly string[]): Promise<void>;
};

export const monthOf = (day: string) => day.slice(0, 7);

/** UTF-8 size of a string, which is what the row limit counts. */
export function utf8Bytes(s: string) {
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    n += c < 0x80 ? 1 : c < 0x800 ? 2 : c >= 0xd800 && c < 0xdc00 ? 4 : c >= 0xdc00 && c < 0xe000 ? 0 : 3;
  }
  return n;
}

/** Days grouped by month. Keys that aren't dates are left out (hydrate() moves their contents first). */
export function daysByMonth(days: Days) {
  const out: Record<string, Record<string, DayLog>> = {};
  for (const [k, d] of Object.entries(days)) if (isDayKey(k)) (out[monthOf(k)] ??= {})[k] = d;
  return out;
}

/** Months with a day that was added, removed or replaced since `prev` (all of them when there's no `prev`). */
export function changedMonths(prev: Days | null, next: Days) {
  const out = new Set<string>();
  for (const [k, d] of Object.entries(next)) if (isDayKey(k) && (!prev || prev[k] !== d)) out.add(monthOf(k));
  if (prev) for (const k of Object.keys(prev)) if (isDayKey(k) && !(k in next)) out.add(monthOf(k));
  return out;
}

/** The rows to write for `s`, given the days as last written, plus the month rows that are no longer needed. */
export function rowsFor(s: State, prev: Days | null, prevMonths: string[], migratedAt?: number) {
  const { days, ...base } = s;
  const byMonth = daysByMonth(days);
  const months = Object.keys(byMonth).sort();
  const index: Index = { months, ...(migratedAt ? { migratedAt } : {}) };
  const pairs: [string, string][] = [
    [BASE_KEY, JSON.stringify(base)],
    [INDEX_KEY, JSON.stringify(index)],
  ];
  for (const m of changedMonths(prev, days)) if (byMonth[m]) pairs.push([monthKey(m), JSON.stringify(byMonth[m])]);
  const gone = prevMonths.filter((m) => !byMonth[m]).map(monthKey);
  return { pairs, gone, months };
}

export type Saved =
  | { source: 'none'; saved: null }
  | { source: 'v1'; saved: Partial<State>; raw: string }
  | { source: 'v2'; saved: Partial<State>; index: Index; sizes: Record<string, number> };

/** Saved data that's there but can't be read. `stage` says which layout failed (v2 failing leaves v1 to fall back on). */
export class ReadError extends Error {
  constructor(
    readonly stage: 'v1' | 'v2',
    cause: unknown,
  ) {
    super(cause instanceof Error ? cause.message : String(cause));
  }
}

async function readV2(st: Storage, base: string, rawIndex: string | null): Promise<Saved> {
  if (rawIndex == null) throw new Error('the list of months is missing');
  const index = JSON.parse(rawIndex) as Index;
  const rows = await st.multiGet(index.months.map(monthKey));
  const days: Days = {};
  const sizes: Record<string, number> = { [BASE_KEY]: utf8Bytes(base) };
  for (const [k, v] of rows) {
    if (v == null) throw new Error(`${k.slice(-7)} is missing`);
    Object.assign(days, JSON.parse(v) as Days);
    sizes[k] = utf8Bytes(v);
  }
  return { source: 'v2', saved: { ...(JSON.parse(base) as Partial<State>), days }, index, sizes };
}

/** Reads the saved state. Throws a ReadError when something is there but can't be read, so nothing gets saved over it. */
export async function readSaved(st: Storage): Promise<Saved> {
  try {
    const [[, base], [, rawIndex]] = await st.multiGet([BASE_KEY, INDEX_KEY]);
    if (base != null) return await readV2(st, base, rawIndex);
  } catch (e) {
    throw new ReadError('v2', e);
  }
  try {
    const raw = await st.getItem(V1_KEY);
    if (raw == null) return { source: 'none', saved: null };
    return { source: 'v1', saved: JSON.parse(raw) as Partial<State>, raw };
  } catch (e) {
    throw new ReadError('v1', e);
  }
}

/** The v1 row, for the recovery screen's "older copy", with when it was moved to v2 (if the index can tell). */
export async function olderCopy(st: Storage): Promise<{ at: number | null } | null> {
  try {
    const [[, v1], [, rawIndex]] = await st.multiGet([V1_KEY, INDEX_KEY]);
    if (v1 == null) return null;
    let at: number | null = null;
    try {
      at = rawIndex ? ((JSON.parse(rawIndex) as Index).migratedAt ?? null) : null;
    } catch {
      // the index is part of what's broken
    }
    return { at };
  } catch {
    return null;
  }
}

/** Writes the rows, then reads them back: true only if every row came back exactly as written. */
export async function writeVerified(st: Storage, pairs: [string, string][]) {
  await st.multiSet(pairs);
  const back = await st.multiGet(pairs.map(([k]) => k));
  const want = new Map(pairs);
  return back.length === pairs.length && back.every(([k, v]) => v != null && v === want.get(k));
}

/** A save that would throw away most of the history: refused unless the user asked for it (reset, restore). */
export function wouldWipe(savedDays: number, nextDays: number) {
  return savedDays >= 7 && (nextDays < 2 || nextDays < savedDays * 0.2);
}
