import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Btn, Card, H, Icon, Row, T, useNow } from '@/components/ui';
import { C, MONO } from '@/constants/theme';
import { coopSummary } from '@/lib/coop';
import { dayKey, WEEKDAYS_LONG } from '@/lib/dates';
import { PITY_AFTER } from '@/lib/economy';
import { nemesisOf, standings, TIERS } from '@/lib/league';
import { chestShelf, GOLD_SCORE, SHELF_MAX } from '@/lib/loot';
import { eveningKey, topToday } from '@/lib/memory';
import { dayOf, lowBattery } from '@/lib/selectors';
import { useStore } from '@/lib/store';
import { gentleDay, toneOn } from '@/lib/tone';
import { ghostOf, ghostText } from '@/lib/xp-timeline';

/** "Open loot chest" + the reveal: the shelf of chests earned by finishing all daily quests, oldest first. */
export function ChestButton() {
  const { state, actions } = useStore();
  const [revealing, setRevealing] = useState<string | null>(null); // the day whose chest was just opened
  const [scale] = useState(() => new Animated.Value(0.3));
  const today = dayOf(state);
  const shown = revealing ? dayOf(state, revealing).chest : undefined;

  useEffect(() => {
    if (!revealing) return;
    scale.setValue(0.3);
    Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
  }, [revealing, scale]);

  const shelf = chestShelf(state);
  const next = shelf[0];
  if (!next && !today.chest && !shown) return null;
  const todays = next?.key === dayKey();
  const pityLeft = PITY_AFTER - (state.chestsSinceLegendary ?? 0);
  return (
    <>
      {next ? (
        <>
          <Btn
            label={`${next.gold ? '✨ Open GOLD chest' : 'Open loot chest'}${shelf.length > 1 ? ` (${shelf.length} waiting)` : ''}`}
            icon="redeem"
            kind={next.gold ? 'primary' : 'blue'}
            onPress={() => setRevealing(actions.openChest(next.key))}
          />
          <T dim small>
            {next.gold
              ? 'A great day earns a gold chest: bigger coins, a bigger bomb, better odds of a legendary.'
              : todays
                ? `No rush, it keeps: hit the boss's weakness or a day score of ${GOLD_SCORE} today and this turns into a gold chest.`
                : `From ${WEEKDAYS_LONG[new Date(`${next.key}T12:00`).getDay()]}. Chests wait for you, up to ${SHELF_MAX}; past that the oldest opens itself.`}
            {pityLeft <= 5 ? ` A legendary is guaranteed within ${Math.max(1, pityLeft + 1)} chests.` : ''}
          </T>
        </>
      ) : today.chest ? (
        <T dim small>
          Today&apos;s chest: {today.chest.text}
        </T>
      ) : null}
      <Modal visible={!!shown} transparent animationType="fade" onRequestClose={() => setRevealing(null)}>
        <Pressable style={styles.backdrop} onPress={() => setRevealing(null)}>
          <Animated.View style={[styles.reveal, { transform: [{ scale }] }]}>
            <Text style={{ fontSize: 80 }}>{shown?.kind === 'legendary' ? '🌟' : shown?.gold ? '🏆' : '🎁'}</Text>
            <Text style={styles.prize}>{shown?.text}</Text>
            <T dim small>
              Tap to close
            </T>
          </Animated.View>
        </Pressable>
      </Modal>
    </>
  );
}

/**
 * This week's nemesis next to you: who, the gap, and (unless today is a kind day) a taunt that's picked again
 * only when the lead changes hands. Null without a league.
 */
export function useNemesis() {
  const { state, quip } = useStore();
  const nem = nemesisOf(state);
  const table = standings(state);
  const me = table.find((r) => r.me);
  const row = nem ? table.find((r) => r.id === nem.id) : undefined;
  const ahead = !!row && !!me && row.xp > me.xp;
  const today = dayKey();
  const quiet = toneOn(state, today).kind || gentleDay(state, today);
  const name = nem ? `${nem.emoji} ${nem.name}` : '';
  const taunt = useMemo(() => (name && !quiet ? quip(ahead ? 'nemesisAhead' : 'nemesisBehind', { rival: name }) : null), [quip, ahead, name, quiet]);
  if (!nem || !row || !me) return null;
  return { id: nem.id, name, gap: Math.abs(row.xp - me.xp), ahead, taunt };
}

/** Compact league standing for HQ, with the week's nemesis and the ghost of last week. */
export function LeagueCard() {
  const { state } = useStore();
  const nemesis = useNemesis();
  // Ticks each minute: the rivals' XP, the ghost and the co-op week move with the clock, not only with the state.
  const now = new Date(useNow(60_000));
  if (!state.league) return null;
  const tier = TIERS[state.league.tier];
  const table = standings(state, now);
  const rank = table.findIndex((r) => r.me) + 1;
  const me = table[rank - 1];
  const above = rank > 1 ? table[rank - 2] : null;
  const ghost = ghostOf(state, now);
  const coop = coopSummary(state, now);
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
        {nemesis ? (
          <T small>
            😈 Nemesis: {nemesis.name} · {nemesis.gap === 0 ? 'level with you' : `${nemesis.gap} XP ${nemesis.ahead ? 'ahead of you' : 'behind you'}`}
            {nemesis.taunt ? <Text style={{ color: C.dim }}>{`
${nemesis.taunt}`}</Text> : null}
          </T>
        ) : null}
        {ghost ? (
          <T dim small>
            {ghostText(ghost)}
          </T>
        ) : null}
        {coop ? <T small>{coop}</T> : null}
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
  const key = eveningKey(now);
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
