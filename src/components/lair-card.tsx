import { router, useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Alert, Animated, AppState, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { SpiderAvatar } from '@/components/spider-avatar';
import { Btn, Card, H, Row, T } from '@/components/ui';
import { C, MONO } from '@/constants/theme';
import { LAIR, LAIR_HOME, lairLeft, lairPieces, lairSpots, nextPiece, nextSpot, type LairPiece, type LairSpot } from '@/lib/lair';
import { useStore } from '@/lib/store';

const num = (n: number) => n.toLocaleString('sv-SE');

const ROOM_H = 150;
const SPIDER = 40;
/** A spot's centre (in % of the room) as the spider's top-left corner in px. */
const toPx = (spot: LairSpot, w: number) => ({ x: (w * spot.x) / 100 - SPIDER / 2, y: (ROOM_H * spot.y) / 100 - SPIDER / 2 });
const onFloor = (spot: LairSpot) => spot.y >= 60;

/** The spider may walk while its screen is showing, the app is in front, and the phone doesn't ask for less motion. */
function useLairAwake() {
  const focused = useIsFocused();
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [still, setStill] = useState(false);
  useEffect(() => {
    const app = AppState.addEventListener('change', (st) => setActive(st === 'active'));
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setStill);
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setStill)
      .catch(() => {});
    return () => {
      app.remove();
      motion.remove();
    };
  }, []);
  return focused && active && !still;
}

/**
 * The lair as a room: the pieces bought, the next one as a faint outline, and the spider walking between them.
 * At each piece it stops a few seconds and does its thing (a game at the arcade, a nap on the sofa); from the web
 * and the lamp it hangs on a thread. It sits still in the middle when the screen is away or motion is reduced.
 */
export function LairRoom() {
  const { state } = useStore();
  const built = lairPieces(state);
  const next = nextPiece(state);
  const ids = built.map((p) => p.id).join(',');
  const awake = useLairAwake();
  const [w, setW] = useState(0);
  const [pos] = useState(() => new Animated.ValueXY({ x: 0, y: 0 }));
  const [hop] = useState(() => new Animated.Value(0));
  const [threadX] = useState(() => Animated.add(pos.x, SPIDER / 2));
  const [threadH] = useState(() => Animated.add(pos.y, SPIDER / 2));
  const [act, setAct] = useState<string | null>(null);
  const [facing, setFacing] = useState<1 | -1>(1);
  const [thread, setThread] = useState(false);

  useEffect(() => {
    if (!w) return;
    const spots = lairSpots(ids ? ids.split(',') : []);
    let at = spots.find((x) => x.x === LAIR_HOME.x && x.y === LAIR_HOME.y) ?? spots[0];
    pos.setValue(toPx(at, w));
    if (!awake) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let hopping: Animated.CompositeAnimation | null = null;
    const walk = () => {
      if (!alive) return;
      const to = nextSpot(spots, at.id);
      const a = toPx(at, w);
      const b = toPx(to, w);
      setAct(null);
      setThread(!!at.hang || !!to.hang);
      if (b.x !== a.x) setFacing(b.x < a.x ? -1 : 1);
      // Little hops across the floor; climbing up a wall or a thread is one smooth glide.
      if (onFloor(at) && onFloor(to)) {
        hopping = Animated.loop(
          Animated.sequence([
            Animated.timing(hop, { toValue: -3, duration: 130, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.timing(hop, { toValue: 0, duration: 130, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          ]),
        );
        hopping.start();
      }
      const duration = Math.min(2600, Math.max(700, Math.hypot(b.x - a.x, b.y - a.y) * 10));
      Animated.timing(pos, { toValue: b, duration, easing: Easing.inOut(Easing.quad), useNativeDriver: false }).start(({ finished }) => {
        hopping?.stop();
        hop.setValue(0);
        if (!alive || !finished) return;
        at = to;
        setThread(!!to.hang);
        setAct(to.act ?? null);
        timer = setTimeout(walk, 2500 + Math.random() * 3500);
      });
    };
    timer = setTimeout(walk, 1500);
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
      pos.stopAnimation();
      hopping?.stop();
      setAct(null); // it comes back to the middle of the floor, empty-handed
      setThread(false);
    };
  }, [w, ids, awake, pos, hop]);

  const piece = (p: LairPiece, ghost = false) => (
    <Text key={p.id} style={[styles.piece, { left: `${p.at.x}%`, top: `${p.at.y}%`, fontSize: p.size }, ghost && styles.ghost]}>
      {p.emoji}
    </Text>
  );
  return (
    <View
      style={styles.room}
      onLayout={(e) => setW(Math.round(e.nativeEvent.layout.width))}
      accessible
      accessibilityLabel={built.length ? `The lair: ${built.map((p) => p.name).join(', ')}` : 'The lair, still empty'}>
      <View style={styles.floor} />
      {built.map((p) => piece(p))}
      {next ? piece(next, true) : null}
      {w && awake && thread ? <Animated.View style={[styles.thread, { left: threadX, height: threadH }]} /> : null}
      {w ? (
        <Animated.View style={[styles.spider, { transform: pos.getTranslateTransform() }]}>
          <Animated.View style={{ transform: [{ translateY: hop }, { scaleX: facing }] }}>
            <SpiderAvatar size={SPIDER} />
          </Animated.View>
          {awake && act ? <Text style={styles.act}>{act}</Text> : null}
        </Animated.View>
      ) : null}
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
  room: { height: ROOM_H, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg, overflow: 'hidden' },
  floor: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '38%', backgroundColor: C.card2 },
  piece: { position: 'absolute' },
  ghost: { opacity: 0.18 },
  spider: { position: 'absolute', left: 0, top: 0 },
  thread: { position: 'absolute', top: 0, width: 1, backgroundColor: C.dim, opacity: 0.7 },
  act: { position: 'absolute', top: -14, right: -12, fontSize: 16 },
  built: { color: C.green, fontFamily: MONO, fontSize: 11, fontWeight: '800' },
});
