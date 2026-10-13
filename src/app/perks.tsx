import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Btn, Card, H, Icon, Row, T } from '@/components/ui';
import { C, MONO } from '@/constants/theme';
import { BRANCHES, hasPerk, perkBlocker, perkPoints, perkPointsSpent, PERKS, RESPEC_COST } from '@/lib/perks';
import { useStore } from '@/lib/store';

/** Spider abilities: one point per level, three branches that unlock in order. */
export default function PerksScreen() {
  const { state, actions } = useStore();
  const points = perkPoints(state);
  const spent = perkPointsSpent(state);

  const confirmRespec = () =>
    Alert.alert('Reset abilities?', `All ${spent} points come back to spend again. Costs ${RESPEC_COST} 🪙 · you have ${state.coins} 🪙`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', onPress: actions.respecPerks },
    ]);

  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }}>
      <Card accent={C.purple} style={{ alignItems: 'center' }}>
        <Text style={styles.points}>✨ {points}</Text>
        <T dim small>
          {points === 1 ? 'point' : 'points'} to spend · one per level · {spent} spent
        </T>
        <T dim small style={{ textAlign: 'center' }}>
          Each branch unlocks in order. Small boosts only: coins, gaming time and boss damage. Never extra XP.
        </T>
      </Card>

      {BRANCHES.map((b) => (
        <Card key={b.id}>
          <H>
            {b.emoji} {b.name}
          </H>
          {PERKS.filter((p) => p.branch === b.id).map((p) => {
            const owned = hasPerk(state, p.id);
            const blocker = owned ? null : perkBlocker(state, p.id);
            return (
              <Row key={p.id} style={{ alignItems: 'flex-start' }}>
                <Text style={{ fontSize: 24, opacity: owned || !blocker ? 1 : 0.5 }}>{p.emoji}</Text>
                <View style={{ flex: 1, gap: 2 }}>
                  <T style={owned ? { color: C.purple, fontWeight: '700' } : { fontWeight: '700' }}>{p.name}</T>
                  <T dim small>
                    {p.desc}
                  </T>
                  {blocker ? (
                    <T small style={{ color: C.faint }}>
                      {blocker}
                    </T>
                  ) : null}
                </View>
                {owned ? (
                  <Icon name="check_circle" color={C.green} />
                ) : (
                  <Btn small label={`${p.cost} pt`} kind={blocker ? 'ghost' : 'primary'} disabled={!!blocker} onPress={() => actions.takePerk(p.id)} />
                )}
              </Row>
            );
          })}
        </Card>
      ))}

      {spent > 0 ? <Btn label={`Reset abilities · ${RESPEC_COST} 🪙`} icon="undo" kind="ghost" onPress={confirmRespec} /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  points: { color: C.purple, fontSize: 40, fontWeight: '900', fontFamily: MONO },
});
