import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, SpiderSays, T } from '@/components/ui';
import { C } from '@/constants/theme';
import { insights } from '@/lib/insights';
import { useStore } from '@/lib/store';

export default function InsightsScreen() {
  const { state } = useStore();
  const list = insights(state);
  const days = Object.keys(state.days).length;

  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }}>
      <SpiderSays
        text={
          list.length
            ? `I went through your last 60 days. ${list.length} pattern${list.length === 1 ? '' : 's'} stood out. Some of these are on you.`
            : `Not enough data yet (${days} day${days === 1 ? '' : 's'} logged). Keep logging water, mood, sleep and training for about a week and I'll start finding patterns.`
        }
      />
      {list.map((i) => (
        <Card key={i.id}>
          <View style={styles.row}>
            <Text style={{ fontSize: 30 }}>{i.emoji}</Text>
            <View style={{ flex: 1, gap: 4 }}>
              <T>{i.text}</T>
              <T dim small>
                {i.detail}
              </T>
            </View>
          </View>
        </Card>
      ))}
      <T dim small style={{ textAlign: 'center' }}>
        Patterns, not proof. A pattern needs at least 3 days on each side of the comparison before it shows up here.
      </T>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
});
