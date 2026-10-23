import { View } from 'react-native';

import { Chip, Field, Row, Stepper, T } from '@/components/ui';
import { C } from '@/constants/theme';
import { pad } from '@/lib/dates';
import { CUE_EVENTS, ON_CUE_RETIRE } from '@/lib/if-then';
import type { Cue, CueEvent, IfThen } from '@/lib/types';

type Kind = 'none' | CueEvent | 'time' | 'calendar' | 'rain';

const kindOf = (p: IfThen | null): Kind => (!p ? 'none' : p.cue.kind === 'event' ? p.cue.event : p.cue.kind);

/**
 * "When ___, I will ___" for a habit or a gym day (if-then.ts). The cue is something that happens in the app,
 * a clock time or a meeting ending; a gym day can also have a plan B for rain at gym time.
 */
export function IfThenEditor({ value, onChange, gym, placeholder }: { value: IfThen | null; onChange: (p: IfThen | null) => void; gym?: boolean; placeholder: string }) {
  const kind = kindOf(value);
  const then = value?.then ?? '';
  const set = (cue: Cue | null, text = then) => onChange(cue ? { cue, then: text, onCue: value?.onCue } : null);
  const pick = (k: Kind) => {
    if (k === 'none') return set(null);
    if (k === 'time') return set({ kind: 'time', hour: value?.cue.kind === 'time' ? value.cue.hour : 8, minute: value?.cue.kind === 'time' ? value.cue.minute : 0 });
    if (k === 'calendar') return set({ kind: 'calendar', match: value?.cue.kind === 'calendar' ? value.cue.match : '' });
    if (k === 'rain') return set({ kind: 'rain' }, then || '20-min home circuit');
    set({ kind: 'event', event: k });
  };
  const choices: { k: Kind; label: string }[] = [
    { k: 'none', label: 'No plan' },
    ...(gym ? [{ k: 'rain' as const, label: '🌧️ Rain at gym time' }] : CUE_EVENTS.map((e) => ({ k: e.event, label: e.label }))),
    { k: 'time', label: '⏰ At a time' },
    { k: 'calendar', label: '📅 When a meeting ends' },
  ];

  return (
    <View style={{ gap: 8 }}>
      <T dim small>
        {gym ? 'If-then plan for this day (optional)' : 'When ___, I will ___ (optional)'}
      </T>
      <Row gap={6} style={{ flexWrap: 'wrap' }}>
        {choices.map((c) => (
          <Chip key={c.k} label={c.label} active={kind === c.k} color={C.green} onPress={() => pick(c.k)} />
        ))}
      </Row>
      {value?.cue.kind === 'time' ? (
        <Row style={{ justifyContent: 'space-between' }}>
          <T small>At</T>
          <Row gap={6}>
            <Stepper value={value.cue.hour} min={0} max={23} onChange={(hour) => set({ kind: 'time', hour, minute: value.cue.kind === 'time' ? value.cue.minute : 0 })} format={(v) => pad(v)} />
            <Stepper value={value.cue.minute} min={0} max={45} step={15} onChange={(minute) => set({ kind: 'time', hour: value.cue.kind === 'time' ? value.cue.hour : 8, minute })} format={(v) => pad(v)} />
          </Row>
        </Row>
      ) : null}
      {value?.cue.kind === 'calendar' ? (
        <Field value={value.cue.match} onChangeText={(match) => set({ kind: 'calendar', match })} placeholder="Meeting title (empty = my last meeting of the day)" />
      ) : null}
      {value ? (
        <>
          <Field value={then} onChangeText={(text) => onChange({ ...value, then: text })} placeholder={value.cue.kind === 'rain' ? 'Plan B, e.g. 20-min home circuit' : placeholder} />
          {!gym && (value.onCue ?? 0) > 0 ? (
            <T dim small>
              {value.onCue} of {ON_CUE_RETIRE} on cue{(value.onCue ?? 0) >= ON_CUE_RETIRE ? ': the clock reminder has retired.' : '. At ' + ON_CUE_RETIRE + ' the clock reminder retires.'}
            </T>
          ) : null}
        </>
      ) : null}
    </View>
  );
}
