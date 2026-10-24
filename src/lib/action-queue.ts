// The queue behind pending-actions.ts, over any key-value store (AsyncStorage in the app, a map in the logic
// tests). Pure apart from the store it's handed and the timer it waits with.
import type { QueuedAction } from './reminder-actions';

/** The bits of AsyncStorage the queue needs. */
export type KV = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

const QUEUE_KEY = 'spider:pending-actions';
const TAPS_KEY = 'spider:pending-actions:taps';
const TAP_KEEP_MS = 2 * 86_400_000;

export function createQueue(kv: KV, applyWaitMs = 10_000) {
  // Read-modify-write, one at a time: the tasks and the app share a JS runtime. Also used for the widget's
  // snapshot and the warnings seen-list, so a view of "snapshot plus queue" is never half-applied.
  let lock: Promise<unknown> = Promise.resolve();
  function locked<T>(fn: () => Promise<T>): Promise<T> {
    const next = lock.then(fn, fn);
    lock = next.catch(() => {});
    return next;
  }

  async function readJson<T>(key: string, fallback: T): Promise<T> {
    try {
      const raw = await kv.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  }

  /** True the first time a tap is seen, false if the other path already took it. */
  function claimTap(key: string, now = Date.now()): Promise<boolean> {
    return locked(async () => {
      const taps = await readJson<Record<string, number>>(TAPS_KEY, {});
      if (taps[key]) return false;
      const keep = Object.fromEntries(Object.entries(taps).filter(([, t]) => t > now - TAP_KEEP_MS));
      await kv.setItem(TAPS_KEY, JSON.stringify({ ...keep, [key]: now }));
      return true;
    });
  }

  const listeners = new Set<() => Promise<unknown> | void>();

  /** Runs `fn` whenever something is queued in this JS runtime; `enqueue` waits for what it returns. Returns the unsubscribe. */
  function onQueued(fn: () => Promise<unknown> | void) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }

  /**
   * Queues an action, then waits (a while at most) for a running app to apply and save it. True if an app took
   * it; false when none is running (a headless start), so it waits for the next launch.
   */
  async function enqueue(a: QueuedAction): Promise<boolean> {
    await locked(async () => {
      const q = await readJson<QueuedAction[]>(QUEUE_KEY, []);
      await kv.setItem(QUEUE_KEY, JSON.stringify([...q, a]));
    });
    if (!listeners.size) return false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    await Promise.race([
      Promise.allSettled([...listeners].map(async (fn) => fn())),
      new Promise<void>((done) => {
        timer = setTimeout(done, applyWaitMs);
      }),
    ]);
    clearTimeout(timer);
    return true;
  }

  /** What's queued, oldest first (for views; applying goes through drainQueued). Call it inside `locked` for a steady view. */
  const readQueued = () => readJson<QueuedAction[]>(QUEUE_KEY, []);

  /**
   * Hands everything queued, oldest first, to `apply`, which applies and saves it; the queue lets go of it only
   * then, so a tap is never lost between the two. `then` runs once it's gone, still in turn (a widget redraw
   * sees the saved numbers without the queue). Taps queued meanwhile wait for the lock, so they come after.
   */
  function drainQueued(apply: (q: QueuedAction[]) => Promise<void>, then?: () => Promise<void>): Promise<number> {
    return locked(async () => {
      const q = await readQueued();
      if (!q.length) return 0;
      try {
        await apply(q);
      } finally {
        // Applied in memory even if saving failed: the store keeps retrying the save, and applying twice would double it.
        await kv.setItem(QUEUE_KEY, '[]');
      }
      await then?.().catch((e) => console.warn('[spider] after the queue', e));
      return q.length;
    });
  }

  return { locked, claimTap, onQueued, enqueue, readQueued, drainQueued };
}
