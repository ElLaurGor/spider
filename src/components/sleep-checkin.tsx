import { Pressable, StyleSheet, Text } from 'react-native';

import { Card, H, Row, T } from '@/components/ui';
import { C } from '@/constants/theme';
import { SLEEP_RATINGS } from '@/lib/body';
import { fmtDuration } from '@/lib/dates';
import { dayOf } from '@/lib/selectors';
import { useStore } from '@/lib/store';
import type { Rating } from '@/lib/types';

const ENERGY: { rating: Rating; emoji: string; label: string }[] = [
  { rating: 1, emoji: '🪫', label: 'Empty' },
  { rating: 2, emoji: '🔋', label: 'Low' },
  { rating: 3, emoji: '🔋', label: 'OK' },
  { rating: 4, emoji: '🔋', label: 'Good' },
  { rating: 5, emoji: '⚡', label: 'Full' },
];

/** Morning card on HQ: rate last night's sleep and today's energy. Hidden once both are done or after 14:00. */
export function SleepCheckIn() {
  const { state, actions, health } = useStore();
  const today = dayOf(state);
  if ((today.sleepRating != null && today.energy != null) || new Date().getHours() >= 14) return null;
  const watch = health.data?.sleepMin ?? today.sleepMin;

  return (
    <Card accent={C.purple}>
      {today.sleepRating == null ? (
        <>
          <H right={watch != null ? <T dim small>⌚ {fmtDuration(watch * 60_000)}</T> : undefined}>How did you sleep?</H>
          <Row gap={6}>
            {SLEEP_RATINGS.map((r) => (
              <Pressable key={r.rating} onPress={() => actions.rateSleep(r.rating)} style={({ pressed }) => [styles.btn, pressed && { opacity: 0.7 }]}>
                <Text style={{ fontSize: 26 }}>{r.emoji}</Text>
                <Text style={styles.label}>{r.label}</Text>
              </Pressable>
            ))}
          </Row>
        </>
      ) : null}
      {today.energy == null ? (
        <>
          <H>Energy today?</H>
          <Row gap={6}>
            {ENERGY.map((e) => (
              <Pressable key={e.rating} onPress={() => actions.rateEnergy(e.rating)} style={({ pressed }) => [styles.btn, pressed && { opacity: 0.7 }]}>
                <Text style={{ fontSize: 24, opacity: e.rating === 1 || e.rating === 5 ? 1 : 0.4 + e.rating * 0.15 }}>{e.emoji}</Text>
                <Text style={styles.label}>{e.label}</Text>
              </Pressable>
            ))}
          </Row>
          <T dim small>
            1–2 turns on low-battery mode: one quest and gentler roasts.
          </T>
        </>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  btn: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 8, borderRadius: 12, backgroundColor: C.card2, borderWidth: 1, borderColor: C.border },
  label: { color: C.dim, fontSize: 10, fontWeight: '700' },
});
