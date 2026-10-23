import { StyleSheet, Text, View } from 'react-native';

import { Bar, Btn, Row, T } from '@/components/ui';
import { C, MONO } from '@/constants/theme';
import { pendingRecap, type BossRecap } from '@/lib/boss-recap';
import { useStore } from '@/lib/store';

const num = (n: number) => (n >= 1000 ? n.toLocaleString('sv-SE') : String(n));

/** How a week's boss fight went: the outcome, the damage by source and the two days that hurt it most. */
export function RecapBody({ r }: { r: BossRecap }) {
  const parts = [
    r.sources.quests ? `🗡️ quests ${num(r.sources.quests)}` : null,
    r.sources.xp ? `⭐ logging ${num(r.sources.xp)}` : null,
    r.sources.weakness ? `🎯 weakness +${num(r.sources.weakness)} (${r.weakDays} day${r.weakDays === 1 ? '' : 's'})` : null,
    r.sources.crits ? `💥 crits ${num(r.sources.crits)}` : null,
    r.sources.bombs ? `💣 bombs ${num(r.sources.bombs)}` : null,
  ].filter(Boolean);
  const outcome = r.beaten
    ? r.late
      ? 'BEATEN after its week, by late numbers'
      : `BEATEN${r.fellOn ? ` on ${r.fellOn}` : ''}`
    : `ESCAPED with ${num(r.hp)} HP`;
  return (
    <View style={{ gap: 6 }}>
      <Row>
        <Text style={{ fontSize: 26 }}>{r.emoji}</Text>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.name}>{r.boss}</Text>
          <Text style={[styles.mono, { color: r.beaten ? C.green : C.yellow }]}>{outcome}</Text>
        </View>
        <Text style={styles.mono}>
          {num(Math.min(r.damage, r.maxHp))}/{num(r.maxHp)}
        </Text>
      </Row>
      <Bar pct={Math.min(1, r.damage / r.maxHp)} color={r.beaten ? C.green : C.red} height={6} />
      {parts.length ? (
        <T dim small>
          {parts.join(' · ')}
        </T>
      ) : null}
      {r.healed > 0 ? (
        <T dim small>
          💀 Doomscrolling healed it +{num(r.healed)} HP.
        </T>
      ) : null}
      {r.top.length ? (
        <T dim small>
          Hardest hits: {r.top.map((t) => `${t.day} ${num(t.damage)}`).join(', ')}.
        </T>
      ) : null}
    </View>
  );
}

/** Last week's boss recap at the top of HQ's quests card, until it's dismissed (it stays in the Bestiary). */
export function BossRecapPanel() {
  const { state, actions } = useStore();
  const r = pendingRecap(state);
  if (!r) return null;
  return (
    <View style={styles.panel}>
      <Text style={styles.head}>📜 LAST WEEK&apos;S FIGHT</Text>
      <RecapBody r={r} />
      <Btn label="Got it" kind="ghost" small onPress={() => actions.seenBossRecap(r.week)} />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: C.card2, borderRadius: 12, padding: 12, gap: 8 },
  head: { color: C.purple, fontFamily: MONO, fontSize: 11, fontWeight: '800' },
  name: { color: C.text, fontWeight: '800', fontSize: 15 },
  mono: { color: C.dim, fontFamily: MONO, fontSize: 11 },
});
