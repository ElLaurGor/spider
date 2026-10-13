import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Btn, Card, H, Icon, Row, T, useNow } from '@/components/ui';
import { C, MONO } from '@/constants/theme';
import { dayKey } from '@/lib/dates';
import { standings, TIERS } from '@/lib/league';
import { topToday } from '@/lib/memory';
import { dayOf, lowBattery } from '@/lib/selectors';
import { useStore } from '@/lib/store';

/** "Open loot chest" button + the reveal, shown once all daily quests are done. */
export function ChestButton() {
  const { state, actions } = useStore();
  const [revealing, setRevealing] = useState(false);
  const [scale] = useState(() => new Animated.Value(0.3));
  const today = dayOf(state);

  useEffect(() => {
    if (!revealing) return;
    scale.setValue(0.3);
    Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
  }, [revealing, scale]);

  if (!today.chestReady) return null;
  return (
    <>
      {!today.chest ? (
        <Btn
          label="Open loot chest"
          icon="redeem"
          kind="blue"
          onPress={() => {
            actions.openChest();
            setRevealing(true);
          }}
        />
      ) : (
        <T dim small>
          Today&apos;s chest: {today.chest.text}
        </T>
      )}
      <Modal visible={revealing && !!today.chest} transparent animationType="fade" onRequestClose={() => setRevealing(false)}>
        <Pressable style={styles.backdrop} onPress={() => setRevealing(false)}>
          <Animated.View style={[styles.reveal, { transform: [{ scale }] }]}>
            <Text style={{ fontSize: 80 }}>{today.chest?.kind === 'legendary' ? '🌟' : '🎁'}</Text>
            <Text style={styles.prize}>{today.chest?.text}</Text>
            <T dim small>
              Tap to close
            </T>
          </Animated.View>
        </Pressable>
      </Modal>
    </>
  );
}

/** Compact league standing for HQ. */
export function LeagueCard() {
  const { state } = useStore();
  if (!state.league) return null;
  const tier = TIERS[state.league.tier];
  const table = standings(state);
  const rank = table.findIndex((r) => r.me) + 1;
  const me = table[rank - 1];
  const above = rank > 1 ? table[rank - 2] : null;
  return (
    <Pressable onPress={() => router.push('/league')}>
      <Card>
        <H right={<T dim small>table →</T>}>
          {tier.emoji} {tier.name} League
        </H>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={styles.rank}>#{rank}</Text>
          <View style={{ flex: 1 }}>
            <T>
              {me?.xp ?? 0} XP this week
            </T>
            <T dim small>
              {above ? `${above.xp - (me?.xp ?? 0) + 1} XP to pass ${above.emoji} ${above.name}` : 'You lead the league. Defend it.'}
            </T>
          </View>
        </Row>
      </Card>
    </Pressable>
  );
}

/** Shown when this morning's energy check was 1–2. */
export function LowBatteryCard() {
  const { state } = useStore();
  if (!lowBattery(dayOf(state))) return null;
  // Last night's debrief picks first, else the newest open tasks.
  const picked = topToday(state).filter((t) => !t.done);
  const mustDos = picked.length ? picked : state.tasks.filter((t) => !t.done).slice(0, 3);
  return (
    <Card accent={C.yellow}>
      <H>🪫 Low-battery mode</H>
      <T dim small>
        One quest today, gentler roasts, no gym guilt-trips. Just do your top 3:
      </T>
      {mustDos.length ? (
        mustDos.map((t, i) => (
          <Row key={t.id}>
            <Text style={styles.num}>{i + 1}</Text>
            <T style={{ flex: 1 }}>{t.title}</T>
          </Row>
        ))
      ) : (
        <T small>No tasks. Then the plan is: water, food, rest. That counts.</T>
      )}
    </Card>
  );
}

/** Evening wind-down checklist on HQ (from 2 h before bedtime until 04:00). */
export function WindDownCard() {
  const { state, actions } = useStore();
  const now = useNow(60_000);
  const hour = new Date(now).getHours();
  const startHour = state.settings.sleepHour - 2;
  const evening = hour >= startHour || hour < 4;
  const key = dayKey(now - 4 * 3_600_000);
  const log = dayOf(state, key);
  if (!evening || log.windDownDone || state.windDownItems.length === 0) return null;
  const done = log.windDown ?? [];
  return (
    <Card accent={C.purple}>
      <H right={<Text style={styles.link} onPress={() => router.push('/breathe')}>breathe →</Text>}>🌙 Wind-down</H>
      {state.windDownItems.map((item) => {
        const on = done.includes(item);
        return (
          <Pressable key={item} onPress={() => actions.toggleWindDown(item)}>
            <Row>
              <Icon name={on ? 'check_circle' : 'radio_button_unchecked'} size={22} color={on ? C.green : C.dim} />
              <T style={[{ flex: 1 }, on && { color: C.dim }]}>{item}</T>
            </Row>
          </Pressable>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#000000CC', alignItems: 'center', justifyContent: 'center', padding: 24 },
  reveal: { backgroundColor: C.card, borderRadius: 24, borderWidth: 2, borderColor: C.yellow, padding: 28, alignItems: 'center', gap: 12 },
  prize: { color: C.text, fontSize: 22, fontWeight: '900', textAlign: 'center' },
  rank: { color: C.yellow, fontSize: 34, fontWeight: '900', fontFamily: MONO, width: 72 },
  num: { color: C.yellow, fontWeight: '900', fontFamily: MONO, width: 18 },
  link: { color: C.red, fontWeight: '700', fontSize: 13 },
});
