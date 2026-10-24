import { router } from 'expo-router';
import { Pressable } from 'react-native';

import { Bar, Card, H, T, useNow } from '@/components/ui';
import { C } from '@/constants/theme';
import { useStore } from '@/lib/store';
import { lengthOf, ordinal, trekStatus } from '@/lib/trek';

const fmtKm = (km: number) => (km < 100 ? km.toFixed(1) : String(Math.round(km)));

/** HQ: how far the watch steps have walked the spider, or an invitation once there are steps to walk with. */
export function TrekCard() {
  const { state } = useStore();
  const now = useNow(60_000);
  const st = trekStatus(state, new Date(now));
  if (!st) {
    if (!Object.values(state.days).some((d) => d.steps != null)) return null;
    return (
      <Pressable onPress={() => router.push('/trek')}>
        <Card>
          <H right={<T dim small>pick a route →</T>}>🥾 Virtual trek</H>
          <T dim small>
            Your watch steps can walk the spider down every tunnelbana line, or along Sörmlandsleden. Totals only: a day off just leaves it standing.
          </T>
        </Card>
      </Pressable>
    );
  }
  const total = lengthOf(st.route);
  return (
    <Pressable onPress={() => router.push('/trek')}>
      <Card>
        <H right={<T dim small>trek →</T>}>
          {st.route.emoji} {st.route.name}
        </H>
        <T>
          {fmtKm(st.km)} of {Math.round(total)} km
        </T>
        <Bar pct={(st.km / total) * 100} color={C.green} />
        <T dim small>
          {st.done ? 'Walked end to end. Pick the next route.' : `Next: ${st.next?.name} in ${fmtKm(st.toNext)} km`} · {ordinal(st.rank)} of {st.of} on the trail
        </T>
      </Card>
    </Pressable>
  );
}
