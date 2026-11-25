import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Pressable, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import * as THREE from 'three';

import { useNow } from '@/components/ui';
import { useScreenState } from '@/components/use-awake';
import { useToday } from '@/components/use-today';
import { C } from '@/constants/theme';
import { worn } from '@/lib/cosmetics';
import { glLive, shadowsAllowed, shadowsFailed, shadowsWorked } from '@/lib/gl-guard';
import { lairPieces, nextPiece } from '@/lib/lair';
import { importPhoto } from '@/lib/photos';
import { useStore, useTankEvents } from '@/lib/store';
import { grewSince, skyTalk, TANK_EVENT_MS, tankLifeOf } from '@/lib/tank-life';
import { createWorld, type World } from '@/lib/terrarium-3d';
// step 9 tank
import { GUESTS, guestLineKey, lingVisitor, narrating } from '@/lib/guests';
import { firstsOf } from '@/lib/hatch-day';
import { THROW_EMOJI } from '@/lib/rps';

const HEIGHT = 210;
/** A party's scroll is read out a line at a time, this far apart; Sir Reginald narrates this often while he's at it. */
const SCROLL_MS = 6000;
const NARRATE_EVERY_MS = 25_000;
const shortDate = (t: number) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
/** The month's automatic snapshot waits this long on screen, so the spider has settled somewhere. */
const AUTO_SNAP_MS = 9000;
/** A press this long without moving picks up the piece under the finger; two taps this close together follow the spider. */
const LONG_PRESS_MS = 450;
const DOUBLE_TAP_MS = 320;
/** Frames drawn with shadows before they count as working on this phone. */
const SHADOW_TRIAL_FRAMES = 90;

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
  // the terrarium round
  pinch: { d: number; zoom: number } | null; // two fingers: zooming, from this distance and zoom
  carry: { id: string; from: THREE.Vector3; start: [number, number]; at: [number, number] } | null; // a piece picked up by a long press
  press: ReturnType<typeof setTimeout> | null; // the long press's timer
  lastTap: { t: number; x: number; y: number } | null;
  tapLater: ReturnType<typeof setTimeout> | null; // a tap on nothing waits to see if it's a double tap
  frames: number; // frames drawn with shadows, towards SHADOW_TRIAL_FRAMES
  wiping: boolean; // a finger is wiping the misted glass
  touching: boolean; // a finger is down: full frame rate
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
export function Terrarium3D({ onFail, onTap, onPlay, onExpand, onClose, full }: { onFail: () => void; onTap?: () => void; onPlay?: () => void; onExpand?: () => void; onClose?: () => void; full?: boolean }) {
  const { state, actions, quip, say, weather, health } = useStore();
  const tank = useTankEvents();
  const ids = lairPieces(state)
    .map((p) => p.id)
    .join(',');
  const next = nextPiece(state)?.id ?? null;
  const marking = worn(state).aura?.ring ?? C.red;
  const { visible, still } = useScreenState();
  // scrolled out of sight on HQ: no frames (the battery), checked a few times a second while the screen shows
  const wrap = useRef<View>(null);
  const [onScreen, setOnScreen] = useState(true);
  useEffect(() => {
    if (!visible || full) return;
    const check = () =>
      wrap.current?.measureInWindow((_x, y, _w, h) => {
        const seen = h > 0 && y + h > 0 && y < Dimensions.get('window').height;
        setOnScreen((was) => (was === seen ? was : seen));
      });
    check();
    const t = setInterval(check, 700);
    return () => clearInterval(t);
  }, [visible, full]);
  const awake = visible && !still && (onScreen || !!full);
  const today = useToday();
  const now = useNow(60_000, visible);
  const wx = weather.data;
  const life = tankLifeOf(state, {
    now,
    forecast: wx?.days.find((d) => d.date === today) ?? null,
    nights: health.data?.nights ?? null,
    weatherNow: wx ? { code: wx.code, clouds: wx.clouds, humidity: wx.humidity, wind: wx.wind, temp: wx.temp, fetchedAt: wx.fetchedAt, soon: wx.soon } : null,
  });
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
    pinch: null,
    carry: null,
    press: null,
    lastTap: null,
    tapLater: null,
    frames: 0,
    wiping: false,
    touching: false,
  });
  // real shadows unless they failed on this phone before (lib/gl-guard.ts); the view waits to know
  const [shadows, setShadows] = useState<boolean | null>(null);
  useEffect(() => {
    let on = true;
    shadowsAllowed().then((ok) => on && setShadows(ok));
    return () => {
      on = false;
    };
  }, []);
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
  const touchGap = (e: GestureResponderEvent) => {
    const t = e.nativeEvent.touches;
    return t.length >= 2 ? Math.hypot(t[0].pageX - t[1].pageX, t[0].pageY - t[1].pageY) : null;
  };
  const settleNow = (x: Gfx) => {
    if (x.running) return;
    x.world?.settle();
    paint(x, onFail);
  };
  const grant = (e: GestureResponderEvent) => {
    const x = gfx.current;
    x.from = x.yaw;
    x.touch = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
    x.dragging = false;
    x.moved = false;
    x.pinch = null;
    x.carry = null;
    x.wiping = false;
    x.touching = true;
    if (x.press) clearTimeout(x.press);
    // a long press on a piece picks it up, to be moved round the floor
    const at = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY };
    x.press = setTimeout(() => {
      x.press = null;
      if (x.moved || x.dragging || x.pinch || !x.world || !x.w || !x.h) return;
      const id = x.world.pickPiece(at.x / x.w, at.y / x.h);
      const p = x.world.floorPoint(at.x / x.w, at.y / x.h);
      if (!id || !p) return;
      const start = x.world.placeOf(id);
      x.carry = { id, from: p, start, at: start };
      x.world.liftPiece(id);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      paint(x, onFail);
    }, LONG_PRESS_MS);
  };
  const move = (e: GestureResponderEvent) => {
    const x = gfx.current;
    // two fingers: pinch to zoom
    const gap = touchGap(e);
    if (gap != null) {
      if (x.carry) return;
      x.pinch ??= { d: Math.max(1, gap), zoom: x.world?.zoom() ?? 1 };
      x.moved = true;
      x.world?.setZoom((x.pinch.zoom * gap) / x.pinch.d);
      settleNow(x);
      return;
    }
    if (x.pinch) return; // one finger left after a pinch: nothing until it lifts
    // carrying a piece: it follows the finger over the floor
    if (x.carry && x.world && x.w && x.h) {
      const p = x.world.floorPoint(e.nativeEvent.locationX / x.w, e.nativeEvent.locationY / x.h);
      if (p) x.carry.at = x.world.movePiece(x.carry.id, x.carry.start[0] + p.x - x.carry.from.x, x.carry.start[1] + p.z - x.carry.from.z);
      if (!x.running) paint(x, onFail);
      return;
    }
    const dx = e.nativeEvent.pageX - x.touch.x;
    if (Math.abs(dx) > 8 || Math.abs(e.nativeEvent.pageY - x.touch.y) > 8) x.moved = true;
    // a finger over the misted glass wipes it: sideways on HQ (up and down still scrolls the screen), any way full screen
    if (!x.wiping && !x.dragging && x.world && x.world.misted() > 0.12 && (full ? x.moved : sideways(e))) x.wiping = true;
    if (x.wiping && x.world && x.w && x.h) {
      x.world.wipeAt(e.nativeEvent.locationX / x.w, e.nativeEvent.locationY / x.h);
      if (!x.running) paint(x, onFail);
      return;
    }
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
    x.wiping = false;
    x.touching = false;
    x.world?.setDragging(false);
    if (x.press) clearTimeout(x.press);
    x.press = null;
  };
  /** The screen took the touch away (a scroll): a carried piece goes back where it was. */
  const terminate = () => {
    const x = gfx.current;
    if (x.carry) {
      x.world?.movePiece(x.carry.id, x.carry.start[0], x.carry.start[1]);
      x.world?.liftPiece(null);
      x.carry = null;
      paint(x, onFail);
    }
    x.pinch = null;
    endDrag();
  };
  const release = (e: GestureResponderEvent) => {
    const x = gfx.current;
    if (x.carry) {
      // put down where it is (lib/lair.ts withPlace)
      const c = x.carry;
      x.carry = null;
      x.world?.liftPiece(null);
      endDrag();
      actions.moveLairPiece(c.id, c.at[0], c.at[1]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      paint(x, onFail);
      return;
    }
    if (x.pinch) {
      x.pinch = null;
      endDrag();
      return;
    }
    const tapped = !x.dragging && !x.moved;
    endDrag();
    if (!tapped) return;
    // a double tap follows the spider up close (or lets it go)
    const t = e.nativeEvent.timestamp; // the touch's own time
    const loc = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY };
    const last = x.lastTap;
    if (last && t - last.t < DOUBLE_TAP_MS && Math.hypot(loc.x - last.x, loc.y - last.y) < 48) {
      x.lastTap = null;
      if (x.tapLater) clearTimeout(x.tapLater);
      x.tapLater = null;
      const on = !x.world?.following();
      x.world?.setFollow(on);
      setBubble(on ? '🎯 Following it. Double-tap to see the whole tank.' : '🔭 The whole tank again.');
      settleNow(x);
      return;
    }
    x.lastTap = { t, ...loc };
    const hit = x.world && x.w && x.h ? x.world.pick(loc.x / x.w, loc.y / x.h) : null;
    if (hit === 'fly') actions.catchFly(); // its toast buzzes
    else if (hit === 'spider') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      x.world?.poke();
      // half the time it has something to say about the sky outside, when there is something
      const sky = Math.floor(t) % 2 === 0 ? skyTalk(life.sky) : null;
      setBubble(`🕷️ ${quip(sky ?? 'tankPoke')}`);
      if (!x.running) {
        x.world?.step(0);
        paint(x, onFail);
      }
    } else if (hit === 'guest' && life.guest) {
      // step 9 tank: a guest wakes up and has a word about the day (on a kind day it only keeps her company)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      x.world?.greetGuest();
      if (!life.guest.awake) actions.wakeGuest();
      const g = guestLineKey(state, life.guest.id, today);
      const who = life.guest.id === 'ling' ? lingVisitor(state, today)?.name : null;
      setBubble(`${GUESTS[life.guest.id].emoji} ${who ? `${who}: ` : ''}${quip(g.key, { summary: g.summary })}`);
      if (!x.running) {
        x.world?.step(0);
        paint(x, onFail);
      }
    } else if (hit === 'thermo') {
      // the thermometer piece reads the real outdoor temperature
      setBubble(life.temp != null ? `🌡️ ${quip('tankThermo', { temp: `${life.temp}°` })}` : '🌡️ No reading yet. It waits for the weather.');
    } else if (onTap) {
      // wait a moment: a second tap makes it a double tap instead
      if (x.tapLater) clearTimeout(x.tapLater);
      x.tapLater = setTimeout(() => {
        x.tapLater = null;
        onTap();
      }, DOUBLE_TAP_MS);
    }
  };
  /** The day's cricket: dropped in once a day (State.tankFed); the spider hunts it when it's free. */
  const fedToday = state.tankFed === today;
  const feed = () => {
    const x = gfx.current;
    if (fedToday || !x.world) return;
    actions.feedTank();
    x.world.feed();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (!x.running) {
      x.world.step(0);
      paint(x, onFail);
    }
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
      renderer.shadowMap.enabled = !!shadows;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
        if (shaderError && renderer.shadowMap.enabled) {
          // shadows are the newest GL here: without them first, before giving up on 3D
          shaderError = false;
          renderer.shadowMap.enabled = false;
          shadowsFailed();
          world.scene.traverse((o) => {
            const m = (o as THREE.Mesh).material;
            for (const mat of Array.isArray(m) ? m : m ? [m] : []) mat.needsUpdate = true;
          });
          renderer.render(world.scene, world.camera);
        }
        if (shaderError) throw new Error('three.js shader error');
        if (renderer.shadowMap.enabled && ++x.frames === SHADOW_TRIAL_FRAMES) shadowsWorked();
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
  // step 9 tank: sten, sax, påse. The spider shows the throw it just made (State.rps.last), while that's news.
  const thrown = state.rps?.last;
  const throwAt = thrown?.at ?? 0;
  const throwSign = thrown ? THROW_EMOJI[thrown.it] : '';
  useEffect(() => {
    const x = gfx.current;
    if (!ready || !x.world || !throwAt || Date.now() - throwAt > 5000) return;
    try {
      x.world.sign(throwSign);
      if (!x.running) x.world.step(0);
    } catch {
      onFail();
      return;
    }
    if (!x.running) paint(x, onFail);
  }, [ready, throwAt, throwSign, onFail]);
  // Sir Reginald, once woken, narrates the spider for an hour.
  const narrate = awake && narrating(state, now);
  useEffect(() => {
    if (!narrate) return;
    const t = setInterval(() => setBubble(`🎩 ${quip('guestReginaldNarrates')}`), NARRATE_EVERY_MS);
    return () => clearInterval(t);
  }, [narrate, quip]);
  // A party: the spider reads its scroll of firsts aloud, a line at a time, once each time the tank comes on screen.
  const scroll = life.party ? firstsOf(state, { now, gentle: life.party.gentle }).map((f) => `📜 ${f.emoji} ${f.label}${f.emoji === '🧟' ? '' : `, ${shortDate(f.at)}`}`) : [];
  const scrollKey = scroll.join('\n');
  useEffect(() => {
    if (!awake || !scrollKey) return;
    const lines = scrollKey.split('\n');
    let i = 0;
    const t = setInterval(() => {
      if (i >= lines.length) return clearInterval(t);
      setBubble(lines[i++]);
    }, SCROLL_MS);
    return () => clearInterval(t);
  }, [awake, scrollKey]);

  // Misty glass: the spider says so once while it's on screen.
  const misty = life.sky.mist > 0;
  const [mistSaid, setMistSaid] = useState(false);
  useEffect(() => {
    if (!ready || !awake || !misty || mistSaid) return;
    const t = setTimeout(() => {
      setBubble(`💧 ${quip('tankMist')}`);
      setMistSaid(true);
    }, 1500);
    return () => clearTimeout(t);
  }, [ready, awake, misty, mistSaid, quip]);

  // The spider's life while awake: every screen refresh while a finger is on it, 30 frames a second while things
  // move, 15 when only the breathing and the slow drifts go on (the battery).
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
      const gap = x.touching || x.dragging ? 0 : world.calm() ? 66 : 33;
      if (now - last < gap - 4) {
        raf = requestAnimationFrame(frame);
        return;
      }
      if (!x.snapping) {
        try {
          world.step(Math.min(0.1, (now - last) / 1000));
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
      ref={wrap}
      style={[styles.wrap, full && styles.full]}
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
      onMoveShouldSetResponder={(e) => sideways(e) || e.nativeEvent.touches.length > 1}
      onResponderTerminationRequest={() => !gfx.current.dragging && !gfx.current.pinch && !gfx.current.carry && !gfx.current.wiping}
      onResponderGrant={grant}
      onResponderMove={move}
      onResponderRelease={release}
      onResponderTerminate={terminate}>
      {visible && shadows !== null ? <GLView style={styles.gl} onContextCreate={onContextCreate} /> : <View style={styles.gl} />}
      {act ? (
        <Animated.View style={[styles.act, { transform: anchor.getTranslateTransform() }]}>
          <Text style={styles.actText}>{act}</Text>
        </Animated.View>
      ) : null}
      {life.mode === 'out' ? (
        <View style={styles.note}>
          <Text style={styles.noteText}>📝 Out. Don&apos;t wait up.</Text>
        </View>
      ) : null}
      {bubble ? (
        <View style={styles.bubble}>
          <Text style={styles.bubbleText}>{bubble}</Text>
        </View>
      ) : null}
      {ready ? (
        <Pressable onPress={() => void share()} style={styles.snap} hitSlop={8} accessibilityRole="button" accessibilityLabel="Snap the tank and share it">
          <Text style={styles.snapText}>📸 Snap</Text>
        </Pressable>
      ) : null}
      {ready && onPlay && life.mode !== 'out' ? (
        <Pressable onPress={onPlay} style={styles.play} hitSlop={8} accessibilityRole="button" accessibilityLabel="Play sten, sax, påse against the spider">
          <Text style={styles.snapText}>✊ Play</Text>
        </Pressable>
      ) : null}
      {ready && (onExpand || onClose) ? (
        <Pressable onPress={full ? onClose : onExpand} style={styles.expand} hitSlop={8} accessibilityRole="button" accessibilityLabel={full ? 'Close the full-screen tank' : 'Show the tank full screen'}>
          <Text style={styles.snapText}>{full ? '✕' : '⤢'}</Text>
        </Pressable>
      ) : null}
      {ready && !fedToday && (life.mode === 'wander' || life.mode === 'cosy') ? (
        <Pressable onPress={feed} style={[styles.feed, !(onExpand || onClose) && { left: 8 }]} hitSlop={8} accessibilityRole="button" accessibilityLabel="Feed the spider a cricket (once a day)">
          <Text style={styles.snapText}>🦗 Feed</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: HEIGHT, borderRadius: 12, overflow: 'hidden', backgroundColor: C.card },
  full: { flex: 1, height: undefined, borderRadius: 0 },
  expand: { position: 'absolute', left: 8, bottom: 8, minWidth: 28, alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: C.card2, borderWidth: 1, borderColor: C.border, opacity: 0.9 },
  feed: { position: 'absolute', left: 46, bottom: 8, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: C.card2, borderWidth: 1, borderColor: C.border, opacity: 0.9 },
  gl: { flex: 1 },
  act: { position: 'absolute', left: -9, top: -12, pointerEvents: 'none' },
  actText: { fontSize: 16 },
  bubble: { position: 'absolute', left: 8, right: 64, top: 8, padding: 8, borderRadius: 10, backgroundColor: C.card2, borderWidth: 1, borderColor: C.border, opacity: 0.94, pointerEvents: 'none' },
  bubbleText: { color: C.text, fontSize: 12, lineHeight: 16 },
  snap: { position: 'absolute', right: 8, top: 8, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: C.card2, borderWidth: 1, borderColor: C.border, opacity: 0.9 },
  snapText: { color: C.text, fontSize: 11, fontWeight: '700' },
  play: { position: 'absolute', right: 8, bottom: 8, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: C.card2, borderWidth: 1, borderColor: C.border, opacity: 0.9 },
  note: { position: 'absolute', left: 0, right: 0, bottom: 10, alignItems: 'center', pointerEvents: 'none' },
  noteText: { color: C.text, fontSize: 13, fontWeight: '700', backgroundColor: C.card2, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },
});
