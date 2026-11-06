// Intercepted transmissions: coded Syndicate memos in spider runes, hidden in odd places (the back of a trek
// postcard, the 13th fly caught, a long-press on the version in Settings, a toast at 13:37, the P.S. of a boss's
// resignation letter). The key fills in from things already done: each beaten boss gives 2 letters, each fly
// species 1. Read together, the memos point at one league rival, the save's Syndicate mole (seeded per save from
// the roster). Naming the right one in the Bestiary's Decoder earns a cosmetic. Nothing is timed, nothing pays XP.
import { caughtCount } from './critters';
import { owns, withOwned } from './cosmetics';
import { ROSTER_LIST } from './league';
import type { CipherState, MemoPlace, State } from './types';

export type { MemoPlace } from './types';

/** Spider runes: one per letter (Elder Futhark plus two, all in Unicode's Runic block). */
export const RUNES = [
  'ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᚺ', 'ᚾ', 'ᛁ', 'ᛃ', 'ᛇ',
  'ᛈ', 'ᛉ', 'ᛊ', 'ᛏ', 'ᛒ', 'ᛖ', 'ᛗ', 'ᛚ', 'ᛜ', 'ᛞ', 'ᛟ', 'ᛣ', 'ᛥ',
];
export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
/** The order letters come in: the most common first, so the memos start to read early. */
export const REVEAL_ORDER = 'ETAOINSRHLDCUMFPGWYBVKXJQZ';
export const LETTERS_PER_BOSS = 2;
export const LETTERS_PER_FLY = 1;
/** The cosmetic for naming the mole (cosmetics.ts). */
export const MOLE_PRIZE = 'mole_glass';
/** Every hiding place, in no particular order: whichever is found first carries the first memo. */
export const PLACES: MemoPlace[] = ['postcard', 'fly13', 'version', 'leet', 'letter'];
export const PLACE_LABEL: Record<MemoPlace, string> = {
  postcard: 'on the back of a trek postcard',
  fly13: 'in the wings of a thirteenth fly',
  version: 'under the version number in Settings',
  leet: 'in a toast at 13:37',
  letter: "in the P.S. of a boss's resignation letter",
};
/** Which trek postcard (index on the route) carries the memo on its back. */
export const POSTCARD_MEMO = 2;
/** Every 13th fly caught (counting every catch: the 13th, the 26th, …) carries one, until it's found. */
export const FLY_MEMO = 13;
/** The resignation letter (counting every one received) whose P.S. carries one. */
export const LETTER_MEMO = 2;

function hash(text: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
function seeded(seed: string) {
  let a = hash(seed);
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Before the first memo there's no seed yet; nothing shows the key until then. */
const seedOf = (s: State) => s.cipher?.seed ?? 'spider';

/** Letter -> rune for this save: the runes in an order fixed by its seed. */
export function runeMap(s: State): Record<string, string> {
  const order = RUNES.map((_, i) => i);
  const rand = seeded(`runes|${seedOf(s)}`);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return Object.fromEntries([...ALPHABET].map((ch, i) => [ch, RUNES[order[i]]]));
}

/** How many letters of the key are known: 2 for every boss beaten (each win counts), 1 for every fly species. */
export function lettersKnown(s: State) {
  return Math.min(26, LETTERS_PER_BOSS * Object.keys(s.bossesDefeated).length + LETTERS_PER_FLY * caughtCount(s));
}
export const knownLetters = (s: State) => new Set(REVEAL_ORDER.slice(0, lettersKnown(s)));

/** The save's mole: one rival of the roster (by roster name), fixed by the seed. */
export function moleOf(s: State) {
  return ROSTER_LIST[Math.floor(seeded(`mole|${seedOf(s)}`)() * ROSTER_LIST.length)];
}

const NUMBER = ['ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN'];
/** A rival's first name: the last word of the roster name ("Caffeine Kalle" -> "KALLE"). */
export const firstName = (name: string) => name.trim().split(/\s+/).at(-1)!.toUpperCase();
const fast = (power: number) => power >= 1;

/** The memos, in the order they are found. Together they pick out exactly one roster name (tested). */
export function memoTexts(mole: { name: string; power: number }): string[] {
  const first = firstName(mole.name);
  return [
    'SYNDICATE CHANNEL OPEN. WE HAVE A FRIEND IN YOUR LEAGUE. THE SPIDER MUST NOT KNOW.',
    fast(mole.power) ? 'OUR FRIEND RUNS FAST TO STAY CLOSE TO THE SPIDER. NOBODY WATCHES THE WINNERS.' : 'OUR FRIEND RUNS SLOW ON PURPOSE. NOBODY SUSPECTS THE SLOW ONES.',
    `OUR FRIEND HAS A FIRST NAME THAT BEGINS WITH ${first[0]}. DESTROY THIS MEMO.`,
    `THE FIRST NAME ENDS IN ${first.at(-1)}. THE KING IS PLEASED.`,
    `${NUMBER[first.length] ?? String(first.length)} LETTERS IN THE FIRST NAME. THAT IS ALL. BURN AFTER READING.`,
  ];
}

/** The clues the memos give, as data: what decides who fits. */
export const cluesOf = (r: { name: string; power: number }) => {
  const first = firstName(r.name);
  return { fast: fast(r.power), initial: first[0], last: first.at(-1)!, length: first.length };
};

/** A memo as the owner sees it: known letters in plain text, the rest in runes. */
export function readMemo(s: State, text: string): { ch: string; plain: boolean }[] {
  const map = runeMap(s);
  const known = knownLetters(s);
  return [...text].map((ch) => (map[ch] ? (known.has(ch) ? { ch, plain: true } : { ch: map[ch], plain: false }) : { ch, plain: true }));
}
export const memoLine = (s: State, text: string) => readMemo(s, text).map((x) => x.ch).join('');

/** The memos found so far: where, when, and their text. */
export function memosFound(s: State) {
  const texts = memoTexts(moleOf(s));
  return (s.cipher?.found ?? []).map((f, i) => ({ ...f, text: texts[i] ?? '' }));
}
export const memoFound = (s: State, place: MemoPlace) => !!s.cipher?.found.some((f) => f.place === place);

/** `s` with the memo from `place` intercepted (once per place). The first one seeds the save's runes and mole. */
export function withMemo(s: State, place: MemoPlace, now = Date.now()): State {
  if (memoFound(s, place)) return s;
  const c: CipherState = s.cipher ?? { seed: `${now.toString(36)}${hash(String(now)).toString(36)}`, found: [] };
  return { ...s, cipher: { ...c, found: [...c.found, { place, at: now }] } };
}

/** Accusations left: one for every memo found, less the wrong ones. None once the mole is caught. */
export function guessesLeft(s: State) {
  const c = s.cipher;
  if (!c || c.solved) return 0;
  return Math.max(0, c.found.length - (c.wrong?.length ?? 0));
}

/** Naming a rival (by roster name) as the mole. Right: the prize cosmetic. Wrong: crossed off. Null when no guess is left. */
export function accuse(s: State, name: string, now = Date.now()): { state: State; right: boolean } | null {
  const c = s.cipher;
  if (!c || guessesLeft(s) <= 0 || c.wrong?.includes(name) || !ROSTER_LIST.some((r) => r.name === name)) return null;
  if (moleOf(s).name === name) {
    const state: State = { ...s, cipher: { ...c, solved: { name, at: now } } };
    return { state: owns(state, MOLE_PRIZE) ? state : withOwned(state, MOLE_PRIZE), right: true };
  }
  return { state: { ...s, cipher: { ...c, wrong: [...(c.wrong ?? []), name] } }, right: false };
}

/** Total flies caught (every catch), for the 13th-fly memo. */
export const fliesCaught = (s: State) => Object.values(s.flies ?? {}).reduce((a, f) => a + f.count, 0);
