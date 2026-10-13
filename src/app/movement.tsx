import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Btn, Card, H, Row, T } from '@/components/ui';
import { C, MONO } from '@/constants/theme';
import { pad, WEEK_ORDER, WEEKDAYS } from '@/lib/dates';
import { readStepsByHour } from '@/lib/health';
import { movementMap, stillestHour, type HourSteps } from '@/lib/movement';
import { useStore } from '@/lib/store';

const LABEL_W = 34;
const CELL_H = 22;

export default function MovementScreen() {
  const { state, health, actions } = useStore();
  const st = state.settings;
  const [slots, setSlots] = useState<HourSteps[] | null>(null);
  const [width, setWidth] = useState(0);
  const connected = health.status === 'connected';

  useEffect(() => {
    if (!connected) return;
    let live = true;
    readStepsByHour(14)
      .then((r) => live && setSlots(r))
      .catch(() => live && setSlots([]));
    return () => {
      live = false;
    };
  }, [connected]);

  const map = slots ? movementMap(slots) : null;
  const still = map ? stillestHour(map, st.wakeHour, st.sleepHour) : null;
  const nudgeOn = st.moveNudgeHour != null;
  const stillHour = still?.hour;

  // A nudge that's on follows the stillest hour as the map changes.
  useEffect(() => {
    if (st.moveNudgeHour != null && stillHour != null && stillHour !== st.moveNudgeHour) actions.updateSettings({ moveNudgeHour: stillHour });
  }, [st.moveNudgeHour, stillHour, actions]);

  if (!connected) {
    return (
      <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, gap: 14 }}>
        <Card>
          <H>Movement</H>
          <T dim small>
            {health.status === 'unsupported'
              ? 'Steps come from your watch through Health Connect, which only works in the installed app.'
              : 'Connect Health Connect to see when during the day you move.'}
          </T>
          {health.status === 'needs-permission' ? <Btn label="Connect watch data" icon="monitor_heart" onPress={health.connect} /> : null}
        </Card>
      </ScrollView>
    );
  }

  const hours = Array.from({ length: Math.max(1, st.sleepHour - st.wakeHour + 1) }, (_, i) => st.wakeHour + i).filter((h) => h < 24);
  const top = map ? Math.max(1, ...WEEK_ORDER.flatMap((wd) => hours.map((h) => map.grid[wd][h]))) : 1;
  const cell = hours.length ? (width - LABEL_W) / hours.length : 0;
  const counted = map ? map.days.reduce((a, b) => a + b, 0) : 0;

  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }}>
      <Card accent={C.green}>
        <H>Steps by hour · last 14 days</H>
        {!map ? (
          <T dim small>
            Reading Health Connect…
          </T>
        ) : counted === 0 ? (
          <T dim small>
            No steps from the watch in the last two weeks.
          </T>
        ) : (
          <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ gap: 3 }}>
            {width > 0 &&
              WEEK_ORDER.map((wd) => (
                <Row key={wd} gap={0}>
                  <Text style={styles.day}>{WEEKDAYS[wd]}</Text>
                  {hours.map((h) => {
                    const v = map.grid[wd][h];
                    return (
                      <View key={h} style={{ width: cell, height: CELL_H, padding: 1 }}>
                        <View
                          style={{
                            flex: 1,
                            borderRadius: 3,
                            backgroundColor: map.days[wd] ? C.green : C.card2,
                            opacity: map.days[wd] ? Math.max(0.07, v / top) : 1,
                            borderWidth: still && h === still.hour && wd >= 1 && wd <= 5 ? 1 : 0,
                            borderColor: C.yellow,
                          }}
                        />
                      </View>
                    );
                  })}
                </Row>
              ))}
            {width > 0 ? (
              <View style={{ height: 14 }}>
                {hours
                  .filter((h) => h % 3 === 0)
                  .map((h) => (
                    <Text key={h} style={[styles.hour, { left: LABEL_W + (h - hours[0]) * cell + cell / 2 - 12 }]}>
                      {pad(h)}
                    </Text>
                  ))}
              </View>
            ) : null}
            <T dim small>
              {`Stronger green = more steps that hour on an average day · ${counted} days with the watch on${still ? ' · yellow = your stillest workday hour' : ''}.`}
            </T>
          </View>
        )}
      </Card>

      {map && counted > 0 ? (
        <Card>
          <H>Stillest workday hour</H>
          {still ? (
            <>
              <T small>
                On workdays you move least around {pad(still.hour)}:00, about {still.steps.toLocaleString('sv-SE')} steps in that hour. A
                five-minute walk there does more than one at an hour you already move.
              </T>
              <Row style={{ justifyContent: 'space-between' }}>
                <T small>Nudge me then on workdays</T>
                <Switch
                  value={nudgeOn}
                  onValueChange={(v) => actions.updateSettings({ moveNudgeHour: v ? still.hour : null })}
                  trackColor={{ true: C.green, false: C.border }}
                  thumbColor={C.text}
                />
              </Row>
              {nudgeOn ? (
                <T dim small>
                  Skipped in meetings (if you set that) and on low-battery days.
                </T>
              ) : null}
            </>
          ) : (
            <T dim small>
              Needs at least three workdays with the watch on.
            </T>
          )}
        </Card>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  day: { width: LABEL_W, color: C.dim, fontFamily: MONO, fontSize: 11 },
  hour: { position: 'absolute', width: 24, textAlign: 'center', color: C.dim, fontFamily: MONO, fontSize: 10 },
});
