import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, H, Row, T } from '@/components/ui';
import { C, MONO } from '@/constants/theme';
import { hallOfFame, type Rec } from '@/lib/records';
import { useStore } from '@/lib/store';
import { SECRET_ACHIEVEMENTS, SECRET_COINS, XP } from '@/lib/xp';

export default function RecordsScreen() {
  const { state } = useStore();
  const { fame, shame } = hallOfFame(state);
  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }}>
      <Card accent={C.yellow}>
        <H>🏆 Hall of Fame</H>
        {fame.map((r) => (
          <RecordRow key={r.label} r={r} />
        ))}
      </Card>
      <Card accent={C.purple}>
        <H right={<T dim small>{`${Object.keys(state.secrets).length}/${SECRET_ACHIEVEMENTS.length}`}</T>}>🔓 Secret achievements</H>
        <T dim small>
          Hidden until you stumble into them. Each one: +{XP.secret} XP and {SECRET_COINS} 🪙.
        </T>
        {SECRET_ACHIEVEMENTS.map((a) => {
          const got = !!state.secrets[a.id];
          return (
            <Row key={a.id} style={{ alignItems: 'flex-start' }}>
              <Text style={{ fontSize: 20, width: 30 }}>{got ? '🔓' : '❓'}</Text>
              <View style={{ flex: 1 }}>
                <T style={!got && { color: C.dim }}>{got ? a.title : '???'}</T>
                <T dim small>
                  {got ? a.desc : `Hint: ${a.hint}`}
                </T>
              </View>
            </Row>
          );
        })}
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
