import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Btn, Card, H, Icon, Row, Stepper, T } from '@/components/ui';
import { noonOf, useToday } from '@/components/use-today';
import { C } from '@/constants/theme';
import { addDays, dayKey } from '@/lib/dates';
import { AWAY_AHEAD_DAYS, AWAY_MAX_DAYS, awayOffers, plannedAways, rangeText } from '@/lib/away-ahead';
import { useStore } from '@/lib/store';

const dayText = (key: string) => noonOf(key).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

/**
 * Plan tab (step 8 days): away mode offered for a trip ahead, from a multi-day all-day calendar event or a
 * countdown with an end date (away-ahead.ts). Nothing when there's no trip to offer.
 */
export function AwayOffers() {
  const { state, actions, cal } = useStore();
  const today = useToday();
  const offers = awayOffers(state, cal.events, noonOf(today)).slice(0, 2);
  if (!offers.length) return null;
  return (
    <Card accent={C.cyan}>
      <H>🏖️ Trip ahead</H>
      {offers.map((o) => (
        <View key={o.key} style={{ gap: 6 }}>
          <T>
            {o.title}: away {rangeText(o.from, o.to)}?
          </T>
          <T dim small>
            Those days ask for one quest, with no gym, water or habit nagging. Up to 7 paused days a month.
          </T>
          <Row>
            <Btn label="Plan away" icon="flight" small onPress={() => actions.planAway(o.from, o.to)} style={{ flex: 1 }} />
            <Btn label="No thanks" kind="ghost" small onPress={() => actions.dismissBanner(o.key)} style={{ flex: 1 }} />
          </Row>
        </View>
      ))}
    </Card>
  );
}

/** Settings' pause card (step 8 days): an away period planned ahead, from–to, and the ones already planned. */
export function AwayPlanner() {
  const { state, actions } = useStore();
  const today = useToday();
  const [ahead, setAhead] = useState(7);
  const [days, setDays] = useState(3);
  const from = dayKey(addDays(noonOf(today), ahead));
  const to = dayKey(addDays(noonOf(from), days - 1));
  const planned = plannedAways(state, today);
  return (
    <View style={{ gap: 8 }}>
      <T style={{ fontWeight: '700' }}>Plan a trip ahead</T>
      <Row>
        <T style={{ flex: 1 }}>From {dayText(from)}</T>
        <Stepper value={ahead} min={1} max={AWAY_AHEAD_DAYS} onChange={setAhead} format={(v) => (v === 1 ? 'tomorrow' : `in ${v} d`)} label="days until the trip" />
      </Row>
      <Row>
        <T style={{ flex: 1 }}>Until {dayText(to)}</T>
        <Stepper value={days} min={1} max={AWAY_MAX_DAYS} onChange={setDays} format={(v) => `${v} day${v === 1 ? '' : 's'}`} label="trip length" />
      </Row>
      <Btn label={`Away ${rangeText(from, to)}`} icon="flight" kind="ghost" small onPress={() => actions.planAway(from, to)} />
      {planned.map((p) => (
        <Row key={p.from}>
          <T small style={{ flex: 1 }}>
            🏖️ Away {rangeText(p.from, p.to)}
          </T>
          <Pressable onPress={() => actions.cancelAway(p.from)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Cancel the trip ${rangeText(p.from, p.to)}`}>
            <Icon name="close" size={18} color={C.faint} />
          </Pressable>
        </Row>
      ))}
    </View>
  );
}
