import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, H, Row, T } from '@/components/ui';
import { useToday } from '@/components/use-today';
import { C, MONO } from '@/constants/theme';
import { weekKeyOf } from '@/lib/league';
import { MEDAL_EMOJI, medalsFor, medalTotals, openDays } from '@/lib/medals';
import { useStore } from '@/lib/store';

/** This week's medals on HQ: what each one stands at and what the next tier needs. Nothing here is ever lost. */
export function MedalsCard() {
  const { state } = useStore();
  const today = useToday();
  const week = weekKeyOf(new Date(`${today}T12:00`));
  const list = medalsFor(state, week);
  if (!list.length) return null;
  const totals = medalTotals(state);
  const open = openDays(state, week);
  return (
    <Pressable onPress={() => router.push('/records')}>
      <Card>
        <H right={<T dim small>{totals.gold + totals.silver + totals.bronze ? `${totals.gold} 🥇 ${totals.silver} 🥈 ${totals.bronze} 🥉` : 'records →'}</T>}>
          🏅 Weekly medals
        </H>
        {list.map((m) => (
          <Row key={m.def.id}>
            <Text style={styles.emoji}>{m.def.emoji}</Text>
            <View style={{ flex: 1 }}>
              <T small>{m.def.label}</T>
              <T dim small>
                {m.def.unit(m.count)} so far
                {m.next ? ` · ${MEDAL_EMOJI[m.next]} at ${m.need[m.next]}` : ' · top tier'}
              </T>
            </View>
            <Text style={styles.tier}>{m.tier ? MEDAL_EMOJI[m.tier] : '·'}</Text>
          </Row>
        ))}
        <T dim small>
          Counted on Monday for the week that ended.{open < 7 ? ` ${7 - open} rest day${7 - open === 1 ? '' : 's'} this week lower the bar.` : ''}
        </T>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  emoji: { fontSize: 18, width: 26 },
  tier: { fontSize: 20, fontFamily: MONO, color: C.dim, width: 28, textAlign: 'center' },
});
