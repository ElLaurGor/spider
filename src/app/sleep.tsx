import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Btn, Card, Chip, H, Icon, Row, T } from '@/components/ui';
import { C, MONO } from '@/constants/theme';
import { addDays, dayKey, fmtDuration, fmtTime, MIN, WEEKDAYS } from '@/lib/dates';
import { openHealthSettings, readSleepNight } from '@/lib/health';
import { dayOf } from '@/lib/selectors';
import { asleepMin, clockLabel, rhythmOf, stagedMin, type Night, type StageKind } from '@/lib/sleep';
import { useStore } from '@/lib/store';
import type { SleepStages } from '@/lib/types';

const LANES: { kind: StageKind; label: string; color: string }[] = [
  { kind: 'awake', label: 'Awake', color: C.yellow },
  { kind: 'rem', label: 'REM', color: C.cyan },
  { kind: 'light', label: 'Light', color: C.blue },
  { kind: 'deep', label: 'Deep', color: C.purple },
];
const LANE_H = 22;
const LABEL_W = 46;

/** The night as four lanes (awake, REM, light, deep), or one "asleep" bar when the watch only gave the session. */
function Hypnogram({ night }: { night: Night }) {
  const [width, setWidth] = useState(0);
  const span = night.wakeAt - night.bedAt;
  const detailed = night.stages != null;
  const lanes = detailed ? LANES : [{ kind: 'asleep' as const, label: 'Asleep', color: C.blue }];
  const segments = night.segments.length ? night.segments : [{ start: night.bedAt, end: night.wakeAt, stage: 'asleep' as const }];
  const x = (t: number) => ((t - night.bedAt) / span) * width;
  // Whole hours between bed and wake, for the axis.
  const hours: number[] = [];
  for (let t = Math.ceil(night.bedAt / 3_600_000) * 3_600_000; t < night.wakeAt; t += 3_600_000) hours.push(t);
  const every = hours.length > 8 ? 2 : 1;

  return (
    <View style={{ gap: 4 }}>
      {lanes.map((lane) => (
        <Row key={lane.kind} gap={0}>
          <Text style={[styles.lane, { color: lane.color }]}>{lane.label}</Text>
          <View style={[styles.track, { height: LANE_H }]} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
            {width > 0 &&
              segments
                .filter((s) => (detailed ? s.stage === lane.kind : true))
                .map((s, i) => (
                  <View
                    key={i}
                    style={{
                      position: 'absolute',
                      left: x(s.start),
                      width: Math.max(1, x(s.end) - x(s.start)),
                      top: 3,
                      bottom: 3,
                      borderRadius: 2,
                      backgroundColor: lane.color,
                    }}
                  />
                ))}
          </View>
        </Row>
      ))}
      <View style={{ height: 14, marginLeft: LABEL_W }}>
        {width > 0 &&
          hours
            .filter((_, i) => i % every === 0)
            .map((t) => (
              <Text key={t} style={[styles.hour, { left: Math.min(width - 34, Math.max(0, x(t) - 17)) }]}>
                {fmtTime(t)}
              </Text>
            ))}
      </View>
    </View>
  );
}

function Stat({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statLabel, color ? { color } : null]}>{label}</Text>
      <Text style={styles.statVal}>{value}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  );
}

/** Each of the last nights as a bar from bedtime (top) to waking (bottom), weekends in another color. */
function RhythmChart({ rhythm }: { rhythm: NonNullable<ReturnType<typeof rhythmOf>> }) {
  const [width, setWidth] = useState(0);
  const H_ = 150;
  const lo = Math.floor((Math.min(...rhythm.nights.map((n) => n.bed)) - 30) / 60) * 60;
  const hi = Math.ceil((Math.max(...rhythm.nights.map((n) => n.wake)) + 30) / 60) * 60;
  const y = (m: number) => ((m - lo) / (hi - lo)) * H_;
  const slot = width / rhythm.nights.length;
  const ticks: number[] = [];
  for (let m = lo; m <= hi; m += hi - lo > 10 * 60 ? 180 : 120) ticks.push(m);

  return (
    <Row gap={0} style={{ alignItems: 'stretch' }}>
      <View style={{ width: 40, height: H_ }}>
        {ticks.map((m) => (
          <Text key={m} style={[styles.axis, { top: Math.min(H_ - 12, Math.max(0, y(m) - 6)) }]}>
            {clockLabel(m)}
          </Text>
        ))}
      </View>
      <View style={{ flex: 1, height: H_ + 16 }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {ticks.map((m) => (
          <View key={m} style={[styles.grid, { top: y(m) }]} />
        ))}
        <View style={[styles.usual, { top: y(rhythm.bedMedian) }]} />
        {width > 0 &&
          rhythm.nights.map((n, i) => (
            <View key={n.key}>
              <View
                style={{
                  position: 'absolute',
                  left: i * slot + slot * 0.2,
                  width: slot * 0.6,
                  top: y(n.bed),
                  height: Math.max(3, y(n.wake) - y(n.bed)),
                  borderRadius: 3,
                  backgroundColor: n.weekend ? C.purple : C.blue,
                }}
              />
              <Text style={[styles.day, { left: i * slot, width: slot, top: H_ + 2 }]}>{WEEKDAYS[new Date(`${n.key}T12:00`).getDay()][0]}</Text>
            </View>
          ))}
      </View>
    </Row>
  );
}

export default function SleepScreen() {
  const { state, health } = useStore();
  const today = dayKey();
  const [day, setDay] = useState(today);
  const [result, setResult] = useState<{ key: string; night: Night | null } | null>(null);
  const connected = health.status === 'connected';
  const updatedAt = health.data?.updatedAt;

  useEffect(() => {
    if (!connected) return;
    let live = true;
    readSleepNight(day)
      .then((night) => live && setResult({ key: day, night }))
      .catch(() => live && setResult({ key: day, night: null }));
    return () => {
      live = false;
    };
  }, [day, connected, updatedAt]);

  const rhythm = rhythmOf(state);
  const typed = dayOf(state, day);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(new Date(), -i);
    return { key: dayKey(d), label: i === 0 ? 'Last night' : `→ ${WEEKDAYS[d.getDay()]}` };
  });

  if (!connected) {
    return (
      <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, gap: 14 }}>
        <Card>
          <H>Sleep</H>
          <T dim small>
            {health.status === 'unsupported'
              ? 'Sleep comes from your watch through Health Connect, which only works in the installed app.'
              : health.status === 'unavailable'
                ? 'Health Connect isn’t available on this phone. Install or update "Health Connect" from the Play Store.'
                : 'Connect Health Connect to see your nights: stages, bedtimes and how regular they are.'}
          </T>
          {health.status === 'needs-permission' ? <Btn label="Connect watch data" icon="monitor_heart" onPress={health.connect} /> : null}
        </Card>
      </ScrollView>
    );
  }

  const loading = result?.key !== day;
  const night = loading ? null : result.night;
  const inBed = night ? Math.round((night.wakeAt - night.bedAt) / MIN) : 0;
  const asleep = night ? asleepMin(night) : 0;
  const staged = night ? stagedMin(night) : 0; // the stage shares add up to 100 %, a split night's gap left out

  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }}>
      <Row gap={6} style={{ flexWrap: 'wrap' }}>
        {days.map((d) => (
          <Chip key={d.key} label={d.label} active={day === d.key} color={C.purple} onPress={() => setDay(d.key)} />
        ))}
      </Row>

      <Card accent={C.purple}>
        <H
          right={
            <Pressable onPress={health.refresh} hitSlop={8} accessibilityRole="button" accessibilityLabel="Refresh sleep">
              <Icon name="refresh" size={20} color={C.dim} />
            </Pressable>
          }>
          {day === today ? 'Last night' : `The night before ${WEEKDAYS[new Date(`${day}T12:00`).getDay()]}`}
        </H>
        {loading ? (
          <T dim small>
            Reading Health Connect…
          </T>
        ) : !night ? (
          <T dim small>
            {typed.sleepManual && typed.sleepMin != null
              ? `You typed in ${fmtDuration(typed.sleepMin * MIN)} for this night. The watch has no session for it.`
              : 'No sleep recorded for this night. If the watch was on, check that Zepp syncs Sleep to Health Connect.'}
          </T>
        ) : (
          <Hypnogram night={night} />
        )}
      </Card>

      {night ? (
        <>
          <Row gap={8}>
            <Stat label="Asleep" value={fmtDuration(asleep * MIN)} sub={`${fmtDuration(inBed * MIN)} in bed`} />
            <Stat label="Bedtime" value={fmtTime(night.bedAt)} />
            <Stat label="Woke up" value={fmtTime(night.wakeAt)} />
          </Row>
          {night.stages ? (
            <Row gap={8}>
              {LANES.map((l) => {
                const min = night.stages![l.kind as keyof SleepStages];
                return (
                  <Stat
                    key={l.kind}
                    label={l.label}
                    color={l.color}
                    value={fmtDuration(min * MIN)}
                    sub={`${Math.round((min / Math.max(1, staged)) * 100)} %`}
                  />
                );
              })}
            </Row>
          ) : (
            <T dim small>
              The watch only shared the session, not its stages.
            </T>
          )}
        </>
      ) : null}

      <Card>
        <H>Rhythm · last 14 nights</H>
        {rhythm ? (
          <>
            <RhythmChart rhythm={rhythm} />
            <T small>
              Usual bedtime {clockLabel(rhythm.bedMedian)}. A typical night lands within ±{rhythm.spread} min of it.
            </T>
            {rhythm.jetlag != null ? (
              <T dim small>
                {rhythm.jetlag >= 30
                  ? `Weekend nights sit ${fmtDuration(rhythm.jetlag * MIN)} later than weekday ones. A steadier weekend makes Mondays easier.`
                  : 'Weekends keep about the same rhythm as weekdays.'}
              </T>
            ) : null}
            <T dim small>
              <Text style={{ color: C.blue }}>■</Text> weekday <Text style={{ color: C.purple }}>■</Text> weekend · the line is your usual bedtime
            </T>
          </>
        ) : (
          <T dim small>
            Bed and wake times show up here after 5 nights with the watch.
          </T>
        )}
      </Card>

      <Pressable onPress={openHealthSettings}>
        <T dim small>
          Data comes from Zepp via Health Connect · manage access
        </T>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  lane: { width: LABEL_W, fontSize: 10, fontWeight: '700', fontFamily: MONO },
  track: { flex: 1, backgroundColor: C.card2, borderRadius: 4 },
  hour: { position: 'absolute', width: 34, textAlign: 'center', color: C.dim, fontSize: 10, fontFamily: MONO },
  axis: { position: 'absolute', left: 0, width: 36, textAlign: 'right', color: C.dim, fontSize: 10, fontFamily: MONO },
  grid: { position: 'absolute', pointerEvents: 'none', left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: C.border },
  usual: { position: 'absolute', pointerEvents: 'none', left: 0, right: 0, height: 1, backgroundColor: C.yellow, opacity: 0.7 },
  day: { position: 'absolute', textAlign: 'center', color: C.dim, fontSize: 10, fontFamily: MONO },
  stat: { flex: 1, backgroundColor: C.card2, borderRadius: 12, padding: 10, gap: 2 },
  statLabel: { color: C.dim, fontSize: 11, fontWeight: '700' },
  statVal: { color: C.text, fontSize: 18, fontWeight: '800', fontFamily: MONO },
  statSub: { color: C.dim, fontSize: 11 },
});
