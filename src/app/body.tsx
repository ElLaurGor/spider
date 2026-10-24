import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Btn, Card, Chip, H, Icon, Row, Stepper, T } from '@/components/ui';
import { C, MONO } from '@/constants/theme';
import { BODY_FIELDS, changeOver, fmtChange, latest, recentAverage, rolling, series, type BodyField } from '@/lib/body-log';
import { dayOf, onPeriod } from '@/lib/selectors';
import { useStore } from '@/lib/store';

const CHART_H = 140;

/** Dot chart of a series with its rolling average; plain views, no chart library. */
function TrendChart({ points, unit }: { points: { at: number; v: number }[]; unit: string }) {
  const [width, setWidth] = useState(0);
  if (points.length < 2) return <T dim small>Log at least twice to see a trend.</T>;
  const avg = rolling(points);
  const all = points.map((p) => p.v);
  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = max - min || 1;
  const t0 = points[0].at;
  const tSpan = points[points.length - 1].at - t0 || 1;
  const x = (at: number) => ((at - t0) / tSpan) * (width - 10);
  const y = (v: number) => CHART_H - 10 - ((v - min) / span) * (CHART_H - 20);
  return (
    <View>
      <View style={{ height: CHART_H }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 &&
          avg.map((p, i) => <View key={`a${i}`} style={[styles.avgDot, { left: x(p.at) + 2, top: y(p.v) + 2 }]} />)}
        {width > 0 && points.map((p, i) => <View key={`p${i}`} style={[styles.dot, { left: x(p.at), top: y(p.v) }]} />)}
      </View>
      <Row style={{ justifyContent: 'space-between' }}>
        <T dim small mono>
          {min.toFixed(1)}–{max.toFixed(1)} {unit}
        </T>
        <T dim small>
          ● logged · <Text style={{ color: C.cyan }}>●</Text> 7-entry average
        </T>
      </Row>
    </View>
  );
}

export default function BodyScreen() {
  const { state, actions } = useStore();
  const [chartKey, setChartKey] = useState<BodyField['key']>('weight');
  const [values, setValues] = useState<Partial<Record<BodyField['key'], number>>>(() => ({
    weight: latest(state, 'weight') ?? BODY_FIELDS[0].fallback,
  }));
  const included = BODY_FIELDS.filter((f) => values[f.key] != null);
  const notIncluded = BODY_FIELDS.filter((f) => values[f.key] == null);
  const chartField = BODY_FIELDS.find((f) => f.key === chartKey)!;
  const tracked = BODY_FIELDS.filter((f) => series(state, f.key).length > 0);
  const history = [...state.bodyLog].sort((a, b) => b.at - a.at).slice(0, 12);

  const save = () => {
    const entry = Object.fromEntries(Object.entries(values).filter(([, v]) => v != null));
    if (Object.keys(entry).length) actions.addBody(entry);
  };

  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }}>
      <Card>
        <H>Log today</H>
        {included.map((f) => (
          <Row key={f.key} style={{ justifyContent: 'space-between' }}>
            <Pressable onPress={() => f.key !== 'weight' && setValues({ ...values, [f.key]: undefined })} hitSlop={6}>
              <T>
                {f.label}
                {f.key !== 'weight' ? '  ✕' : ''}
              </T>
            </Pressable>
            <Stepper value={values[f.key] ?? f.fallback} step={f.step} min={f.min} max={f.max} onChange={(v) => setValues({ ...values, [f.key]: v })} format={(v) => `${v.toFixed(1)} ${f.unit}`} />
          </Row>
        ))}
        {notIncluded.length > 0 ? (
          <Row gap={6} style={{ flexWrap: 'wrap' }}>
            {notIncluded.map((f) => (
              <Chip key={f.key} label={`+ ${f.label}`} onPress={() => setValues({ ...values, [f.key]: latest(state, f.key) ?? f.fallback })} />
            ))}
          </Row>
        ) : null}
        <Btn label="Save" icon="check_circle" onPress={save} disabled={included.length === 0} />
      </Card>

      {tracked.length > 0 ? (
        <Card>
          <H>Trend</H>
          <Row gap={6} style={{ flexWrap: 'wrap' }}>
            {tracked.map((f) => (
              <Chip key={f.key} label={f.label} active={chartKey === f.key} color={C.blue} onPress={() => setChartKey(f.key)} />
            ))}
          </Row>
          <TrendChart points={series(state, chartKey).slice(-90)} unit={chartField.unit} />
          <Row gap={8}>
            <Stat label="Latest" value={latest(state, chartKey)?.toFixed(1) ?? '–'} unit={chartField.unit} />
            <Stat label="7-day avg" value={recentAverage(state, chartKey)?.toFixed(1) ?? '–'} unit={chartField.unit} />
          </Row>
          <T dim small mono>
            30 days {fmtChange(changeOver(state, chartKey, 30), chartField.unit)} · since start {fmtChange(changeOver(state, chartKey, null), chartField.unit)}
          </T>
        </Card>
      ) : null}

      <Card>
        <T dim small>
          Weight naturally moves 1–2 kg from day to day (water, salt, sleep, hormones), so look at the trend over weeks, not single days.
          {onPeriod(dayOf(state)) ? ' Water retention around your period is completely normal.' : ''} This stays private on your phone, and S.P.I.D.E.R. never
          comments on these numbers.
        </T>
      </Card>

      {history.length > 0 ? (
        <Card>
          <H>History</H>
          {history.map((e) => (
            <Row key={e.id} style={{ alignItems: 'flex-start' }}>
              <Text style={styles.date}>{new Date(e.at).toLocaleDateString('sv-SE').slice(5)}</Text>
              <T small style={{ flex: 1 }}>
                {BODY_FIELDS.filter((f) => e[f.key] != null)
                  .map((f) => `${f.label} ${(e[f.key] as number).toFixed(1)}${f.unit === '%' ? '%' : ` ${f.unit}`}`)
                  .join(' · ')}
              </T>
              <Pressable onPress={() => actions.deleteBody(e.id)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Delete entry">
                <Icon name="close" size={16} color={C.faint} />
              </Pressable>
            </Row>
          ))}
        </Card>
      ) : null}
    </ScrollView>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statVal}>
        {value}
        <Text style={styles.statUnit}> {unit}</Text>
      </Text>
      <T dim small>
        {label}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  dot: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: C.text },
  avgDot: { position: 'absolute', width: 4, height: 4, borderRadius: 2, backgroundColor: C.cyan },
  date: { color: C.dim, fontFamily: MONO, fontSize: 12, width: 46 },
  stat: { flex: 1, backgroundColor: C.card2, borderRadius: 12, padding: 10 },
  statVal: { color: C.text, fontSize: 20, fontWeight: '800', fontFamily: MONO },
  statUnit: { color: C.dim, fontSize: 12 },
});
