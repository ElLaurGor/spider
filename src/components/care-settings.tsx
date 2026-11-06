import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Switch, View } from 'react-native';

import { Btn, Card, H, Row, Stepper, T } from '@/components/ui';
import { C } from '@/constants/theme';
import { pad } from '@/lib/dates';
import { joyOf } from '@/lib/joy';
import { useStore } from '@/lib/store';
import type { Settings } from '@/lib/types';
import { worrySlotOf } from '@/lib/worry';

/** step 9 care, Settings: the joy menu, the self-compassion card, the worry slot, the night shift and the meeting reset. */
export function CareSettings() {
  const { state, actions } = useStore();
  const s = state.settings;
  const set = (patch: Partial<Settings>) => actions.updateSettings(patch);
  const slot = worrySlotOf(state);
  const items = joyOf(state).items.length;
  return (
    <Card>
      <H>Care corner</H>
      <Btn label={items ? 'Joy menu' : 'Set up a joy menu'} icon="favorite" kind="ghost" small onPress={() => router.push('/joy')} />
      <T dim small>
        Small things that lift you, offered after a low check-in. No XP, ever.
      </T>
      <Line label="Self-compassion break" hint="the morning after a real slip, one kind card (off unless you turn it on)">
        <Switch value={!!s.selfCompassion} onValueChange={(v) => set({ selfCompassion: v })} trackColor={{ true: C.red, false: C.card2 }} thumbColor={C.text} />
      </Line>
      <Line label="Worry slot" hint="parked worries come back here, then shutdown">
        <Stepper
          value={slot.hour * 60 + slot.minute}
          step={15}
          min={12 * 60}
          max={22 * 60}
          format={(v) => `${pad(Math.floor(v / 60))}:${pad(v % 60)}`}
          onChange={(v) => set({ worrySlot: { hour: Math.floor(v / 60), minute: v % 60 } })}
        />
      </Line>
      <Line label="Worry slot reminder" hint="only on days something is parked">
        <Switch value={!!s.worryPing} onValueChange={(v) => set({ worryPing: v })} trackColor={{ true: C.red, false: C.card2 }} thumbColor={C.text} />
      </Line>
      <Line label="Night shift" hint="opened half an hour after bedtime until 05:00, a dim can't-sleep corner comes first">
        <Switch value={s.nightShift !== false} onValueChange={(v) => set({ nightShift: v })} trackColor={{ true: C.red, false: C.card2 }} thumbColor={C.text} />
      </Line>
      <Line label="Meeting-marathon reset" hint="after 2 h of back-to-back meetings, one ping at the gap; with the move break, one a day at most">
        <Switch value={s.meetingReset !== false} onValueChange={(v) => set({ meetingReset: v })} trackColor={{ true: C.red, false: C.card2 }} thumbColor={C.text} />
      </Line>
    </Card>
  );
}

function Line({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <View style={{ flex: 1 }}>
        <T>{label}</T>
        {hint ? (
          <T dim small>
            {hint}
          </T>
        ) : null}
      </View>
      {children}
    </Row>
  );
}
