// What usually happens in each part of the cycle: sleep, energy, mood, steps and training, from her own logs.
// Kind by design: these are patterns to plan around, never an excuse and never a roast.
import { cycleMap, PHASE_NAMES, PHASES, phaseOn, type CyclePhase } from './body';
import { addDays, dayKey } from './dates';
import { avgMood, dayOf, trainedOn } from './selectors';
import { family, MIN_SIDE, permP } from './stats';
import type { State } from './types';

export type PhaseStat = {
  phase: CyclePhase;
  days: number;
  sleepMin: number | null; // the night before each day
  energy: number | null;
  mood: number | null;
  steps: number | null;
  trainedPct: number | null; // share of days with training, 0–100
};

const MIN_DAYS = 3; // values needed for an average to count
const avg = (xs: number[]) => (xs.length >= MIN_DAYS ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

type Samples = { days: number; sleep: number[]; energy: number[]; mood: number[]; steps: number[]; trained: number[] };
type Metric = Exclude<keyof Samples, 'days'>;

/**
 * Per-phase averages over the last `windowDays` finished days, plus the values behind them (for the notes'
 * tests). Null until two periods are logged.
 */
export function cycleStats(s: State, now = new Date(), windowDays = 180) {
  const map = cycleMap(s);
  if (map.runs.length < 2) return null;
  const acc = new Map<CyclePhase, Samples>();
  const all = { sleep: [] as number[], energy: [] as number[], mood: [] as number[], steps: [] as number[], trained: [] as number[] };
  for (let i = windowDays; i >= 1; i--) {
    const key = dayKey(addDays(now, -i));
    if (!s.days[key]) continue;
    const phase = phaseOn(s, key, map);
    if (!phase) continue;
    const d = dayOf(s, key);
    const a = acc.get(phase) ?? { days: 0, sleep: [], energy: [], mood: [], steps: [], trained: [] };
    a.days++;
    const push = (k: keyof typeof all, v: number | null | undefined) => {
      if (v == null) return;
      a[k].push(v);
      all[k].push(v);
    };
    push('sleep', d.sleepMin);
    push('energy', d.energy);
    push('mood', avgMood(d));
    push('steps', d.steps);
    push('trained', trainedOn(d) ? 100 : 0);
    acc.set(phase, a);
  }
  const phases: PhaseStat[] = PHASES.filter((p) => acc.has(p)).map((p) => {
    const a = acc.get(p)!;
    return { phase: p, days: a.days, sleepMin: avg(a.sleep), energy: avg(a.energy), mood: avg(a.mood), steps: avg(a.steps), trainedPct: avg(a.trained) };
  });
  const overall = { sleepMin: avg(all.sleep), energy: avg(all.energy), mood: avg(all.mood), steps: avg(all.steps), trainedPct: avg(all.trained) };
  return { cycles: map.runs.length - 1, phases, overall, samples: acc };
}

/** `p`: how likely chance alone gives the difference (stats.ts). */
export type CycleNote = { id: string; phase: CyclePhase; text: string; strength: number; p: number };

const fmtMin = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h ${Math.round(m % 60)} min` : `${Math.round(m)} min`);

/**
 * The clearest differences from the owner's usual, as plain kind sentences, strongest first. A note needs the
 * phase and the rest of the cycle to differ clearly (8+ days each side, a permutation test, and the cut across
 * every phase and measure compared), not just by the luck of a few days.
 */
export function cycleNotes(stats: ReturnType<typeof cycleStats>): CycleNote[] {
  if (!stats) return [];
  const { overall, samples } = stats;
  const fam = family<CycleNote>();
  /** This phase's values against every other phase's, or null without enough days on either side. */
  const tested = (phase: CyclePhase, k: Metric) => {
    const mine = samples.get(phase)?.[k] ?? [];
    const rest = [...samples.entries()].filter(([q]) => q !== phase).flatMap(([, a]) => a[k]);
    if (mine.length < MIN_SIDE || rest.length < MIN_SIDE) return null;
    const p = () => permP(mine, rest);
    return { p, test: fam.test(p) };
  };
  const pOf = new Map<string, () => number>();
  const note = (n: Omit<CycleNote, 'p'>, t: { p: () => number; test: number } | null) => {
    if (!t) return;
    pOf.set(n.id, t.p);
    fam.add({ ...n, p: 1 }, t.test);
  };
  for (const p of stats.phases) {
    const when = PHASE_NAMES[p.phase];
    const When = when[0].toUpperCase() + when.slice(1);
    if (p.sleepMin != null && overall.sleepMin != null && Math.abs(p.sleepMin - overall.sleepMin) >= 15) {
      const diff = p.sleepMin - overall.sleepMin;
      note(
        {
          id: `sleep_${p.phase}`,
          phase: p.phase,
          text: `${When}: you sleep about ${fmtMin(Math.abs(diff))} ${diff > 0 ? 'more' : 'less'} than usual.${diff > 0 ? ' Your body asks for it. Let it.' : ''}`,
          strength: Math.abs(diff) / 25,
        },
        tested(p.phase, 'sleep'),
      );
    }
    if (p.energy != null && overall.energy != null && Math.abs(p.energy - overall.energy) >= 0.4) {
      const up = p.energy > overall.energy;
      note(
        {
          id: `energy_${p.phase}`,
          phase: p.phase,
          text: `${When}: your energy tends to be ${up ? 'higher' : 'lower'} (${p.energy.toFixed(1)} vs ${overall.energy.toFixed(1)}/5).${up ? ' Good days for the hard stuff.' : ' Plan lighter days then.'}`,
          strength: Math.abs(p.energy - overall.energy) / 0.6,
        },
        tested(p.phase, 'energy'),
      );
    }
    if (p.mood != null && overall.mood != null && Math.abs(p.mood - overall.mood) >= 0.4) {
      const up = p.mood > overall.mood;
      note(
        {
          id: `mood_${p.phase}`,
          phase: p.phase,
          text: `${When}: your mood tends to be ${up ? 'brighter' : 'lower'} (${p.mood.toFixed(1)} vs ${overall.mood.toFixed(1)}/5).${up ? '' : ' Be extra kind to yourself then.'}`,
          strength: Math.abs(p.mood - overall.mood) / 0.6,
        },
        tested(p.phase, 'mood'),
      );
    }
    if (p.steps != null && overall.steps != null && overall.steps > 0 && Math.abs(p.steps - overall.steps) / overall.steps >= 0.15) {
      const pct = Math.round(((p.steps - overall.steps) / overall.steps) * 100);
      const text = `${When}: you walk about ${Math.abs(pct)}% ${pct > 0 ? 'more' : 'less'} than usual.`;
      note({ id: `steps_${p.phase}`, phase: p.phase, text, strength: Math.abs(pct) / 20 }, tested(p.phase, 'steps'));
    }
    if (p.trainedPct != null && overall.trainedPct != null && Math.abs(p.trainedPct - overall.trainedPct) >= 20) {
      const more = p.trainedPct > overall.trainedPct;
      note(
        {
          id: `train_${p.phase}`,
          phase: p.phase,
          text: `${When}: you train on ${Math.round(p.trainedPct)}% of days, vs ${Math.round(overall.trainedPct)}% overall.${more ? '' : ' Rest is training too.'}`,
          strength: Math.abs(p.trainedPct - overall.trainedPct) / 30,
        },
        tested(p.phase, 'trained'),
      );
    }
  }
  return fam
    .kept()
    .map((n) => ({ ...n, p: pOf.get(n.id)?.() ?? 1 })) // cached: worked out for the cut already
    .sort((a, b) => b.strength - a.strength);
}
