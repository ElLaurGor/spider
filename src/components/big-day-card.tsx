import { StyleSheet, Text, View } from 'react-native';

import { Card, Chip, H, Row, T, useNow } from '@/components/ui';
import { C } from '@/constants/theme';
import { answerOf, ANSWERS, bigDaysOn, lastAnswer } from '@/lib/big-days';
import { fmtTime } from '@/lib/dates';
import { useStore } from '@/lib/store';

/**
 * step 9 story: the evening debrief asks how the day's big events went (big-days.ts), one tap each. Only the kind
 * of event and the answer are kept. A rough one gets a kind word and is never mentioned again.
 */
export function BigDayCard({ day }: { day: string }) {
  const { state, actions, cal } = useStore();
  const now = useNow(60_000);
  const big = bigDaysOn(cal.events, day).filter((b) => b.event.start <= now);
  if (!big.length) return null;
  return (
    <Card accent={C.cyan}>
      <H>⭐ Big day</H>
      {big.map((b) => {
        const answer = answerOf(state, b.id);
        const last = lastAnswer(state, b.kind, day);
        return (
          <View key={b.id} style={{ gap: 6 }}>
            <Row>
              <Text style={{ fontSize: 20 }}>{b.emoji}</Text>
              <T style={{ flex: 1 }}>{b.event.title}</T>
              <T dim small mono>
                {b.event.allDay ? 'all day' : fmtTime(b.event.start)}
              </T>
            </Row>
            {!answer && last && last.answer !== 'rough' ? (
              <T dim small style={styles.indent}>
                Last time: {last.answer === 'nailed' ? 'nailed it' : 'survived'}.
              </T>
            ) : null}
            {answer ? (
              <T small style={[styles.indent, { color: answer.answer === 'rough' ? C.dim : C.green }]}>
                {answer.answer === 'rough' ? 'Noted, gently. Rest well.' : `Noted: ${answer.answer === 'nailed' ? 'nailed it' : 'survived'}.`}
              </T>
            ) : (
              <Row gap={6} style={[styles.indent, { flexWrap: 'wrap' }]}>
                {ANSWERS.map((a) => (
                  <Chip key={a.id} label={`${a.emoji} ${a.label}`} color={C.cyan} onPress={() => actions.answerBigDay(b, day, a.id)} />
                ))}
              </Row>
            )}
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  indent: { paddingLeft: 30 },
});
