import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, Chip, Icon, Row, T } from '@/components/ui';
import { useToday } from '@/components/use-today';
import { C, MONO } from '@/constants/theme';
import { fmtTime } from '@/lib/dates';
import { emotionEmoji, moodInfo } from '@/lib/mood';
import { journalEmotions, journalMonth } from '@/lib/mood-journal';
import { useStore } from '@/lib/store';

/**
 * The mood journal (step 8 days, mood-journal.ts): every check-in with a note or named feelings, by month,
 * filterable by emotion word; tap a day to open it on the Mood screen. Shown, never graded.
 */
export default function JournalScreen() {
  const { state } = useStore();
  const today = useToday();
  const [month, setMonth] = useState(() => ({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) - 1 }));
  const [emotion, setEmotion] = useState<string | null>(null);
  const days = journalMonth(state, month.y, month.m, emotion);
  const words = journalEmotions(state, month.y, month.m);
  const label = new Date(month.y, month.m, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const isNow = month.y === Number(today.slice(0, 4)) && month.m === Number(today.slice(5, 7)) - 1;
  const step = (by: number) => {
    const d = new Date(month.y, month.m + by, 1);
    setMonth({ y: d.getFullYear(), m: d.getMonth() });
    setEmotion(null);
  };

  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Pressable onPress={() => step(-1)} hitSlop={10} style={styles.nav} accessibilityRole="button" accessibilityLabel="Previous month">
          <Icon name="chevron_left" color={C.text} />
        </Pressable>
        <Text style={styles.month}>{label}</Text>
        <Pressable onPress={() => step(1)} hitSlop={10} disabled={isNow} style={[styles.nav, isNow && { opacity: 0.3 }]} accessibilityRole="button" accessibilityLabel="Next month">
          <Icon name="chevron_right" color={C.text} />
        </Pressable>
      </Row>

      {words.length ? (
        <Row gap={6} style={{ flexWrap: 'wrap' }}>
          <Chip label="All" active={emotion == null} color={C.purple} onPress={() => setEmotion(null)} />
          {words.map((w) => (
            <Chip key={w.emotion} label={`${emotionEmoji(w.emotion)} ${w.emotion} ×${w.n}`} active={emotion === w.emotion} color={C.purple} onPress={() => setEmotion(emotion === w.emotion ? null : w.emotion)} />
          ))}
        </Row>
      ) : null}

      {days.length === 0 ? (
        <T dim small>
          {emotion ? `No check-ins named ${emotion} this month.` : 'No notes or named feelings this month. Add them when you check in on the Mood screen.'}
        </T>
      ) : null}

      {days.map((d) => (
        <Pressable key={d.key} onPress={() => router.push({ pathname: '/mood', params: { day: d.key } })} accessibilityRole="button" accessibilityLabel={`Open ${d.key}`}>
          <Card>
            <T dim small>
              {new Date(`${d.key}T12:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
            </T>
            {d.entries.map((m) => (
              <Row key={m.id} style={{ alignItems: 'flex-start' }}>
                <Text style={styles.time}>{fmtTime(m.at)}</Text>
                <Text style={{ fontSize: 18 }}>{moodInfo(m.level).emoji}</Text>
                <View style={{ flex: 1, gap: 2 }}>
                  {m.emotions.length ? <T small>{m.emotions.map((e) => `${emotionEmoji(e)} ${e}`).join('  ')}</T> : null}
                  {m.note?.trim() ? <T dim small>{m.note.trim()}</T> : null}
                </View>
              </Row>
            ))}
          </Card>
        </Pressable>
      ))}
      <T dim small>
        Private and never graded. Notes stay out of roasts and recaps.
      </T>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  nav: { padding: 8, borderRadius: 10, backgroundColor: C.card2 },
  month: { color: C.text, fontSize: 18, fontWeight: '800', fontFamily: MONO },
  time: { color: C.dim, fontFamily: MONO, fontSize: 12, marginTop: 3 },
});
