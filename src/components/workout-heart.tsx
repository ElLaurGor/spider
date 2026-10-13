import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, H, Row, T } from '@/components/ui';
import { C, MONO } from '@/constants/theme';
import { dayKey, fmtTime } from '@/lib/dates';
import { readHeartDay } from '@/lib/health';
import { dayOf } from '@/lib/selectors';
import { useStore } from '@/lib/store';
import { DEFAULT_MAX_HR, heartIn, workoutWindows, ZONES, type Sample, type TrainWindow } from '@/lib/workout-heart';

const ZONE_COLORS = [C.dim, C.blue, C.green, C.yellow, C.red];

/** Average/max bpm and minutes per zone for each training window that has heart rate data. */
export function WorkoutHeart({ samples, windows }: { samples: Sample[]; windows: TrainWindow[] }) {
  const { state, actions } = useStore();
  const maxHr = state.settings.maxHr ?? DEFAULT_MAX_HR;
  const rows = windows.flatMap((w) => {
    const h = heartIn(samples, w, maxHr);
    return h ? [{ w, h }] : [];
  });
  if (!rows.length) return null;
  const setMax = (v: number) => actions.updateSettings({ maxHr: Math.max(150, Math.min(220, v)) });

  return (
    <Card accent={C.red}>
      <H
        right={
          <Row gap={8}>
            <Pressable onPress={() => setMax(maxHr - 1)} hitSlop={8}>
              <Text style={styles.step}>−</Text>
            </Pressable>
            <Text style={styles.max}>max {maxHr}</Text>
            <Pressable onPress={() => setMax(maxHr + 1)} hitSlop={8}>
              <Text style={styles.step}>+</Text>
            </Pressable>
          </Row>
        }>
        Heart in training
      </H>
      {rows.map(({ w, h }) => {
        const total = Math.max(1, h.zoneMin.reduce((a, b) => a + b, 0));
        return (
          <View key={w.start} style={{ gap: 6 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T small>
                {w.label} {fmtTime(w.start)}–{fmtTime(w.end)}
              </T>
              <T small mono>
                avg {h.avg} · max {h.max}
              </T>
            </Row>
            {ZONES.map((z, i) => (
              <Row key={z.label} gap={8}>
                <Text style={[styles.zone, { color: ZONE_COLORS[i] }]}>{z.label}</Text>
                <View style={styles.track}>
                  <View style={{ width: `${(h.zoneMin[i] / total) * 100}%`, height: '100%', borderRadius: 3, backgroundColor: ZONE_COLORS[i] }} />
                </View>
                <Text style={styles.min}>{h.zoneMin[i]} min</Text>
              </Row>
            ))}
          </View>
        );
      })}
      <T dim small>
        Zones are shares of a max heart rate of {maxHr}: Z1 easy (50 %) up to Z5 max (90 %+). Set your own max with − and +.
      </T>
    </Card>
  );
}

/** Today's training heart rate on the Gym tab, once there's a logged workout and watch data for it. */
export function WorkoutHeartCard() {
  const { state, health } = useStore();
  const key = dayKey();
  const windows = workoutWindows(dayOf(state, key));
  const [samples, setSamples] = useState<Sample[]>([]);
  const connected = health.status === 'connected';
  const updatedAt = health.data?.updatedAt;
  const count = windows.length;

  useEffect(() => {
    if (!connected || !count) return;
    let live = true;
    readHeartDay(key)
      .then((r) => live && setSamples(r.samples))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [key, connected, count, updatedAt]);

  if (!connected || !count) return null;
  return <WorkoutHeart samples={samples} windows={windows} />;
}

const styles = StyleSheet.create({
  step: { color: C.text, fontSize: 18, fontWeight: '800', paddingHorizontal: 4 },
  max: { color: C.dim, fontFamily: MONO, fontSize: 12 },
  zone: { width: 22, fontFamily: MONO, fontSize: 11, fontWeight: '700' },
  track: { flex: 1, height: 8, backgroundColor: C.card2, borderRadius: 3, overflow: 'hidden' },
  min: { width: 48, textAlign: 'right', color: C.dim, fontFamily: MONO, fontSize: 11 },
});
