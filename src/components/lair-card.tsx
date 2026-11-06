import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { MODEL, SpiderModel } from '@/components/spider-model';
import { Terrarium3D } from '@/components/terrarium-3d';
import { useAwake } from '@/components/use-awake';
import { Btn, Card, H, Row, T } from '@/components/ui';
import { C, MONO } from '@/constants/theme';
import { worn } from '@/lib/cosmetics';
import { crashedInGl, glForgive } from '@/lib/gl-guard';
import { LAIR, LAIR_HOME, lairLeft, lairPieces, lairSpots, nextPiece, nextSpot, type LairPiece, type LairSpot } from '@/lib/lair';
import { useStore } from '@/lib/store';

const num = (n: number) => n.toLocaleString('sv-SE');

const TANK_H = 180;
const LID = 10;

/** A spot's centre (in % of the tank) as the model's top-left corner in px. */
const toPx = (spot: LairSpot, w: number) => ({ x: (w * spot.x) / 100 - MODEL / 2, y: (TANK_H * spot.y) / 100 - MODEL / 2 });
/** Off the floor: hanging on its thread or up the branch, seen from the front instead of from above. */
const raised = (spot: LairSpot) => !!spot.hang || !!spot.up;

type Layer = 'back' | 'front' | 'top';
type Blob = [x: number, y: number, w: number, h: number, color: string];

const blobs = (list: Blob[], opacity = 1) =>
  list.map(([x, y, w, h, color]) => (
    <View key={`${x}:${y}:${w}`} style={[styles.abs, { left: `${x}%`, top: `${y}%`, width: w, height: h, marginLeft: -w / 2, marginTop: -h / 2, borderRadius: h / 2, backgroundColor: color, opacity }]} />
  ));

/** How each piece looks in the tank: behind the spider, in front of it (it can hide), or on the lid. */
function PieceArt({ id, layer }: { id: string; layer: Layer }) {
  if (id === 'web' && layer === 'back') return <Text style={[styles.abs, { left: '1%', top: LID - 4, fontSize: 46, opacity: 0.5 }]}>🕸️</Text>;
  if (id === 'lamp') {
    if (layer === 'top')
      return (
        <>
          <View style={[styles.abs, { left: '60%', width: '12%', top: 0, height: LID + 3, borderRadius: 2, backgroundColor: '#5A5F68' }]} />
          <View style={[styles.abs, { left: '66%', marginLeft: -6, top: LID + 1, width: 12, height: 6, borderRadius: 3, backgroundColor: '#FFD98A' }]} />
        </>
      );
    if (layer === 'back')
      return (
        <>
          {blobs([[66, 6, 150, 150, '#FFB347']], 0.08)}
          {blobs([[66, 8, 64, 64, '#FFC56B']], 0.14)}
          {blobs([[66, 66, 96, 22, '#FFB347']], 0.12)}
        </>
      );
  }
  if (id === 'rug' && layer === 'back')
    return blobs([
      [38, 70, 26, 10, '#3F6B2F'],
      [45, 67, 30, 12, '#4F8A3A'],
      [53, 71, 24, 10, '#356027'],
      [48, 74, 34, 9, '#3A6A2C'],
      [58, 68, 16, 8, '#5C9A44'],
    ]);
  if (id === 'plant' && layer === 'back')
    return (
      <>
        <Text style={[styles.abs, { left: '77%', top: '28%', fontSize: 50 }]}>🌿</Text>
        <Text style={[styles.abs, { left: '86%', top: '38%', fontSize: 36, transform: [{ scaleX: -1 }] }]}>🌿</Text>
        <Text style={[styles.abs, { left: '73%', top: '50%', fontSize: 18 }]}>🌱</Text>
      </>
    );
  if (id === 'couch' && layer === 'front') return <Text style={[styles.abs, { left: '-1%', top: '53%', fontSize: 46 }]}>🪵</Text>;
  if (id === 'books' && layer === 'back')
    return (
      <>
        <View style={[styles.abs, styles.branch, { left: '18%', top: '44%', width: '46%' }]}>
          <View style={styles.grain} />
        </View>
        <View style={[styles.abs, styles.twig, { left: '45%', top: '33%', width: '11%' }]} />
      </>
    );
  if (id === 'rack' && layer === 'back')
    return (
      <>
        {blobs([
          [71, 69, 36, 20, '#5B5F66'],
          [81, 71, 28, 16, '#6F737A'],
          [75, 64, 24, 14, '#83878E'],
        ])}
        {blobs([[73, 61, 10, 4, '#FFFFFF']], 0.12)}
      </>
    );
  if (id === 'radio' && layer === 'back')
    return (
      <>
        {blobs([[30, 76, 50, 16, '#7A7F86']])}
        {blobs([[30, 76, 40, 10, '#3FA9FF']], 0.75)}
        {blobs([[27, 75, 12, 3, '#FFFFFF']], 0.45)}
      </>
    );
  if (id === 'fireplace') {
    if (layer === 'back') return blobs([[87, 70, 60, 60, '#9BFF8A']], 0.12);
    if (layer === 'front')
      return (
        <>
          <Text style={[styles.abs, { left: '83%', top: '62%', fontSize: 22 }]}>🍄</Text>
          <Text style={[styles.abs, { left: '90%', top: '67%', fontSize: 16 }]}>🍄</Text>
          <Text style={[styles.abs, { left: '79%', top: '70%', fontSize: 13 }]}>🍄</Text>
        </>
      );
  }
  if (id === 'arcade' && layer === 'back')
    return (
      <>
        {blobs([[56, 58, 54, 54, '#8FD3FF']], 0.14)}
        <Text style={[styles.abs, { left: '53%', top: '51%', fontSize: 22 }]}>💎</Text>
      </>
    );
  return null;
}

/** The pieces in, plus the next one as a faint outline, on one layer. */
function Pieces({ built, next, layer }: { built: LairPiece[]; next: LairPiece | null; layer: Layer }) {
  return (
    <>
      {built.map((p) => (
        <PieceArt key={p.id} id={p.id} layer={layer} />
      ))}
      {next ? (
        <View style={[styles.fill, { opacity: 0.18 }]}>
          <PieceArt id={next.id} layer={layer} />
        </View>
      ) : null}
    </>
  );
}

const PEBBLES: Blob[] = [
  [6, 88, 7, 5, '#6E6A64'],
  [15, 94, 5, 4, '#8A7F72'],
  [24, 86, 6, 4, '#4D4740'],
  [33, 92, 8, 5, '#6E6A64'],
  [44, 87, 5, 3, '#8A7F72'],
  [52, 95, 7, 5, '#4D4740'],
  [61, 89, 6, 4, '#8A7F72'],
  [70, 93, 5, 4, '#6E6A64'],
  [79, 86, 7, 4, '#4D4740'],
  [88, 92, 6, 5, '#8A7F72'],
  [95, 87, 5, 3, '#6E6A64'],
];
const SPECKS: Blob[] = [
  [10, 62, 3, 2, '#5C3F28'],
  [22, 66, 2, 2, '#3A2617'],
  [36, 60, 3, 2, '#5C3F28'],
  [61, 63, 2, 2, '#3A2617'],
  [69, 75, 3, 2, '#5C3F28'],
  [90, 61, 2, 2, '#3A2617'],
  [17, 74, 2, 2, '#5C3F28'],
  [44, 77, 3, 2, '#3A2617'],
];

/**
 * The terrarium in 3D, or drawn flat (below) if GL, three.js or a shader gives up, or if the last session crashed
 * while the 3D view was drawing (lib/gl-guard.ts); then a tap brings 3D back.
 */
export function TerrariumView() {
  const [mode, setMode] = useState<'wait' | '3d' | 'flat' | 'crashed'>('wait');
  useEffect(() => {
    let on = true;
    crashedInGl().then((crashed) => {
      if (on) setMode(crashed ? 'crashed' : '3d');
    });
    return () => {
      on = false;
    };
  }, []);
  if (mode === 'wait') return <View style={styles.waiting} />;
  if (mode === '3d') return <Terrarium3D onFail={() => setMode('flat')} />;
  return (
    <>
      <Terrarium />
      {mode === 'crashed' ? (
        <Pressable
          onPress={() => {
            glForgive();
            setMode('3d');
          }}
          accessibilityRole="button"
          hitSlop={6}>
          <T dim small>
            The 3D tank took a break after a crash. Tap here to try 3D again.
          </T>
        </Pressable>
      ) : null}
    </>
  );
}

/**
 * The flat terrarium (the fallback for TerrariumView): glass, a mesh lid, substrate with pebbles, whatever has been bought for it, and the
 * spider itself as a model. It walks from piece to piece (turning to face where it's going, smaller at the back),
 * stops a few seconds at each to do its thing, climbs the branch and hangs from the web on a thread. It rests in
 * the middle of the floor while the screen is away or motion is reduced.
 */
export function Terrarium() {
  const { state } = useStore();
  const built = lairPieces(state);
  const next = nextPiece(state);
  const ids = built.map((p) => p.id).join(',');
  const marking = worn(state).aura?.ring ?? C.red;
  const awake = useAwake();
  const [w, setW] = useState(0);
  const [pos] = useState(() => new Animated.ValueXY({ x: 0, y: 0 }));
  const [lift] = useState(() => new Animated.Value(0)); // 0 on the floor, 1 up off it
  const [heading] = useState(() => new Animated.Value(0)); // degrees, 0 = head up the screen
  const [gait] = useState(() => new Animated.Value(0));
  const [breath] = useState(() => new Animated.Value(0));
  // Further back (higher up) is smaller; on the floor it's seen from above, so it's squashed into the floor's plane.
  const [depth] = useState(() =>
    pos.y.interpolate({ inputRange: [TANK_H * 0.55 - MODEL / 2, TANK_H * 0.8 - MODEL / 2], outputRange: [0.62, 0.82], extrapolate: 'clamp' }),
  );
  const [squash] = useState(() => lift.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }));
  const [shadow] = useState(() => lift.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }));
  const [turn] = useState(() => heading.interpolate({ inputRange: [-7200, 7200], outputRange: ['-7200deg', '7200deg'] }));
  const [threadX] = useState(() => Animated.add(pos.x, MODEL / 2));
  const [threadH] = useState(() => Animated.add(pos.y, MODEL / 2 - LID));
  const [act, setAct] = useState<string | null>(null);
  const [thread, setThread] = useState(false);

  useEffect(() => {
    if (!w) return;
    const spots = lairSpots(ids ? ids.split(',') : []);
    let at = spots.find((x) => x.x === LAIR_HOME.x && x.y === LAIR_HOME.y) ?? spots[0];
    let facing = at.face ?? 0;
    pos.setValue(toPx(at, w));
    lift.setValue(raised(at) ? 1 : 0);
    heading.setValue(facing);
    if (!awake) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stepping: Animated.CompositeAnimation | null = null;
    const breathing = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breath, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    breathing.start();

    /** Turns the shortest way round to `to` degrees, legs stepping, then `done`. */
    const turnTo = (to: number, done: () => void) => {
      const delta = ((((to - facing) % 360) + 540) % 360) - 180;
      facing += delta;
      Animated.timing(heading, { toValue: facing, duration: Math.max(160, Math.abs(delta) * 3), easing: Easing.inOut(Easing.quad), useNativeDriver: true }).start(
        ({ finished }) => {
          if (alive && finished) done();
        },
      );
    };
    const walk = () => {
      if (!alive) return;
      const to = nextSpot(spots, at.id);
      const a = toPx(at, w);
      const b = toPx(to, w);
      setAct(null);
      setThread(!!at.hang || !!to.hang);
      stepping = Animated.loop(Animated.timing(gait, { toValue: 1, duration: 420, easing: Easing.linear, useNativeDriver: true }));
      stepping.start();
      turnTo((Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI + 90, () => {
        const duration = Math.min(3200, Math.max(900, Math.hypot(b.x - a.x, b.y - a.y) * 13));
        Animated.parallel([
          Animated.timing(pos, { toValue: b, duration, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
          Animated.timing(lift, { toValue: raised(to) ? 1 : 0, duration, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        ]).start(({ finished }) => {
          if (!alive || !finished) return;
          at = to;
          const settle = () => {
            stepping?.stop();
            gait.setValue(0);
            if (Math.abs(facing) > 3600) {
              facing %= 360;
              heading.setValue(facing);
            }
            setThread(!!to.hang);
            setAct(to.act ?? null);
            timer = setTimeout(walk, 3000 + Math.random() * 4000);
          };
          if (to.face != null) turnTo(to.face, settle);
          else settle();
        });
      });
    };
    timer = setTimeout(walk, 1200);
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
      pos.stopAnimation();
      lift.stopAnimation();
      heading.stopAnimation();
      stepping?.stop();
      breathing.stop();
      setAct(null); // back to the middle of the floor, doing nothing in particular
      setThread(false);
    };
  }, [w, ids, awake, pos, lift, heading, gait, breath]);

  return (
    <View
      style={styles.tank}
      onLayout={(e) => setW(Math.round(e.nativeEvent.layout.width))}
      accessible
      accessibilityLabel={built.length ? `The terrarium: the spider, ${built.map((p) => p.name).join(', ')}` : 'The terrarium: just the spider so far'}>
      <View style={styles.wallGlow} />
      <View style={styles.floor} />
      <View style={styles.rim} />
      {blobs(SPECKS)}
      <Pieces built={built} next={next} layer="back" />
      {w && awake && thread ? <Animated.View style={[styles.thread, { left: threadX, height: threadH }]} /> : null}
      {w ? (
        <Animated.View style={[styles.spider, { transform: [{ translateX: pos.x }, { translateY: pos.y }, { scale: depth }, { scaleY: squash }] }]}>
          <Animated.View style={[styles.shadow, { opacity: shadow }]} />
          <Animated.View style={{ transform: [{ rotate: turn }] }}>
            <SpiderModel gait={gait} breath={breath} marking={marking} />
          </Animated.View>
        </Animated.View>
      ) : null}
      <Pieces built={built} next={next} layer="front" />
      <View style={styles.cut} />
      {blobs(PEBBLES)}
      <View style={[styles.glare, { left: '14%', width: 14 }]} />
      <View style={[styles.glare, { left: '22%', width: 5 }]} />
      <View style={[styles.glare, { left: '84%', width: 8 }]} />
      <View style={styles.lid}>
        {Array.from({ length: Math.floor(w / 5) }, (_, i) => (
          <View key={i} style={[styles.mesh, { left: i * 5 + 2 }]} />
        ))}
      </View>
      <Pieces built={built} next={next} layer="top" />
      <View style={styles.base} />
      {w && awake && act ? (
        <Animated.View style={[styles.spider, { transform: [{ translateX: pos.x }, { translateY: pos.y }] }]}>
          <Text style={styles.act}>{act}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

/** HQ: the terrarium with the spider in it. Tapping it opens the shop. */
export function LairCard() {
  const { state } = useStore();
  const built = lairPieces(state);
  const next = nextPiece(state);
  return (
    <Pressable onPress={() => router.push('/shop')} accessibilityRole="button" accessibilityHint="Opens the shop">
      <Card>
        <H right={<T dim small>shop →</T>}>
          🕸️ Terrarium · {built.length}/{LAIR.length}
        </H>
        <TerrariumView />
        <T dim small>
          {!built.length
            ? `Just the spider so far. First up: ${next?.emoji} ${next?.name}, ${num(next?.price ?? 0)} 🪙 in the shop.`
            : next
              ? `Next: ${next.emoji} ${next.name}, ${num(next.price)} 🪙. You have ${num(state.coins)}.`
              : 'Complete. Every piece of it earned.'}
        </T>
      </Card>
    </Pressable>
  );
}

/** Shop: the terrarium's pieces, bought one at a time in order. */
export function LairShop() {
  const { state, actions } = useStore();
  const next = nextPiece(state);
  const have = state.lair ?? [];
  const add = (p: LairPiece) =>
    Alert.alert(`Add ${p.name}?`, `${num(p.price)} 🪙 · you have ${num(state.coins)} 🪙`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Add', onPress: () => actions.buyLairPiece() },
    ]);
  return (
    <Card>
      <H>🕸️ Terrarium</H>
      <T dim small>
        The spider&apos;s home, one piece at a time. It walks to each one and uses it; drag sideways to turn the tank. Looks only. The terrarium lives on HQ (Settings can move or hide it).
      </T>
      <TerrariumView />
      {LAIR.map((p) => {
        const inside = have.includes(p.id);
        const isNext = next?.id === p.id;
        return (
          <Row key={p.id}>
            <Text style={{ fontSize: 20, opacity: inside || isNext ? 1 : 0.35 }}>{p.emoji}</Text>
            <T small style={[{ flex: 1 }, !inside && !isNext && { color: C.dim }]}>
              {p.name}
            </T>
            {inside ? (
              <Text style={styles.inside}>IN</Text>
            ) : isNext ? (
              <Btn small kind={state.coins >= p.price ? 'primary' : 'ghost'} label={`${num(p.price)} 🪙`} onPress={() => add(p)} />
            ) : (
              <T small dim mono>
                {num(p.price)} 🪙
              </T>
            )}
          </Row>
        );
      })}
      <T dim small>{next ? `${num(lairLeft(state))} 🪙 to finish it.` : 'The terrarium is complete.'}</T>
    </Card>
  );
}

const styles = StyleSheet.create({
  waiting: { height: 210, borderRadius: 12, backgroundColor: C.card },
  tank: { height: TANK_H, borderRadius: 10, borderWidth: 2, borderColor: '#3C424D', backgroundColor: '#0E1B17', overflow: 'hidden' },
  abs: { position: 'absolute' },
  fill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, pointerEvents: 'none' },
  wallGlow: { position: 'absolute', left: 0, right: 0, top: LID, height: 40, backgroundColor: '#FFFFFF', opacity: 0.025 },
  floor: { position: 'absolute', left: 0, right: 0, top: '56%', bottom: 0, backgroundColor: '#4A3220' },
  rim: { position: 'absolute', left: 0, right: 0, top: '56%', height: 3, backgroundColor: '#5E4129' },
  cut: { position: 'absolute', left: 0, right: 0, top: '80%', bottom: 0, backgroundColor: '#2E1E12', borderTopWidth: 2, borderTopColor: '#22160D' },
  branch: { height: 7, borderRadius: 4, backgroundColor: '#6B4A2F', transform: [{ rotate: '-28deg' }] },
  grain: { position: 'absolute', left: 6, right: 6, top: 3, height: 1, backgroundColor: '#4A3220' },
  twig: { height: 4, borderRadius: 2, backgroundColor: '#5C3F28', transform: [{ rotate: '-70deg' }] },
  spider: { position: 'absolute', left: 0, top: 0, width: MODEL, height: MODEL },
  shadow: { position: 'absolute', left: MODEL / 2 - 22, top: MODEL / 2 - 16, width: 44, height: 40, borderRadius: 22, backgroundColor: '#000000' },
  thread: { position: 'absolute', top: LID, width: 1, backgroundColor: '#D8DEE9', opacity: 0.55 },
  glare: { position: 'absolute', top: -40, height: TANK_H + 80, backgroundColor: '#FFFFFF', opacity: 0.045, transform: [{ rotate: '22deg' }], pointerEvents: 'none' },
  lid: { position: 'absolute', left: 0, right: 0, top: 0, height: LID, backgroundColor: '#2B3038' },
  mesh: { position: 'absolute', top: 1, bottom: 1, width: 1, backgroundColor: '#6B7280', opacity: 0.35 },
  base: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 5, backgroundColor: '#2B3038' },
  act: { position: 'absolute', left: MODEL / 2 + 6, top: MODEL / 2 - 30, fontSize: 15 },
  inside: { color: C.green, fontFamily: MONO, fontSize: 11, fontWeight: '800' },
});
