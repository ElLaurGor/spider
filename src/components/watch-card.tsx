import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Bar, Big, Btn, Card, H, Icon, Row, SpiderSays, T } from '@/components/ui';
import { C, MONO } from '@/constants/theme';
import { fmtDuration, fmtTime, WEEKDAYS } from '@/lib/dates';
import { openHealthSettings } from '@/lib/health';
import { dayOf } from '@/lib/selectors';
import { useStore } from '@/lib/store';

const fmtSteps = (n: number) => n.toLocaleString('sv-SE');

/** Steps, heart rate and sleep from the Amazfit watch (Zepp → Health Connect). */
export function WatchCard() {
  const { state, health, quip } = useStore();
  const goal = state.settings.stepGoal;
  const d = health.data;

  const steps = d?.steps ?? 0;
  const stepKey = steps >= goal ? 'stepsHigh' : steps >= goal / 2 ? 'stepsMid' : 'stepsLow';
  const slept = dayOf(state).sleepMin; // the watch's number, unless typed in by hand
  const sleepKey = slept != null ? (slept < 6 * 60 ? 'sleepShort' : 'sleepGood') : null;
  const sleepText = slept != null ? fmtDuration(slept * 60_000) : '';
  const stepLine = useMemo(() => quip(stepKey, { steps: fmtSteps(steps) }), [quip, stepKey, steps]);
  const sleepLine = useMemo(() => (sleepKey ? quip(sleepKey, { sleep: sleepText }) : ''), [quip, sleepKey, sleepText]);

  if (health.status === 'unsupported') return null;

  if (health.status !== 'connected') {
    return (
      <Card accent={C.green}>
        <H>Watch · steps, heart, sleep</H>
        {health.status === 'unavailable' ? (
          <T dim small>
            Health Connect isn&apos;t available on this phone. Install or update &quot;Health Connect&quot; from the Play Store, then come
            back.
          </T>
        ) : (
          <View style={{ gap: 6 }}>
            <T small>1. In the Zepp app: Profile → Add accounts (3rd-party) → Health Connect → turn on Steps, Heart rate and Sleep.</T>
            <T small>2. Then connect S.P.I.D.E.R. below and allow the same.</T>
          </View>
        )}
        <Btn label="Connect watch data" icon="monitor_heart" onPress={health.connect} />
      </Card>
    );
  }

  const max = Math.max(goal, ...(d?.stepsWeek.map((x) => x.steps ?? 0) ?? [0]), 1);

  return (
    <Card accent={C.green}>
      <H
        right={
          <Pressable onPress={health.refresh} hitSlop={8} accessibilityRole="button" accessibilityLabel="Refresh watch data">
            <Icon name="refresh" size={20} color={C.dim} />
          </Pressable>
        }>
        Watch
      </H>

      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <View>
          <Big color={C.green}>{fmtSteps(steps)}</Big>
          <T dim small mono>
            / {fmtSteps(goal)} steps
          </T>
        </View>
        <Pressable onPress={() => router.push('/movement')} hitSlop={8} style={{ alignItems: 'center' }}>
          <Icon name="directions_walk" size={40} color={steps >= goal ? C.green : C.faint} />
          <Text style={styles.byHour}>by hour →</Text>
        </Pressable>
      </Row>
      <Bar pct={steps / goal} color={C.green} height={10} />

      <Row gap={10}>
        <Metric
          icon="favorite"
          color={C.red}
          label="Heart now"
          value={d?.heartLatest ? `${d.heartLatest.bpm}` : '–'}
          sub={d?.heartLatest ? fmtTime(d.heartLatest.at) : 'no data'}
          onPress={openHeart}
        />
        <Metric
          icon="monitor_heart"
          color={C.red}
          label="Today"
          value={d?.heartAvg ? `${d.heartAvg}` : '–'}
          sub={d?.heartMin ? `${d.heartMin}–${d.heartMax} bpm` : d?.restingHr ? `rest ${d.restingHr}` : 'avg bpm'}
          onPress={openHeart}
        />
        <Metric icon="bedtime" color={C.purple} label="Sleep" value={sleepText || '–'} sub="last night" onPress={() => router.push('/sleep')} />
      </Row>

      <Row gap={6} style={{ alignItems: 'flex-end', height: 70 }}>
        {(d?.stepsWeek ?? []).map((x) => (
          <View key={x.key} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
            <View
              style={{
                width: '70%',
                height: Math.max(3, ((x.steps ?? 0) / max) * 50),
                borderRadius: 4,
                backgroundColor: x.steps != null && x.steps >= goal ? C.green : '#1C4A33',
                opacity: x.steps == null ? 0.4 : 1, // that day's read failed
              }}
            />
            <Text style={styles.day}>{WEEKDAYS[new Date(`${x.key}T12:00`).getDay()][0]}</Text>
          </View>
        ))}
      </Row>

      <SpiderSays text={sleepLine ? `${stepLine} ${sleepLine}` : stepLine} />
      {health.missing.length ? (
        <View style={{ gap: 6 }}>
          <T dim small>
            No access to {health.missing.join(' and ')} yet, so {health.missing.length === 1 ? 'that stays' : 'those stay'} empty here.
          </T>
          <Btn label="Grant missing access" icon="monitor_heart" kind="ghost" small onPress={health.connect} />
        </View>
      ) : null}
      <Pressable onPress={openHealthSettings} accessibilityRole="button" accessibilityLabel="Manage Health Connect access">
        <T dim small>
          Data comes from Zepp via Health Connect · updated {d ? fmtTime(d.updatedAt) : '–'} · manage access
        </T>
      </Pressable>
    </Card>
  );
}

const openHeart = () => router.push('/heart');

function Metric({
  icon,
  color,
  label,
  value,
  sub,
  onPress,
}: {
  icon: 'favorite' | 'monitor_heart' | 'bedtime';
  color: string;
  label: string;
  value: string;
  sub: string;
  onPress?: () => void;
}) {
  return (
    <Pressable style={styles.metric} onPress={onPress} disabled={!onPress}>
      <Row gap={4}>
        <Icon name={icon} size={14} color={color} />
        <Text style={styles.metricLabel}>{label}</Text>
      </Row>
      <Text style={styles.metricVal}>{value}</Text>
      <Text style={styles.metricSub}>{sub}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  byHour: { color: C.green, fontSize: 11, fontWeight: '700' },
  metric: { flex: 1, backgroundColor: C.card2, borderRadius: 12, padding: 10, gap: 2 },
  metricLabel: { color: C.dim, fontSize: 11, fontWeight: '700' },
  metricVal: { color: C.text, fontSize: 20, fontWeight: '800', fontFamily: MONO },
  metricSub: { color: C.dim, fontSize: 11 },
  day: { color: C.dim, fontSize: 11, fontWeight: '700' },
});
