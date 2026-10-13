import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { router } from 'expo-router';

import { ActivityCard } from '@/components/activity-card';
import { ProgressPhotos } from '@/components/progress-photos';
import { Big, Btn, Card, Field, H, Icon, Row, Screen, SpiderSays, Stepper, T, useNow } from '@/components/ui';
import { WatchCard } from '@/components/watch-card';
import { HiddenEgg } from '@/components/swedish-year';
import { C } from '@/constants/theme';
import { fmtClock, WEEK_ORDER, WEEKDAYS, WEEKDAYS_LONG } from '@/lib/dates';
import { changeOver, fmtChange, latest } from '@/lib/body-log';
import { dayOf, lastSession, prFor, trainMinutes, workoutFor, workoutsThisWeek } from '@/lib/selectors';
import { useStore } from '@/lib/store';
import type { Weekday } from '@/lib/types';

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export default function Gym() {
  const { state, actions } = useStore();
  const [extra, setExtra] = useState<string[]>([]);
  const [newEx, setNewEx] = useState('');
  const [showSets, setShowSets] = useState(() => dayOf(state).sets.length > 0);

  const now = new Date();
  const today = dayOf(state);
  const plan = workoutFor(state, now);
  const week = workoutsThisWeek(state);

  // Plan exercises + anything logged/added today, without duplicates.
  const exercises: string[] = [];
  for (const name of [...(plan?.exercises ?? []), ...today.sets.map((x) => x.exercise), ...extra]) {
    if (!exercises.some((e) => same(e, name))) exercises.push(name);
  }

  const addExercise = () => {
    const n = newEx.trim();
    if (n) setExtra([...extra, n]);
    setNewEx('');
  };

  return (
    <Screen title="GYM" subtitle={`${WEEKDAYS_LONG[now.getDay()]} · ${plan ? `${plan.name} day` : 'Rest day'}`}>
      <GymSpider workout={plan?.name ?? null} minutes={trainMinutes(today)} sets={today.sets.length} />

      <ActivityCard />

      <RestTimer endsAt={state.restEndsAt} onAdd={() => actions.addRest(30)} onSkip={actions.skipRest} />

      <WatchCard />

      <Row gap={10}>
        <Stat label="This week" value={`${week.done}/${week.planned}`} />
        <Stat label="Workouts" value={String(state.counters.workouts)} />
        <Stat label="Min today" value={String(trainMinutes(today))} />
      </Row>

      <Card>
        <Pressable onPress={() => setShowSets(!showSets)}>
          <H right={<Icon name={showSets ? 'expand_less' : 'expand_more'} size={22} color={C.dim} />}>Weight × reps (optional)</H>
        </Pressable>
        {!showSets ? (
          <T dim small>
            Track individual exercises with weight and reps, PRs and a rest timer. Tap to open.
          </T>
        ) : (
          <Row>
            <Field value={newEx} onChangeText={setNewEx} placeholder="Add an exercise, e.g. Hip thrust" onSubmitEditing={addExercise} style={{ flex: 1 }} />
            <Btn icon="add" onPress={addExercise} disabled={!newEx.trim()} />
          </Row>
        )}
      </Card>

      {showSets && exercises.map((name) => <ExerciseCard key={name.toLowerCase()} name={name} />)}

      <ProgressPhotos />

      <BodyCard />

      <PlanEditor />
      <HiddenEgg id="gym" align="center" />
    </Screen>
  );
}

function GymSpider({ workout, minutes, sets }: { workout: string | null; minutes: number; sets: number }) {
  const { quip } = useStore();
  const pick = useMemo(() => (workout ? quip('gymRemind', { workout }) : quip('restDay')), [quip, workout]);
  const done = [minutes ? `${minutes} min` : '', sets ? `${sets} sets` : ''].filter(Boolean).join(' and ');
  const text = done ? `${done} logged today. Keep going or go home. Those are the options.` : pick;
  return <SpiderSays text={text} />;
}

/** Neutral weight/measurement summary; tap to open the Body screen. */
function BodyCard() {
  const { state } = useStore();
  const w = latest(state, 'weight');
  return (
    <Pressable onPress={() => router.push('/body')}>
      <Card>
        <H right={<T dim small>open →</T>}>📏 Body & measurements</H>
        {w == null ? (
          <T dim small>
            Track weight and measurements privately, with weekly trends. Neutral: no roasts, ever.
          </T>
        ) : (
          <T small mono>
            {w.toFixed(1)} kg · 30 days {fmtChange(changeOver(state, 'weight', 30), 'kg')}
          </T>
        )}
      </Card>
    </Pressable>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card style={{ flex: 1, gap: 2, padding: 12 }}>
      <Big size={24}>{value}</Big>
      <T dim small>
        {label}
      </T>
    </Card>
  );
}

function RestTimer({ endsAt, onAdd, onSkip }: { endsAt: number | null; onAdd: () => void; onSkip: () => void }) {
  const now = useNow(250, !!endsAt, endsAt ?? undefined);
  if (!endsAt || endsAt <= now) return null;
  return (
    <Card accent={C.cyan}>
      <Row style={{ justifyContent: 'space-between' }}>
        <View>
          <H>Rest</H>
          <Big color={C.cyan} size={44}>
            {fmtClock(endsAt - now)}
          </Big>
        </View>
        <View style={{ gap: 8 }}>
          <Btn label="+30s" kind="ghost" small onPress={onAdd} />
          <Btn label="Skip" kind="ghost" small onPress={onSkip} />
        </View>
      </Row>
    </Card>
  );
}

function ExerciseCard({ name }: { name: string }) {
  const { state, actions } = useStore();
  const todaySets = dayOf(state).sets.filter((x) => same(x.exercise, name));
  const last = lastSession(state, name);
  const pr = prFor(state, name);
  const seed = todaySets.at(-1) ?? last?.best;
  const [weight, setWeight] = useState(seed?.weight ?? 20);
  const [reps, setReps] = useState(seed?.reps ?? 8);

  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={styles.exName}>{name}</Text>
        {pr !== undefined ? (
          <Row gap={4}>
            <Icon name="military_tech" size={16} color={C.yellow} />
            <T small style={{ color: C.yellow }}>
              PR {pr} kg
            </T>
          </Row>
        ) : null}
      </Row>
      {last ? (
        <T dim small>
          Last time ({WEEKDAYS[new Date(`${last.key}T12:00`).getDay()]} {last.key.slice(5)}): {last.best.weight} kg × {last.best.reps}
        </T>
      ) : (
        <T dim small>
          First time. No pressure. (There&apos;s pressure.)
        </T>
      )}

      {todaySets.length > 0 ? (
        <Row gap={6} style={{ flexWrap: 'wrap' }}>
          {todaySets.map((x, i) => (
            <Pressable key={x.id} onLongPress={() => actions.removeSet(x.id)} style={styles.setChip}>
              <Text style={styles.setText}>
                {i + 1}. {x.weight}×{x.reps}
              </Text>
            </Pressable>
          ))}
        </Row>
      ) : null}

      <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <Stepper value={weight} onChange={setWeight} step={2.5} max={500} format={(v) => `${v} kg`} />
        <Stepper value={reps} onChange={setReps} step={1} min={1} max={100} format={(v) => `${v} reps`} />
      </Row>
      <Btn label="Log set" icon="add" onPress={() => actions.logSet(name, weight, reps)} />
      {todaySets.length > 0 ? (
        <T dim small>
          Long-press a set to delete it.
        </T>
      ) : null}
    </Card>
  );
}

function PlanEditor() {
  const { state, actions } = useStore();
  const [editing, setEditing] = useState<Weekday | null>(null);
  const [name, setName] = useState('');
  const [exText, setExText] = useState('');
  const [rest, setRest] = useState(false);

  const open = (d: Weekday) => {
    const w = state.plan[d];
    setEditing(d);
    setName(w?.name ?? '');
    setExText(w?.exercises.join('\n') ?? '');
    setRest(!w);
  };

  const save = () => {
    if (editing === null) return;
    const exercises = exText
      .split(/[\n,]/)
      .map((x) => x.trim())
      .filter(Boolean);
    actions.setPlanDay(editing, rest ? null : { name: name.trim() || 'Workout', exercises });
    setEditing(null);
  };

  return (
    <Card>
      <H>Weekly plan</H>
      {WEEK_ORDER.map((d) => {
        const w = state.plan[d];
        if (editing === d) {
          return (
            <View key={d} style={styles.editor}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text style={styles.exName}>{WEEKDAYS_LONG[d]}</Text>
                <Row gap={6}>
                  <T dim small>
                    Rest day
                  </T>
                  <Switch value={rest} onValueChange={setRest} trackColor={{ true: C.red }} />
                </Row>
              </Row>
              {!rest ? (
                <>
                  <Field value={name} onChangeText={setName} placeholder="Workout name (e.g. Push)" />
                  <Field
                    value={exText}
                    onChangeText={setExText}
                    placeholder={'One exercise per line\nBench press\nOverhead press'}
                    multiline
                    style={{ minHeight: 110, textAlignVertical: 'top' }}
                  />
                </>
              ) : null}
              <Row>
                <Btn label="Save" onPress={save} style={{ flex: 1 }} />
                <Btn label="Cancel" kind="ghost" onPress={() => setEditing(null)} style={{ flex: 1 }} />
              </Row>
            </View>
          );
        }
        return (
          <Pressable key={d} onPress={() => open(d)} style={({ pressed }) => [styles.dayRow, pressed && { opacity: 0.7 }]}>
            <Text style={styles.dayName}>{WEEKDAYS[d]}</Text>
            <View style={{ flex: 1 }}>
              <T style={!w && { color: C.dim }}>{w ? w.name : 'Rest'}</T>
              {w ? (
                <T dim small>
                  {w.exercises.join(' · ')}
                </T>
              ) : null}
            </View>
            <Icon name="edit" size={18} color={C.faint} />
          </Pressable>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  exName: { color: C.text, fontSize: 17, fontWeight: '800' },
  setChip: { backgroundColor: C.redDim, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  setText: { color: C.text, fontWeight: '700', fontSize: 13 },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  dayName: { color: C.red, fontWeight: '900', width: 40, letterSpacing: 1 },
  editor: { gap: 10, backgroundColor: C.card2, borderRadius: 12, padding: 12 },
});
