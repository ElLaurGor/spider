import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Btn, Card, Chip, Field, H, Icon, Row, Stepper, T } from '@/components/ui';
import { C } from '@/constants/theme';
import { dayKey } from '@/lib/dates';
import { dayOf } from '@/lib/selectors';
import { useStore } from '@/lib/store';
import type { Tracker } from '@/lib/types';

const IDEAS: Omit<Tracker, 'id' | 'createdAt'>[] = [
  { name: 'Headache', emoji: '🤕', kind: 'scale' },
  { name: 'Stress', emoji: '😣', kind: 'scale' },
  { name: 'Pain', emoji: '🩹', kind: 'scale' },
  { name: 'Alcohol', emoji: '🍷', kind: 'number', unit: 'drinks' },
  { name: 'Screen time', emoji: '📱', kind: 'number', unit: 'h' },
  { name: 'Skincare', emoji: '🧴', kind: 'check' },
  { name: 'Meditation', emoji: '🧘', kind: 'check' },
  { name: 'Sugar craving', emoji: '🍬', kind: 'scale' },
];
const EMOJIS = ['📌', '🤕', '😣', '🩹', '🍷', '📱', '🧴', '🧘', '🍬', '💊', '🌿', '🎧'];
const KINDS: { kind: Tracker['kind']; label: string }[] = [
  { kind: 'scale', label: '1–5 scale' },
  { kind: 'number', label: 'Number' },
  { kind: 'check', label: 'Yes / no' },
];

/** Custom trackers: log anything; Insights checks it against sleep, mood and training. */
export function TrackersCard({ day = dayKey() }: { day?: string }) {
  const { state, actions } = useStore();
  const [managing, setManaging] = useState(false);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [kind, setKind] = useState<Tracker['kind']>('scale');
  const [unit, setUnit] = useState('');
  const values = dayOf(state, day).tracks ?? {};

  const add = () => {
    if (!name.trim()) return;
    actions.addTracker({ name: name.trim(), emoji, kind, unit: kind === 'number' ? unit.trim() || undefined : undefined });
    setName('');
    setUnit('');
  };

  return (
    <Card>
      <H
        right={
          <Pressable onPress={() => setManaging(!managing)} hitSlop={8}>
            <Text style={styles.link}>{managing ? 'Done' : 'Manage'}</Text>
          </Pressable>
        }>
        Trackers
      </H>
      {state.trackers.length === 0 && !managing ? (
        <View style={{ gap: 8 }}>
          <T dim small>
            Track anything. Insights will look for links with your sleep, mood and training. Tap one to start:
          </T>
          <Row gap={6} style={{ flexWrap: 'wrap' }}>
            {IDEAS.map((i) => (
              <Chip key={i.name} label={`${i.emoji} ${i.name}`} onPress={() => actions.addTracker(i)} />
            ))}
          </Row>
        </View>
      ) : null}

      {!managing &&
        state.trackers.map((t) => {
          const v = values[t.id];
          return (
            <View key={t.id} style={{ gap: 6 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <T>
                  {t.emoji} {t.name}
                </T>
                {v != null ? (
                  <Pressable onPress={() => actions.setTrack(t.id, null, day)} hitSlop={8}>
                    <T dim small>
                      clear
                    </T>
                  </Pressable>
                ) : null}
              </Row>
              {t.kind === 'scale' ? (
                <Row gap={6}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Chip key={n} label={String(n)} active={v === n} color={C.purple} onPress={() => actions.setTrack(t.id, n, day)} />
                  ))}
                </Row>
              ) : t.kind === 'check' ? (
                <Row gap={6}>
                  <Chip label="Yes" active={v === 1} color={C.green} onPress={() => actions.setTrack(t.id, 1, day)} />
                  <Chip label="No" active={v === 0} color={C.card2} onPress={() => actions.setTrack(t.id, 0, day)} />
                </Row>
              ) : (
                <Stepper value={v ?? 0} step={t.unit === 'h' ? 0.5 : 1} min={0} max={999} onChange={(x) => actions.setTrack(t.id, x, day)} format={(x) => `${x}${t.unit ? ` ${t.unit}` : ''}`} />
              )}
            </View>
          );
        })}

      {managing ? (
        <View style={{ gap: 10 }}>
          {state.trackers.map((t) => (
            <Row key={t.id}>
              <T style={{ flex: 1 }}>
                {t.emoji} {t.name}
              </T>
              <T dim small>
                {KINDS.find((k) => k.kind === t.kind)?.label}
              </T>
              <Pressable onPress={() => actions.deleteTracker(t.id)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Delete ${t.name}`}>
                <Icon name="close" size={18} color={C.faint} />
              </Pressable>
            </Row>
          ))}
          <View style={styles.form}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {EMOJIS.map((e) => (
                <Pressable key={e} onPress={() => setEmoji(e)} style={[styles.emoji, emoji === e && { borderColor: C.purple, backgroundColor: '#24133F' }]}>
                  <Text style={{ fontSize: 20 }}>{e}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Field value={name} onChangeText={setName} placeholder="What do you want to track?" />
            <Row gap={6}>
              {KINDS.map((k) => (
                <Chip key={k.kind} label={k.label} active={kind === k.kind} color={C.purple} onPress={() => setKind(k.kind)} />
              ))}
            </Row>
            {kind === 'number' ? <Field value={unit} onChangeText={setUnit} placeholder="Unit, e.g. drinks, h, mg" /> : null}
            <Btn label="Add tracker" icon="add" onPress={add} disabled={!name.trim()} />
          </View>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  link: { color: C.red, fontWeight: '700', fontSize: 13 },
  form: { gap: 10, backgroundColor: C.card2, borderRadius: 12, padding: 12 },
  emoji: { width: 40, height: 40, borderRadius: 10, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
});
