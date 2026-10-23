import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, H, Row, T } from '@/components/ui';
import { C, MONO } from '@/constants/theme';
import { fillLine, GOLDEN, GOLDEN_CHANCE } from '@/lib/lines';
import { hallOfFame, type Rec } from '@/lib/records';
import { useStore } from '@/lib/store';
import { BADGE_NOTE, SECRET_ACHIEVEMENTS, SECRET_COINS, XP } from '@/lib/xp';

export default function RecordsScreen() {
  const { state } = useStore();
  const { fame, shame } = hallOfFame(state);
  const found = state.goldenFound ?? {};
  const golden = GOLDEN.filter((g) => found[g.id]).sort((a, b) => found[b.id] - found[a.id]);
  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }}>
      <Card accent={C.yellow}>
        <H
          right={
            <Text style={{ color: C.red, fontWeight: '700', fontSize: 13 }} onPress={() => router.push('/bestiary')}>
              Bestiary →
            </Text>
          }>
          🏆 Hall of Fame
        </H>
        {fame.map((r) => (
          <RecordRow key={r.label} r={r} />
        ))}
      </Card>
      <Card accent={C.purple}>
        <H right={<T dim small>{`${Object.keys(state.secrets).length}/${SECRET_ACHIEVEMENTS.length}`}</T>}>🔓 Secret achievements</H>
        <T dim small>
          Hidden until you stumble into them. Each one: +{XP.secret} XP and {SECRET_COINS} 🪙, except the 🏷️ badges of shame, which pay nothing.
        </T>
        {SECRET_ACHIEVEMENTS.map((a) => {
          const got = !!state.secrets[a.id];
          return (
            <Row key={a.id} style={{ alignItems: 'flex-start' }}>
              <Text style={{ fontSize: 20, width: 30 }}>{got ? (a.badge ? '🏷️' : '🔓') : '❓'}</Text>
              <View style={{ flex: 1 }}>
                <T style={!got && { color: C.dim }}>{got ? a.title : '???'}</T>
                <T dim small>
                  {got ? (a.badge ? `${a.desc}. ${BADGE_NOTE}` : a.desc) : `Hint: ${a.hint}`}
                </T>
              </View>
            </Row>
          );
        })}
      </Card>

      <Card accent={C.yellow}>
        <H right={<T dim small>{`${golden.length}/${GOLDEN.length}`}</T>}>✨ Roast Book</H>
        <T dim small>
          Golden lines. Anything you log has a {Math.round(GOLDEN_CHANCE * 100)}% chance to turn one up. Not while I&apos;m going easy on you.
        </T>
        {golden.map((g) => (
          <Row key={g.id} style={{ alignItems: 'flex-start' }}>
            <Text style={{ fontSize: 16, width: 24 }}>✨</Text>
            <View style={{ flex: 1 }}>
              <T>{fillLine(g.text, { name: state.settings.userName || 'boss' })}</T>
              <T dim small>
                found {new Date(found[g.id]).toLocaleDateString('sv-SE')}
              </T>
            </View>
          </Row>
        ))}
        {golden.length < GOLDEN.length ? (
          <T dim small>
            {GOLDEN.length - golden.length} still hiding.
          </T>
        ) : null}
      </Card>

      {shame.length > 0 ? (
        <Card accent={C.red}>
          <H>💀 Hall of Shame</H>
          {shame.map((r) => (
            <RecordRow key={r.label} r={r} />
          ))}
          <T dim small>
            Kept for science. And for roasting.
          </T>
        </Card>
      ) : null}
    </ScrollView>
  );
}

function RecordRow({ r }: { r: Rec }) {
  return (
    <Row>
      <Text style={{ fontSize: 22, width: 30 }}>{r.emoji}</Text>
      <View style={{ flex: 1 }}>
        <T>{r.label}</T>
        {r.detail ? (
          <T dim small>
            {r.detail}
          </T>
        ) : null}
      </View>
      <Text style={styles.value}>{r.value}</Text>
    </Row>
  );
}

const styles = StyleSheet.create({
  value: { color: C.text, fontFamily: MONO, fontWeight: '800', fontSize: 15 },
});
