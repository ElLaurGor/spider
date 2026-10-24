import { useState } from 'react';
import { Share, View } from 'react-native';

import { Btn, Row, T } from '@/components/ui';
import { pad } from '@/lib/dates';
import { checkSteps } from '@/lib/health';
import { ZEPP } from '@/lib/sleep';
import { stepsReport, stepsVerdict, type StepsCheck } from '@/lib/steps';

const clock = (at: number) => {
  const d = new Date(at);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const n = (x: number | null | undefined) => (x == null ? '?' : x.toLocaleString('sv-SE'));

/**
 * Settings: how today's steps are put together (Zepp's records, the phone filling Zepp's delay), what every
 * app has in Health Connect, Health Connect's own totals (the Health Connect app's number), and why they
 * differ. "Share report" sends the whole check, hour by hour, when that still doesn't explain it.
 */
export function StepsCheckPanel({ fill }: { fill: boolean }) {
  const [check, setCheck] = useState<StepsCheck | null | 'busy' | 'failed'>(null);
  const run = () => {
    setCheck('busy');
    checkSteps(new Date(), fill).then(
      (r) => setCheck(r ?? 'failed'),
      () => setCheck('failed'),
    );
  };
  const c = check && typeof check === 'object' ? check : null;
  const zepp = c?.sources.find((x) => x.origin === ZEPP);
  return (
    <View style={{ gap: 6 }}>
      <Row>
        <Btn label={check === 'busy' ? 'Checking…' : 'Check steps'} icon="directions_walk" kind="ghost" onPress={run} disabled={check === 'busy'} style={{ flex: 1 }} />
        {c ? <Btn label="Share report" icon="share" kind="ghost" onPress={() => void Share.share({ message: stepsReport(c) })} style={{ flex: 1 }} /> : null}
      </Row>
      {check === 'failed' ? <T dim small>Health Connect didn&apos;t answer. Try again in a minute.</T> : null}
      {c ? (
        <>
          <T small>
            S.P.I.D.E.R. counts {n(c.steps)}
            {c.plan?.until != null ? ` = Zepp ${n(c.plan.zepp)} (up to ${clock(c.plan.until)})` : c.plan ? ' (nothing from Zepp yet)' : ''}
            {c.plan?.gap != null && c.plan.until != null ? ` + ${n(c.gapSteps)} from the phone since then` : ''}
          </T>
          <T small>Health Connect app (every app merged): {n(c.merged)}</T>
          {c.sources.map((x) => (
            <T key={x.origin} dim small>
              {x.name}: {n(x.steps)} · {x.records} records{x.minutes != null ? ` of ~${x.minutes} min` : ''}
              {x.overlaps ? ` · ${x.overlaps} overlapping` : ''}
              {x.lastEnd ? ` · up to ${clock(x.lastEnd)}` : ''}
              {x.lastWritten ? ` (written ${clock(x.lastWritten)})` : ''}
            </T>
          ))}
          {stepsVerdict(c).map((line) => (
            <T key={line} dim small>
              {line}
            </T>
          ))}
          {zepp ? (
            <T dim small>
              The Zepp app shows something else still? Note its number and the time, tap Share report, and send both. The watch card&apos;s
              number can also be typed in by hand.
            </T>
          ) : null}
          {c.errors.length ? <T dim small>Errors: {c.errors.join(' · ')}</T> : null}
          <T dim small>Checked {clock(c.at)}</T>
        </>
      ) : null}
    </View>
  );
}
