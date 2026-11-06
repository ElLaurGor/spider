import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import * as THREE from 'three';

import { useScreenState } from '@/components/use-awake';
import { C } from '@/constants/theme';
import { worn } from '@/lib/cosmetics';
import { glLive } from '@/lib/gl-guard';
import { lairPieces, nextPiece } from '@/lib/lair';
import { useStore } from '@/lib/store';
import { createWorld, type World } from '@/lib/terrarium-3d';

const HEIGHT = 210;

type Gfx = {
  world: World | null;
  draw: (() => void) | null;
  yaw: number;
  from: number; // the yaw when a drag began
  touch: { x: number; y: number }; // where it began
  running: boolean; // the frame loop is on
  visible: boolean; // the screen is showing with the app in front
  dirty: boolean; // something changed while hidden: draw once it shows again
  w: number;
  h: number;
};

/**
 * Draws a frame, but only while the view is on screen. GL on a hidden screen's view (HQ under the shop, say)
 * can crash the app natively, so a change made then waits for the view to show again.
 */
function paint(x: Gfx, onFail: () => void) {
  if (!x.visible) {
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
 * The terrarium in 3D (lib/terrarium-3d.ts) through expo-gl: the spider lives in it on its own, and a sideways drag
 * turns the tank round. It only draws while its screen is showing with the app in front, and only animates when
 * motion isn't reduced either (a drag still turns it). While it draws, lib/gl-guard.ts keeps a flag up, so a
 * native crash sends the next session to the flat terrarium. `onFail`: GL, three.js or a shader gave up.
 */
export function Terrarium3D({ onFail }: { onFail: () => void }) {
  const { state } = useStore();
  const ids = lairPieces(state)
    .map((p) => p.id)
    .join(',');
  const next = nextPiece(state)?.id ?? null;
  const marking = worn(state).aura?.ring ?? C.red;
  const { visible, still } = useScreenState();
  const awake = visible && !still;
  const gfx = useRef<Gfx>({ world: null, draw: null, yaw: 0, from: 0, touch: { x: 0, y: 0 }, running: false, visible: false, dirty: false, w: 0, h: 0 });
  const [ready, setReady] = useState(false);
  const [act, setAct] = useState<string | null>(null);
  const [anchor] = useState(() => new Animated.ValueXY({ x: 0, y: 0 }));
  // Sideways drags turn the tank; anything else (scrolling HQ, a tap to open the shop) goes on as usual.
  const touchStart = (e: GestureResponderEvent) => {
    gfx.current.touch = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
  };
  const sideways = (e: GestureResponderEvent) => {
    const dx = e.nativeEvent.pageX - gfx.current.touch.x;
    const dy = e.nativeEvent.pageY - gfx.current.touch.y;
    return Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.5;
  };
  const dragStart = (e: GestureResponderEvent) => {
    const x = gfx.current;
    x.from = x.yaw;
    x.touch = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
  };
  const drag = (e: GestureResponderEvent) => {
    const x = gfx.current;
    x.yaw = x.from - (e.nativeEvent.pageX - x.touch.x) * 0.012;
    if (!x.running) paint(x, onFail);
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
      // A shader this phone's GL can't compile would leave an empty box: the next draw throws, and the flat terrarium takes over.
      let shaderError = false;
      renderer.debug.onShaderError = () => {
        shaderError = true;
      };
      renderer.setPixelRatio(1);
      renderer.setSize(w, h, false);
      const world = createWorld({ ids: ids ? ids.split(',') : [], next, marking, background: C.card });
      world.setSize(w, h);
      const x = gfx.current;
      x.world = world;
      x.draw = () => {
        world.setYaw(x.yaw);
        renderer.render(world.scene, world.camera);
        gl.endFrameEXP();
        if (shaderError) throw new Error('three.js shader error');
      };
      world.step(0);
      x.dirty = true; // the first frame comes from the visibility effect, once ready
      setReady(true);
    } catch {
      onFail();
    }
  };

  // On screen: draw whatever changed while hidden, and hold the crash guard's flag up while drawing is possible.
  useEffect(() => {
    const x = gfx.current;
    x.visible = visible;
    if (!ready || !visible) return;
    glLive(true);
    if (x.dirty) {
      x.dirty = false;
      paint(x, onFail);
    }
    return () => glLive(false);
  }, [ready, visible, onFail]);

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
      try {
        world.step(Math.min(0.05, (now - last) / 1000));
        x.draw?.();
      } catch {
        onFail();
        return;
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
  }, [ready, awake, anchor, onFail]);

  // Gone: drop the scene. No GL calls here (no dispose): the context may already be torn down with the view.
  useEffect(() => {
    const x = gfx.current;
    return () => {
      x.world = null;
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
      accessibilityLabel={ids ? `The terrarium in 3D: the spider and ${ids.split(',').length} things for it. Drag sideways to turn it.` : 'The terrarium in 3D: just the spider so far. Drag sideways to turn it.'}
      onTouchStart={touchStart}
      onMoveShouldSetResponder={sideways}
      onResponderTerminationRequest={() => false}
      onResponderGrant={dragStart}
      onResponderMove={drag}>
      <GLView style={styles.gl} onContextCreate={onContextCreate} />
      {act ? (
        <Animated.View style={[styles.act, { transform: anchor.getTranslateTransform() }]}>
          <Text style={styles.actText}>{act}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: HEIGHT, borderRadius: 12, overflow: 'hidden', backgroundColor: C.card },
  gl: { flex: 1 },
  act: { position: 'absolute', left: -9, top: -12, pointerEvents: 'none' },
  actText: { fontSize: 16 },
});
