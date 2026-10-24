import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Bar, Btn, Card, H, Row, SpiderSays, Stepper, T, useNow } from '@/components/ui';
import { C, MONO } from '@/constants/theme';
import { useStore } from '@/lib/store';
import { lengthOf, ROUTES, TREK_ORDER, trekStatus, trekTable } from '@/lib/trek';
import type { TrekRoute } from '@/lib/types';

const fmtKm = (km: number) => (km < 100 ? km.toFixed(1) : String(Math.round(km)));

export default function TrekScreen() {
  const { state, actions } = useStore();
  const now = new Date(useNow(60_000));
  const trek = state.trek;
  const st = trekStatus(state, now);
  const done = state.treksDone ?? [];
  const hasSteps = Object.values(state.days).some((d) => d.steps != null);

  const start = (route: TrekRoute) => {
    if (!st || st.done) return actions.startTrek(route);
    Alert.alert(`Start ${ROUTES[route].name}?`, `${st.route.name} stops at ${fmtKm(st.km)} km. What it paid stays yours.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Start', onPress: () => actions.startTrek(route) },
    ]);
  };

  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }}>
      {!hasSteps ? <SpiderSays text="The trek walks on your watch's steps (Health Connect). No steps yet, so the spider waits at the start." /> : null}

      {trek && st ? (
        <>
          <Card accent={C.green}>
            <H>
              {st.route.emoji} {st.route.name}
            </H>
            <Text style={styles.big}>
              {fmtKm(st.km)} <Text style={styles.of}>/ {Math.round(lengthOf(st.route))} km</Text>
            </Text>
            <Bar pct={st.km / lengthOf(st.route)} color={C.green} />
            <T dim small>
              {st.done ? 'Walked end to end. Pick the next route below.' : `Next: ${st.next?.name} in ${fmtKm(st.toNext)} km.`} Every step since you started counts. A day off
              just leaves the spider standing.
            </T>
            <Row style={{ justifyContent: 'space-between' }}>
              <T small>Step length</T>
              <Stepper
                value={trek.stepM}
                onChange={actions.setTrekStep}
                step={0.01}
                min={0.4}
                max={1.2}
                format={(v) => `${v.toFixed(2)} m`}
                label="step length"
                typeable
              />
            </Row>
          </Card>

          <Card>
            <H>On the trail</H>
            {trekTable(state, trek, now).map((r, i) => (
              <Row key={r.name} style={[styles.row, r.me && styles.me]}>
                <Text style={styles.rank}>{i + 1}</Text>
                <Text style={{ fontSize: 20 }}>{r.emoji}</Text>
                <T style={[{ flex: 1 }, r.me && { fontWeight: '800' }]}>{r.me ? `${r.name} (you)` : r.name}</T>
                <Text style={styles.km}>{fmtKm(r.km)} km</Text>
              </Row>
            ))}
            <T dim small>
              This week&apos;s league bots walk the same route at their own pace. Coins and the odd cosmetic at waypoints, never XP.
            </T>
          </Card>

          <Card>
            <H>Postcards</H>
            {st.route.waypoints.map((w, i) => (
              <View key={w.name} style={{ gap: 2 }}>
                <Row>
                  <Text style={styles.rank}>{i <= trek.reached ? '✓' : '·'}</Text>
                  <T style={{ flex: 1, fontWeight: i <= trek.reached ? '700' : '400' }}>{w.name}</T>
                  <T dim small mono>
                    {fmtKm(w.km)} km
                  </T>
                </Row>
                {i <= trek.reached ? (
                  <T dim small style={{ marginLeft: 32 }}>
                    {w.card}
                  </T>
                ) : null}
              </View>
            ))}
            <T dim small>
              {st.route.blurb}
            </T>
          </Card>
        </>
      ) : (
        <Card>
          <H>🥾 Virtual trek</H>
          <T>Your watch steps walk the spider along a real route, past postcards from real places.</T>
          <T dim small>
            Totals only: nothing asks for a daily amount, and a day off just leaves it standing. The league bots walk it too.
          </T>
        </Card>
      )}

      <Card>
        <H>{trek ? 'Routes' : 'Pick a route'}</H>
        {TREK_ORDER.map((id) => {
          const r = ROUTES[id];
          const current = trek?.route === id;
          return (
            <View key={id} style={{ gap: 6 }}>
              <Row>
                <Text style={{ fontSize: 22 }}>{r.emoji}</Text>
                <T style={{ flex: 1, fontWeight: '700' }}>
                  {r.name} · {Math.round(lengthOf(r))} km{done.includes(id) ? ' · ✓ walked' : ''}
                </T>
                {current && st && !st.done ? null : <Btn small kind="ghost" label={done.includes(id) ? 'Again' : 'Start'} onPress={() => start(id)} />}
              </Row>
              <T dim small>
                {r.blurb}
              </T>
            </View>
          );
        })}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  big: { color: C.text, fontSize: 32, fontWeight: '900', fontFamily: MONO },
  of: { color: C.dim, fontSize: 16, fontWeight: '700' },
  row: { paddingVertical: 6, paddingHorizontal: 8, borderRadius: 10 },
  me: { backgroundColor: C.redDim, borderWidth: 1, borderColor: C.red },
  rank: { color: C.dim, fontFamily: MONO, width: 22, fontWeight: '800' },
  km: { color: C.text, fontFamily: MONO, fontWeight: '800' },
});
