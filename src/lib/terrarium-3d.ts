// The terrarium in 3D (three.js): the tank, the pieces bought for it (lair.ts), and the spider as a model that walks
// between them on its own: it turns to face where it's going, steps in an alternating tetrapod gait, climbs the
// branch, rises to the web on a thread and hides under the bark. What it does and how the tank looks follow the
// app (tank-life.ts, fed in with `setLife`): the real day and night, the owner's sleep, Web Focus and gaming, kind
// days, today's web, molts, growing plants, the weather, the season, the worn pet and hat, a fly to catch, egg sacs
// and spiderlings, and replays of what was just logged. Step 9: nights out (an empty tank and a note), the shelf of
// souvenirs, a rare guest (the spider model recoloured, asleep until tapped), the party cake with tiny guests and
// the scroll, and the spider's throw in sten, sax, påse. Pure scene code with no renderer, so the tests can run it;
// components/terrarium-3d.tsx draws it with expo-gl. Units: the tank is 10 wide (x), 6 deep (z, the front glass at
// +3) and 5.5 high (y), the substrate's surface at y = 0. The spider faces +z at yaw 0.
import * as THREE from 'three';

import type { SouvenirShape } from './expeditions';
import type { GuestLook } from './guests';
import { lairSpots, MOVABLE } from './lair';
import { IDLE_LIFE, sizeAfter, SKINS_SHOWN, type Dressing, type FloorSeason, type HatShape, type PetMotion, type TankEvent, type TankLife, type TankMode, type TankSky, type WebSpec } from './tank-life';

export const TANK = { w: 10, d: 6, h: 5.5 };

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
/** The yaw that faces from `a` towards `b` on the floor. */
const faceTo = (a: THREE.Vector3, b: THREE.Vector3) => Math.atan2(b.x - a.x, b.z - a.z);
/** Seeded random numbers, so the pebbles lie the same way every time. */
function seeded(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
/** Moves `x` towards `to` by at most `rate`. */
const ease = (x: number, to: number, rate: number) => (Math.abs(to - x) <= rate ? to : x + Math.sign(to - x) * rate);

// ---- where things are ----

const BRANCH_FROM = v(-3.4, 0, -1.7);
const BRANCH_TO = v(0.8, 3.8, -2.3);
const branchAt = (t: number) => BRANCH_FROM.clone().lerp(BRANCH_TO, t);
const BRANCH_DIR = BRANCH_TO.clone().sub(BRANCH_FROM);
const BRANCH_YAW = Math.atan2(BRANCH_DIR.x, BRANCH_DIR.z);
const BRANCH_PITCH = Math.atan2(BRANCH_DIR.y, Math.hypot(BRANCH_DIR.x, BRANCH_DIR.z));
const BRANCH_R = 0.13;
const LAMP = v(1.8, TANK.h - 0.4, -0.4);

type Mode = 'floor' | 'hang' | 'branch' | 'wall';
/** Where the spider goes for each spot of lairSpots: on the floor, hanging under the web, up the branch or on the front glass (`entry`: where it leaves the floor). */
export type Spot3D = { id: string; pos: THREE.Vector3; mode: Mode; entry?: THREE.Vector3; face?: number; act?: string };

const FERN = v(3.9, 0, -2.0);
const MUSHROOMS = v(4.1, 0, 2.0);
const SPOTS: Record<string, Omit<Spot3D, 'id' | 'act'>> = {
  home: { pos: v(-0.2, 0, 0.6), mode: 'floor' },
  left: { pos: v(-1.6, 0, 1.0), mode: 'floor' },
  right: { pos: v(1.6, 0, 1.1), mode: 'floor' },
  web: { pos: v(-4.0, 3.1, -2.3), mode: 'hang', entry: v(-4.0, 0, -2.3) },
  lamp: { pos: v(1.8, 0, -0.4), mode: 'floor' },
  rug: { pos: v(-0.2, 0, 0.6), mode: 'floor' },
  plant: { pos: v(3.1, 0, -1.3), mode: 'floor', face: faceTo(v(3.1, 0, -1.3), FERN) },
  couch: { pos: v(-3.7, 0, 0.6), mode: 'floor', face: Math.PI / 2 },
  books: { pos: branchAt(0.62).add(v(0, BRANCH_R, 0)), mode: 'branch', entry: branchAt(0.05) },
  rack: { pos: v(3.4, 0.5, 0.9), mode: 'floor' },
  radio: { pos: v(-1.9, 0, 0.85), mode: 'floor', face: 0 },
  fireplace: { pos: v(3.5, 0, 1.3), mode: 'floor', face: faceTo(v(3.5, 0, 1.3), MUSHROOMS) },
  arcade: { pos: v(0.9, 0, -1.15), mode: 'floor', face: Math.PI },
};
/** Spots of its own: cosy by the moss at the front glass, asleep on a thread from the lid (no web yet), basking in a sunbeam. */
const COSY: Spot3D = { id: 'cosy', pos: v(-0.5, 0, 2.05), mode: 'floor', face: 0 };
const NAP: Spot3D = { id: 'nap', pos: v(0.4, 3.2, -1.6), mode: 'hang', entry: v(0.4, 0, -1.6), act: '💤' };
const SUN = v(1.3, 0, 1.95);
const SUN_SPOT: Spot3D = { id: 'sun', pos: SUN.clone(), mode: 'floor', face: 0, act: '☀️' };
/** Step 9: the party cake on the moss and where the spider reads its scroll; where a guest sleeps; the note left on a night out; the souvenir shelf on the back glass. */
const CAKE = v(0.75, 0, 2.15);
const PARTY_SPOT: Spot3D = { id: 'party', pos: v(0.75, 0, 0.85), mode: 'floor', face: 0, act: '📜' };
const GUEST_AT = v(2.35, 0, 1.85);
const NOTE_AT = v(-0.35, 0, 1.55);
const SHELF = { x0: 0.45, x1: 2.75, y: 1.75, z: -TANK.d / 2 + 0.2 };
/** Where each molt happens, so its shed skin stays right there. */
const SKIN_SLOTS = [v(-2.6, 0, -0.9), v(2.4, 0, -2.1), v(0.2, 0, 2.3), v(-0.6, 0, -2.2), v(4.3, 0, -0.2)];
const FLOOR = { x: TANK.w / 2 - 0.8, z: TANK.d / 2 - 0.6 };
const clampFloor = (p: THREE.Vector3) => p.set(clamp(p.x, -FLOOR.x, FLOOR.x), 0, clamp(p.z, -FLOOR.z, FLOOR.z));
/** The front glass from inside, where the spider's feet go when it climbs it, and how far from it it stands on the floor first. */
const GLASS_Z = TANK.d / 2 - 0.08;
const GLASS_FOOT = GLASS_Z - 0.95;

/**
 * Each movable piece's footprint where it stands by default (x0, x1, z0, z1): a piece moved by hand (lair.ts
 * withPlace) is kept on the floor with all of it inside the glass (`clampPlace`).
 */
const PIECE_BOX: Record<string, [number, number, number, number]> = {
  lamp: [1.3, 2.3, -0.9, 0.1],
  rug: [-1.6, 1.2, -0.4, 1.6],
  plant: [3.5, 4.3, -2.4, -1.6],
  couch: [-4.6, -2.8, -0.2, 1.4],
  books: [-3.5, 1.4, -2.45, -1.45],
  rack: [2.6, 4.45, 0.45, 1.8],
  radio: [-2.65, -1.15, 1.0, 2.5],
  fireplace: [3.35, 4.85, 1.3, 2.6],
  arcade: [0.55, 1.25, -2.3, -1.6],
};
const INNER = { x: TANK.w / 2 - 0.12, z: TANK.d / 2 - 0.12 };
/** (dx, dz) kept so the piece's footprint stays inside the glass; the corner web and unknown pieces don't move. */
export function clampPlace(id: string, dx: number, dz: number): [number, number] {
  const b = PIECE_BOX[id];
  if (!b || !MOVABLE.includes(id)) return [0, 0];
  return [clamp(dx, -INNER.x - b[0], INNER.x - b[1]), clamp(dz, -INNER.z - b[2], INNER.z - b[3])];
}
const offsetOf = (places: Record<string, [number, number]>, id: string) => {
  const p = places[id];
  return p ? clampPlace(id, p[0], p[1]) : ([0, 0] as [number, number]);
};

/** The spots for the pieces in `ids`, in 3D (the same ones, with the same acts, as the flat terrarium), moved with their pieces. */
export function spots3d(ids: readonly string[], places: Record<string, [number, number]> = {}): Spot3D[] {
  return lairSpots(ids).flatMap((s) => {
    const at = SPOTS[s.id];
    if (!at) return [];
    const [dx, dz] = offsetOf(places, s.id);
    const shift = v(dx, 0, dz);
    return [{ id: s.id, act: s.act, ...at, pos: at.pos.clone().add(shift), entry: at.entry?.clone().add(shift) }];
  });
}

// ---- materials and geometry helpers ----

const std = (color: THREE.ColorRepresentation, roughness = 0.8, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, ...extra });

/** A thin cylinder from `a` to `b` (silk, twigs). */
function strand(a: THREE.Vector3, b: THREE.Vector3, r: number, mat: THREE.Material) {
  const dir = b.clone().sub(a);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, dir.length(), 5, 1), mat);
  mesh.position.copy(a).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(v(0, 1, 0), dir.normalize());
  return mesh;
}

/** A cylinder geometry from `a` to `b`, for merging. */
function rod(a: THREE.Vector3, b: THREE.Vector3, r: number, segments = 6) {
  const dir = b.clone().sub(a);
  const geo = new THREE.CylinderGeometry(r, r, dir.length(), segments, 1);
  const m = new THREE.Matrix4().compose(a.clone().addScaledVector(dir, 0.5), new THREE.Quaternion().setFromUnitVectors(v(0, 1, 0), dir.normalize()), v(1, 1, 1));
  return geo.applyMatrix4(m);
}

/** A geometry placed by position, scale and a yaw, for merging. */
function placed(geo: THREE.BufferGeometry, pos: THREE.Vector3, scale: THREE.Vector3 = v(1, 1, 1), rot = new THREE.Euler()) {
  return geo.applyMatrix4(new THREE.Matrix4().compose(pos, new THREE.Quaternion().setFromEuler(rot), scale));
}

/** Several geometries as one (one draw call): positions and normals, no index. */
function merged(geos: THREE.BufferGeometry[]) {
  const flat = geos.map((g) => (g.index ? g.toNonIndexed() : g));
  const total = flat.reduce((a, g) => a + g.attributes.position.count, 0);
  const pos = new Float32Array(total * 3);
  const nor = new Float32Array(total * 3);
  let at = 0;
  for (const g of flat) {
    pos.set(g.attributes.position.array as Float32Array, at * 3);
    nor.set(g.attributes.normal.array as Float32Array, at * 3);
    at += g.attributes.position.count;
  }
  for (const g of [...geos, ...flat]) g.dispose();
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.computeBoundingSphere();
  return out;
}

/** Frees what a removed group held on the GPU. */
function disposeTree(o: THREE.Object3D) {
  o.traverse((x) => {
    const mesh = x as THREE.Mesh;
    mesh.geometry?.dispose();
    const m = mesh.material;
    if (Array.isArray(m)) m.forEach((y) => y.dispose());
    else (m as THREE.Material | undefined)?.dispose();
  });
}

// ---- the spider ----

type LegRig = { hip: THREE.Group; femur: THREE.Group; knee: THREE.Group; base: number; side: 1 | -1; phase: number; t1: number; t2: number; pair: number };

/** A limb segment from its joint along +x, `len` long. */
function segment(len: number, radius: number, mat: THREE.Material) {
  const geo = new THREE.CapsuleGeometry(radius, Math.max(0.001, len - radius * 2), 4, 8);
  geo.rotateZ(-Math.PI / 2);
  geo.translate(len / 2, 0, 0);
  return new THREE.Mesh(geo, mat);
}

// Each leg pair: its direction from the body (degrees from straight out, + forward), where it joins, how long it is.
const LEG_DEFS = [
  { alpha: 55, z: 0.44, scale: 1.15 },
  { alpha: 20, z: 0.37, scale: 1.0 },
  { alpha: -15, z: 0.3, scale: 1.0 },
  { alpha: -50, z: 0.23, scale: 1.12 },
];
const T1 = THREE.MathUtils.degToRad(50); // thigh up and out
const T2 = THREE.MathUtils.degToRad(-110); // knee bends down
const T3 = THREE.MathUtils.degToRad(-25); // the foot reaches the ground
const HIP_Y = 0.34;
/** The head's pivot (it turns to the camera while the tank is dragged). */
const NECK = v(0, HIP_Y, 0.22);
/** How high the top of its back is, for lying on it while molting. */
const BACK_Y = 0.68;

/** The spider's size in the tank (the model is built at 1). */
export const SPIDER_SCALE = 1.55;

const SKIN = { color: '#2a1f1b', roughness: 0.62, sheen: 0.8 };
const PREMOLT = { color: '#120c0a', roughness: 0.3, sheen: 1 };

/** A different spider from the same model (step 9's guests): other colours, longer or shorter legs, a bigger abdomen. */
type SpiderOpts = { skin?: string; leg?: string; legScale?: number; abdomen?: number };
/** How far the body sits above (or below) the usual hip height for legs `k` times as long, so the feet stay on the floor. */
const liftFor = (k: number) => 0.33 * (k - 1);

function buildSpider(marking: THREE.ColorRepresentation, o: SpiderOpts = {}) {
  const k = o.legScale ?? 1;
  const thin = k > 1.2 ? 0.65 : 1; // long legs are thin ones
  const root = new THREE.Group();
  root.scale.setScalar(SPIDER_SCALE);
  const body = new THREE.Group();
  body.position.y = liftFor(k);
  root.add(body);
  const skin = new THREE.MeshPhysicalMaterial({ color: o.skin ?? SKIN.color, roughness: SKIN.roughness, sheen: SKIN.sheen, sheenColor: new THREE.Color('#7a5c48'), sheenRoughness: 0.7 });
  const bellyMat = skin.clone(); // premolt darkens and glosses it
  const legMat = new THREE.MeshPhysicalMaterial({ color: o.leg ?? '#3a2b25', roughness: 0.6, sheen: 0.6, sheenColor: new THREE.Color('#6b5040'), sheenRoughness: 0.7 });
  const jointMat = std('#7a5e4c', 0.6);
  const markMat = std(marking, 0.45, { emissive: new THREE.Color(marking), emissiveIntensity: 0.18 });
  const eyeMat = std('#050505', 0.06, { metalness: 0.2 });
  const darkMat = std('#140e0c', 0.5);

  // the head (eyes, fangs and feelers on it) turns on its own; the abdomen behind
  const front = new THREE.Group();
  front.position.copy(NECK);
  body.add(front);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 24, 16), skin);
  head.scale.set(1, 0.62, 1.15);
  head.position.set(0, 0, 0.12);
  front.add(head);
  const abdomen = new THREE.Group();
  abdomen.position.set(0, 0.42, -0.2);
  abdomen.rotation.x = -0.15;
  abdomen.scale.setScalar(o.abdomen ?? 1);
  body.add(abdomen);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.36, 28, 20), bellyMat);
  belly.scale.set(0.82, 0.72, 1.1);
  abdomen.add(belly);
  const pedicel = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 8), skin);
  pedicel.rotation.x = Math.PI / 2;
  pedicel.position.set(0, 0.37, 0.12);
  body.add(pedicel);
  // markings along the top of the abdomen, following its curve
  const ry = 0.36 * 0.72;
  const rz = 0.36 * 1.1;
  const dab = new THREE.SphereGeometry(1, 14, 8);
  [0.2, 0.06, -0.08, -0.2].forEach((dz, i) => {
    const size = [0.06, 0.085, 0.075, 0.05][i];
    const mark = new THREE.Mesh(dab, markMat);
    const y = ry * Math.sqrt(Math.max(0, 1 - (dz / rz) ** 2));
    mark.scale.set(size, 0.03, size * 1.25);
    mark.position.set(0, y + 0.005, dz);
    mark.rotation.x = Math.atan2((ry * ry * dz) / (rz * rz), Math.max(0.05, y)); // tangent to the abdomen's curve
    abdomen.add(mark);
  });
  for (const side of [1, -1]) {
    const spot = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), markMat);
    spot.position.set(side * 0.2, 0.16, 0.02);
    abdomen.add(spot);
  }
  // eyes, fangs
  const eyes: [number, number, number, number][] = [
    [0.05, 0.42, 0.57, 0.034],
    [0.1, 0.415, 0.52, 0.022],
    [0.07, 0.445, 0.49, 0.019],
    [0.035, 0.452, 0.51, 0.016],
  ];
  for (const side of [1, -1]) {
    for (const [x, y, z, r] of eyes) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), eyeMat);
      eye.position.set(side * x, y - NECK.y, z - NECK.z);
      front.add(eye);
    }
    const fang = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 8), darkMat);
    fang.rotation.x = Math.PI * 0.85;
    fang.position.set(side * 0.045, 0.27 - NECK.y, 0.6 - NECK.z);
    front.add(fang);
  }

  // legs: hip (turns the leg's direction and swings it), femur (lifts it), knee and ankle (bend it)
  const legs: LegRig[] = [];
  LEG_DEFS.forEach((def, i) => {
    for (const side of [1, -1] as const) {
      const alpha = THREE.MathUtils.degToRad(def.alpha);
      const hip = new THREE.Group();
      hip.position.set(side * 0.16, HIP_Y, def.z);
      const base = side === 1 ? -alpha : Math.PI + alpha;
      hip.rotation.y = base;
      const femur = new THREE.Group();
      femur.rotation.z = T1;
      hip.add(femur);
      const [l1, l2, l3] = [0.42 * def.scale * k, 0.5 * def.scale * k, 0.22 * def.scale * k];
      femur.add(segment(l1, 0.045 * thin, legMat));
      const knee = new THREE.Group();
      knee.position.x = l1;
      knee.rotation.z = T2;
      femur.add(knee);
      const kneeCap = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), jointMat);
      knee.add(kneeCap);
      knee.add(segment(l2, 0.036 * thin, legMat));
      const ankle = new THREE.Group();
      ankle.position.x = l2;
      ankle.rotation.z = T3;
      knee.add(ankle);
      ankle.add(new THREE.Mesh(new THREE.SphereGeometry(0.034, 8, 6), jointMat));
      ankle.add(segment(l3, 0.026 * thin, legMat));
      body.add(hip);
      // alternating tetrapod: L1 R2 L3 R4 step together, then R1 L2 R3 L4
      legs.push({ hip, femur, knee, base, side, phase: (i % 2 === 0) === (side === 1) ? 0 : Math.PI, t1: T1, t2: T2, pair: i });
    }
  });
  // pedipalps: two short feelers by the fangs (they wave when it's poked)
  const palps: { upper: THREE.Group; side: 1 | -1 }[] = [];
  for (const side of [1, -1] as const) {
    const palp = new THREE.Group();
    palp.position.set(side * 0.08, 0.31 - NECK.y, 0.56 - NECK.z);
    palp.rotation.y = side === 1 ? -1.35 : Math.PI + 1.35;
    const upper = new THREE.Group();
    upper.rotation.z = -0.25;
    palp.add(upper);
    upper.add(segment(0.13, 0.028, legMat));
    const lower = new THREE.Group();
    lower.position.x = 0.13;
    lower.rotation.z = -0.7;
    upper.add(lower);
    lower.add(segment(0.12, 0.024, legMat));
    front.add(palp);
    palps.push({ upper, side });
  }
  // where a hat sits: on top of the head
  const hatMount = new THREE.Group();
  hatMount.position.set(0, 0.135, 0.1);
  front.add(hatMount);
  return { root, body, front, abdomen, legs, palps, markMat, bellyMat, hatMount, lift: liftFor(k), abdomenScale: o.abdomen ?? 1 };
}

/** A small spider as one geometry (one draw call): for shed skins and spiderlings. Its feet stand at y = 0. */
function miniSpiderGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  parts.push(placed(new THREE.SphereGeometry(0.24, 14, 10), v(0, HIP_Y, 0.34), v(1, 0.62, 1.15)));
  parts.push(placed(new THREE.SphereGeometry(0.36, 16, 12), v(0, 0.42, -0.2), v(0.82, 0.72, 1.1)));
  for (const def of LEG_DEFS) {
    for (const side of [1, -1]) {
      const a = THREE.MathUtils.degToRad(def.alpha);
      const out = v(side * Math.cos(a), 0, Math.sin(a));
      const hip = v(side * 0.16, HIP_Y, def.z);
      const knee = hip.clone().addScaledVector(out, 0.42 * def.scale * Math.cos(T1)).add(v(0, 0.42 * def.scale * Math.sin(T1), 0));
      const foot = knee.clone().addScaledVector(out, 0.36 * def.scale).setY(0.02);
      parts.push(rod(hip, knee, 0.04, 5), rod(knee, foot, 0.032, 5));
    }
  }
  return merged(parts);
}

// ---- the tank and its pieces ----

function buildTank() {
  const tank = new THREE.Group();
  const top = std('#5a3d25', 1);
  const cut = std('#3b2616', 1);
  const soil = new THREE.Mesh(new THREE.BoxGeometry(TANK.w, 1.2, TANK.d), [cut, cut, top, cut, cut, cut]);
  soil.position.y = -0.6;
  soil.receiveShadow = true;
  soil.name = 'soil';
  tank.add(soil);
  const rnd = seeded(7);
  const pebbleMats = ['#6e6a64', '#8a7f72', '#4d4740'].map((c) => std(c, 0.9));
  const pebbles: THREE.BufferGeometry[][] = [[], [], []];
  for (let i = 0; i < 26; i++) {
    const r = 0.05 + rnd() * 0.1;
    // half on the surface, half in the front cut (seen through the glass)
    const pos = i < 14 ? v((rnd() - 0.5) * (TANK.w - 0.6), r * 0.3, (rnd() - 0.5) * (TANK.d - 0.6)) : v((rnd() - 0.5) * (TANK.w - 0.4), -0.15 - rnd() * 0.95, TANK.d / 2 - r * 0.4);
    pebbles[i % 3].push(placed(new THREE.IcosahedronGeometry(r, 0), pos, v(1, 1, 1), new THREE.Euler(rnd() * 3, rnd() * 3, rnd() * 3)));
  }
  pebbles.forEach((list, i) => tank.add(new THREE.Mesh(merged(list), pebbleMats[i])));
  // glass: only the panes facing the camera show (front side), faintly
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(TANK.w + 0.06, TANK.h + 1.2, TANK.d + 0.06),
    new THREE.MeshStandardMaterial({ color: '#d6ecff', transparent: true, opacity: 0.07, roughness: 0.05, metalness: 0, depthWrite: false }),
  );
  glass.position.y = (TANK.h - 1.2) / 2;
  glass.renderOrder = 2;
  tank.add(glass);
  // glints on the front glass: two soft diagonal streaks, brighter by day (applyLight)
  const glint = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.06, depthWrite: false, blending: THREE.AdditiveBlending });
  for (const [x, w] of [
    [-2.6, 0.55],
    [-1.7, 0.18],
    [3.1, 0.35],
  ] as const) {
    const streak = new THREE.Mesh(new THREE.PlaneGeometry(w, TANK.h * 1.05), glint);
    streak.position.set(x, TANK.h / 2 - 0.3, TANK.d / 2 + 0.045);
    streak.rotation.z = -0.38;
    streak.name = 'glass-glint';
    streak.renderOrder = 3;
    tank.add(streak);
  }
  // the frame along every edge
  const frame = std('#2b3038', 0.5, { metalness: 0.3 });
  const [hw, hd, y0, y1] = [TANK.w / 2, TANK.d / 2, -1.2, TANK.h];
  const corners = [v(-hw, 0, -hd), v(hw, 0, -hd), v(hw, 0, hd), v(-hw, 0, hd)];
  const bars: THREE.BufferGeometry[] = [];
  corners.forEach((c, i) => {
    const n = corners[(i + 1) % 4];
    for (const y of [y0, y1]) bars.push(rod(c.clone().setY(y), n.clone().setY(y), 0.06, 5));
    bars.push(rod(c.clone().setY(y0), c.clone().setY(y1), 0.06, 5));
  });
  tank.add(new THREE.Mesh(merged(bars), frame));
  // a mesh lid
  const lid = new THREE.Mesh(new THREE.PlaneGeometry(TANK.w, TANK.d), new THREE.MeshBasicMaterial({ color: '#1c2026', transparent: true, opacity: 0.3, depthWrite: false }));
  lid.rotation.x = -Math.PI / 2;
  lid.position.y = TANK.h;
  tank.add(lid);
  const grid: number[] = [];
  for (let x = -hw; x <= hw + 1e-6; x += 0.25) grid.push(x, TANK.h, -hd, x, TANK.h, hd);
  for (let z = -hd; z <= hd + 1e-6; z += 0.25) grid.push(-hw, TANK.h, z, hw, TANK.h, z);
  const gridGeo = new THREE.BufferGeometry();
  gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(grid, 3));
  tank.add(new THREE.LineSegments(gridGeo, new THREE.LineBasicMaterial({ color: '#6b7280', transparent: true, opacity: 0.35 })));
  // the shelf it stands on
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(TANK.w + 1.4, 0.3, TANK.d + 1.2), std('#1b1f26', 0.9));
  shelf.position.y = -1.35;
  tank.add(shelf);
  return tank;
}

const WEB_CORNER = v(-TANK.w / 2 + 0.05, TANK.h - 0.05, -TANK.d / 2 + 0.05);
/** The web's radial threads' far ends, across the back-left corner and sloping down into the tank. */
const webEnds = (n: number) =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / Math.max(1, n - 1)) * (Math.PI / 2);
    return WEB_CORNER.clone().add(v(Math.sin(a) * 2.2, -1.1 - Math.cos(a) * 0.5, Math.cos(a) * 1.9));
  });
/** A point on the web: `f` of the way out along the spiral between threads `i` and `i + 1`. */
const webPoint = (ends: THREE.Vector3[], i: number, f: number, t = 0.5) => {
  const a = WEB_CORNER.clone().lerp(ends[Math.min(i, ends.length - 1)], f);
  const b = WEB_CORNER.clone().lerp(ends[Math.min(i + 1, ends.length - 1)], f);
  return a.lerp(b, t);
};

/**
 * Today's web (tank-life.ts webFor): a radial thread per glass on top of three, a spiral ring per habit or quest
 * done, dew once sleep is logged, a silk bundle per finished task. Silk as lines: one draw call.
 */
export function buildWeb(spec: WebSpec): THREE.Group {
  const g = new THREE.Group();
  g.name = 'web-silk';
  const n = Math.max(3, spec.radials);
  const ends = webEnds(n);
  const pts: number[] = [];
  const seg = (a: THREE.Vector3, b: THREE.Vector3) => pts.push(a.x, a.y, a.z, b.x, b.y, b.z);
  for (const e of ends) seg(WEB_CORNER, e);
  const rings = Math.max(0, spec.rings);
  const ringAt = (k: number) => 0.2 + (0.72 * (k + 1)) / (rings + 1);
  for (let k = 0; k < rings; k++) {
    for (let i = 0; i < n - 1; i++) {
      // a spiral: each ring creeps outward thread by thread, sagging a little between them
      const f1 = ringAt(k) + (0.04 * i) / n;
      const f2 = ringAt(k) + (0.04 * (i + 1)) / n;
      const a = WEB_CORNER.clone().lerp(ends[i], f1);
      const b = WEB_CORNER.clone().lerp(ends[i + 1], f2);
      const mid = a.clone().lerp(b, 0.5).add(v(0, -0.03, 0));
      seg(a, mid);
      seg(mid, b);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: '#e8eef6', transparent: true, opacity: 0.6 }));
  lines.name = 'web-lines';
  g.add(lines);
  const rnd = seeded(11);
  const m = new THREE.Matrix4();
  if (spec.dew > 0) {
    const dew = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 8, 6), std('#d8f2ff', 0.05, { transparent: true, opacity: 0.85, metalness: 0.1 }), spec.dew);
    for (let k = 0; k < spec.dew; k++) {
      const p = webPoint(ends, Math.floor(rnd() * (n - 1)), rings ? ringAt(Math.floor(rnd() * rings)) : 0.3 + rnd() * 0.6, rnd());
      dew.setMatrixAt(k, m.makeTranslation(p.x, p.y - 0.04, p.z));
    }
    dew.name = 'web-dew';
    g.add(dew);
  }
  if (spec.bundles > 0) {
    const bundles = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 10, 8), std('#f1ece2', 0.95), spec.bundles);
    for (let k = 0; k < spec.bundles; k++) {
      const p = webPoint(ends, 1 + Math.floor(rnd() * (n - 2)), 0.35 + rnd() * 0.5, 0.5);
      bundles.setMatrixAt(k, m.compose(p.add(v(0, -0.12, 0)), new THREE.Quaternion(), v(1, 1.5, 1)));
    }
    bundles.name = 'web-bundles';
    g.add(bundles);
  }
  return g;
}

/** How a piece looks beyond its kind: today's web, a plant's growth (0–1) and its bloom once fully grown. */
export type PieceLook = { web?: WebSpec; growth?: number; bloom?: boolean };

/** Soft contact shadows under the pieces that sit on the floor (centre x, z and radii), so they don't float when real shadows are off. */
const CONTACT: Record<string, [number, number, number, number]> = {
  couch: [-3.7, 0.6, 1.0, 0.85],
  rack: [3.5, 1.1, 1.05, 0.75],
  radio: [-1.9, 1.75, 0.85, 0.85],
  fireplace: [4.1, 2.0, 0.75, 0.6],
  arcade: [0.9, -1.95, 0.4, 0.35],
  plant: [3.9, -2.0, 0.6, 0.55],
};
const contactMat = new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.16, depthWrite: false });
function contactShadow([x, z, rx, rz]: [number, number, number, number]) {
  const g = new THREE.Group();
  for (const k of [1, 0.72, 0.45]) {
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1, 24), contactMat);
    disc.rotation.x = -Math.PI / 2;
    disc.scale.set(rx * k, rz * k, 1);
    disc.position.set(x, 0.006 + (1 - k) * 0.004, z);
    g.add(disc);
  }
  g.name = 'contact';
  return g;
}

/** How each piece looks. Lights belong to their piece, so a faint "next" piece can drop them. Named parts change with the light (lamp, glow). */
export function buildPiece(id: string, look: PieceLook = {}): THREE.Group {
  const g = new THREE.Group();
  g.name = `piece-${id}`;
  if (CONTACT[id]) g.add(contactShadow(CONTACT[id]));
  const grown = clamp(look.growth ?? 1, 0, 1);
  if (id === 'web') {
    g.add(buildWeb(look.web ?? IDLE_LIFE.web));
    return g;
  }
  if (id === 'lamp') {
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.5, 0.35, 20, 1, true), std('#4a4f58', 0.4, { metalness: 0.5, side: THREE.DoubleSide }));
    shade.position.set(1.8, TANK.h + 0.15, -0.4);
    g.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), new THREE.MeshBasicMaterial({ color: '#ffe2a0' }));
    bulb.position.set(1.8, TANK.h - 0.05, -0.4);
    bulb.name = 'lamp-bulb';
    g.add(bulb);
    const light = new THREE.PointLight('#ffb347', 14, 9, 1.6);
    light.position.copy(LAMP);
    light.name = 'lamp-light';
    g.add(light);
    const warm = new THREE.Mesh(new THREE.CircleGeometry(1.3, 32), new THREE.MeshBasicMaterial({ color: '#ffb347', transparent: true, opacity: 0.12, depthWrite: false }));
    warm.rotation.x = -Math.PI / 2;
    warm.position.set(1.8, 0.01, -0.4);
    warm.name = 'lamp-warm';
    g.add(warm);
    return g;
  }
  if (id === 'rug') {
    // moss: spreads as it grows, tiny white flowers once it's fully grown
    const greens = ['#3f6b2f', '#4f8a3a', '#356027', '#5c9a44'].map((c) => std(c, 1));
    const rnd = seeded(3);
    const count = 5 + Math.round(4 * grown);
    const tufts: THREE.BufferGeometry[][] = [[], [], [], []];
    const tops: THREE.Vector3[] = [];
    for (let i = 0; i < 9; i++) {
      const r = (0.3 + rnd() * 0.3) * (0.55 + 0.45 * grown);
      const p = v(-0.2 + (rnd() - 0.5) * 2 * (0.7 + 0.3 * grown), 0, 0.6 + (rnd() - 0.5) * 1.3 * (0.7 + 0.3 * grown));
      if (i >= count) continue;
      tufts[i % 4].push(placed(new THREE.SphereGeometry(r, 12, 8), p, v(1, 0.32, 1)));
      tops.push(p.clone().setY(r * 0.32));
    }
    tufts.forEach((list, i) => {
      if (list.length) g.add(new THREE.Mesh(merged(list), greens[i]));
    });
    if (look.bloom) {
      const flowers = tops.map((p, i) => placed(new THREE.SphereGeometry(0.05, 6, 4), p.clone().add(v(((i % 3) - 1) * 0.12, 0.02, ((i % 2) - 0.5) * 0.15))));
      g.add(new THREE.Mesh(merged(flowers), std('#fff6e8', 0.6, { emissive: new THREE.Color('#fff2c8'), emissiveIntensity: 0.2 })));
    }
    return g;
  }
  if (id === 'plant') {
    // the fern: more and longer fronds as it grows; little pale flowers at the tips once fully grown
    const leaf = [std('#3f8a3a', 0.7, { side: THREE.DoubleSide }), std('#2f6b2c', 0.7, { side: THREE.DoubleSide })];
    const count = 5 + Math.round(4 * grown);
    const size = 0.45 + 0.55 * grown;
    const tips: THREE.Vector3[] = [];
    for (let i = 0; i < count; i++) {
      const frond = new THREE.Group();
      frond.position.copy(FERN);
      frond.rotation.y = (i / count) * Math.PI * 2;
      frond.scale.setScalar(size);
      const blade = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), leaf[i % 2]);
      blade.scale.set(0.16, 0.03, 1.1 + (i % 3) * 0.2);
      blade.position.set(0, 0.9 + (i % 3) * 0.2, 0.75);
      blade.rotation.x = -0.75 + (i % 3) * 0.15;
      frond.add(blade);
      g.add(frond);
      const a = frond.rotation.y;
      tips.push(FERN.clone().add(v(Math.sin(a) * 1.5 * size, (0.75 + (i % 3) * 0.2) * size, Math.cos(a) * 1.5 * size)));
    }
    if (look.bloom) g.add(new THREE.Mesh(merged(tips.map((p) => placed(new THREE.SphereGeometry(0.07, 6, 4), p))), std('#ffd9ec', 0.6, { emissive: new THREE.Color('#ffc2e0'), emissiveIntensity: 0.25 })));
    return g;
  }
  if (id === 'couch') {
    // half a hollow log lying on its side, the arch up: the spider fits under it
    const bark = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 1.7, 22, 1, true, 0, Math.PI), std('#6b4a2f', 1, { side: THREE.DoubleSide }));
    bark.rotation.z = Math.PI / 2;
    bark.position.set(-3.7, 0, 0.6);
    g.add(bark);
    const ridges: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 5; i++) {
      const a = -0.9 + i * 0.45;
      ridges.push(placed(new THREE.BoxGeometry(1.7, 0.05, 0.08), v(-3.7, Math.cos(a) * 0.76, 0.6 + Math.sin(a) * 0.76), v(1, 1, 1), new THREE.Euler(-a, 0, 0)));
    }
    g.add(new THREE.Mesh(merged(ridges), std('#4a3220', 1)));
    return g;
  }
  if (id === 'books') {
    const wood = std('#6b4a2f', 0.95);
    g.add(strand(BRANCH_FROM.clone().add(v(0, -0.2, 0)), BRANCH_TO, BRANCH_R, wood));
    g.add(strand(branchAt(0.55), branchAt(0.55).add(v(0.6, 0.9, 0.3)), 0.06, wood));
    g.add(strand(branchAt(0.3), branchAt(0.3).add(v(-0.5, 0.6, 0.1)), 0.05, wood));
    return g;
  }
  if (id === 'rack') {
    const greys = ['#5b5f66', '#6f737a', '#83878e'].map((c) => std(c, 0.85));
    const rocks: [number, number, number, number][] = [
      [3.4, 0.22, 0.9, 0.6],
      [4.0, 0.15, 1.35, 0.45],
      [2.95, 0.12, 1.45, 0.36],
    ];
    rocks.forEach(([x, y, z, r], i) => {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), greys[i]);
      rock.scale.set(1, 0.55, 0.9);
      rock.position.set(x, y, z);
      rock.rotation.y = i * 0.9;
      g.add(rock);
    });
    return g;
  }
  if (id === 'radio') {
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.62, 0.22, 28), std('#7a7f86', 0.6));
    dish.position.set(-1.9, 0.11, 1.75);
    g.add(dish);
    const water = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.02, 28), std('#3fa9ff', 0.05, { metalness: 0.1, transparent: true, opacity: 0.85 }));
    water.position.set(-1.9, 0.2, 1.75);
    g.add(water);
    return g;
  }
  if (id === 'fireplace') {
    // glow mushrooms: bigger caps and new little ones as they grow; a ring of tiny ones once fully grown
    const stem = std('#e8dcc8', 0.8);
    const cap = std('#8fe07a', 0.5, { emissive: new THREE.Color('#9bff8a'), emissiveIntensity: 0.7 });
    const size = 0.5 + 0.5 * grown;
    const caps: [number, number, number, number][] = [
      [4.1, 2.0, 0.42, 0.26],
      [4.55, 1.6, 0.3, 0.2],
      [3.8, 2.45, 0.24, 0.16],
    ];
    if (grown >= 0.6) caps.push([4.6, 2.35, 0.2, 0.13], [3.6, 1.75, 0.17, 0.11]);
    if (look.bloom) for (let i = 0; i < 6; i++) caps.push([4.1 + Math.cos(i) * 0.75, 2.0 + Math.sin(i) * 0.55, 0.1, 0.07]);
    const stems: THREE.BufferGeometry[] = [];
    const tops: THREE.BufferGeometry[] = [];
    for (const [x, z, h0, r0] of caps) {
      const [h, r] = [h0 * size, r0 * size];
      stems.push(placed(new THREE.CylinderGeometry(r * 0.28, r * 0.35, h, 10), v(x, h / 2, z)));
      tops.push(placed(new THREE.SphereGeometry(r, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), v(x, h - 0.02, z)));
    }
    g.add(new THREE.Mesh(merged(stems), stem));
    const capMesh = new THREE.Mesh(merged(tops), cap);
    capMesh.name = 'glow-cap';
    g.add(capMesh);
    const glow = new THREE.PointLight('#9bff8a', 3, 3.5, 1.6);
    glow.position.set(4.1, 0.9, 1.9);
    glow.name = 'glow-light';
    g.add(glow);
    return g;
  }
  if (id === 'arcade') {
    const crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.45, 0),
      std('#8fd3ff', 0.1, { metalness: 0.2, emissive: new THREE.Color('#2a6fff'), emissiveIntensity: 0.55, transparent: true, opacity: 0.9 }),
    );
    crystal.scale.set(0.6, 1.6, 0.6);
    crystal.position.set(0.9, 0.62, -1.95);
    crystal.rotation.y = 0.4;
    crystal.name = 'crystal';
    g.add(crystal);
    const glow = new THREE.PointLight('#8fd3ff', 3, 3.5, 1.6);
    glow.position.set(0.9, 1.0, -1.5);
    glow.name = 'crystal-light';
    g.add(glow);
    return g;
  }
  return g;
}

/** A piece drawn faintly, without its lights: what's next in the shop. */
function ghostOf(g: THREE.Group) {
  g.traverse((o) => {
    if ((o as THREE.Light).isLight) o.visible = false;
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh || (o as THREE.LineSegments).isLineSegments) {
      const m = (mesh.material as THREE.Material).clone();
      m.transparent = true;
      m.opacity = 0.16;
      m.depthWrite = false;
      mesh.material = m;
    }
  });
  g.name = 'ghost';
  return g;
}

// ---- seasonal dressing, weather, hats and pets ----

/** The season's dressing (tank-life.ts dressingFor). `flicker`: parts that twinkle or flicker. */
function buildDressing(item: Dressing): THREE.Group {
  const g = new THREE.Group();
  g.name = `dressing-${item}`;
  const thread = new THREE.MeshBasicMaterial({ color: '#e8eef6', transparent: true, opacity: 0.6 });
  if (item === 'star') {
    // the Advent star, hung from the lid over the branch's tip
    const gold = std('#ffd54a', 0.35, { metalness: 0.4, emissive: new THREE.Color('#ffb300'), emissiveIntensity: 0.6 });
    const at = BRANCH_TO.clone().add(v(0, 0.55, 0));
    const a = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), gold);
    a.position.copy(at);
    a.scale.set(1, 1, 0.35);
    const b = a.clone();
    b.rotation.z = Math.PI / 4;
    b.scale.set(0.75, 0.75, 0.3);
    g.add(a, b, strand(at.clone().add(v(0, 0.2, 0)), at.clone().setY(TANK.h), 0.008, thread));
  } else if (item === 'candles') {
    // Lucia: three candles along the back
    const wax = std('#f7f3e8', 0.7);
    const flame = new THREE.MeshBasicMaterial({ color: '#ffcc66' });
    for (const x of [-1.4, -0.4, 0.6]) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.7, 12), wax);
      c.position.set(x, 0.35, -2.55);
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 8), flame);
      f.position.set(x, 0.82, -2.55);
      f.name = 'flicker';
      const halo = new THREE.Mesh(new THREE.CircleGeometry(0.35, 16), new THREE.MeshBasicMaterial({ color: '#ffb84d', transparent: true, opacity: 0.18, depthWrite: false }));
      halo.position.set(x, 0.85, -2.5);
      g.add(c, f, halo);
    }
  } else if (item === 'sprig') {
    // Julfrid: a spruce sprig on the floor at the front
    const twig: THREE.BufferGeometry[] = [rod(v(1.6, 0.08, 2.4), v(3.0, 0.12, 2.0), 0.04)];
    for (let i = 0; i < 9; i++) {
      const t = i / 8;
      const p = v(1.6 + 1.4 * t, 0.12, 2.4 - 0.4 * t);
      for (const side of [1, -1]) twig.push(placed(new THREE.ConeGeometry(0.05, 0.34, 5), p.clone().add(v(0, 0.02, side * 0.12)), v(1, 1, 1), new THREE.Euler(side * 1.2, 0, -0.3)));
    }
    g.add(new THREE.Mesh(merged(twig), std('#2f5d36', 0.85)));
    g.add(new THREE.Mesh(merged([placed(new THREE.SphereGeometry(0.08, 8, 6), v(2.2, 0.2, 2.25)), placed(new THREE.SphereGeometry(0.07, 8, 6), v(2.7, 0.2, 2.1))]), std('#c62828', 0.3)));
  } else if (item === 'sparkles') {
    // nyår: sparkles drifting in the upper tank
    const rnd = seeded(31);
    const pts: number[] = [];
    for (let i = 0; i < 46; i++) pts.push((rnd() - 0.5) * (TANK.w - 1), 1.6 + rnd() * (TANK.h - 2), (rnd() - 0.5) * (TANK.d - 1));
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const sparks = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#ffe08a', size: 0.12, transparent: true, opacity: 0.9, depthWrite: false }));
    sparks.name = 'flicker';
    g.add(sparks);
  } else if (item === 'feathers') {
    // påskris: birch twigs in the back-right corner, with coloured feathers
    const wood = std('#5b4636', 0.9);
    const colors = ['#ff6fae', '#ffd54a', '#5ccf7a', '#5aa9ff', '#c58cff', '#ff8a4a'];
    const base = v(4.0, 0, -2.4);
    [v(-0.6, 3.0, 0.3), v(0.1, 3.3, 0.1), v(0.5, 2.7, 0.4)].forEach((tip, i) => {
      g.add(strand(base, base.clone().add(tip), 0.03, wood));
      for (let k = 0; k < 2; k++) {
        const f = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), std(colors[(i * 2 + k) % colors.length], 0.9));
        f.scale.set(0.35, 1, 0.12);
        f.position.copy(base.clone().add(tip.clone().multiplyScalar(0.55 + 0.35 * k))).add(v(0.08, -0.1, 0));
        f.rotation.z = 0.4 - k * 0.8;
        g.add(f);
      }
    });
  } else if (item === 'embers') {
    // Valborg: a little ember glow by the back
    const rnd = seeded(5);
    const embers: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 9; i++) embers.push(placed(new THREE.DodecahedronGeometry(0.08 + rnd() * 0.06, 0), v(-2.2 + (rnd() - 0.5) * 0.7, 0.06, -1.9 + (rnd() - 0.5) * 0.5)));
    const ember = new THREE.Mesh(merged(embers), std('#ff6a1a', 0.6, { emissive: new THREE.Color('#ff4500'), emissiveIntensity: 1.2 }));
    ember.name = 'flicker';
    const halo = new THREE.Mesh(new THREE.CircleGeometry(0.9, 24), new THREE.MeshBasicMaterial({ color: '#ff7a2a', transparent: true, opacity: 0.16, depthWrite: false }));
    halo.rotation.x = -Math.PI / 2;
    halo.position.set(-2.2, 0.02, -1.9);
    g.add(ember, halo);
  } else if (item === 'pole') {
    // midsommar: a little maypole, leafy, with two rings
    const green = std('#3f7f3a', 0.9);
    const at = v(2.6, 0, -1.9);
    g.add(strand(at, at.clone().setY(2.6), 0.05, green), strand(at.clone().add(v(-0.6, 2.1, 0)), at.clone().add(v(0.6, 2.1, 0)), 0.04, green));
    for (const side of [-1, 1]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.035, 6, 16), green);
      ring.position.copy(at.clone().add(v(side * 0.6, 1.8, 0)));
      g.add(ring);
    }
    const flowers = [0.6, 1.2, 1.8, 2.4].flatMap((y, i) => [placed(new THREE.SphereGeometry(0.05, 6, 4), at.clone().add(v(Math.cos(i * 2) * 0.07, y, Math.sin(i * 2) * 0.07)))]);
    g.add(new THREE.Mesh(merged(flowers), std('#ffe14d', 0.6)));
  } else if (item === 'pumpkin') {
    // Halloween: a pumpkin at the front left, glowing a little after dark
    const orange = std('#f07a1a', 0.6, { emissive: new THREE.Color('#ff7a00'), emissiveIntensity: 0.1 });
    const at = v(-3.1, 0.32, 2.15);
    const lobes: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 6; i++) lobes.push(placed(new THREE.SphereGeometry(0.26, 12, 8), at.clone().add(v(Math.cos((i / 6) * Math.PI * 2) * 0.13, 0, Math.sin((i / 6) * Math.PI * 2) * 0.13)), v(0.75, 1, 0.75)));
    const p = new THREE.Mesh(merged(lobes), orange);
    p.name = 'pumpkin';
    g.add(p, strand(at.clone().add(v(0, 0.2, 0)), at.clone().add(v(0.04, 0.38, 0)), 0.035, std('#3f6b2f', 0.9)));
  }
  return g;
}

/** A hat on the spider's head (tank-life.ts hatShape), at the model's own size. */
function buildHat(shape: HatShape, id: string): THREE.Group {
  const g = new THREE.Group();
  if (shape === 'cap') {
    const red = std('#d93030', 0.7);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), red);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.015, 16, 1, false, -Math.PI / 2, Math.PI), red);
    brim.position.set(0, 0.005, 0.1);
    g.add(dome, brim);
  } else if (shape === 'top') {
    const black = std('#141414', 0.5);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.26, 16), black);
    crown.position.y = 0.14;
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 20), black);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.112, 0.112, 0.04, 16), std('#a02020', 0.6));
    band.position.y = 0.04;
    g.add(crown, brim, band);
  } else if (shape === 'crown') {
    const gold = std('#f2c230', 0.3, { metalness: 0.7 });
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.13, 0.09, 14, 1, true), gold);
    ring.position.y = 0.04;
    g.add(ring);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 5), gold);
      tip.position.set(Math.sin(a) * 0.13, 0.12, Math.cos(a) * 0.13);
      g.add(tip);
    }
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.03, 0), std('#e0245e', 0.2));
    gem.position.set(0, 0.04, 0.14);
    g.add(gem);
  } else if (shape === 'grad') {
    const black = std('#1a1a1f', 0.6);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.13, 0.07, 14), black);
    cap.position.y = 0.03;
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.02, 0.34), black);
    board.position.y = 0.08;
    board.rotation.y = Math.PI / 4;
    g.add(cap, board, strand(v(0, 0.09, 0), v(0.16, 0.0, 0.05), 0.008, std('#f2c230', 0.5)));
  } else if (shape === 'pumpkin') {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 10), std('#f07a1a', 0.6));
    p.scale.set(1, 0.75, 1);
    p.position.y = 0.08;
    g.add(p, strand(v(0, 0.17, 0), v(0.02, 0.24, 0), 0.015, std('#3f6b2f', 0.9)));
  } else if (shape === 'tomte') {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.36, 14), std('#c62828', 0.8));
    cone.position.set(0, 0.2, -0.03);
    cone.rotation.x = -0.35;
    const brim = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.035, 8, 18), std('#f5f5f5', 1));
    brim.rotation.x = Math.PI / 2;
    brim.position.y = 0.03;
    const pom = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), std('#f5f5f5', 1));
    pom.position.set(0, 0.36, -0.15);
    g.add(cone, brim, pom);
  } else {
    // anything else: a beanie in a colour of its own
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    const color = new THREE.Color().setHSL((h % 360) / 360, 0.55, 0.5);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.155, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), std(color, 0.9));
    const fold = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.045, 16), std(color.clone().multiplyScalar(0.8), 0.9));
    fold.position.y = 0.015;
    g.add(dome, fold);
  }
  g.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.name ||= 'hat';
  });
  return g;
}

const PET_COLOR: Record<string, string> = {
  water_strider: '#3b3b3b',
  checklist_cricket: '#5d8a3a',
  snow_flea: '#c8d0dc',
  iron_beetle: '#2a3550',
  fossil_beetle: '#6b5a45',
  golden_scarab: '#d4a017',
  mood_moth: '#c9a0dc',
  zen_moth: '#d8d2c0',
  moonlight_moth: '#cfd8ff',
  solstice_moth: '#55557a',
  sleepy_lacewing: '#9fe0a0',
  stride_skipper: '#e0a040',
  dawn_mayfly: '#ffcf8a',
  focus_firefly: '#d4ff6a',
  lucia_glowworm: '#ffe27a',
  ghost_gnat: '#dfe8ff',
  phantom_fly: '#ffd7ff',
  weekend_wasp: '#e8c020',
  hydro_hornet: '#e0a020',
  quest_dragonfly: '#3aa0ff',
  sunbeam_dragonfly: '#ffb030',
};

/** A fly (pet, catchable or prey): its body, wings that flap and, for glowing ones, a light of its own (emissive only). */
function buildBug(motion: PetMotion, fly: string) {
  const g = new THREE.Group();
  const color = PET_COLOR[fly] ?? '#2f2f2f';
  const wings: THREE.Mesh[] = [];
  let glowMat: THREE.MeshStandardMaterial | null = null;
  const wingMat = new THREE.MeshStandardMaterial({ color: motion === 'lamp' ? color : '#e8f0ff', roughness: 0.4, transparent: true, opacity: motion === 'lamp' ? 0.85 : 0.45, side: THREE.DoubleSide, depthWrite: false });
  if (motion === 'trundle') {
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), std(color, 0.3, { metalness: 0.5 }));
    shell.scale.set(0.85, 0.8, 1.15);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), std('#141414', 0.5));
    head.position.set(0, 0.03, 0.2);
    g.add(shell, head);
  } else if (motion === 'hop') {
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.2, 4, 8), std(color, 0.6));
    body.rotation.x = Math.PI / 2;
    body.position.y = 0.09;
    g.add(body);
    const leg = std(color, 0.6);
    for (const side of [1, -1]) g.add(strand(v(side * 0.05, 0.09, -0.04), v(side * 0.13, 0.18, -0.12), 0.015, leg), strand(v(side * 0.13, 0.18, -0.12), v(side * 0.12, 0.0, -0.22), 0.012, leg));
  } else {
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(motion === 'lamp' ? 0.045 : 0.05, motion === 'lamp' ? 0.12 : 0.08, 4, 8), std(motion === 'glow' ? '#3a3a2a' : color, 0.5));
    body.rotation.x = Math.PI / 2;
    g.add(body);
    if (motion === 'glow') {
      glowMat = std(color, 0.4, { emissive: new THREE.Color(color), emissiveIntensity: 0.4 });
      const tail = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), glowMat);
      tail.position.z = -0.08;
      g.add(tail);
    }
    const span = motion === 'lamp' ? 0.16 : 0.11;
    for (const side of [1, -1]) {
      const wing = new THREE.Mesh(new THREE.CircleGeometry(span, 12), wingMat);
      wing.rotation.x = -Math.PI / 2;
      wing.scale.set(1, 0.55, 1);
      wing.position.set(side * span * 0.9, 0.03, -0.01);
      wings.push(wing);
      g.add(wing);
    }
  }
  return { group: g, wings, glowMat };
}

// ---- step 9: souvenirs, the party, the note ----

/** A souvenir on the shelf (expeditions.ts SOUVENIRS), standing on y = 0. */
function souvenirMesh(shape: SouvenirShape, color: string): THREE.Mesh {
  const shiny = shape === 'coin' || shape === 'screw';
  const mat = std(color, shiny ? 0.35 : 0.8, shiny ? { metalness: 0.6 } : {});
  if (shape === 'card') {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.17, 0.015), mat);
    m.position.y = 0.085;
    m.rotation.set(-0.2, 0.15, 0);
    return m;
  }
  if (shape === 'berry') {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 8), mat);
    m.position.y = 0.075;
    return m;
  }
  if (shape === 'screw') {
    const m = new THREE.Mesh(merged([rod(v(-0.11, 0.03, 0), v(0.09, 0.03, 0), 0.022, 8), placed(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 10), v(0.1, 0.03, 0), v(1, 1, 1), new THREE.Euler(0, 0, Math.PI / 2))]), mat);
    m.rotation.y = 0.4;
    return m;
  }
  if (shape === 'crumb') {
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.07, 0), mat);
    m.position.y = 0.05;
    return m;
  }
  if (shape === 'pebble') {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 1), mat);
    m.scale.set(1, 0.6, 0.8);
    m.position.y = 0.06;
    return m;
  }
  if (shape === 'needle') {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 5), mat);
    m.rotation.set(0, 0.5, Math.PI / 2);
    m.position.y = 0.015;
    return m;
  }
  if (shape === 'leaf' || shape === 'feather') {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 6), std(color, 0.8, { side: THREE.DoubleSide }));
    m.scale.set(shape === 'leaf' ? 0.9 : 0.25, 1, 0.08);
    m.position.y = 0.11;
    m.rotation.z = shape === 'leaf' ? 0.3 : -0.25;
    return m;
  }
  if (shape === 'coin') {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.015, 16), mat);
    m.rotation.x = Math.PI / 2 - 0.25;
    m.position.y = 0.07;
    return m;
  }
  const m = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.16, 10), mat); // cone: a party hat
  m.position.y = 0.08;
  return m;
}

/** The party cake on the moss: two tiers, icing and a candle a year (one for a hundredth day), flames that flicker. Gentle: smaller. */
function buildCake(candles: number, gentle: boolean): THREE.Group {
  const g = new THREE.Group();
  g.name = 'cake';
  const sponge = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.44, 0.28, 24), std('#f4e3c3', 0.85));
  sponge.position.y = 0.14;
  const icing = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.06, 24), std('#ff9ec7', 0.6));
  icing.position.y = 0.3;
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.28, 0.18, 20), std('#f4e3c3', 0.85));
  top.position.y = 0.42;
  g.add(sponge, icing, top);
  const flame = new THREE.MeshBasicMaterial({ color: '#ffcc66' });
  const wax = std('#ffffff', 0.7);
  const n = Math.max(1, Math.min(5, candles));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = n === 1 ? 0 : 0.15;
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.16, 8), wax);
    c.position.set(Math.cos(a) * r, 0.59, Math.sin(a) * r);
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 8), flame);
    f.position.set(Math.cos(a) * r, 0.71, Math.sin(a) * r);
    f.name = 'flicker';
    g.add(c, f);
  }
  g.position.copy(CAKE);
  g.scale.setScalar(gentle ? 0.75 : 1);
  return g;
}

// ---- the floor through the year ----

/** Floor spots for small things: seeded, on the floor, and clear of the pieces' footprints (`keepOut`, already moved). */
function floorSpots(n: number, seed: number, keepOut: [number, number, number, number][]): THREE.Vector3[] {
  const r = seeded(seed);
  const out: THREE.Vector3[] = [];
  for (let tries = 0; out.length < n && tries < n * 30; tries++) {
    const p = v((r() - 0.5) * (TANK.w - 0.7), 0, (r() - 0.5) * (TANK.d - 0.7));
    if (keepOut.some(([x0, x1, z0, z1]) => p.x > x0 - 0.15 && p.x < x1 + 0.15 && p.z > z0 - 0.15 && p.z < z1 + 0.15)) continue;
    out.push(p);
  }
  return out;
}

const LEAVES: Record<number, string[]> = {
  8: ['#c9a233', '#7f9a3a', '#d9762b', '#a8452a'], // September: still some green
  9: ['#e0862b', '#c9442a', '#e7b43a', '#a6532a'], // October: the brightest
  10: ['#8a5a32', '#6e4a2c', '#a0662f', '#5a3d24'], // November: brown
};

/** The floor's season (tank-life.ts floorOf): small things lying about, plus moss creeping in over the months. Looks only, flat enough to walk over. */
export function buildFloor(f: { season: FloorSeason; month: number; moss: number }, keepOut: [number, number, number, number][]): THREE.Group {
  const g = new THREE.Group();
  g.name = 'floor';
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const r = seeded(41 + f.month);
  if (f.season === 'autumn') {
    const at = floorSpots(30, 101 + f.month, keepOut);
    const leaf = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 6), std('#ffffff', 0.85), at.length);
    const colors = LEAVES[f.month] ?? LEAVES[9];
    at.forEach((p, i) => {
      leaf.setMatrixAt(i, m.compose(p.clone().setY(0.02), q.setFromEuler(e.set((r() - 0.5) * 0.3, r() * 6.3, (r() - 0.5) * 0.3)), v(0.16 + r() * 0.06, 0.012, 0.1 + r() * 0.04)));
      leaf.setColorAt(i, new THREE.Color(colors[i % colors.length]));
    });
    leaf.name = 'floor-leaves';
    g.add(leaf);
  } else if (f.season === 'winter') {
    // spruce needles and a few cones, brought in from the forest
    const at = floorSpots(46, 202, keepOut);
    const needles = new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 0.015, 0.015), std('#3b4a2c', 0.9), at.length);
    at.forEach((p, i) => needles.setMatrixAt(i, m.compose(p.clone().setY(0.012), q.setFromEuler(e.set(0, r() * 6.3, 0)), v(1, 1, 1))));
    needles.name = 'floor-needles';
    // spruce cones lying on their sides: faceted, so they read as scales
    const cones: THREE.BufferGeometry[] = [];
    for (const p of floorSpots(4, 203, keepOut)) cones.push(placed(new THREE.DodecahedronGeometry(0.1, 0), p.clone().setY(0.075), v(0.75, 0.75, 1.7), new THREE.Euler(0, r() * 6.3, 0)));
    g.add(needles, new THREE.Mesh(merged(cones), std('#6b4528', 0.95)));
  } else if (f.season === 'spring' || f.season === 'summer') {
    // spring: wood anemones (vitsippor) and a few hepaticas (blåsippor); summer: clover, daisies and wild strawberries (smultron)
    const spring = f.season === 'spring';
    const stems: THREE.BufferGeometry[] = [];
    const petals: Record<string, THREE.BufferGeometry[]> = {};
    const centres: THREE.BufferGeometry[] = [];
    const flower = (p: THREE.Vector3, color: string, n: number, size: number, h: number) => {
      stems.push(rod(p.clone(), p.clone().setY(h), 0.012, 4));
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2;
        (petals[color] ??= []).push(placed(new THREE.SphereGeometry(size, 6, 4), p.clone().add(v(Math.cos(a) * size, h, Math.sin(a) * size)), v(1, 0.25, 0.6), new THREE.Euler(0, -a, 0)));
      }
      centres.push(placed(new THREE.SphereGeometry(size * 0.45, 6, 4), p.clone().setY(h + 0.01)));
    };
    const spots = floorSpots(spring ? 14 : 18, spring ? 303 : 404, keepOut);
    spots.forEach((p, i) => {
      if (spring) flower(p, i % 4 === 3 ? '#6f7cff' : '#f6f4ee', 6, 0.055, 0.16 + (i % 3) * 0.04);
      else if (i % 3 === 0) flower(p, '#ffffff', 10, 0.05, 0.22);
      else if (i % 3 === 1) {
        // clover: three round leaves
        for (let k = 0; k < 3; k++) {
          const a = (k / 3) * Math.PI * 2 + i;
          (petals['#4f8f3a'] ??= []).push(placed(new THREE.SphereGeometry(0.06, 6, 4), p.clone().add(v(Math.cos(a) * 0.06, 0.05, Math.sin(a) * 0.06)), v(1, 0.2, 1)));
        }
      } else {
        // a wild strawberry on its stem
        stems.push(rod(p.clone(), p.clone().add(v(0.05, 0.12, 0)), 0.01, 4));
        (petals['#d42a2a'] ??= []).push(placed(new THREE.SphereGeometry(0.045, 8, 6), p.clone().add(v(0.06, 0.1, 0)), v(1, 1.25, 1)));
      }
    });
    if (stems.length) g.add(new THREE.Mesh(merged(stems), std('#4c7a34', 0.9)));
    for (const [color, list] of Object.entries(petals)) g.add(new THREE.Mesh(merged(list), std(color, 0.8)));
    if (centres.length) g.add(new THREE.Mesh(merged(centres), std('#f2c531', 0.7)));
  }
  // moss creeping in: more patches the longer the tank has stood (tank-life.ts MOSS_DAYS)
  const patches = Math.round(f.moss * 10);
  if (patches) {
    const tufts: THREE.BufferGeometry[] = [];
    for (const p of floorSpots(patches, 505, keepOut)) for (let k = 0; k < 3; k++) tufts.push(placed(new THREE.SphereGeometry(0.16 + r() * 0.1, 10, 6), p.clone().add(v((r() - 0.5) * 0.3, 0, (r() - 0.5) * 0.3)), v(1, 0.28, 1)));
    g.add(new THREE.Mesh(merged(tufts), std('#4b7a36', 1)));
  }
  return g;
}

// ---- the sky behind the glass ----

const SKY_R = 70;
/** A direction in the sky from altitude and azimuth (from south, west positive). The tank faces south: the sky behind it is the southern one, east on the left. */
const skyDir = (alt: number, az: number) => v(Math.sin(az) * Math.cos(alt), Math.sin(alt), -Math.cos(az) * Math.cos(alt));
/** How much the sky is tipped down behind the tank, so a camera looking down at it still sees sky, not ground. */
const SKY_TILT = 0.42;

/** The moon's lit part for `phase` (0 new, 0.5 full) as a flat shape of radius `r`, lit on the right while waxing. */
export function moonShape(phase: number, r: number): THREE.ShapeGeometry {
  const k = Math.cos(phase * Math.PI * 2);
  const side = phase <= 0.5 ? 1 : -1; // waxing: the right limb is lit
  const shape = new THREE.Shape();
  const n = 24;
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI;
    const p = [side * r * Math.sin(t), r * Math.cos(t)] as const;
    if (i === 0) shape.moveTo(p[0], p[1]);
    else shape.lineTo(p[0], p[1]);
  }
  for (let i = n; i >= 0; i--) {
    const t = (i / n) * Math.PI;
    shape.lineTo(side * k * r * Math.sin(t), r * Math.cos(t));
  }
  return new THREE.ShapeGeometry(shape);
}

const C3 = (c: string) => new THREE.Color(c);
const SKY_COLORS = {
  day: { top: C3('#3a78c9'), low: C3('#a9d2f2') },
  dusk: { top: C3('#2a3c70'), low: C3('#f0a06a') },
  night: { top: C3('#03050c'), low: C3('#101830') },
  greyDay: { top: C3('#8c96a1'), low: C3('#bcc3ca') },
  greyNight: { top: C3('#0a0c10'), low: C3('#231f1d') }, // overcast nights glow a little with the city's light
  fogDay: C3('#c7ccd1'),
  fogNight: C3('#16181c'),
  groundDay: C3('#2b3036'),
  groundNight: C3('#050608'),
};

/** The sky's colours for a sky state: the top, the horizon, below it, and a warm glow round the sun at dawn and dusk. */
export function skyTones(sky: TankSky) {
  const alt = sky.sun.alt / (Math.PI / 180);
  const day = clamp((alt + 6) / 14, 0, 1); // night below −6° (civil twilight), full day from 8°
  const dusk = clamp(1 - Math.abs(alt - 1) / 9, 0, 1) * (1 - 0.7 * sky.clouds);
  const grey = clamp(sky.clouds * 1.15 - 0.1, 0, 1);
  const mix = (a: THREE.Color, b: THREE.Color, t: number) => a.clone().lerp(b, t);
  let top = mix(mix(SKY_COLORS.night.top, SKY_COLORS.day.top, day), SKY_COLORS.dusk.top, dusk * 0.6);
  let low = mix(mix(SKY_COLORS.night.low, SKY_COLORS.day.low, day), SKY_COLORS.dusk.low, dusk * 0.85);
  top = mix(top, mix(SKY_COLORS.greyNight.top, SKY_COLORS.greyDay.top, day), grey);
  low = mix(low, mix(SKY_COLORS.greyNight.low, SKY_COLORS.greyDay.low, day), grey);
  if (sky.fog) {
    const fog = mix(SKY_COLORS.fogNight, SKY_COLORS.fogDay, day);
    top = mix(top, fog, 0.75);
    low = mix(low, fog, 0.9);
  }
  return { top, low, ground: mix(SKY_COLORS.groundNight, SKY_COLORS.groundDay, day * 0.8), day, dusk, glow: (0.3 * day + 0.9 * dusk) * (1 - 0.85 * sky.clouds) };
}

// ---- the spider's plans ----

type Anim = 'drink' | 'flex' | 'wave' | 'wrap' | 'curl' | 'still' | 'bask' | 'groom' | 'stretch' | 'dig';
type Fx = 'mist' | 'bundle' | 'bundleOff' | 'prey' | 'eat' | 'mat' | 'matOff' | 'shed' | 'molted' | 'done' | 'cricket' | 'pit';
type Step =
  | { kind: 'turn'; yaw: number; pitch: number }
  | { kind: 'move'; to: THREE.Vector3; pitch: number; speed: number; legs: boolean; thread?: boolean; hop?: number; from?: THREE.Vector3 }
  | { kind: 'wait'; time: number; act?: string; anim?: Anim }
  | { kind: 'fx'; fx: Fx; at?: THREE.Vector3; spot?: Spot3D }
  | { kind: 'roll'; to: number }
  | { kind: 'grow'; to: number };

/** Getting from spot `a` to spot `b`: off the web or branch, across the floor, up again if need be, and a rest there. */
export function planRoute(a: Spot3D, b: Spot3D, rnd: () => number): Step[] {
  const steps: Step[] = [];
  if (a.mode === 'hang' && a.entry) steps.push({ kind: 'move', to: a.entry.clone(), pitch: -Math.PI / 2, speed: 0.9, legs: false, thread: true });
  // on the front glass: down it and back off onto the floor
  if (a.mode === 'wall' && a.entry) {
    if (a.pos.y > 0.9) steps.push({ kind: 'move', to: v(a.pos.x, 0.9, GLASS_Z), pitch: -Math.PI / 2, speed: 0.7, legs: true });
    steps.push({ kind: 'move', to: a.entry.clone(), pitch: 0, speed: 0.7, legs: true });
  }
  if (a.mode === 'branch' && a.entry) {
    steps.push({ kind: 'turn', yaw: BRANCH_YAW + Math.PI, pitch: BRANCH_PITCH });
    steps.push({ kind: 'move', to: a.entry.clone(), pitch: BRANCH_PITCH, speed: 0.6, legs: true });
  }
  const from = a.mode === 'floor' ? a.pos : (a.entry ?? a.pos);
  const ground = b.mode === 'floor' ? b.pos : (b.entry ?? b.pos);
  if (from.distanceTo(ground) > 0.05) {
    steps.push({ kind: 'turn', yaw: faceTo(from, ground), pitch: 0 });
    steps.push({ kind: 'move', to: ground.clone(), pitch: 0, speed: 1.1, legs: true });
  }
  if (b.mode === 'hang') steps.push({ kind: 'move', to: b.pos.clone(), pitch: -Math.PI / 2, speed: 0.8, legs: false, thread: true });
  if (b.mode === 'branch') {
    steps.push({ kind: 'turn', yaw: BRANCH_YAW, pitch: -BRANCH_PITCH });
    steps.push({ kind: 'move', to: b.pos.clone(), pitch: -BRANCH_PITCH, speed: 0.6, legs: true });
  }
  if (b.face != null) steps.push({ kind: 'turn', yaw: b.face, pitch: 0 });
  steps.push({ kind: 'wait', time: 3 + rnd() * 4, act: b.act });
  return steps;
}

/** The shortest way round from angle `a` to angle `b`. */
const angleDelta = (a: number, b: number) => ((((b - a) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2)) - Math.PI;

// ---- the world ----

export type World = ReturnType<typeof createWorld>;
export type Hit = 'spider' | 'fly' | 'guest' | null;

/**
 * The scene, its camera and the spider's life in it. `step(dt)` moves time on; `setYaw` turns the camera round the
 * tank; `setPieces` swaps what's in it (the spider starts again from the middle); `setLife` feeds in the app's
 * state (tank-life.ts); `replay` queues things just logged to act out; `pick` says what a tap at (x, y) in 0–1 of
 * the view hit and `poke` makes the spider wave; `takeSignal` hands over 'molted' once a molt has begun (the app
 * then records it). `act()` is what it's doing now (an emoji, while it rests at a piece) and `actAnchor()` where
 * that shows, in 0–1 of the view.
 */
export function createWorld(opts: { ids: readonly string[]; next: string | null; marking: string; background: string; random?: () => number; life?: TankLife }) {
  const rnd = opts.random ?? Math.random;
  let life: TankLife = opts.life ?? IDLE_LIFE;
  const scene = new THREE.Scene();
  const baseBg = new THREE.Color(opts.background);
  scene.background = baseBg.clone();
  const camera = new THREE.PerspectiveCamera(32, 16 / 9, 0.1, 100);
  const hemi = new THREE.HemisphereLight('#cfe3ff', '#3b2a1a', 1.4);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffffff', 1.8);
  sun.position.set(4, 9, 6);
  // real shadows (when the view turns the renderer's shadow map on): one map, over the tank only
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 40 });
  sun.shadow.bias = -0.0015;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);
  const tankBody = buildTank();
  scene.add(tankBody);
  const glints = tankBody.children.filter((o) => o.name === 'glass-glint') as THREE.Mesh[];

  // ---- the sky behind the glass: the real sun and moon, stars, clouds (tank-life.ts skyAt) ----
  const sky = new THREE.Group();
  sky.name = 'sky';
  scene.add(sky);
  const domeGeo = new THREE.SphereGeometry(SKY_R, 32, 18);
  domeGeo.setAttribute('color', new THREE.Float32BufferAttribute(new Array(domeGeo.attributes.position.count * 3).fill(0), 3));
  const dome = new THREE.Mesh(domeGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, depthWrite: false, depthTest: false }));
  dome.renderOrder = -10;
  dome.name = 'sky-dome';
  sky.add(dome);
  const sunDisc = new THREE.Group();
  const sunCore = new THREE.Mesh(new THREE.CircleGeometry(2.1, 32), new THREE.MeshBasicMaterial({ color: '#fff4d8', transparent: true, depthWrite: false }));
  const sunHalo = new THREE.Mesh(new THREE.CircleGeometry(6.5, 32), new THREE.MeshBasicMaterial({ color: '#ffe2a8', transparent: true, opacity: 0.18, depthWrite: false }));
  sunHalo.position.z = -0.1;
  sunDisc.add(sunHalo, sunCore);
  sunDisc.name = 'sky-sun';
  sky.add(sunDisc);
  const moonDisc = new THREE.Group();
  const moonDark = new THREE.Mesh(new THREE.CircleGeometry(1.7, 32), new THREE.MeshBasicMaterial({ color: '#2a3350', transparent: true, opacity: 0.35, depthWrite: false }));
  const moonLit = new THREE.Mesh(moonShape(0.5, 1.7), new THREE.MeshBasicMaterial({ color: '#f4f1e4', transparent: true, depthWrite: false }));
  moonLit.position.z = 0.05;
  moonDisc.add(moonDark, moonLit);
  moonDisc.name = 'sky-moon';
  sky.add(moonDisc);
  let moonPhase = 0.5;
  const stars = (() => {
    const r = seeded(97);
    const pts: number[] = [];
    for (let i = 0; i < 170; i++) {
      const d = skyDir(0.04 + Math.asin(r()) * 0.95, (r() - 0.5) * Math.PI * 2).multiplyScalar(SKY_R - 2);
      pts.push(d.x, d.y, d.z);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const p = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#ffffff', size: 0.32, transparent: true, opacity: 0, depthWrite: false }));
    p.name = 'sky-stars';
    return p;
  })();
  sky.add(stars);
  // clouds: puffs round the sky, as many showing as it's cloudy, drifting slowly
  const cloudMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9, depthWrite: false });
  const clouds = new THREE.Group();
  clouds.name = 'sky-clouds';
  {
    const r = seeded(61);
    for (let i = 0; i < 14; i++) {
      const az = (i / 14) * Math.PI * 2 + r() * 0.3;
      const alt = 0.06 + r() * 0.32;
      const puffs: THREE.BufferGeometry[] = [];
      const n = 4 + Math.floor(r() * 3);
      for (let k = 0; k < n; k++) puffs.push(placed(new THREE.SphereGeometry(1, 10, 6), v((k - n / 2) * 2.2 + r(), r() * 1.2, r()), v(2.4 + r() * 1.5, 1.2 + r() * 0.8, 1.4)));
      const cloud = new THREE.Mesh(merged(puffs), cloudMat);
      cloud.position.copy(skyDir(alt, az).multiplyScalar(SKY_R - 6));
      cloud.lookAt(0, cloud.position.y, 0);
      cloud.scale.setScalar(0.8 + r() * 0.6);
      clouds.add(cloud);
    }
  }
  sky.add(clouds);
  let skyFlash = 0; // a lightning flash, fading
  let flashIn = 4;
  // rain and snow falling outside the glass, round the tank
  const OUT = 60;
  const outside = Array.from({ length: OUT }, (_, i) => {
    const a = (i / OUT) * Math.PI * 2 * 7.3;
    const d = 6.5 + ((i * 0.618) % 1) * 9;
    return { x: Math.sin(a) * d, z: Math.cos(a) * d * 0.8, y: ((i * 0.37) % 1) * 12 - 3, sway: i * 1.7 };
  });
  const rainOut = new THREE.LineSegments(
    (() => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(new Array(OUT * 6).fill(0), 3));
      return geo;
    })(),
    new THREE.LineBasicMaterial({ color: '#b9c8d8', transparent: true, opacity: 0.45, depthWrite: false }),
  );
  rainOut.frustumCulled = false;
  rainOut.visible = false;
  rainOut.name = 'outside-rain';
  const snowOut = new THREE.Points(
    (() => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(new Array(OUT * 3).fill(0), 3));
      return geo;
    })(),
    new THREE.PointsMaterial({ color: '#ffffff', size: 0.16, transparent: true, opacity: 0.9, depthWrite: false }),
  );
  snowOut.frustumCulled = false;
  snowOut.visible = false;
  snowOut.name = 'outside-snow';
  scene.add(rainOut, snowOut);

  const spider = buildSpider(opts.marking);
  spider.root.traverse((o) => (o.castShadow = (o as THREE.Mesh).isMesh));
  scene.add(spider.root);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.62, 24), new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.35, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.setScalar(SPIDER_SCALE);
  scene.add(shadow);
  const silk = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1, 4), new THREE.MeshBasicMaterial({ color: '#e8eef6', transparent: true, opacity: 0.7 }));
  scene.add(silk);

  // the parts that come and go: one group each, rebuilt when what they show changes
  const mini = miniSpiderGeometry();
  const layer = (name: string) => {
    const g = new THREE.Group();
    g.name = name;
    scene.add(g);
    return g;
  };
  const extras = { skins: layer('skins'), lings: layer('spiderlings'), eggs: layer('eggs'), dressing: layer('dressing'), weather: layer('weather'), pet: layer('pet'), fx: layer('fx'), shelf: layer('shelf'), guest: layer('guest'), party: layer('party'), floor: layer('floor-layer') };
  // What's taken out of the scene waits here and leaves the GPU in collect(), which the view calls while it draws:
  // freeing GL resources is a GL call, and those only happen while the view is on screen.
  const trash: THREE.Object3D[] = [];
  const spent: THREE.InstancedMesh[] = []; // instanced meshes whose geometry and material are shared: only their instances go
  const collect = () => {
    for (const o of trash.splice(0)) disposeTree(o);
    for (const m of spent.splice(0)) m.dispose();
  };
  const clear = (g: THREE.Group) => {
    for (const c of [...g.children]) {
      g.remove(c);
      trash.push(c);
    }
  };
  const drop = (g: THREE.Group) => {
    for (const c of [...g.children]) {
      g.remove(c);
      if ((c as THREE.InstancedMesh).isInstancedMesh) spent.push(c as THREE.InstancedMesh);
    }
  };

  let pieces = new THREE.Group();
  scene.add(pieces);
  let ids: string[] = [];
  let spots: Spot3D[] = [];
  let at: Spot3D;
  let steps: Step[] = [];
  let special: 'replay' | 'molt' | 'poke' | null = null;
  const replays: TankEvent[] = [];
  const signals: 'molted'[] = [];
  let moltStarted = false;
  let moltSent = false; // the app has been told about this molt
  let localMolts = life.molts;
  const pose = { pos: v(0, 0, 0), yaw: 0, pitch: 0, thread: false, roll: 0, size: sizeAfter(life.molts) };
  const anim = { rear: 0, curl: 0, dip: 0, wave: 0, wrap: 0, hop: 0, head: 0, groom: 0, stretch: 0, dig: 0 };
  let gait = 0;
  let stride = 0; // 0 standing still … 1 walking
  let time = 0;
  let act: string | null = null;
  let camYaw = 0;
  let dragging = false;
  let named: Record<string, THREE.Object3D[]> = {};
  // the camera: pinch zoom (1 = the whole tank) and following the spider (double tap), eased
  const view = { zoom: 1, follow: false, r: 18, target: v(0, 2.0, 0) };
  // pieces moved by hand (life.places), one being carried right now, and what's queued: a cricket to catch, pits dug
  let places: Record<string, [number, number]> = { ...life.places };
  let carried: string | null = null;
  let feeds = 0;
  let behaviours = 0; // how many idle behaviours it has done (the tests count them)
  const pits: { mesh: THREE.Group; age: number }[] = [];
  const PIT_LIFE = 90;

  const offset = (id: string) => {
    const [dx, dz] = offsetOf(places, id);
    return v(dx, 0, dz);
  };
  const find = (id: string) => spots.find((s) => s.id === id);
  const homeSpot = () => spots.find((s) => s.id === 'home' || s.id === 'rug') ?? spots[0];
  const start = () => {
    at = homeSpot();
    pose.pos.copy(at.pos);
    pose.yaw = 0.3;
    pose.pitch = 0;
    pose.thread = false;
    pose.roll = 0;
    // a molt cut short before it was recorded starts over; anything else it was acting out is dropped
    if (special === 'molt' && !moltSent) moltStarted = false;
    pose.size = sizeAfter(Math.max(life.molts, localMolts));
    steps = [{ kind: 'wait', time: 1.5 }];
    special = null;
    act = null;
    prey.group.visible = false;
    cricket.group.visible = false;
    bundle.visible = false;
    mat.visible = false;
    matTarget = 0;
  };

  const lookOf = (id: string): PieceLook => {
    if (id === 'web') return { web: life.web };
    const g = life.growth[id];
    return g == null ? {} : { growth: Math.round(g * 20) / 20, bloom: g >= 1 };
  };
  const lookKeys: Record<string, string> = {};
  const collectNamed = () => {
    named = {};
    pieces.traverse((o) => {
      if (o.name) (named[o.name] ??= []).push(o);
    });
  };
  /** A piece as it stands in the tank: moved by hand if it was, casting shadows (not its glows, silk or soft contact shadows). */
  const placedPiece = (id: string, look: PieceLook) => {
    const g = buildPiece(id, look);
    g.position.copy(offset(id));
    g.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const m = mesh.material as THREE.Material;
      mesh.castShadow = !m.transparent && !(m as THREE.MeshBasicMaterial).isMeshBasicMaterial;
      mesh.receiveShadow = id === 'rug' || id === 'couch' || id === 'rack' || id === 'books';
    });
    return g;
  };
  const setPieces = (list: readonly string[], next: string | null) => {
    scene.remove(pieces);
    trash.push(pieces);
    pieces = new THREE.Group();
    ids = [...list];
    for (const id of ids) {
      const look = lookOf(id);
      lookKeys[id] = JSON.stringify(look);
      pieces.add(placedPiece(id, look));
    }
    if (next) pieces.add(ghostOf(buildPiece(next)));
    scene.add(pieces);
    spots = spots3d(ids, places);
    collectNamed();
    applyLight();
    buildEggs();
    floorKey = '';
    buildFloorNow();
    start();
  };
  /** Pieces moved (by hand, or a new life.places): they stand at their new places, and the spider's spots follow. */
  const applyPlaces = (next: Record<string, [number, number]>) => {
    if (JSON.stringify(next) === JSON.stringify(places)) return;
    const was = at?.id;
    const moved = new Set([...Object.keys(next), ...Object.keys(places)].filter((id) => JSON.stringify(next[id]) !== JSON.stringify(places[id])));
    places = { ...next };
    for (const c of pieces.children) {
      const id = c.name.startsWith('piece-') ? c.name.slice(6) : null;
      if (id && id !== carried) c.position.copy(offset(id));
    }
    spots = spots3d(ids, places);
    buildFloorNow();
    // standing on (or under) a piece that moved: it starts again from the middle rather than float where it was
    if (was && moved.has(was) && special !== 'molt') start();
  };
  /** Rebuilds one piece whose look changed (the web, a plant), leaving the spider be. */
  const refreshPiece = (id: string) => {
    const look = lookOf(id);
    const key = JSON.stringify(look);
    if (!ids.includes(id) || lookKeys[id] === key) return;
    lookKeys[id] = key;
    const old = pieces.children.find((c) => c.name === `piece-${id}`);
    if (old) {
      pieces.remove(old);
      trash.push(old);
    }
    pieces.add(placedPiece(id, look));
    collectNamed();
    applyLight();
  };
  // the floor's season and the moss creeping in, clear of where the pieces stand now
  let floorKey = '';
  function buildFloorNow() {
    const keepOut = keepOutBoxes();
    const key = JSON.stringify([life.floor, keepOut]);
    if (key === floorKey) return;
    floorKey = key;
    clear(extras.floor);
    const g = buildFloor(life.floor, keepOut);
    g.traverse((o) => ((o as THREE.Mesh).isMesh ? ((o as THREE.Mesh).receiveShadow = true) : null));
    extras.floor.add(g);
  }

  // ---- light ----
  const DAY_SKY = new THREE.Color('#cfe3ff');
  const NIGHT_SKY = new THREE.Color('#3a4a85');
  const WARM_SKY = new THREE.Color('#ffd2a0');
  const DAY_GROUND = new THREE.Color('#3b2a1a');
  const NIGHT_GROUND = new THREE.Color('#151020');
  const MOON = new THREE.Color('#9fb4ff');
  const WARM_SUN = new THREE.Color('#ffb877');
  const NIGHT_BG = new THREE.Color('#06080d');
  const WARM_BG = new THREE.Color('#1e140d');
  const sunbeam = new THREE.Mesh(new THREE.CircleGeometry(1, 28), new THREE.MeshBasicMaterial({ color: '#ffe9b0', transparent: true, opacity: 0, depthWrite: false }));
  sunbeam.rotation.x = -Math.PI / 2;
  sunbeam.scale.set(1.25, 0.8, 1);
  sunbeam.position.set(SUN.x, 0.015, SUN.z);
  scene.add(sunbeam);
  function applyLight() {
    const L = life.light;
    hemi.intensity = L.hemi;
    hemi.color.copy(DAY_SKY).lerp(NIGHT_SKY, L.dusk).lerp(WARM_SKY, L.warm * 0.55);
    hemi.groundColor.copy(DAY_GROUND).lerp(NIGHT_GROUND, L.dusk);
    sun.intensity = L.sun;
    sun.color.set('#ffffff').lerp(MOON, L.dusk).lerp(WARM_SUN, L.warm * 0.6);
    (scene.background as THREE.Color).copy(baseBg).lerp(NIGHT_BG, 0.55 * L.dusk).lerp(WARM_BG, 0.25 * L.warm);
    for (const o of named['lamp-light'] ?? []) (o as THREE.PointLight).intensity = 14 * L.lamp;
    for (const o of named['lamp-bulb'] ?? []) ((o as THREE.Mesh).material as THREE.MeshBasicMaterial).color.set(L.lamp > 0 ? '#ffe2a0' : '#4a4440');
    for (const o of named['lamp-warm'] ?? []) ((o as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.12 * L.lamp;
    for (const o of named['glow-light'] ?? []) (o as THREE.PointLight).intensity = 0.8 + 4.5 * L.glow;
    for (const o of named['glow-cap'] ?? []) ((o as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = 0.2 + 1.1 * L.glow;
    for (const o of named['crystal-light'] ?? []) (o as THREE.PointLight).intensity = 0.8 + 4.5 * L.glow;
    for (const o of named.crystal ?? []) ((o as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = 0.3 + 1.0 * L.glow;
    for (const o of named['web-lines'] ?? []) ((o as THREE.LineSegments).material as THREE.LineBasicMaterial).color.setScalar(0.55 + 0.4 * (1 - L.dusk)).lerp(new THREE.Color('#e8eef6'), 0.3);
    (sunbeam.material as THREE.MeshBasicMaterial).opacity = life.weather.sun ? 0.24 * Math.max(0, life.daylight - 0.3) : 0;
    const pumpkin = extras.dressing.getObjectByName('pumpkin') as THREE.Mesh | undefined;
    if (pumpkin) (pumpkin.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.1 + 0.6 * L.dusk;
    paintSky();
  }

  /** The sky for life.sky: the dome's colours, the sun and moon where they really are, stars on clear nights, clouds, and the light's direction following them. */
  let skyKey = '';
  function paintSky() {
    const s = life.sky;
    const key = JSON.stringify([s, life.light.warm]);
    if (key === skyKey) return;
    skyKey = key;
    const tone = skyTones(s);
    const sunDir = skyDir(s.sun.alt, s.sun.az);
    const pos = domeGeo.attributes.position as THREE.BufferAttribute;
    const col = domeGeo.attributes.color as THREE.BufferAttribute;
    const c = new THREE.Color();
    const glow = new THREE.Color('#ffcf96');
    const p = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      p.fromBufferAttribute(pos, i).normalize();
      if (p.y >= 0) c.copy(tone.low).lerp(tone.top, Math.pow(p.y, 0.55));
      else c.copy(tone.low).lerp(tone.ground, Math.min(1, -p.y * 5));
      const near = Math.max(0, p.dot(sunDir));
      if (tone.glow > 0 && p.y > -0.1) c.lerp(glow, Math.min(0.85, tone.glow * Math.pow(near, 6)));
      col.setXYZ(i, c.r, c.g, c.b);
    }
    col.needsUpdate = true;
    const face = (o: THREE.Object3D, d: THREE.Vector3, r: number) => {
      o.position.copy(d).multiplyScalar(r);
      o.quaternion.setFromRotationMatrix(new THREE.Matrix4().lookAt(new THREE.Vector3(), o.position, v(0, 1, 0)));
    };
    // the sun: a disc while it's up, hidden behind thick cloud
    const sunUp = s.sun.alt > -0.015;
    sunDisc.visible = sunUp && s.clouds < 0.9 && !s.fog;
    face(sunDisc, sunDir, SKY_R - 4);
    (sunCore.material as THREE.MeshBasicMaterial).opacity = 1 - 0.8 * s.clouds;
    (sunCore.material as THREE.MeshBasicMaterial).color.set(s.sun.alt < 0.1 ? '#ffc888' : '#fff4d8');
    (sunHalo.material as THREE.MeshBasicMaterial).opacity = 0.18 * (1 - s.clouds);
    // the moon in its real phase: faint by day, bright at night, only between the clouds
    const moonUp = s.moon.alt > 0 && s.moon.phase > 0.03 && s.moon.phase < 0.97;
    moonDisc.visible = moonUp && s.clouds < 0.85 && !s.fog;
    face(moonDisc, skyDir(s.moon.alt, s.moon.az), SKY_R - 5);
    if (Math.abs(moonPhase - s.moon.phase) > 0.004) {
      moonPhase = s.moon.phase;
      trash.push(new THREE.Mesh(moonLit.geometry));
      moonLit.geometry = moonShape(moonPhase, 1.7);
    }
    const moonBright = (1 - 0.75 * tone.day) * (1 - s.clouds);
    (moonLit.material as THREE.MeshBasicMaterial).opacity = 0.35 + 0.65 * moonBright;
    (moonDark.material as THREE.MeshBasicMaterial).opacity = 0.3 * (1 - tone.day);
    // stars on a clear dark night
    (stars.material as THREE.PointsMaterial).opacity = Math.max(0, 1 - tone.day * 1.6) * Math.max(0, 1 - s.clouds * 1.25) * (s.fog ? 0 : 0.95);
    stars.visible = (stars.material as THREE.PointsMaterial).opacity > 0.02;
    // clouds: as many as it's cloudy, lit like the sky
    const shown = Math.round(s.clouds * clouds.children.length);
    clouds.children.forEach((cl, i) => (cl.visible = i < shown || s.fog));
    cloudMat.color.copy(tone.low).lerp(new THREE.Color('#ffffff'), 0.35 + 0.4 * tone.day).lerp(tone.top, 0.25 * s.clouds);
    cloudMat.opacity = s.fog ? 0.5 : 0.75 + 0.2 * s.clouds;
    // the light comes from where the sun is (or the moon, at night), always from the front so the tank isn't backlit
    const from = tone.day > 0.05 || !moonUp ? s.sun : s.moon;
    const height = Math.max(0.35, Math.sin(Math.max(0, from.alt)) + 0.35);
    sun.position.set(clamp(Math.sin(from.az), -0.9, 0.9) * 9, 5 + 9 * height, 3.5);
    for (const o of glints) (o.material as THREE.MeshBasicMaterial).opacity = 0.008 + 0.022 * tone.day * (1 - 0.5 * s.clouds);
    rainOut.visible = s.falling === 'rain';
    snowOut.visible = s.falling === 'snow';
  }

  // ---- the extras: skins, spiderlings, egg sacs, the season, the weather, the pet and hat ----
  const skinMat = new THREE.MeshStandardMaterial({ color: '#c9b49a', roughness: 0.8, transparent: true, opacity: 0.55, depthWrite: false });
  const lingMat = std('#3a2b25', 0.6);
  let shownSkins = 0;
  let skinKey = '';
  /** The fresh skins (life.skins, cleared out after SKIN_DAYS) plus one just shed here that the app hasn't recorded yet. */
  const buildSkins = () => {
    const n = Math.max(life.molts, localMolts);
    const count = Math.min(SKINS_SHOWN, n, life.skins + Math.max(0, localMolts - life.molts));
    const key = `${n}:${count}`;
    if (key === skinKey) return;
    skinKey = key;
    shownSkins = count;
    drop(extras.skins);
    if (!count) return;
    const skins = new THREE.InstancedMesh(mini, skinMat, count);
    const m = new THREE.Matrix4();
    for (let i = 0; i < count; i++) {
      // the newest skins in their slots; each the size the spider was when it shed it
      const k = n - count + i;
      const s = SPIDER_SCALE * sizeAfter(k) * 0.96;
      skins.setMatrixAt(i, m.compose(SKIN_SLOTS[k % SKIN_SLOTS.length].clone().setY(0.01), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, k * 2.1, 0)), v(s, s * 0.7, s)));
    }
    skins.name = 'skins';
    extras.skins.add(skins);
  };
  // spiderlings: a few small ones wandering the floor (each a plan of where it's headed)
  let lings: { pos: THREE.Vector3; to: THREE.Vector3; rest: number; yaw: number }[] = [];
  let lingMesh: THREE.InstancedMesh | null = null;
  const buildLings = (n: number) => {
    if (n === lings.length) return;
    drop(extras.lings);
    lings = Array.from({ length: n }, (_, i) => {
      const p = clampFloor(v(-2 + i * 2, 0, 1.6 - i * 0.8));
      return { pos: p, to: p.clone(), rest: 1 + i, yaw: i };
    });
    lingMesh = n ? new THREE.InstancedMesh(mini, lingMat, n) : null;
    if (lingMesh) {
      lingMesh.name = 'spiderlings';
      extras.lings.add(lingMesh);
    }
  };
  let shownEggs = -1;
  let eggsInWeb = false;
  function buildEggs() {
    const inWeb = ids.includes('web');
    if (life.eggs === shownEggs && inWeb === eggsInWeb) return;
    shownEggs = life.eggs;
    eggsInWeb = inWeb;
    clear(extras.eggs);
    if (!life.eggs) return;
    const eggs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.17, 1), std('#f4efe4', 1), life.eggs);
    const ends = webEnds(7);
    const m = new THREE.Matrix4();
    for (let i = 0; i < life.eggs; i++) {
      const p = inWeb ? webPoint(ends, 1 + i * 2, 0.5, 0.5).add(v(0, -0.2, 0)) : v(-4.3 + i * 0.4, 0.15, -2.4 + (i % 2) * 0.35);
      eggs.setMatrixAt(i, m.compose(p, new THREE.Quaternion(), v(1, 1.25, 1)));
    }
    eggs.name = 'eggs';
    extras.eggs.add(eggs);
  }
  let shownDressing: string | null = null;
  let flickers: THREE.Object3D[] = [];
  const buildDressingFor = (item: Dressing | null) => {
    if (item === shownDressing) return;
    shownDressing = item;
    clear(extras.dressing);
    flickers = [];
    if (!item) return;
    const g = buildDressing(item);
    g.traverse((o) => {
      if (o.name === 'flicker') flickers.push(o);
    });
    extras.dressing.add(g);
  };
  // weather: rain down the front glass, frost in its corners, snow on the lid
  const FRONT = TANK.d / 2 + 0.05;
  const drops = Array.from({ length: 18 }, (_, i) => ({ x: -TANK.w / 2 + 0.3 + ((i * 0.557) % 1) * (TANK.w - 0.6), y: ((i * 0.37) % 1) * TANK.h, speed: 0.4 + ((i * 0.73) % 1) * 0.9, pause: 0 }));
  const rain = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 6, 4), std('#cfe8ff', 0.05, { transparent: true, opacity: 0.55, metalness: 0.2 }), drops.length);
  rain.name = 'rain';
  rain.visible = false;
  extras.weather.add(rain);
  const frostMat = new THREE.MeshBasicMaterial({ color: '#eef6ff', transparent: true, opacity: 0.2, depthWrite: false });
  const frost: THREE.Mesh[] = [];
  {
    const rf = seeded(23);
    for (const [cx, cy] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ]) {
      const blobs: THREE.BufferGeometry[] = [];
      for (let k = 0; k < 7; k++) blobs.push(placed(new THREE.CircleGeometry(0.25 + rf() * 0.55, 14), v(-cx * rf() * 1.4, -cy * rf() * 1.1, 0)));
      const patch = new THREE.Mesh(merged(blobs), frostMat);
      patch.position.set((cx * TANK.w) / 2, cy < 0 ? -1.1 : TANK.h - 0.1, FRONT + 0.01);
      patch.scale.setScalar(0);
      patch.name = 'frost';
      frost.push(patch);
      extras.weather.add(patch);
    }
  }
  let frostShown = 0; // creeps in from the corners
  const snowLid = (() => {
    const r = seeded(17);
    const bumps: THREE.BufferGeometry[] = [placed(new THREE.BoxGeometry(TANK.w - 0.1, 0.06, TANK.d - 0.1), v(0, TANK.h + 0.04, 0))];
    for (let i = 0; i < 16; i++) bumps.push(placed(new THREE.SphereGeometry(0.35 + r() * 0.4, 10, 6), v((r() - 0.5) * (TANK.w - 1), TANK.h + 0.06, (r() - 0.5) * (TANK.d - 1)), v(1, 0.18, 1)));
    const lid = new THREE.Mesh(merged(bumps), std('#f4f8ff', 0.95));
    lid.name = 'snow-lid';
    lid.visible = false;
    extras.weather.add(lid);
    return lid;
  })();
  // the worn pet, and a fly to catch
  let pet: (ReturnType<typeof buildBug> & { motion: PetMotion; key: string; hop: { from: THREE.Vector3; to: THREE.Vector3; t: number; rest: number } }) | null = null;
  const buildPet = () => {
    const key = life.pet ? `${life.pet.fly}` : '';
    if ((pet?.key ?? '') === key) return;
    if (pet) {
      extras.pet.remove(pet.group);
      trash.push(pet.group);
    }
    pet = null;
    if (!life.pet) return;
    const bug = buildBug(life.pet.motion, life.pet.fly);
    bug.group.scale.setScalar(1.6);
    extras.pet.add(bug.group);
    const p = v(2.5, 0, 2);
    pet = { ...bug, motion: life.pet.motion, key, hop: { from: p.clone(), to: p.clone(), t: 1, rest: 0 } };
  };
  const catchable = buildBug('buzz', 'house_fly');
  catchable.group.scale.setScalar(1.8);
  catchable.group.visible = false;
  catchable.group.name = 'catchable';
  scene.add(catchable.group);
  const prey = buildBug('buzz', 'house_fly');
  prey.group.scale.setScalar(1.6);
  prey.group.visible = false;
  scene.add(prey.group);
  let hatKey = '';
  const buildHatFor = () => {
    const key = life.hat ? `${life.hat.shape}:${life.hat.id}` : '';
    if (key === hatKey) return;
    hatKey = key;
    for (const c of [...spider.hatMount.children]) {
      spider.hatMount.remove(c);
      trash.push(c);
    }
    if (life.hat) spider.hatMount.add(buildHat(life.hat.shape, life.hat.id));
  };

  // ---- step 9: the shelf, a guest, the party, the note, the scroll ----
  let shelfKey = '';
  let shelfCount = 0;
  const buildShelf = () => {
    const key = JSON.stringify(life.souvenirs);
    if (key === shelfKey) return;
    shelfKey = key;
    clear(extras.shelf);
    shelfCount = life.souvenirs.length;
    if (!shelfCount) return;
    const g = new THREE.Group();
    const wood = std('#7a5636', 0.9);
    const mid = (SHELF.x0 + SHELF.x1) / 2;
    const plank = new THREE.Mesh(new THREE.BoxGeometry(SHELF.x1 - SHELF.x0, 0.07, 0.36), wood);
    plank.position.set(mid, SHELF.y - 0.035, SHELF.z);
    const bracket = (x: number) => strand(v(x, SHELF.y - 0.07, SHELF.z - 0.15), v(x, SHELF.y - 0.45, SHELF.z - 0.17), 0.03, wood);
    g.add(plank, bracket(SHELF.x0 + 0.2), bracket(SHELF.x1 - 0.2));
    life.souvenirs.forEach((x, i) => {
      const m = souvenirMesh(x.shape, x.color);
      m.position.add(v(SHELF.x0 + 0.27 + i * ((SHELF.x1 - SHELF.x0 - 0.54) / 4), SHELF.y, SHELF.z + 0.02));
      g.add(m);
    });
    g.name = 'shelf';
    extras.shelf.add(g);
  };
  type GuestRig = ReturnType<typeof buildSpider> & { key: string; look: GuestLook; curl: number; rear: number; wave: number; yaw: number };
  let guest: GuestRig | null = null;
  const buildGuest = () => {
    const key = life.guest?.id ?? '';
    if ((guest?.key ?? '') === key) return;
    if (guest) {
      extras.guest.remove(guest.root);
      trash.push(guest.root);
    }
    guest = null;
    if (!life.guest) return;
    const L = life.guest.look;
    const rig = buildSpider(L.marking, { skin: L.skin, leg: L.leg, legScale: L.legScale, abdomen: L.abdomen });
    rig.root.scale.setScalar(SPIDER_SCALE * L.size);
    rig.root.position.copy(GUEST_AT);
    if (L.hat) rig.hatMount.add(buildHat(L.hat, L.hat));
    rig.root.name = 'guest-spider';
    extras.guest.add(rig.root);
    guest = { ...rig, key, look: L, curl: life.guest.awake ? 0 : 1, rear: 0, wave: 0, yaw: -0.6 };
  };
  let partyKey = '';
  let partyFolk: { mesh: THREE.InstancedMesh; hats: THREE.InstancedMesh; at: THREE.Vector3[] } | null = null;
  let partyFlames: THREE.Object3D[] = [];
  const PARTY_COLORS = ['#4fa3ff', '#ffb23f', '#9b6bff', '#3fcf8e'];
  const buildParty = () => {
    const key = JSON.stringify(life.party);
    if (key === partyKey) return;
    partyKey = key;
    clear(extras.party);
    partyFolk = null;
    partyFlames = [];
    if (!life.party) return;
    const cake = buildCake(life.party.candles, life.party.gentle);
    cake.traverse((o) => {
      if (o.name === 'flicker') partyFlames.push(o);
    });
    extras.party.add(cake);
    const n = life.party.gentle ? 0 : life.party.guests;
    if (!n) return;
    // tiny rival guests round the cake, in party hats (their own geometry: the shared spiderling one stays put)
    const mesh = new THREE.InstancedMesh(miniSpiderGeometry(), std('#ffffff', 0.6), n);
    const hats = new THREE.InstancedMesh(new THREE.ConeGeometry(0.11, 0.26, 10), std('#ffffff', 0.7), n);
    const at = Array.from({ length: n }, (_, i) => {
      const a = [0.05, 0.3, 0.7, 0.95][i % 4] * Math.PI;
      return CAKE.clone().add(v(Math.cos(a) * 1.05, 0, -Math.sin(a) * 0.55 + 0.15));
    });
    at.forEach((_, i) => {
      const c = new THREE.Color(PARTY_COLORS[i % PARTY_COLORS.length]);
      mesh.setColorAt(i, c.clone().multiplyScalar(0.45));
      hats.setColorAt(i, c);
    });
    mesh.name = 'party-guests';
    extras.party.add(mesh, hats);
    partyFolk = { mesh, hats, at };
  };
  const note = new THREE.Group();
  {
    const paper = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.02, 0.42), std('#f6f1e4', 0.95));
    paper.position.y = 0.012;
    const fold = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.02, 0.2), std('#ebe4d2', 0.95));
    fold.position.set(0, 0.07, -0.16);
    fold.rotation.x = -0.6;
    const weight = new THREE.Mesh(new THREE.IcosahedronGeometry(0.09, 0), std('#6e6a64', 0.9));
    weight.position.set(0.18, 0.08, 0.06);
    note.add(paper, fold, weight);
  }
  note.position.copy(NOTE_AT);
  note.rotation.y = 0.35;
  note.visible = false;
  note.name = 'note';
  extras.fx.add(note);
  const scroll = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.32, 10), std('#f4ead2', 0.85));
  scroll.rotation.z = Math.PI / 2;
  scroll.position.set(0, -0.02, 0.5);
  scroll.visible = false;
  scroll.name = 'scroll';
  spider.front.add(scroll);
  // effects: the mist from a glass of water, a silk bundle, the mat it molts on
  const MIST = 40;
  const mistGeo = new THREE.BufferGeometry();
  mistGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Array(MIST * 3).fill(0), 3));
  const mist = new THREE.Points(mistGeo, new THREE.PointsMaterial({ color: '#dff2ff', size: 0.09, transparent: true, opacity: 0, depthWrite: false }));
  mist.visible = false;
  extras.fx.add(mist);
  let mistT = 0;
  const bundle = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), std('#f4f0e6', 0.95));
  bundle.visible = false;
  extras.fx.add(bundle);
  const mat = new THREE.Mesh(new THREE.CircleGeometry(1, 28), new THREE.MeshBasicMaterial({ color: '#f4f0e6', transparent: true, opacity: 0, depthWrite: false }));
  mat.rotation.x = -Math.PI / 2;
  mat.visible = false;
  extras.fx.add(mat);
  let matTarget = 0;
  // the day's cricket (fed by hand): dropped in from the lid, it lands and twitches until it's caught
  const cricket = buildBug('hop', 'checklist_cricket');
  cricket.group.scale.setScalar(1.7);
  cricket.group.visible = false;
  cricket.group.name = 'cricket';
  scene.add(cricket.group);
  let cricketFall = 0;
  /** A little pit it dug: a dark hollow and a mound of what came out, fading after PIT_LIFE seconds. */
  const digPit = (p: THREE.Vector3, yaw: number) => {
    const g = new THREE.Group();
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.27, 16), new THREE.MeshBasicMaterial({ color: '#24170d', transparent: true, opacity: 0.75, depthWrite: false }));
    hole.rotation.x = -Math.PI / 2;
    hole.position.y = 0.008;
    const mound = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 6), std('#6a4a2e', 1, { transparent: true }));
    mound.scale.set(1.2, 0.35, 0.8);
    mound.position.set(Math.sin(yaw) * 0.45, 0, Math.cos(yaw) * 0.45);
    g.add(hole, mound);
    g.position.copy(p).setY(0);
    g.name = 'pit';
    extras.fx.add(g);
    pits.push({ mesh: g, age: 0 });
    while (pits.length > 2) {
      const old = pits.shift();
      if (old) {
        extras.fx.remove(old.mesh);
        trash.push(old.mesh);
      }
    }
  };

  const applyLooks = () => {
    applyPlaces(life.places ?? {});
    for (const id of ['web', ...Object.keys(life.growth)]) refreshPiece(id);
    buildFloorNow();
    buildSkins();
    buildLings(life.spiderlings);
    buildEggs();
    buildDressingFor(life.dressing);
    buildPet();
    buildHatFor();
    buildShelf();
    buildGuest();
    buildParty();
    rain.visible = life.weather.rain;
    snowLid.visible = life.weather.snowLid;
    catchable.group.visible = life.fly;
    const premolt = life.premolt && special !== 'molt';
    const look = premolt ? PREMOLT : SKIN;
    spider.bellyMat.color.set(look.color);
    spider.bellyMat.roughness = look.roughness;
    spider.bellyMat.sheen = look.sheen;
    if (special !== 'molt') pose.size = sizeAfter(Math.max(life.molts, localMolts));
    applyLight();
  };

  const setSize = (w: number, h: number) => {
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
  };
  const setYaw = (yaw: number) => {
    camYaw = yaw;
  };
  /** Where the camera wants to be: round the whole tank at the pinch's zoom, or close on the spider while following it. */
  const wantView = () => {
    const r = 18 / view.zoom;
    if (view.follow && life.mode !== 'out') {
      const p = pose.pos;
      return { r: Math.min(r, 9), target: v(clamp(p.x, -3.8, 3.8), clamp(p.y + 0.6, 0.8, 4.2), clamp(p.z, -2.2, 2.2)) };
    }
    return { r, target: v(0, 2.0 - 0.7 * clamp((view.zoom - 1) / 1.4, 0, 1), 0) };
  };
  /** Moves the camera `k` (0–1) of the way to where it wants to be; 1 jumps there. */
  const easeView = (k: number) => {
    const w = wantView();
    view.r += (w.r - view.r) * k;
    view.target.lerp(w.target, k);
  };
  const placeCamera = () => {
    const pitch = 0.26;
    const r = view.r;
    const t = view.target;
    camera.position.set(t.x + Math.sin(camYaw) * Math.cos(pitch) * r, t.y + Math.sin(pitch) * r, t.z + Math.cos(camYaw) * Math.cos(pitch) * r);
    camera.lookAt(t);
    // the sky goes round with the camera, tipped down behind the tank so the view holds sky, not ground
    sky.position.copy(camera.position);
    sky.quaternion.setFromAxisAngle(v(Math.cos(camYaw), 0, -Math.sin(camYaw)), -SKY_TILT);
  };
  const yawToCamera = () => faceTo(pose.pos, camera.position);

  // ---- choosing what to do ----

  /** Where the spider is right now, as a spot to plan from. */
  const hereSpot = (): Spot3D => {
    if (!steps.length || steps[0].kind === 'wait') return at;
    const pos = pose.pos.clone();
    if (pose.thread) return { id: 'here', pos, mode: 'hang', entry: v(pos.x, 0, pos.z) };
    if (pos.z > GLASS_Z - 0.4 && pose.pitch < -0.6) return { id: 'here', pos, mode: 'wall', entry: v(pos.x, 0, GLASS_FOOT) };
    if (Math.abs(pose.pitch) > 0.2 && pos.y > 0.05) return { id: 'here', pos, mode: 'branch', entry: branchAt(0.05).add(offset('books')) };
    return { id: 'here', pos, mode: 'floor' };
  };
  /** A route to `spot` whose closing rest is `rest` (or none). */
  const routeTo = (spot: Spot3D, rest: Step | null): Step[] => {
    const route = planRoute(hereSpot(), spot, rnd).filter((s) => s.kind !== 'wait');
    at = spot;
    return rest ? [...route, rest] : route;
  };
  const goalFor = (mode: TankMode): Spot3D => {
    if (mode === 'focus') return find('web') ?? homeSpot();
    if (mode === 'game') return find('arcade') ?? homeSpot();
    if (mode === 'sleep') return find('web') ?? NAP;
    if (mode === 'storm') return find('couch') ?? homeSpot();
    return COSY;
  };
  const holdFor = (mode: TankMode): Step[] => {
    if (mode === 'sleep') return [{ kind: 'wait', time: 30, act: '💤', anim: 'curl' }];
    if (mode === 'game') return [{ kind: 'wait', time: 30, act: '🎮', anim: 'still' }];
    if (mode === 'cosy') return [{ kind: 'wait', time: 14 + rnd() * 10, anim: 'bask' }, { kind: 'turn', yaw: (rnd() - 0.5) * 0.9, pitch: 0 }];
    return [{ kind: 'wait', time: 30, anim: 'still' }];
  };
  const wanderSpots = () => (life.weather.sun && life.daylight > 0.5 ? [...spots, SUN_SPOT] : spots);
  const pickNext = () => {
    // a party: half the time back at the cake, reading its scroll of firsts
    if (life.party && at.id !== 'party' && rnd() < 0.5) return PARTY_SPOT;
    const all = wanderSpots();
    // premolt: more time in the hide
    const hide = all.find((s) => s.id === 'couch');
    if (life.premolt && hide && at.id !== 'couch' && rnd() < 0.4) return hide;
    const others = all.filter((s) => s.id !== at.id);
    return others.length ? others[Math.min(others.length - 1, Math.floor(rnd() * others.length))] : at;
  };

  const replayOf = (e: TankEvent): Step[] => {
    const done: Step = { kind: 'fx', fx: 'done' };
    const visit = (id: string, rest: Step & { kind: 'wait' }) => {
      const spot = find(id);
      return spot ? routeTo(spot, rest) : [rest];
    };
    if (e.kind === 'water') return [{ kind: 'fx', fx: 'mist' }, ...visit('radio', { kind: 'wait', time: 3.2, act: '💧', anim: 'drink' }), done];
    if (e.kind === 'train') return [...visit('rack', { kind: 'wait', time: 3.6, act: '💪', anim: 'flex' }), done];
    if (e.kind === 'task') return [{ kind: 'fx', fx: 'bundle' }, { kind: 'wait', time: 2.8, act: '🎁', anim: 'wrap' }, { kind: 'fx', fx: 'bundleOff' }, done];
    return huntOf('prey');
  };
  /**
   * A hunt: a fly just caught (`prey`, laid on the floor once it's down) or the day's cricket (`cricket`, dropped in
   * from the lid at once), stalked across the floor and pounced on.
   */
  const huntOf = (bait: 'prey' | 'cricket'): Step[] => {
    const here = hereSpot();
    const ground = (here.mode === 'floor' ? here.pos : (here.entry ?? here.pos)).clone().setY(0);
    const toward = v(0, 0, 0.6).sub(ground);
    if (toward.length() < 1) toward.set(1, 0, 0.4);
    const prey = clampFloor(ground.clone().addScaledVector(toward.normalize(), bait === 'cricket' ? 2.4 : 2.6));
    const stalk = ground.clone().lerp(prey, Math.max(0, 1 - 1.1 / Math.max(1.2, ground.distanceTo(prey))));
    const down = routeTo({ id: 'hunt', pos: ground.clone(), mode: 'floor' }, null);
    at = { id: 'here', pos: prey.clone(), mode: 'floor' };
    const drop: Step = { kind: 'fx', fx: bait, at: prey.clone() };
    return [
      ...(bait === 'cricket' ? [drop, ...down, { kind: 'turn', yaw: faceTo(ground, prey), pitch: 0 } as Step, { kind: 'wait', time: 1.1, act: '👀', anim: 'still' } as Step] : [...down, drop, { kind: 'turn', yaw: faceTo(ground, prey), pitch: 0 } as Step]),
      { kind: 'move', to: stalk, pitch: 0, speed: 0.35, legs: true },
      { kind: 'wait', time: 0.9, anim: 'still' },
      { kind: 'move', to: prey.clone(), pitch: 0, speed: 4.5, legs: true, hop: 0.35 },
      { kind: 'fx', fx: 'eat' },
      { kind: 'wait', time: bait === 'cricket' ? 2.4 : 1.6, act: '😋' },
      { kind: 'fx', fx: 'done' },
    ];
  };

  // ---- things it does on its own while wandering: grooming, stretching, digging, climbing the front glass ----
  const keepOutBoxes = () =>
    ids
      .filter((id) => PIECE_BOX[id] && id !== 'lamp' && id !== 'books')
      .map((id) => {
        const [x0, x1, z0, z1] = PIECE_BOX[id];
        const o = offset(id);
        return [x0 + o.x, x1 + o.x, z0 + o.z, z1 + o.z] as [number, number, number, number];
      });
  /** Up the front glass, belly to the glass, to look out for a while (more often while someone's watching closely). */
  const glassOf = (): Step[] => {
    const x = clamp(pose.pos.x + (rnd() - 0.5) * 3, -3.6, 3.6);
    const foot = v(x, 0, GLASS_FOOT);
    const route = routeTo({ id: 'glass-foot', pos: foot, mode: 'floor' }, null);
    const up = 1.5 + rnd() * 1.4;
    at = { id: 'glass', pos: v(x, up, GLASS_Z), mode: 'wall', entry: foot.clone() };
    return [
      ...route,
      { kind: 'turn', yaw: 0, pitch: 0 },
      { kind: 'move', to: v(x, 0.9, GLASS_Z), pitch: -Math.PI / 2, speed: 0.7, legs: true },
      { kind: 'move', to: v(x, up, GLASS_Z), pitch: -Math.PI / 2, speed: 0.5, legs: true },
      { kind: 'wait', time: 4 + rnd() * 3, act: '👀', anim: 'still' },
    ];
  };
  /** A little pit dug in a free bit of floor, the dirt thrown up beside it. */
  const digOf = (): Step[] => {
    const spot = floorSpots(1, Math.floor(rnd() * 1e6), keepOutBoxes())[0];
    if (!spot) return [{ kind: 'wait', time: 3, anim: 'groom' }];
    clampFloor(spot);
    const from = pose.pos.clone().setY(0);
    const dir = spot.clone().sub(from);
    if (dir.length() < 0.01) dir.set(0, 0, 1);
    const stand = clampFloor(spot.clone().addScaledVector(dir.normalize(), -0.8));
    const route = routeTo({ id: 'dig', pos: stand, mode: 'floor' }, null);
    return [...route, { kind: 'turn', yaw: faceTo(stand, spot), pitch: 0 }, { kind: 'wait', time: 1.2, anim: 'dig' }, { kind: 'fx', fx: 'pit', at: spot }, { kind: 'wait', time: 2.6, anim: 'dig' }];
  };
  const behaviourOf = (): Step[] => {
    behaviours += 1;
    const watched = view.follow || view.zoom > 1.3;
    const r = rnd();
    if (r < (watched ? 0.45 : 0.25)) return glassOf();
    if (r < 0.58) return [{ kind: 'wait', time: 3.2 + rnd() * 1.6, anim: 'groom' }];
    if (r < 0.78) return [{ kind: 'wait', time: 3, anim: 'stretch' }];
    return digOf();
  };
  let moltBase = 0;
  const moltOf = (): Step[] => {
    moltBase = Math.max(life.molts, localMolts);
    const slot = SKIN_SLOTS[moltBase % SKIN_SLOTS.length].clone();
    const spot: Spot3D = { id: 'molt', pos: slot, mode: 'floor' };
    const route = routeTo(spot, null);
    const away = faceTo(slot, v(0, 0, 0.6));
    const out = slot.clone().add(v(Math.sin(away) * 1.2, 0, Math.cos(away) * 1.2));
    return [
      ...route,
      { kind: 'fx', fx: 'mat', at: slot.clone() },
      { kind: 'wait', time: 1.4, anim: 'still' },
      { kind: 'roll', to: Math.PI },
      { kind: 'wait', time: 3, anim: 'curl' },
      { kind: 'fx', fx: 'shed' },
      { kind: 'fx', fx: 'molted' },
      { kind: 'roll', to: 0 },
      { kind: 'turn', yaw: away, pitch: 0 },
      { kind: 'move', to: out, pitch: 0, speed: 0.5, legs: true },
      { kind: 'grow', to: sizeAfter(moltBase + 1) },
      { kind: 'wait', time: 2.5, act: '✨', anim: 'still' },
      { kind: 'fx', fx: 'matOff' },
      { kind: 'fx', fx: 'done', spot: { id: 'here', pos: out.clone(), mode: 'floor' } },
    ];
  };
  /** Something special can start: no special running, and it's resting (or between plans), in a mode that allows it. */
  const free = () => !special && (life.mode === 'wander' || life.mode === 'cosy') && (!steps.length || steps[0].kind === 'wait');
  const plan = () => {
    if (free()) {
      if (life.molt && !moltStarted) {
        moltStarted = true;
        moltSent = false;
        steps = moltOf();
        special = 'molt';
        return;
      }
      if (feeds > 0) {
        feeds -= 1;
        steps = huntOf('cricket');
        special = 'replay';
        return;
      }
      const e = replays.shift();
      if (e) {
        steps = replayOf(e);
        special = 'replay';
        return;
      }
    }
    if (steps.length) return;
    if (life.mode === 'out') return; // out for the night: nobody home
    if (life.mode === 'wander') {
      if (at.mode === 'floor' && !life.party && rnd() < 0.3) {
        steps = behaviourOf();
        return;
      }
      const to = pickNext();
      steps = planRoute(at, to, rnd);
      const last = steps[steps.length - 1];
      if (life.premolt && to.id === 'couch' && last.kind === 'wait') last.time *= 2.5;
      if (to.id === 'party' && last.kind === 'wait') last.time *= 2;
      at = to;
      return;
    }
    const goal = goalFor(life.mode);
    if (at.id === goal.id && at.pos.distanceTo(goal.pos) < 0.05) steps = holdFor(life.mode);
    else steps = [...routeTo(goal, null), ...holdFor(life.mode)];
  };
  /** A change of mode (or a poke) cuts in: the spider plans again from wherever it is. */
  const interrupt = () => {
    if (special === 'molt') return;
    at = hereSpot();
    steps = [];
    special = null;
    act = null;
    prey.group.visible = false;
    cricket.group.visible = false;
    bundle.visible = false;
  };

  const runFx = (s: Step & { kind: 'fx' }) => {
    if (s.fx === 'mist') {
      const p = mistGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < MIST; i++) p.setXYZ(i, (rnd() - 0.5) * (TANK.w - 1), TANK.h - rnd() * 0.6, (rnd() - 0.5) * (TANK.d - 1));
      p.needsUpdate = true;
      mistT = 2.8;
      mist.visible = true;
    } else if (s.fx === 'bundle') {
      bundle.visible = true;
      bundle.scale.setScalar(0.2);
      bundle.position.copy(pose.pos).add(v(Math.sin(pose.yaw) * 0.95 * pose.size, 0.18, Math.cos(pose.yaw) * 0.95 * pose.size));
    } else if (s.fx === 'bundleOff') bundle.visible = false;
    else if (s.fx === 'prey' && s.at) {
      prey.group.visible = true;
      prey.group.position.copy(s.at).setY(0.06);
      prey.group.rotation.y = rnd() * 6;
    } else if (s.fx === 'eat') {
      prey.group.visible = false;
      cricket.group.visible = false;
    } else if (s.fx === 'cricket' && s.at) {
      cricket.group.visible = true;
      cricket.group.position.copy(s.at).setY(TANK.h - 0.4);
      cricket.group.rotation.y = rnd() * 6;
      cricketFall = 0;
    } else if (s.fx === 'pit' && s.at) digPit(s.at, pose.yaw);
    else if (s.fx === 'mat' && s.at) {
      mat.position.copy(s.at).setY(0.012);
      mat.scale.setScalar(0.9 * pose.size);
      mat.visible = true;
      matTarget = 0.5;
    } else if (s.fx === 'matOff') matTarget = 0;
    else if (s.fx === 'molted') {
      moltSent = true;
      signals.push('molted');
    }
    else if (s.fx === 'shed') {
      localMolts = Math.max(localMolts, moltBase + 1);
      buildSkins();
    } else if (s.fx === 'done') {
      if (s.spot) at = s.spot;
      special = null;
      act = null;
    }
  };

  const step = (dt: number) => {
    time += dt;
    const pace = life.mode === 'cosy' ? 0.6 : 1;
    plan();
    // fx steps happen at once, so a plan can start with them
    let guard = 0;
    while (steps[0]?.kind === 'fx' && guard++ < 8) {
      runFx(steps.shift() as Step & { kind: 'fx' });
      if (!steps.length) plan();
    }
    const s = steps[0];
    let moving = false;
    let want: Anim | null = null;
    let extraY = 0;
    if (!s) {
      act = null;
    } else if (s.kind === 'wait') {
      act = s.act ?? null;
      want = s.anim ?? null;
      s.time -= dt;
      if (s.time <= 0) {
        steps.shift();
        act = null;
      }
    } else if (s.kind === 'turn') {
      act = null;
      const dy = angleDelta(pose.yaw, s.yaw);
      const turn = Math.sign(dy) * Math.min(Math.abs(dy), 3.2 * pace * dt);
      pose.yaw += turn;
      gait += Math.abs(turn) * 2.6;
      const dp = s.pitch - pose.pitch;
      pose.pitch += Math.sign(dp) * Math.min(Math.abs(dp), 3 * dt);
      moving = true;
      if (Math.abs(angleDelta(pose.yaw, s.yaw)) < 0.01 && Math.abs(s.pitch - pose.pitch) < 0.01) steps.shift();
    } else if (s.kind === 'move') {
      act = null;
      pose.thread = !!s.thread;
      s.from ??= pose.pos.clone();
      const dp = s.pitch - pose.pitch;
      pose.pitch += Math.sign(dp) * Math.min(Math.abs(dp), 4 * dt);
      const left = s.to.clone().sub(pose.pos);
      const d = left.length();
      const go = Math.min(d, s.speed * pace * dt);
      if (d > 1e-6) pose.pos.addScaledVector(left, go / d);
      if (s.legs) {
        gait += go * 9;
        moving = true;
      }
      if (s.hop) {
        const total = Math.max(1e-6, s.from.distanceTo(s.to));
        const f = clamp(1 - (d - go) / total, 0, 1);
        extraY = s.hop * 4 * f * (1 - f);
      }
      if (d - go < 1e-4) {
        pose.pos.copy(s.to);
        steps.shift();
      }
    } else if (s.kind === 'roll') {
      pose.roll = ease(pose.roll, s.to, 2.4 * dt);
      if (pose.roll === s.to) steps.shift();
    } else if (s.kind === 'grow') {
      pose.size = ease(pose.size, s.to, 0.05 * dt);
      want = 'still';
      if (pose.size === s.to) steps.shift();
    }
    stride += ((moving ? 1 : 0) - stride) * Math.min(1, dt * 6);

    // animation channels, eased: rearing up (waving, showing off), curled legs (asleep, on its back), a dip to drink
    const k = Math.min(1, dt * 4);
    anim.rear += ((want === 'wave' ? 1 : want === 'flex' ? 0.55 : 0) - anim.rear) * k;
    anim.curl += ((want === 'curl' ? 1 : 0) - anim.curl) * k;
    anim.dip += ((want === 'drink' ? 1 : 0) - anim.dip) * k;
    anim.wave += ((want === 'wave' ? 1 : 0) - anim.wave) * k;
    anim.wrap += ((want === 'wrap' ? 1 : 0) - anim.wrap) * k;
    anim.groom += ((want === 'groom' ? 1 : 0) - anim.groom) * k;
    anim.stretch += ((want === 'stretch' ? 1 : 0) - anim.stretch) * k;
    anim.dig += ((want === 'dig' ? 1 : 0) - anim.dig) * k;
    // while the tank is dragged (or it's waving), its head follows the camera
    const headTo = dragging || want === 'wave' ? clamp(angleDelta(pose.yaw, yawToCamera()), -0.7, 0.7) : 0;
    anim.head += (headTo - anim.head) * Math.min(1, dt * 5);

    // the body: where it is, which way it faces, a little bob while it walks, a breathing abdomen
    const scale = SPIDER_SCALE * pose.size;
    spider.root.scale.setScalar(scale);
    const lie = (BACK_Y * scale * (1 - Math.cos(pose.roll))) / 2;
    spider.root.position.copy(pose.pos).add(v(0, extraY + lie, 0));
    const floorish = !pose.thread && Math.abs(pose.pitch) < 0.2;
    const tilt = floorish ? -0.32 * anim.rear + 0.22 * anim.dip + 0.14 * anim.dig - 0.06 * anim.groom : 0;
    spider.root.rotation.set(pose.pitch + tilt, pose.yaw, pose.roll, 'YXZ');
    const flex = want === 'flex' ? 0.05 * Math.abs(Math.sin(time * 6)) : 0;
    spider.body.position.y = 0.02 * stride * Math.abs(Math.sin(gait)) + flex;
    const calm = life.mode === 'sleep' || life.mode === 'cosy' || life.mode === 'storm' || want === 'bask';
    spider.abdomen.scale.setScalar(1 + 0.025 * Math.sin(time * (calm ? 1.3 : 2.4)));
    spider.front.rotation.y = anim.head;
    for (const leg of spider.legs) {
      const c = gait + leg.phase;
      const swing = 0.24 * stride * Math.sin(c);
      const fore = leg.pair === 0;
      const busy = fore ? anim.wrap * 0.35 * Math.sin(time * 14 + leg.side) : 0;
      // grooming: the front legs come in to the fangs in turn; digging: the front two pairs scrape fast
      const inward = fore ? anim.groom * (0.45 + 0.2 * Math.sin(time * 7 + leg.side * 1.6)) : 0;
      const scrape = leg.pair < 2 ? anim.dig * 0.3 * Math.sin(time * 13 + leg.pair * Math.PI + (leg.side === 1 ? 0 : 1.2)) : 0;
      leg.hip.rotation.y = leg.base + (leg.side === 1 ? -swing : swing) + busy - leg.side * inward + leg.side * scrape;
      const lift = 0.3 * stride * Math.max(0, Math.cos(c));
      const raise = (fore ? anim.rear * (0.75 + 0.25 * anim.wave * Math.sin(time * 8 + leg.side)) : 0) + (fore ? anim.groom * (0.35 + 0.15 * Math.sin(time * 7 + leg.side * 1.6)) : 0);
      const dig = leg.pair < 2 ? anim.dig * 0.25 * Math.max(0, Math.cos(time * 13 + leg.pair * Math.PI)) : 0;
      // stretching: one pair after another reaches out straight, front to back
      const reach = anim.stretch * Math.max(0, Math.sin(time * 2.4 - leg.pair * 0.9));
      leg.femur.rotation.z = leg.t1 + lift + raise + dig + anim.curl * 0.55 - 0.3 * reach;
      leg.knee.rotation.z = leg.t2 - lift * 0.5 - anim.curl * 0.7 + 0.7 * reach;
    }
    for (const p of spider.palps) p.upper.rotation.z = -0.25 + anim.wave * 0.45 * Math.sin(time * 11 + p.side) + anim.dip * 0.3 + anim.groom * 0.35 * Math.sin(time * 9 + p.side * 2);
    // its shadow on the floor, and its thread to the lid
    const away = life.mode === 'out';
    spider.root.visible = !away;
    note.visible = away;
    scroll.visible = act === '📜';
    const onFloor = pose.pos.y < 0.08 && Math.abs(pose.pitch) < 0.2 && !away;
    shadow.visible = onFloor;
    shadow.scale.setScalar(scale * (1 - 0.3 * Math.min(1, extraY)));
    shadow.position.set(pose.pos.x, 0.012, pose.pos.z);
    silk.visible = pose.thread && !away;
    if (silk.visible) {
      const top = v(pose.pos.x, TANK.h, pose.pos.z);
      const bottom = pose.pos.clone().add(v(0, 0.3 * scale, 0));
      silk.position.copy(top).lerp(bottom, 0.5);
      silk.scale.set(1, Math.max(0.01, top.y - bottom.y), 1);
    }
    stepExtras(dt);
    easeView(Math.min(1, dt * 3));
    placeCamera();
  };

  // ---- what else moves: the pet, a fly, spiderlings, rain, frost, sparkles, mist ----
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = v(0, 1, 0);
  const flap = (bug: { wings: THREE.Mesh[] }, rate: number) => bug.wings.forEach((w, i) => (w.rotation.y = (i ? -1 : 1) * 0.6 * Math.sin(time * rate)));
  const flyTo = (g: THREE.Object3D, p: THREE.Vector3) => {
    const dir = p.clone().sub(g.position);
    if (dir.lengthSq() > 1e-8) g.rotation.y = Math.atan2(dir.x, dir.z);
    g.position.copy(p);
  };
  function stepExtras(dt: number) {
    if (catchable.group.visible) {
      flyTo(catchable.group, v(Math.sin(time * 0.62) * 3.4, 2.7 + Math.sin(time * 1.31) * 1.0, Math.cos(time * 0.83) * 1.9));
      flap(catchable, 55);
    }
    if (prey.group.visible) flap(prey, 30 * Math.max(0, Math.sin(time * 3)));
    if (pet) {
      const t = time;
      const g = pet.group;
      if (pet.motion === 'buzz') {
        flyTo(g, v(Math.sin(t * 0.9) * 3.2, 2.3 + Math.sin(t * 1.7) * 0.9, Math.cos(t * 0.7) * 1.8));
        flap(pet, 50);
      } else if (pet.motion === 'lamp') {
        const lampOn = ids.includes('lamp') && life.light.lamp > 0;
        const c = lampOn ? LAMP.clone().add(v(0, -0.45, 0)).add(offset('lamp')) : ids.includes('fireplace') && life.light.glow > 0.6 ? v(4.1, 1.3, 2.0).add(offset('fireplace')) : v(0, 3.4, 0);
        flyTo(g, c.add(v(Math.cos(t * 2.1) * 0.8, Math.sin(t * 3.1) * 0.15, Math.sin(t * 2.1) * 0.8)));
        flap(pet, 22);
      } else if (pet.motion === 'glow') {
        flyTo(g, v(Math.sin(t * 0.23) * 3.4, 1.7 + Math.sin(t * 0.41) * 0.9, Math.cos(t * 0.31) * 1.9));
        flap(pet, 30);
        if (pet.glowMat) pet.glowMat.emissiveIntensity = (0.2 + 1.8 * life.light.glow) * (0.75 + 0.25 * Math.sin(t * 2.3));
      } else {
        // on the floor: hops (an arc every so often) or a slow trundle, from one spot to the next
        const h = pet.hop;
        const hopper = pet.motion === 'hop';
        if (h.t >= 1) {
          h.rest -= dt;
          if (h.rest <= 0) {
            h.from.copy(g.position).setY(0);
            h.to.copy(clampFloor(h.from.clone().add(v((rnd() - 0.5) * (hopper ? 2.4 : 3), 0, (rnd() - 0.5) * (hopper ? 1.6 : 2)))));
            h.t = 0;
          }
        } else {
          h.t = Math.min(1, h.t + dt / (hopper ? 0.45 : Math.max(1, h.from.distanceTo(h.to) / 0.3)));
          const p = h.from.clone().lerp(h.to, h.t);
          if (hopper) p.y = 0.5 * 4 * h.t * (1 - h.t);
          flyTo(g, p);
          if (!hopper) g.rotation.z = 0.06 * Math.sin(time * 9);
          if (h.t >= 1) h.rest = hopper ? 0.8 + rnd() * 1.2 : 1 + rnd() * 2;
        }
      }
    }
    if (lingMesh) {
      lings.forEach((l, i) => {
        if (l.pos.distanceTo(l.to) < 0.02) {
          l.rest -= dt;
          if (l.rest <= 0) {
            l.to = clampFloor(l.pos.clone().add(v((rnd() - 0.5) * 3, 0, (rnd() - 0.5) * 2)));
            l.rest = 1.5 + rnd() * 3;
          }
        } else {
          const d = l.to.clone().sub(l.pos);
          l.yaw += angleDelta(l.yaw, Math.atan2(d.x, d.z)) * Math.min(1, dt * 6);
          l.pos.addScaledVector(d.normalize(), Math.min(l.pos.distanceTo(l.to), 0.55 * dt));
        }
        const s = SPIDER_SCALE * (0.3 + 0.22 * (life.lingAge[i] ?? 0)); // they grow up in the tank
        lingMesh?.setMatrixAt(i, m4.compose(l.pos.clone().setY(0.01 + 0.01 * Math.abs(Math.sin(time * 14 + i))), q.setFromAxisAngle(up, l.yaw), v(s, s, s)));
      });
      lingMesh.instanceMatrix.needsUpdate = true;
    }
    if (rain.visible) {
      drops.forEach((d, i) => {
        // stop and go, like real drops on glass
        if (d.pause > 0) d.pause -= dt;
        else {
          d.y -= d.speed * dt;
          if (rnd() < dt * 0.6) d.pause = 0.3 + rnd() * 0.8;
        }
        if (d.y < -1.1) {
          d.y = TANK.h - 0.1;
          d.x = -TANK.w / 2 + 0.3 + rnd() * (TANK.w - 0.6);
        }
        rain.setMatrixAt(i, m4.compose(v(d.x, d.y, FRONT + 0.02), q.identity(), v(1, d.pause > 0 ? 1.2 : 1.9, 0.5)));
      });
      rain.instanceMatrix.needsUpdate = true;
    }
    if (frostShown !== life.weather.frost) {
      frostShown = ease(frostShown, life.weather.frost, dt * 0.15);
      frost.forEach((f) => f.scale.setScalar(frostShown));
    }
    flickers.forEach((o, i) => {
      const wobble = Math.sin(time * 9 + i * 2) * Math.sin(time * 3.3 + i);
      if ((o as THREE.Points).isPoints) {
        ((o as THREE.Points).material as THREE.PointsMaterial).opacity = 0.55 + 0.4 * Math.sin(time * 2.7);
        o.rotation.y = time * 0.05;
      } else if (((o as THREE.Mesh).material as THREE.MeshStandardMaterial).isMeshStandardMaterial) ((o as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = 1 + 0.4 * wobble;
      else o.scale.set(1, 0.85 + 0.2 * wobble, 1); // a candle flame
    });
    if (mistT > 0) {
      mistT -= dt;
      const p = mistGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < MIST; i++) p.setY(i, Math.max(0.05, p.getY(i) - (1.1 + (i % 5) * 0.12) * dt));
      p.needsUpdate = true;
      (mist.material as THREE.PointsMaterial).opacity = 0.8 * Math.min(1, mistT / 1.2);
      if (mistT <= 0) mist.visible = false;
    }
    if (bundle.visible) bundle.scale.setScalar(Math.min(1, bundle.scale.x + dt * 0.35));
    if (cricket.group.visible) {
      const g = cricket.group;
      if (g.position.y > 0.001 && cricketFall >= 0) {
        cricketFall += 9.8 * dt;
        g.position.y = Math.max(0, g.position.y - cricketFall * dt);
        if (g.position.y === 0) cricketFall = -1; // landed
      } else g.position.y = 0.16 * Math.pow(Math.max(0, Math.sin(time * 4.2)), 12); // a twitchy little hop now and then
    }
    for (const pit of [...pits]) {
      pit.age += dt;
      const fade = clamp(1 - (pit.age - (PIT_LIFE - 12)) / 12, 0, 1);
      pit.mesh.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.MeshBasicMaterial | undefined;
        if (m) m.opacity = (m.isMeshBasicMaterial ? 0.75 : 1) * fade;
      });
      if (pit.age > PIT_LIFE) {
        pits.splice(pits.indexOf(pit), 1);
        extras.fx.remove(pit.mesh);
        trash.push(pit.mesh);
      }
    }
    // the sky: drifting clouds, lightning in a thunderstorm, rain or snow falling outside the glass
    clouds.rotation.y += dt * 0.004;
    if (life.sky.thunder) {
      flashIn -= dt;
      if (flashIn <= 0) {
        skyFlash = 1;
        flashIn = 5 + rnd() * 10;
      }
    }
    if (skyFlash > 0) {
      skyFlash = Math.max(0, skyFlash - dt * 4);
      (dome.material as THREE.MeshBasicMaterial).color.setScalar(1 + 1.4 * skyFlash);
      hemi.intensity = life.light.hemi + 1.6 * skyFlash;
    }
    if (rainOut.visible || snowOut.visible) {
      const pr = rainOut.geometry.attributes.position as THREE.BufferAttribute;
      const ps = snowOut.geometry.attributes.position as THREE.BufferAttribute;
      outside.forEach((d, i) => {
        d.y -= dt * (rainOut.visible ? 9 : 0.8);
        if (d.y < -3) d.y += 12;
        if (rainOut.visible) {
          pr.setXYZ(i * 2, d.x, d.y, d.z);
          pr.setXYZ(i * 2 + 1, d.x - 0.04, d.y + 0.5, d.z);
        } else ps.setXYZ(i, d.x + Math.sin(time * 0.8 + d.sway) * 0.3, d.y, d.z + Math.cos(time * 0.6 + d.sway) * 0.2);
      });
      pr.needsUpdate = rainOut.visible;
      ps.needsUpdate = snowOut.visible;
    }
    stepGuest(dt);
    if (partyFolk) {
      const s = SPIDER_SCALE * 0.32;
      partyFolk.at.forEach((p, i) => {
        const bob = 0.06 * Math.max(0, Math.sin(time * 5 + i * 1.7));
        const yaw = faceTo(p, CAKE);
        partyFolk?.mesh.setMatrixAt(i, m4.compose(p.clone().setY(0.01 + bob), q.setFromAxisAngle(up, yaw), v(s, s, s)));
        partyFolk?.hats.setMatrixAt(i, m4.compose(p.clone().setY(0.62 * s + 0.13 + bob), q.identity(), v(1, 1, 1)));
      });
      partyFolk.mesh.instanceMatrix.needsUpdate = true;
      partyFolk.hats.instanceMatrix.needsUpdate = true;
    }
    partyFlames.forEach((o, i) => o.scale.set(1, 0.85 + 0.2 * Math.sin(time * 9 + i * 2) * Math.sin(time * 3.3 + i), 1));
    if (mat.visible) {
      const m = mat.material as THREE.MeshBasicMaterial;
      m.opacity = ease(m.opacity, matTarget, dt * 0.5);
      if (!matTarget && m.opacity === 0) mat.visible = false;
    }
  }

  /** The guest: curled up asleep (the pebble with its legs tucked right in), awake it stands, breathes and looks about; woken, it rears up and waves. */
  function stepGuest(dt: number) {
    const g = guest;
    if (!g || !life.guest) return;
    const k = Math.min(1, dt * 3);
    const awake = life.guest.awake;
    g.curl += ((awake ? 0 : 1) - g.curl) * k;
    g.wave = Math.max(0, g.wave - dt);
    g.rear += ((g.wave > 0 ? 1 : 0) - g.rear) * k;
    const look = awake ? faceTo(GUEST_AT, camera.position) + Math.sin(time * 0.35) * 0.5 : -0.6;
    g.yaw += angleDelta(g.yaw, look) * Math.min(1, dt * 2);
    g.root.rotation.set(-0.32 * g.rear, g.yaw, 0, 'YXZ');
    const tuck = g.look.pebble ? 1.9 : 1;
    g.body.position.y = g.lift - (g.look.pebble ? 0.22 : 0.06) * g.curl;
    g.abdomen.scale.setScalar(g.abdomenScale * (1 + 0.02 * Math.sin(time * (awake ? 2 : 1.1))));
    for (const leg of g.legs) {
      const raise = leg.pair === 0 ? g.rear * (0.75 + 0.25 * Math.sin(time * 8 + leg.side)) : 0;
      leg.femur.rotation.z = leg.t1 + raise + g.curl * 0.55 * tuck;
      leg.knee.rotation.z = leg.t2 - g.curl * 0.7 * tuck;
    }
  }

  const actAnchor = () => {
    if (life.mode === 'out') return null;
    const p = pose.pos.clone().add(v(0, 1.1 * SPIDER_SCALE * pose.size, 0)).project(camera);
    if (p.z > 1) return null;
    return { x: (p.x + 1) / 2, y: (1 - p.y) / 2 };
  };

  // ---- taps ----
  const ray = new THREE.Raycaster();
  /** What a tap at (`x`, `y`), in 0–1 of the view, hit: the spider, the fly to catch, or nothing. */
  const pick = (x: number, y: number): Hit => {
    placeCamera();
    scene.updateMatrixWorld();
    ray.setFromCamera(new THREE.Vector2(x * 2 - 1, -(y * 2 - 1)), camera);
    if (catchable.group.visible && ray.ray.intersectsSphere(new THREE.Sphere(catchable.group.position, 0.75))) return 'fly';
    const home = life.mode !== 'out';
    if (home && ray.intersectObject(spider.root, true).length) return 'spider';
    if (guest && ray.ray.intersectsSphere(new THREE.Sphere(GUEST_AT.clone().add(v(0, 0.3 * SPIDER_SCALE * guest.look.size, 0)), Math.max(0.55, 0.8 * SPIDER_SCALE * guest.look.size)))) return 'guest';
    // a fingertip is bigger than a leg: near the body counts too
    if (home && ray.ray.intersectsSphere(new THREE.Sphere(pose.pos.clone().add(v(0, 0.35 * SPIDER_SCALE * pose.size, 0)), 0.75 * SPIDER_SCALE * pose.size))) return 'spider';
    return null;
  };
  /** Poked: it stops, turns to the camera (on the floor), rears up and waves its pedipalps, then goes on. */
  const poke = () => {
    if (special === 'molt') return;
    interrupt();
    const wave: Step = { kind: 'wait', time: 2.4, anim: 'wave' };
    const done: Step = { kind: 'fx', fx: 'done' };
    // on the floor it turns to face you; hanging or climbing, it waves where it is
    steps = pose.thread || Math.abs(pose.pitch) > 0.2 ? [wave, done] : [{ kind: 'turn', yaw: yawToCamera(), pitch: 0 }, wave, done];
    special = 'poke';
  };
  /** Sten, sax, påse: it rears up where it is and shows its throw (`emoji`) over its head. Not while molting or out. */
  const sign = (emoji: string) => {
    if (special === 'molt' || life.mode === 'out') return;
    interrupt();
    steps = [{ kind: 'wait', time: 2.6, act: emoji, anim: 'wave' }, { kind: 'fx', fx: 'done' }];
    special = 'poke';
  };
  /** The guest was tapped: it rears up and waves (it wakes through setLife). */
  const greetGuest = () => {
    if (guest) guest.wave = 2.4;
  };

  /** For a still tank (no frames running): eased looks go straight to where they're headed. */
  const settle = () => {
    frostShown = life.weather.frost;
    frost.forEach((f) => f.scale.setScalar(frostShown));
    easeView(1);
    placeCamera();
  };

  // ---- moving pieces by hand (a long press in the view) ----
  const floorPlane = new THREE.Plane(v(0, 1, 0), 0);
  /** The movable piece under a tap at (`x`, `y`) in 0–1 of the view, if any. */
  const pickPiece = (x: number, y: number): string | null => {
    placeCamera();
    scene.updateMatrixWorld();
    ray.setFromCamera(new THREE.Vector2(x * 2 - 1, -(y * 2 - 1)), camera);
    const movable = pieces.children.filter((c) => c.name.startsWith('piece-') && MOVABLE.includes(c.name.slice(6)));
    for (const h of ray.intersectObjects(movable, true)) {
      let o: THREE.Object3D | null = h.object;
      while (o && !o.name.startsWith('piece-')) o = o.parent;
      if (o) return o.name.slice(6);
    }
    return null;
  };
  /** Where a touch at (`x`, `y`) meets the floor. */
  const floorPoint = (x: number, y: number): THREE.Vector3 | null => {
    placeCamera();
    ray.setFromCamera(new THREE.Vector2(x * 2 - 1, -(y * 2 - 1)), camera);
    return ray.ray.intersectPlane(floorPlane, new THREE.Vector3());
  };
  /** Carrying a piece (lifted a little) or putting it down (`null`). */
  const liftPiece = (id: string | null) => {
    const was = carried;
    carried = id;
    for (const c of pieces.children) {
      if (c.name === `piece-${id}`) c.position.y = 0.25;
      else if (c.name === `piece-${was}`) c.position.y = 0;
    }
  };
  /** Moves piece `id` to (dx, dz) from its usual place while it's carried, kept inside the glass; returns where it ended up. */
  const movePiece = (id: string, dx: number, dz: number): [number, number] => {
    const [cx, cz] = clampPlace(id, dx, dz);
    const g = pieces.children.find((c) => c.name === `piece-${id}`);
    if (g) g.position.set(cx, carried === id ? 0.25 : 0, cz);
    return [cx, cz];
  };

  const setLife = (next: TankLife) => {
    const before = life;
    life = next;
    if (!next.molt) moltStarted = false;
    applyLooks();
    if (before.mode === 'out' && next.mode !== 'out') start(); // back from a night out, at home
    else if (before.mode !== next.mode) interrupt();
  };

  /** Frees everything (the tests; the app never calls it: the GL context may be gone with the view). */
  const dispose = () => {
    collect();
    mini.dispose();
    skinMat.dispose();
    lingMat.dispose();
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      mesh.geometry?.dispose();
      const m = mesh.material;
      if (Array.isArray(m)) m.forEach((x) => x.dispose());
      else (m as THREE.Material | undefined)?.dispose();
    });
  };

  setPieces(opts.ids, opts.next);
  applyLooks();
  placeCamera();
  return {
    scene,
    camera,
    step,
    setSize,
    setYaw,
    setPieces,
    setLife,
    setMarking: (color: string) => {
      spider.markMat.color.set(color);
      spider.markMat.emissive.set(color);
    },
    /** Things just logged, acted out in order once it can (wandering or cosy). */
    replay: (events: readonly TankEvent[]) => {
      replays.push(...events);
      replays.splice(0, Math.max(0, replays.length - 6));
    },
    pick,
    poke,
    sign,
    pickPiece,
    floorPoint,
    liftPiece,
    movePiece,
    /** Where piece `id` stands now: (dx, dz) from its usual place. */
    placeOf: (id: string): [number, number] => offsetOf(places, id),
    /** Pinch zoom: 1 is the whole tank, up to 2.4. */
    setZoom: (z: number) => {
      view.zoom = clamp(z, 1, 2.4);
    },
    zoom: () => view.zoom,
    /** Follow the spider up close (a double tap), or let it go. */
    setFollow: (on: boolean) => {
      view.follow = on;
    },
    following: () => view.follow,
    /** The day's cricket, dropped in once it's free to hunt it. */
    feed: () => {
      feeds = Math.min(1, feeds + 1);
    },
    greetGuest,
    settle,
    collect,
    setDragging: (on: boolean) => {
      dragging = on;
    },
    takeSignal: () => signals.shift() ?? null,
    mode: () => life.mode,
    busy: () => special,
    act: () => act,
    actAnchor,
    pose: () => ({ pos: pose.pos.clone(), yaw: pose.yaw, pitch: pose.pitch, thread: pose.thread, roll: pose.roll, size: pose.size }),
    spotId: () => at.id,
    legAngles: () => spider.legs.map((l) => l.hip.rotation.y),
    /** For the tests: what's showing. */
    shown: () => ({
      skins: shownSkins,
      spiderlings: lings.length,
      eggs: Math.max(0, shownEggs),
      dressing: shownDressing,
      hat: spider.hatMount.children.length > 0,
      pet: pet?.motion ?? null,
      fly: catchable.group.visible,
      rain: rain.visible,
      snowLid: snowLid.visible,
      frost: frostShown,
      lamp: (named['lamp-light']?.[0] as THREE.PointLight | undefined)?.intensity ?? null,
      glow: (named['glow-light']?.[0] as THREE.PointLight | undefined)?.intensity ?? null,
      webLines: ((named['web-lines']?.[0] as THREE.LineSegments | undefined)?.geometry.attributes.position.count ?? 0) / 2,
      dew: (named['web-dew']?.[0] as THREE.InstancedMesh | undefined)?.count ?? 0,
      bundles: (named['web-bundles']?.[0] as THREE.InstancedMesh | undefined)?.count ?? 0,
      home: spider.root.visible,
      note: note.visible,
      shelf: shelfCount,
      guest: guest?.key ?? null,
      guestCurl: guest?.curl ?? 0,
      cake: extras.party.children.length > 0,
      partyGuests: partyFolk?.at.length ?? 0,
      scroll: scroll.visible,
      // the terrarium round
      sun: sunDisc.visible,
      moon: moonDisc.visible,
      stars: stars.visible,
      clouds: clouds.children.filter((c) => c.visible).length,
      rainOutside: rainOut.visible,
      snowOutside: snowOut.visible,
      floor: extras.floor.children[0]?.children.length ?? 0,
      floorNames: (extras.floor.children[0]?.children ?? []).map((c) => c.name).filter(Boolean),
      behaviours,
      pits: pits.length,
      cricket: cricket.group.visible,
      camR: view.r,
      lingScale: lingMesh ? (() => {
        const m = new THREE.Matrix4();
        lingMesh.getMatrixAt(0, m);
        return new THREE.Vector3().setFromMatrixScale(m).x;
      })() : 0,
    }),
    dispose,
  };
}
