import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Bar, Btn, Card, Chip, H, Row, T } from '@/components/ui';
import { noonOf, useToday } from '@/components/use-today';
import { C } from '@/constants/theme';
import { CONTRACT_GOALS, contractProgress, DIFFICULTIES, difficultyOk, goalOf, newMission, payoutOf, signOptions, STAKES, targetFor, type Difficulty } from '@/lib/contracts';
import { weekKeyOf } from '@/lib/league';
import { contractBonus } from '@/lib/perks';
import { useStore } from '@/lib/store';
import type { ContractGoal } from '@/lib/types';

/** In its own card, or `bare` inside another one (HQ's This week card). */
function Shell({ bare, accent, children }: { bare?: boolean; accent: string; children: ReactNode }) {
  return bare ? <View style={styles.panel}>{children}</View> : <Card accent={accent}>{children}</Card>;
}

/** HQ card: this week's contract, or (Monday to Wednesday, and again once it's won) the form to sign one. */
export function ContractCard({ bare }: { bare?: boolean }) {
  const { state } = useStore();
  const today = useToday();
  const c = state.contract?.week === weekKeyOf(noonOf(today)) ? state.contract : null;
  const won = c?.status === 'won' ? `${c.week}:${c.goal}` : null;
  const [more, setMore] = useState<string | null>(null); // the won contract the form for another one was opened after
  const options = signOptions(state);
  const bonus = contractBonus(state);

  if (c && !(won && more === won && options)) {
    const def = goalOf(c.goal);
    const progress = contractProgress(state, c);
    const level = DIFFICULTIES[c.difficulty ?? 'normal'].label;
    const n = (c.before?.length ?? 0) + 1;
    return (
      <Shell bare={bare} accent={c.status === 'won' ? C.green : C.yellow}>
        <H right={<T dim small mono>{c.stake} 🪙 · {level}</T>}>📜 Weekly contract{n > 1 ? ` #${n}` : ''}</H>
        <T>{def.title(c.target)}</T>
        {c.status === 'won' ? (
          <>
            <T small style={{ color: C.green }}>
              Fulfilled. +{payoutOf(c, bonus)} 🪙 paid out.
            </T>
            {options ? <Btn label="Sign another contract" icon="edit" kind="ghost" small onPress={() => setMore(won)} /> : null}
          </>
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

  if (!options) return null;
  return (
    <Shell bare={bare} accent={C.yellow}>
      <SignForm key={options.before.join()} goalIds={options.goals} next={options.before.length + 1} onCancel={c ? () => setMore(null) : undefined} />
    </Shell>
  );
}

/** Picking a goal, stake and difficulty. `next` > 1: a follow-up after a won contract, on a goal the week hasn't had. */
function SignForm({ goalIds, next, onCancel }: { goalIds: ContractGoal[]; next: number; onCancel?: () => void }) {
  const { state, actions } = useStore();
  // After a lost contract a different goal comes first (a new mission), and last week's goes last.
  const mission = next === 1 ? newMission(state) : null;
  const goals = CONTRACT_GOALS.filter((g) => goalIds.includes(g.id)).sort((a, b) => Number(a.id === mission?.lost) - Number(b.id === mission?.lost));
  const [picked, setGoal] = useState<ContractGoal>(mission?.goal ?? goals[0]?.id ?? 'train');
  const [stake, setStake] = useState(STAKES[0]);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const bonus = contractBonus(state);
  const goal = goalIds.includes(picked) ? picked : (goals[0]?.id ?? 'train');
  const def = goalOf(goal);
  // Late in the week only some difficulties fit a goal counted in days.
  const level = difficultyOk(goal, difficulty) ? difficulty : ((['normal', 'easy', 'hard'] as const).find((d) => difficultyOk(goal, d)) ?? 'easy');
  const target = targetFor(goal, level);
  const payout = payoutOf({ stake, difficulty: level }, bonus);
  return (
    <>
      <H right={<T dim small mono>{state.coins} 🪙</T>}>📜 {next > 1 ? `Contract #${next} this week` : 'Weekly contract'}</H>
      <T dim small>
        {next > 1
          ? 'Another goal for the rest of this week, counted from today. Same deal: reach it for the payout, a rough week refunds the stake.'
          : 'Stake coins on a goal for the rest of this week. Reach it and get double back. A rough week (low mood or period days) voids it and refunds you.'}
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
      {onCancel ? <Btn label="Not now" kind="ghost" small onPress={onCancel} /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: C.card2, borderRadius: 12, padding: 12, gap: 10 },
});
