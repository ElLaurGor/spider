import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Btn, Card, Field, H, Icon, Row, SpiderSays, T } from '@/components/ui';
import { C, MONO } from '@/constants/theme';
import { dayKey } from '@/lib/dates';
import { habitsDone, habitsFor } from '@/lib/habits';
import { nightVerdictKey } from '@/lib/line-context';
import { eveningKey, tomorrowKey } from '@/lib/memory';
import { MOOD_LEVELS, moodInfo } from '@/lib/mood';
import { dayScoreFor, gradeOf } from '@/lib/report';
import { dayOf, moodsOf } from '@/lib/selectors';
import { useStore } from '@/lib/store';
import { gentleDay, toneOn } from '@/lib/tone';

/** The evening debrief: mood, loose ends, tomorrow's top 3, then the day's verdict. */
export default function Debrief() {
  const { state, actions, quip } = useStore();
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
  const open = state.tasks.filter((t) => !t.done);
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

      <Card>
        <H right={<T dim small>{picks.length}/3</T>}>3 · Tomorrow&apos;s top 3</H>
        <T dim small>
          Pick up to three tasks for tomorrow. They wait for you on HQ in the morning.
        </T>
        {open.map((t) => {
          const n = picks.indexOf(t.id);
          return (
            <Pressable key={t.id} onPress={() => pick(t.id)} style={{ opacity: n < 0 && picks.length >= 3 ? 0.4 : 1 }}>
              <Row>
                <View style={[styles.slot, n >= 0 && { backgroundColor: C.cyan, borderColor: C.cyan }]}>
                  <Text style={styles.slotNum}>{n >= 0 ? n + 1 : ''}</Text>
                </View>
                <T style={{ flex: 1 }}>{t.title}</T>
              </Row>
            </Pressable>
          );
        })}
        <Row>
          <Field value={draft} onChangeText={setDraft} placeholder="Add a task for tomorrow…" onSubmitEditing={add} returnKeyType="done" style={{ flex: 1 }} />
          <Btn icon="add" onPress={add} disabled={!draft.trim()} />
        </Row>
      </Card>

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

const styles = StyleSheet.create({
  link: { color: C.red, fontWeight: '700', fontSize: 13 },
  moodBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, marginHorizontal: 2, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card2, gap: 2 },
  moodLabel: { color: C.dim, fontSize: 11, fontWeight: '700' },
  slot: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: C.dim, alignItems: 'center', justifyContent: 'center' },
  slotNum: { color: C.bg, fontWeight: '900', fontSize: 13, fontFamily: MONO },
  score: { color: C.red, fontSize: 44, fontWeight: '900', fontFamily: MONO },
  grade: { color: C.text, fontSize: 28, fontWeight: '900', fontFamily: MONO, marginLeft: 10, marginBottom: 6 },
});
