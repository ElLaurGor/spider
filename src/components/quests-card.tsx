import { router } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ChestButton } from '@/components/hq-extras';
import { Bar, Card, H, Icon, Row, T } from '@/components/ui';
import { C, MONO } from '@/constants/theme';
import { bossFor, questsFor } from '@/lib/quests';
import { BONUS_MIN, XP } from '@/lib/xp';
import { dayOf } from '@/lib/selectors';
import { useStore } from '@/lib/store';

const num = (n: number) => (n >= 1000 ? n.toLocaleString('sv-SE') : String(n));

export function QuestsCard() {
  const { state, quip } = useStore();
  const quests = questsFor(state);
  const done = dayOf(state).questsDone ?? [];
  const boss = bossFor(state);
  const hpPct = boss.hp / boss.maxHp;
  const tauntKey = boss.defeated ? null : hpPct > 0.66 ? (`taunt_${boss.id}` as const) : hpPct > 0.33 ? 'bossHurt' : 'bossDying';
  const taunt = useMemo(() => (tauntKey ? quip(tauntKey, { boss: boss.name }) : ''), [quip, tauntKey, boss.name]);

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
        return (
          <View key={q.id} style={{ gap: 4 }}>
            <Row>
              <Icon name={complete ? 'check_circle' : 'radio_button_unchecked'} size={20} color={complete ? C.green : C.dim} />
              <T style={[{ flex: 1 }, complete && { color: C.dim, textDecorationLine: 'line-through' }]}>{q.title}</T>
              <Text style={styles.xp}>+{q.xp}</Text>
            </Row>
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
      </T>
      <ChestButton />

      <View style={styles.boss}>
        <Row>
          <Text style={{ fontSize: 34 }}>{boss.emoji}</Text>
          <View style={{ flex: 1, gap: 4 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={styles.bossName}>{boss.name}</Text>
              <Text style={styles.progress}>{boss.defeated ? 'DEFEATED' : `${boss.hp}/${boss.maxHp} HP`}</Text>
            </Row>
            <Bar pct={boss.defeated ? 0 : hpPct} color={C.red} height={8} />
          </View>
        </Row>
        <T dim small>
          {boss.defeated ? 'Defeated! A new boss shows up on Monday.' : `${taunt} Every XP you earn this week is damage. Its HP is sized to beat your usual week.`}
          {!boss.defeated && boss.healed > 0 ? ` 💀 Doomscrolling healed it +${boss.healed} HP.` : ''}
        </T>
        {!boss.defeated ? (
          <T small style={{ color: C.yellow }}>
            🎯 Weakness: {boss.weakness}. Those days&apos; XP hits 50% harder.
            {boss.bonus > 0 ? ` +${num(boss.bonus)} bonus damage so far.` : ''}
          </T>
        ) : null}
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
});
