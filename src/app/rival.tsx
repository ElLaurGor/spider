import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, H, Row, T, useNow } from '@/components/ui';
import { C, MONO } from '@/constants/theme';
import { rivalFile } from '@/lib/rival-files';
import { useStore } from '@/lib/store';

const weekText = (week: string) => `Week of ${new Date(`${week}T12:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;

/** A league rival's file (step 8 days, rival-files.ts), opened from the league table by their roster name. */
export default function RivalScreen() {
  const { state } = useStore();
  const now = useNow(60_000);
  const { name } = useLocalSearchParams<{ name?: string }>();
  const base = typeof name === 'string' ? name : '';
  const f = rivalFile(state, base, new Date(now));
  const known = f.above + f.below;
  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }}>
      <Card accent={C.yellow} style={{ alignItems: 'center' }}>
        <Text style={{ fontSize: 54 }}>{f.emoji}</Text>
        <Text style={styles.name}>{f.name}</Text>
        {f.renamed ? (
          <T dim small>
            On the roster as {f.base}
          </T>
        ) : null}
      </Card>

      <Card>
        <H>The record</H>
        <Stat label="Weeks you finished above them" value={known ? `${f.above} of ${known}` : '–'} />
        <Stat label="Weeks they finished above you" value={known ? `${f.below} of ${known}` : '–'} />
        <Stat label="Times your nemesis" value={f.nemesis ? `${f.nemesis}${f.nemesisBeaten ? ` · beaten ${f.nemesisBeaten}` : ''}` : '0'} />
        <Stat label="Banana peels thrown at them" value={String(f.peels)} />
        <Stat label="Co-op weeks together" value={String(f.coop)} />
        <T dim small>
          Finishing orders are saved from this update on, so older weeks only show what was known (nemesis weeks).
        </T>
      </Card>

      {f.thisWeek ? (
        <Card>
          <H>This week so far</H>
          <T>
            You {f.thisWeek.mine} XP · {f.name} {f.thisWeek.theirs} XP
          </T>
          <T dim small>
            {[f.thisWeek.nemesis ? '😈 your nemesis' : null, f.thisWeek.coop ? '🤝 your co-op partner' : null, f.thisWeek.peels ? `🍌 ${f.thisWeek.peels} peel${f.thisWeek.peels === 1 ? '' : 's'}` : null]
              .filter(Boolean)
              .join(' · ') || 'Just another rival this week.'}
          </T>
        </Card>
      ) : null}

      {f.weeks.length ? (
        <Card>
          <H>Weeks together</H>
          {f.weeks.map((w) => (
            <View key={w.week} style={{ gap: 2 }}>
              <Row>
                <T small style={{ flex: 1 }}>
                  {weekText(w.week)}
                </T>
                <T small mono dim>
                  {w.above == null ? '' : w.above ? '▲ above' : '▼ below'}
                </T>
              </Row>
              <T dim small>
                {[
                  w.mine != null && w.theirs != null ? `${w.mine} vs ${w.theirs} XP` : null,
                  w.nemesis ? `😈 nemesis${w.beaten == null ? '' : w.beaten ? ', beaten' : ', not beaten'}` : null,
                  w.peels ? `🍌 ${w.peels}` : null,
                  w.coop ? '🤝 co-op' : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </T>
            </View>
          ))}
        </Card>
      ) : (
        <T dim small>
          No finished weeks with {f.name} on file yet. Check back after Sunday.
        </T>
      )}
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Row>
      <T small style={{ flex: 1 }}>
        {label}
      </T>
      <Text style={styles.value}>{value}</Text>
    </Row>
  );
}

const styles = StyleSheet.create({
  name: { color: C.text, fontSize: 22, fontWeight: '900', textAlign: 'center' },
  value: { color: C.text, fontFamily: MONO, fontWeight: '800' },
});
