import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, Chip, H, Icon, Row, T } from '@/components/ui';
import { noonOf, useToday } from '@/components/use-today';
import { C, MONO } from '@/constants/theme';
import { addDays, dayKey, isoWeek, WEEKDAYS } from '@/lib/dates';
import { foodWeek, type FoodDay } from '@/lib/food-week';
import { useStore } from '@/lib/store';

const num = (v: number) => v.toLocaleString('sv-SE');
const dayName = (key: string) => WEEKDAYS[new Date(`${key}T12:00`).getDay()];
const CHART_H = 64;

/**
 * Fuel's week of food: calories and protein per day, and what they add up to. Numbers only, never judged:
 * calorie bars have one color whatever the amount, protein bars fill in at the day's goal.
 */
export function FoodWeekCard({ onOpenDay }: { onOpenDay: (key: string) => void }) {
  const { state } = useStore();
  const s = state.settings;
  const today = useToday();
  const [back, setBack] = useState(0); // weeks before this one
  const [sel, setSel] = useState<string | null>(null);
  const at = addDays(noonOf(today), -7 * back);
  const w = foodWeek(state, at, today);
  const prev = foodWeek(state, addDays(at, -7), today);
  const first = Object.keys(state.days)
    .filter((k) => state.days[k].food.length > 0)
    .sort()[0];
  const canBack = first !== undefined && first < w.monday;
  const picked = w.days.find((d) => d.key === sel) ?? null;
  // The day picker above reaches back 6 days.
  const openable = !!picked && picked.key <= today && picked.key >= dayKey(addDays(noonOf(today), -6));
  const go = (b: number) => {
    setBack(b);
    setSel(null);
  };

  const rows: [string, string, string?][] = [];
  if (w.avgKcal != null && w.avgProtein != null) {
    const was = prev.avgKcal != null && prev.avgProtein != null ? `week before: ${num(prev.avgKcal)} kcal · ${prev.avgProtein} g` : undefined;
    rows.push([`Average a day (${w.counted} day${w.counted === 1 ? '' : 's'})`, `${num(w.avgKcal)} kcal · ${w.avgProtein} g`, was]);
  }
  if (w.goalDays > 0) rows.push(['Protein goal reached', `${w.proteinDays} of ${w.goalDays} days`]);
  if (w.proteinPct != null) rows.push(['Calories from protein', `${w.proteinPct}%`]);
  if (w.topProtein) rows.push(['Most protein', `${dayName(w.topProtein.key)} · ${w.topProtein.protein} g`]);
  if (w.totalKcal > 0 || w.totalProtein > 0) rows.push([back === 0 ? 'Week so far' : 'Week total', `${num(w.totalKcal)} kcal · ${num(w.totalProtein)} g`]);
  if (w.top.length) rows.push(['Logged most', w.top.map((f) => `${f.name} ×${f.n}`).join(' · ')]);

  return (
    <Card accent={C.green}>
      <H
        right={
          <Row gap={4}>
            <Pressable onPress={() => go(back + 1)} disabled={!canBack} hitSlop={8} style={styles.nav} accessibilityRole="button" accessibilityLabel="Previous week">
              <Icon name="chevron_left" size={20} color={canBack ? C.text : C.faint} />
            </Pressable>
            <T small dim>
              {back === 0 ? 'this week' : back === 1 ? 'last week' : `${back} weeks ago`}
            </T>
            <Pressable onPress={() => go(back - 1)} disabled={back === 0} hitSlop={8} style={styles.nav} accessibilityRole="button" accessibilityLabel="Next week">
              <Icon name="chevron_right" size={20} color={back === 0 ? C.faint : C.text} />
            </Pressable>
          </Row>
        }>
        Food · week {isoWeek(at)}
      </H>

      <ChartTitle label="Calories" note={s.kcalGoal > 0 ? `goal ${num(s.kcalGoal)} kcal` : ''} />
      <Bars days={w.days} value={(d) => d.kcal} goal={() => s.kcalGoal} fill={() => C.yellow} sel={sel} onSel={setSel} />
      <ChartTitle label="Protein" note={s.proteinGoal > 0 ? `goal ${s.proteinGoal} g` : ''} />
      <Bars
        days={w.days}
        value={(d) => d.protein}
        goal={(d) => d.proteinGoal}
        fill={(d) => (d.proteinGoal > 0 && d.protein < d.proteinGoal ? `${C.green}66` : C.green)}
        sel={sel}
        onSel={setSel}
      />
      <Row gap={2}>
        {w.days.map((d) => (
          <Text key={d.key} style={[styles.dayLabel, d.key === sel && { color: C.text }, d.key === today && { textDecorationLine: 'underline' }]}>
            {dayName(d.key)}
          </Text>
        ))}
      </Row>

      {picked ? (
        <Row style={{ justifyContent: 'space-between' }}>
          <T small style={{ flex: 1 }}>
            {picked.key === today ? 'Today so far' : `${dayName(picked.key)} ${Number(picked.key.slice(8))}/${Number(picked.key.slice(5, 7))}`}
            {' · '}
            {picked.key > today
              ? 'still ahead'
              : picked.logged
                ? `${num(picked.kcal)} kcal · ${picked.protein} g protein${picked.proteinGoal > 0 ? ` (goal ${picked.proteinGoal})` : ''}`
                : 'nothing logged'}
          </T>
          {openable ? <Chip label="Show meals" color={C.green} onPress={() => onOpenDay(picked.key)} /> : null}
        </Row>
      ) : (
        <T dim small>
          Tap a day for its numbers.
        </T>
      )}

      {rows.length ? (
        <View style={{ gap: 8 }}>
          {rows.map(([label, value, sub]) => (
            <View key={label}>
              <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <T small dim>
                  {label}
                </T>
                <T small mono style={{ flexShrink: 1, textAlign: 'right' }}>
                  {value}
                </T>
              </Row>
              {sub ? (
                <T small dim mono style={{ textAlign: 'right' }}>
                  {sub}
                </T>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
      {w.counted === 0 ? (
        <T dim small>
          {back === 0 ? 'Averages start once a day with food logged is over.' : 'Nothing logged that week.'}
        </T>
      ) : null}
    </Card>
  );
}

function ChartTitle({ label, note }: { label: string; note: string }) {
  return (
    <Row style={{ justifyContent: 'space-between', marginBottom: -4 }}>
      <T small>{label}</T>
      <T small dim mono>
        {note}
      </T>
    </Row>
  );
}

/** One bar per day on a shared baseline, a thin goal line, the tapped day's value above its bar. */
function Bars({
  days,
  value,
  goal,
  fill,
  sel,
  onSel,
}: {
  days: FoodDay[];
  value: (d: FoodDay) => number;
  goal: (d: FoodDay) => number;
  fill: (d: FoodDay) => string;
  sel: string | null;
  onSel: (key: string | null) => void;
}) {
  const top = Math.max(1, ...days.map((d) => Math.max(value(d), goal(d) * 1.15)));
  return (
    <View>
      <Row gap={2} style={{ alignItems: 'flex-end', height: CHART_H + 16 }}>
        {days.map((d) => {
          const v = value(d);
          const g = goal(d);
          return (
            <Pressable
              key={d.key}
              onPress={() => onSel(sel === d.key ? null : d.key)}
              accessibilityRole="button"
              accessibilityLabel={`${dayName(d.key)}: ${v}`}
              style={[styles.col, sel === d.key && { backgroundColor: C.card2 }]}>
              {sel === d.key && v > 0 ? <Text style={styles.val}>{num(v)}</Text> : null}
              <View style={{ width: '100%', height: CHART_H, justifyContent: 'flex-end', alignItems: 'center' }}>
                {g > 0 ? <View style={[styles.goal, { bottom: (g / top) * CHART_H }]} /> : null}
                {v > 0 ? <View style={[styles.bar, { height: Math.max(3, (v / top) * CHART_H), backgroundColor: fill(d) }]} /> : null}
              </View>
            </Pressable>
          );
        })}
      </Row>
      <View style={styles.baseline} />
    </View>
  );
}

const styles = StyleSheet.create({
  nav: { padding: 4, borderRadius: 8, backgroundColor: C.card2 },
  col: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end', borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  bar: { width: '62%', borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  goal: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: C.dim, opacity: 0.6 },
  val: { color: C.text, fontFamily: MONO, fontSize: 10, fontWeight: '700', marginBottom: 2 },
  baseline: { height: 1, backgroundColor: C.border },
  dayLabel: { flex: 1, textAlign: 'center', color: C.dim, fontSize: 11, fontWeight: '700' },
});
