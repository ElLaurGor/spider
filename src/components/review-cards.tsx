// The War room's cards (step 9 admin, lib/review.ts): HQ's Sunday prompt (closable, nothing on a skipped Sunday
// afterwards) and Plan's "big ones" picked for the week.
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { Card, H, Icon, Row, T, useNow } from '@/components/ui';
import { useToday } from '@/components/use-today';
import { C, MONO } from '@/constants/theme';
import { REVIEW_COINS, reviewPrompt, weekBigOn } from '@/lib/review';
import { useStore } from '@/lib/store';

/** HQ: on Sunday (and Monday morning), until the week is sealed or the card is closed. */
export function ReviewPrompt() {
  const { state, actions } = useStore();
  const now = useNow(60_000);
  const week = reviewPrompt(state, new Date(now));
  if (!week) return null;
  return (
    <Pressable onPress={() => router.push('/review')} accessibilityRole="button" accessibilityLabel="Open the War room">
      <Card accent={C.purple}>
        <H
          right={
            <Pressable onPress={() => actions.dismissBanner(`review:${week}`)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Not this week">
              <Icon name="close" size={18} color={C.faint} />
            </Pressable>
          }>
          🗺️ War room
        </H>
        <T dim small>
          Ten minutes: close this week, sort the stuck tasks, plan the next one. +{REVIEW_COINS} 🪙 when it&apos;s sealed.
        </T>
      </Card>
    </Pressable>
  );
}

/** Plan: the week's big ones from the War room (next week's on Sunday once picked). */
export function WeekBigCard() {
  const { state, actions } = useStore();
  const today = useToday();
  const big = weekBigOn(state, today);
  if (!big) return null;
  return (
    <Card accent={C.purple}>
      <H right={<Text style={styles.link} onPress={() => router.push('/review')}>War room →</Text>}>{big.next ? "🎯 Next week's big ones" : "🎯 This week's big ones"}</H>
      {big.tasks.map((t, i) => (
        <Pressable key={t.id} onPress={() => actions.toggleTask(t.id)} accessibilityRole="checkbox" accessibilityState={{ checked: t.done }}>
          <Row>
            <Text style={styles.num}>{i + 1}</Text>
            <Icon name={t.done ? 'check_circle' : 'radio_button_unchecked'} size={22} color={t.done ? C.green : C.dim} />
            <T dim={t.done} style={[{ flex: 1 }, t.done && { textDecorationLine: 'line-through' }]}>
              {t.title}
            </T>
          </Row>
        </Pressable>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  link: { color: C.red, fontWeight: '700', fontSize: 13 },
  num: { color: C.purple, fontWeight: '900', fontFamily: MONO, width: 16 },
});
