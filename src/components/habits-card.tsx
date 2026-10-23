import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { IfThenEditor } from '@/components/if-then-editor';
import { Btn, Card, Chip, Field, H, Icon, Row, Stepper, T } from '@/components/ui';
import { C } from '@/constants/theme';
import { pad, WEEK_ORDER, WEEKDAYS } from '@/lib/dates';
import { HABIT_EMOJIS, HABIT_IDEAS, habitsDone, habitsFor, habitsShownOn, rangeNeededOn, rangeText, rangeWeek } from '@/lib/habits';
import { planText, reminderRetired } from '@/lib/if-then';
import { useStore } from '@/lib/store';
import type { Habit, IfThen, Weekday } from '@/lib/types';

const daysText = (h: Habit) =>
  h.perWeek
    ? `${h.perWeek.min === h.perWeek.max ? h.perWeek.min : `${h.perWeek.min}–${h.perWeek.max}`}× a week`
    : h.days.length === 0
      ? 'every day'
      : WEEK_ORDER.filter((d) => h.days.includes(d)).map((d) => WEEKDAYS[d]).join(' ');

type Draft = { name: string; emoji: string; days: Weekday[]; remind: number; range: { min: number; max: number } | null; plan: IfThen | null };
const blank = (): Draft => ({ name: '', emoji: HABIT_EMOJIS[0], days: [], remind: -1, range: null, plan: null });
const draftOf = (h: Habit): Draft => ({ name: h.name, emoji: h.emoji, days: h.days, remind: h.remindHour ?? -1, range: h.perWeek ?? null, plan: h.plan ?? null });

export function HabitsCard() {
  const { state, actions } = useStore();
  const [managing, setManaging] = useState(false);
  const [editing, setEditing] = useState<string | null>(null); // habit id, or null for a new one
  const [draft, setDraft] = useState<Draft>(blank);

  const due = habitsFor(state);
  const shown = habitsShownOn(state);
  const done = habitsDone(state);
  const elsewhere = state.habits.length - shown.length;
  const patch = (p: Partial<Draft>) => setDraft({ ...draft, ...p });

  const save = () => {
    if (!draft.name.trim()) return;
    // An if-then plan needs both halves: without the "I will" it's no plan.
    const plan = draft.plan && draft.plan.then.trim() ? draft.plan : null;
    const h = { name: draft.name.trim(), emoji: draft.emoji, days: draft.range ? [] : draft.days, remindHour: draft.remind < 0 ? null : draft.remind, perWeek: draft.range, plan };
    if (editing) actions.updateHabit(editing, h);
    else actions.addHabit(h);
    setEditing(null);
    setDraft(blank());
  };
  const edit = (h: Habit) => {
    setEditing(h.id);
    setDraft(draftOf(h));
  };
  const cancel = () => {
    setEditing(null);
    setDraft(blank());
  };

  const toggleDay = (d: Weekday) => patch({ days: draft.days.includes(d) ? draft.days.filter((x) => x !== d) : [...draft.days, d] });
  // A range habit reminds only when it's needed, so it gets an evening time to start from.
  const setRange = (on: boolean) => patch({ range: on ? (draft.range ?? { min: 2, max: 4 }) : null, remind: on && draft.remind < 0 ? 19 : draft.remind });

  return (
    <Card>
      <H
        right={
          <Pressable onPress={() => setManaging(!managing)} hitSlop={8}>
            <Text style={styles.link}>{managing ? 'Done' : 'Manage'}</Text>
          </Pressable>
        }>
        Habits{due.length ? ` · ${due.filter((h) => done.includes(h.id)).length}/${due.length}` : ''}
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
        shown.map((h) => {
          const isDone = done.includes(h.id);
          const w = rangeWeek(state, h);
          // A range habit: its week so far, and whether today is a day it's needed (no slack left).
          const note = w ? `${rangeText(w)}${!isDone && rangeNeededOn(state, h) ? ' · needed today' : w.target > 0 && w.done >= w.target ? ' · ✓ week' : ''}` : null;
          const sub = [note, h.plan ? `🔗 ${planText(h.plan)}` : null].filter(Boolean).join(' · ');
          return (
            <Pressable key={h.id} onPress={() => actions.toggleHabit(h.id)} style={({ pressed }) => pressed && { opacity: 0.7 }}>
              <Row>
                <Icon name={isDone ? 'check_circle' : 'radio_button_unchecked'} size={24} color={isDone ? C.green : C.dim} />
                <View style={{ flex: 1 }}>
                  <T style={isDone && { color: C.dim }}>
                    {h.emoji} {h.name}
                  </T>
                  {sub ? (
                    <T dim small>
                      {sub}
                    </T>
                  ) : null}
                </View>
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
          <T dim small>
            Tap a habit to edit it.
          </T>
          {state.habits.map((h) => (
            <Pressable key={h.id} onPress={() => edit(h)} style={({ pressed }) => pressed && { opacity: 0.7 }}>
              <Row>
                <T style={[{ flex: 1 }, editing === h.id && { color: C.green }]}>
                  {h.emoji} {h.name}
                </T>
                <T dim small>
                  {daysText(h)}
                  {h.remindHour != null && !reminderRetired(h) ? ` · ⏰ ${pad(h.remindHour)}:00` : ''}
                  {h.plan ? ' · 🔗' : ''}
                </T>
                <Pressable onPress={() => actions.deleteHabit(h.id)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Delete ${h.name}`}>
                  <Icon name="close" size={18} color={C.faint} />
                </Pressable>
              </Row>
            </Pressable>
          ))}

          <View style={styles.form}>
            <T small>{editing ? 'Edit habit' : 'New habit'}</T>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {HABIT_EMOJIS.map((e) => (
                <Pressable key={e} onPress={() => patch({ emoji: e })} style={[styles.emoji, draft.emoji === e && { borderColor: C.green, backgroundColor: '#163322' }]}>
                  <Text style={{ fontSize: 20 }}>{e}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Field value={draft.name} onChangeText={(name) => patch({ name })} placeholder="e.g. Drink a protein shake" />
            <Row gap={6}>
              <Chip label="On set days" active={!draft.range} color={C.green} onPress={() => setRange(false)} />
              <Chip label="Times a week" active={!!draft.range} color={C.green} onPress={() => setRange(true)} />
            </Row>
            {draft.range ? (
              <>
                <Row style={{ justifyContent: 'space-between' }}>
                  <T small>At least</T>
                  <Stepper value={draft.range.min} min={1} max={7} onChange={(min) => patch({ range: { min, max: Math.max(min, draft.range?.max ?? min) } })} format={(v) => `${v}×`} />
                </Row>
                <Row style={{ justifyContent: 'space-between' }}>
                  <T small>At most</T>
                  <Stepper value={draft.range.max} min={draft.range.min} max={7} onChange={(max) => patch({ range: { min: draft.range?.min ?? 1, max } })} format={(v) => `${v}×`} />
                </Row>
                <T dim small>
                  Any days. The low end is the week&apos;s goal, the top end pays a small bonus, and a reminder only comes when the days left barely cover the low end.
                </T>
              </>
            ) : (
              <>
                <T dim small>
                  Days (none selected = every day)
                </T>
                <Row gap={4} style={{ flexWrap: 'wrap' }}>
                  {WEEK_ORDER.map((d) => (
                    <Chip key={d} label={WEEKDAYS[d]} active={draft.days.includes(d)} color={C.green} onPress={() => toggleDay(d)} />
                  ))}
                </Row>
              </>
            )}
            <Row style={{ justifyContent: 'space-between' }}>
              <T small>Reminder</T>
              <Stepper value={draft.remind} min={-1} max={23} onChange={(remind) => patch({ remind })} format={(v) => (v < 0 ? 'off' : `${pad(v)}:00`)} />
            </Row>
            <IfThenEditor value={draft.plan} onChange={(plan) => patch({ plan })} placeholder={`I will… (e.g. ${draft.name.trim() || 'take the vitamins'})`} />
            <Row>
              <Btn label={editing ? 'Save' : 'Add habit'} icon={editing ? 'check' : 'add'} onPress={save} disabled={!draft.name.trim()} style={{ flex: 1 }} />
              {editing ? <Btn label="Cancel" kind="ghost" onPress={cancel} style={{ flex: 1 }} /> : null}
            </Row>
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
