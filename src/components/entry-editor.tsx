import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Btn, Field, Row, Stepper, T } from '@/components/ui';
import { C } from '@/constants/theme';
import { pad } from '@/lib/dates';

export type NumberField = { key: string; label: string; value: number; step: number; min: number; max: number; suffix: string };

type Props = {
  title: string;
  at: number;
  name?: string; // shown as an editable text field when given
  numbers?: NumberField[];
  onSave: (at: number, values: { name?: string; numbers: Record<string, number> }) => void;
  onDelete: () => void;
  onClose: () => void;
};

/** Bottom sheet for fixing a logged entry: time of day, optional name and numbers, delete. */
export function EntryEditor({ title, at, name, numbers = [], onSave, onDelete, onClose }: Props) {
  const start = new Date(at);
  const [hour, setHour] = useState(start.getHours());
  const [minute, setMinute] = useState(start.getMinutes());
  const [text, setText] = useState(name ?? '');
  const [values, setValues] = useState<Record<string, number>>(() => Object.fromEntries(numbers.map((n) => [n.key, n.value])));

  const save = () => {
    const d = new Date(at);
    d.setHours(hour, minute, 0, 0);
    onSave(d.getTime(), { name: name !== undefined ? text.trim() || name : undefined, numbers: values });
    onClose();
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.title}>{title}</Text>
          <T dim small>
            Time
          </T>
          <Row gap={4} style={{ justifyContent: 'center' }}>
            <Stepper value={hour} min={0} max={23} onChange={setHour} format={(v) => pad(v)} />
            <Text style={styles.colon}>:</Text>
            <Stepper value={minute} step={5} min={0} max={59} onChange={setMinute} format={(v) => pad(v)} />
          </Row>
          {name !== undefined ? <Field value={text} onChangeText={setText} placeholder="Name" /> : null}
          {numbers.map((n) => (
            <Row key={n.key} style={{ justifyContent: 'space-between' }}>
              <T>{n.label}</T>
              <Stepper
                value={values[n.key]}
                step={n.step}
                min={n.min}
                max={n.max}
                onChange={(v) => setValues({ ...values, [n.key]: v })}
                format={(v) => `${v} ${n.suffix}`}
              />
            </Row>
          ))}
          <View style={{ gap: 8, marginTop: 4 }}>
            <Btn label="Save" icon="check_circle" onPress={save} />
            <Row>
              <Btn
                label="Delete"
                icon="delete"
                kind="danger"
                onPress={() => {
                  onDelete();
                  onClose();
                }}
                style={{ flex: 1 }}
              />
              <Btn label="Cancel" kind="ghost" onPress={onClose} style={{ flex: 1 }} />
            </Row>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.card, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, gap: 14, borderWidth: 1, borderColor: C.border },
  title: { color: C.text, fontSize: 18, fontWeight: '800' },
  colon: { color: C.text, fontSize: 18, fontWeight: '800' },
});
