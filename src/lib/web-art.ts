// The day's web: generative art from what you did. Radial threads are glasses of water, the
// spiral rings are habits and quests, thick silk is training, dew is sleep, frayed strands are
// gaming over budget, caught bundles are finished tasks and the color is the mood.
// Body data and food are never part of it.
import { dayKey, MIN } from './dates';
import { habitsDone } from './habits';
import { avgMood, dayOf, gamingBudgetMin, gamingUsedMs, trainMinutes } from './selectors';
import type { MoodLevel, State } from './types';

export type WebParams = {
  threads: number; // radial threads, 3–16 (glasses of water)
  rings: number; // spiral rings, 1–9 (habits + quests done)
  stroke: number; // silk thickness, 1–3 (training)
  dew: number; // dew drops, 0–12 (hours of sleep)
  frays: number; // frayed strands, 0–6 (gaming over budget)
  catches: number; // silk bundles, 0–6 (tasks finished)
  mood: MoodLevel | null;
  empty: boolean; // nothing logged that day
};

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function webParams(s: State, key = dayKey()): WebParams {
  const d = dayOf(s, key);
  const habits = habitsDone(s, key).length;
  const quests = (d.questsDone ?? []).length;
  const tasks = s.tasks.filter((t) => t.done && t.doneAt && dayKey(t.doneAt) === key).length;
  const train = trainMinutes(d) + d.sets.length * 3;
  const overMin = Math.max(0, (gamingUsedMs({ ...s, activeGame: null }, key) - gamingBudgetMin(s, key) * MIN) / MIN);
  const mood = avgMood(d);
  const empty = !d.water.length && !habits && !quests && !tasks && !train && !d.sleepMin && mood == null;
  return {
    threads: clamp(d.water.length, 3, 16),
    rings: clamp(1 + habits + quests, 1, 9),
    stroke: 1 + clamp(train / 30, 0, 2),
    dew: clamp(Math.round((d.sleepMin ?? 0) / 60), 0, 12),
    frays: clamp(Math.ceil(overMin / 15), 0, 6),
    catches: clamp(tasks, 0, 6),
    mood: mood == null ? null : (clamp(Math.round(mood), 1, 5) as MoodLevel),
    empty,
  };
}

export type Seg = { x1: number; y1: number; x2: number; y2: number; w: number; kind: 'thread' | 'ring' | 'fray' };
export type Dot = { x: number; y: number; r: number; kind: 'dew' | 'catch' };

/** A small seeded random generator (mulberry32), so a day's web always looks the same. */
function rng(seed: string) {
  let a = 0;
  for (let i = 0; i < seed.length; i++) a = Math.imul(a ^ seed.charCodeAt(i), 2654435761);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Lines and dots for a web of `size` × `size`, seeded by the day so it's stable. */
export function webGeometry(p: WebParams, size: number, seed: string): { segs: Seg[]; dots: Dot[] } {
  const rand = rng(seed);
  const c = size / 2;
  const R = size * 0.46;
  const n = p.threads;
  const start = -Math.PI / 2 + (rand() - 0.5) * 0.4;
  const angles = Array.from({ length: n }, (_, i) => start + (i * 2 * Math.PI) / n + (rand() - 0.5) * (Math.PI / n) * 0.35);
  const reach = angles.map(() => R * (0.86 + rand() * 0.14));
  const at = (i: number, r: number) => {
    const a = angles[((i % n) + n) % n];
    const rr = Math.min(r, reach[((i % n) + n) % n]);
    return { x: c + rr * Math.cos(a), y: c + rr * Math.sin(a) };
  };
  const segs: Seg[] = [];
  const dots: Dot[] = [];
  const silk = p.stroke;

  for (let i = 0; i < n; i++) {
    const e = at(i, R);
    segs.push({ x1: c, y1: c, x2: e.x, y2: e.y, w: silk * 0.9, kind: 'thread' });
  }
  // A spiral: each ring's radius creeps outward thread by thread.
  const inner = R * 0.14;
  const step = (R * 0.86 - inner) / (p.rings + 0.5);
  for (let k = 0; k < p.rings; k++) {
    for (let i = 0; i < n; i++) {
      const r1 = inner + step * (k + i / n);
      const r2 = inner + step * (k + (i + 1) / n);
      const a = at(i, r1);
      const b = at(i + 1, r2);
      segs.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, w: Math.max(0.8, silk * 0.6), kind: 'ring' });
    }
  }
  // Frayed strands hang loose off the outer ring.
  for (let f = 0; f < p.frays; f++) {
    const i = Math.floor(rand() * n);
    const s0 = at(i, inner + step * p.rings);
    const a = angles[i] + 0.5 + rand() * 0.8;
    const len = R * (0.18 + rand() * 0.18);
    segs.push({ x1: s0.x, y1: s0.y, x2: s0.x + len * Math.cos(a), y2: s0.y + len * Math.sin(a), w: 1, kind: 'fray' });
  }
  for (let k = 0; k < p.dew; k++) {
    const i = Math.floor(rand() * n);
    const ring = Math.floor(rand() * p.rings);
    const pt = at(i, inner + step * (ring + i / n));
    dots.push({ x: pt.x, y: pt.y, r: size * 0.014 + rand() * size * 0.008, kind: 'dew' });
  }
  for (let k = 0; k < p.catches; k++) {
    const i = Math.floor(rand() * n);
    const ring = Math.min(p.rings - 1, Math.floor(rand() * p.rings));
    const a = at(i, inner + step * (ring + 0.5));
    const b = at(i + 1, inner + step * (ring + 0.5));
    dots.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, r: size * 0.024, kind: 'catch' });
  }
  return { segs, dots };
}

/** Days worth showing in the gallery: newest first, only days with something logged. */
export function webDays(s: State, limit = 28, now = new Date()): string[] {
  const today = dayKey(now);
  return Object.keys(s.days)
    .filter((k) => k <= today && !webParams(s, k).empty)
    .sort()
    .reverse()
    .slice(0, limit);
}
