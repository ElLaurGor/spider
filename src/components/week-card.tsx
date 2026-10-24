import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BossRecapPanel } from '@/components/boss-recap';
import { ContractCard } from '@/components/contract-card';
import { useNemesis } from '@/components/hq-extras';
import { MedalRows } from '@/components/medals-card';
import { BossPanel, FinisherLine } from '@/components/quests-card';
import { Bar, Card, H, Icon, T, useNow } from '@/components/ui';
import { noonOf, useToday } from '@/components/use-today';
import { C, MONO } from '@/constants/theme';
import { canSign, contractProgress, goalOf } from '@/lib/contracts';
import { coopSummary } from '@/lib/coop';
import { standings, TIERS, weekKeyOf } from '@/lib/league';
import { medalsFor } from '@/lib/medals';
import { bossFor } from '@/lib/quests';
import { monthOf, SILK_TIERS, silkStatus } from '@/lib/silk-track';
import { useStore } from '@/lib/store';
import { trekSummary } from '@/lib/trek';
import { medalLine, weekDaysLeft } from '@/lib/week-card';
import { ghostOf, ghostText } from '@/lib/xp-timeline';

type Part = 'boss' | 'medals' | 'contract';

/**
 * HQ: the week in one card, a line each for the boss, the league (and a co-op week), the Silk Track, the medals,
 * the trek and the contract.
 * The boss, medals and contract open in place; the league and the Silk Track open their screens.
 */
export function WeekCard() {
  const { state } = useStore();
  // Ticks each minute: the finisher is only for the weekend.
  const at = useNow(60_000);
  const today = useToday();
  const date = noonOf(today);
  const [open, setOpen] = useState<Part | null>(null);
  const toggle = (p: Part) => setOpen((o) => (o === p ? null : p));
  const nemesis = useNemesis();

  const boss = bossFor(state);
  const table = standings(state);
  const rank = table.findIndex((r) => r.me) + 1;
  const me = table[rank - 1];
  const tier = state.league ? TIERS[state.league.tier] : null;
  const ghost = ghostOf(state);
  const silk = silkStatus(state, monthOf(today));
  const week = weekKeyOf(date);
  const medals = medalsFor(state, week);
  const c = state.contract?.week === week ? state.contract : null;
  const left = weekDaysLeft(date);
  // The real time, not noon: the partner's count and the trek bots move through the day.
  const coop = coopSummary(state, new Date(at));
  const trek = trekSummary(state, new Date(at));

  const contractText = c
    ? c.status === 'won'
      ? `${goalOf(c.goal).title(c.target)} · fulfilled`
      : c.status === 'open'
        ? `${goalOf(c.goal).title(c.target)} · ${Math.min(contractProgress(state, c), c.target)}/${c.target}`
        : `${goalOf(c.goal).title(c.target)} · ${c.status === 'voided' ? 'voided, stake refunded' : 'missed'}`
    : canSign(date)
      ? 'Sign a contract →'
      : null;

  return (
    <Card accent={C.purple}>
      <H right={<T dim small>{left === 1 ? 'last day' : `${left} days left`}</T>}>📅 This week</H>
      <BossRecapPanel />

      <Line
        emoji={boss.emoji}
        title={boss.name}
        detail={boss.defeated ? `defeated · henchmen wave ${boss.minions + 1}` : `${boss.hp.toLocaleString('sv-SE')}/${boss.maxHp.toLocaleString('sv-SE')} HP`}
        bar={boss.defeated ? undefined : { pct: boss.hp / boss.maxHp, color: boss.final ? C.yellow : C.red }}
        open={open === 'boss'}
        onPress={() => toggle('boss')}
      />
      {open === 'boss' ? <BossPanel at={at} /> : <FinisherLine at={at} />}

      {tier ? (
        <Line
          emoji={tier.emoji}
          title={`#${rank} in the ${tier.name} League · ${(me?.xp ?? 0).toLocaleString('sv-SE')} XP`}
          detail={
            nemesis
              ? `😈 ${nemesis.name} · ${nemesis.gap === 0 ? 'level with you' : `${nemesis.gap} XP ${nemesis.ahead ? 'ahead' : 'behind'}`}`
              : ghost
                ? ghostText(ghost)
                : 'table →'
          }
          onPress={() => router.push('/league')}
        />
      ) : null}

      {coop ? <Line emoji="🤝" title="Co-op week" detail={coop.replace(/^🤝 /, '')} onPress={() => router.push('/league')} /> : null}

      <Line
        emoji={silk.edition.emoji}
        title={`Silk Track · tier ${silk.tier}/${SILK_TIERS}`}
        detail={silk.next ? `next ${silk.next.reward.emoji} ${silk.next.reward.name} at ${silk.next.xp.toLocaleString('sv-SE')} XP` : 'every tier done'}
        bar={silk.next ? { pct: silk.progress, color: silk.edition.color } : undefined}
        onPress={() => router.push('/shop')}
      />

      {medals.length ? <Line emoji="🏅" title="Medals" detail={medalLine(medals)} open={open === 'medals'} onPress={() => toggle('medals')} /> : null}
      {open === 'medals' ? (
        <View style={styles.panel}>
          <MedalRows week={week} />
        </View>
      ) : null}

      <Line emoji="🥾" title="Trek" detail={trek ?? 'Pick a route and your watch steps walk it →'} onPress={() => router.push('/trek')} />

      {contractText ? <Line emoji="📜" title="Contract" detail={contractText} open={open === 'contract'} onPress={() => toggle('contract')} /> : null}
      {open === 'contract' ? <ContractCard bare /> : null}
    </Card>
  );
}

/** One line of the card: tap to open it in place (`open` set) or to go to its screen. */
function Line({
  emoji,
  title,
  detail,
  bar,
  open,
  onPress,
}: {
  emoji: string;
  title: string;
  detail: ReactNode;
  bar?: { pct: number; color: string };
  open?: boolean;
  onPress: () => void;
}) {
  const expands = open !== undefined;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.line, pressed && { opacity: 0.7 }]}
      accessibilityRole="button"
      accessibilityState={expands ? { expanded: open } : undefined}
      accessibilityLabel={title}>
      <Text style={styles.emoji}>{emoji}</Text>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.detail}>{detail}</Text>
        {bar ? <Bar pct={bar.pct} color={bar.color} height={5} /> : null}
      </View>
      <Icon name={expands ? (open ? 'expand_less' : 'expand_more') : 'chevron_right'} size={20} color={C.dim} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  emoji: { fontSize: 22, width: 30, textAlign: 'center' },
  title: { color: C.text, fontWeight: '700', fontSize: 14 },
  detail: { color: C.dim, fontSize: 12, fontFamily: MONO },
  panel: { backgroundColor: C.card2, borderRadius: 12, padding: 12, gap: 8 },
});
