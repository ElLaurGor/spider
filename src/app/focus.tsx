import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, AppState, Pressable, ScrollView, Text, View } from 'react-native';

import { Big, Btn, Card, Chip, Field, H, Icon, Row, SpiderSays, T, useNow } from '@/components/ui';
import { C } from '@/constants/theme';
import { dayKey, fmtClock, fmtDuration, fmtTime, MIN } from '@/lib/dates';
import { focusBreakdown, type FocusRange } from '@/lib/focus-log';
import { focusBonusMin } from '@/lib/perks';
import { endOffer, extraRound, spotterFor } from '@/lib/spotter';
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
  const now = useNow(f ? 1000 : 30_000);
  const [minutes, setMinutes] = useState(25);
  // step 8 days: "Focus on this" on a Plan task opens here with the task, labelled and offered to tick off at the end
  const params = useLocalSearchParams<{ task?: string }>();
  const [taskId, setTaskId] = useState(() => (typeof params.task === 'string' && state.tasks.some((t) => t.id === params.task && !t.done) ? params.task : undefined));
  const task = state.tasks.find((t) => t.id === taskId && !t.done);
  const [label, setLabel] = useState(() => task?.title ?? '');
  const spotter = spotterFor(state, minutes, new Date(now));
  const extra = extraRound(state);
  const offer = endOffer(state, now);
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
    const side = state.focusSide?.start === f.start ? state.focusSide : null;
    const sp = side?.spotter;
    return (
      <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, gap: 16, alignItems: 'center', paddingBottom: 48 }}>
        <T dim>{f.label ? `Focusing on: ${f.label}` : 'Focus session'}</T>
        <Web progress={Math.min(1, (now - f.start) / total)} />
        <Big size={48}>{fmtClock(Math.max(0, left))}</Big>
        {sp ? (
          <T small style={{ textAlign: 'center', color: C.cyan }}>
            {extra
              ? `${sp.emoji} ${sp.name} is still going. Last stretch, together.`
              : `${sp.emoji} ${sp.name} is working alongside you: ${sp.minutes} min planned.`}
          </T>
        ) : null}
        <T dim small style={{ textAlign: 'center' }}>
          {strict
            ? 'Strict mode: lock your phone or keep S.P.I.D.E.R. open. Opening other apps for more than 30 s snaps the web.'
            : screenTimeSupported
              ? 'Put the phone down. Locking it is fine. Allow usage access and strict mode catches other apps too.'
              : 'Put the phone down. Locking it is fine.'}
        </T>
        {screenTimeSupported && !strict ? <Btn label="Usage access settings" kind="ghost" onPress={openUsageSettings} style={{ alignSelf: 'stretch' }} /> : null}
        {extra ? (
          <Btn label="Stop here (costs nothing)" kind="ghost" onPress={() => actions.finishFocus('gave up')} style={{ alignSelf: 'stretch' }} />
        ) : (
          <Btn label="Give up" kind="danger" onPress={giveUp} style={{ alignSelf: 'stretch' }} />
        )}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
      <SpiderSays text="Pick a length and I'll spin a web while you work. Finish it and you earn XP plus gaming minutes. Wander off and the web snaps." />
      {offer ? (
        <Card accent={C.cyan}>
          {offer.more != null && offer.spotter ? (
            <>
              <T>
                {offer.spotter.emoji} {offer.spotter.name}: &quot;I&apos;m doing {offer.more} more. You in?&quot;
              </T>
              <Row>
                <Btn label={`I'm in (+${offer.more} min)`} icon="play_arrow" small onPress={actions.extendFocus} style={{ flex: 1 }} />
                {offer.task ? null : <Btn label="Not today" kind="ghost" small onPress={actions.closeFocusOffer} style={{ flex: 1 }} />}
              </Row>
              <T dim small>
                Finish it and it adds to the web you just spun. Stop early and it costs nothing.
              </T>
            </>
          ) : null}
          {offer.outlasted && offer.spotter ? (
            <T style={{ color: C.green }}>
              🏁 {offer.entry.minutes} min. You outlasted {offer.spotter.emoji} {offer.spotter.name}.
            </T>
          ) : null}
          {offer.task ? (
            <>
              <T>Done with &quot;{offer.task.title}&quot;?</T>
              <Row>
                <Btn
                  label="Tick it off"
                  icon="check"
                  small
                  onPress={() => {
                    if (offer.task) actions.toggleTask(offer.task.id);
                    actions.closeFocusOffer();
                  }}
                  style={{ flex: 1 }}
                />
                <Btn label="Not yet" kind="ghost" small onPress={actions.closeFocusOffer} style={{ flex: 1 }} />
              </Row>
            </>
          ) : offer.more == null ? (
            <Btn label="Done" kind="ghost" small onPress={actions.closeFocusOffer} />
          ) : null}
        </Card>
      ) : null}
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
        {task ? (
          <Row>
            <T small style={{ flex: 1, color: C.cyan }}>
              📌 For the task &quot;{task.title}&quot;: I&apos;ll offer to tick it off at the end.
            </T>
            <Pressable onPress={() => setTaskId(undefined)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Not for this task">
              <Icon name="close" size={18} color={C.faint} />
            </Pressable>
          </Row>
        ) : null}
        <T dim small>
          Reward: +{focusXp(minutes)} XP and +{focusBonusMin(state, minutes)} min gaming.
        </T>
        {spotter ? (
          <T dim small>
            {spotter.emoji} {spotter.name} from your league works alongside: {spotter.minutes} min, a bit past your usual.
          </T>
        ) : null}
        <Btn label={`Start ${minutes} min`} icon="play_arrow" onPress={() => actions.startFocusWith(minutes, label, task?.id)} />
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
      <WhereFocusWent now={now} />
    </ScrollView>
  );
}

/** step 8 days: the week's or month's focus by label, and the app that snapped the most webs (focus-log.ts). */
function WhereFocusWent({ now }: { now: number }) {
  const { state } = useStore();
  const [range, setRange] = useState<FocusRange>('week');
  const b = focusBreakdown(state, range, new Date(now));
  return (
    <Card>
      <H
        right={
          <Row gap={6}>
            <Chip label="Week" active={range === 'week'} onPress={() => setRange('week')} />
            <Chip label="Month" active={range === 'month'} onPress={() => setRange('month')} />
          </Row>
        }>
        Where focus went
      </H>
      {b.rows.length === 0 ? (
        <T dim small>
          No webs {range === 'week' ? 'this week' : 'this month'} yet. Label a session and it shows up here.
        </T>
      ) : (
        <>
          {b.rows.map((r) => (
            <Row key={r.label}>
              <T style={{ flex: 1 }}>{r.label}</T>
              <T small dim mono>
                {fmtDuration(r.min * MIN)} · {r.n}×
              </T>
            </Row>
          ))}
          <T dim small>
            {fmtDuration(b.total * MIN)} in {b.sessions} session{b.sessions === 1 ? '' : 's'}.
            {b.snapper ? ` Most webs snapped by ${b.snapper.app} (${b.snapper.n}).` : ''}
          </T>
        </>
      )}
    </Card>
  );
}

