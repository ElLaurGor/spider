import { useMemo } from 'react';
import { View } from 'react-native';

import { ParkIt } from '@/components/care-offers';
import { Btn, Card, H, Row, T, useNow } from '@/components/ui';
import { C } from '@/constants/theme';
import { useStore } from '@/lib/store';
import { shutdownOpen, shutdownQuiet, slotText, worriesDue, worriesOf } from '@/lib/worry';

/**
 * step 9 care, HQ card `worry`: park a worry until the worry slot; at the slot each one becomes a task, is let
 * go, or waits for tomorrow; then "Shutdown complete" quiets task and calendar talk until morning (worry.ts).
 * Never a count of worries anywhere.
 */
export function WorryCard() {
  const { state, actions, quip } = useStore();
  const now = useNow(60_000);
  const quiet = shutdownQuiet(state, now);
  const quietLine = useMemo(() => (quiet ? quip('shutdownQuiet') : ''), [quip, quiet]);
  const due = worriesDue(state, now);
  const slot = slotText(state);
  if (quiet) {
    return (
      <Card>
        <H>🌙 Shut down</H>
        <T dim small>
          {quietLine}
        </T>
      </Card>
    );
  }
  if (due.length) {
    return (
      <Card accent={C.cyan}>
        <H>🅿️ Worry slot</H>
        <T dim small>
          What you parked is back. Each one: a task, let go, or tomorrow.
        </T>
        {due.map((w) => (
          <View key={w.id} style={{ gap: 6 }}>
            <T>{w.text}</T>
            <Row gap={6} style={{ flexWrap: 'wrap' }}>
              <Btn label="Make it a task" icon="add_task" kind="ghost" small onPress={() => actions.settleWorry(w.id, 'task')} />
              <Btn label="Let it go" icon="air" kind="ghost" small onPress={() => actions.settleWorry(w.id, 'drop')} />
              <Btn label="Tomorrow" icon="redo" kind="ghost" small onPress={() => actions.settleWorry(w.id, 'tomorrow')} />
            </Row>
          </View>
        ))}
        <Btn label="Shutdown complete" icon="bedtime" kind="blue" small onPress={actions.shutDown} />
        <T dim small>
          Anything left waits for tomorrow&apos;s slot. Tasks and calendar go quiet until morning.
        </T>
      </Card>
    );
  }
  const waiting = worriesOf(state).length > 0;
  return (
    <Card>
      <H>🅿️ Worry parking</H>
      <ParkIt hint={shutdownOpen(state, now) ? 'Something still on your mind? Park it for tomorrow.' : waiting ? `Parked worries wait for ${slot}. Add one more?` : `Something on your mind? Park it until ${slot}.`} />
      {shutdownOpen(state, now) ? (
        <>
          <Btn label="Shutdown complete" icon="bedtime" kind="ghost" small onPress={actions.shutDown} />
          <T dim small>
            Done for the day? Tasks and calendar go quiet until morning.
          </T>
        </>
      ) : null}
    </Card>
  );
}
