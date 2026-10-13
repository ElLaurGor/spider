import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ChestButton } from '@/components/hq-extras';
import { Bar, Card, H, Icon, Row, T } from '@/components/ui';
import { C, MONO } from '@/constants/theme';
import { lastKillDay } from '@/lib/bestiary';
import { addDays, dayKey, WEEKDAYS_LONG } from '@/lib/dates';
import { bossFor, MINION_COINS, QUEST_REROLL_COST, questsFor, rerollFor } from '@/lib/quests';
import { BONUS_MIN, XP } from '@/lib/xp';
import { dayOf } from '@/lib/selectors';
import { useStore } from '@/lib/store';
import { WEAK_SPOT_LABEL, type WeakSpot } from '@/lib/weak-spot';

const num = (n: number) => (n >= 1000 ? n.toLocaleString('sv-SE') : String(n));

export function QuestsCard() {
  const { state, quip, actions } = useStore();
  const quests = questsFor(state);
  const today = dayOf(state);
  const done = today.questsDone ?? [];
  const focus = today.questFocus;
  const boss = bossFor(state);
  const hpPct = boss.hp / boss.maxHp;
  const rematchDay = boss.rank > 1 ? lastKillDay(state, boss.id, boss.key) : null;
  // Its second weakness counts from the day after it dropped below half HP.
  const rageFrom = boss.ragedOn
    ? boss.ragedOn === dayKey()
      ? 'tomorrow'
      : WEEKDAYS_LONG[addDays(new Date(`${boss.ragedOn}T12:00`), 1).getDay()]
    : null;
  const tauntKey = boss.defeated
    ? null
    : hpPct > 0.66
      ? rematchDay
        ? 'bossRematch'
        : (`taunt_${boss.id}` as const)
      : hpPct > 0.33
        ? 'bossHurt'
        : 'bossDying';
  const taunt = useMemo(
    () => (tauntKey ? quip(tauntKey, { boss: boss.name, day: rematchDay ?? '' }) : ''),
    [quip, tauntKey, boss.name, rematchDay],
  );

  return (
    <Card accent={C.purple}>
      <H
        right={
          <Text style={styles.link} onPress={() => router.push('/report')}>
            Report card →
          </Text>
        }>
        Daily quests
      </H>
      {quests.map((q) => {
        const complete = done.includes(q.id);
        const canSwap = !complete && rerollFor(state, q.id) != null;
        return (
          <View key={q.id} style={{ gap: 4 }}>
            <Row>
              <Icon name={complete ? 'check_circle' : 'radio_button_unchecked'} size={20} color={complete ? C.green : C.dim} />
              <T style={[{ flex: 1 }, complete && { color: C.dim, textDecorationLine: 'line-through' }]}>{q.title}</T>
              {canSwap ? (
                <Pressable onPress={() => actions.rerollQuest(q.id)} hitSlop={8} style={styles.swap}>
                  <Text style={styles.swapText}>⟳ {QUEST_REROLL_COST}🪙</Text>
                </Pressable>
              ) : null}
              <Text style={styles.xp}>+{q.xp}</Text>
            </Row>
            {focus?.id === q.id && !complete ? (
              <Text style={[styles.progress, { paddingLeft: 30, color: C.purple }]}>
                WEAK SPOT · aimed at your {WEAK_SPOT_LABEL[focus.spot as WeakSpot] ?? focus.spot} this week
              </Text>
            ) : null}
            {!complete ? (
              <Row gap={8} style={{ paddingLeft: 30 }}>
                <View style={{ flex: 1 }}>
                  <Bar pct={q.progress / q.target} color={C.purple} height={5} />
                </View>
                <Text style={styles.progress}>
                  {num(q.progress)}/{num(q.target)}
                </Text>
              </Row>
            ) : null}
          </View>
        );
      })}
      <T dim small>
        All done = +{XP.questsAll} XP, +{BONUS_MIN.questsAll} min gaming and a loot chest. New quests every day.
        {!today.questRerolled ? ` One quest a day can be swapped for ${QUEST_REROLL_COST} 🪙 before you start it.` : ''}
      </T>
      <ChestButton />

      <View style={styles.boss}>
        <Row>
          <Text style={{ fontSize: 34 }}>{boss.emoji}</Text>
          <View style={{ flex: 1, gap: 4 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={[styles.bossName, { flex: 1 }]}>{boss.name}</Text>
              <Text style={styles.progress}>{boss.defeated ? 'DEFEATED' : `${boss.hp}/${boss.maxHp} HP`}</Text>
            </Row>
            <Bar pct={boss.defeated ? 0 : hpPct} color={boss.final ? C.yellow : C.red} height={8} />
          </View>
        </Row>
        <T dim small>
          {boss.defeated ? 'Defeated! A new boss shows up on Monday.' : `${taunt} Every XP you earn this week is damage. Its HP is sized to beat your usual week.`}
          {!boss.defeated && boss.healed > 0 ? ` 💀 Doomscrolling healed it +${boss.healed} HP.` : ''}
          {!boss.defeated && boss.paused > 0 ? ` 🛌 ${boss.paused} sick/away day${boss.paused === 1 ? '' : 's'} this week: it has less HP.` : ''}
        </T>
        {!boss.defeated ? (
          <T small style={{ color: C.yellow }}>
            🎯 Weakness: {boss.weakness}. Those days&apos; XP hits 50% harder.
            {boss.rageWeakness && rageFrom ? ` 😡 Enraged below half HP: from ${rageFrom}, ${boss.rageWeakness} counts too.` : ''}
            {boss.bonus > 0 ? ` +${num(boss.bonus)} bonus damage so far.` : ''}
          </T>
        ) : (
          <View style={{ gap: 4 }}>
            <Row gap={8}>
              <Text style={{ fontSize: 16 }}>👾</Text>
              <View style={{ flex: 1 }}>
                <Bar pct={boss.minionProgress / boss.minionHp} color={C.purple} height={6} />
              </View>
              <Text style={styles.progress}>
                {num(boss.minionProgress)}/{num(boss.minionHp)}
              </Text>
            </Row>
            <T dim small>
              Henchmen wave {boss.minions + 1}. Every wave you clear this week pays {MINION_COINS} 🪙.
              {boss.minions > 0 ? ` ${boss.minions} cleared so far.` : ''}
            </T>
          </View>
        )}
        <Text style={[styles.link, { alignSelf: 'flex-end' }]} onPress={() => router.push('/bestiary')}>
          Bestiary →
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  link: { color: C.red, fontWeight: '700', fontSize: 13 },
  xp: { color: C.purple, fontFamily: MONO, fontSize: 12, fontWeight: '800' },
  progress: { color: C.dim, fontFamily: MONO, fontSize: 11 },
  boss: { backgroundColor: C.card2, borderRadius: 12, padding: 12, gap: 8 },
  bossName: { color: C.text, fontWeight: '800', fontSize: 15 },
  swap: { borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  swapText: { color: C.dim, fontFamily: MONO, fontSize: 11, fontWeight: '700' },
});
