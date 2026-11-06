import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Btn, Card, Chip, Field, H, Icon, Row, SpiderSays, T } from '@/components/ui';
import { C, MONO } from '@/constants/theme';
import { dayKey, fmtTime } from '@/lib/dates';
import { doneOn, doneTitle } from '@/lib/done-list';
import { winOn } from '@/lib/past-you';
import type { TopWhen } from '@/lib/types';
import { habitsDone, habitsFor } from '@/lib/habits';
import { nightVerdictKey } from '@/lib/line-context';
import { eveningKey, tomorrowKey } from '@/lib/memory';
import { MOOD_LEVELS, moodInfo } from '@/lib/mood';
import { dayScoreFor, gradeOf } from '@/lib/report';
import { dayOf, freeSlots, moodsOf, workoutFor } from '@/lib/selectors';
import { useStore } from '@/lib/store';
import { gentleDay, toneOn } from '@/lib/tone';
// step 9 admin: tasks on a horizon wait, due chores can be picked
import { choresDueBy, choreTaskOf, choreTitle, grimText } from '@/lib/chores';
import { activeTasks } from '@/lib/horizons';

/** The evening debrief: mood, loose ends, tomorrow's top 3, then the day's verdict. */
export default function Debrief() {
  const { state, actions, quip, cal } = useStore();
  const [intro] = useState(() => quip('debriefIntro'));
  const [verdict, setVerdict] = useState<{ text: string; done: string; kind: boolean } | null>(null);
  const [flip] = useState(() => new Animated.Value(0));
  const [draft, setDraft] = useState('');

  const key = eveningKey(); // after midnight this is still last night
  const tonight = key === dayKey();
  const date = new Date(`${key}T12:00`);
  const log = dayOf(state, key);
  const lastMood = moodsOf(log).at(-1);
  const habitsLeft = tonight ? habitsFor(state, date).filter((h) => !habitsDone(state, key).includes(h.id)) : [];
  const windLeft = log.windDownDone ? [] : state.windDownItems.filter((i) => !(log.windDown ?? []).includes(i));
  const tomorrow = tomorrowKey();
  const picks = state.topTomorrow?.day === tomorrow ? state.topTomorrow.ids.filter((id) => state.tasks.some((t) => t.id === id && !t.done)) : [];
  const open = activeTasks(state, tomorrow); // step 9 admin: what's on a horizon for tomorrow stays off
  // step 9 admin: chores due by tomorrow, without a task yet (horizons.ts, chores.ts); picking one makes its task
  const choresDue = choresDueBy(state, tomorrow, dayKey()).filter((c) => !choreTaskOf(state, c.id));
  const pickChore = (id: string) => {
    if (picks.length >= 3) return;
    const taskId = actions.choreTask(id);
    if (taskId) actions.setTopTomorrow([...picks, taskId]);
  };
  // step 8 days: what got done today (titles kept after Clear), and when tomorrow's picks are booked for
  const doneToday = doneOn(state, key);
  const tomorrowDate = new Date(`${tomorrow}T12:00`);
  const slots = cal.status === 'granted' ? freeSlots(cal.events, tomorrowDate, state.settings.wakeHour + 1, state.settings.sleepHour - 1) : [];
  const booked = state.topTomorrow?.day === tomorrow ? (state.topTomorrow.when ?? {}) : {};
  const gymTomorrow = !!workoutFor(state, tomorrowDate);
  const score = dayScoreFor(state, date);
  // A low-mood (an awful check-in a minute ago included), sick, away or period day gets no grade at all.
  const kind = toneOn(state, key).kind || gentleDay(state, key);

  useEffect(() => {
    if (!verdict) return;
    flip.setValue(0);
    Animated.spring(flip, { toValue: 1, friction: 6, useNativeDriver: true }).start();
  }, [verdict, flip]);

  const pick = (id: string) => {
    if (picks.includes(id)) actions.setTopTomorrow(picks.filter((x) => x !== id));
    else if (picks.length < 3) actions.setTopTomorrow([...picks, id]);
  };

  const add = () => {
    actions.addTask(draft);
    setDraft('');
  };

  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
      <SpiderSays text={intro} />

      <Card>
        <H>1 · How was today?</H>
        {lastMood ? (
          <Row>
            <Text style={{ fontSize: 26 }}>{moodInfo(lastMood.level).emoji}</Text>
            <T style={{ flex: 1 }}>{moodInfo(lastMood.level).label}. Logged.</T>
            <Text style={styles.link} onPress={() => router.push('/mood')}>
              add more →
            </Text>
          </Row>
        ) : (
          <Row style={{ justifyContent: 'space-between' }}>
            {MOOD_LEVELS.map((m) => (
              <Pressable key={m.level} onPress={() => actions.logMood(m.level, [], '', key)} style={styles.moodBtn}>
                <Text style={{ fontSize: 28 }}>{m.emoji}</Text>
                <Text style={styles.moodLabel}>{m.label}</Text>
              </Pressable>
            ))}
          </Row>
        )}
      </Card>

      <Card>
        <H>2 · Loose ends</H>
        {habitsLeft.length === 0 && windLeft.length === 0 ? (
          <T dim small>
            Nothing left hanging. Suspicious, but fine.
          </T>
        ) : null}
        {habitsLeft.map((h) => (
          <Pressable key={h.id} onPress={() => actions.toggleHabit(h.id)}>
            <Row>
              <Icon name="radio_button_unchecked" size={22} color={C.dim} />
              <T style={{ flex: 1 }}>
                {h.emoji} {h.name}
              </T>
              <T dim small>
                habit
              </T>
            </Row>
          </Pressable>
        ))}
        {windLeft.map((item) => (
          <Pressable key={item} onPress={() => actions.toggleWindDown(item)}>
            <Row>
              <Icon name="radio_button_unchecked" size={22} color={C.dim} />
              <T style={{ flex: 1 }}>{item}</T>
              <T dim small>
                wind-down
              </T>
            </Row>
          </Pressable>
        ))}
      </Card>

      {doneToday.length > 0 ? (
        <Card>
          <H right={<T dim small>{doneToday.length}</T>}>✅ Done today</H>
          {doneToday.map((x) => (
            <Row key={x.id}>
              <Icon name="check_circle" size={18} color={C.green} />
              <T style={{ flex: 1 }} dim={!x.title}>
                {doneTitle(x)}
              </T>
              <T dim small mono>
                {fmtTime(x.at)}
              </T>
            </Row>
          ))}
        </Card>
      ) : null}

      <Card>
        <H right={<T dim small>{picks.length}/3</T>}>3 · Tomorrow&apos;s top 3</H>
        <T dim small>
          Pick up to three tasks for tomorrow. They wait for you on HQ in the morning.
        </T>
        {open.map((t) => {
          const n = picks.indexOf(t.id);
          return (
            <View key={t.id} style={{ gap: 6 }}>
              <Pressable onPress={() => pick(t.id)} style={{ opacity: n < 0 && picks.length >= 3 ? 0.4 : 1 }}>
                <Row>
                  <View style={[styles.slot, n >= 0 && { backgroundColor: C.cyan, borderColor: C.cyan }]}>
                    <Text style={styles.slotNum}>{n >= 0 ? n + 1 : ''}</Text>
                  </View>
                  <T style={{ flex: 1 }}>{t.title}</T>
                </Row>
              </Pressable>
              {n >= 0 ? <WhenPicker id={t.id} current={booked[t.id] ?? null} slots={slots} gym={gymTomorrow} /> : null}
            </View>
          );
        })}
        {choresDue.map((c) => (
          <Pressable key={c.id} onPress={() => pickChore(c.id)} style={{ opacity: picks.length >= 3 ? 0.4 : 1 }} accessibilityRole="button" accessibilityLabel={`Pick the chore ${c.name}`}>
            <Row>
              <View style={styles.slot} />
              <T style={{ flex: 1 }}>{choreTitle(c)}</T>
              <T dim small>
                chore · {grimText(state, c)}
              </T>
            </Row>
          </Pressable>
        ))}
        {picks.length ? (
          <T dim small>
            Book a pick into one of tomorrow&apos;s free gaps, after gym or after the first coffee. A gap can ping you when it starts.
          </T>
        ) : null}
        <Row>
          <Field value={draft} onChangeText={setDraft} placeholder="Add a task for tomorrow…" onSubmitEditing={add} returnKeyType="done" style={{ flex: 1 }} />
          <Btn icon="add" onPress={add} disabled={!draft.trim()} />
        </Row>
      </Card>

      <GladCard day={key} />

      <Card accent={C.yellow}>
        <H>4 · The verdict</H>
        {verdict ? (
          <Animated.View
            style={{
              gap: 8,
              opacity: flip,
              transform: [{ perspective: 800 }, { rotateX: flip.interpolate({ inputRange: [0, 1], outputRange: ['90deg', '0deg'] }) }],
            }}>
            {verdict.kind ? null : (
              <Row style={{ alignItems: 'flex-end' }}>
                <Text style={styles.score}>{score}</Text>
                <Text style={styles.grade}>{gradeOf(score)}</Text>
              </Row>
            )}
            <T style={{ color: C.yellow }}>{verdict.text}</T>
            <T dim small>
              {verdict.done}
            </T>
          </Animated.View>
        ) : (
          <Btn label="Reveal the verdict" icon="gavel" onPress={() => setVerdict({ text: quip(nightVerdictKey(score, kind)), done: quip('debriefDone'), kind })} />
        )}
      </Card>
    </ScrollView>
  );
}

/** step 8 days: when a picked task is booked for tomorrow (plan-slots.ts): a free gap (with an optional ping), after gym or after the first coffee. */
function WhenPicker({ id, current, slots, gym }: { id: string; current: TopWhen | null; slots: { start: number; end: number }[]; gym: boolean }) {
  const { actions } = useStore();
  const options: TopWhen[] = slots.map((sl) => ({ kind: 'slot', at: sl.start, end: sl.end }));
  if (current?.kind === 'slot' && !options.some((o) => o.kind === 'slot' && o.at === current.at)) options.unshift({ kind: 'slot', at: current.at, end: current.end });
  if (gym) options.push({ kind: 'gym' });
  options.push({ kind: 'coffee' });
  const same = (w: TopWhen) => !!current && current.kind === w.kind && (w.kind !== 'slot' || (current.kind === 'slot' && current.at === w.at));
  const label = (w: TopWhen) => (w.kind === 'slot' ? `${fmtTime(w.at)}–${fmtTime(w.end)}` : w.kind === 'gym' ? 'after gym' : 'after first coffee');
  return (
    <Row gap={6} style={{ flexWrap: 'wrap', paddingLeft: 34 }}>
      {options.map((w) => (
        <Chip key={w.kind === 'slot' ? String(w.at) : w.kind} label={label(w)} color={C.cyan} active={same(w)} onPress={() => actions.bookTop(id, same(w) ? null : w)} />
      ))}
      {current?.kind === 'slot' ? (
        <Chip label={current.ping ? '🔔 ping on' : '🔕 ping me then'} color={C.cyan} active={!!current.ping} onPress={() => actions.bookTop(id, { ...current, ping: !current.ping })} />
      ) : null}
    </Row>
  );
}

/** step 8 days: tonight's "glad I did this" (past-you.ts). Past you hands it back on a harder day. */
function GladCard({ day }: { day: string }) {
  const { state, actions } = useStore();
  const [text, setText] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const win = winOn(state, day);
  const notes = [...(state.pastYou?.notes ?? [])].reverse();
  const save = () => {
    actions.setWin(text);
    setText('');
  };
  return (
    <Card>
      <H>🌱 Glad I did this</H>
      <T dim small>
        Optional: one thing from today you&apos;re glad you did. On a harder day, past you hands it back.
      </T>
      {win ? (
        <Row>
          <T style={{ flex: 1 }}>&quot;{win.text}&quot;</T>
          <Pressable onPress={() => actions.setWin('')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Take it back">
            <Icon name="close" size={18} color={C.faint} />
          </Pressable>
        </Row>
      ) : (
        <Row>
          <Field value={text} onChangeText={setText} placeholder="e.g. went for the walk anyway" maxLength={140} onSubmitEditing={save} returnKeyType="done" style={{ flex: 1 }} />
          <Btn icon="check" onPress={save} disabled={!text.trim()} />
        </Row>
      )}
      {notes.length ? (
        <Pressable onPress={() => setShowNotes(!showNotes)} hitSlop={6}>
          <T dim small>
            {showNotes ? '▾' : '▸'} Notes from past you ({notes.length})
          </T>
        </Pressable>
      ) : null}
      {showNotes
        ? notes.map((n) => (
            <Row key={n.id}>
              <Text style={{ fontSize: 14 }}>{n.kind === 'win' ? '🌱' : '📝'}</Text>
              <T small style={{ flex: 1 }}>
                {n.text}
              </T>
              <Pressable onPress={() => actions.deletePastNote(n.id)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Delete note">
                <Icon name="close" size={16} color={C.faint} />
              </Pressable>
            </Row>
          ))
        : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  link: { color: C.red, fontWeight: '700', fontSize: 13 },
  moodBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, marginHorizontal: 2, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card2, gap: 2 },
  moodLabel: { color: C.dim, fontSize: 11, fontWeight: '700' },
  slot: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: C.dim, alignItems: 'center', justifyContent: 'center' },
  slotNum: { color: C.bg, fontWeight: '900', fontSize: 13, fontFamily: MONO },
  score: { color: C.red, fontSize: 44, fontWeight: '900', fontFamily: MONO },
  grade: { color: C.text, fontSize: 28, fontWeight: '900', fontFamily: MONO, marginLeft: 10, marginBottom: 6 },
});
