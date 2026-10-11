import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { router } from 'expo-router';

import { DayPicker } from '@/components/day-picker';
import { SleepEditor } from '@/components/sleep-checkin';
import { TrackersCard } from '@/components/trackers-card';
import { Btn, Card, Chip, Field, H, Icon, Row, T } from '@/components/ui';
import { C, MONO } from '@/constants/theme';
import { addDays, dayKey, fmtDuration, fmtTime, WEEKDAYS } from '@/lib/dates';
import { sleepInfo } from '@/lib/body';
import { EMOTIONS, emotionEmoji, MOOD_LEVELS, moodInfo } from '@/lib/mood';
import { avgMood, dayOf, effectiveSavage, emotionCounts, moodsOf } from '@/lib/selectors';
import { useStore } from '@/lib/store';
import type { MoodLevel } from '@/lib/types';

export default function MoodScreen() {
  const { state, actions } = useStore();
  const [level, setLevel] = useState<MoodLevel | null>(null);
  const [emotions, setEmotions] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [sleepDay, setSleepDay] = useState<string | null>(null); // night being logged, by its morning's key
  const [picked, setPicked] = useState<string | null>(null); // a past day being fixed; null = today
  const day = picked ?? dayKey();

  const today = moodsOf(dayOf(state, day));
  const counts = emotionCounts(state, 7);
  const goingEasy = effectiveSavage(state) < state.settings.savageLevel;
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(new Date(), i - 6);
    const log = dayOf(state, dayKey(d));
    return { key: dayKey(d), label: WEEKDAYS[d.getDay()][0], avg: avgMood(log), sleep: log.sleepRating, sleepMin: log.sleepMin };
  });

  const toggle = (name: string) =>
    setEmotions(emotions.includes(name) ? emotions.filter((e) => e !== name) : [...emotions, name]);

  const log = () => {
    if (!level) return;
    actions.logMood(level, emotions, note, day);
    setLevel(null);
    setEmotions([]);
    setNote('');
  };

  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
      <DayPicker value={day} onChange={(k) => setPicked(k === dayKey() ? null : k)} />
      <Card>
        <H>{day === dayKey() ? 'How are you feeling?' : 'How were you feeling?'}</H>
        <Row style={{ justifyContent: 'space-between' }}>
          {MOOD_LEVELS.map((m) => {
            const on = level === m.level;
            return (
              <Pressable
                key={m.level}
                onPress={() => setLevel(m.level)}
                style={[styles.moodBtn, on && { borderColor: m.color, backgroundColor: `${m.color}33` }]}>
                <Text style={{ fontSize: 30 }}>{m.emoji}</Text>
                <Text style={[styles.moodLabel, on && { color: C.text }]}>{m.label}</Text>
              </Pressable>
            );
          })}
        </Row>

        <T dim small>
          What&apos;s going on? (optional, pick any)
        </T>
        <Row gap={6} style={{ flexWrap: 'wrap' }}>
          {EMOTIONS.map((e) => (
            <Chip key={e.name} label={`${e.emoji} ${e.name}`} active={emotions.includes(e.name)} color={C.purple} onPress={() => toggle(e.name)} />
          ))}
        </Row>
        <Field value={note} onChangeText={setNote} placeholder="Note (optional)" />
        <Btn label={level ? `Log ${moodInfo(level).emoji}` : 'Pick a mood first'} icon="check_circle" onPress={log} disabled={!level} />
        {goingEasy ? (
          <T small style={{ color: C.cyan }}>
            Roasts are dialed down for today. Log a better mood later to bring them back.
          </T>
        ) : null}
        {today.some((m) => m.level <= 2) ? <Btn label="Need a minute? Breathe with me" icon="air" kind="blue" onPress={() => router.push('/breathe')} /> : null}
      </Card>

      <TrackersCard day={day} />

      <Card>
        <H>{day === dayKey() ? 'Today' : 'That day'}</H>
        {today.length === 0 ? (
          <T dim small>
            {day === dayKey() ? 'No check-ins yet today.' : 'No check-ins that day.'}
          </T>
        ) : (
          today.map((m) => (
            <Row key={m.id} style={{ alignItems: 'flex-start' }}>
              <Text style={styles.time}>{fmtTime(m.at)}</Text>
              <Text style={{ fontSize: 20 }}>{moodInfo(m.level).emoji}</Text>
              <View style={{ flex: 1, gap: 2 }}>
                <T>{m.emotions.length ? m.emotions.map((e) => `${emotionEmoji(e)} ${e}`).join('  ') : moodInfo(m.level).label}</T>
                {m.note ? (
                  <T dim small>
                    {m.note}
                  </T>
                ) : null}
              </View>
              <Pressable onPress={() => actions.removeMood(m.id, day)} hitSlop={8}>
                <Icon name="close" size={18} color={C.faint} />
              </Pressable>
            </Row>
          ))
        )}
      </Card>

      <Card>
        <H>Last 7 days</H>
        <Row gap={6} style={{ alignItems: 'flex-end', height: 120 }}>
          {week.map((d, i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 16 }}>{d.avg ? moodInfo(d.avg).emoji : ' '}</Text>
              <View
                style={{
                  width: '70%',
                  height: d.avg ? (d.avg / 5) * 70 : 3,
                  borderRadius: 4,
                  backgroundColor: d.avg ? moodInfo(d.avg).color : C.card2,
                }}
              />
              <Text style={styles.dayLabel}>{d.label}</Text>
            </View>
          ))}
        </Row>
      </Card>

      <Card>
        <H>Sleep · 7 days</H>
        <Row gap={6}>
          {week.map((d) => (
            <Pressable
              key={d.key}
              onPress={() => setSleepDay(d.key)}
              hitSlop={4}
              style={({ pressed }) => [{ flex: 1, alignItems: 'center', gap: 2 }, pressed && { opacity: 0.7 }]}>
              <Text style={{ fontSize: 18 }}>{d.sleep ? sleepInfo(d.sleep).emoji : '·'}</Text>
              <Text style={styles.dayLabel}>{d.sleepMin != null ? fmtDuration(d.sleepMin * 60_000).replace(' ', '') : '+'}</Text>
              <Text style={styles.dayLabel}>{d.label}</Text>
            </Pressable>
          ))}
        </Row>
        <T dim small>
          Rate your sleep each morning on HQ. Tap a day to log or fix the hours slept the night before.
        </T>
        {sleepDay ? <SleepEditor key={sleepDay} day={sleepDay} onClose={() => setSleepDay(null)} /> : null}
      </Card>

      <Card>
        <H>Emotion counter · 7 days</H>
        {counts.length === 0 ? (
          <T dim small>
            Tag emotions when you check in and I&apos;ll count them here.
          </T>
        ) : (
          <View style={{ gap: 8 }}>
            {counts.map((c) => (
              <Row key={c.emotion}>
                <Text style={{ fontSize: 18, width: 26 }}>{emotionEmoji(c.emotion)}</Text>
                <T style={{ width: 90 }}>{c.emotion}</T>
                <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: C.card2 }}>
                  <View style={{ width: `${(c.n / counts[0].n) * 100}%`, height: 8, borderRadius: 4, backgroundColor: C.purple }} />
                </View>
                <T small mono dim>
                  ×{c.n}
                </T>
              </Row>
            ))}
          </View>
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  moodBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    marginHorizontal: 2,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.card2,
    gap: 2,
  },
  moodLabel: { color: C.dim, fontSize: 11, fontWeight: '700' },
  time: { color: C.dim, fontFamily: MONO, fontSize: 12, marginTop: 4 },
  dayLabel: { color: C.dim, fontSize: 11, fontWeight: '700' },
});
