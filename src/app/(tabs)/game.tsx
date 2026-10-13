import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EntryEditor } from '@/components/entry-editor';
import { ScreenTimeCard } from '@/components/screen-time-card';
import { Bar, Big, Btn, Card, Chip, Field, H, Row, Screen, SpiderSays, T, useNow } from '@/components/ui';
import { HiddenEgg } from '@/components/swedish-year';
import { C, MONO } from '@/constants/theme';
import { addDays, dayKey, fmtClock, fmtDuration, fmtTime, MIN, WEEKDAYS, WEEKDAYS_LONG } from '@/lib/dates';
import { bankRate, workoutBonusMin } from '@/lib/perks';
import { dayOf, gameTotals, gamingBudgetMin, gamingUsedMs, recentGames } from '@/lib/selectors';
import { useStore } from '@/lib/store';
import type { GameSession } from '@/lib/types';
import { BONUS_MIN } from '@/lib/xp';

export default function Game() {
  const { state, actions, quip } = useStore();
  const active = state.activeGame;
  const now = useNow(1000, !!active);
  const [game, setGame] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [picked, setPicked] = useState<string | null>(null); // day tapped in the week chart
  const [editing, setEditing] = useState<{ key: string; start: number } | null>(null);
  const edited = editing ? dayOf(state, editing.key).games.find((g) => g.start === editing.start) : undefined;
  const editedMin = edited ? Math.round((edited.end - edited.start) / MIN) : 0;
  const recent = recentGames(state);
  const topGames = gameTotals(state, 7);
  const topMax = Math.max(1, ...topGames.map((g) => g.ms));

  const today = dayOf(state);
  const budgetMs = gamingBudgetMin(state) * MIN;
  const usedMs = gamingUsedMs(state, undefined, now);
  const over = usedMs > budgetMs;
  const left = budgetMs - usedMs;

  const idleLine = useMemo(
    () => (over ? quip('gameOver') : `Today's budget: ${fmtDuration(budgetMs)}. Spend it wisely. Or don't, and hear about it.`),
    [quip, over, budgetMs],
  );
  // Picked once per session (and again if it tips over budget), not every second.
  const sessionStart = active?.start;
  const leftAtStart = sessionStart ? budgetMs - gamingUsedMs(state, undefined, sessionStart) : 0;
  const activeLine = useMemo(
    () => (over ? quip('gameWayOver') : quip('gameStart', { left: fmtDuration(Math.max(0, leftAtStart)) })),
    [quip, over, leftAtStart],
  );

  const week = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(new Date(), i - 6);
    const k = dayKey(d);
    const name = i === 6 ? 'Today' : i === 5 ? 'Yesterday' : WEEKDAYS_LONG[d.getDay()];
    return { key: k, name, label: WEEKDAYS[d.getDay()][0], ms: gamingUsedMs(state, k, now), budget: gamingBudgetMin(state, k) * MIN };
  });
  const weekTotal = week.reduce((a, d) => a + d.ms, 0);
  const maxMs = Math.max(...week.map((d) => Math.max(d.ms, d.budget)), 1);
  const pickedDay = week.find((d) => d.key === picked);
  const pickedLog = pickedDay ? dayOf(state, pickedDay.key) : null;
  const pickedPhoneMin = pickedLog && state.settings.phoneGamesCount ? (pickedLog.screen?.gamesMin ?? 0) : 0;

  return (
    <Screen title="GAME" subtitle="Play hard. Within budget.">
      <SpiderSays text={active ? activeLine : idleLine} />

      <Card accent={active ? (over ? C.red : C.purple) : C.border} style={{ alignItems: 'center', paddingVertical: 24 }}>
        <H>{active ? 'Session live' : 'No session running'}</H>
        {active && !renaming ? (
          <Pressable
            onPress={() => {
              setGame(active.game ?? '');
              setRenaming(true);
            }}
            hitSlop={8}>
            <Text style={styles.gameName}>{active.game ? `🎮 ${active.game}` : 'Tap to name this game'}</Text>
          </Pressable>
        ) : null}
        <Big size={56} color={active ? (over ? C.red : C.purple) : C.dim}>
          {active ? fmtClock(now - active.start) : '00:00'}
        </Big>
        {!active || renaming ? (
          <View style={{ alignSelf: 'stretch', gap: 8 }}>
            <Field value={game} onChangeText={setGame} placeholder="What are you playing? (optional)" />
            {recent.length > 0 ? (
              <Row gap={6} style={{ flexWrap: 'wrap' }}>
                {recent.map((g) => (
                  <Chip key={g} label={g} active={game === g} color={C.purple} onPress={() => setGame(g)} />
                ))}
              </Row>
            ) : null}
          </View>
        ) : null}
        {active ? (
          renaming ? (
            <Btn
              label="Save game name"
              kind="ghost"
              onPress={() => {
                actions.setGame(game);
                setRenaming(false);
              }}
              style={{ alignSelf: 'stretch' }}
            />
          ) : (
            <Btn label="Stop session" icon="stop" onPress={() => actions.stopGame()} style={{ alignSelf: 'stretch' }} />
          )
        ) : (
          <Btn
            label={game.trim() ? `Start ${game.trim()}` : 'Start session'}
            icon="play_arrow"
            kind="blue"
            onPress={() => {
              actions.startGame(game);
              setGame('');
            }}
            style={{ alignSelf: 'stretch' }}
          />
        )}
      </Card>

      <Card>
        <H right={<T small mono style={{ color: over ? C.red : C.dim }}>{over ? `${fmtDuration(-left)} over` : `${fmtDuration(left)} left`}</T>}>
          Today
        </H>
        <Bar pct={usedMs / budgetMs} color={over ? C.red : C.purple} height={10} />
        <T dim small mono>
          {fmtDuration(usedMs)} used of {fmtDuration(budgetMs)} ({state.settings.gamingBudgetMin}m base + {today.bonusGameMin}m earned)
        </T>
        <T dim small>
          Earn more: workout +{workoutBonusMin(state)}m · water goal +{BONUS_MIN.waterGoal}m · each task +{BONUS_MIN.task}m. Going over costs XP.
          Earned minutes you don&apos;t play are banked at midnight: {bankRate(state).rate} 🪙 each.
        </T>
        {today.games.map((g) => (
          <SessionRow key={g.start} g={g} onPress={() => setEditing({ key: dayKey(), start: g.start })} />
        ))}
        {today.games.length > 0 ? (
          <T dim small>
            Tap a session to fix its time or length. Older days: tap a bar in Last 7 days.
          </T>
        ) : null}
      </Card>

      <HiddenEgg id="game" align="flex-start" />
      <ScreenTimeCard />

      {topGames.length > 0 ? (
        <Card>
          <H>Most played · 7 days</H>
          {topGames.slice(0, 5).map((g) => (
            <View key={g.game} style={{ gap: 4 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <T small>{g.game}</T>
                <T small mono dim>
                  {fmtDuration(g.ms)}
                </T>
              </Row>
              <Bar pct={g.ms / topMax} color={C.purple} height={5} />
            </View>
          ))}
        </Card>
      ) : null}

      <Card>
        <H right={<T dim small mono>{fmtDuration(weekTotal)} total</T>}>Last 7 days</H>
        <Row gap={6} style={{ alignItems: 'flex-end', height: 110 }}>
          {week.map((d) => (
            <Pressable
              key={d.key}
              onPress={() => setPicked(picked === d.key ? null : d.key)}
              hitSlop={4}
              style={{ flex: 1, alignItems: 'center', gap: 4 }}>
              <Text style={styles.barVal}>{d.ms > 0 ? Math.round(d.ms / MIN) : ''}</Text>
              <View
                style={{
                  width: '70%',
                  height: Math.max(3, (d.ms / maxMs) * 70),
                  borderRadius: 4,
                  backgroundColor: d.ms > d.budget ? C.red : C.purple,
                  opacity: picked && picked !== d.key ? 0.4 : 1,
                }}
              />
              <Text style={[styles.barLabel, picked === d.key && { color: C.text }]}>{d.label}</Text>
            </Pressable>
          ))}
        </Row>
        {pickedDay && pickedLog ? (
          <View style={{ gap: 8 }}>
            <H right={<T dim small mono>{fmtDuration(pickedDay.ms)}</T>}>{pickedDay.name}</H>
            {pickedLog.games.map((g) => (
              <SessionRow key={g.start} g={g} onPress={() => setEditing({ key: pickedDay.key, start: g.start })} />
            ))}
            {pickedLog.games.length === 0 ? <T dim small>No sessions logged that day.</T> : null}
            {pickedPhoneMin > 0 ? (
              <T dim small>
                + {fmtDuration(pickedPhoneMin * MIN)} of phone games from screen time (not editable).
              </T>
            ) : null}
          </View>
        ) : null}
        <T dim small>
          Minutes per day. Red = over budget. Tap a day to see and fix its sessions. S.P.I.D.E.R. remembers.
        </T>
      </Card>

      {edited && editing ? (
        <EntryEditor
          key={`${editing.key}:${edited.start}`}
          title="Edit session"
          at={edited.start}
          name={edited.game ?? ''}
          numbers={[
            { key: 'h', label: 'Hours', value: Math.floor(editedMin / 60), step: 1, min: 0, max: 12, suffix: 'h' },
            { key: 'm', label: 'Minutes', value: editedMin % 60, step: 5, min: 0, max: 59, suffix: 'min' },
          ]}
          onSave={(at, v) => {
            const min = v.numbers.h * 60 + v.numbers.m;
            // Untouched length keeps its seconds.
            const ms = min === editedMin ? edited.end - edited.start : min * MIN;
            actions.updateGame(editing.key, edited.start, { start: at, ms, game: v.name });
          }}
          onDelete={() => actions.removeGame(editing.key, edited.start)}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </Screen>
  );
}

function SessionRow({ g, onPress }: { g: GameSession; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.7 }}>
      <Row>
        <Text style={styles.mono}>
          {fmtTime(g.start)}–{fmtTime(g.end)}
        </Text>
        <T small style={{ flex: 1 }}>
          {g.game ?? 'Unnamed'}
        </T>
        <T small mono dim>
          {fmtDuration(g.end - g.start)}
        </T>
      </Row>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  mono: { color: C.dim, fontFamily: MONO, fontSize: 13 },
  gameName: { color: C.text, fontSize: 16, fontWeight: '800' },
  barVal: { color: C.dim, fontSize: 10, fontFamily: MONO },
  barLabel: { color: C.dim, fontSize: 11, fontWeight: '700' },
});
