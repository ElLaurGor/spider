// Ask S.P.I.D.E.R. (step 10, lib/ask.ts): three fixed questions, each answered with a verdict and the reasons
// from her own data, J.A.R.V.I.S. style. Asking is free: nothing is saved, nothing pays XP. Opened from HQ's
// shortcuts.
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Btn, Card, H, Icon, Row, SpiderSays, T } from '@/components/ui';
import { C, MONO } from '@/constants/theme';
import { askSpider, QUESTIONS, type Answer, type AskId, type AskTone } from '@/lib/ask';
import { fmtTime } from '@/lib/dates';
import { useStore } from '@/lib/store';

/** A "not now" is no failure: it's cyan, never red. */
const TONE_COLOR: Record<AskTone, string> = { go: C.green, easy: C.yellow, stop: C.cyan };

type Asked = { answer: Answer; line: string; at: number };

export default function AskScreen() {
  const { state, quip, cal, weather, health } = useStore();
  const [asked, setAsked] = useState<Asked | null>(null);

  const ask = (id: AskId) => {
    const now = new Date();
    const answer = askSpider(state, id, {
      now,
      events: cal.events,
      calendar: cal.status === 'granted',
      weather: weather.data,
      resting: health.data?.restingDays ?? [],
    });
    setAsked({ answer, line: quip(answer.line, answer.vars), at: now.getTime() });
  };

  const q = asked ? QUESTIONS.find((x) => x.id === asked.answer.id) : null;

  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={styles.page}>
      <SpiderSays text="Ask me something. I answer with your own numbers, not vibes." />

      <Card>
        <H>Questions</H>
        {QUESTIONS.map((x) => (
          <Pressable
            key={x.id}
            onPress={() => ask(x.id)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.question, asked?.answer.id === x.id && { borderColor: C.purple }, pressed && { opacity: 0.75 }]}>
            <Text style={styles.qEmoji}>{x.emoji}</Text>
            <Text style={styles.qText}>{x.label}</Text>
            <Icon name="chevron_right" size={20} color={C.dim} />
          </Pressable>
        ))}
        {cal.status !== 'granted' && cal.status !== 'unsupported' ? (
          <T dim small>
            Connect your calendars on Plan and I can weigh meetings too.
          </T>
        ) : null}
      </Card>

      {asked && q ? (
        <Card accent={TONE_COLOR[asked.answer.tone]}>
          <H right={<T dim small mono>{`as of ${fmtTime(asked.at)}`}</T>}>{`${q.emoji} ${q.label}`}</H>
          <Text style={[styles.verdict, { color: TONE_COLOR[asked.answer.tone] }]}>{asked.answer.verdict}</Text>
          <View style={{ gap: 2 }}>
            <T dim small>
              Why:
            </T>
            {asked.answer.reasons.map((r) => (
              <T key={r} small>
                · {r}
              </T>
            ))}
          </View>
          {asked.answer.context.length ? (
            <View style={{ gap: 2 }}>
              <T dim small>
                For context, not weighed:
              </T>
              {asked.answer.context.map((r) => (
                <T key={r} dim small>
                  · {r}
                </T>
              ))}
            </View>
          ) : null}
          <T small style={{ color: C.yellow }}>
            🕷️ {asked.line}
          </T>
          <Row>
            <Btn label="Ask again" icon="refresh" kind="ghost" small onPress={() => ask(asked.answer.id)} />
          </Row>
        </Card>
      ) : null}

      <T dim small style={{ textAlign: 'center' }}>
        Advice, not orders. Asking is free.
      </T>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 14, paddingBottom: 48 },
  question: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: C.border, backgroundColor: C.card2 },
  qEmoji: { fontSize: 24 },
  qText: { flex: 1, color: C.text, fontSize: 16, fontWeight: '700' },
  verdict: { fontSize: 32, fontWeight: '900', fontFamily: MONO },
});
