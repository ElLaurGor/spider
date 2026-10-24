// Is a difference in the owner's own data real, or the noise any two sets of days have? Insights, the symptom
// detective, the cycle notes and the self-experiments all ask this the same way: enough days on each side, a
// permutation test (shuffle which days were "yes" and see how often chance alone gives as big a gap), and the
// Benjamini–Hochberg cut across everything compared at once, so trying 30 comparisons doesn't find 1.5 by luck.
// Deterministic: the shuffles are seeded from the numbers themselves, so a finding never flickers between renders.

/** Days needed on each side of a comparison. */
export const MIN_SIDE = 8;
/** The p-value a finding needs before the many-comparisons cut. */
export const P_MAX = 0.05;
/** The false-discovery rate allowed across findings shown together. */
export const FDR_Q = 0.1;
const ROUNDS = 1000;

/** Two 32-bit hashes of the values (FNV-1a and a second multiplier): the cache key and the shuffle seed. */
function hashOf(yes: number[], no: number[]) {
  let a = 0x811c9dc5;
  let b = 0x9747b28c;
  const mix = (x: number) => {
    const v = Math.round(x * 1000) | 0;
    a = Math.imul(a ^ v, 0x01000193);
    b = Math.imul(b ^ v, 0x5bd1e995);
  };
  for (const x of yes) mix(x);
  mix(1e9); // the split between the two sides
  for (const x of no) mix(x);
  return { a: a >>> 0, b: b >>> 0 };
}

/** mulberry32: a small, fast, seedable generator. */
function rng(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const cache = new Map<string, number>();
const CACHE_MAX = 600;
/** Sequential stopping (Besag & Clifford): once this many shuffles beat the real gap, the p-value is clearly large. */
const ENOUGH = 20;

/**
 * Two-sided p-value for "the average of `yes` differs from the average of `no`": the share of up to 1000
 * random relabellings of the same days with at least as big a gap (stopping early once it's clearly not a
 * finding). Cached by the values, so re-renders cost nothing.
 */
export function permP(yes: number[], no: number[], rounds = ROUNDS): number {
  if (!yes.length || !no.length) return 1;
  const h = hashOf(yes, no);
  const key = `${yes.length}:${no.length}:${h.a}:${h.b}:${rounds}`;
  const hit = cache.get(key);
  if (hit != null) return hit;
  const pool = [...yes, ...no];
  const n = pool.length;
  const k = yes.length;
  const total = pool.reduce((x, y) => x + y, 0);
  const sumYes = yes.reduce((x, y) => x + y, 0);
  const observed = Math.abs(sumYes / k - (total - sumYes) / (n - k));
  const rand = rng(h.a ^ h.b);
  let asBig = 0;
  let done = 0;
  for (let r = 0; r < rounds; r++) {
    // A partial Fisher–Yates shuffle: the first k of the pool become this round's "yes" days.
    let sum = 0;
    for (let i = 0; i < k; i++) {
      const j = i + Math.floor(rand() * (n - i));
      const t = pool[i];
      pool[i] = pool[j];
      pool[j] = t;
      sum += pool[i];
    }
    if (Math.abs(sum / k - (total - sum) / (n - k)) >= observed - 1e-9 && ++asBig >= ENOUGH) break;
    done++;
  }
  const p = asBig >= ENOUGH ? asBig / (done + 1) : (asBig + 1) / (rounds + 1);
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value!);
  cache.set(key, p);
  return p;
}

/** Which p-values survive the Benjamini–Hochberg cut at `q`, in the order given. */
export function bhKeep(ps: number[], q = FDR_Q): boolean[] {
  const m = ps.length;
  const order = ps.map((p, i) => ({ p, i })).sort((x, y) => x.p - y.p);
  let cut = -1;
  order.forEach((x, rank) => {
    if (x.p <= ((rank + 1) / m) * q) cut = rank;
  });
  const keep = ps.map(() => false);
  for (let r = 0; r <= cut; r++) keep[order[r].i] = true;
  return keep;
}

/**
 * Collects the comparisons one screen makes, then keeps the findings that are clear on their own (p < P_MAX)
 * and survive the cut across all of them. Every test counts toward the cut, shown or not. A test's p-value is
 * only worked out if a finding uses it (one too small to matter counts as p = 1, which only makes the cut
 * stricter), so a screen with 40 comparisons runs a handful of permutation tests.
 */
export function family<T>() {
  const tests: (() => number)[] = [];
  const found: { item: T; test: number }[] = [];
  return {
    /** Records a comparison (its p-value, or how to work it out); the returned index ties a finding to it. */
    test(p: number | (() => number)) {
      tests.push(typeof p === 'number' ? () => p : p);
      return tests.length - 1;
    },
    add(item: T, test: number) {
      found.push({ item, test });
    },
    /** Adds a finding that isn't a comparison (a plain measurement): it skips the cut. */
    addPlain(item: T) {
      found.push({ item, test: -1 });
    },
    kept(): T[] {
      const used = new Set(found.map((f) => f.test));
      const ps = tests.map((p, i) => (used.has(i) ? p() : 1));
      const keep = bhKeep(ps);
      return found.filter((f) => f.test < 0 || (ps[f.test] < P_MAX && keep[f.test])).map((f) => f.item);
    },
  };
}
