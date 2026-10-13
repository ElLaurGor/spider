import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Bar, Btn, Card, Chip, Field, H, Row, T } from '@/components/ui';
import { C } from '@/constants/theme';
import { dayKey } from '@/lib/dates';
import { activeExperiment, EXPERIMENT_DAYS, experimentDays, experimentResult, METRICS, metricInfo, PRESETS, verdictText } from '@/lib/experiments';
import { useStore } from '@/lib/store';
import type { ExperimentMetric } from '@/lib/types';

/**
 * Two-week self-experiment. On HQ (`compact`) only while one is running; on Insights it also starts new ones
 * and lists past results. Days are ticked, never counted in a row.
 */
export function ExperimentCard({ compact }: { compact?: boolean }) {
  const { state, actions } = useStore();
  const e = activeExperiment(state);
  if (!e) return compact ? null : <StartExperiment />;

  const r = experimentResult(state, e);
  const today = dayKey();
  const days = experimentDays(e);
  const doneToday = e.done.includes(today);

  return (
    <Card accent={C.cyan}>
      <H right={<T dim small mono>{r.ended ? 'done' : `day ${r.day}/${e.days}`}</T>}>
        🧪 {e.emoji} {e.title}
      </H>
      <Bar pct={r.day / e.days} color={C.cyan} height={5} />
      <View style={styles.dots}>
        {days.map((k) => {
          const future = k > today;
          const done = e.done.includes(k);
          return (
            <Pressable
              key={k}
              disabled={future}
              onPress={() => actions.toggleExperimentDay(k)}
              hitSlop={4}
              style={[styles.dot, done && styles.dotDone, k === today && styles.dotToday, future && { opacity: 0.3 }]}>
              <Text style={[styles.dotText, done && { color: C.bg }]}>{Number(k.slice(8))}</Text>
            </Pressable>
          );
        })}
      </View>
      {r.ended ? (
        <>
          <T>
            Done on {r.doneCount} of {e.days} days. {verdictText(e, r)}
          </T>
          <Btn label="Close experiment" icon="check" onPress={actions.closeExperiment} />
        </>
      ) : (
        <>
          <Btn label={doneToday ? 'Done today ✓' : 'I did it today'} icon={doneToday ? 'check_circle' : 'radio_button_unchecked'} kind={doneToday ? 'ghost' : 'blue'} onPress={() => actions.toggleExperimentDay(today)} />
          <T dim small>
            Done on {r.doneCount} day{r.doneCount === 1 ? '' : 's'} so far. Tap a day to fix it. Measuring {metricInfo(e.metric).what}, compared with the two weeks before.
          </T>
          {!compact ? <Btn label="Stop experiment" kind="ghost" small onPress={actions.closeExperiment} /> : null}
        </>
      )}
    </Card>
  );
}

function StartExperiment() {
  const { state, actions } = useStore();
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('🧪');
  const [metric, setMetric] = useState<ExperimentMetric>('sleepRating');
  const past = (state.experiments ?? []).filter((x) => x.closedAt).slice(-3).reverse();

  return (
    <Card accent={C.cyan}>
      <H>🧪 Run an experiment</H>
      <T dim small>
        Try one change for {EXPERIMENT_DAYS} days and tick the days you do it. At the end I compare those days with the two weeks before. No XP, no penalty.
      </T>
      <Row gap={6} style={{ flexWrap: 'wrap' }}>
        {PRESETS.map((p) => (
          <Chip
            key={p.title}
            label={`${p.emoji} ${p.title}`}
            active={title === p.title}
            color={C.cyan}
            onPress={() => {
              setTitle(p.title);
              setEmoji(p.emoji);
              setMetric(p.metric);
            }}
          />
        ))}
      </Row>
      <Field
        value={title}
        onChangeText={(t) => {
          setTitle(t);
          if (!PRESETS.some((p) => p.title === t)) setEmoji('🧪');
        }}
        placeholder="Or your own: e.g. Stretch before bed"
        maxLength={60}
      />
      <T dim small>
        Measure
      </T>
      <Row gap={6} style={{ flexWrap: 'wrap' }}>
        {METRICS.map((m) => (
          <Chip key={m.id} label={m.label} active={metric === m.id} color={C.cyan} onPress={() => setMetric(m.id)} />
        ))}
      </Row>
      <Btn label={`Start (${EXPERIMENT_DAYS} days)`} icon="science" onPress={() => actions.startExperiment({ title, emoji, metric })} disabled={!title.trim()} />
      {past.map((x) => {
        const r = experimentResult(state, x);
        return (
          <T key={x.id} small>
            {x.emoji} {x.title}: done on {r.doneCount} of {x.days} days. {verdictText(x, r)}
          </T>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  dot: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  dotDone: { backgroundColor: C.cyan, borderColor: C.cyan },
  dotToday: { borderWidth: 2, borderColor: C.text },
  dotText: { color: C.dim, fontSize: 11, fontWeight: '700' },
});
