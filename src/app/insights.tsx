import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ExperimentCard } from '@/components/experiment-card';
import { SymptomDetective } from '@/components/symptom-detective';
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
            : days < 16
              ? `Not enough data yet (${days} day${days === 1 ? '' : 's'} logged). A pattern needs 8+ days on each side, so keep logging water, mood, sleep and training for two or three weeks.`
              : `I went through your last 60 days. Nothing stands out clearly yet. That's a finding too: no habit here is quietly wrecking another.`
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
      <SymptomDetective state={state} />
      <ExperimentCard />
      <T dim small style={{ textAlign: 'center' }}>
        Patterns, not proof. A pattern shows up here only with 8+ days on each side and a difference chance alone rarely gives.
      </T>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
});
