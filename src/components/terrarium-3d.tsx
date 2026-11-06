import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import * as THREE from 'three';

import { useNow } from '@/components/ui';
import { useAwake } from '@/components/use-awake';
import { useToday } from '@/components/use-today';
import { C } from '@/constants/theme';
import { worn } from '@/lib/cosmetics';
import { lairPieces, nextPiece } from '@/lib/lair';
import { importPhoto } from '@/lib/photos';
import { useStore } from '@/lib/store';
import { grewSince, tankLifeOf } from '@/lib/tank-life';
import { createWorld, type World } from '@/lib/terrarium-3d';

const HEIGHT = 210;
/** The month's automatic snapshot waits this long on screen, so the spider has settled somewhere. */
const AUTO_SNAP_MS = 9000;

type Gfx = {
  world: World | null;
  renderer: THREE.WebGLRenderer | null;
  gl: ExpoWebGLRenderingContext | null;
  draw: (() => void) | null;
  yaw: number;
  from: number; // the yaw when a drag began
  touch: { x: number; y: number }; // where it began
  dragging: boolean;
  moved: boolean;
  running: boolean;
  snapping: boolean;
  w: number;
  h: number;
};

/** Takes the tank as it is now as a JPEG (a file in the cache): drawn once more, read back before it's shown, then shown. */
async function snapshot(x: Gfx): Promise<string | null> {
  if (!x.gl || !x.world || !x.renderer || x.snapping) return null;
  x.snapping = true;
  try {
    // Read before endFrameEXP: once the frame is presented the buffer may be gone.
    x.world.setYaw(x.yaw);
    x.renderer.render(x.world.scene, x.world.camera);
    const shot = await GLView.takeSnapshotAsync(x.gl, { format: 'jpeg', compress: 0.9 });
    const uri = typeof shot.uri === 'string' ? shot.uri : shot.localUri;
    return uri ? (uri.startsWith('file://') ? uri : `file://${uri}`) : null;
  } catch {
    return null;
  } finally {
    x.snapping = false;
    x.draw?.();
  }
}

/**
 * The terrarium in 3D (lib/terrarium-3d.ts) through expo-gl: the spider lives in it on its own, following the app
 * (lib/tank-life.ts: day and night, sleep, focus and gaming, kind days, the web, molts, plants, weather, season,
 * pet and hat, replays of what was just logged), and a sideways drag turns the tank round. A tap on the spider
 * makes it wave, a tap on a buzzing fly catches it, a tap anywhere else is `onTap` (HQ: the shop). It only
 * animates while the screen is showing, the app is in front and motion isn't reduced; otherwise it holds still
 * (a drag still turns it). `onFail`: the GL context or three.js couldn't start.
 */
export function Terrarium3D({ onFail, onTap }: { onFail: () => void; onTap?: () => void }) {
  const { state, actions, quip, say, weather, health, tank } = useStore();
  const ids = lairPieces(state)
    .map((p) => p.id)
    .join(',');
  const next = nextPiece(state)?.id ?? null;
  const marking = worn(state).aura?.ring ?? C.red;
  const awake = useAwake();
  const today = useToday();
  const now = useNow(60_000, awake);
  const life = tankLifeOf(state, { now, forecast: weather.data?.days.find((d) => d.date === today) ?? null, nights: health.data?.nights ?? null });
  const lifeKey = JSON.stringify(life);
  const gfx = useRef<Gfx>({ world: null, renderer: null, gl: null, draw: null, yaw: 0, from: 0, touch: { x: 0, y: 0 }, dragging: false, moved: false, running: false, snapping: false, w: 0, h: 0 });
  const [ready, setReady] = useState(false);
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
    if (!x.running) x.draw?.();
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
    if (hit === 'fly') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      actions.catchFly();
    } else if (hit === 'spider') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      x.world?.poke();
      setBubble(quip('tankPoke'));
      if (!x.running) {
        x.world?.step(0);
        x.draw?.();
      }
    } else onTap?.();
  };

  const onContextCreate = (gl: ExpoWebGLRenderingContext) => {
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
      // A shader this phone's GL can't compile would leave an empty box: fall back to the flat terrarium instead.
      let shaderError = false;
      renderer.debug.onShaderError = () => {
        shaderError = true;
      };
      renderer.setPixelRatio(1);
      renderer.setSize(w, h, false);
      const world = createWorld({ ids: ids ? ids.split(',') : [], next, marking, background: C.card, life });
      world.setSize(w, h);
      world.settle();
      const x = gfx.current;
      x.world = world;
      x.renderer = renderer;
      x.gl = gl;
      x.draw = () => {
        if (x.snapping) return;
        world.setYaw(x.yaw);
        renderer.render(world.scene, world.camera);
        gl.endFrameEXP();
      };
      world.step(0);
      x.draw();
      if (shaderError) throw new Error('three.js shader error');
      setReady(true);
    } catch {
      onFail();
    }
  };

  // What's in the tank and the spider's markings follow the store.
  useEffect(() => {
    const x = gfx.current;
    if (!ready || !x.world) return;
    x.world.setPieces(ids ? ids.split(',') : [], next);
    x.world.step(0);
    x.draw?.();
  }, [ready, ids, next]);
  useEffect(() => {
    const x = gfx.current;
    if (!ready || !x.world) return;
    x.world.setMarking(marking);
    x.draw?.();
  }, [ready, marking]);
  // Its life follows the app: the light, the mode, the web, molts, plants, weather, season, pet, hat, fly, eggs.
  useEffect(() => {
    const x = gfx.current;
    if (!ready || !x.world) return;
    x.world.setLife(JSON.parse(lifeKey));
    if (!x.running) {
      x.world.step(0);
      x.world.settle();
      x.draw?.();
    }
  }, [ready, lifeKey]);
  // Plants keep what they grew (they never shrink, whatever the steps do later).
  const grew = grewSince(state, life.growth);
  const grewKey = grew ? JSON.stringify(grew) : '';
  useEffect(() => {
    if (grewKey) actions.tankGrew(JSON.parse(grewKey));
  }, [grewKey, actions]);
  // What was just logged: handed to the tank to act out while it's on screen.
  const events = tank.events;
  const take = tank.take;
  useEffect(() => {
    const x = gfx.current;
    if (!ready || !awake || !x.world || !events.length) return;
    x.world.replay(events);
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
      const uri = await snapshot(gfx.current);
      if (!uri) return;
      try {
        actions.tankSnapped(month, await importPhoto('tank', uri));
      } catch {
        // no room or no file: try again another time
      }
    }, AUTO_SNAP_MS);
    return () => clearTimeout(t);
  }, [ready, awake, haveSnap, month, actions]);

  const share = async () => {
    const uri = await snapshot(gfx.current);
    if (!uri) return say("Couldn't snap the tank just now.", 'info');
    if (!(await Sharing.isAvailableAsync())) return say('Sharing is not available on this phone.', 'info');
    await Sharing.shareAsync(uri, { mimeType: 'image/jpeg', dialogTitle: 'Share your terrarium' }).catch(() => {});
  };

  useEffect(() => {
    const x = gfx.current;
    return () => {
      x.world?.dispose();
      x.renderer?.dispose();
      x.world = null;
      x.renderer = null;
      x.gl = null;
      x.draw = null;
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
      <GLView style={styles.gl} onContextCreate={onContextCreate} />
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
