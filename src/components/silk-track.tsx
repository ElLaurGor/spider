import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Bar, Card, H, Row, T } from '@/components/ui';
import { useToday } from '@/components/use-today';
import { C } from '@/constants/theme';
import { editionFor, monthOf, nextMonth, SILK_TIERS, silkStatus, tierXp, type SilkReward } from '@/lib/silk-track';
import { useStore } from '@/lib/store';

const KIND: Record<SilkReward['kind'], string> = { hat: 'Hat', held: 'Held', aura: 'Aura', title: 'Title', badge: 'Badge' };

/** Days left in the month of `today` (a day key), today included. */
const daysLeft = (today: string) => {
  const [y, m, d] = today.split('-').map(Number);
  return new Date(y, m, 0).getDate() - d + 1;
};

/** HQ: this month's Silk Track at a glance. Tap for the whole track in the shop. */
export function SilkTrackCard() {
  const { state } = useStore();
  const today = useToday();
  const st = silkStatus(state, monthOf(today));
  const ed = st.edition;
  const left = daysLeft(today);
  return (
    <Pressable onPress={() => router.push('/shop')}>
      <Card accent={ed.color}>
        <H right={<T dim small>{`tier ${st.tier}/${SILK_TIERS} →`}</T>}>{`${ed.emoji} Silk Track · ${ed.name}`}</H>
        {st.next ? (
          <>
            <Bar pct={st.progress} color={ed.color} height={8} />
            <Row>
              <Text style={{ fontSize: 22 }}>{st.next.reward.emoji}</Text>
              <T small style={{ flex: 1 }}>
                {`Next: ${st.next.reward.name} at ${st.next.xp.toLocaleString('sv-SE')} XP · ${st.xp.toLocaleString('sv-SE')} so far`}
              </T>
            </Row>
            <T dim small>
              {left === 1 ? 'Last day of this edition.' : `${left} days left in this edition. Missed days cost nothing.`}
            </T>
          </>
        ) : (
          <T small>{`All ${SILK_TIERS} tiers done. ${editionFor(nextMonth(monthOf(today))).name} starts on the 1st.`}</T>
        )}
      </Card>
    </Pressable>
  );
}

/** Shop: every tier of this month's edition, and a look at next month's. */
export function SilkTrackSection() {
  const { state } = useStore();
  const today = useToday();
  const st = silkStatus(state, monthOf(today));
  const ed = st.edition;
  const upcoming = editionFor(nextMonth(monthOf(today)));
  const topPrize = upcoming.rewards[SILK_TIERS - 1];
  return (
    <Card accent={ed.color}>
      <H right={<T dim small>{`${st.xp.toLocaleString('sv-SE')} XP`}</T>}>{`${ed.emoji} Silk Track · ${ed.name}`}</H>
      <T dim small>
        {`${ed.tagline} Every XP you earn this month fills the track, and each tier hands out something to keep. On the 1st a new edition starts from zero; what you unlocked stays yours.`}
      </T>
      {ed.rewards.map((r) => {
        const done = r.tier <= st.tier;
        const isNext = r.tier === st.tier + 1;
        return (
          <Row key={r.tier} style={{ opacity: done || isNext ? 1 : 0.5 }}>
            <Text style={{ width: 28, color: isNext ? ed.color : C.dim, fontWeight: '700' }}>{r.tier}</Text>
            <Text style={{ fontSize: 20 }}>{r.emoji}</Text>
            <View style={{ flex: 1 }}>
              <T small>{r.name}</T>
              <T dim small>
                {`${KIND[r.kind]} · ${tierXp(r.tier).toLocaleString('sv-SE')} XP`}
              </T>
            </View>
            <T small style={{ color: done ? C.green : isNext ? ed.color : C.dim }}>
              {done ? '✓' : isNext ? 'next' : ''}
            </T>
          </Row>
        );
      })}
      <View style={{ gap: 4, paddingTop: 6 }}>
        <T dim small mono>
          NEXT MONTH
        </T>
        <Row>
          <Text style={{ fontSize: 22 }}>{upcoming.emoji}</Text>
          <View style={{ flex: 1 }}>
            <T small>{upcoming.name}</T>
            <T dim small>
              {`${upcoming.tagline} Top prize: ${topPrize.emoji} ${topPrize.name}.`}
            </T>
          </View>
        </Row>
      </View>
    </Card>
  );
}
