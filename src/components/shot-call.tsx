// Call your shot (step 8, lib/prediction.ts): the morning call on the quests card, the month's calibration in
// Records, and the week's calls on the report card.
import { StyleSheet, Text, View } from 'react-native';

import { Card, Chip, H, Row, T } from '@/components/ui';
import { noonOf, useToday } from '@/components/use-today';
import { C, MONO } from '@/constants/theme';
import { addDays, dayKey } from '@/lib/dates';
import { calibration, callHistory, callOf, CALLS, MIN_CALLS, monthOf, questionText, scoredShots, shotOpen, shotQuestion } from '@/lib/prediction';
import { dayOf } from '@/lib/selectors';
import { useStore } from '@/lib/store';

const pct = (x: number) => `${Math.round(x * 100)} %`;

/** On the quests card until noon: one call about today, or (once made) what was called. */
export function ShotCallPanel({ at }: { at: number }) {
  const { state, actions } = useStore();
  const now = new Date(at);
  const shot = dayOf(state, dayKey(now)).shot;
  if (shot) {
    return (
      <T dim small>
        🎯 Called: {callOf(shot.call).label.toLowerCase()} on &quot;{questionText(shot.q)}&quot; Settled at midnight.
      </T>
    );
  }
  if (!shotOpen(state, now)) return null;
  const q = shotQuestion(state, now);
  return (
    <View style={styles.box}>
      <Text style={styles.head}>🎯 CALL YOUR SHOT · {questionText(q).toUpperCase()}</Text>
      <Row gap={6} style={{ flexWrap: 'wrap' }}>
        {CALLS.map((c) => (
          <Chip key={c.id} label={`${c.label} ${Math.round(c.p * 100)}%`} color={C.cyan} onPress={() => actions.callShot(c.id)} />
        ))}
      </Row>
      <T dim small>
        One call, until noon. Scored each month for coins, and honest calls pay best. A rough day doesn&apos;t count.
      </T>
    </View>
  );
}

/** Records: this month's calibration so far, last month's title, and how each kind of call has gone. */
export function CallsCard() {
  const { state } = useStore();
  const today = useToday();
  const date = noonOf(today);
  const month = monthOf(date);
  const last = monthOf(new Date(date.getFullYear(), date.getMonth() - 1, 15));
  const now = calibration(state, month);
  const before = calibration(state, last);
  if (!scoredShots(state).length) return null;
  const lastName = new Date(`${last}-15T12:00`).toLocaleDateString('en-GB', { month: 'long' });
  return (
    <Card accent={C.cyan}>
      <H right={<T dim small mono>{now.title ?? (now.n ? `${Math.max(0, MIN_CALLS - now.n)} more for a title` : '')}</T>}>🎯 Call your shot</H>
      {now.n ? (
        <>
          <Row style={{ justifyContent: 'space-between' }}>
            <T>This month</T>
            <Text style={styles.value}>Brier {(now.brier ?? 0).toFixed(2)}</Text>
          </Row>
          <T dim small>
            {now.n} call{now.n === 1 ? '' : 's'} scored. You gave them {pct(now.meanP)} on average, and {pct(now.hitRate)} came true.
          </T>
        </>
      ) : (
        <T dim small>
          No calls scored this month yet.
        </T>
      )}
      {before.n ? (
        <T dim small>
          {lastName}: {before.title ?? 'too few calls for a title'} · Brier {(before.brier ?? 0).toFixed(2)} · {before.coins} 🪙
        </T>
      ) : null}
      {CALLS.map((c) => {
        const h = callHistory(state, c.id, dayKey(addDays(date, 1)));
        return h.n ? (
          <Row key={c.id} style={{ justifyContent: 'space-between' }}>
            <T small>
              {c.label} ({Math.round(c.p * 100)}%)
            </T>
            <T dim small mono>
              {h.pct}% of {h.n}
            </T>
          </Row>
        ) : null;
      })}
      <T dim small>
        Brier score: 0 is perfect, 0.25 is a coin flip every time. Coins come at month start, never XP: the call you really believe pays best.
      </T>
    </Card>
  );
}

/** The report card: the week's calls, and the month's title so far. */
export function CallsLine({ monday }: { monday: Date }) {
  const { state } = useStore();
  const from = dayKey(monday);
  const to = dayKey(addDays(monday, 6));
  const week = scoredShots(state).filter((x) => x.key >= from && x.key <= to);
  if (!week.length) return null;
  const hits = week.filter((x) => x.shot.result === 'hit').length;
  const title = calibration(state, monthOf(addDays(monday, 6))).title;
  return (
    <Card>
      <H>🎯 Calls</H>
      <T small>
        {hits} of {week.length} call{week.length === 1 ? '' : 's'} came true this week.{title ? ` This month so far: ${title}.` : ''}
      </T>
    </Card>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: C.card2, borderRadius: 12, padding: 10, gap: 8 },
  head: { color: C.cyan, fontFamily: MONO, fontSize: 11, fontWeight: '800' },
  value: { color: C.text, fontFamily: MONO, fontWeight: '800', fontSize: 15 },
});
