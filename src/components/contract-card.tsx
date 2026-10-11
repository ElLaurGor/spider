import { useState } from 'react';

import { Bar, Btn, Card, Chip, H, Row, T } from '@/components/ui';
import { C } from '@/constants/theme';
import { canSign, CONTRACT_GOALS, contractProgress, goalOf, STAKES } from '@/lib/contracts';
import { weekKeyOf } from '@/lib/league';
import { useStore } from '@/lib/store';
import type { ContractGoal } from '@/lib/types';

/** HQ card: this week's contract, or (Monday to Wednesday) the form to sign one. */
export function ContractCard() {
  const { state, actions } = useStore();
  const goals = CONTRACT_GOALS.filter((g) => g.available(state));
  const [goal, setGoal] = useState<ContractGoal>(goals[0]?.id ?? 'train');
  const [stake, setStake] = useState(STAKES[0]);
  const c = state.contract?.week === weekKeyOf() ? state.contract : null;

  if (c) {
    const def = goalOf(c.goal);
    const progress = contractProgress(state, c);
    return (
      <Card accent={c.status === 'won' ? C.green : C.yellow}>
        <H right={<T dim small mono>{c.stake} 🪙</T>}>📜 Weekly contract</H>
        <T>{def.title(c.target)}</T>
        {c.status === 'won' ? (
          <T small style={{ color: C.green }}>
            Fulfilled. +{c.stake * 2} 🪙 paid out.
          </T>
        ) : (
          <>
            <Bar pct={progress / c.target} color={C.yellow} />
            <T dim small mono>
              {Math.min(progress, c.target)}/{c.target} · pays {c.stake * 2} 🪙 · ends Sunday
            </T>
          </>
        )}
      </Card>
    );
  }

  if (!canSign()) return null;
  const def = goalOf(goal);
  return (
    <Card accent={C.yellow}>
      <H right={<T dim small mono>{state.coins} 🪙</T>}>📜 Weekly contract</H>
      <T dim small>
        Stake coins on a goal for the rest of this week. Reach it and get double back. A rough week (low mood or period days) voids it and refunds you.
      </T>
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
      <Btn
        label={state.coins >= stake ? `Sign: ${def.title(def.target)} for ${stake} 🪙` : `Need ${stake - state.coins} more 🪙`}
        icon="edit"
        onPress={() => actions.signContract(goal, stake)}
        disabled={state.coins < stake}
      />
    </Card>
  );
}
