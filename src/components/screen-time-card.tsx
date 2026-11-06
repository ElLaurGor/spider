import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Bar, Btn, Card, H, Icon, Row, SpiderSays, T } from '@/components/ui';
import { noonOf, useToday } from '@/components/use-today';
import { C, MONO } from '@/constants/theme';
import { fmtDuration } from '@/lib/dates';
import { phoneWeek } from '@/lib/phone-week';
import { DOOM_FREE_MIN } from '@/lib/quests';
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
          <Pressable onPress={screen.refresh} hitSlop={8} accessibilityRole="button" accessibilityLabel="Refresh screen time">
            <Icon name="refresh" size={20} color={C.dim} />
          </Pressable>
        }>
        📱 Phone today
      </H>
      <Text style={[styles.big, over && { color: C.red }]}>{fmtDuration((d?.totalMin ?? 0) * MIN)}</Text>
      <Bar pct={(d?.totalMin ?? 0) / limit} color={over ? C.red : C.blue} height={8} />
      <T dim small mono>
        limit {fmtDuration(limit * MIN)} · games {fmtDuration((d?.gamesMin ?? 0) * MIN)} · social {fmtDuration((d?.doomMin ?? 0) * MIN)}
        {d?.unlocks != null ? ` · ${d.unlocks} unlocks` : ''}
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
      <PhoneWeek />
      <T dim small>
        {state.settings.phoneGamesCount ? '🎮 Phone games count toward your gaming budget. ' : ''}💀 Social apps over {DOOM_FREE_MIN / 60} h/day heal the weekly boss.
      </T>
    </Card>
  );
}

/**
 * step 8 days: the last 7 days as a strip (total, unlocks), tap a day for its top apps, and the week's top apps
 * added up (phone-week.ts). The line roasts the scrolling, never the person; kind days get the mild pool.
 */
function PhoneWeek() {
  const { state } = useStore();
  const today = useToday();
  const [picked, setPicked] = useState<string | null>(null);
  const w = phoneWeek(state, noonOf(today));
  const per = fmtDuration((w.lineKey === 'phoneWeekDoom' && w.doom ? w.doom.perDay : w.avgMin) * MIN);
  if (w.known < 2) return null;
  const max = Math.max(1, ...w.days.map((d) => d.screen?.totalMin ?? 0));
  const day = w.days.find((d) => d.key === picked && d.screen);
  return (
    <View style={{ gap: 8 }}>
      <T dim small>
        This week · {fmtDuration(w.avgMin * MIN)} a day{w.avgUnlocks != null ? ` · ${w.avgUnlocks} unlocks a day` : ''}
      </T>
      <Row gap={4} style={{ alignItems: 'flex-end' }}>
        {w.days.map((d) => {
          const min = d.screen?.totalMin ?? 0;
          const over = min > state.settings.phoneLimitMin;
          return (
            <Pressable
              key={d.key}
              onPress={() => setPicked(picked === d.key ? null : d.key)}
              disabled={!d.screen}
              style={{ flex: 1, alignItems: 'center', gap: 2 }}
              accessibilityRole="button"
              accessibilityLabel={`${d.label}: ${d.screen ? fmtDuration(min * MIN) : 'no data'}`}>
              <Text style={styles.stripNum}>{d.screen ? fmtDuration(min * MIN).replace(' ', '') : '–'}</Text>
              <View style={{ width: '70%', height: d.screen ? Math.max(3, (min / max) * 56) : 3, borderRadius: 4, backgroundColor: !d.screen ? C.card2 : over ? C.red : picked === d.key ? C.cyan : C.blue }} />
              <Text style={[styles.stripDay, picked === d.key && { color: C.text }]}>{d.label}</Text>
              <Text style={styles.stripNum}>{d.screen?.unlocks != null ? `🔓${d.screen.unlocks}` : ' '}</Text>
            </Pressable>
          );
        })}
      </Row>
      {(day ? (day.screen?.top ?? []).slice(0, 3) : w.top).map((a) => (
        <Row key={a.label}>
          <Text style={{ fontSize: 14, width: 22 }}>{a.game ? '🎮' : a.doom ? '💀' : '📱'}</Text>
          <T small style={{ flex: 1 }}>
            {a.label}
          </T>
          <T small dim mono>
            {fmtDuration(a.min * MIN)}
          </T>
        </Row>
      ))}
      <T dim small>
        {day ? `Top apps on ${day.label}. Tap it again for the week.` : 'Top apps this week. Tap a day for its own.'}
      </T>
      {w.lineKey ? <PhoneWeekLine lineKey={w.lineKey} app={w.doom?.label ?? ''} time={per} /> : null}
    </View>
  );
}

function PhoneWeekLine({ lineKey, app, time }: { lineKey: 'phoneWeekDoom' | 'phoneWeekHeavy' | 'phoneWeekChill'; app: string; time: string }) {
  const { quip } = useStore();
  const text = useMemo(
    () => (lineKey === 'phoneWeekDoom' ? quip('phoneWeekDoom', { app, time }) : lineKey === 'phoneWeekHeavy' ? quip('phoneWeekHeavy', { time }) : quip('phoneWeekChill', { time })),
    [quip, lineKey, app, time],
  );
  return <SpiderSays text={text} />;
}

function ScreenRoast({ lineKey, app, time }: { lineKey: 'screenDoom' | 'screenHeavy' | 'screenChill'; app: string; time: string }) {
  const { quip } = useStore();
  const text = useMemo(() => quip(lineKey, { app, time }), [quip, lineKey, app, time]);
  return <SpiderSays text={text} />;
}

const styles = StyleSheet.create({
  big: { color: C.text, fontSize: 32, fontWeight: '900', fontFamily: MONO },
  stripDay: { color: C.dim, fontSize: 11, fontWeight: '700' },
  stripNum: { color: C.dim, fontSize: 9, fontFamily: MONO },
});
