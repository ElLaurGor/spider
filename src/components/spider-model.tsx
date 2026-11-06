import { Animated, StyleSheet, View } from 'react-native';

/** The model's own box: drawn head up, centred here. Legs reach past it. */
export const MODEL = 72;

const BODY = '#2A1F1B';
const RIM = '#4A3A33';
const FEMUR = '#3A2B25';
const TIBIA = '#2C211C';
const JOINT = '#7A5E4C';
const EYE = '#0A0A0A';

/** One leg (or pedipalp) of the right side, from where it joins the body: thigh, knee, shin. `phase` 0 or 0.5 sets which half of the gait it steps in. */
type LegSpec = { y: number; x: number; angle: number; bend: number; l1: number; l2: number; w: number; phase: 0 | 0.5; swing: number; knee?: boolean };

// Right side, head up: 0° points right, positive turns down (backwards). Front legs reach forward, back legs back.
const LEGS: LegSpec[] = [
  { x: 41, y: 25, angle: -58, bend: -20, l1: 16, l2: 24, w: 4, phase: 0, swing: 14, knee: true },
  { x: 42, y: 28, angle: -22, bend: -10, l1: 15, l2: 20, w: 4, phase: 0.5, swing: 14, knee: true },
  { x: 42, y: 31, angle: 14, bend: 12, l1: 15, l2: 20, w: 4, phase: 0, swing: 14, knee: true },
  { x: 41, y: 34, angle: 48, bend: 20, l1: 16, l2: 24, w: 4, phase: 0.5, swing: 14, knee: true },
];
// The pedipalps: short feelers by the fangs, no knee to speak of.
const PALP: LegSpec = { x: 38, y: 21, angle: -72, bend: -14, l1: 5, l2: 5, w: 2.6, phase: 0, swing: 5 };

const deg = (n: number) => `${n}deg`;

function Leg({ spec, gait, flip }: { spec: LegSpec; gait: Animated.Value; flip: boolean }) {
  // The left side is the right one mirrored, stepping in the other half of the gait (an alternating tetrapod).
  const sign = (spec.phase === 0) !== flip ? 1 : -1;
  const s = spec.swing * sign;
  const { angle: a, bend: b } = spec;
  const range = [0, 0.25, 0.5, 0.75, 1];
  const thigh = gait.interpolate({ inputRange: range, outputRange: [a, a + s, a, a - s, a].map(deg) });
  const shin = gait.interpolate({ inputRange: range, outputRange: [b, b - s * 0.4, b, b + s * 0.4, b].map(deg) });
  const w2 = spec.w * 0.75;
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: spec.x,
        top: spec.y - spec.w / 2,
        width: spec.l1,
        height: spec.w,
        borderRadius: spec.w / 2,
        backgroundColor: FEMUR,
        transformOrigin: 'left center',
        transform: [{ rotate: thigh }],
      }}>
      <Animated.View
        style={{
          position: 'absolute',
          left: spec.l1 - spec.w * 0.4,
          top: (spec.w - w2) / 2,
          width: spec.l2,
          height: w2,
          borderRadius: w2 / 2,
          backgroundColor: TIBIA,
          transformOrigin: 'left center',
          transform: [{ rotate: shin }],
        }}>
        <View style={[styles.tip, { left: spec.l2 - 2, top: w2 / 2 - 1 }]} />
      </Animated.View>
      {spec.knee ? <View style={[styles.knee, { left: spec.l1 - 1.8, top: spec.w / 2 - 1.8 }]} /> : null}
    </Animated.View>
  );
}

function Side({ gait, flip }: { gait: Animated.Value; flip: boolean }) {
  return (
    <View style={[styles.side, flip && styles.mirror]}>
      {LEGS.map((l) => (
        <Leg key={l.y} spec={l} gait={gait} flip={flip} />
      ))}
      <Leg spec={PALP} gait={gait} flip={flip} />
    </View>
  );
}

/**
 * The spider as a little model, seen from above, head up: eight jointed legs stepping in a real spider's gait
 * while `gait` runs 0→1, a body that breathes with `breath` (0–1), and its markings in `marking`.
 */
export function SpiderModel({ gait, breath, marking }: { gait: Animated.Value; breath: Animated.Value; marking: string }) {
  const swell = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });
  return (
    <View style={styles.box}>
      <Side gait={gait} flip={false} />
      <Side gait={gait} flip />
      <Animated.View style={[styles.abdomen, { transform: [{ scale: swell }] }]}>
        <View style={[styles.chevron, { top: 6, width: 6, height: 6, marginLeft: -3, backgroundColor: marking }]} />
        <View style={[styles.chevron, { top: 13, width: 7, height: 7, marginLeft: -3.5, backgroundColor: marking }]} />
        <View style={[styles.chevron, { top: 21, width: 5, height: 5, marginLeft: -2.5, backgroundColor: marking }]} />
        <View style={[styles.dot, { left: 5, backgroundColor: marking }]} />
        <View style={[styles.dot, { right: 5, backgroundColor: marking }]} />
        <View style={styles.shine} />
      </Animated.View>
      <View style={styles.head}>
        <View style={styles.fovea} />
        <View style={styles.headShine} />
      </View>
      <View style={[styles.fang, { left: 31.5 }]} />
      <View style={[styles.fang, { left: 36.5 }]} />
      {[
        [33.5, 22.5, 4],
        [38.5, 22.5, 4],
        [31.5, 25, 2.4],
        [40.5, 25, 2.4],
        [33, 26.6, 2],
        [39, 26.6, 2],
      ].map(([x, y, d]) => (
        <View key={`${x}:${y}`} style={[styles.eye, { left: x - d / 2, top: y - d / 2, width: d, height: d, borderRadius: d / 2 }]}>
          {d > 3 ? <View style={styles.glint} /> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: MODEL, height: MODEL },
  side: { position: 'absolute', left: 0, top: 0, width: MODEL, height: MODEL },
  mirror: { transform: [{ scaleX: -1 }] },
  knee: { position: 'absolute', width: 3.6, height: 3.6, borderRadius: 1.8, backgroundColor: JOINT, opacity: 0.8 },
  tip: { position: 'absolute', width: 2, height: 2, borderRadius: 1, backgroundColor: JOINT, opacity: 0.6 },
  abdomen: {
    position: 'absolute',
    left: 24,
    top: 35.5,
    width: 24,
    height: 29,
    borderRadius: 14,
    backgroundColor: BODY,
    borderWidth: 1,
    borderColor: RIM,
    alignItems: 'center',
  },
  chevron: { position: 'absolute', left: '50%', transform: [{ rotate: '45deg' }], opacity: 0.9, borderRadius: 1 },
  dot: { position: 'absolute', top: 12, width: 3, height: 3, borderRadius: 1.5, opacity: 0.75 },
  shine: { position: 'absolute', left: 4, top: 3, width: 8, height: 11, borderRadius: 6, backgroundColor: '#FFFFFF', opacity: 0.13 },
  head: {
    position: 'absolute',
    left: 27.5,
    top: 20.5,
    width: 17,
    height: 19,
    borderRadius: 9,
    backgroundColor: BODY,
    borderWidth: 1,
    borderColor: RIM,
  },
  fovea: { position: 'absolute', left: 7, top: 9, width: 1.5, height: 6, borderRadius: 1, backgroundColor: '#140E0C' },
  headShine: { position: 'absolute', left: 3, top: 4, width: 5, height: 5, borderRadius: 3, backgroundColor: '#FFFFFF', opacity: 0.1 },
  fang: { position: 'absolute', top: 17, width: 4, height: 5, borderRadius: 2, backgroundColor: '#1A1310' },
  eye: { position: 'absolute', backgroundColor: EYE },
  glint: { position: 'absolute', left: 0.6, top: 0.6, width: 1.3, height: 1.3, borderRadius: 0.7, backgroundColor: '#FFFFFF', opacity: 0.9 },
});
