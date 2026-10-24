import { useState } from 'react';
import { View } from 'react-native';

import { Btn, T } from '@/components/ui';
import { pad } from '@/lib/dates';
import { checkSteps, type StepsCheck } from '@/lib/health';
import { ZEPP } from '@/lib/sleep';

const clock = (at: number) => {
  const d = new Date(at);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const n = (x: number) => x.toLocaleString('sv-SE');

/**
 * Settings: what Health Connect holds for today's steps, per app, and when Zepp's newest steps arrived. When
 * Zepp's own app shows more than its line here, Zepp hasn't handed the rest to Health Connect yet.
 */
export function StepsCheckPanel({ shown }: { shown: number | null }) {
  const [check, setCheck] = useState<StepsCheck | null | 'busy' | 'failed'>(null);
  const run = () => {
    setCheck('busy');
    checkSteps().then(
      (r) => setCheck(r ?? 'failed'),
      () => setCheck('failed'),
    );
  };
  const zepp = check && typeof check === 'object' ? check.sources.find((x) => x.origin === ZEPP) : undefined;
  return (
    <View style={{ gap: 6 }}>
      <Btn label={check === 'busy' ? 'Checking…' : 'Check steps'} icon="directions_walk" kind="ghost" onPress={run} disabled={check === 'busy'} />
      {check === 'failed' ? <T dim small>Health Connect didn&apos;t answer. Try again in a minute.</T> : null}
      {check && typeof check === 'object' ? (
        <>
          {check.sources.length ? (
            check.sources.map((x) => (
              <T key={x.origin} small>
                {x.name}: {x.steps == null ? 'overlapping records' : `${n(x.steps)} steps`} · {x.records} records
                {x.lastEnd ? ` · up to ${clock(x.lastEnd)}` : ''}
                {x.lastWritten ? ` (written ${clock(x.lastWritten)})` : ''}
              </T>
            ))
          ) : (
            <T small>No steps in Health Connect today.</T>
          )}
          {check.merged != null ? <T dim small>Health Connect&apos;s merged total: {n(check.merged)}</T> : null}
          <T dim small>
            S.P.I.D.E.R. counts {check.steps == null ? '?' : n(check.steps)}
            {shown != null && shown !== check.steps ? ` (showing ${n(shown)} until the next read, within a minute)` : ''} · checked {clock(check.at)}
          </T>
          <T dim small>
            {zepp
              ? "If the Zepp app shows more than Zepp's line here, Zepp hasn't sent its newest steps to Health Connect yet. Opening Zepp and letting the watch sync pushes them."
              : 'Nothing from Zepp today. In Zepp: Profile → Add accounts → Health Connect, and allow steps.'}
          </T>
        </>
      ) : null}
    </View>
  );
}
