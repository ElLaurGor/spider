import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Btn, Card, Chip, H, Icon, Row, T } from '@/components/ui';
import { C, MONO } from '@/constants/theme';
import { addDays, dayKey, fmtTime, pad, WEEKDAYS } from '@/lib/dates';
import { openHealthSettings, readHeartDay, type HeartSample } from '@/lib/health';
import { useStore } from '@/lib/store';

const CHART_H = 160;
const BUCKET_MIN = 10;
const BUCKETS = (24 * 60) / BUCKET_MIN;
const AXIS_W = 30;

type Bucket = { i: number; min: number; max: number; avg: number };

/** Groups a day's samples into 10-minute buckets, so a full day draws as 144 bars at most. */
function bucketsOf(samples: HeartSample[], dayStart: number): Bucket[] {
  const acc = new Map<number, { min: number; max: number; sum: number; n: number }>();
  for (const s of samples) {
    const i = Math.floor((s.at - dayStart) / (BUCKET_MIN * 60_000));
    if (i < 0 || i >= BUCKETS) continue;
    const b = acc.get(i);
    if (b) {
      b.min = Math.min(b.min, s.bpm);
      b.max = Math.max(b.max, s.bpm);
      b.sum += s.bpm;
      b.n++;
    } else acc.set(i, { min: s.bpm, max: s.bpm, sum: s.bpm, n: 1 });
  }
  return [...acc.entries()].sort((a, b) => a[0] - b[0]).map(([i, b]) => ({ i, min: b.min, max: b.max, avg: Math.round(b.sum / b.n) }));
}

const clock = (minutes: number) => `${pad(Math.floor(minutes / 60) % 24)}:${pad(minutes % 60)}`;

function Timeline({ buckets, resting }: { buckets: Bucket[]; resting: number | null }) {
  const [width, setWidth] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const lowest = Math.min(...buckets.map((b) => b.min), resting ?? Infinity);
  const highest = Math.max(...buckets.map((b) => b.max));
  const lo = Math.max(0, Math.floor((lowest - 5) / 10) * 10);
  const hi = Math.ceil((highest + 5) / 10) * 10;
  const y = (v: number) => CHART_H - ((v - lo) / (hi - lo)) * CHART_H;
  const slot = width / BUCKETS;
  const sel = picked != null ? buckets.find((b) => b.i === picked) : undefined;
  const grid = [hi, Math.round((lo + hi) / 2), lo];

  const pick = (x: number) => {
    if (!width) return;
    const i = Math.min(BUCKETS - 1, Math.max(0, Math.floor(x / slot)));
    // Snap to the nearest bucket that has data.
    const near = buckets.reduce<Bucket | null>((best, b) => (!best || Math.abs(b.i - i) < Math.abs(best.i - i) ? b : best), null);
    setPicked(near && Math.abs(near.i - i) <= 6 ? near.i : null);
  };

  return (
    <View style={{ gap: 6 }}>
      <T small mono style={{ color: sel ? C.text : C.dim }}>
        {sel
          ? `${clock(sel.i * BUCKET_MIN)}–${clock((sel.i + 1) * BUCKET_MIN)} · ${sel.min === sel.max ? sel.min : `${sel.min}–${sel.max}`} bpm · avg ${sel.avg}`
          : 'Tap the chart to see a moment.'}
      </T>
      <Row gap={0} style={{ alignItems: 'stretch' }}>
        <View style={{ width: AXIS_W, height: CHART_H }}>
          {grid.map((v) => (
            <Text key={v} style={[styles.axis, { top: y(v) - 7 }]}>
              {v}
            </Text>
          ))}
        </View>
        <Pressable
          style={{ flex: 1, height: CHART_H }}
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
          onPress={(e) => pick(e.nativeEvent.locationX)}>
          {grid.map((v) => (
            <View key={v} style={[styles.gridLine, { top: y(v) }]} />
          ))}
          {resting != null && resting > lo && resting < hi ? <View style={[styles.restLine, { top: y(resting) }]} /> : null}
          {width > 0 &&
            buckets.map((b) => {
              const top = y(b.max);
              return (
                <View
                  key={b.i}
                  style={[
                    styles.bar,
                    {
                      left: b.i * slot,
                      width: Math.max(1.5, slot - 0.8),
                      top: Math.min(top, CHART_H - 3),
                      height: Math.max(3, y(b.min) - top),
                      backgroundColor: b.i === picked ? C.text : C.red,
                    },
                  ]}
                />
              );
            })}
        </Pressable>
      </Row>
      <View style={{ height: 14, marginLeft: AXIS_W }}>
        {width > 0 &&
          [0, 6, 12, 18, 24].map((h) => (
            <Text key={h} style={[styles.hour, { left: Math.min(width - 22, Math.max(0, (h / 24) * width - 11)) }]}>
              {pad(h)}
            </Text>
          ))}
      </View>
      {resting != null ? (
        <T dim small>
          <Text style={{ color: C.cyan }}>━</Text> resting {resting} bpm
        </T>
      ) : null}
    </View>
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

export default function HeartScreen() {
  const { health } = useStore();
  const today = dayKey();
  const [day, setDay] = useState(today);
  const [result, setResult] = useState<{ key: string; samples: HeartSample[]; resting: number | null } | null>(null);
  const connected = health.status === 'connected';
  const updatedAt = health.data?.updatedAt;

  useEffect(() => {
    if (!connected) return;
    let live = true;
    readHeartDay(day)
      .then((r) => live && setResult({ key: day, ...r }))
      .catch(() => live && setResult({ key: day, samples: [], resting: null }));
    return () => {
      live = false;
    };
  }, [day, connected, updatedAt]);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(new Date(), -i);
    return { key: dayKey(d), label: i === 0 ? 'Today' : i === 1 ? 'Yesterday' : WEEKDAYS[d.getDay()] };
  });

  if (!connected) {
    return (
      <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, gap: 14 }}>
        <Card>
          <H>Heart rate</H>
          <T dim small>
            {health.status === 'unsupported'
              ? 'Heart rate comes from your watch through Health Connect, which only works in the installed app.'
              : health.status === 'unavailable'
                ? 'Health Connect isn’t available on this phone. Install or update "Health Connect" from the Play Store.'
                : 'Connect Health Connect to see your heart rate over the day.'}
          </T>
          {health.status === 'needs-permission' ? <Btn label="Connect watch data" icon="monitor_heart" onPress={health.connect} /> : null}
        </Card>
      </ScrollView>
    );
  }

  const loading = result?.key !== day;
  const samples = loading ? [] : result.samples;
  const resting = loading ? null : result.resting;
  const dayStart = new Date(`${day}T00:00`).getTime();
  const buckets = bucketsOf(samples, dayStart);
  const bpms = samples.map((s) => s.bpm);
  const avg = bpms.length ? Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length) : null;
  const latest = samples[samples.length - 1];

  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }}>
      <Row gap={6} style={{ flexWrap: 'wrap' }}>
        {days.map((d) => (
          <Chip key={d.key} label={d.label} active={day === d.key} color={C.red} onPress={() => setDay(d.key)} />
        ))}
      </Row>

      <Card accent={C.red}>
        <H
          right={
            <Pressable onPress={health.refresh} hitSlop={8}>
              <Icon name="refresh" size={20} color={C.dim} />
            </Pressable>
          }>
          Heart rate
        </H>
        {loading ? (
          <T dim small>
            Reading Health Connect…
          </T>
        ) : buckets.length === 0 ? (
          <T dim small>
            No heart rate {day === today ? 'yet today' : 'for this day'}. If the watch was on, check that Zepp syncs Heart rate to Health Connect.
          </T>
        ) : (
          <Timeline key={day} buckets={buckets} resting={resting} />
        )}
      </Card>

      {!loading && samples.length > 0 ? (
        <>
          <Row gap={8}>
            <Stat label="Lowest" value={`${Math.min(...bpms)}`} />
            <Stat label="Average" value={`${avg}`} />
            <Stat label="Highest" value={`${Math.max(...bpms)}`} />
          </Row>
          <Row gap={8}>
            <Stat label={day === today ? 'Latest' : 'Last reading'} value={`${latest.bpm}`} sub={fmtTime(latest.at)} />
            <Stat label="Resting" value={resting != null ? `${resting}` : '–'} sub={resting != null ? 'from the watch' : 'no data'} />
            <Stat label="Readings" value={`${samples.length}`} />
          </Row>
        </>
      ) : null}

      <Pressable onPress={openHealthSettings}>
        <T dim small>
          Data comes from Zepp via Health Connect · bpm · manage access
        </T>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  axis: { position: 'absolute', left: 0, width: AXIS_W - 4, textAlign: 'right', color: C.dim, fontSize: 10, fontFamily: MONO },
  hour: { position: 'absolute', width: 22, textAlign: 'center', color: C.dim, fontSize: 10, fontFamily: MONO },
  gridLine: { position: 'absolute', pointerEvents: 'none', left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: C.border },
  restLine: { position: 'absolute', pointerEvents: 'none', left: 0, right: 0, height: 1, backgroundColor: C.cyan, opacity: 0.7 },
  // Not touchable, so a tap's locationX is always relative to the chart.
  bar: { position: 'absolute', borderRadius: 1, pointerEvents: 'none' },
  stat: { flex: 1, backgroundColor: C.card2, borderRadius: 12, padding: 10, gap: 2 },
  statLabel: { color: C.dim, fontSize: 11, fontWeight: '700' },
  statVal: { color: C.text, fontSize: 20, fontWeight: '800', fontFamily: MONO },
  statSub: { color: C.dim, fontSize: 11 },
});
