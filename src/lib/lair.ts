// The spider's terrarium: things bought with coins, one at a time in a fixed order, drawn on HQ, where the
// spider (drawn as a model, components/spider-model.tsx) walks between them and uses them. Looks only: nothing
// here changes XP, the boss or the league. Pieces are saved by id, so new ones can be added at the end of the
// list without touching what was bought. (The ids are older than the terrarium: it began as a furnished lair.)
import type { State } from './types';

/**
 * Where the spider goes to use a piece, as its centre in % of the terrarium's width and height, and what it shows
 * while there. `hang`: it hangs there on a thread from the lid; `up`: it's off the floor (climbing), seen from the
 * front; `face`: the way it turns once there, in degrees (0 = head up the screen, 90 = to the right).
 */
export type LairVisit = { x: number; y: number; act: string; hang?: boolean; up?: boolean; face?: number };

export type LairPiece = { id: string; name: string; emoji: string; price: number; visit: LairVisit };

export const LAIR: LairPiece[] = [
  { id: 'web', name: 'Corner web', emoji: '🕸️', price: 500, visit: { x: 14, y: 38, act: '😌', hang: true, face: 180 } },
  { id: 'lamp', name: 'Heat lamp', emoji: '💡', price: 750, visit: { x: 66, y: 64, act: '☀️' } },
  { id: 'rug', name: 'Moss bed', emoji: '🌱', price: 1000, visit: { x: 48, y: 70, act: '😴' } },
  { id: 'plant', name: 'Fern', emoji: '🌿', price: 1300, visit: { x: 82, y: 62, act: '👀' } },
  { id: 'couch', name: 'Cork bark hide', emoji: '🪵', price: 1700, visit: { x: 10, y: 64, act: '💤' } },
  { id: 'books', name: 'Climbing branch', emoji: '🌳', price: 2100, visit: { x: 41, y: 41, act: '🍃', up: true, face: 62 } },
  { id: 'rack', name: 'Rock pile', emoji: '🪨', price: 2600, visit: { x: 75, y: 62, act: '😎' } },
  { id: 'radio', name: 'Water dish', emoji: '💧', price: 3200, visit: { x: 30, y: 70, act: '💧' } },
  { id: 'fireplace', name: 'Glow mushrooms', emoji: '🍄', price: 4000, visit: { x: 84, y: 72, act: '✨' } },
  { id: 'arcade', name: 'Crystal', emoji: '💎', price: 5000, visit: { x: 56, y: 64, act: '🔮' } },
];

const has = (s: State) => s.lair ?? [];

/** The pieces bought so far, in the terrarium's order. */
export const lairPieces = (s: State) => LAIR.filter((p) => has(s).includes(p.id));

/** The next piece to buy, or null once the terrarium is complete. Pieces go in one at a time, in order. */
export const nextPiece = (s: State) => LAIR.find((p) => !has(s).includes(p.id)) ?? null;

/** `s` with piece `id` in the terrarium (the caller checks it's the next one and takes the coins). */
export const withPiece = (s: State, id: string): State => ({ ...s, lair: [...new Set([...has(s), id])] });

/** Coins still needed for every piece not bought yet. */
export const lairLeft = (s: State) => LAIR.filter((p) => !has(s).includes(p.id)).reduce((a, p) => a + p.price, 0);

// ---- the spider walking around ----

export type LairSpot = { id: string; x: number; y: number; act?: string; hang?: boolean; up?: boolean; face?: number };

/** The middle of the floor, where the spider starts (the moss bed's spot, once there is one). */
export const LAIR_HOME: LairSpot = { id: 'home', x: 48, y: 70 };
const WANDER: LairSpot[] = [
  { id: 'left', x: 30, y: 72 },
  { id: 'right', x: 66, y: 72 },
];

/** Where the spider can go, given the pieces in (`ids`): each one's spot, the middle of the floor, and a little floor to pace while there's not much else. */
export function lairSpots(ids: readonly string[]): LairSpot[] {
  const pieces: LairSpot[] = LAIR.filter((p) => ids.includes(p.id)).map((p) => ({ id: p.id, ...p.visit }));
  const spots = pieces.some((p) => p.x === LAIR_HOME.x && p.y === LAIR_HOME.y) ? pieces : [LAIR_HOME, ...pieces];
  return spots.length >= 3 ? spots : [...spots, ...WANDER];
}

/** The spot the spider heads for next from `from`: any other one, picked by `r` (0–1). */
export function nextSpot(spots: readonly LairSpot[], from: string, r = Math.random()): LairSpot {
  const others = spots.filter((x) => x.id !== from);
  return others.length ? others[Math.min(others.length - 1, Math.floor(r * others.length))] : spots[0];
}
