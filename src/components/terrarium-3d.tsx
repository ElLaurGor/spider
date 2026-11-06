import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import * as THREE from 'three';

import { useNow } from '@/components/ui';
import { useScreenState } from '@/components/use-awake';
import { useToday } from '@/components/use-today';
import { C } from '@/constants/theme';
import { worn } from '@/lib/cosmetics';
import { glLive } from '@/lib/gl-guard';
import { lairPieces, nextPiece } from '@/lib/lair';
import { importPhoto } from '@/lib/photos';
import { useStore } from '@/lib/store';
import { grewSince, TANK_EVENT_MS, tankLifeOf } from '@/lib/tank-life';
import { createWorld, type World } from '@/lib/terrarium-3d';

const HEIGHT = 210;
/** The month's automatic snapshot waits this long on screen, so the spider has settled somewhere. */
const AUTO_SNAP_MS = 9000;

type Gfx = {
  world: World | null;
  draw: (() => void) | null; // renders a frame and shows it
  render: (() => void) | null; // renders a frame without showing it (for a snapshot, read before it's shown)
  gl: ExpoWebGLRenderingContext | null;
  yaw: number;
  from: number; // the yaw when a drag began
  touch: { x: number; y: number }; // where it began
  dragging: boolean; // a sideways drag is turning the tank
  moved: boolean; // the finger moved: not a tap
  running: boolean; // the frame loop is on
  visible: boolean; // the screen is showing with the app in front
  dirty: boolean; // something changed while hidden: draw once it shows again
  snapping: boolean; // a snapshot is being read: no other frames until it's done
  w: number;
  h: number;
};

/**
 * Draws a frame, but only while the view is on screen. GL on a hidden screen's view (HQ under the shop, say)
 * can crash the app natively, so a change made then waits for the view to show again.
 */
function paint(x: Gfx, onFail: () => void) {
  if (!x.visible || x.snapping) {
    x.dirty = true;
    return;
  }
  try {
    x.draw?.();
  } catch {
    onFail();
  }
}

/**
 * Takes the tank as it is now as a JPEG (a file in the cache), only while it's on screen: drawn once more and
 * read back before that frame is shown (once shown, the buffer may be gone), then shown through paint().
 */
async function snapshot(x: Gfx, onFail: () => void): Promise<string | null> {
  if (!x.visible || x.snapping || !x.gl || !x.render) return null;
  x.snapping = true;
  try {
    x.render();
    x.gl.flushEXP(); // run the frame just rendered (expo-gl batches until a frame ends), so the read gets it
    const shot = await GLView.takeSnapshotAsync(x.gl, { format: 'jpeg', compress: 0.9 });
    const uri = typeof shot.uri === 'string' ? shot.uri : shot.localUri;
    return uri ? (uri.startsWith('file://') ? uri : `file://${uri}`) : null;
  } catch {
    return null;
  } finally {
    x.snapping = false;
    paint(x, onFail);
  }
}

/**
 * The terrarium in 3D (lib/terrarium-3d.ts) through expo-gl: the spider lives in it on its own, following the app
 * (lib/tank-life.ts: day and night, sleep, focus and gaming, kind days, the web, molts, plants, weather, season,
 * pet and hat, replays of what was just logged), and a sideways drag turns the tank round. A tap on the spider
 * makes it wave, a tap on a buzzing fly catches it, a tap anywhere else is `onTap` (HQ: the shop). It only draws
 * while its screen is showing with the app in front, and only animates when motion isn't reduced either (a drag
 * still turns it). While it draws, lib/gl-guard.ts keeps a flag up, so a native crash sends the next session to
 * the flat terrarium. `onFail`: GL, three.js or a shader gave up.
 */
export function Terrarium3D({ onFail, onTap }: { onFail: () => void; onTap?: () => void }) {
  const { state, actions, quip, say, weather, health, tank } = useStore();
  const ids = lairPieces(state)
    .map((p) => p.id)
    .join(',');
  const next = nextPiece(state)?.id ?? null;
  const marking = worn(state).aura?.ring ?? C.red;
  const { visible, still } = useScreenState();
  const awake = visible && !still;
  const today = useToday();
  const now = useNow(60_000, visible);
  const life = tankLifeOf(state, { now, forecast: weather.data?.days.find((d) => d.date === today) ?? null, nights: health.data?.nights ?? null });
  const lifeKey = JSON.stringify(life);
  const gfx = useRef<Gfx>({
    world: null,
    draw: null,
    render: null,
    gl: null,
    yaw: 0,
    from: 0,
    touch: { x: 0, y: 0 },
    dragging: false,
    moved: false,
    running: false,
    visible: false,
    dirty: false,
    snapping: false,
    w: 0,
    h: 0,
  });
  const [ready, setReady] = useState(false);
  const [gen, setGen] = useState(0); // a new GL context: Android makes one each time the tank shows again
  const [act, setAct] = useState<string | null>(null);
  const [bubble, setBubble] = useState<string | null>(null);
  const [anchor] = useState(() => new Animated.ValueXY({ x: 0, y: 0 }));

  // Touches: a sideways drag turns the tank (its head follows the camera); a tap picks what it landed on.
  // Anything else (scrolling the screen) goes on as usual.
  const sideways = (e: GestureResponderEvent) => {
    const dx = e.nativeEvent.pageX - gfx.current.touch.x;
    const dy = e.nativeEvent.pageY - gfx.current.touch.y;
    return Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.5;
  };
  const grant = (e: GestureResponderEvent) => {
    const x = gfx.current;
    x.from = x.yaw;
    x.touch = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
    x.dragging = false;
    x.moved = false;
  };
  const move = (e: GestureResponderEvent) => {
    const x = gfx.current;
    const dx = e.nativeEvent.pageX - x.touch.x;
    if (Math.abs(dx) > 8 || Math.abs(e.nativeEvent.pageY - x.touch.y) > 8) x.moved = true;
    if (!x.dragging && sideways(e)) {
      x.dragging = true;
      x.world?.setDragging(true);
    }
    if (!x.dragging) return;
    x.yaw = x.from - dx * 0.012;
    if (!x.running) paint(x, onFail);
  };
  const endDrag = () => {
    const x = gfx.current;
    x.dragging = false;
    x.world?.setDragging(false);
  };
  const release = (e: GestureResponderEvent) => {
    const x = gfx.current;
    const tapped = !x.dragging && !x.moved;
    endDrag();
    if (!tapped) return;
    const hit = x.world && x.w && x.h ? x.world.pick(e.nativeEvent.locationX / x.w, e.nativeEvent.locationY / x.h) : null;
    if (hit === 'fly') actions.catchFly(); // its toast buzzes
    else if (hit === 'spider') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      x.world?.poke();
      setBubble(quip('tankPoke'));
      if (!x.running) {
        x.world?.step(0);
        paint(x, onFail);
      }
    } else onTap?.();
  };

  const onContextCreate = (gl: ExpoWebGLRenderingContext) => {
    // The crash guard's flag is up while GL is being set up too: a native crash here sends the next start to the flat tank.
    glLive(true);
    try {
      const w = gl.drawingBufferWidth;
      const h = gl.drawingBufferHeight;
      // three.js wants a canvas; expo-gl has only the context, so it gets a stand-in.
      const canvas = {
        width: w,
        height: h,
        clientWidth: w,
        clientHeight: h,
        style: {},
        addEventListener: () => {},
        removeEventListener: () => {},
        getContext: () => gl,
      } as unknown as HTMLCanvasElement;
      const renderer = new THREE.WebGLRenderer({ canvas, context: gl as unknown as WebGL2RenderingContext, antialias: false });
      // A shader this phone's GL can't compile would leave an empty box: the next draw throws, and the flat terrarium takes over.
      let shaderError = false;
      renderer.debug.onShaderError = () => {
        shaderError = true;
      };
      renderer.setPixelRatio(1);
      renderer.setSize(w, h, false);
      const x = gfx.current;
      // The world (the spider and what it's doing) outlives a context: only the renderer is new each time.
      const world = x.world ?? createWorld({ ids: ids ? ids.split(',') : [], next, marking, background: C.card, life });
      if (!x.world) world.settle();
      world.setSize(w, h);
      x.world = world;
      x.gl = gl;
      x.render = () => {
        world.collect(); // what was taken out of the scene leaves the GPU here, while drawing is safe
        world.setYaw(x.yaw);
        renderer.render(world.scene, world.camera);
        if (shaderError) throw new Error('three.js shader error');
      };
      x.draw = () => {
        x.render?.();
        gl.endFrameEXP();
      };
      world.step(0);
      x.dirty = true; // the first frame comes from the visibility effect, once ready
      setReady(true);
      setGen((n) => n + 1);
    } catch {
      onFail();
    } finally {
      glLive(false); // the visibility effect holds it from here on
    }
  };

  // On screen: draw whatever changed while hidden, and hold the crash guard's flag up while drawing is possible.
  // Hidden: the GLView goes (below), and with it the context, so nothing may draw with the old one again.
  useEffect(() => {
    const x = gfx.current;
    x.visible = visible;
    if (!visible) {
      x.draw = null;
      x.render = null;
      x.gl = null;
      return;
    }
    if (!ready || !x.draw) return;
    glLive(true);
    if (x.dirty) {
      x.dirty = false;
      paint(x, onFail);
    }
    return () => glLive(false);
  }, [ready, visible, gen, onFail]);

  // What's in the tank and the spider's markings follow the store.
  useEffect(() => {
    const x = gfx.current;
    if (!ready || !x.world) return;
    try {
      x.world.setPieces(ids ? ids.split(',') : [], next);
      x.world.step(0);
    } catch {
      onFail();
      return;
    }
    paint(x, onFail);
  }, [ready, ids, next, onFail]);
  useEffect(() => {
    const x = gfx.current;
    if (!ready || !x.world) return;
    x.world.setMarking(marking);
    paint(x, onFail);
  }, [ready, marking, onFail]);
  // Its life follows the app: the light, the mode, the web, molts, plants, weather, season, pet, hat, fly, eggs.
  useEffect(() => {
    const x = gfx.current;
    if (!ready || !x.world) return;
    try {
      x.world.setLife(JSON.parse(lifeKey));
      if (!x.running) {
        x.world.step(0);
        x.world.settle();
      }
    } catch {
      onFail();
      return;
    }
    if (!x.running) paint(x, onFail);
  }, [ready, lifeKey, onFail]);
  // Plants keep what they grew (they never shrink, whatever the steps do later).
  const grew = grewSince(state, life.growth);
  const grewKey = grew ? JSON.stringify(grew) : '';
  useEffect(() => {
    if (grewKey) actions.tankGrew(JSON.parse(grewKey));
  }, [grewKey, actions]);
  // What was just logged: handed to the tank to act out while it's on screen and moving.
  const events = tank.events;
  const take = tank.take;
  useEffect(() => {
    const x = gfx.current;
    if (!ready || !awake || !x.world || !events.length) return;
    const fresh = events.filter((e) => Date.now() - e.at <= TANK_EVENT_MS);
    if (fresh.length) x.world.replay(fresh);
    take(events.map((e) => e.id));
  }, [ready, awake, events, take]);
  // The poke's line, for a few seconds.
  useEffect(() => {
    if (!bubble) return;
    const t = setTimeout(() => setBubble(null), 4200);
    return () => clearTimeout(t);
  }, [bubble]);

  // The spider's life: one frame per screen refresh while awake.
  useEffect(() => {
    const x = gfx.current;
    if (!ready || !x.world || !awake) return;
    const world = x.world;
    let raf = 0;
    let last = Date.now();
    let shown: string | null = null;
    x.running = true;
    const frame = () => {
      const now = Date.now();
      if (!x.snapping) {
        try {
          world.step(Math.min(0.05, (now - last) / 1000));
          x.draw?.();
        } catch {
          onFail();
          return;
        }
        if (world.takeSignal() === 'molted') actions.tankMolted();
      }
      last = now;
      const a = world.act();
      if (a !== shown) {
        shown = a;
        setAct(a);
      }
      const p = world.actAnchor();
      if (p) anchor.setValue({ x: p.x * x.w, y: p.y * x.h });
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      x.running = false;
      setAct(null);
    };
  }, [ready, awake, anchor, onFail, actions]);

  // One automatic snapshot a month, kept with the app's photos, for Wrapped ("your tank in January vs December").
  const month = today.slice(0, 7);
  const haveSnap = !!state.tankSnaps?.[month];
  useEffect(() => {
    if (!ready || !awake || haveSnap) return;
    const t = setTimeout(async () => {
      const uri = await snapshot(gfx.current, onFail);
      if (!uri) return;
      try {
        actions.tankSnapped(month, await importPhoto('tank', uri));
      } catch {
        // no room or no file: another time
      }
    }, AUTO_SNAP_MS);
    return () => clearTimeout(t);
  }, [ready, awake, haveSnap, month, actions, onFail]);

  const share = async () => {
    const uri = await snapshot(gfx.current, onFail);
    if (!uri) return say("Couldn't snap the tank just now.", 'info');
    if (!(await Sharing.isAvailableAsync())) return say('Sharing is not available on this phone.', 'info');
    await Sharing.shareAsync(uri, { mimeType: 'image/jpeg', dialogTitle: 'Share your terrarium' }).catch(() => {});
  };

  // Gone: drop the scene. No GL calls here (no dispose): the context may already be torn down with the view.
  useEffect(() => {
    const x = gfx.current;
    return () => {
      x.world = null;
      x.draw = null;
      x.render = null;
      x.gl = null;
    };
  }, []);

  return (
    <View
      style={styles.wrap}
      onLayout={(e) => {
        gfx.current.w = e.nativeEvent.layout.width;
        gfx.current.h = e.nativeEvent.layout.height;
      }}
      accessible
      accessibilityLabel={ids ? `The terrarium in 3D: the spider and ${ids.split(',').length} things for it. Tap the spider to say hello; drag sideways to turn the tank.` : 'The terrarium in 3D: just the spider so far. Tap it to say hello; drag sideways to turn the tank.'}
      onTouchStart={(e) => {
        gfx.current.touch = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
      }}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={sideways}
      onResponderTerminationRequest={() => !gfx.current.dragging}
      onResponderGrant={grant}
      onResponderMove={move}
      onResponderRelease={release}
      onResponderTerminate={endDrag}>
      {visible ? <GLView style={styles.gl} onContextCreate={onContextCreate} /> : <View style={styles.gl} />}
      {act ? (
        <Animated.View style={[styles.act, { transform: anchor.getTranslateTransform() }]}>
          <Text style={styles.actText}>{act}</Text>
        </Animated.View>
      ) : null}
      {bubble ? (
        <View style={styles.bubble}>
          <Text style={styles.bubbleText}>🕷️ {bubble}</Text>
        </View>
      ) : null}
      {ready ? (
        <Pressable onPress={() => void share()} style={styles.snap} hitSlop={8} accessibilityRole="button" accessibilityLabel="Snap the tank and share it">
          <Text style={styles.snapText}>📸 Snap</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: HEIGHT, borderRadius: 12, overflow: 'hidden', backgroundColor: C.card },
  gl: { flex: 1 },
  act: { position: 'absolute', left: -9, top: -12, pointerEvents: 'none' },
  actText: { fontSize: 16 },
  bubble: { position: 'absolute', left: 8, right: 64, top: 8, padding: 8, borderRadius: 10, backgroundColor: C.card2, borderWidth: 1, borderColor: C.border, opacity: 0.94, pointerEvents: 'none' },
  bubbleText: { color: C.text, fontSize: 12, lineHeight: 16 },
  snap: { position: 'absolute', right: 8, top: 8, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: C.card2, borderWidth: 1, borderColor: C.border, opacity: 0.9 },
  snapText: { color: C.text, fontSize: 11, fontWeight: '700' },
});
