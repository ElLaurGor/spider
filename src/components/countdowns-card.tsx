import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Btn, Card, Field, H, Icon, Row, Stepper, T } from '@/components/ui';
import { noonOf, useToday } from '@/components/use-today';
import { C, MONO } from '@/constants/theme';
import { COUNTDOWN_EMOJIS, daysInMonth, daysLabel, daysLeft, defaultDate, nextDate, toKey, upcoming } from '@/lib/countdowns';
import { pad } from '@/lib/dates';
import { useStore } from '@/lib/store';

/** Plan tab: list and add countdowns (vacations, birthdays, game releases…). */
export function CountdownsCard() {
  const { state, actions } = useStore();
  const [adding, setAdding] = useState(false);
  const start = defaultDate();
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState(COUNTDOWN_EMOJIS[0]);
  const [year, setYear] = useState(start.getFullYear());
  const [month, setMonth] = useState(start.getMonth() + 1);
  const [day, setDay] = useState(start.getDate());
  const [yearly, setYearly] = useState(false);
  const today = useToday(); // the card stays mounted on Plan for days
  const now = noonOf(today);
  const list = upcoming(state, now);
  const thisYear = Number(today.slice(0, 4));

  const add = () => {
    if (!title.trim()) return;
    actions.addCountdown({ title: title.trim(), emoji, date: toKey(year, month, Math.min(day, daysInMonth(year, month))), yearly });
    setTitle('');
    setYearly(false);
    setAdding(false);
  };

  return (
    <Card>
      <H
        right={
          <Pressable onPress={() => setAdding(!adding)} hitSlop={8}>
            <Text style={styles.link}>{adding ? 'Cancel' : '+ Add'}</Text>
          </Pressable>
        }>
        Countdowns
      </H>
      {list.length === 0 && !adding ? (
        <T dim small>
          Vacation, birthdays, game releases… add something to look forward to.
        </T>
      ) : null}
      {list.map((c) => {
        const n = daysLeft(c, now);
        return (
          <Row key={c.id}>
            <Text style={{ fontSize: 22 }}>{c.emoji}</Text>
            <View style={{ flex: 1 }}>
              <T>{c.title}</T>
              <T dim small>
                {nextDate(c, now).toLocaleDateString('sv-SE')}
                {c.yearly ? ' · every year' : ''}
              </T>
            </View>
            <Text style={[styles.days, n <= 7 && { color: C.yellow }]}>{n === 0 ? 'TODAY' : `${n}d`}</Text>
            <Pressable onPress={() => actions.deleteCountdown(c.id)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Delete ${c.title}`}>
              <Icon name="close" size={18} color={C.faint} />
            </Pressable>
          </Row>
        );
      })}

      {adding ? (
        <View style={styles.form}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {COUNTDOWN_EMOJIS.map((e) => (
              <Pressable key={e} onPress={() => setEmoji(e)} style={[styles.emoji, emoji === e && { borderColor: C.red, backgroundColor: C.redDim }]}>
                <Text style={{ fontSize: 20 }}>{e}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Field value={title} onChangeText={setTitle} placeholder="e.g. Vacation in Spain" />
          <Row style={{ justifyContent: 'space-between' }}>
            <T small>Day</T>
            <Stepper value={day} min={1} max={daysInMonth(year, month)} onChange={setDay} format={(v) => pad(v)} />
          </Row>
          <Row style={{ justifyContent: 'space-between' }}>
            <T small>Month</T>
            <Stepper value={month} min={1} max={12} onChange={setMonth} format={(v) => new Date(2000, v - 1, 1).toLocaleDateString('en-GB', { month: 'short' })} />
          </Row>
          {!yearly ? (
            <Row style={{ justifyContent: 'space-between' }}>
              <T small>Year</T>
              <Stepper value={year} min={thisYear} max={thisYear + 5} onChange={setYear} />
            </Row>
          ) : null}
          <Row style={{ justifyContent: 'space-between' }}>
            <T small>Every year (birthdays)</T>
            <Switch value={yearly} onValueChange={setYearly} trackColor={{ true: C.red }} />
          </Row>
          <T dim small>
            {title.trim() || 'It'} is {daysLabel(daysLeft({ id: '', title, emoji, date: toKey(year, month, Math.min(day, daysInMonth(year, month))), yearly, createdAt: 0 }, now))}.
          </T>
          <Btn label="Add countdown" icon="add" onPress={add} disabled={!title.trim()} />
        </View>
      ) : null}
    </Card>
  );
}

/** HQ: the next few countdowns as compact pills. */
export function CountdownRow() {
  const { state } = useStore();
  const now = noonOf(useToday()); // on HQ, which stays mounted past midnight
  const list = upcoming(state, now).slice(0, 4);
  if (list.length === 0) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {list.map((c) => {
        const n = daysLeft(c, now);
        return (
          <View key={c.id} style={[styles.pill, n <= 1 && { borderColor: C.yellow }]}>
            <Text style={{ fontSize: 16 }}>{c.emoji}</Text>
            <Text style={styles.pillText} numberOfLines={1}>
              {c.title}
            </Text>
            <Text style={[styles.pillDays, n <= 1 && { color: C.yellow }]}>{n === 0 ? 'today!' : n === 1 ? 'tomorrow' : `${n}d`}</Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  link: { color: C.red, fontWeight: '700', fontSize: 13 },
  days: { color: C.text, fontFamily: MONO, fontWeight: '800', fontSize: 15 },
  form: { gap: 10, backgroundColor: C.card2, borderRadius: 12, padding: 12 },
  emoji: { width: 40, height: 40, borderRadius: 10, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.card,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
    maxWidth: 220,
  },
  pillText: { color: C.text, fontSize: 13, fontWeight: '600', flexShrink: 1 },
  pillDays: { color: C.dim, fontFamily: MONO, fontSize: 12, fontWeight: '800' },
});
