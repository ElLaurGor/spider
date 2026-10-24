import { router } from 'expo-router';
import { Fragment, useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CareCard } from '@/components/care-card';
import { ContractCard } from '@/components/contract-card';
import { ExperimentCard } from '@/components/experiment-card';
import { CountdownRow } from '@/components/countdowns-card';
import { SwedishDaysRow } from '@/components/swedish-year';
import { DebriefCard, TopThreeCard } from '@/components/debrief-cards';
import { LeagueCard, LowBatteryCard, WindDownCard } from '@/components/hq-extras';
import { SilkTrackCard } from '@/components/silk-track';
import { MedalsCard } from '@/components/medals-card';
import { PauseBanner } from '@/components/pause-card';
import { ProgressChips } from '@/components/progress-chips';
import { QuestsCard } from '@/components/quests-card';
import { WildCard } from '@/components/hq-wild';
import { SleepCheckIn } from '@/components/sleep-checkin';
import { SpiderAvatar } from '@/components/spider-avatar';
import { Bar, Btn, Card, H, Icon, Row, Screen, SpiderSays, T, useNow } from '@/components/ui';
import { noonOf, useToday } from '@/components/use-today';
import { OutsideAlerts } from '@/components/outside-alerts';
import { WeatherRow } from '@/components/weather-row';
import { SlCard } from '@/components/sl-card';
import { C, MONO } from '@/constants/theme';
import { dayKey, fmtDuration, fmtTime, timeOfDay } from '@/lib/dates';
import { hqVisible, type HqSectionId } from '@/lib/hq-layout';
import { ACRONYM, type LineKey } from '@/lib/lines';
import { cycleInfo, sleepInfo } from '@/lib/body';
import { shownTitle } from '@/lib/cosmetics';
import { nextStage, stageFor } from '@/lib/evolution';
import { insightOfTheDay } from '@/lib/insights';
import { ledgerOn } from '@/lib/ledger';
import { verdictLineKey } from '@/lib/line-context';
import { immortalTask, yesterdayHighlight } from '@/lib/memory';
import { MOOD_LEVELS, moodInfo } from '@/lib/mood';
import { dayScoreFor } from '@/lib/report';
import { respectFor } from '@/lib/respect';
import { isAllSaintsDay, seasonOn } from '@/lib/seasons';
import { gentleDay, toneOn } from '@/lib/tone';
import {
  caffeineMg,
  coffeeOf,
  dayOf,
  effectiveSavage,
  eventsOn,
  gamingBudgetMin,
  gamingUsedMs,
  kcalOf,
  moodsOf,
  proteinOf,
  trainedOn,
  waterGoalFor,
  waterMl,
  workoutFor,
  workoutsThisWeek,
} from '@/lib/selectors';
import { useStore } from '@/lib/store';
import type { MoodLevel } from '@/lib/types';
import { ACHIEVEMENTS, levelProgress, SECRET_ACHIEVEMENTS } from '@/lib/xp';

const GREETING: Record<ReturnType<typeof timeOfDay>, LineKey> = {
  morning: 'greetMorning',
  afternoon: 'greetAfternoon',
  evening: 'greetEvening',
  night: 'greetNight',
};

/** The greeting for now: in season, half the time the season's own (a quiet one on Alla helgons dag). */
function greetingKey(): LineKey {
  const season = isAllSaintsDay() ? { line: 'greetAllSaints' as const } : seasonOn();
  return season && Math.random() < 0.5 ? season.line : GREETING[timeOfDay()];
}

export default function HQ() {
  const { state, actions, quip, cal, health } = useStore();
  const savage = effectiveSavage(state);
  const greet = () => {
    // Mornings, half the time: a remark about how yesterday actually went.
    const callback = timeOfDay() === 'morning' && Math.random() < 0.5 ? yesterdayHighlight(state) : null;
    return callback ? quip(callback.key, callback.vars) : quip(greetingKey());
  };
  const [bubble, setBubble] = useState(() => ({ text: greet(), savage }));
  // A change of tone (a low mood, sick mode) picks the greeting again, so it never stays savage.
  if (bubble.savage !== savage) setBubble({ text: greet(), savage });
  const now = useNow(30_000);
  const todayKey = useToday();

  const s = state.settings;
  const today = dayOf(state, todayKey);
  const lvl = levelProgress(state.xp);
  const water = waterMl(today);
  const plan = workoutFor(state, now);
  const gymDone = trainedOn(today);
  const usedMs = gamingUsedMs(state, undefined, now);
  const budgetMin = gamingBudgetMin(state);
  const score = dayScoreFor(state, new Date(now));
  const respect = respectFor(state);
  const season = seasonOn(now);
  const week = workoutsThisWeek(state);
  const openTasks = state.tasks.filter((t) => !t.done);
  const upcoming = eventsOn(cal.events, now).filter((e) => e.end > now && !e.allDay).slice(0, 3);
  const unlocked = ACHIEVEMENTS.filter((a) => state.achievements[a.id]).length;
  const coffees = coffeeOf(today).length;
  const cycle = cycleInfo(state);
  const stage = stageFor(lvl.level);
  const next = nextStage(lvl.level);
  const insight = insightOfTheDay(state);
  const date = noonOf(todayKey);
  const lastMonth = new Date(date.getFullYear(), date.getMonth() - 1, 1).toLocaleDateString('en-GB', { month: 'long' });
  // Banners closed with × (or Wrapped opened from its banner) stay closed for that month or that season.
  const dismissed = state.dismissed ?? [];
  const wrappedKey = `wrapped:${dayKey(new Date(date.getFullYear(), date.getMonth() - 1, 1)).slice(0, 7)}`;
  const allSaints = isAllSaintsDay(date);
  const seasonKey = `season:${allSaints ? 'allsaints' : season?.id}:${season ? dayKey(season.lastDay).slice(0, 4) : ''}`;
  // No verdict on a kind day (low mood, sick, away, period), and a slow morning isn't "tragic" yet.
  const kindToday = toneOn(state, todayKey).kind || gentleDay(state, todayKey);
  const vKey = verdictLineKey(score, new Date(now).getHours(), kindToday);
  const verdict = useMemo(() => quip(vKey), [quip, vKey]);
  const emptyKey = cal.status === 'granted' ? 'calFree' : 'tasksEmpty';
  const emptyLine = useMemo(() => quip(emptyKey), [quip, emptyKey]);

  // A tap on the spider: a random jab, its opinion of your week, or a word about the task that won't die.
  const tapSpider = () => {
    const zombie = immortalTask(state);
    if (zombie && Math.random() < 0.3) return setBubble({ text: quip('immortalTask', { task: zombie.task.title, days: zombie.days }), savage });
    setBubble({ text: quip(respect && Math.random() < 0.4 ? respect.line : 'spiderTap'), savage });
  };

  // The movable cards, by id (lib/hq-layout.ts sets their order and which are hidden).
  const SECTIONS: Record<HqSectionId, () => ReactNode> = {
    care: () => <CareCard />,
    weather: () => <WeatherRow />,
    commute: () => <SlCard />,
    countdowns: () => <CountdownRow />,
    sleep: () => <SleepCheckIn />,
    top3: () => <TopThreeCard />,
    winddown: () => <WindDownCard />,
    debrief: () => <DebriefCard />,
    level: () => (
      <Card accent={C.red}>
        <Row style={{ justifyContent: 'space-between' }}>
          <SpiderAvatar size={58} />
          <View style={{ flex: 1 }}>
            <Text style={styles.lvl}>LVL {lvl.level}</Text>
            <T dim small>
              {shownTitle(state)}
            </T>
            <T small style={{ color: C.cyan }}>
              🧬 {stage.name}
              {next ? ` · evolves at LVL ${next.level}` : ' · final form'}
            </T>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.coins} onPress={() => router.push('/shop')}>
              🪙 {state.coins.toLocaleString('sv-SE')}
            </Text>
            <Text style={styles.score}>{score}</Text>
            <T dim small>
              day score
            </T>
          </View>
        </Row>
        <Bar pct={lvl.pct} />
        <Row style={{ justifyContent: 'space-between' }}>
          <T dim small mono>
            {lvl.into} / {lvl.needed} XP
          </T>
          <T dim small>
            🏆 {unlocked}/{ACHIEVEMENTS.length}
          </T>
        </Row>
        <T dim small mono>
          {ledgerLine(ledgerOn(state, todayKey))}
        </T>
        <T small style={{ color: C.yellow }}>
          {verdict}
        </T>
        <T dim small>
          {respect
            ? `Respect: ${respect.emoji} ${respect.name} · ${respect.score} avg, last 7 days`
            : 'Respect: still making up its mind. Give it a few days.'}
        </T>
      </Card>
    ),
    shortcuts: () => (
      <>
        <Row gap={8}>
          <Btn label="Focus" icon="center_focus_strong" kind="ghost" small onPress={() => router.push('/focus')} style={{ flex: 1 }} />
          <Btn label="Shop" icon="storefront" kind="ghost" small onPress={() => router.push('/shop')} style={{ flex: 1 }} />
          <Btn label="Records" icon="emoji_events" kind="ghost" small onPress={() => router.push('/records')} style={{ flex: 1 }} />
        </Row>
        <Row gap={8}>
          <Btn label="Report" icon="assessment" kind="ghost" small onPress={() => router.push('/report')} style={{ flex: 1 }} />
          <Btn label="Wrapped" icon="redeem" kind="ghost" small onPress={() => router.push('/wrapped')} style={{ flex: 1 }} />
          <Btn label="Insights" icon="insights" kind="ghost" small onPress={() => router.push('/insights')} style={{ flex: 1 }} />
        </Row>
      </>
    ),
    league: () => <LeagueCard />,
    silk: () => <SilkTrackCard />,
    medals: () => <MedalsCard />,
    contract: () => <ContractCard />,
    insight: () =>
      insight ? (
        <Pressable onPress={() => router.push('/insights')}>
          <Card>
            <H right={<T dim small>all insights →</T>}>Insight of the day</H>
            <Row style={{ alignItems: 'flex-start' }}>
              <Text style={{ fontSize: 24 }}>{insight.emoji}</Text>
              <T style={{ flex: 1 }}>{insight.text}</T>
            </Row>
          </Card>
        </Pressable>
      ) : null,
    quests: () => <QuestsCard />,
    tiles: () => (
      <View style={styles.grid}>
        <Tile icon="water_drop" color={C.water} label="Water" onPress={() => router.navigate('/fuel')}>
          <Text style={styles.tileVal}>
            {(water / 1000).toFixed(1)}
            <Text style={styles.tileUnit}> / {(waterGoalFor(state) / 1000).toFixed(1)} L</Text>
          </Text>
          <Bar pct={water / waterGoalFor(state)} color={C.water} height={6} />
        </Tile>
        <Tile icon="fitness_center" color={C.red} label="Gym" onPress={() => router.navigate('/gym')}>
          <Text style={styles.tileVal}>{plan ? (gymDone ? 'Done ✓' : plan.name) : 'Rest'}</Text>
          <T dim small>
            {week.done}/{week.planned} this week
          </T>
        </Tile>
        <Tile icon="restaurant" color={C.green} label="Fuel" onPress={() => router.navigate('/fuel')}>
          <Text style={styles.tileVal}>
            {proteinOf(today)}
            <Text style={styles.tileUnit}> / {s.proteinGoal} g protein</Text>
          </Text>
          <T dim small>
            {kcalOf(today)} / {s.kcalGoal} kcal
          </T>
        </Tile>
        <Tile
          icon="sports_esports"
          color={usedMs > budgetMin * 60_000 ? C.red : C.purple}
          label={state.activeGame ? `LIVE · ${state.activeGame.game ?? 'Gaming'}` : 'Gaming'}
          onPress={() => router.navigate('/game')}>
          <Text style={styles.tileVal}>
            {fmtDuration(usedMs)}
            <Text style={styles.tileUnit}> / {fmtDuration(budgetMin * 60_000)}</Text>
          </Text>
          <Bar pct={usedMs / (budgetMin * 60_000)} color={usedMs > budgetMin * 60_000 ? C.red : C.purple} height={6} />
        </Tile>
        <Tile icon="coffee" color={C.yellow} label="Coffee" onPress={() => actions.addCoffee()}>
          <Text style={styles.tileVal}>
            {coffees}
            <Text style={styles.tileUnit}> / {s.coffeeLimit} cups</Text>
          </Text>
          <T dim small>
            {caffeineMg(today)} mg · tap to add one
          </T>
        </Tile>
        {health.status !== 'unsupported' ? (
          <>
            <Tile icon="directions_walk" color={C.green} label="Steps" onPress={() => router.navigate('/gym')}>
              <Text style={styles.tileVal}>
                {health.data ? health.data.steps.toLocaleString('sv-SE') : '–'}
                <Text style={styles.tileUnit}> / {s.stepGoal.toLocaleString('sv-SE')}</Text>
              </Text>
              {health.data ? (
                <Bar pct={health.data.steps / s.stepGoal} color={C.green} height={6} />
              ) : (
                <T dim small>
                  Connect your watch
                </T>
              )}
            </Tile>
            <Tile icon="favorite" color={C.red} label="Heart · Sleep" onPress={() => router.push('/heart')}>
              <Text style={styles.tileVal}>
                {health.data?.heartLatest ? health.data.heartLatest.bpm : '–'}
                <Text style={styles.tileUnit}> bpm</Text>
              </Text>
              <T dim small>
                {today.sleepMin != null ? `slept ${fmtDuration(today.sleepMin * 60_000)}` : 'no sleep data'}
                {today.sleepRating ? ` · ${sleepInfo(today.sleepRating).emoji}` : ''}
              </T>
            </Tile>
          </>
        ) : null}
        <Tile icon="favorite" color="#E86A8A" label="Cycle" onPress={() => router.push('/cycle')}>
          <Text style={styles.tileVal}>{cycle ? (cycle.periodDay ? `Period day ${cycle.periodDay}` : `Day ${cycle.cycleDay}`) : 'Log period'}</Text>
          <T dim small>
            {cycle && !cycle.periodDay ? (cycle.daysUntil > 0 ? `next in ~${cycle.daysUntil} days` : 'due any day') : 'tap to open'}
          </T>
        </Tile>
        <MoodTile latest={moodsOf(today).at(-1)?.level ?? null} count={moodsOf(today).length} onLog={(level) => actions.logMood(level, [], '')} />
      </View>
    ),
    buttons: () => (
      <Row>
        <Btn label={`+${s.glassMl} ml`} icon="water_drop" kind="blue" onPress={() => actions.addWater(s.glassMl)} style={{ flex: 1 }} />
        {state.activeGame ? (
          <Btn label="Stop gaming" icon="stop" onPress={() => actions.stopGame()} style={{ flex: 1 }} />
        ) : (
          <Btn label="Start gaming" icon="play_arrow" kind="ghost" onPress={() => actions.startGame()} style={{ flex: 1 }} />
        )}
      </Row>
    ),
    upnext: () => (
      <Card>
        <H right={<Text style={styles.link} onPress={() => router.navigate('/plan')}>Plan →</Text>}>Up next</H>
        {upcoming.length > 0 &&
          upcoming.map((e) => (
            <Row key={e.key}>
              <View style={[styles.dot, { backgroundColor: e.color ?? C.blue }]} />
              <T mono small dim>
                {fmtTime(e.start)}
              </T>
              <T style={{ flex: 1 }}>{e.title}</T>
            </Row>
          ))}
        {openTasks.slice(0, 3).map((t) => (
          <Pressable key={t.id} onPress={() => actions.toggleTask(t.id)}>
            <Row>
              <Icon name="radio_button_unchecked" size={20} color={C.dim} />
              <T style={{ flex: 1 }}>{t.title}</T>
            </Row>
          </Pressable>
        ))}
        {upcoming.length === 0 && openTasks.length === 0 ? (
          <T dim small>
            {emptyLine}
          </T>
        ) : null}
      </Card>
    ),
    achievements: () => (
      <Card>
        <H
          right={
            <Text style={styles.link} onPress={() => router.push('/records')}>
              🔓 {Object.keys(state.secrets).length}/{SECRET_ACHIEVEMENTS.length} secrets →
            </Text>
          }>
          Achievements
        </H>
        <View style={styles.achGrid}>
          {ACHIEVEMENTS.map((a) => {
            const got = !!state.achievements[a.id];
            return (
              <View key={a.id} style={[styles.ach, !got && { opacity: 0.35 }]}>
                <Icon name={a.icon} size={22} color={got ? C.yellow : C.dim} />
                <Text style={styles.achTitle} numberOfLines={2}>
                  {a.title}
                </Text>
                <Text style={styles.achDesc} numberOfLines={2}>
                  {a.desc}
                </Text>
              </View>
            );
          })}
        </View>
      </Card>
    ),
    swedishDays: () => <SwedishDaysRow />,
    progress: () => <ProgressChips />,
    experiment: () => <ExperimentCard compact />,
    wild: () => <WildCard />,
    // NEW HQ CARD: add `<id>: () => <YourCard />,` here and `{ id, label }` to HQ_SECTIONS in lib/hq-layout.ts.
  };

  return (
    <Screen
      title="S.P.I.D.E.R."
      subtitle={ACRONYM}
      right={
        <Pressable onPress={() => router.push('/settings')} hitSlop={10} style={styles.gear} accessibilityRole="button" accessibilityLabel="Settings">
          <Icon name="settings" color={C.dim} />
        </Pressable>
      }>
      {/* Pinned: these can't be moved or hidden. */}
      <SpiderSays text={bubble.text} onPress={tapSpider} />
      <OutsideAlerts />
      <PauseBanner />
      <LowBatteryCard />

      {date.getDate() <= 5 && !dismissed.includes(wrappedKey) ? (
        <Pressable
          onPress={() => {
            actions.dismissBanner(wrappedKey); // seen: it doesn't need to stay pinned
            router.push('/wrapped');
          }}
          style={styles.banner}>
          <Text style={{ fontSize: 26 }}>🎁</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Your {lastMonth} Wrapped is ready</Text>
            <T dim small>
              Tap to see your month. Brace yourself.
            </T>
          </View>
          <Pressable onPress={() => actions.dismissBanner(wrappedKey)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Hide the Wrapped banner">
            <Icon name="close" size={18} color={C.faint} />
          </Pressable>
        </Pressable>
      ) : null}

      {season && !dismissed.includes(seasonKey) ? (
        <View style={styles.banner}>
          <Text style={{ fontSize: 26 }}>{allSaints ? '🕯️' : season.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>
              {allSaints ? 'Alla helgons dag · today' : season.name}
              {allSaints ? '' : dayKey(season.lastDay) !== dayKey(now) ? ` · until ${season.lastDay.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ' · today'}
            </Text>
            <T dim small>
              {allSaints ? 'A day of remembrance. The ghosts can wait.' : season.about}
            </T>
          </View>
          <Pressable onPress={() => actions.dismissBanner(seasonKey)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Hide the season banner">
            <Icon name="close" size={18} color={C.faint} />
          </Pressable>
        </View>
      ) : null}

      {hqVisible(s.hq).map((id) => (
        <Fragment key={id}>{SECTIONS[id]()}</Fragment>
      ))}

      <Pressable onPress={() => router.push('/settings')} hitSlop={8}>
        <T dim small style={{ textAlign: 'center' }}>
          Arrange or hide HQ cards in Settings →
        </T>
      </Pressable>
    </Screen>
  );
}

/** Today's XP account: earned, plus what gaming penalties and undos took, when they took anything. */
const ledgerLine = (l: { earned: number; lost: number; undone: number }) =>
  `XP today: +${l.earned}${l.lost ? ` · −${l.lost} gaming` : ''}${l.undone ? ` · −${l.undone} undone` : ''}`;

/**
 * The mood check-in in one tap: each face logs it on the spot, a long-press (anywhere on the tile) opens Mood
 * for emotions and a note. Full width, so the faces are big enough to hit. A double tap doesn't log twice.
 */
function MoodTile({ latest, count, onLog }: { latest: MoodLevel | null; count: number; onLog: (level: MoodLevel) => void }) {
  const [busy, setBusy] = useState(false);
  const info = latest ? moodInfo(latest) : null;
  const color = info ? info.color : C.cyan;
  const log = (level: MoodLevel) => {
    if (busy) return;
    setBusy(true);
    onLog(level);
    setTimeout(() => setBusy(false), 1500);
  };
  const more = () => router.push('/mood');
  return (
    <Pressable onLongPress={more} style={[styles.tile, styles.tileWide]} accessibilityHint="Long-press to add emotions and a note">
      <Row style={{ justifyContent: 'space-between' }}>
        <Row gap={6}>
          <Icon name="mood" size={18} color={color} />
          <Text style={[styles.tileLabel, { color }]}>Mood</Text>
        </Row>
        <T dim small>
          {info ? `${info.emoji} ${info.label} · ${count} today` : 'How are you right now?'}
        </T>
      </Row>
      <Row gap={6}>
        {MOOD_LEVELS.map((m) => (
          <Pressable
            key={m.level}
            onPress={() => log(m.level)}
            onLongPress={more}
            disabled={busy}
            style={({ pressed }) => [styles.face, latest === m.level && { borderColor: m.color }, (pressed || busy) && { opacity: 0.6 }]}
            accessibilityRole="button"
            accessibilityLabel={`Log mood: ${m.label}`}
            accessibilityHint="Long-press to add emotions and a note"
            accessibilityState={{ selected: latest === m.level, disabled: busy }}>
            <Text style={styles.faceEmoji}>{m.emoji}</Text>
            <Text style={styles.faceLabel}>{m.label}</Text>
          </Pressable>
        ))}
      </Row>
      <T dim small>
        Tap a face to check in · long-press for emotions and a note
      </T>
    </Pressable>
  );
}

function Tile({
  icon,
  color,
  label,
  onPress,
  children,
}: {
  icon: Parameters<typeof Icon>[0]['name'];
  color: string;
  label: string;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.tile, pressed && { opacity: 0.8 }]}>
      <Row gap={6}>
        <Icon name={icon} size={18} color={color} />
        <Text style={[styles.tileLabel, { color }]}>{label}</Text>
      </Row>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  gear: { padding: 6 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: C.yellow,
    padding: 14,
  },
  bannerTitle: { color: C.text, fontSize: 15, fontWeight: '800' },
  lvl: { color: C.text, fontSize: 26, fontWeight: '900', fontFamily: MONO },
  score: { color: C.red, fontSize: 30, fontWeight: '900', fontFamily: MONO },
  coins: { color: C.yellow, fontSize: 13, fontWeight: '800', fontFamily: MONO },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    width: '47%', // 48.5% + the 10 px gap fell to one column on 360 dp phones
    flexGrow: 1,
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    gap: 8,
  },
  tileWide: { width: '100%' },
  face: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card2, gap: 2 },
  faceEmoji: { fontSize: 26 },
  faceLabel: { color: C.dim, fontSize: 11, fontWeight: '700' },
  tileLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' },
  tileVal: { color: C.text, fontSize: 20, fontWeight: '800', fontFamily: MONO },
  tileUnit: { color: C.dim, fontSize: 12, fontWeight: '600' },
  link: { color: C.red, fontWeight: '700', fontSize: 13 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  achGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ach: { width: '31%', flexGrow: 1, backgroundColor: C.card2, borderRadius: 12, padding: 10, gap: 4 },
  achTitle: { color: C.text, fontSize: 12, fontWeight: '800' },
  achDesc: { color: C.dim, fontSize: 10.5 },
});
