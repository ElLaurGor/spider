import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { Card, H, T } from '@/components/ui';
import { C } from '@/constants/theme';
import { readinessFor, type ReadinessTier } from '@/lib/readiness';
import { useStore } from '@/lib/store';

const LOOK: Record<ReadinessTier, { emoji: string; title: string; color: string }> = {
  ready: { emoji: '🟢', title: 'Body: ready', color: C.green },
  steady: { emoji: '🟡', title: 'Body: steady', color: C.yellow },
  easy: { emoji: '🔵', title: 'Body: take it easy', color: C.cyan },
};

/** Morning readiness on HQ until noon: sleep, resting heart rate, sleep rating and energy against her normal. */
export function ReadinessCard() {
  const { state, health } = useStore();
  const now = new Date();
  if (now.getHours() >= 12) return null;
  const r = readinessFor(state, health.data?.restingDays ?? [], now);
  if (!r) return null;
  const look = LOOK[r.tier];

  return (
    <Card accent={look.color}>
      <H
        right={
          <Pressable onPress={() => router.push('/sleep')} hitSlop={8}>
            <Text style={styles.link}>Sleep →</Text>
          </Pressable>
        }>
        {`${look.emoji} ${look.title}`}
      </H>
      {r.reasons.map((reason) => (
        <T key={reason} dim small>
          · {reason}
        </T>
      ))}
      {r.suggestion ? <T small>{r.suggestion}</T> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  link: { color: C.purple, fontWeight: '700', fontSize: 13 },
});
