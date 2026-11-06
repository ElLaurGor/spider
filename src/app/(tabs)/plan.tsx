import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AwayOffers } from '@/components/away-ahead';
import { CountdownsCard } from '@/components/countdowns-card';
import { EntryEditor } from '@/components/entry-editor';
import { HabitsCard } from '@/components/habits-card';
import { HiddenEgg, ValborgBonfire } from '@/components/swedish-year';
// step 9 admin: chores, the due-back shelf, the week's big ones, task horizons
import { ChoresCard } from '@/components/chores-card';
import { WeekBigCard } from '@/components/review-cards';
import { ShelfCard } from '@/components/shelf-card';
import { HorizonLists, HorizonPicker } from '@/components/task-horizons';
import { activeTasks, taskLabel } from '@/lib/horizons';
import { Btn, Card, Chip, Field, H, Icon, Row, Screen, SpiderSays, T } from '@/components/ui';
import { noonOf, useToday } from '@/components/use-today';
import { C } from '@/constants/theme';
import { addDays, dayKey, fmtTime, pad, WEEKDAYS } from '@/lib/dates';
import { IMMORTAL_DAYS, taskAgeDays } from '@/lib/memory';
import { slotPlansOn, slotStart } from '@/lib/plan-slots';
import { dayOf, eventsOn, freeSlots, trainedOn, workoutFor } from '@/lib/selectors';
import { useStore } from '@/lib/store';
import type { Task } from '@/lib/types';
import { BONUS_MIN, XP } from '@/lib/xp';

export default function Plan() {
  const { state, actions, quip, cal } = useStore();
  const [offset, setOffset] = useState(0);
  const [draft, setDraft] = useState('');
  const [showDone, setShowDone] = useState(false);
  const [renaming, setRenaming] = useState<Task | null>(null);
  const [slot, setSlot] = useState<{ start: number; end: number } | null>(null); // step 8 days: a free slot being given a job
  const [taskPick, setTaskPick] = useState(false);
  const [horizonFor, setHorizonFor] = useState<string | null>(null); // step 9 admin: the task whose "when?" is open

  const todayKey = useToday();
  const date = addDays(noonOf(todayKey), offset);
  const dayEvents = eventsOn(cal.events, date);
  const slots = freeSlots(cal.events, date, state.settings.wakeHour + 1, state.settings.sleepHour - 1);
  const plan = workoutFor(state, date);
  const timed = dayEvents.filter((e) => !e.allDay).length;
  const calKey = timed > 0 ? 'calBusy' : 'calFree';
  const calLine = useMemo(() => quip(calKey, { count: timed }), [quip, calKey, timed]);
  const emptyLine = useMemo(() => quip('tasksEmpty'), [quip]);

  const open = activeTasks(state, todayKey); // step 9 admin: tasks on a horizon (not today, someday, waiting) wait in their own lists
  const done = state.tasks.filter((t) => t.done);
  // step 8 days: free slots that do something (plan-slots.ts)
  const shownKey = dayKey(date);
  const booked = slotPlansOn(state, shownKey);
  const gymMoved = offset === 0 ? state.days[todayKey]?.gymAt : undefined;
  const canGymHere = offset === 0 && !!plan && !trainedOn(dayOf(state, todayKey));
  const pickSlot = (sl: { start: number; end: number }) => {
    setTaskPick(false);
    setSlot(slot?.start === sl.start ? null : sl);
  };
  const book = (kind: 'focus' | 'task', taskId?: string) => {
    if (!slot) return;
    actions.planSlot({ day: shownKey, at: slotStart(slot.start).at, end: slot.end, kind, taskId });
    setSlot(null);
    setTaskPick(false);
  };
  const markOf = (sl: { start: number }) => {
    const at = slotStart(sl.start).at;
    const job = booked.find((p) => p.at === at);
    if (job) return job.kind === 'focus' ? ' · 🕸️' : ' · 📌';
    const g = slotStart(sl.start);
    return gymMoved && gymMoved.hour === g.hour && gymMoved.minute === g.minute ? ' · 🏋️' : '';
  };

  const add = () => {
    actions.addTask(draft);
    setDraft('');
  };

  return (
    <Screen title="PLAN" subtitle="Calendar · habits · tasks">
      <Card>
        <H right={cal.status === 'granted' ? <Pressable onPress={cal.refresh} hitSlop={8} accessibilityRole="button" accessibilityLabel="Refresh calendar"><Icon name="refresh" size={20} color={C.dim} /></Pressable> : undefined}>
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
                const d = addDays(noonOf(todayKey), i);
                return (
                  <Chip
                    key={i}
                    label={i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : `${WEEKDAYS[d.getDay()]} ${d.getDate()}`}
                    active={offset === i}
                    onPress={() => {
                      setOffset(i);
                      setSlot(null);
                    }}
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
                    <Chip key={sl.start} label={`${fmtTime(sl.start)}–${fmtTime(sl.end)}${markOf(sl)}`} active={slot?.start === sl.start} onPress={() => pickSlot(sl)} />
                  ))}
                </Row>
                {slot ? (
                  <View style={styles.sheet}>
                    <T small>
                      {fmtTime(slot.start)}–{fmtTime(slot.end)}: what goes here?
                    </T>
                    <Row gap={8} style={{ flexWrap: 'wrap' }}>
                      {canGymHere ? (
                        <Btn
                          small
                          label="Gym here today"
                          icon="fitness_center"
                          onPress={() => {
                            actions.setGymAt(todayKey, slot.start);
                            setSlot(null);
                          }}
                        />
                      ) : null}
                      <Btn small kind="ghost" label="Focus block" icon="timer" onPress={() => book('focus')} />
                      <Btn small kind="ghost" label="Put a task here" icon="task_alt" onPress={() => setTaskPick(!taskPick)} />
                    </Row>
                    {taskPick ? (
                      open.length ? (
                        <Row gap={6} style={{ flexWrap: 'wrap' }}>
                          {open.slice(0, 12).map((t) => (
                            <Chip key={t.id} label={t.title} onPress={() => book('task', t.id)} />
                          ))}
                        </Row>
                      ) : (
                        <T dim small>
                          No open tasks yet. Add one below first.
                        </T>
                      )
                    ) : null}
                    <T dim small>
                      One reminder when the slot starts. A focus block&apos;s comes with the Focus 25 min button.
                    </T>
                  </View>
                ) : null}
              </View>
            ) : null}
            {gymMoved || booked.length ? (
              <View style={{ gap: 4 }}>
                {gymMoved ? (
                  <Row>
                    <T small style={{ flex: 1 }}>
                      🏋️ Gym today at {pad(gymMoved.hour)}:{pad(gymMoved.minute)}
                    </T>
                    <Pressable onPress={() => actions.setGymAt(todayKey, null)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Back to the usual gym time">
                      <Icon name="close" size={18} color={C.faint} />
                    </Pressable>
                  </Row>
                ) : null}
                {booked.map((p) => (
                  <Row key={p.id}>
                    <T small style={{ flex: 1 }}>
                      {p.kind === 'focus' ? '🕸️ Focus block' : `📌 ${state.tasks.find((t) => t.id === p.taskId)?.title ?? p.title ?? 'A task'}`} · {fmtTime(p.at)}
                    </T>
                    <Pressable onPress={() => actions.unplanSlot(p.id)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Remove from the slot">
                      <Icon name="close" size={18} color={C.faint} />
                    </Pressable>
                  </Row>
                ))}
              </View>
            ) : null}
          </>
        )}
      </Card>

      <HabitsCard />

      <CountdownsCard />

      <AwayOffers />

      <WeekBigCard />

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
          <View key={t.id} style={{ gap: 6 }}>
            <TaskRow
              title={taskLabel(t, todayKey)}
              done={false}
              age={taskAgeDays(t)}
              step={t.step}
              onToggle={() => actions.toggleTask(t.id)}
              onEdit={() => setRenaming(t)}
              onDelete={() => actions.deleteTask(t.id)}
              onFocus={() => router.push({ pathname: '/focus', params: { task: t.id } })}
              onLater={() => setHorizonFor(horizonFor === t.id ? null : t.id)}
            />
            {horizonFor === t.id ? <HorizonPicker task={t} today={todayKey} onClose={() => setHorizonFor(null)} /> : null}
          </View>
        ))}
        <HorizonLists today={todayKey} />
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
        <ValborgBonfire />
        <T dim small>
          Each finished task: +{XP.task} XP and +{BONUS_MIN.task} min gaming time. Long-press one to rename it, the clock hides it for now.
        </T>
        <Pressable onPress={() => router.push('/review')} hitSlop={6} accessibilityRole="button">
          <T small style={{ color: C.purple }}>
            🗺️ War room: the weekly review →
          </T>
        </Pressable>
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
      <ChoresCard />

      <ShelfCard />

      <HiddenEgg id="plan" align="flex-start" />
    </Screen>
  );
}

function TaskRow({
  title,
  done,
  age,
  step,
  onToggle,
  onEdit,
  onDelete,
  onFocus,
  onLater,
}: {
  title: string;
  done: boolean;
  age?: number; // days open, for the immortal-task badge
  step?: string; // step 9 admin: its first physical step, from the War room
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onFocus?: () => void; // step 8 days: "Focus on this" starts Web Focus labelled with the task
  onLater?: () => void; // step 9 admin: not today, someday or waiting on (horizons.ts)
}) {
  return (
    <Row>
      <Pressable onPress={onToggle} onLongPress={onEdit} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
        <Icon name={done ? 'check_circle' : 'radio_button_unchecked'} size={22} color={done ? C.green : C.dim} />
        <View style={{ flex: 1 }}>
          <T dim={done} style={done ? { textDecorationLine: 'line-through' } : undefined}>
            {title}
          </T>
          {step && !done ? (
            <T dim small>
              → {step}
            </T>
          ) : null}
        </View>
        {!done && age != null && age >= IMMORTAL_DAYS ? (
          <T small style={{ color: C.yellow }}>
            🧟 {age} days
          </T>
        ) : null}
      </Pressable>
      {onFocus ? (
        <Pressable onPress={onFocus} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Focus on ${title}`}>
          <Icon name="timer" size={18} color={C.dim} />
        </Pressable>
      ) : null}
      {onLater ? (
        <Pressable onPress={onLater} hitSlop={8} accessibilityRole="button" accessibilityLabel={`${title}: not today, someday or waiting on`}>
          <Icon name="schedule" size={18} color={C.dim} />
        </Pressable>
      ) : null}
      <Pressable onPress={onDelete} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Delete ${title}`}>
        <Icon name="close" size={18} color={C.faint} />
      </Pressable>
    </Row>
  );
}

const styles = StyleSheet.create({
  event: { backgroundColor: C.card2, borderRadius: 12, padding: 10, alignItems: 'stretch' },
  bar: { width: 4, borderRadius: 2 },
  sheet: { gap: 8, backgroundColor: C.card2, borderRadius: 12, padding: 10 },
});
