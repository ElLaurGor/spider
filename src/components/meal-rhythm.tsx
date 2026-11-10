import { StyleSheet, Text, View } from 'react-native';

import { Card, H, Row, T } from '@/components/ui';
import { noonOf, useToday } from '@/components/use-today';
import { C } from '@/constants/theme';
import { addDays, WEEKDAYS } from '@/lib/dates';
import { mealRhythm } from '@/lib/gym-fuel';
import { useStore } from '@/lib/store';

/** The strip runs from 05:00 to midnight; a meal logged before 05:00 sits at its left edge. */
const FROM = 5 * 60;
const SPAN = 24 * 60 - FROM;
const TICKS = [6, 12, 18];
const left = (min: number) => `${(Math.max(0, Math.min(SPAN, min - FROM)) / SPAN) * 100}%` as const;

/**
 * step 9 care: Fuel's meal rhythm, a week's meals as dots on the time of day (gym-fuel.ts mealRhythm). When,
 * never how much: no kcal, no grading, nothing counted out loud. `back`: weeks before this one, the same week
 * the food week card above is on.
 */
export function MealRhythm({ back = 0 }: { back?: number }) {
  const { state } = useStore();
  const today = useToday();
  const days = mealRhythm(state, addDays(noonOf(today), -7 * back), today);
  if (!days.some((d) => d.meals.length)) return null;
  return (
    <Card>
      <H>Meal rhythm · {back === 0 ? 'this week' : back === 1 ? 'last week' : `${back} weeks ago`}</H>
      {days.map((d) => (
        <Row key={d.key} gap={8} style={d.future ? { opacity: 0.35 } : undefined}>
          <Text style={[styles.day, d.key === today && { color: C.text }]}>{WEEKDAYS[noonOf(d.key).getDay()]}</Text>
          <View style={styles.track}>
            {TICKS.map((h) => (
              <View key={h} style={[styles.tick, { left: left(h * 60) }]} />
            ))}
            {d.meals.map((m, i) => (
              <View key={i} style={[styles.dot, { left: left(m) }]} />
            ))}
          </View>
        </Row>
      ))}
      <Row gap={8}>
        <Text style={styles.day} />
        <View style={styles.axis}>
          {TICKS.map((h) => (
            <Text key={h} style={[styles.axisLabel, { left: left(h * 60) }]}>
              {String(h).padStart(2, '0')}
            </Text>
          ))}
        </View>
      </Row>
      <T dim small>
        When meals were logged, one dot each. Just the timing, nothing about the food.
      </T>
    </Card>
  );
}

const styles = StyleSheet.create({
  day: { width: 32, color: C.dim, fontSize: 12, fontWeight: '600' },
  track: { flex: 1, height: 14, borderRadius: 7, backgroundColor: C.card2 },
  tick: { position: 'absolute', top: 2, bottom: 2, width: 1, backgroundColor: C.border },
  dot: { position: 'absolute', top: 2, width: 10, height: 10, marginLeft: -5, borderRadius: 5, backgroundColor: C.green },
  axis: { flex: 1, height: 14 },
  axisLabel: { position: 'absolute', width: 24, marginLeft: -12, textAlign: 'center', color: C.faint, fontSize: 10 },
});
