import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Bar, Card, H, Icon, Row, SpiderSays, T } from '@/components/ui';
import { C, MONO } from '@/constants/theme';
import { addDays, dayKey, WEEKDAYS, WEEKDAYS_LONG } from '@/lib/dates';
import { ledgerOn } from '@/lib/ledger';
import { gradeOf, weekReport, type Grade } from '@/lib/report';
import { useStore } from '@/lib/store';

const GRADE_COLOR: Record<Grade, string> = { A: C.green, B: C.cyan, C: C.yellow, D: '#FF8A3D', F: C.red };
const GRADE_LINE = { A: 'reportGreat', B: 'reportGood', C: 'reportMid', D: 'reportBad', F: 'reportBad' } as const;

const fmtDay = (d: Date) => d.toLocaleDateString('sv-SE').slice(5);
const dayName = (key: string) => WEEKDAYS_LONG[new Date(`${key}T12:00`).getDay()];

export default function ReportScreen() {
  const { state, quip } = useStore();
  // On Mondays, open on the week that just ended.
  const [offset, setOffset] = useState(() => (new Date().getDay() === 1 ? -1 : 0));
  const r = weekReport(state, offset);
  // No grade when every day was a rest day (sick, away, a low mood, a period day) or nothing was logged.
  const verdict = useMemo(
    () => (r.grade ? quip(GRADE_LINE[r.grade]) : r.restDays ? 'Nothing to grade this week. Rest days are part of it, not a fail.' : 'Nothing logged this week yet.'),
    [quip, r.grade, r.restDays],
  );
  const color = r.grade ? GRADE_COLOR[r.grade] : C.faint;
  const restNote = r.restDays ? ` · ${r.restDays} rest day${r.restDays === 1 ? '' : 's'} left out` : '';

  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Pressable onPress={() => setOffset(offset - 1)} hitSlop={10} style={styles.nav} accessibilityRole="button" accessibilityLabel="Previous week">
          <Icon name="chevron_left" color={C.text} />
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.week}>
            {fmtDay(r.monday)} – {fmtDay(addDays(r.monday, 6))}
          </Text>
          <T dim small>
            {offset === 0 ? 'This week so far' : offset === -1 ? 'Last week' : `${-offset} weeks ago`}
          </T>
        </View>
        <Pressable
          onPress={() => setOffset(Math.min(0, offset + 1))}
          hitSlop={10}
          style={[styles.nav, offset === 0 && { opacity: 0.3 }]}
          disabled={offset === 0}
          accessibilityRole="button"
          accessibilityLabel="Next week">
          <Icon name="chevron_right" color={C.text} />
        </Pressable>
      </Row>

      <Card accent={color} style={{ alignItems: 'center', paddingVertical: 20 }}>
        <View style={[styles.gradeCircle, { borderColor: color }]}>
          <Text style={[styles.grade, { color }]}>{r.grade ?? '–'}</Text>
        </View>
        <T dim small mono>
          {r.overall != null ? `${r.overall}/100 overall · ` : ''}
          {r.days} day{r.days === 1 ? '' : 's'} counted{restNote}
        </T>
      </Card>

      <SpiderSays text={verdict} />

      <Card>
        <H>Categories</H>
        {r.categories.map((c) => {
          const g = c.score == null ? null : gradeOf(c.score);
          return (
            <View key={c.id} style={{ gap: 6 }}>
              <Row>
                <Text style={{ fontSize: 18, width: 26 }}>{c.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <T>{c.label}</T>
                  <T dim small>
                    {c.stat}
                  </T>
                </View>
                <Text style={[styles.badge, { color: g ? GRADE_COLOR[g] : C.faint }]}>{g ?? '–'}</Text>
              </Row>
              {c.score != null ? <Bar pct={c.score / 100} color={g ? GRADE_COLOR[g] : C.faint} height={5} /> : null}
            </View>
          );
        })}
      </Card>

      <XpLedger monday={r.monday} />

      {r.best ? (
        <Card>
          <H>Highlights</H>
          <T>
            🏆 Best day: {dayName(r.best.key)} ({r.best.score}/100)
          </T>
          {r.worst ? (
            <T>
              💀 Worst day: {dayName(r.worst.key)} ({r.worst.score}/100)
            </T>
          ) : null}
          <T>
            {r.boss.emoji} {r.boss.name}:{' '}
            {r.boss.defeated ? 'defeated ✓' : `${r.boss.hp}/${r.boss.maxHp} HP left${offset < 0 ? ' (escaped)' : ''}`}
          </T>
        </Card>
      ) : null}
    </ScrollView>
  );
}

/** The week's XP account, day by day: earned, lost to gaming penalties, taken back by undos. */
function XpLedger({ monday }: { monday: Date }) {
  const { state } = useStore();
  const today = dayKey();
  const rows = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
    .filter((d) => dayKey(d) <= today)
    .map((d) => ({ d, ...ledgerOn(state, dayKey(d)) }));
  if (!rows.length) return null;
  const sum = (k: 'earned' | 'lost' | 'undone') => rows.reduce((a, x) => a + x[k], 0);
  return (
    <Card>
      <H right={<T dim small mono>{`+${sum('earned')}`}</T>}>XP ledger</H>
      {rows.map((x) => (
        <Row key={dayKey(x.d)} style={{ justifyContent: 'space-between' }}>
          <T small style={{ width: 44 }}>
            {WEEKDAYS[x.d.getDay()]}
          </T>
          <T small mono style={{ flex: 1 }}>
            +{x.earned}
          </T>
          <T dim small mono>
            {x.lost ? `−${x.lost} gaming` : ''}
            {x.lost && x.undone ? ' · ' : ''}
            {x.undone ? `−${x.undone} undone` : ''}
          </T>
        </Row>
      ))}
      <T dim small>
        Earned is what hits the boss and the league. Gaming penalties come off your total only; undone is XP taken back when an entry was deleted.
      </T>
    </Card>
  );
}

const styles = StyleSheet.create({
  nav: { padding: 8, borderRadius: 10, backgroundColor: C.card2 },
  week: { color: C.text, fontSize: 18, fontWeight: '800', fontFamily: MONO },
  gradeCircle: { width: 110, height: 110, borderRadius: 55, borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
  grade: { fontSize: 64, fontWeight: '900', fontFamily: MONO },
  badge: { fontSize: 22, fontWeight: '900', fontFamily: MONO, width: 28, textAlign: 'center' },
});
