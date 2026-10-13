import { StyleSheet, Text, View } from 'react-native';

import { T, useNow } from '@/components/ui';
import { C, MONO } from '@/constants/theme';
import { BED_MG, bedtimeCaffeine, bedtimeOn, caffeineCurve, caffeineLeft, cupsAround } from '@/lib/caffeine';
import { coffeeOf, dayOf } from '@/lib/selectors';
import { dayKey, fmtTime, pad } from '@/lib/dates';
import type { State } from '@/lib/types';

const H = 52;

/** Caffeine still in the body across the day, with bedtime marked. "About" numbers: half-lives vary. */
export function CaffeineCurve({ state, day }: { state: State; day: string }) {
  const isToday = day === dayKey();
  const now = useNow(60_000, isToday);
  const cups = coffeeOf(dayOf(state, day));
  if (!cups.length) return null;
  const { wakeHour, sleepHour } = state.settings;
  const bedH = sleepHour < 12 ? sleepHour + 24 : sleepHour;
  const firstH = Math.min(...cups.map((c) => new Date(c.at).getHours()));
  const from = Math.max(0, Math.min(wakeHour, firstH));
  const to = Math.min(bedH + 2, 28);
  const points = caffeineCurve(state, day, from, to);
  const top = Math.max(100, ...points.map((p) => p.mg));
  const bedAt = bedtimeOn(day, sleepHour);
  const atBed = bedtimeCaffeine(state, day);
  const nowMg = isToday && now < bedAt ? caffeineLeft(cupsAround(state, day), now) : null;
  const span = points[points.length - 1].t - points[0].t;
  const x = (t: number) => `${((t - points[0].t) / span) * 100}%` as const;
  const round5 = (mg: number) => Math.round(mg / 5) * 5;

  return (
    <View style={{ gap: 4 }}>
      <View style={styles.chart}>
        {points.map((p) => (
          <View key={p.t} style={styles.slot}>
            <View style={[styles.bar, { height: Math.max(1, (p.mg / top) * H), backgroundColor: p.t > bedAt ? C.faint : C.yellow }]} />
          </View>
        ))}
        <View style={[styles.mark, { left: x(bedAt), backgroundColor: C.purple }]} />
        {nowMg != null && now > points[0].t ? <View style={[styles.mark, { left: x(now), backgroundColor: C.text }]} /> : null}
      </View>
      <View style={styles.axis}>
        <Text style={styles.axisText}>{pad(from)}</Text>
        <Text style={styles.axisText}>{pad(to % 24)}</Text>
        <Text style={[styles.axisText, styles.bedLabel, { left: x(bedAt), color: C.purple }]}>🌙 {fmtTime(bedAt)}</Text>
      </View>
      <T dim small>
        {nowMg != null ? `Now ≈ ${round5(nowMg)} mg in you. ` : ''}≈ {round5(atBed)} mg left at bedtime{atBed >= BED_MG ? ', still buzzing when you should not be.' : '.'} Rough
        numbers: caffeine halves about every 5 hours.
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  chart: { height: H, flexDirection: 'row', alignItems: 'flex-end', gap: 1 },
  slot: { flex: 1, height: H, justifyContent: 'flex-end' },
  bar: { borderRadius: 1 },
  mark: { position: 'absolute', top: 0, bottom: 0, width: 2, pointerEvents: 'none' },
  axis: { flexDirection: 'row', justifyContent: 'space-between', height: 14 },
  axisText: { color: C.dim, fontSize: 10, fontFamily: MONO },
  bedLabel: { position: 'absolute', top: 0, width: 56, marginLeft: -28, textAlign: 'center' },
});
