import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Btn, Card, Chip, Field, H, Icon, Row, T, useNow } from '@/components/ui';
import { C } from '@/constants/theme';
import { dayKey } from '@/lib/dates';
import { dayOf } from '@/lib/selectors';
import { useStore } from '@/lib/store';

// Box breathing: 4 s in, 4 s hold, 4 s out, 4 s hold.
const PHASES = ['Breathe in', 'Hold', 'Breathe out', 'Hold'] as const;
const PHASE_MS = 4000;

function Breather({ minutes, onDone }: { minutes: number; onDone: () => void }) {
  const [scale] = useState(() => new Animated.Value(0.55));
  const [phase, setPhase] = useState(0);
  const [left, setLeft] = useState(minutes * 60);
  const done = useRef(false);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });

  useEffect(() => {
    const total = Math.round((minutes * 60_000) / PHASE_MS);
    let step = 0;
    const run = () => {
      const p = step % 4;
      setPhase(p);
      Haptics.selectionAsync().catch(() => {});
      if (p === 0) Animated.timing(scale, { toValue: 1, duration: PHASE_MS, useNativeDriver: true }).start();
      if (p === 2) Animated.timing(scale, { toValue: 0.55, duration: PHASE_MS, useNativeDriver: true }).start();
    };
    run();
    const tick = setInterval(() => {
      step++;
      if (step >= total) {
        clearInterval(tick);
        if (!done.current) {
          done.current = true;
          onDoneRef.current();
        }
        return;
      }
      run();
    }, PHASE_MS);
    const clock = setInterval(() => setLeft((x) => Math.max(0, x - 1)), 1000);
    return () => {
      clearInterval(tick);
      clearInterval(clock);
    };
  }, [minutes, scale]);

  return (
    <View style={{ alignItems: 'center', gap: 18, paddingVertical: 10 }}>
      <View style={styles.stage}>
        <Animated.View style={[styles.circle, { transform: [{ scale }] }]} />
        <Text style={styles.phase}>{PHASES[phase]}</Text>
      </View>
      <T dim>
        {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')} left
      </T>
    </View>
  );
}

export default function BreatheScreen() {
  const { state, actions } = useStore();
  const [minutes, setMinutes] = useState(2);
  const [running, setRunning] = useState(false);
  const [newItem, setNewItem] = useState('');
  const now = useNow(60_000);
  const tonight = dayKey(now - 4 * 3_600_000); // after midnight still counts as tonight
  const done = dayOf(state, tonight).windDown ?? [];

  const finish = () => {
    setRunning(false);
    actions.logBreath();
  };

  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
      <Card accent={C.cyan}>
        <H>Box breathing</H>
        {running ? (
          <>
            <Breather minutes={minutes} onDone={finish} />
            <Btn label="Stop" kind="ghost" onPress={() => setRunning(false)} />
          </>
        ) : (
          <>
            <T dim small>
              4 seconds in, 4 hold, 4 out, 4 hold. Calms your nervous system. Used by everyone from athletes to people who just read their emails.
            </T>
            <Row gap={6}>
              {[1, 2, 3, 5].map((m) => (
                <Chip key={m} label={`${m} min`} active={minutes === m} color={C.cyan} onPress={() => setMinutes(m)} />
              ))}
            </Row>
            <Btn label="Start" icon="play_arrow" kind="blue" onPress={() => setRunning(true)} />
          </>
        )}
      </Card>

      <Card accent={C.purple}>
        <H right={<T dim small>{`${done.length}/${state.windDownItems.length}`}</T>}>Tonight&apos;s wind-down</H>
        {state.windDownItems.map((item) => {
          const on = done.includes(item);
          return (
            <Row key={item}>
              <Pressable onPress={() => actions.toggleWindDown(item)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <Icon name={on ? 'check_circle' : 'radio_button_unchecked'} size={22} color={on ? C.green : C.dim} />
                <T style={[{ flex: 1 }, on && { color: C.dim }]}>{item}</T>
              </Pressable>
              <Pressable onPress={() => actions.setWindDownItems(state.windDownItems.filter((x) => x !== item))} hitSlop={8}>
                <Icon name="close" size={16} color={C.faint} />
              </Pressable>
            </Row>
          );
        })}
        <Row>
          <Field value={newItem} onChangeText={setNewItem} placeholder="Add a step, e.g. 🍵 Herbal tea" style={{ flex: 1 }} />
          <Btn
            icon="add"
            onPress={() => {
              if (newItem.trim()) actions.setWindDownItems([...state.windDownItems, newItem.trim()]);
              setNewItem('');
            }}
            disabled={!newItem.trim()}
          />
        </Row>
        <T dim small>
          Finish them all for +10 XP. Insights will tell you if it improves your sleep.
        </T>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  stage: { width: 240, height: 240, alignItems: 'center', justifyContent: 'center' },
  circle: { position: 'absolute', width: 240, height: 240, borderRadius: 120, backgroundColor: '#3FD0FF33', borderWidth: 3, borderColor: C.cyan },
  phase: { color: C.text, fontSize: 22, fontWeight: '800' },
});
