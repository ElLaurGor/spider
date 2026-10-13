import { StyleSheet, Text, View } from 'react-native';

import { Card, H, T } from '@/components/ui';
import { C, MONO } from '@/constants/theme';
import { cycleNotes, cycleStats, type PhaseStat } from '@/lib/cycle-stats';
import type { State } from '@/lib/types';

const LABEL: Record<PhaseStat['phase'], string> = { period: 'Period', follicular: 'After', ovulation: 'Mid', luteal: 'Before' };
const fmtSleep = (m: number | null) => (m == null ? '–' : `${Math.floor(m / 60)}:${String(Math.round(m % 60)).padStart(2, '0')}`);
const fmt1 = (v: number | null) => (v == null ? '–' : v.toFixed(1));
const fmtSteps = (v: number | null) => (v == null ? '–' : `${(v / 1000).toFixed(1)}k`);
const fmtPct = (v: number | null) => (v == null ? '–' : `${Math.round(v)}%`);

/** "Your cycle in numbers": what usually changes in each part of the cycle. Kind, never a roast. */
export function CycleNumbers({ state }: { state: State }) {
  const stats = cycleStats(state);
  const notes = cycleNotes(stats).slice(0, 4);

  return (
    <Card>
      <H>Your cycle in numbers</H>
      {!stats ? (
        <T dim small>
          Once two periods are logged, this shows how sleep, energy, mood, steps and training usually shift through your cycle.
        </T>
      ) : (
        <>
          <View style={styles.row}>
            <Text style={[styles.cell, styles.head, styles.first]} />
            {['Sleep', 'Energy', 'Mood', 'Steps', 'Train'].map((h) => (
              <Text key={h} style={[styles.cell, styles.head]}>
                {h}
              </Text>
            ))}
          </View>
          {stats.phases.map((p) => (
            <View key={p.phase} style={styles.row}>
              <Text style={[styles.cell, styles.first, styles.label]}>{LABEL[p.phase]}</Text>
              <Text style={styles.cell}>{fmtSleep(p.sleepMin)}</Text>
              <Text style={styles.cell}>{fmt1(p.energy)}</Text>
              <Text style={styles.cell}>{fmt1(p.mood)}</Text>
              <Text style={styles.cell}>{fmtSteps(p.steps)}</Text>
              <Text style={styles.cell}>{fmtPct(p.trainedPct)}</Text>
            </View>
          ))}
          {notes.length ? (
            <View style={{ gap: 4 }}>
              {notes.map((n) => (
                <T key={n.id} small>
                  • {n.text}
                </T>
              ))}
            </View>
          ) : (
            <T dim small>
              No clear differences yet. Bodies vary, and that is fine.
            </T>
          )}
          <T dim small>
            From {stats.cycles} cycle{stats.cycles === 1 ? '' : 's'} of your own logs. Before = the week before your period, After = the week after, Mid = mid-cycle. Patterns
            to plan around, not rules.
          </T>
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  cell: { flex: 1, color: C.text, fontFamily: MONO, fontSize: 12, textAlign: 'center', paddingVertical: 3 },
  head: { color: C.dim, fontWeight: '700', fontFamily: undefined, fontSize: 11 },
  first: { flex: 1.2, textAlign: 'left' },
  label: { color: '#E86A8A', fontWeight: '700', fontFamily: undefined },
});
