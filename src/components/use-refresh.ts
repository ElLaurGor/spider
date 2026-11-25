import { useStore } from '@/lib/store';

/** What a pull can re-read: the store's own refreshers (each keeps its last good data when a read fails). */
export type RefreshPart = 'cal' | 'health' | 'weather' | 'outside' | 'screen';

/**
 * step 10 ux: pull to refresh on HQ, Plan and Gym (`Screen`'s `onRefresh`). Runs the store's refreshers for
 * `parts` side by side, forced (weather and outside skip their rhythm), and settles when all of them have,
 * failed or not.
 */
export function usePullRefresh(parts: readonly RefreshPart[]) {
  const { cal, health, weather, outside, screen } = useStore();
  const run: Record<RefreshPart, () => Promise<unknown>> = {
    cal: cal.refresh,
    health: health.refresh,
    weather: weather.refresh,
    outside: outside.refresh,
    screen: screen.refresh,
  };
  return () => Promise.allSettled(parts.map((p) => run[p]()));
}
