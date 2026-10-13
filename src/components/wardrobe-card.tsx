import { Alert, Text, View } from 'react-native';

import { SpiderAvatar } from '@/components/spider-avatar';
import { Btn, Card, Chip, H, Row, T } from '@/components/ui';
import { C } from '@/constants/theme';
import { buyable, COSMETICS, owns, shownTitle, SLOTS, titlesEarned, whereToGet, worn, type Cosmetic } from '@/lib/cosmetics';
import { useStore } from '@/lib/store';
import { levelForXp, titleFor } from '@/lib/xp';

/** Shop: things for the spider to wear, plus which earned title HQ shows. Looks only. */
export function WardrobeCard() {
  const { state, actions } = useStore();
  const wearing = worn(state);
  const current = shownTitle(state);
  const levelTitle = titleFor(levelForXp(state.xp));

  const confirmBuy = (c: Cosmetic) =>
    Alert.alert(`Buy ${c.name}?`, `${c.price} 🪙 · you have ${state.coins} 🪙`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Buy', onPress: () => actions.buyCosmetic(c.id) },
    ]);

  return (
    <Card>
      <H right={<SpiderAvatar size={40} />}>Wardrobe</H>
      <T dim small>
        Looks only. Seasonal pieces are sold while their season is on, auras only drop from legendary chests.
      </T>
      {SLOTS.map((slot) => (
        <View key={slot.id} style={{ gap: 8 }}>
          <T dim small mono>
            {slot.name.toUpperCase()}
          </T>
          {COSMETICS.filter((c) => c.slot === slot.id).map((c) => {
            const have = owns(state, c.id);
            const on = wearing[slot.id]?.id === c.id;
            const forSale = !have && c.price != null && buyable(c);
            return (
              <Row key={c.id}>
                <Text style={{ fontSize: 22, opacity: have || forSale ? 1 : 0.35 }}>{c.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <T>{c.name}</T>
                  {!have && !forSale ? (
                    <T dim small>
                      {whereToGet(c)}
                    </T>
                  ) : null}
                </View>
                {have ? (
                  <Btn small kind={on ? 'primary' : 'ghost'} label={on ? 'On ✓' : 'Wear'} onPress={() => actions.wearCosmetic(slot.id, on ? null : c.id)} />
                ) : forSale ? (
                  <Btn small kind={state.coins >= (c.price ?? 0) ? 'primary' : 'ghost'} label={`${c.price} 🪙`} onPress={() => confirmBuy(c)} />
                ) : null}
              </Row>
            );
          })}
        </View>
      ))}
      <T dim small mono>
        TITLE ON HQ
      </T>
      <Row gap={6} style={{ flexWrap: 'wrap' }}>
        {titlesEarned(state).map((t) => (
          <Chip key={t} label={t} active={current === t} color={C.purple} onPress={() => actions.setTitle(t === levelTitle ? null : t)} />
        ))}
      </Row>
    </Card>
  );
}
