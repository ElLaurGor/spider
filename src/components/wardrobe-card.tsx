import { Alert, Switch, Text, View } from 'react-native';

import { SpiderAvatar } from '@/components/spider-avatar';
import { Btn, Card, Chip, H, Row, T } from '@/components/ui';
import { C } from '@/constants/theme';
import { useToday } from '@/components/use-today';
import { buyable, COSMETICS, owns, shows, shownTitle, SILK_COSMETICS, SLOTS, titlesEarned, whereToGet, worn, type AvatarExtra, type Cosmetic } from '@/lib/cosmetics';
import { stageFor } from '@/lib/evolution';
import { respectFor } from '@/lib/respect';
import { editionFor, monthOf, silkBadges } from '@/lib/silk-track';
import { useStore } from '@/lib/store';
import { levelForXp, titleFor } from '@/lib/xp';

/** Shop: things for the spider to wear, plus which earned title HQ shows. Looks only. */
export function WardrobeCard() {
  const { state, actions } = useStore();
  const wearing = worn(state);
  const current = shownTitle(state);
  const levelTitle = titleFor(levelForXp(state.xp));
  // Silk Track pieces: the ones you have, plus this month's edition (the rest of the year stays out of the list).
  const today = useToday();
  const thisEdition = new Set(editionFor(monthOf(today)).rewards.map((r) => r.id));
  const listed = [...COSMETICS, ...SILK_COSMETICS.filter((c) => owns(state, c.id) || thisEdition.has(c.id))];
  const badges = silkBadges(state);
  const stage = stageFor(levelForXp(state.xp));
  const respect = respectFor(state);
  // Besides what it wears, the avatar shows its stage badge and what it thinks of you: both can go.
  const extras: { id: AvatarExtra; emoji: string; name: string }[] = [
    ...(stage.badge ? [{ id: 'badge' as const, emoji: stage.badge, name: `Level badge (${stage.name})` }] : []),
    ...(respect ? [{ id: 'respect' as const, emoji: respect.emoji, name: `What I think of you (${respect.name.toLowerCase()})` }] : []),
  ];

  const confirmBuy = (c: Cosmetic) =>
    Alert.alert(`Buy ${c.name}?`, `${c.price} 🪙 · you have ${state.coins} 🪙`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Buy', onPress: () => actions.buyCosmetic(c.id) },
    ]);

  return (
    <Card>
      <H right={<SpiderAvatar size={40} />}>Wardrobe</H>
      <T dim small>
        Looks only. Seasonal pieces are sold while their season is on, auras drop from legendary chests, a few are gifts (the Advent Web, the Prizes), and the Silk Track, co-op weeks and the trek hand out the rest.
      </T>
      {extras.length ? (
        <View style={{ gap: 8 }}>
          <T dim small mono>
            ON THE SPIDER
          </T>
          {extras.map((x) => (
            <Row key={x.id}>
              <Text style={{ fontSize: 22, opacity: shows(state, x.id) ? 1 : 0.35 }}>{x.emoji}</Text>
              <T style={{ flex: 1 }}>{x.name}</T>
              <Switch
                value={shows(state, x.id)}
                onValueChange={(v) => actions.showOnSpider(x.id, v)}
                trackColor={{ true: C.red, false: C.card2 }}
                thumbColor={C.text}
              />
            </Row>
          ))}
          <T dim small>
            Hats and held things come off with their On ✓ below.
          </T>
        </View>
      ) : null}
      {SLOTS.map((slot) => (
        <View key={slot.id} style={{ gap: 8 }}>
          <T dim small mono>
            {slot.name.toUpperCase()}
          </T>
          {listed.filter((c) => c.slot === slot.id).map((c) => {
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
      {badges.length ? (
        <>
          <T dim small mono>
            SILK BADGES
          </T>
          <Row gap={6} style={{ flexWrap: 'wrap' }}>
            {badges.map((b) => (
              <Chip key={b.id} label={`${b.emoji} ${b.name}`} />
            ))}
          </Row>
        </>
      ) : null}
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
