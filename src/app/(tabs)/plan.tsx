import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { CountdownsCard } from '@/components/countdowns-card';
import { EntryEditor } from '@/components/entry-editor';
import { HabitsCard } from '@/components/habits-card';
import { Btn, Card, Chip, Field, H, Icon, Row, Screen, SpiderSays, T } from '@/components/ui';
import { C } from '@/constants/theme';
import { addDays, fmtTime, WEEKDAYS } from '@/lib/dates';
import { eventsOn, freeSlots, workoutFor } from '@/lib/selectors';
import { useStore } from '@/lib/store';
import type { Task } from '@/lib/types';
import { BONUS_MIN, XP } from '@/lib/xp';

export default function Plan() {
  const { state, actions, quip, cal } = useStore();
  const [offset, setOffset] = useState(0);
  const [draft, setDraft] = useState('');
  const [showDone, setShowDone] = useState(false);
  const [renaming, setRenaming] = useState<Task | null>(null);

  const date = addDays(new Date(), offset);
  const dayEvents = eventsOn(cal.events, date);
  const slots = freeSlots(cal.events, date, state.settings.wakeHour + 1, state.settings.sleepHour - 1);
  const plan = workoutFor(state, date);
  const timed = dayEvents.filter((e) => !e.allDay).length;
  const calKey = timed > 0 ? 'calBusy' : 'calFree';
  const calLine = useMemo(() => quip(calKey, { count: timed }), [quip, calKey, timed]);
  const emptyLine = useMemo(() => quip('tasksEmpty'), [quip]);

  const open = state.tasks.filter((t) => !t.done);
  const done = state.tasks.filter((t) => t.done);

  const add = () => {
    actions.addTask(draft);
    setDraft('');
  };

  return (
    <Screen title="PLAN" subtitle="Calendar · habits · tasks">
      <Card>
        <H right={cal.status === 'granted' ? <Pressable onPress={cal.refresh} hitSlop={8}><Icon name="refresh" size={20} color={C.dim} /></Pressable> : undefined}>
          Calendar
        </H>

        {cal.status === 'unsupported' ? (
          <View style={{ gap: 6 }}>
            <T>📅 Calendar sync needs the installed S.P.I.D.E.R. app.</T>
            <T dim small>
              You&apos;re running inside Expo Go, which isn&apos;t allowed to read your calendar. Install the APK (see the README) and
              I&apos;ll read Google + Outlook straight from your phone. No logins.
            </T>
          </View>
        ) : cal.status !== 'granted' ? (
          <View style={{ gap: 10 }}>
            <T dim small>
              Let me read your phone&apos;s calendars. Google shows up automatically. For Outlook: open the Outlook app → Settings → your
              account → turn on &quot;Sync calendars&quot;.
            </T>
            {cal.status === 'denied' ? (
              <T small style={{ color: C.red }}>
                Permission was denied. Enable it in Android Settings → Apps → S.P.I.D.E.R. → Permissions → Calendar.
              </T>
            ) : (
              <Btn label="Connect calendars" icon="calendar_month" onPress={cal.connect} />
            )}
          </View>
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {Array.from({ length: 7 }, (_, i) => {
                const d = addDays(new Date(), i);
                return (
                  <Chip
                    key={i}
                    label={i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : `${WEEKDAYS[d.getDay()]} ${d.getDate()}`}
                    active={offset === i}
                    onPress={() => setOffset(i)}
                  />
                );
              })}
            </ScrollView>

            {offset === 0 ? <SpiderSays text={calLine} /> : null}

            {dayEvents.length === 0 ? <T dim>Nothing scheduled.</T> : null}
            {dayEvents.map((e) => (
              <Row key={e.key} style={styles.event}>
                <View style={[styles.bar, { backgroundColor: e.color ?? C.blue }]} />
                <View style={{ flex: 1, gap: 2 }}>
                  <T>{e.title}</T>
                  <T dim small mono>
                    {e.allDay ? 'All day' : `${fmtTime(e.start)}–${fmtTime(e.end)}`}
                    {e.location ? `  ·  ${e.location}` : ''}
                  </T>
                </View>
              </Row>
            ))}

            {slots.length > 0 ? (
              <View style={{ gap: 6 }}>
                <T dim small>
                  Free time {plan ? `— perfect for ${plan.name} day 💪` : '— no excuses'}
                </T>
                <Row gap={6} style={{ flexWrap: 'wrap' }}>
                  {slots.map((sl) => (
                    <Chip key={sl.start} label={`${fmtTime(sl.start)}–${fmtTime(sl.end)}`} />
                  ))}
                </Row>
              </View>
            ) : null}
          </>
        )}
      </Card>

      <HabitsCard />

      <CountdownsCard />

      <Card>
        <H right={<T dim small>{open.length} open</T>}>Tasks</H>
        <Row>
          <Field
            value={draft}
            onChangeText={setDraft}
            placeholder="Add a task…"
            onSubmitEditing={add}
            returnKeyType="done"
            style={{ flex: 1 }}
          />
          <Btn icon="add" onPress={add} disabled={!draft.trim()} />
        </Row>
        {open.length === 0 ? <T dim small>{emptyLine}</T> : null}
        {open.map((t) => (
          <TaskRow
            key={t.id}
            title={t.title}
            done={false}
            onToggle={() => actions.toggleTask(t.id)}
            onEdit={() => setRenaming(t)}
            onDelete={() => actions.deleteTask(t.id)}
          />
        ))}
        {done.length > 0 ? (
          <Row style={{ justifyContent: 'space-between' }}>
            <Pressable onPress={() => setShowDone(!showDone)}>
              <T dim small>
                {showDone ? '▾' : '▸'} {done.length} completed
              </T>
            </Pressable>
            <Pressable onPress={actions.clearDoneTasks}>
              <T small style={{ color: C.red }}>
                Clear
              </T>
            </Pressable>
          </Row>
        ) : null}
        {showDone &&
          done.map((t) => (
            <TaskRow
              key={t.id}
              title={t.title}
              done
              onToggle={() => actions.toggleTask(t.id)}
              onEdit={() => setRenaming(t)}
              onDelete={() => actions.deleteTask(t.id)}
            />
          ))}
        <T dim small>
          Each finished task: +{XP.task} XP and +{BONUS_MIN.task} min gaming time. Long-press one to rename it.
        </T>
        {renaming ? (
          <EntryEditor
            title="Rename task"
            name={renaming.title}
            onSave={(_at, v) => v.name && actions.renameTask(renaming.id, v.name)}
            onDelete={() => actions.deleteTask(renaming.id)}
            onClose={() => setRenaming(null)}
          />
        ) : null}
      </Card>
    </Screen>
  );
}

function TaskRow({
  title,
  done,
  onToggle,
  onEdit,
  onDelete,
}: {
  title: string;
  done: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Row>
      <Pressable onPress={onToggle} onLongPress={onEdit} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
        <Icon name={done ? 'check_circle' : 'radio_button_unchecked'} size={22} color={done ? C.green : C.dim} />
        <T dim={done} style={[{ flex: 1 }, done && { textDecorationLine: 'line-through' }]}>
          {title}
        </T>
      </Pressable>
      <Pressable onPress={onDelete} hitSlop={8}>
        <Icon name="close" size={18} color={C.faint} />
      </Pressable>
    </Row>
  );
}

const styles = StyleSheet.create({
  event: { backgroundColor: C.card2, borderRadius: 12, padding: 10, alignItems: 'stretch' },
  bar: { width: 4, borderRadius: 2 },
});
