import { useState } from 'react';
import { Text } from 'react-native';

import { Btn, Card, H, Row, Stepper, T } from '@/components/ui';
import { C } from '@/constants/theme';
import { dayKey, WEEKDAYS_LONG } from '@/lib/dates';
import { PAUSE_DAYS_PER_MONTH, pausedDaysInMonth, pauseOn } from '@/lib/pause';
import { useStore } from '@/lib/store';
import type { Pause } from '@/lib/types';

const untilText = (p: Pause) => (p.to === dayKey() ? 'tonight' : WEEKDAYS_LONG[new Date(`${p.to}T12:00`).getDay()]);
const LOOK = { sick: { emoji: '🤒', label: 'Sick mode' }, away: { emoji: '🏖️', label: 'Away mode' } } as const;

/** HQ: shown only while a sick/away pause covers today. */
export function PauseBanner() {
  const { state, actions } = useStore();
  const p = pauseOn(state);
  if (!p) return null;
  return (
    <Card accent={C.cyan}>
      <Row>
        <Text style={{ fontSize: 26 }}>{LOOK[p.kind].emoji}</Text>
        <T style={{ flex: 1, fontWeight: '700' }}>
          {LOOK[p.kind].label} until {untilText(p)}
        </T>
      </Row>
      <T dim small>
        One quest a day, no gym or water nagging. The boss, your pace, my respect meter and league demotion all skip these days.
      </T>
      <Btn label="I'm back" icon="check" kind="ghost" small onPress={actions.endPause} />
    </Card>
  );
}

/** Settings: start or end a sick/away pause. */
export function PauseCard() {
  const { state, actions } = useStore();
  const [days, setDays] = useState(3);
  const p = pauseOn(state);
  const used = pausedDaysInMonth(state);
  return (
    <Card>
      <H>Sick or away</H>
      <T dim small>
        Paused days ask for one quest, skip the gym and water nagging, and don&apos;t count against the boss, your pace, my respect or league
        demotion. Up to {PAUSE_DAYS_PER_MONTH} days a month: {used} used this month.
      </T>
      {p ? (
        <Row>
          <T style={{ flex: 1 }}>
            {LOOK[p.kind].emoji} {LOOK[p.kind].label} until {untilText(p)}
          </T>
          <Btn label="End it" kind="ghost" small onPress={actions.endPause} />
        </Row>
      ) : null}
      <Row>
        <T style={{ flex: 1 }}>Days, from today</T>
        <Stepper value={days} step={1} min={1} max={PAUSE_DAYS_PER_MONTH} format={(v) => `${v} day${v === 1 ? '' : 's'}`} onChange={setDays} />
      </Row>
      <Row>
        <Btn label="I'm sick" icon="healing" kind="ghost" small onPress={() => actions.startPause('sick', days)} style={{ flex: 1 }} />
        <Btn label="I'm away" icon="flight" kind="ghost" small onPress={() => actions.startPause('away', days)} style={{ flex: 1 }} />
      </Row>
    </Card>
  );
}
