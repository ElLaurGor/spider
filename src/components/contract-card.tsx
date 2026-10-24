import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Bar, Btn, Card, Chip, H, Row, T } from '@/components/ui';
import { noonOf, useToday } from '@/components/use-today';
import { C } from '@/constants/theme';
import { canSign, CONTRACT_GOALS, contractProgress, DIFFICULTIES, difficultyOk, goalOf, newMission, payoutOf, STAKES, targetFor, type Difficulty } from '@/lib/contracts';
import { weekKeyOf } from '@/lib/league';
import { contractBonus } from '@/lib/perks';
import { useStore } from '@/lib/store';
import type { ContractGoal } from '@/lib/types';

/** In its own card, or `bare` inside another one (HQ's This week card). */
function Shell({ bare, accent, children }: { bare?: boolean; accent: string; children: ReactNode }) {
  return bare ? <View style={styles.panel}>{children}</View> : <Card accent={accent}>{children}</Card>;
}

/** HQ card: this week's contract, or (Monday to Wednesday) the form to sign one. */
export function ContractCard({ bare }: { bare?: boolean }) {
  const { state, actions } = useStore();
  const today = useToday();
  // After a lost contract a different goal comes first (a new mission), and last week's goes last.
  const mission = newMission(state);
  const goals = CONTRACT_GOALS.filter((g) => g.available(state)).sort((a, b) => Number(a.id === mission?.lost) - Number(b.id === mission?.lost));
  const [goal, setGoal] = useState<ContractGoal>(mission?.goal ?? goals[0]?.id ?? 'train');
  const [stake, setStake] = useState(STAKES[0]);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const c = state.contract?.week === weekKeyOf(noonOf(today)) ? state.contract : null;
  const bonus = contractBonus(state);

  if (c) {
    const def = goalOf(c.goal);
    const progress = contractProgress(state, c);
    const level = DIFFICULTIES[c.difficulty ?? 'normal'].label;
    return (
      <Shell bare={bare} accent={c.status === 'won' ? C.green : C.yellow}>
        <H right={<T dim small mono>{c.stake} 🪙 · {level}</T>}>📜 Weekly contract</H>
        <T>{def.title(c.target)}</T>
        {c.status === 'won' ? (
          <T small style={{ color: C.green }}>
            Fulfilled. +{payoutOf(c, bonus)} 🪙 paid out.
          </T>
        ) : (
          <>
            <Bar pct={progress / c.target} color={C.yellow} />
            <T dim small mono>
              {Math.min(progress, c.target)}/{c.target} · pays {payoutOf(c, bonus)} 🪙 · ends Sunday
            </T>
          </>
        )}
      </Shell>
    );
  }

  if (!canSign()) return null;
  const def = goalOf(goal);
  const level = difficultyOk(goal, difficulty) ? difficulty : 'normal';
  const target = targetFor(goal, level);
  const payout = payoutOf({ stake, difficulty: level }, bonus);
  return (
    <Shell bare={bare} accent={C.yellow}>
      <H right={<T dim small mono>{state.coins} 🪙</T>}>📜 Weekly contract</H>
      <T dim small>
        Stake coins on a goal for the rest of this week. Reach it and get double back. A rough week (low mood or period days) voids it and refunds you.
      </T>
      {mission ? (
        <T small style={{ color: C.yellow }}>
          New week, new mission: {goalOf(mission.goal).title(goalOf(mission.goal).target).toLowerCase()} is the closest to done already. Last week&apos;s goal can rest.
        </T>
      ) : null}
      <Row gap={6} style={{ flexWrap: 'wrap' }}>
        {goals.map((g) => (
          <Chip key={g.id} label={g.title(g.target)} active={goal === g.id} color={C.yellow} onPress={() => setGoal(g.id)} />
        ))}
      </Row>
      <Row gap={6}>
        {STAKES.map((x) => (
          <Chip key={x} label={`${x} 🪙`} active={stake === x} color={C.yellow} onPress={() => setStake(x)} />
        ))}
      </Row>
      <Row gap={6} style={{ flexWrap: 'wrap' }}>
        {(Object.keys(DIFFICULTIES) as Difficulty[])
          .filter((d) => difficultyOk(goal, d))
          .map((d) => (
            <Chip key={d} label={`${DIFFICULTIES[d].label} ×${DIFFICULTIES[d].mult}`} active={level === d} color={C.yellow} onPress={() => setDifficulty(d)} />
          ))}
      </Row>
      <T dim small>
        {DIFFICULTIES[level].label}: {def.title(target).toLowerCase()}, pays {payout} 🪙 if you make it.
        {!difficultyOk(goal, 'hard') ? ' Hard is only open while there are enough days left this week.' : ''}
      </T>
      <Btn
        label={state.coins >= stake ? `Sign: ${def.title(target)} for ${stake} 🪙` : `Need ${stake - state.coins} more 🪙`}
        icon="edit"
        onPress={() => actions.signContract(goal, stake, level)}
        disabled={state.coins < stake}
      />
    </Shell>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: C.card2, borderRadius: 12, padding: 12, gap: 10 },
});
