// The spider's lair: furniture bought with coins, one piece at a time in a fixed order, and drawn on HQ.
// Looks only: nothing here changes XP, the boss or the league. Pieces are saved by id, so new ones can be
// added at the end of the list without touching what was bought.
import type { State } from './types';

/** `at`: where the piece stands in the room drawing, in % of its width and height. `size`: its font size. */
export type LairPiece = { id: string; name: string; emoji: string; price: number; at: { x: number; y: number }; size: number };

export const LAIR: LairPiece[] = [
  { id: 'web', name: 'Corner web', emoji: '🕸️', price: 500, at: { x: 1, y: 2 }, size: 34 },
  { id: 'lamp', name: 'Lamp', emoji: '💡', price: 750, at: { x: 46, y: 0 }, size: 22 },
  { id: 'rug', name: 'Knitted rug', emoji: '🧶', price: 1000, at: { x: 44, y: 72 }, size: 28 },
  { id: 'plant', name: 'Plant', emoji: '🪴', price: 1300, at: { x: 88, y: 60 }, size: 30 },
  { id: 'couch', name: 'Sofa', emoji: '🛋️', price: 1700, at: { x: 3, y: 58 }, size: 38 },
  { id: 'books', name: 'Bookshelf', emoji: '📚', price: 2100, at: { x: 78, y: 10 }, size: 28 },
  { id: 'rack', name: 'Squat rack', emoji: '🏋️', price: 2600, at: { x: 70, y: 56 }, size: 32 },
  { id: 'radio', name: 'Radio', emoji: '📻', price: 3200, at: { x: 64, y: 22 }, size: 22 },
  { id: 'fireplace', name: 'Fireplace', emoji: '🔥', price: 4000, at: { x: 22, y: 26 }, size: 30 },
  { id: 'arcade', name: 'Arcade cabinet', emoji: '🕹️', price: 5000, at: { x: 24, y: 62 }, size: 30 },
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
