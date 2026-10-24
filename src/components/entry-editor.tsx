import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Btn, Field, Row, Stepper, T } from '@/components/ui';
import { C } from '@/constants/theme';
import { pad } from '@/lib/dates';

export type NumberField = { key: string; label: string; value: number; step: number; min: number; max: number; suffix: string };

type Props = {
  title: string;
  at?: number; // shown as an editable time of day when given
  name?: string; // shown as an editable text field when given
  numbers?: NumberField[];
  note?: string;
  onSave: (at: number, values: { name?: string; numbers: Record<string, number> }) => void;
  onDelete?: () => void; // no Delete button without it
  onClose: () => void;
};

/** Bottom sheet for fixing a logged entry: time of day, optional name and numbers, delete. */
export function EntryEditor({ title, at, name, numbers = [], note, onSave, onDelete, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const start = at !== undefined ? new Date(at) : null;
  const [hour, setHour] = useState(start?.getHours() ?? 0);
  const [minute, setMinute] = useState(start?.getMinutes() ?? 0);
  const [text, setText] = useState(name ?? '');
  const [values, setValues] = useState<Record<string, number>>(() => Object.fromEntries(numbers.map((n) => [n.key, n.value])));

  const save = () => {
    const d = start ? new Date(start) : new Date();
    if (start) d.setHours(hour, minute, 0, 0);
    onSave(d.getTime(), { name: name !== undefined ? text.trim() || name : undefined, numbers: values });
    onClose();
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: 20 + insets.bottom }]} onPress={() => {}}>
          <Text style={styles.title}>{title}</Text>
          {at !== undefined ? (
            <>
              <T dim small>
                Time
              </T>
              <Row gap={4} style={{ justifyContent: 'center' }}>
                <Stepper value={hour} min={0} max={23} onChange={setHour} format={(v) => pad(v)} label="hour" />
                <Text style={styles.colon}>:</Text>
                <Stepper value={minute} step={5} min={0} max={59} onChange={setMinute} format={(v) => pad(v)} label="minute" typeable />
              </Row>
            </>
          ) : null}
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
                label={n.label.toLowerCase()}
                typeable
              />
            </Row>
          ))}
          {note ? (
            <T dim small>
              {note}
            </T>
          ) : null}
          <View style={{ gap: 8, marginTop: 4 }}>
            <Btn label="Save" icon="check_circle" onPress={save} />
            <Row>
              {onDelete ? (
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
              ) : null}
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
