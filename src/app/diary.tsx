import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Bar, Card, H, T } from '@/components/ui';
import { C, MONO } from '@/constants/theme';
import { nextPageAt, QUESTS_PER_PAGE } from '@/lib/diary';
import { useStore } from '@/lib/store';

export default function DiaryScreen() {
  const { state } = useStore();
  const pages = [...(state.diary ?? [])].reverse();
  const next = nextPageAt(state);
  const done = state.counters.quests;
  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }}>
      <Card accent={C.purple}>
        <H right={<Text style={styles.count}>{`${done}/${next}`}</Text>}>📓 Next page</H>
        <T dim small>
          S.P.I.D.E.R. keeps a private observation log about you. Every {QUESTS_PER_PAGE} daily quests you finish unlock a page.
        </T>
        <Bar pct={(done - (next - QUESTS_PER_PAGE)) / QUESTS_PER_PAGE} color={C.purple} height={6} />
      </Card>
      {pages.length === 0 ? (
        <T dim small style={{ textAlign: 'center' }}>
          No pages yet. The diary is locked. For now.
        </T>
      ) : null}
      {pages.map((p) => (
        <View key={p.n} style={styles.page}>
          <Text style={styles.meta}>
            PAGE {p.n} · {new Date(`${p.day}T12:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
          </Text>
          <Text style={styles.text}>{p.text}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  count: { color: C.purple, fontFamily: MONO, fontSize: 13, fontWeight: '700' },
  page: { backgroundColor: C.card, borderRadius: 4, borderLeftWidth: 3, borderLeftColor: C.purple, padding: 14, gap: 8 },
  meta: { color: C.dim, fontFamily: MONO, fontSize: 11, letterSpacing: 1 },
  text: { color: C.text, fontFamily: MONO, fontSize: 14, lineHeight: 22 },
});
