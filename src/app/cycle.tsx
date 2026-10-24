import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CycleNumbers } from '@/components/cycle-numbers';
import { Card, Chip, H, Row, SpiderSays, T } from '@/components/ui';
import { C, MONO } from '@/constants/theme';
import { cycleInfo, flowColor, FLOWS, isPredictedPeriod, SYMPTOMS } from '@/lib/body';
import { addDays, dayKey, WEEKDAYS } from '@/lib/dates';
import { dayOf } from '@/lib/selectors';
import { useStore } from '@/lib/store';
import type { PeriodFlow } from '@/lib/types';

const fmtDate = (d: Date) => d.toLocaleDateString('sv-SE').slice(5);

export default function CycleScreen() {
  const { state, actions, quip } = useStore();
  const [selected, setSelected] = useState(dayKey());
  const info = cycleInfo(state);
  const log = dayOf(state, selected).period ?? { flow: null, symptoms: [] };
  const isToday = selected === dayKey();
  const kind = useMemo(() => quip('periodLogged'), [quip]);

  const setFlow = (flow: PeriodFlow | null) => actions.logPeriod(selected, { ...log, flow });
  const toggleSymptom = (name: string) =>
    actions.logPeriod(selected, {
      ...log,
      symptoms: log.symptoms.includes(name) ? log.symptoms.filter((x) => x !== name) : [...log.symptoms, name],
    });

  // Five weeks back, Monday-aligned, plus the coming week for predictions.
  const today = new Date();
  const back = 28 + ((today.getDay() + 6) % 7);
  const days = Array.from({ length: back + 8 }, (_, i) => addDays(today, i - back));

  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }}>
      <Card accent="#D6335E">
        {info ? (
          <>
            <Text style={styles.big}>{info.periodDay ? `Period day ${info.periodDay}` : `Cycle day ${info.cycleDay}`}</Text>
            <T dim small>
              {info.daysUntil > 0
                ? `Next period expected around ${fmtDate(info.nextStart)} (in ${info.daysUntil} days).`
                : info.periodDay
                  ? 'Take it easy.'
                  : info.daysUntil === 0
                    ? 'Next period expected today.'
                    : `Expected ${fmtDate(info.nextStart)}, ${-info.daysUntil} days ago. Cycles vary, that's normal.`}
            </T>
            <T dim small>
              {info.cycles > 0 ? `Average cycle ${info.avgLength} days (from ${info.cycles} cycle${info.cycles === 1 ? '' : 's'}).` : 'Using a 28-day cycle until there are two periods logged.'}
            </T>
          </>
        ) : (
          <T>Log the days of your period and I&apos;ll learn your cycle and predict the next one.</T>
        )}
      </Card>

      <Card>
        <H>Calendar</H>
        <Row gap={0} style={{ justifyContent: 'space-between' }}>
          {[1, 2, 3, 4, 5, 6, 0].map((d) => (
            <Text key={d} style={styles.weekday}>
              {WEEKDAYS[d][0]}
            </Text>
          ))}
        </Row>
        <View style={styles.grid}>
          {days.map((d) => {
            const key = dayKey(d);
            const p = state.days[key]?.period;
            const future = key > dayKey();
            const predicted = future && isPredictedPeriod(info, d);
            const isSel = key === selected;
            return (
              <Pressable
                key={key}
                disabled={future}
                onPress={() => setSelected(key)}
                style={[
                  styles.cell,
                  p?.flow ? { backgroundColor: flowColor(p.flow) } : null,
                  predicted ? styles.predicted : null,
                  isSel ? styles.selected : null,
                ]}>
                <Text style={[styles.cellText, future && !predicted && { color: C.faint }]}>{d.getDate()}</Text>
                {p && !p.flow && p.symptoms.length ? <View style={styles.dot} /> : null}
              </Pressable>
            );
          })}
        </View>
        <T dim small>
          Tap a day to log or fix it. Dashed = predicted.
        </T>
      </Card>

      <Card>
        <H>{isToday ? 'Today' : selected.slice(5)}</H>
        <T dim small>
          Flow
        </T>
        <Row gap={6} style={{ flexWrap: 'wrap' }}>
          <Chip label="None" active={!log.flow} color={C.faint} onPress={() => setFlow(null)} />
          {FLOWS.map((f) => (
            <Chip key={f.flow} label={f.label} active={log.flow === f.flow} color={f.color} onPress={() => setFlow(f.flow)} />
          ))}
        </Row>
        <T dim small>
          Symptoms
        </T>
        <Row gap={6} style={{ flexWrap: 'wrap' }}>
          {SYMPTOMS.map((name) => (
            <Chip key={name} label={name} active={log.symptoms.includes(name)} color={C.purple} onPress={() => toggleSymptom(name)} />
          ))}
        </Row>
      </Card>

      <CycleNumbers state={state} />
      {info?.periodDay && state.settings.easyOnPeriod ? <SpiderSays text={kind} /> : null}
      <T dim small style={{ textAlign: 'center' }}>
        Private: this stays on your phone (and in your backups).
      </T>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  big: { color: C.text, fontSize: 26, fontWeight: '900', fontFamily: MONO },
  weekday: { color: C.dim, fontSize: 11, fontWeight: '700', width: '14.28%', textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 6 },
  cell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  cellText: { color: C.text, fontSize: 13, fontWeight: '700' },
  predicted: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#E86A8A' },
  selected: { borderWidth: 2, borderColor: C.text },
  dot: { position: 'absolute', bottom: 4, width: 4, height: 4, borderRadius: 2, backgroundColor: C.purple },
});
