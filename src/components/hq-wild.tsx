import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { DayWeb } from '@/components/day-web';
import { Btn, Card, H, Row, T, useNow } from '@/components/ui';
import { useToday } from '@/components/use-today';
import { C, MONO } from '@/constants/theme';
import { caughtCount, FLIES, FLY_BY_ID } from '@/lib/critters';
import { fmtClock } from '@/lib/dates';
import { nextPageAt } from '@/lib/diary';
import { useStore } from '@/lib/store';
import { webParams } from '@/lib/web-art';

/** HQ: today's web, a fly to catch (if one is buzzing) and the way into the collection and the diary. */
export function WildCard() {
  const { state, actions } = useStore();
  const pending = state.pendingFly;
  const now = useNow(1000, !!pending, pending?.until);
  const fly = pending && pending.until > now ? FLY_BY_ID[pending.id] : null;
  const key = useToday(); // `now` only ticks while a fly is buzzing
  const p = webParams(state, key);
  const pages = state.diary?.length ?? 0;
  const legend = [
    `${p.threads} threads (water)`,
    `${p.rings} ring${p.rings === 1 ? '' : 's'} (habits + quests)`,
    p.dew ? `${p.dew} dew (sleep)` : null,
    p.catches ? `${p.catches} caught (tasks)` : null,
    p.frays ? `${p.frays} frayed (gaming)` : null,
  ].filter(Boolean);

  return (
    <Card>
      <H
        right={
          <Text style={styles.link} onPress={() => router.push('/webs')}>
            Gallery →
          </Text>
        }>
        Today&apos;s web
      </H>
      {fly && pending ? (
        <View style={styles.fly}>
          <Text style={{ fontSize: 28 }}>{fly.emoji}</Text>
          <View style={{ flex: 1 }}>
            <T small>A {fly.name} is buzzing around!</T>
            <Text style={styles.timer}>{fmtClock(pending.until - now)} left</Text>
          </View>
          <Btn label="Catch it!" small onPress={actions.catchFly} />
        </View>
      ) : null}
      <Row style={{ alignItems: 'center' }}>
        <DayWeb params={p} size={124} seed={key} />
        <T dim small style={{ flex: 1 }}>
          {p.empty ? 'Nothing spun yet. Log something and watch the web grow.' : `Spun from today: ${legend.join(', ')}.`}
        </T>
      </Row>
      <Row gap={8}>
        <Btn label={`Flies ${caughtCount(state)}/${FLIES.length}`} kind="ghost" small onPress={() => router.push('/flies')} style={{ flex: 1 }} />
        <Btn
          label={pages ? `Diary · ${pages}` : `Diary at ${nextPageAt(state)} quests`}
          kind="ghost"
          small
          onPress={() => router.push('/diary')}
          style={{ flex: 1 }}
        />
      </Row>
    </Card>
  );
}

const styles = StyleSheet.create({
  link: { color: C.red, fontWeight: '700', fontSize: 13 },
  fly: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card2, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: C.yellow },
  timer: { color: C.yellow, fontFamily: MONO, fontSize: 12 },
});
