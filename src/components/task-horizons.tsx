// Task horizons on Plan (step 9 admin, lib/horizons.ts): "Not today" until a day, Someday for maybes, "Waiting on"
// until a chase day. Hidden tasks sit in their own folded lists, out of the open count, until they come back.
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Btn, Chip, Field, Icon, Row, T } from '@/components/ui';
import { C } from '@/constants/theme';
import { horizonDays, onHorizon, shortDay, type HorizonKind } from '@/lib/horizons';
import { useStore } from '@/lib/store';
import type { Task } from '@/lib/types';

/** Where a task goes for now: not today (until a day), Someday, or waiting on someone until a chase day. */
export function HorizonPicker({ task, today, onClose }: { task: Task; today: string; onClose: () => void }) {
  const { actions } = useStore();
  const days = horizonDays(today);
  const set = (kind: HorizonKind, until?: string) => {
    actions.setHorizon(task.id, { kind, until });
    onClose();
  };
  return (
    <View style={styles.sheet}>
      <Row>
        <T small style={{ flex: 1 }}>
          &quot;{task.title}&quot;: when?
        </T>
        <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
          <Icon name="close" size={18} color={C.faint} />
        </Pressable>
      </Row>
      <T dim small>
        Not today. Back on…
      </T>
      <Row gap={6} style={{ flexWrap: 'wrap' }}>
        {days.slice(0, 4).map((d) => (
          <Chip key={d.key} label={d.label} color={C.cyan} onPress={() => set('later', d.key)} />
        ))}
      </Row>
      <T dim small>
        Waiting on someone? Chase it…
      </T>
      <Row gap={6} style={{ flexWrap: 'wrap' }}>
        {days.slice(1).map((d) => (
          <Chip key={d.key} label={d.label} color={C.cyan} onPress={() => set('waiting', d.key)} />
        ))}
      </Row>
      <Btn small kind="ghost" icon="bedtime" label="Someday (out of the count)" onPress={() => set('someday')} />
    </View>
  );
}

function Section({ kind, title, today }: { kind: HorizonKind; title: string; today: string }) {
  const { state, actions } = useStore();
  const [open, setOpen] = useState(false);
  const list = onHorizon(state, kind, today);
  if (!list.length) return null;
  return (
    <View style={{ gap: 6 }}>
      <Pressable onPress={() => setOpen(!open)} hitSlop={6} accessibilityRole="button" accessibilityState={{ expanded: open }}>
        <T dim small>
          {open ? '▾' : '▸'} {title} ({list.length})
        </T>
      </Pressable>
      {open
        ? list.map((t) => (
            <Row key={t.id}>
              <T small style={{ flex: 1 }}>
                {t.title}
              </T>
              {t.horizon?.until ? (
                <T dim small mono>
                  {kind === 'waiting' ? 'chase ' : ''}
                  {shortDay(t.horizon.until)}
                </T>
              ) : null}
              <Pressable onPress={() => actions.setHorizon(t.id, null)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`${t.title}: back on the list now`}>
                <Icon name="undo" size={18} color={C.cyan} />
              </Pressable>
              <Pressable onPress={() => actions.deleteTask(t.id)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Delete ${t.title}`}>
                <Icon name="close" size={18} color={C.faint} />
              </Pressable>
            </Row>
          ))
        : null}
    </View>
  );
}

/** Plan, under the open tasks: the folded lists, and a way to add something you're waiting on. */
export function HorizonLists({ today }: { today: string }) {
  const { actions } = useStore();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const days = horizonDays(today).slice(1);
  const [picked, setUntil] = useState(days[2]?.key ?? days[0].key);
  const until = picked > today ? picked : (days[2]?.key ?? days[0].key); // Plan stays mounted for days
  const add = () => {
    actions.addWaiting(title, until);
    setTitle('');
    setAdding(false);
  };
  return (
    <View style={{ gap: 8 }}>
      <Section kind="later" title="Not today" today={today} />
      <Section kind="waiting" title="Waiting on" today={today} />
      <Section kind="someday" title="Someday" today={today} />
      {adding ? (
        <View style={styles.sheet}>
          <Field value={title} onChangeText={setTitle} placeholder="Waiting on… e.g. Försäkringskassan reply" maxLength={80} />
          <T dim small>
            Chase it…
          </T>
          <Row gap={6} style={{ flexWrap: 'wrap' }}>
            {days.map((d) => (
              <Chip key={d.key} label={d.label} active={until === d.key} color={C.cyan} onPress={() => setUntil(d.key)} />
            ))}
          </Row>
          <Row gap={8}>
            <Btn small label="Hold it" icon="hourglass_empty" onPress={add} disabled={!title.trim()} style={{ flex: 1 }} />
            <Btn small kind="ghost" label="Cancel" onPress={() => setAdding(false)} />
          </Row>
          <T dim small>
            It stays out of the open count, then turns back into a task on its chase day.
          </T>
        </View>
      ) : (
        <Pressable onPress={() => setAdding(true)} hitSlop={6} accessibilityRole="button">
          <T dim small>
            ⏳ + Waiting on something
          </T>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { gap: 8, backgroundColor: C.card2, borderRadius: 12, padding: 10 },
});
