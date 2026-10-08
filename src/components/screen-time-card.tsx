import { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { Bar, Btn, Card, H, Icon, Row, SpiderSays, T } from '@/components/ui';
import { C, MONO } from '@/constants/theme';
import { fmtDuration } from '@/lib/dates';
import { openUsageSettings } from '@/lib/screentime';
import { dayOf } from '@/lib/selectors';
import { useStore } from '@/lib/store';

const MIN = 60_000;

/** Today's phone time and top apps (needs APK 1.3.0 + Usage access). */
export function ScreenTimeCard() {
  const { state, screen } = useStore();
  const d = dayOf(state).screen;
  const limit = state.settings.phoneLimitMin;
  const doomTop = d?.top.find((x) => x.doom);
  const key = !d ? null : doomTop && doomTop.min >= 60 ? 'screenDoom' : d.totalMin > limit ? 'screenHeavy' : 'screenChill';
  const app = key === 'screenDoom' && doomTop ? doomTop.label : '';
  const time = fmtDuration((key === 'screenDoom' && doomTop ? doomTop.min : (d?.totalMin ?? 0)) * MIN);

  if (screen.status === 'unsupported') return null;

  if (screen.status === 'needs-permission') {
    return (
      <Card accent={C.blue}>
        <H>📱 Phone screen time</H>
        <T dim small>
          Let S.P.I.D.E.R. see which apps you use and for how long. Phone games then count toward your gaming budget automatically, and Web Focus
          can catch you cheating. Only app names and minutes are read, and nothing leaves your phone.
        </T>
        <Btn label="Allow usage access" icon="phone_android" kind="blue" onPress={openUsageSettings} />
        <T dim small>
          Find S.P.I.D.E.R in the list, turn it on, then come back.
        </T>
      </Card>
    );
  }

  const over = (d?.totalMin ?? 0) > limit;
  return (
    <Card accent={over ? C.red : C.blue}>
      <H
        right={
          <Pressable onPress={screen.refresh} hitSlop={8}>
            <Icon name="refresh" size={20} color={C.dim} />
          </Pressable>
        }>
        📱 Phone today
      </H>
      <Text style={[styles.big, over && { color: C.red }]}>{fmtDuration((d?.totalMin ?? 0) * MIN)}</Text>
      <Bar pct={(d?.totalMin ?? 0) / limit} color={over ? C.red : C.blue} height={8} />
      <T dim small mono>
        limit {fmtDuration(limit * MIN)} · games {fmtDuration((d?.gamesMin ?? 0) * MIN)} · social {fmtDuration((d?.doomMin ?? 0) * MIN)}
      </T>
      {(d?.top ?? []).map((a) => (
        <Row key={a.label}>
          <Text style={{ fontSize: 16, width: 22 }}>{a.game ? '🎮' : a.doom ? '💀' : '📱'}</Text>
          <T style={{ flex: 1 }}>{a.label}</T>
          <T small dim mono>
            {fmtDuration(a.min * MIN)}
          </T>
        </Row>
      ))}
      {key ? <ScreenRoast lineKey={key} app={app} time={time} /> : null}
      <T dim small>
        {state.settings.phoneGamesCount ? '🎮 Phone games count toward your gaming budget. ' : ''}💀 Social apps over 1 h/day heal the weekly boss.
      </T>
    </Card>
  );
}

function ScreenRoast({ lineKey, app, time }: { lineKey: 'screenDoom' | 'screenHeavy' | 'screenChill'; app: string; time: string }) {
  const { quip } = useStore();
  const text = useMemo(() => quip(lineKey, { app, time }), [quip, lineKey, app, time]);
  return <SpiderSays text={text} />;
}

const styles = StyleSheet.create({
  big: { color: C.text, fontSize: 32, fontWeight: '900', fontFamily: MONO },
});
