import { Fragment, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useNemesis } from '@/components/hq-extras';
import { Card, H, Row, SpiderSays, T, useNow } from '@/components/ui';
import { C, MONO } from '@/constants/theme';
import { addDays, dayKey } from '@/lib/dates';
import { DEMOTE, NEMESIS_PRIZE, PROMOTE, standings, TIERS } from '@/lib/league';
import { useStore } from '@/lib/store';
import { gentleDay, toneOn } from '@/lib/tone';
import { ghostOf, ghostText } from '@/lib/xp-timeline';

export default function LeagueScreen() {
  const { state, quip } = useStore();
  const now = useNow(60_000);
  const nemesis = useNemesis();
  const ghost = ghostOf(state, new Date(now));
  const ghostAhead = !!ghost && ghost.now >= ghost.then;
  const today = dayKey(now);
  const quiet = toneOn(state, today).kind || gentleDay(state, today);
  const hasGhost = !!ghost;
  const ghostLine = useMemo(() => (hasGhost && !quiet ? quip(ghostAhead ? 'ghostAhead' : 'ghostBehind') : null), [quip, hasGhost, ghostAhead, quiet]);
  const league = state.league;
  if (!league) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, padding: 16 }}>
        <SpiderSays text="Your first league starts with your next action. Go log something." />
      </View>
    );
  }
  const tier = TIERS[league.tier];
  const table = standings(state, new Date(now));
  const me = table.findIndex((r) => r.me) + 1;
  const ends = addDays(new Date(`${league.week}T23:59`), 6);
  const hoursLeft = Math.max(0, Math.round((ends.getTime() - now) / 3_600_000));
  const canPromote = league.tier < TIERS.length - 1;
  const canDemote = league.tier > 0;

  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }}>
      <Card accent={C.yellow} style={{ alignItems: 'center' }}>
        <Text style={{ fontSize: 54 }}>{tier.emoji}</Text>
        <Text style={styles.tier}>{tier.name} League</Text>
        <T dim small>
          You&apos;re #{me} · ends in {hoursLeft >= 24 ? `${Math.floor(hoursLeft / 24)}d ${hoursLeft % 24}h` : `${hoursLeft}h`} · top {PROMOTE} promote
          {canDemote ? `, bottom ${DEMOTE} drop` : ''}
        </T>
      </Card>

      <Card>
        <H>Standings · XP this week</H>
        {table.map((r, i) => {
          const rank = i + 1;
          const promoteLine = canPromote && rank === PROMOTE + 1;
          const demoteLine = canDemote && rank === table.length - DEMOTE + 1;
          return (
            <Fragment key={r.id}>
              {promoteLine ? <Text style={[styles.zone, { color: C.green }]}>▲ promotion zone</Text> : null}
              {demoteLine ? <Text style={[styles.zone, { color: C.red }]}>▼ demotion zone</Text> : null}
              <Row style={[styles.row, r.me && styles.me]}>
                <Text style={styles.rank}>{rank}</Text>
                <Text style={{ fontSize: 20 }}>{r.emoji}</Text>
                <T style={[{ flex: 1 }, r.me && { fontWeight: '800' }]}>
                  {r.me ? `${r.name} (you)` : r.name}
                  {r.id === nemesis?.id ? <Text style={{ color: C.red }}> 😈 nemesis</Text> : null}
                </T>
                <Text style={styles.xp}>{r.xp}</Text>
              </Row>
            </Fragment>
          );
        })}
        <T dim small>
          Rivals earn XP through the day, like you. Prizes: #1 300 🪙, #2 200 🪙, #3 100 🪙.
        </T>
      </Card>

      {nemesis ? (
        <Card accent={C.red}>
          <H>😈 This week&apos;s nemesis</H>
          <T>
            {nemesis.name} · {nemesis.gap === 0 ? 'level with you' : `${nemesis.gap} XP ${nemesis.ahead ? 'ahead of you' : 'behind you'}`}
          </T>
          {nemesis.taunt ? (
            <T dim small>
              {nemesis.taunt}
            </T>
          ) : null}
          <T dim small>
            Picked to finish just above what you earned last week. Finish ahead of them by Sunday for +{NEMESIS_PRIZE} 🪙. Fall short and nothing happens: next week brings a new one.
          </T>
        </Card>
      ) : null}

      {ghost ? (
        <Card>
          <H>👻 Ghost of last week</H>
          <T>{ghostText(ghost)}</T>
          {ghostLine ? (
            <T dim small>
              {ghostLine}
            </T>
          ) : null}
          <T dim small>
            {ghost.exact
              ? 'You against your own XP at the same point last week. Weekly totals only.'
              : `Last ${ghost.weekday} has no hour-by-hour record yet, so its whole day stands in. From next week it's exact to the hour.`}
          </T>
        </Card>
      ) : null}

      {league.history.length > 0 ? (
        <Card>
          <H>Past weeks</H>
          {[...league.history]
            .reverse()
            .slice(0, 8)
            .map((h) => (
              <Row key={h.week}>
                <Text style={{ fontSize: 18 }}>{TIERS[h.tier].emoji}</Text>
                <T small style={{ flex: 1 }}>
                  Week of {h.week.slice(5)}
                </T>
                <T small dim mono>
                  #{h.rank} · {h.xp} XP
                </T>
              </Row>
            ))}
        </Card>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tier: { color: C.text, fontSize: 24, fontWeight: '900' },
  zone: { fontSize: 11, fontWeight: '800', letterSpacing: 1, textAlign: 'center', marginVertical: 2 },
  row: { paddingVertical: 6, paddingHorizontal: 8, borderRadius: 10 },
  me: { backgroundColor: C.redDim, borderWidth: 1, borderColor: C.red },
  rank: { color: C.dim, fontFamily: MONO, width: 22, fontWeight: '800' },
  xp: { color: C.text, fontFamily: MONO, fontWeight: '800' },
});
