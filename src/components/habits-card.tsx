import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Btn, Card, Chip, Field, H, Icon, Row, Stepper, T } from '@/components/ui';
import { C } from '@/constants/theme';
import { pad, WEEK_ORDER, WEEKDAYS } from '@/lib/dates';
import { HABIT_EMOJIS, HABIT_IDEAS, habitsDone, habitsFor } from '@/lib/habits';
import { useStore } from '@/lib/store';
import type { Habit, Weekday } from '@/lib/types';

const daysText = (h: Habit) => (h.days.length === 0 ? 'every day' : WEEK_ORDER.filter((d) => h.days.includes(d)).map((d) => WEEKDAYS[d]).join(' '));

export function HabitsCard() {
  const { state, actions } = useStore();
  const [managing, setManaging] = useState(false);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(HABIT_EMOJIS[0]);
  const [days, setDays] = useState<Weekday[]>([]);
  const [remind, setRemind] = useState(-1);

  const today = habitsFor(state);
  const done = habitsDone(state);
  const elsewhere = state.habits.length - today.length;

  const add = () => {
    if (!name.trim()) return;
    actions.addHabit({ name: name.trim(), emoji, days, remindHour: remind < 0 ? null : remind });
    setName('');
    setDays([]);
    setRemind(-1);
  };

  const toggleDay = (d: Weekday) => setDays(days.includes(d) ? days.filter((x) => x !== d) : [...days, d]);

  return (
    <Card>
      <H
        right={
          <Pressable onPress={() => setManaging(!managing)} hitSlop={8}>
            <Text style={styles.link}>{managing ? 'Done' : 'Manage'}</Text>
          </Pressable>
        }>
        Habits{today.length ? ` · ${today.filter((h) => done.includes(h.id)).length}/${today.length}` : ''}
      </H>

      {state.habits.length === 0 && !managing ? (
        <View style={{ gap: 8 }}>
          <T dim small>
            No habits yet. Tap one to start, or Manage to make your own:
          </T>
          <Row gap={6} style={{ flexWrap: 'wrap' }}>
            {HABIT_IDEAS.map((h) => (
              <Chip key={h.name} label={`${h.emoji} ${h.name}`} onPress={() => actions.addHabit({ ...h, days: [], remindHour: null })} />
            ))}
          </Row>
        </View>
      ) : null}

      {!managing &&
        today.map((h) => {
          const isDone = done.includes(h.id);
          return (
            <Pressable key={h.id} onPress={() => actions.toggleHabit(h.id)} style={({ pressed }) => pressed && { opacity: 0.7 }}>
              <Row>
                <Icon name={isDone ? 'check_circle' : 'radio_button_unchecked'} size={24} color={isDone ? C.green : C.dim} />
                <T style={[{ flex: 1 }, isDone && { color: C.dim }]}>
                  {h.emoji} {h.name}
                </T>
              </Row>
            </Pressable>
          );
        })}
      {!managing && elsewhere > 0 ? (
        <T dim small>
          +{elsewhere} habit{elsewhere === 1 ? '' : 's'} on other days
        </T>
      ) : null}

      {managing ? (
        <View style={{ gap: 10 }}>
          {state.habits.map((h) => (
            <Row key={h.id}>
              <T style={{ flex: 1 }}>
                {h.emoji} {h.name}
              </T>
              <T dim small>
                {daysText(h)}
                {h.remindHour != null ? ` · ⏰ ${pad(h.remindHour)}:00` : ''}
              </T>
              <Pressable onPress={() => actions.deleteHabit(h.id)} hitSlop={8}>
                <Icon name="close" size={18} color={C.faint} />
              </Pressable>
            </Row>
          ))}

          <View style={styles.form}>
            <T small>New habit</T>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {HABIT_EMOJIS.map((e) => (
                <Pressable key={e} onPress={() => setEmoji(e)} style={[styles.emoji, emoji === e && { borderColor: C.green, backgroundColor: '#163322' }]}>
                  <Text style={{ fontSize: 20 }}>{e}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Field value={name} onChangeText={setName} placeholder="e.g. Drink a protein shake" />
            <T dim small>
              Days (none selected = every day)
            </T>
            <Row gap={4} style={{ flexWrap: 'wrap' }}>
              {WEEK_ORDER.map((d) => (
                <Chip key={d} label={WEEKDAYS[d]} active={days.includes(d)} color={C.green} onPress={() => toggleDay(d)} />
              ))}
            </Row>
            <Row style={{ justifyContent: 'space-between' }}>
              <T small>Reminder</T>
              <Stepper value={remind} min={-1} max={23} onChange={setRemind} format={(v) => (v < 0 ? 'off' : `${pad(v)}:00`)} />
            </Row>
            <Btn label="Add habit" icon="add" onPress={add} disabled={!name.trim()} />
          </View>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  link: { color: C.red, fontWeight: '700', fontSize: 13 },
  form: { gap: 10, backgroundColor: C.card2, borderRadius: 12, padding: 12 },
  emoji: { width: 40, height: 40, borderRadius: 10, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
});
