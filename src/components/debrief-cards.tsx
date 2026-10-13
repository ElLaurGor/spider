import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { Card, H, Icon, Row, T, useNow } from '@/components/ui';
import { C, MONO } from '@/constants/theme';
import { tomorrowKey, topToday } from '@/lib/memory';
import { dayOf, lowBattery } from '@/lib/selectors';
import { useStore } from '@/lib/store';

/** The three tasks picked in last night's debrief. Low-battery mode shows them in its own card instead. */
export function TopThreeCard() {
  const { state, actions } = useStore();
  const top = topToday(state);
  if (top.length === 0 || lowBattery(dayOf(state))) return null;
  return (
    <Card accent={C.cyan}>
      <H>🎯 Today&apos;s top 3</H>
      {top.map((t, i) => (
        <Pressable key={t.id} onPress={() => actions.toggleTask(t.id)}>
          <Row>
            <Text style={styles.num}>{i + 1}</Text>
            <Icon name={t.done ? 'check_circle' : 'radio_button_unchecked'} size={22} color={t.done ? C.green : C.dim} />
            <T dim={t.done} style={[{ flex: 1 }, t.done && { textDecorationLine: 'line-through' }]}>
              {t.title}
            </T>
          </Row>
        </Pressable>
      ))}
      {top.every((t) => t.done) ? (
        <T small style={{ color: C.green }}>
          All three done. Planned last night, finished today.
        </T>
      ) : (
        <T dim small>
          Picked in last night&apos;s debrief.
        </T>
      )}
    </Card>
  );
}

/** Evenings (from 3 h before bedtime until 04:00), until tomorrow's top 3 is picked. */
export function DebriefCard() {
  const { state } = useStore();
  const now = useNow(60_000);
  const hour = new Date(now).getHours();
  const evening = hour >= state.settings.sleepHour - 3 || hour < 4;
  if (!evening || state.topTomorrow?.day === tomorrowKey(now)) return null;
  return (
    <Pressable onPress={() => router.push('/debrief')}>
      <Card accent={C.purple}>
        <H right={<T dim small>open →</T>}>🌙 Evening debrief</H>
        <T dim small>
          30 seconds: your mood, loose ends, tomorrow&apos;s top 3 and the verdict on today.
        </T>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  num: { color: C.cyan, fontWeight: '900', fontFamily: MONO, width: 16 },
});
