import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, H, Row, T } from '@/components/ui';
import { C, MONO } from '@/constants/theme';
import { bestiary, weeksUntil } from '@/lib/bestiary';
import { BOSSES, bossFor } from '@/lib/quests';
import { useStore } from '@/lib/store';

export default function BestiaryScreen() {
  const { state } = useStore();
  const rows = bestiary(state);
  const current = bossFor(state);
  const beaten = new Set(Object.values(state.bossesDefeated));
  const distinct = BOSSES.filter((b) => beaten.has(b.id)).length;

  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }}>
      <Card accent={C.purple}>
        <H>The Lazy Syndicate</H>
        <T dim small>
          Eight bosses take turns, one a week. Each comes back every 8 weeks, a rank stronger. Beat all eight and the Syndicate&apos;s ruler shows up
          himself.
        </T>
        <Row gap={8}>
          <View style={{ flex: 1 }}>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${(distinct / BOSSES.length) * 100}%` }]} />
            </View>
          </View>
          <Text style={styles.mono}>
            {distinct}/{BOSSES.length} beaten
          </Text>
        </Row>
        {state.syndicateBroken ? (
          <T small style={{ color: C.yellow }}>
            👑 The Couch King has fallen. The Syndicate is broken, and its theme is yours in Settings.
          </T>
        ) : null}
      </Card>

      {rows.map((r) => {
        const index = BOSSES.findIndex((b) => b.id === r.id);
        const now = current.id === r.id;
        const back = index >= 0 ? weeksUntil(index) : null;
        return (
          <Card key={r.id} accent={now ? C.red : undefined}>
            <Row>
              <Text style={{ fontSize: 30, opacity: r.wins || now ? 1 : 0.5 }}>{r.emoji}</Text>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.name}>{now ? current.name : r.name}</Text>
                <Text style={styles.mono}>
                  {now ? 'THIS WEEK' : back != null ? `back in ${back} week${back === 1 ? '' : 's'}` : 'final boss'} · weak to {r.weakness}
                </Text>
              </View>
            </Row>
            <Row gap={8}>
              <Stat label="Fights" value={String(r.fights)} />
              <Stat label="Wins" value={String(r.wins)} />
              <Stat label="Fastest" value={r.fastest ? r.fastest.day.slice(0, 3) : '–'} sub={r.fastest?.time} />
            </Row>
            {r.lore ? (
              <T small style={{ fontStyle: 'italic' }}>
                {r.lore}
              </T>
            ) : (
              <T dim small>
                🔒 Beat it once to open its Syndicate file.
              </T>
            )}
          </Card>
        );
      })}
    </ScrollView>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statVal}>{value}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  name: { color: C.text, fontWeight: '800', fontSize: 16 },
  mono: { color: C.dim, fontFamily: MONO, fontSize: 11 },
  track: { height: 8, borderRadius: 8, backgroundColor: C.card2, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 8, backgroundColor: C.purple },
  stat: { flex: 1, backgroundColor: C.card2, borderRadius: 12, padding: 10, gap: 2 },
  statLabel: { color: C.dim, fontSize: 11, fontWeight: '700' },
  statVal: { color: C.text, fontSize: 18, fontWeight: '800', fontFamily: MONO },
  statSub: { color: C.dim, fontSize: 11, fontFamily: MONO },
});
