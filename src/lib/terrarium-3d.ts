// The terrarium in 3D (three.js): the tank, the pieces bought for it (lair.ts), and the spider as a model that walks
// between them on its own: it turns to face where it's going, steps in an alternating tetrapod gait, climbs the
// branch, rises to the web on a thread and hides under the bark. Pure scene code with no renderer, so the tests can
// run it; components/terrarium-3d.tsx draws it with expo-gl. Units: the tank is 10 wide (x), 6 deep (z, the front
// glass at +3) and 5.5 high (y), the substrate's surface at y = 0. The spider faces +z at yaw 0.
import * as THREE from 'three';

import { lairSpots } from './lair';

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

// ---- where things are ----

const BRANCH_FROM = v(-3.4, 0, -1.7);
const BRANCH_TO = v(0.8, 3.8, -2.3);
const branchAt = (t: number) => BRANCH_FROM.clone().lerp(BRANCH_TO, t);
const BRANCH_DIR = BRANCH_TO.clone().sub(BRANCH_FROM);
const BRANCH_YAW = Math.atan2(BRANCH_DIR.x, BRANCH_DIR.z);
const BRANCH_PITCH = Math.atan2(BRANCH_DIR.y, Math.hypot(BRANCH_DIR.x, BRANCH_DIR.z));
const BRANCH_R = 0.13;

type Mode = 'floor' | 'hang' | 'branch';
/** Where the spider goes for each spot of lairSpots: on the floor, hanging under the web, or up the branch (`entry`: where it leaves the floor). */
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

/** The spots for the pieces in `ids`, in 3D (the same ones, with the same acts, as the flat terrarium). */
export function spots3d(ids: readonly string[]): Spot3D[] {
  return lairSpots(ids).flatMap((s) => {
    const at = SPOTS[s.id];
    return at ? [{ id: s.id, act: s.act, ...at, pos: at.pos.clone() }] : [];
  });
}

// ---- materials ----

const std = (color: THREE.ColorRepresentation, roughness = 0.8, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, ...extra });

// ---- the spider ----

type LegRig = { hip: THREE.Group; femur: THREE.Group; knee: THREE.Group; base: number; side: 1 | -1; phase: number; t1: number; t2: number };

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

/** The spider's size in the tank (the model is built at 1). */
export const SPIDER_SCALE = 1.55;

function buildSpider(marking: THREE.ColorRepresentation) {
  const root = new THREE.Group();
  root.scale.setScalar(SPIDER_SCALE);
  const body = new THREE.Group();
  root.add(body);
  const skin = new THREE.MeshPhysicalMaterial({ color: '#2a1f1b', roughness: 0.62, sheen: 0.8, sheenColor: new THREE.Color('#7a5c48'), sheenRoughness: 0.7 });
  const legMat = new THREE.MeshPhysicalMaterial({ color: '#3a2b25', roughness: 0.6, sheen: 0.6, sheenColor: new THREE.Color('#6b5040'), sheenRoughness: 0.7 });
  const jointMat = std('#7a5e4c', 0.6);
  const markMat = std(marking, 0.45, { emissive: new THREE.Color(marking), emissiveIntensity: 0.18 });
  const eyeMat = std('#050505', 0.06, { metalness: 0.2 });
  const darkMat = std('#140e0c', 0.5);

  // cephalothorax and abdomen
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 24, 16), skin);
  head.scale.set(1, 0.62, 1.15);
  head.position.set(0, HIP_Y, 0.34);
  body.add(head);
  const abdomen = new THREE.Group();
  abdomen.position.set(0, 0.42, -0.2);
  abdomen.rotation.x = -0.15;
  body.add(abdomen);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.36, 28, 20), skin);
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
      eye.position.set(side * x, y, z);
      body.add(eye);
    }
    const fang = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 8), darkMat);
    fang.rotation.x = Math.PI * 0.85;
    fang.position.set(side * 0.045, 0.27, 0.6);
    body.add(fang);
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
      const [l1, l2, l3] = [0.42 * def.scale, 0.5 * def.scale, 0.22 * def.scale];
      femur.add(segment(l1, 0.045, legMat));
      const knee = new THREE.Group();
      knee.position.x = l1;
      knee.rotation.z = T2;
      femur.add(knee);
      const kneeCap = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), jointMat);
      knee.add(kneeCap);
      knee.add(segment(l2, 0.036, legMat));
      const ankle = new THREE.Group();
      ankle.position.x = l2;
      ankle.rotation.z = T3;
      knee.add(ankle);
      ankle.add(new THREE.Mesh(new THREE.SphereGeometry(0.034, 8, 6), jointMat));
      ankle.add(segment(l3, 0.026, legMat));
      body.add(hip);
      // alternating tetrapod: L1 R2 L3 R4 step together, then R1 L2 R3 L4
      legs.push({ hip, femur, knee, base, side, phase: (i % 2 === 0) === (side === 1) ? 0 : Math.PI, t1: T1, t2: T2 });
    }
  });
  // pedipalps: two short feelers by the fangs
  for (const side of [1, -1] as const) {
    const palp = new THREE.Group();
    palp.position.set(side * 0.08, 0.31, 0.56);
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
    body.add(palp);
  }
  return { root, body, abdomen, legs, markMat };
}

// ---- the tank and its pieces ----

/** A thin cylinder from `a` to `b` (silk, twigs). */
function strand(a: THREE.Vector3, b: THREE.Vector3, r: number, mat: THREE.Material) {
  const dir = b.clone().sub(a);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, dir.length(), 5, 1), mat);
  mesh.position.copy(a).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(v(0, 1, 0), dir.normalize());
  return mesh;
}

function buildTank() {
  const tank = new THREE.Group();
  const top = std('#5a3d25', 1);
  const cut = std('#3b2616', 1);
  const soil = new THREE.Mesh(new THREE.BoxGeometry(TANK.w, 1.2, TANK.d), [cut, cut, top, cut, cut, cut]);
  soil.position.y = -0.6;
  tank.add(soil);
  const rnd = seeded(7);
  const pebbleMats = ['#6e6a64', '#8a7f72', '#4d4740'].map((c) => std(c, 0.9));
  for (let i = 0; i < 26; i++) {
    const r = 0.05 + rnd() * 0.1;
    const pebble = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), pebbleMats[i % 3]);
    // half on the surface, half in the front cut (seen through the glass)
    if (i < 14) pebble.position.set((rnd() - 0.5) * (TANK.w - 0.6), r * 0.3, (rnd() - 0.5) * (TANK.d - 0.6));
    else pebble.position.set((rnd() - 0.5) * (TANK.w - 0.4), -0.15 - rnd() * 0.95, TANK.d / 2 - r * 0.4);
    pebble.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
    tank.add(pebble);
  }
  // glass: only the panes facing the camera show (front side), faintly
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(TANK.w + 0.06, TANK.h + 1.2, TANK.d + 0.06),
    new THREE.MeshStandardMaterial({ color: '#d6ecff', transparent: true, opacity: 0.07, roughness: 0.05, metalness: 0, depthWrite: false }),
  );
  glass.position.y = (TANK.h - 1.2) / 2;
  glass.renderOrder = 2;
  tank.add(glass);
  // the frame along every edge
  const frame = std('#2b3038', 0.5, { metalness: 0.3 });
  const [hw, hd, y0, y1] = [TANK.w / 2, TANK.d / 2, -1.2, TANK.h];
  const corners = [v(-hw, 0, -hd), v(hw, 0, -hd), v(hw, 0, hd), v(-hw, 0, hd)];
  corners.forEach((c, i) => {
    const n = corners[(i + 1) % 4];
    for (const y of [y0, y1]) tank.add(strand(c.clone().setY(y), n.clone().setY(y), 0.06, frame));
    tank.add(strand(c.clone().setY(y0), c.clone().setY(y1), 0.06, frame));
  });
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

/** How each piece looks. Lights belong to their piece, so a faint "next" piece can drop them. */
export function buildPiece(id: string): THREE.Group {
  const g = new THREE.Group();
  if (id === 'web') {
    const silk = new THREE.MeshBasicMaterial({ color: '#e8eef6', transparent: true, opacity: 0.55 });
    const corner = v(-TANK.w / 2 + 0.05, TANK.h - 0.05, -TANK.d / 2 + 0.05);
    // a sheet across the back-left corner, sloping down into the tank
    const ends = [0, 1, 2, 3, 4, 5, 6].map((i) => {
      const a = (i / 6) * (Math.PI / 2);
      return corner.clone().add(v(Math.sin(a) * 2.2, -1.1 - Math.cos(a) * 0.5, Math.cos(a) * 1.9));
    });
    for (const e of ends) g.add(strand(corner, e, 0.012, silk));
    for (const f of [0.25, 0.45, 0.65, 0.85]) {
      for (let i = 0; i < ends.length - 1; i++) {
        const a = corner.clone().lerp(ends[i], f);
        const b = corner.clone().lerp(ends[i + 1], f);
        g.add(strand(a, b, 0.009, silk));
      }
    }
    return g;
  }
  if (id === 'lamp') {
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.5, 0.35, 20, 1, true), std('#4a4f58', 0.4, { metalness: 0.5, side: THREE.DoubleSide }));
    shade.position.set(1.8, TANK.h + 0.15, -0.4);
    g.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), new THREE.MeshBasicMaterial({ color: '#ffe2a0' }));
    bulb.position.set(1.8, TANK.h - 0.05, -0.4);
    g.add(bulb);
    const light = new THREE.PointLight('#ffb347', 14, 9, 1.6);
    light.position.set(1.8, TANK.h - 0.4, -0.4);
    g.add(light);
    const warm = new THREE.Mesh(new THREE.CircleGeometry(1.3, 32), new THREE.MeshBasicMaterial({ color: '#ffb347', transparent: true, opacity: 0.12, depthWrite: false }));
    warm.rotation.x = -Math.PI / 2;
    warm.position.set(1.8, 0.01, -0.4);
    g.add(warm);
    return g;
  }
  if (id === 'rug') {
    const greens = ['#3f6b2f', '#4f8a3a', '#356027', '#5c9a44'].map((c) => std(c, 1));
    const rnd = seeded(3);
    for (let i = 0; i < 9; i++) {
      const r = 0.3 + rnd() * 0.3;
      const tuft = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), greens[i % 4]);
      tuft.scale.set(1, 0.32, 1);
      tuft.position.set(-0.2 + (rnd() - 0.5) * 2, 0, 0.6 + (rnd() - 0.5) * 1.3);
      g.add(tuft);
    }
    return g;
  }
  if (id === 'plant') {
    const leaf = [std('#3f8a3a', 0.7, { side: THREE.DoubleSide }), std('#2f6b2c', 0.7, { side: THREE.DoubleSide })];
    for (let i = 0; i < 9; i++) {
      const frond = new THREE.Group();
      frond.position.copy(FERN);
      frond.rotation.y = (i / 9) * Math.PI * 2;
      const blade = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), leaf[i % 2]);
      blade.scale.set(0.16, 0.03, 1.1 + (i % 3) * 0.2);
      blade.position.set(0, 0.9 + (i % 3) * 0.2, 0.75);
      blade.rotation.x = -0.75 + (i % 3) * 0.15;
      frond.add(blade);
      g.add(frond);
    }
    return g;
  }
  if (id === 'couch') {
    // half a hollow log lying on its side, the arch up: the spider fits under it
    const bark = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 1.7, 22, 1, true, 0, Math.PI), std('#6b4a2f', 1, { side: THREE.DoubleSide }));
    bark.rotation.z = Math.PI / 2;
    bark.position.set(-3.7, 0, 0.6);
    g.add(bark);
    const rough = std('#4a3220', 1);
    for (let i = 0; i < 5; i++) {
      const a = -0.9 + i * 0.45;
      const ridge = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.05, 0.08), rough);
      ridge.position.set(-3.7, Math.cos(a) * 0.76, 0.6 + Math.sin(a) * 0.76);
      ridge.rotation.x = -a;
      g.add(ridge);
    }
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
    const stem = std('#e8dcc8', 0.8);
    const cap = std('#8fe07a', 0.5, { emissive: new THREE.Color('#9bff8a'), emissiveIntensity: 0.7 });
    const caps: [number, number, number, number][] = [
      [4.1, 2.0, 0.42, 0.26],
      [4.55, 1.6, 0.3, 0.2],
      [3.8, 2.45, 0.24, 0.16],
    ];
    for (const [x, z, h, r] of caps) {
      const s = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.28, r * 0.35, h, 10), stem);
      s.position.set(x, h / 2, z);
      g.add(s);
      const c = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), cap);
      c.position.set(x, h - 0.02, z);
      g.add(c);
    }
    const glow = new THREE.PointLight('#9bff8a', 3, 3.5, 1.6);
    glow.position.set(4.1, 0.9, 1.9);
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
    g.add(crystal);
    const glow = new THREE.PointLight('#8fd3ff', 3, 3.5, 1.6);
    glow.position.set(0.9, 1.0, -1.5);
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
  return g;
}

// ---- the spider's plans ----

type Step =
  | { kind: 'turn'; yaw: number; pitch: number }
  | { kind: 'move'; to: THREE.Vector3; pitch: number; speed: number; legs: boolean; thread?: boolean }
  | { kind: 'wait'; time: number; act?: string };

/** Getting from spot `a` to spot `b`: off the web or branch, across the floor, up again if need be, and a rest there. */
export function planRoute(a: Spot3D, b: Spot3D, rnd: () => number): Step[] {
  const steps: Step[] = [];
  if (a.mode === 'hang' && a.entry) steps.push({ kind: 'move', to: a.entry.clone(), pitch: -Math.PI / 2, speed: 0.9, legs: false, thread: true });
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

/**
 * The scene, its camera and the spider's life in it. `step(dt)` moves time on; `setYaw` turns the camera round the
 * tank; `setPieces` swaps what's in it (the spider starts again from the middle); `act()` is what it's doing now
 * (an emoji, while it rests at a piece) and `actAnchor()` where that shows, in 0–1 of the view.
 */
export function createWorld(opts: { ids: readonly string[]; next: string | null; marking: string; background: string; random?: () => number }) {
  const rnd = opts.random ?? Math.random;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(opts.background);
  const camera = new THREE.PerspectiveCamera(32, 16 / 9, 0.1, 100);
  const target = v(0, 2.0, 0);
  scene.add(new THREE.HemisphereLight('#cfe3ff', '#3b2a1a', 1.4));
  const sun = new THREE.DirectionalLight('#ffffff', 1.8);
  sun.position.set(4, 9, 6);
  scene.add(sun);
  scene.add(buildTank());

  const spider = buildSpider(opts.marking);
  scene.add(spider.root);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.62, 24), new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.35, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.setScalar(SPIDER_SCALE);
  scene.add(shadow);
  const silk = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1, 4), new THREE.MeshBasicMaterial({ color: '#e8eef6', transparent: true, opacity: 0.7 }));
  scene.add(silk);

  let pieces = new THREE.Group();
  scene.add(pieces);
  let spots: Spot3D[] = [];
  let at: Spot3D;
  let steps: Step[] = [];
  const pose = { pos: v(0, 0, 0), yaw: 0, pitch: 0, thread: false };
  let gait = 0;
  let stride = 0; // 0 standing still … 1 walking
  let time = 0;
  let act: string | null = null;
  let camYaw = 0;

  const start = () => {
    at = spots.find((s) => s.id === 'home' || s.id === 'rug') ?? spots[0];
    pose.pos.copy(at.pos);
    pose.yaw = 0.3;
    pose.pitch = 0;
    pose.thread = false;
    steps = [{ kind: 'wait', time: 1.5 }];
    act = null;
  };

  const setPieces = (ids: readonly string[], next: string | null) => {
    scene.remove(pieces);
    pieces = new THREE.Group();
    for (const id of ids) pieces.add(buildPiece(id));
    if (next) pieces.add(ghostOf(buildPiece(next)));
    scene.add(pieces);
    spots = spots3d(ids);
    start();
  };
  setPieces(opts.ids, opts.next);

  const setSize = (w: number, h: number) => {
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
  };
  const setYaw = (yaw: number) => {
    camYaw = yaw;
  };
  const placeCamera = () => {
    const pitch = 0.26;
    const r = 18;
    camera.position.set(target.x + Math.sin(camYaw) * Math.cos(pitch) * r, target.y + Math.sin(pitch) * r, target.z + Math.cos(camYaw) * Math.cos(pitch) * r);
    camera.lookAt(target);
  };

  const pickNext = () => {
    const others = spots.filter((s) => s.id !== at.id);
    return others.length ? others[Math.min(others.length - 1, Math.floor(rnd() * others.length))] : at;
  };

  const step = (dt: number) => {
    time += dt;
    if (!steps.length) {
      const to = pickNext();
      steps = planRoute(at, to, rnd);
      at = to;
    }
    const s = steps[0];
    let moving = false;
    if (s.kind === 'wait') {
      act = s.act ?? null;
      s.time -= dt;
      if (s.time <= 0) {
        steps.shift();
        act = null;
      }
    } else if (s.kind === 'turn') {
      act = null;
      const dy = angleDelta(pose.yaw, s.yaw);
      const turn = Math.sign(dy) * Math.min(Math.abs(dy), 3.2 * dt);
      pose.yaw += turn;
      gait += Math.abs(turn) * 2.6;
      const dp = s.pitch - pose.pitch;
      pose.pitch += Math.sign(dp) * Math.min(Math.abs(dp), 3 * dt);
      moving = true;
      if (Math.abs(angleDelta(pose.yaw, s.yaw)) < 0.01 && Math.abs(s.pitch - pose.pitch) < 0.01) steps.shift();
    } else {
      act = null;
      pose.thread = !!s.thread;
      const dp = s.pitch - pose.pitch;
      pose.pitch += Math.sign(dp) * Math.min(Math.abs(dp), 4 * dt);
      const left = s.to.clone().sub(pose.pos);
      const d = left.length();
      const go = Math.min(d, s.speed * dt);
      if (d > 1e-6) pose.pos.addScaledVector(left, go / d);
      if (s.legs) {
        gait += go * 9;
        moving = true;
      }
      if (d - go < 1e-4) {
        pose.pos.copy(s.to);
        steps.shift();
      }
    }
    stride += ((moving ? 1 : 0) - stride) * Math.min(1, dt * 6);

    // the body: where it is, which way it faces, a little bob while it walks, a breathing abdomen
    spider.root.position.copy(pose.pos);
    spider.root.rotation.set(pose.pitch, pose.yaw, 0, 'YXZ');
    spider.body.position.y = 0.02 * stride * Math.abs(Math.sin(gait));
    spider.abdomen.scale.setScalar(1 + 0.025 * Math.sin(time * 2.4));
    for (const leg of spider.legs) {
      const c = gait + leg.phase;
      const swing = 0.24 * stride * Math.sin(c);
      leg.hip.rotation.y = leg.base + (leg.side === 1 ? -swing : swing);
      const lift = 0.3 * stride * Math.max(0, Math.cos(c));
      leg.femur.rotation.z = leg.t1 + lift;
      leg.knee.rotation.z = leg.t2 - lift * 0.5;
    }
    // its shadow on the floor, and its thread to the lid
    const onFloor = pose.pos.y < 0.08 && Math.abs(pose.pitch) < 0.2;
    shadow.visible = onFloor;
    shadow.position.set(pose.pos.x, 0.012, pose.pos.z);
    silk.visible = pose.thread;
    if (pose.thread) {
      const top = v(pose.pos.x, TANK.h, pose.pos.z);
      const bottom = pose.pos.clone().add(v(0, 0.3 * SPIDER_SCALE, 0));
      silk.position.copy(top).lerp(bottom, 0.5);
      silk.scale.set(1, Math.max(0.01, top.y - bottom.y), 1);
    }
    placeCamera();
  };

  const actAnchor = () => {
    const p = pose.pos.clone().add(v(0, 1.1 * SPIDER_SCALE, 0)).project(camera);
    if (p.z > 1) return null;
    return { x: (p.x + 1) / 2, y: (1 - p.y) / 2 };
  };

  const dispose = () => {
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      mesh.geometry?.dispose();
      const m = mesh.material;
      if (Array.isArray(m)) m.forEach((x) => x.dispose());
      else (m as THREE.Material | undefined)?.dispose();
    });
  };

  placeCamera();
  return {
    scene,
    camera,
    step,
    setSize,
    setYaw,
    setPieces,
    setMarking: (color: string) => {
      spider.markMat.color.set(color);
      spider.markMat.emissive.set(color);
    },
    act: () => act,
    actAnchor,
    pose: () => ({ pos: pose.pos.clone(), yaw: pose.yaw, pitch: pose.pitch, thread: pose.thread }),
    spotId: () => at.id,
    legAngles: () => spider.legs.map((l) => l.hip.rotation.y),
    dispose,
  };
}
