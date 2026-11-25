// step 10: Spindelhoroskopet on HQ, Mondays only (lib/horoscope.ts). Every prophecy is a fact about the week ahead:
// the calendar, the forecast, the Swedish calendar and the boss. Closed with ×, it stays closed for the week.
import { useMemo } from 'react';
import { Pressable, View } from 'react-native';

import { Card, H, Icon, Row, T } from '@/components/ui';
import { useNameDays } from '@/components/sweden-card';
import { useToday } from '@/components/use-today';
import { C } from '@/constants/theme';
import { ownName } from '@/lib/birthday';
import { horoscopeDue, horoscopeFor, horoscopeKey, type Reading } from '@/lib/horoscope';
import { nameDayOf } from '@/lib/name-days';
import { useStore } from '@/lib/store';

const MARK: Partial<Record<Reading['line'], string>> = {
  horoscopeIntro: '🔮',
  horoscopeBad: '🌩️',
  horoscopeGood: '✨',
  horoscopeBoss: '⚔️',
  horoscopePeople: '💌',
  horoscopeQuiet: '🌙',
};

export function HoroscopeCard() {
  const { state, actions, quip, cal, weather } = useStore();
  const today = useToday();
  const names = useNameDays(Number(today.slice(0, 4)));
  const due = horoscopeDue(state, today);
  const name = ownName(state);
  const ownNameDay = names && name && state.settings.sweden?.nameDays !== false ? nameDayOf(names, name) : null;
  const h = due ? horoscopeFor(state, { today, events: cal.events, weather: weather.data, ownNameDay }) : null;
  // The lines are picked once per set of facts (and again when the tone changes), not on every render.
  const sig = h ? JSON.stringify(h.readings) : '';
  const texts = useMemo(() => (sig ? (JSON.parse(sig) as Reading[]).map((r) => ({ mark: MARK[r.line] ?? '✨', text: quip(r.line, r.vars) })) : []), [quip, sig]);
  if (!h) return null;
  return (
    <Card accent={C.purple}>
      <H
        right={
          <Pressable onPress={() => actions.dismissBanner(horoscopeKey(h.week))} hitSlop={10} accessibilityRole="button" accessibilityLabel="Hide the horoscope for this week">
            <Icon name="close" size={18} color={C.faint} />
          </Pressable>
        }>
        {h.sign?.emoji ?? '🕷️'} Spindelhoroskopet
      </H>
      <View style={{ gap: 8 }}>
        {texts.map((t, i) => (
          <Row key={i} style={{ alignItems: 'flex-start' }}>
            <T>{t.mark}</T>
            <T style={{ flex: 1 }} dim={i === 0}>
              {t.text}
            </T>
          </Row>
        ))}
      </View>
      <T dim small>
        Read from your calendar, the forecast and the almanac. The stars only take the credit.
      </T>
    </Card>
  );
}
