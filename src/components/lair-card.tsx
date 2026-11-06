import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { SpiderAvatar } from '@/components/spider-avatar';
import { Btn, Card, H, Row, T } from '@/components/ui';
import { C, MONO } from '@/constants/theme';
import { LAIR, lairLeft, lairPieces, nextPiece, type LairPiece } from '@/lib/lair';
import { useStore } from '@/lib/store';

const num = (n: number) => n.toLocaleString('sv-SE');

/** The lair as a room: the pieces bought, the next one as a faint outline, the spider in the middle. */
export function LairRoom() {
  const { state } = useStore();
  const built = lairPieces(state);
  const next = nextPiece(state);
  const piece = (p: LairPiece, ghost = false) => (
    <Text key={p.id} style={[styles.piece, { left: `${p.at.x}%`, top: `${p.at.y}%`, fontSize: p.size }, ghost && styles.ghost]}>
      {p.emoji}
    </Text>
  );
  return (
    <View style={styles.room} accessible accessibilityLabel={built.length ? `The lair: ${built.map((p) => p.name).join(', ')}` : 'The lair, still empty'}>
      <View style={styles.floor} />
      {built.map((p) => piece(p))}
      {next ? piece(next, true) : null}
      <View style={styles.spider}>
        <SpiderAvatar size={40} />
      </View>
    </View>
  );
}

/** HQ: the lair, once something is in it. Tapping it opens the shop. */
export function LairCard() {
  const { state } = useStore();
  const built = lairPieces(state);
  if (!built.length) return null;
  const next = nextPiece(state);
  return (
    <Pressable onPress={() => router.push('/shop')} accessibilityRole="button" accessibilityHint="Opens the shop">
      <Card>
        <H right={<T dim small>shop →</T>}>
          🕸️ The lair · {built.length}/{LAIR.length}
        </H>
        <LairRoom />
        <T dim small>{next ? `Next: ${next.emoji} ${next.name}, ${num(next.price)} 🪙. You have ${num(state.coins)}.` : 'Complete. Every piece of it earned.'}</T>
      </Card>
    </Pressable>
  );
}

/** Shop: the lair's pieces, bought one at a time in order. */
export function LairShop() {
  const { state, actions } = useStore();
  const next = nextPiece(state);
  const have = state.lair ?? [];
  const build = (p: LairPiece) =>
    Alert.alert(`Build ${p.name}?`, `${num(p.price)} 🪙 · you have ${num(state.coins)} 🪙`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Build', onPress: () => actions.buyLairPiece() },
    ]);
  return (
    <Card>
      <H>🕸️ Spider&apos;s lair</H>
      <T dim small>
        Furniture for the spider&apos;s home, one piece at a time. Looks only. Once something is in it, the lair shows on HQ (Settings can move or hide it).
      </T>
      <LairRoom />
      {LAIR.map((p) => {
        const built = have.includes(p.id);
        const isNext = next?.id === p.id;
        return (
          <Row key={p.id}>
            <Text style={{ fontSize: 20, opacity: built || isNext ? 1 : 0.35 }}>{p.emoji}</Text>
            <T small style={[{ flex: 1 }, !built && !isNext && { color: C.dim }]}>
              {p.name}
            </T>
            {built ? (
              <Text style={styles.built}>BUILT</Text>
            ) : isNext ? (
              <Btn small kind={state.coins >= p.price ? 'primary' : 'ghost'} label={`${num(p.price)} 🪙`} onPress={() => build(p)} />
            ) : (
              <T small dim mono>
                {num(p.price)} 🪙
              </T>
            )}
          </Row>
        );
      })}
      <T dim small>{next ? `${num(lairLeft(state))} 🪙 to finish it.` : 'The lair is complete.'}</T>
    </Card>
  );
}

const styles = StyleSheet.create({
  room: { height: 150, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg, overflow: 'hidden' },
  floor: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '38%', backgroundColor: C.card2 },
  piece: { position: 'absolute' },
  ghost: { opacity: 0.18 },
  spider: { position: 'absolute', left: '50%', top: '44%', marginLeft: -20 },
  built: { color: C.green, fontFamily: MONO, fontSize: 11, fontWeight: '800' },
});
