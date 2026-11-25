import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Btn, Card, H, Icon, Row, T, useNow } from '@/components/ui';
import { C } from '@/constants/theme';
import { eveningParts } from '@/lib/evening';
import { hqVisible } from '@/lib/hq-layout';
import { eveningKey } from '@/lib/memory';
import { dayOf } from '@/lib/selectors';
import { useStore } from '@/lib/store';
import { worriesDue } from '@/lib/worry';

/**
 * step 10 ux, HQ card `evening`: the wind-down checklist, "Debrief →" and "Shutdown complete" in one card instead
 * of three in a row (evening.ts says when each part shows). After the shutdown it carries the quiet line until
 * morning. While parked worries are back and the worry card is on HQ, that card's own Shutdown button (which
 * sends them to tomorrow) is the one, so there's never two.
 */
export function EveningCard() {
  const { state, actions, quip } = useStore();
  const now = useNow(60_000);
  const parts = eveningParts(state, now);
  const quiet = parts.shutdown === 'quiet';
  const quietLine = useMemo(() => (quiet ? quip('shutdownQuiet') : ''), [quip, quiet]);
  const waiting = worriesDue(state, now).length > 0;
  const worryCardHasIt = waiting && hqVisible(state.settings.hq).includes('worry');
  const shutdown = parts.shutdown === 'open' && !worryCardHasIt;
  if (!parts.windDown && !parts.debrief && !quiet && !shutdown) return null;
  const ticked = dayOf(state, eveningKey(now)).windDown ?? [];

  return (
    <Card accent={C.purple}>
      <H
        right={
          parts.windDown ? (
            <Text style={styles.link} onPress={() => router.push('/breathe')}>
              breathe →
            </Text>
          ) : undefined
        }>
        {quiet ? '🌙 Evening · shut down' : '🌙 Evening'}
      </H>
      {parts.windDown
        ? state.windDownItems.map((item) => {
            const on = ticked.includes(item);
            return (
              <Pressable key={item} onPress={() => actions.toggleWindDown(item)} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
                <Row>
                  <Icon name={on ? 'check_circle' : 'radio_button_unchecked'} size={22} color={on ? C.green : C.dim} />
                  <T style={[{ flex: 1 }, on && { color: C.dim }]}>{item}</T>
                </Row>
              </Pressable>
            );
          })
        : null}
      {parts.debrief ? (
        <Pressable
          onPress={() => router.push('/debrief')}
          style={({ pressed }) => [styles.debrief, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityLabel="Open the evening debrief">
          <Icon name="edit_note" size={22} color={C.purple} />
          <View style={{ flex: 1 }}>
            <T>Debrief →</T>
            <T dim small>
              30 seconds: your mood, loose ends, tomorrow&apos;s top 3 and the verdict on today.
            </T>
          </View>
        </Pressable>
      ) : null}
      {quiet ? (
        <T dim small>
          {quietLine}
        </T>
      ) : shutdown ? (
        <>
          <Btn label="Shutdown complete" icon="bedtime" kind={waiting ? 'blue' : 'ghost'} small onPress={() => actions.shutDown()} />
          <T dim small>
            {waiting
              ? "Parked worries still waiting go to tomorrow's slot. Tasks and calendar go quiet until morning."
              : 'Done for the day? Tasks and calendar go quiet until morning.'}
          </T>
        </>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  link: { color: C.red, fontWeight: '700', fontSize: 13 },
  debrief: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card2, borderRadius: 12, padding: 10 },
});
