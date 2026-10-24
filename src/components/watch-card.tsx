import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EntryEditor } from '@/components/entry-editor';
import { Bar, Big, Btn, Card, H, Icon, Row, SpiderSays, T, useNow } from '@/components/ui';
import { useToday } from '@/components/use-today';
import { C, MONO } from '@/constants/theme';
import { fmtDuration, fmtTime, WEEKDAYS, WEEKDAYS_LONG } from '@/lib/dates';
import { openHealthSettings } from '@/lib/health';
import { stepsLineKey } from '@/lib/line-context';
import { dayOf, shownSteps } from '@/lib/selectors';
import { useStore } from '@/lib/store';

const fmtSteps = (n: number) => n.toLocaleString('sv-SE');

/** Steps, heart rate and sleep from the Amazfit watch (Zepp → Health Connect). */
export function WatchCard() {
  const { state, health, quip } = useStore();
  const goal = state.settings.stepGoal;
  const d = health.data;
  const todayKey = useToday();
  const [editing, setEditing] = useState<string | null>(null); // the day whose steps are being typed in

  const typed = dayOf(state, todayKey).stepsManual;
  // Right after midnight the last read can still be yesterday's: its count isn't today's.
  const steps = shownSteps(dayOf(state, todayKey), d?.key === todayKey ? d.steps : undefined) ?? 0;
  const now = useNow(60_000);
  // Paced by the time of day: 3 000 steps at 10:00 is on pace, at 21:00 it isn't.
  const stepKey = stepsLineKey(steps, goal, new Date(now), state.settings.wakeHour, state.settings.sleepHour);
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
        <Btn label={typed ? `Steps today: ${fmtSteps(steps)} · edit` : "Type in today's steps"} icon="directions_walk" kind="ghost" small onPress={() => setEditing(todayKey)} />
        {editing ? <StepsEditor day={editing} onClose={() => setEditing(null)} /> : null}
      </Card>
    );
  }

  // Today's bar is the number above (read every minute); a past day's typed-in steps replace the watch's.
  const week = (d?.stepsWeek ?? []).map((x) => {
    const log = dayOf(state, x.key);
    return { key: x.key, steps: x.key === todayKey ? steps : log.stepsManual ? (log.steps ?? x.steps) : x.steps, typed: !!log.stepsManual };
  });
  const max = Math.max(goal, ...week.map((x) => x.steps ?? 0), 1);

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
        <Pressable
          onPress={() => setEditing(todayKey)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`${fmtSteps(steps)} steps today. Type in your steps`}>
          <Big color={C.green}>{fmtSteps(steps)}</Big>
          <T dim small mono>
            / {fmtSteps(goal)} steps · {typed ? '✎ typed' : '✎'}
          </T>
        </Pressable>
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
        {week.map((x) => (
          <Pressable
            key={x.key}
            onPress={() => setEditing(x.key)}
            style={{ flex: 1, alignItems: 'center', gap: 4 }}
            accessibilityRole="button"
            accessibilityLabel={`${WEEKDAYS_LONG[new Date(`${x.key}T12:00`).getDay()]}: ${x.steps == null ? 'no reading' : `${fmtSteps(x.steps)} steps`}. Type in steps`}>
            <View
              style={{
                width: '70%',
                height: Math.max(3, ((x.steps ?? 0) / max) * 50),
                borderRadius: 4,
                backgroundColor: x.steps != null && x.steps >= goal ? C.green : '#1C4A33',
                opacity: x.steps == null ? 0.4 : 1, // that day's read failed
              }}
            />
            <Text style={styles.day}>
              {WEEKDAYS[new Date(`${x.key}T12:00`).getDay()][0]}
              {x.typed ? '✎' : ''}
            </Text>
          </Pressable>
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
      {editing ? <StepsEditor day={editing} onClose={() => setEditing(null)} /> : null}
    </Card>
  );
}

/** Sheet for typing in a day's steps when the watch is behind or counted too much (syncedSteps). */
export function StepsEditor({ day, onClose }: { day: string; onClose: () => void }) {
  const { state, actions, health } = useStore();
  const today = useToday();
  const log = dayOf(state, day);
  const watch = day === today ? (health.data?.stepsKnown ? health.data.steps : null) : (health.data?.stepsWeek.find((x) => x.key === day)?.steps ?? null);
  const connected = health.status === 'connected';
  const note = [
    watch != null ? `The watch says ${fmtSteps(watch)}.` : null,
    log.stepsManual
      ? connected
        ? 'Delete hands the day back to the watch.'
        : null
      : connected
        ? 'Higher than the watch: it takes over again once it counts more. Lower: your number stays all day.'
        : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <EntryEditor
      title={`Steps · ${day === today ? 'Today' : WEEKDAYS_LONG[new Date(`${day}T12:00`).getDay()]}`}
      numbers={[{ key: 'steps', label: 'Steps', value: shownSteps(log, watch) ?? 0, step: 100, min: 0, max: 100000, suffix: 'steps' }]}
      note={note || undefined}
      onSave={(_, v) => actions.logSteps(day, v.numbers.steps)}
      onDelete={log.stepsManual ? () => actions.logSteps(day, null) : undefined}
      onClose={onClose}
    />
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
