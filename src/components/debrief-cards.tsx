import { Pressable, StyleSheet, Text } from 'react-native';

import { Card, H, Icon, Row, T, useNow } from '@/components/ui';
import { C, MONO } from '@/constants/theme';
import { topToday } from '@/lib/memory';
import { whenLabel, whenNow } from '@/lib/plan-slots';
import { dayOf, lowBattery } from '@/lib/selectors';
import { useStore } from '@/lib/store';

/** The three tasks picked in last night's debrief. Low-battery mode shows them in its own card instead. */
export function TopThreeCard() {
  const { state, actions } = useStore();
  const now = useNow(60_000); // a booked slot's "now" moves with the clock
  const top = topToday(state);
  if (top.length === 0 || lowBattery(dayOf(state))) return null;
  const booked = state.topTomorrow?.when ?? {}; // step 8 days: when each one was booked for (plan-slots.ts)
  const day = state.topTomorrow?.day ?? '';
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
            {booked[t.id] && !t.done ? (
              <T small mono style={{ color: whenNow(state, booked[t.id], day, now) ? C.yellow : C.dim }}>
                {whenNow(state, booked[t.id], day, now) ? 'now · ' : ''}
                {whenLabel(booked[t.id])}
              </T>
            ) : null}
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

const styles = StyleSheet.create({
  num: { color: C.cyan, fontWeight: '900', fontFamily: MONO, width: 16 },
});
