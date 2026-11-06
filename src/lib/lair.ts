// The spider's lair: furniture bought with coins, one piece at a time in a fixed order, and drawn on HQ, where
// the spider wanders between the pieces and uses them. Looks only: nothing here changes XP, the boss or the
// league. Pieces are saved by id, so new ones can be added at the end of the list without touching what was bought.
import type { State } from './types';

/**
 * Where the spider goes to use a piece, as the spider's centre in % of the room's width and height, the emoji
 * it shows while there, and whether it hangs there on a silk thread from the ceiling.
 */
export type LairVisit = { x: number; y: number; act: string; hang?: boolean };

/** `at`: where the piece stands in the room drawing, in % of its width and height. `size`: its font size. */
export type LairPiece = { id: string; name: string; emoji: string; price: number; at: { x: number; y: number }; size: number; visit: LairVisit };

export const LAIR: LairPiece[] = [
  { id: 'web', name: 'Corner web', emoji: '🕸️', price: 500, at: { x: 1, y: 2 }, size: 34, visit: { x: 9, y: 24, act: '😌', hang: true } },
  { id: 'lamp', name: 'Lamp', emoji: '💡', price: 750, at: { x: 46, y: 0 }, size: 22, visit: { x: 50, y: 32, act: '🙃', hang: true } },
  { id: 'rug', name: 'Knitted rug', emoji: '🧶', price: 1000, at: { x: 44, y: 72 }, size: 28, visit: { x: 50, y: 70, act: '🧘' } },
  { id: 'plant', name: 'Plant', emoji: '🪴', price: 1300, at: { x: 88, y: 60 }, size: 30, visit: { x: 83, y: 74, act: '💧' } },
  { id: 'couch', name: 'Sofa', emoji: '🛋️', price: 1700, at: { x: 3, y: 58 }, size: 38, visit: { x: 12, y: 66, act: '💤' } },
  { id: 'books', name: 'Bookshelf', emoji: '📚', price: 2100, at: { x: 78, y: 10 }, size: 28, visit: { x: 74, y: 34, act: '📖' } },
  { id: 'rack', name: 'Squat rack', emoji: '🏋️', price: 2600, at: { x: 70, y: 56 }, size: 32, visit: { x: 66, y: 72, act: '💪' } },
  { id: 'radio', name: 'Radio', emoji: '📻', price: 3200, at: { x: 64, y: 22 }, size: 22, visit: { x: 58, y: 32, act: '🎶' } },
  { id: 'fireplace', name: 'Fireplace', emoji: '🔥', price: 4000, at: { x: 22, y: 26 }, size: 30, visit: { x: 28, y: 52, act: '☕' } },
  { id: 'arcade', name: 'Arcade cabinet', emoji: '🕹️', price: 5000, at: { x: 24, y: 62 }, size: 30, visit: { x: 38, y: 74, act: '🎮' } },
];

const has = (s: State) => s.lair ?? [];

/** The pieces bought so far, in the lair's order. */
export const lairPieces = (s: State) => LAIR.filter((p) => has(s).includes(p.id));

/** The next piece to buy, or null once the lair is complete. Pieces go in one at a time, in order. */
export const nextPiece = (s: State) => LAIR.find((p) => !has(s).includes(p.id)) ?? null;

/** `s` with piece `id` in the lair (the caller checks it's the next one and takes the coins). */
export const withPiece = (s: State, id: string): State => ({ ...s, lair: [...new Set([...has(s), id])] });

/** Coins still needed for every piece not bought yet. */
export const lairLeft = (s: State) => LAIR.filter((p) => !has(s).includes(p.id)).reduce((a, p) => a + p.price, 0);

// ---- the spider walking around ----

export type LairSpot = { id: string; x: number; y: number; act?: string; hang?: boolean };

/** The middle of the floor, where the spider starts (the rug's spot, once there is a rug). */
export const LAIR_HOME: LairSpot = { id: 'home', x: 50, y: 70 };
const WANDER: LairSpot[] = [
  { id: 'left', x: 32, y: 74 },
  { id: 'right', x: 68, y: 74 },
];

/** Where the spider can go, given the pieces built (`ids`): each one's spot, the middle of the floor, and a little floor to pace while there's not much else. */
export function lairSpots(ids: readonly string[]): LairSpot[] {
  const pieces: LairSpot[] = LAIR.filter((p) => ids.includes(p.id)).map((p) => ({ id: p.id, ...p.visit }));
  const spots = pieces.some((p) => p.id === 'rug') ? pieces : [LAIR_HOME, ...pieces];
  return spots.length >= 3 ? spots : [...spots, ...WANDER];
}

/** The spot the spider heads for next from `from`: any other one, picked by `r` (0–1). */
export function nextSpot(spots: readonly LairSpot[], from: string, r = Math.random()): LairSpot {
  const others = spots.filter((x) => x.id !== from);
  return others.length ? others[Math.min(others.length - 1, Math.floor(r * others.length))] : spots[0];
}
