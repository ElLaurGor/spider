import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, H, T } from '@/components/ui';
import { C, MONO } from '@/constants/theme';
import { caughtCount, CATCH_MS, FLIES, LEGENDARY_BOMB, RARITY, type Rarity } from '@/lib/critters';
import { useStore } from '@/lib/store';

const RARITY_COLOR: Record<Rarity, string> = { common: C.dim, rare: C.cyan, epic: C.purple, legendary: C.yellow };
const ORDER: Rarity[] = ['common', 'rare', 'epic', 'legendary'];

export default function FliesScreen() {
  const { state } = useStore();
  const got = state.flies ?? {};
  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }}>
      <Card accent={C.yellow}>
        <H right={<Text style={styles.count}>{`${caughtCount(state)}/${FLIES.length}`}</Text>}>🪰 Fly collection</H>
        <T dim small>
          Now and then, logging something makes a fly turn up. Some only appear when you do something specific. You have {CATCH_MS / 60_000} minutes to catch it, at most twice a
          day. Legendary ones also drop {LEGENDARY_BOMB} boss damage.
        </T>
      </Card>
      {ORDER.map((rarity) => (
        <Card key={rarity}>
          <H right={<Text style={[styles.count, { color: RARITY_COLOR[rarity] }]}>{`+${RARITY[rarity].coins} 🪙`}</Text>}>{RARITY[rarity].label}</H>
          <View style={styles.grid}>
            {FLIES.filter((f) => f.rarity === rarity).map((f) => {
              const mine = got[f.id];
              return (
                <View key={f.id} style={[styles.cell, mine && { borderColor: RARITY_COLOR[rarity] }]}>
                  <Text style={[styles.emoji, !mine && { opacity: 0.25 }]}>{mine ? f.emoji : '❔'}</Text>
                  <Text style={[styles.name, !mine && { color: C.dim }]} numberOfLines={2}>
                    {mine ? f.name : '???'}
                  </Text>
                  <Text style={styles.sub} numberOfLines={3}>
                    {mine ? `×${mine.count} · since ${new Date(mine.firstAt).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}` : f.hint}
                  </Text>
                </View>
              );
            })}
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  count: { color: C.yellow, fontFamily: MONO, fontSize: 13, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: { width: '48.5%', backgroundColor: C.card2, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 10, gap: 2 },
  emoji: { fontSize: 26 },
  name: { color: C.text, fontSize: 14, fontWeight: '700' },
  sub: { color: C.dim, fontSize: 12, lineHeight: 16 },
});
