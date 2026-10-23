import { useEffect, useState } from 'react';
import { Alert, AppState, ScrollView, Text, View } from 'react-native';

import { Big, Btn, Card, Chip, Field, H, Row, SpiderSays, T, useNow } from '@/components/ui';
import { C } from '@/constants/theme';
import { dayKey, fmtClock, fmtTime } from '@/lib/dates';
import { focusBonusMin } from '@/lib/perks';
import { hasUsageAccess, openUsageSettings, screenTimeSupported } from '@/lib/screentime';
import { dayOf } from '@/lib/selectors';
import { useStore } from '@/lib/store';
import { focusXp } from '@/lib/xp';

const DURATIONS = [15, 25, 50, 90];
const SIZE = 250;
const RINGS = 6;
const SPOKES = 8;

/** A spider web drawn with plain views: spokes plus rings that appear as progress grows. */
function Web({ progress, broken }: { progress: number; broken?: boolean }) {
  const rings = Math.ceil(progress * RINGS);
  const color = broken ? C.red : C.dim;
  return (
    <View style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
      {Array.from({ length: SPOKES }, (_, i) => (
        <View
          key={`s${i}`}
          style={{
            position: 'absolute',
            width: 1.5,
            height: SIZE * progress,
            backgroundColor: color,
            opacity: 0.7,
            transform: [{ rotate: `${(180 / SPOKES) * i}deg` }],
          }}
        />
      ))}
      {Array.from({ length: rings }, (_, i) => {
        const d = (SIZE / RINGS) * (i + 1);
        return (
          <View
            key={`r${i}`}
            style={{ position: 'absolute', width: d, height: d, borderRadius: d / 2, borderWidth: 1.5, borderColor: color, opacity: 0.8 }}
          />
        );
      })}
      <Text style={{ fontSize: 34 }}>🕷️</Text>
    </View>
  );
}

export default function FocusScreen() {
  const { state, actions } = useStore();
  const f = state.activeFocus;
  const now = useNow(1000, !!f);
  const [minutes, setMinutes] = useState(25);
  const [label, setLabel] = useState('');
  // Checked again when the app comes back, e.g. from Android's usage-access settings.
  const [strict, setStrict] = useState(() => screenTimeSupported && hasUsageAccess());
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') setStrict(screenTimeSupported && hasUsageAccess());
    });
    return () => sub.remove();
  }, []);
  const today = (dayOf(state, dayKey()).focus ?? []).slice().reverse();

  const giveUp = () =>
    Alert.alert('Give up?', 'The web will be abandoned. No XP, no gaming minutes.', [
      { text: 'Keep going', style: 'cancel' },
      { text: 'Give up', style: 'destructive', onPress: () => actions.finishFocus('gave up') },
    ]);

  if (f) {
    const total = f.minutes * 60_000;
    const left = f.start + total - now;
    return (
      <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, gap: 16, alignItems: 'center', paddingBottom: 48 }}>
        <T dim>{f.label ? `Focusing on: ${f.label}` : 'Focus session'}</T>
        <Web progress={Math.min(1, (now - f.start) / total)} />
        <Big size={48}>{fmtClock(Math.max(0, left))}</Big>
        <T dim small style={{ textAlign: 'center' }}>
          {strict
            ? 'Strict mode: lock your phone or keep S.P.I.D.E.R. open. Opening other apps for more than 30 s snaps the web.'
            : screenTimeSupported
              ? 'Put the phone down. Locking it is fine. Allow usage access and strict mode catches other apps too.'
              : 'Put the phone down. Locking it is fine.'}
        </T>
        {screenTimeSupported && !strict ? <Btn label="Usage access settings" kind="ghost" onPress={openUsageSettings} style={{ alignSelf: 'stretch' }} /> : null}
        <Btn label="Give up" kind="danger" onPress={giveUp} style={{ alignSelf: 'stretch' }} />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
      <SpiderSays text="Pick a length and I'll spin a web while you work. Finish it and you earn XP plus gaming minutes. Wander off and the web snaps." />
      <Card style={{ alignItems: 'center' }}>
        <Web progress={minutes / 90} />
      </Card>
      <Card>
        <H>Length</H>
        <Row gap={6} style={{ flexWrap: 'wrap' }}>
          {DURATIONS.map((m) => (
            <Chip key={m} label={`${m} min`} active={minutes === m} onPress={() => setMinutes(m)} />
          ))}
        </Row>
        <Field value={label} onChangeText={setLabel} placeholder="What are you focusing on? (optional)" />
        <T dim small>
          Reward: +{focusXp(minutes)} XP and +{focusBonusMin(state, minutes)} min gaming.
        </T>
        <Btn label={`Start ${minutes} min`} icon="play_arrow" onPress={() => actions.startFocus(minutes, label)} />
      </Card>
      {today.length > 0 ? (
        <Card>
          <H>Today</H>
          {today.map((x) => (
            <Row key={x.id}>
              <Text style={{ fontSize: 18 }}>{x.snapped ? '💥' : '🕸️'}</Text>
              <T small style={{ flex: 1 }}>
                {x.label ?? 'Focus'} · {x.minutes} min
              </T>
              <T small dim mono>
                {fmtTime(x.start)}
                {x.snapped ? ` · snapped (${x.snapped})` : ''}
              </T>
            </Row>
          ))}
        </Card>
      ) : null}
    </ScrollView>
  );
}

