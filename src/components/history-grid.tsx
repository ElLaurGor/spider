// Tracker and habit history (step 8, lib/history.ts): the last 8 weeks as a grid with a total per week.
// Rough days are drawn dimmed as rest, never as gaps. Totals only: never a count of days in a row.
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { H, Icon, Row, T } from '@/components/ui';
import { useToday, noonOf } from '@/components/use-today';
import { C, MONO } from '@/constants/theme';
import { habitHistory, trackerHistory, type Cell, type HistoryWeek } from '@/lib/history';
import { useStore } from '@/lib/store';

const HEAD = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** A tracker's or a habit's 8 weeks (by id), in a sheet. Nothing when `id` is null. */
export function HistorySheet({ kind, id, onClose }: { kind: 'habit' | 'tracker'; id: string | null; onClose: () => void }) {
  const { state } = useStore();
  const today = useToday();
  const habit = kind === 'habit' ? state.habits.find((h) => h.id === id) : undefined;
  const tracker = kind === 'tracker' ? state.trackers.find((t) => t.id === id) : undefined;
  const item = habit ?? tracker;
  // Noon today: day-level maths only, and a new day redraws it.
  const now = noonOf(today);
  const weeks: HistoryWeek[] = habit ? habitHistory(state, habit, now) : tracker ? trackerHistory(state, tracker, now) : [];
  return (
    <Modal visible={!!item} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
        <Pressable style={styles.sheet} onPress={() => {}}>
          <H
            right={
              <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
                <Icon name="close" size={20} color={C.dim} />
              </Pressable>
            }>
            {item ? `${item.emoji} ${item.name}` : ''}
          </H>
          <T dim small>
            The last 8 weeks. Dimmed days were rough ones: rest, not a miss.
          </T>
          <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ gap: 6 }}>
            <Row gap={4}>
              <Text style={styles.weekLabel} />
              {HEAD.map((d, i) => (
                <Text key={i} style={[styles.head, styles.cellBox]}>
                  {d}
                </Text>
              ))}
            </Row>
            {weeks.map((w) => (
              <View key={w.week} style={{ gap: 2 }}>
                <Row gap={4}>
                  <Text style={styles.weekLabel}>{new Date(`${w.week}T12:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</Text>
                  {w.cells.map((c) => (
                    <CellView key={c.key} c={c} />
                  ))}
                </Row>
                <Text style={styles.summary}>{w.summary}</Text>
              </View>
            ))}
          </ScrollView>
          <Legend kind={kind} check={tracker?.kind === 'check'} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function CellView({ c }: { c: Cell }) {
  const text = c.value != null && (c.kind === 'value' || c.kind === 'rest') ? (Number.isInteger(c.value) ? String(c.value) : c.value.toFixed(1)) : c.kind === 'mini' ? '½' : c.kind === 'no' ? '–' : '';
  return (
    <View style={[styles.cellBox, styles.cell, CELL[c.kind]]} accessibilityLabel={`${c.key}: ${LABEL[c.kind]}`}>
      <Text style={[styles.cellText, c.kind === 'done' || c.kind === 'yes' || c.kind === 'value' ? { color: C.bg } : null]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

function Legend({ kind, check }: { kind: 'habit' | 'tracker'; check: boolean }) {
  const items: Cell['kind'][] = kind === 'habit' ? ['done', 'mini', 'miss', 'off', 'rest'] : check ? ['yes', 'no', 'empty', 'rest'] : ['value', 'empty', 'rest'];
  return (
    <Row gap={10} style={{ flexWrap: 'wrap' }}>
      {items.map((k) => (
        <Row key={k} gap={4}>
          <View style={[styles.dot, styles.cell, CELL[k]]} />
          <T dim small>
            {LABEL[k]}
          </T>
        </Row>
      ))}
    </Row>
  );
}

const LABEL: Record<Cell['kind'], string> = {
  done: 'done',
  mini: 'mini version',
  miss: 'not done',
  open: 'still today',
  off: 'not due',
  rest: 'rest',
  value: 'logged',
  yes: 'yes',
  no: 'no',
  empty: 'not logged',
  none: '',
};

const CELL: Record<Cell['kind'], object> = {
  done: { backgroundColor: C.green, borderColor: C.green },
  mini: { borderColor: C.green },
  miss: { backgroundColor: C.card2 },
  open: { borderColor: C.dim, borderStyle: 'dashed' },
  off: { borderColor: 'transparent', backgroundColor: 'transparent' },
  rest: { backgroundColor: C.blue, borderColor: C.blue, opacity: 0.3 },
  value: { backgroundColor: C.purple, borderColor: C.purple },
  yes: { backgroundColor: C.green, borderColor: C.green },
  no: { backgroundColor: C.card2 },
  empty: { borderColor: C.border, backgroundColor: 'transparent' },
  none: { borderColor: 'transparent', backgroundColor: 'transparent' },
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 16 },
  sheet: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 16, gap: 10 },
  head: { color: C.dim, fontFamily: MONO, fontSize: 11, textAlign: 'center' },
  weekLabel: { width: 52, color: C.dim, fontFamily: MONO, fontSize: 10 },
  cellBox: { width: 30, height: 26 },
  cell: { borderRadius: 6, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  cellText: { color: C.text, fontFamily: MONO, fontSize: 10, fontWeight: '700' },
  summary: { color: C.dim, fontFamily: MONO, fontSize: 11, paddingLeft: 56 },
  dot: { width: 14, height: 14 },
});
