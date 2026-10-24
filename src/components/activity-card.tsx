import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { EntryEditor } from '@/components/entry-editor';
import { Btn, Card, Chip, H, Row, Stepper, T } from '@/components/ui';
import { C } from '@/constants/theme';
import { ACTIVITIES, activityInfo } from '@/lib/body';
import { fmtTime } from '@/lib/dates';
import { activitiesOf, activityMinutes, dayOf } from '@/lib/selectors';
import { useStore } from '@/lib/store';
import type { ActivityKind } from '@/lib/types';

const QUICK_MINUTES = [15, 30, 45, 60, 90];

/** Log training by type and time spent (Maskiner / Kondition / Fria vikter). */
export function ActivityCard() {
  const { state, actions } = useStore();
  const [kind, setKind] = useState<ActivityKind>('machines');
  const [minutes, setMinutes] = useState(30);
  const [editing, setEditing] = useState<string | null>(null);

  const today = dayOf(state);
  const list = [...activitiesOf(today)].sort((a, b) => a.at - b.at);
  const total = activityMinutes(today);
  const entry = list.find((a) => a.id === editing);

  return (
    <Card accent={C.red}>
      <H right={total ? <T dim small mono>{total} min today</T> : undefined}>Log training</H>

      <Row gap={8}>
        {ACTIVITIES.map((a) => (
          <Pressable key={a.kind} onPress={() => setKind(a.kind)} style={[styles.kind, kind === a.kind && styles.kindOn]}>
            <Text style={{ fontSize: 26 }}>{a.emoji}</Text>
            <Text style={[styles.kindLabel, kind === a.kind && { color: C.text }]}>{a.label}</Text>
          </Pressable>
        ))}
      </Row>

      <Row gap={6} style={{ flexWrap: 'wrap' }}>
        {QUICK_MINUTES.map((m) => (
          <Chip key={m} label={`${m} min`} active={minutes === m} onPress={() => setMinutes(m)} />
        ))}
      </Row>
      <Row style={{ justifyContent: 'space-between' }}>
        <T>Time spent</T>
        <Stepper value={minutes} step={5} min={5} max={300} onChange={setMinutes} format={(v) => `${v} min`} />
      </Row>
      <Btn label={`Log ${activityInfo(kind).label} · ${minutes} min`} icon="add" onPress={() => actions.addActivity(kind, minutes)} />

      {list.map((a) => {
        const info = activityInfo(a.kind);
        return (
          <Pressable key={a.id} onPress={() => setEditing(a.id)} style={({ pressed }) => pressed && { opacity: 0.7 }}>
            <Row>
              <Text style={{ fontSize: 18 }}>{info.emoji}</Text>
              <T style={{ flex: 1 }}>{info.label}</T>
              <T small dim mono>
                {a.minutes} min · {fmtTime(a.at)}
              </T>
            </Row>
          </Pressable>
        );
      })}
      {list.length > 0 ? (
        <T dim small>
          Tap a session to change its time or length.
        </T>
      ) : null}

      {entry ? (
        <EntryEditor
          key={entry.id}
          title={`Edit ${activityInfo(entry.kind).label}`}
          at={entry.at}
          numbers={[{ key: 'minutes', label: 'Time spent', value: entry.minutes, step: 5, min: 5, max: 300, suffix: 'min' }]}
          onSave={(at, v) => actions.updateActivity(entry.id, { at, minutes: v.numbers.minutes })}
          onDelete={() => actions.removeActivity(entry.id)}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  kind: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.card2,
  },
  kindOn: { borderColor: C.red, backgroundColor: C.redDim },
  kindLabel: { color: C.dim, fontSize: 12, fontWeight: '800' },
});
