// The contract ledger in Records (step 8, lib/contract-log.ts): won and lost totals, net coins, the favourite
// goal and the hardest win, then the latest few. A voided (rough) week is rest, never a loss.
import { StyleSheet, Text } from 'react-native';

import { Card, H, Row, T } from '@/components/ui';
import { C, MONO } from '@/constants/theme';
import { contractLogOf, contractStats, netOf } from '@/lib/contract-log';
import { DIFFICULTIES, goalOf } from '@/lib/contracts';
import { useStore } from '@/lib/store';
import { obstacleOf } from '@/lib/woop';

const weekOf = (week: string) => new Date(`${week}T12:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toLocaleString('sv-SE')}`;
const STATUS = { won: '✅', lost: '❌', voided: '🛌' } as const;

export function ContractLedgerCard() {
  const { state } = useStore();
  const st = contractStats(state);
  if (!st.n) return null;
  const recent = contractLogOf(state).slice(-5).reverse();
  return (
    <Card accent={C.yellow}>
      <H right={<T dim small mono>{`${st.n} signed`}</T>}>📜 Contract ledger</H>
      <Row style={{ justifyContent: 'space-between' }}>
        <T>
          Won {st.won} · lost {st.lost}
          {st.rest ? ` · ${st.rest} rest week${st.rest === 1 ? '' : 's'}` : ''}
        </T>
        <Text style={[styles.value, { color: st.net >= 0 ? C.green : C.red }]}>{signed(st.net)} 🪙</Text>
      </Row>
      {st.favourite ? (
        <T dim small>
          Favourite goal: {goalOf(st.favourite.goal).title(goalOf(st.favourite.goal).target).toLowerCase()} ({st.favourite.n}×)
        </T>
      ) : null}
      {st.hardest ? (
        <T dim small>
          Hardest win: {goalOf(st.hardest.goal).title(st.hardest.target).toLowerCase()}, {DIFFICULTIES[st.hardest.difficulty].label.toLowerCase()}, week of {weekOf(st.hardest.week)}
        </T>
      ) : null}
      {recent.map((e) => (
        <Row key={`${e.week}:${e.goal}`} style={{ alignItems: 'flex-start' }}>
          <Text style={{ fontSize: 16, width: 24 }}>{STATUS[e.status]}</Text>
          <T small style={{ flex: 1 }}>
            {weekOf(e.week)} · {goalOf(e.goal).title(e.target)}
            {e.woop ? `\n🧭 ${obstacleOf(e.woop.obstacle).label}: showed up ${e.woop.showed}×, plan fired ${e.woop.fired}×` : ''}
          </T>
          <T dim small mono>
            {e.status === 'voided' ? 'rest' : `${signed(netOf(e))} 🪙`}
          </T>
        </Row>
      ))}
      <T dim small>
        Net: what wins paid beyond their stakes, minus stakes lost. Rough weeks refund the stake: rest, never a loss.
      </T>
    </Card>
  );
}

const styles = StyleSheet.create({
  value: { color: C.text, fontFamily: MONO, fontWeight: '800', fontSize: 15 },
});
