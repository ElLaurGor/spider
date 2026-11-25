// The toast queue (store.tsx say()): a burst of messages from one action (a Monday rollover can bring six) keeps
// the one showing and every toast with a button (an Undo, a fly to catch), and drops the oldest plain ones waiting.
// Pure, so the tests can run it.

/** Toasts waiting at most, the one showing included. */
export const TOAST_QUEUE = 5;

export function trimToasts<T extends { action?: unknown }>(queue: T[], max = TOAST_QUEUE): T[] {
  const q = [...queue];
  while (q.length > max) {
    const plain = q.findIndex((t, i) => i > 0 && !t.action);
    q.splice(plain > 0 ? plain : 1, 1);
  }
  return q;
}
