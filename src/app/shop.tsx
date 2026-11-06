import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BossRivalsCard } from '@/components/boss-rivals-card';
import { ChestReveal } from '@/components/hq-extras';
import { LairShop } from '@/components/lair-card';
import { Btn, Card, Chip, Field, H, Icon, Row, Stepper, T, useNow } from '@/components/ui';
import { useToday } from '@/components/use-today';
import { SilkTrackSection } from '@/components/silk-track';
import { WardrobeCard } from '@/components/wardrobe-card';
import { C, MONO } from '@/constants/theme';
import { CHEST_KEY_COST, QUEST_CARD_COST, REWARD_IDEAS, shopPrice, SHOP_ITEMS } from '@/lib/economy';
import { isChoreSkip } from '@/lib/chores'; // step 9 admin: a chore pass
import { bossFor, questCardBlocker } from '@/lib/quests';
import { bankRate, perkPoints } from '@/lib/perks';
import { dayOf } from '@/lib/selectors';
import { useStore } from '@/lib/store';
import type { ChestPrize } from '@/lib/types';

const EMOJIS = ['🍕', '🛋️', '🎮', '🧋', '🍿', '🥡', '😴', '🛍️', '🧹', '🎬', '🍰', '🎟️', '🥐', '📚', '💆', '🧖'];

export default function ShopScreen() {
  const { state, actions } = useStore();
  const bossDown = bossFor(state).defeated; // a bomb on a fallen boss would just be wasted coins
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [cost, setCost] = useState(500);
  const now = useNow(30_000);
  const today = dayOf(state, useToday());
  const [keyPrize, setKeyPrize] = useState<ChestPrize | null>(null);
  const cardBlocked = questCardBlocker(state, new Date(now));
  const doubleLeft = state.doubleXpUntil && state.doubleXpUntil > now ? Math.ceil((state.doubleXpUntil - now) / 60_000) : 0;
  const bank = bankRate(state);
  const points = perkPoints(state);

  const confirmBuy = (label: string, price: number, buy: () => void) =>
    Alert.alert(`Buy ${label}?`, `${price} 🪙 · you have ${state.coins} 🪙`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Buy', onPress: buy },
    ]);

  const add = () => {
    if (!title.trim()) return;
    actions.addReward({ title: title.trim(), emoji, cost });
    setTitle('');
    setAdding(false);
  };

  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
      <Card accent={C.yellow} style={{ alignItems: 'center' }}>
        <Text style={styles.coins}>🪙 {state.coins.toLocaleString('sv-SE')}</Text>
        <T dim small style={{ textAlign: 'center' }}>
          Every XP you earn gives 1 coin. Finishing all daily quests opens a loot chest. Bonus gaming minutes you don&apos;t use are banked
          at midnight: {bank.rate} 🪙 each, up to {bank.cap} a day.
        </T>
        {doubleLeft ? <T style={{ color: C.yellow }}>⚡ Double XP active · {doubleLeft} min left</T> : null}
      </Card>

      <Card>
        <H>Power-ups</H>
        {SHOP_ITEMS.map((i) => {
          const cost = shopPrice(i.id, state.perks);
          if (i.id === 'bomb' && bossDown) {
            return (
              <Row key={i.id}>
                <Text style={{ fontSize: 22 }}>{i.emoji}</Text>
                <T dim style={{ flex: 1 }}>
                  {i.title} · this week&apos;s boss is already down
                </T>
              </Row>
            );
          }
          return (
            <Row key={i.id}>
              <Text style={{ fontSize: 22 }}>{i.emoji}</Text>
              <T style={{ flex: 1 }}>{i.title}</T>
              <Btn label={`${cost} 🪙`} small kind={state.coins >= cost ? 'primary' : 'ghost'} onPress={() => confirmBuy(i.title, cost, () => actions.buyItem(i.id))} />
            </Row>
          );
        })}
        <Row>
          <Text style={{ fontSize: 22 }}>🗝️</Text>
          <View style={{ flex: 1 }}>
            <T>Chest key: open a loot chest now</T>
            <T dim small>
              {today.keyChest ? `Today's key chest: ${today.keyChest.text}. Next key tomorrow.` : 'One a day. A normal chest, odds and pity included.'}
            </T>
          </View>
          {today.keyChest ? null : (
            <Btn
              label={`${CHEST_KEY_COST} 🪙`}
              small
              kind={state.coins >= CHEST_KEY_COST ? 'primary' : 'ghost'}
              onPress={() => confirmBuy('a chest key', CHEST_KEY_COST, () => setKeyPrize(actions.buyChestKey()))}
            />
          )}
        </Row>
        <Row>
          <Text style={{ fontSize: 22 }}>🃏</Text>
          <View style={{ flex: 1 }}>
            <T>Quest card: keep 4 quests today</T>
            <T dim small>
              {cardBlocked ?? 'A fourth quest from the morning pick. All four count towards the chest.'}
            </T>
          </View>
          {cardBlocked ? null : (
            <Btn
              label={`${QUEST_CARD_COST} 🪙`}
              small
              kind={state.coins >= QUEST_CARD_COST ? 'primary' : 'ghost'}
              onPress={() => confirmBuy('a quest card', QUEST_CARD_COST, () => actions.buyQuestCard())}
            />
          )}
        </Row>
      </Card>
      <ChestReveal prize={keyPrize} onClose={() => setKeyPrize(null)} />

      <Btn
        label={points ? `✨ Abilities · ${points} point${points > 1 ? 's' : ''} to spend` : '✨ Abilities'}
        kind={points ? 'primary' : 'ghost'}
        onPress={() => router.push('/perks')}
      />

      <BossRivalsCard />

      <LairShop />

      <SilkTrackSection />

      <WardrobeCard />

      <Card>
        <H
          right={
            <Pressable onPress={() => setAdding(!adding)} hitSlop={8}>
              <Text style={styles.link}>{adding ? 'Cancel' : '+ Add'}</Text>
            </Pressable>
          }>
          Your real-life rewards
        </H>
        <T dim small>
          Set your own prices for treats, then earn them. Buying one is your permission slip.
        </T>
        {state.rewards.map((r) => (
          <Row key={r.id}>
            <Text style={{ fontSize: 22 }}>{r.emoji}</Text>
            <T style={{ flex: 1 }}>{r.title}</T>
            <Btn label={`${r.cost} 🪙`} small kind={state.coins >= r.cost ? 'primary' : 'ghost'} onPress={() => confirmBuy(r.title, r.cost, () => (isChoreSkip(r) ? actions.buyChoreSkip(r.id) : actions.buyReward(r.id)))} />
            <Pressable onPress={() => actions.deleteReward(r.id)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Delete ${r.title}`}>
              <Icon name="close" size={18} color={C.faint} />
            </Pressable>
          </Row>
        ))}
        {adding ? (
          <View style={styles.form}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {EMOJIS.map((e) => (
                <Pressable key={e} onPress={() => setEmoji(e)} style={[styles.emoji, emoji === e && { borderColor: C.yellow, backgroundColor: '#3A2C08' }]}>
                  <Text style={{ fontSize: 20 }}>{e}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Field value={title} onChangeText={setTitle} placeholder="e.g. Sushi dinner" />
            <Row style={{ justifyContent: 'space-between' }}>
              <T small>Price</T>
              <Stepper value={cost} step={100} min={100} max={20000} onChange={setCost} format={(v) => `${v} 🪙`} />
            </Row>
            <Btn label="Add reward" icon="add" onPress={add} disabled={!title.trim()} />
            <T dim small>
              Ideas:
            </T>
            <Row gap={6} style={{ flexWrap: 'wrap' }}>
              {REWARD_IDEAS.map((i) => (
                <Chip
                  key={i.title}
                  label={`${i.emoji} ${i.title}`}
                  onPress={() => {
                    setTitle(i.title);
                    setEmoji(i.emoji);
                    setCost(i.cost);
                  }}
                />
              ))}
            </Row>
          </View>
        ) : null}
      </Card>

      {state.purchases.length > 0 ? (
        <Card>
          <H>Bought</H>
          {[...state.purchases]
            .reverse()
            .slice(0, 10)
            .map((p) => (
              <Row key={p.id}>
                <Text style={{ fontSize: 18 }}>{p.emoji}</Text>
                <T small style={{ flex: 1 }}>
                  {p.title}
                </T>
                <T small dim mono>
                  {new Date(p.at).toLocaleDateString('sv-SE').slice(5)} · {p.cost} 🪙
                </T>
              </Row>
            ))}
        </Card>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  coins: { color: C.yellow, fontSize: 40, fontWeight: '900', fontFamily: MONO },
  link: { color: C.red, fontWeight: '700', fontSize: 13 },
  form: { gap: 10, backgroundColor: C.card2, borderRadius: 12, padding: 12 },
  emoji: { width: 40, height: 40, borderRadius: 10, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
});
