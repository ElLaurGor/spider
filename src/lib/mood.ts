import type { LineKey } from './lines';
import type { MoodEntry, MoodLevel } from './types';

export const MOOD_LEVELS: { level: MoodLevel; emoji: string; label: string; color: string; line: LineKey }[] = [
  { level: 1, emoji: '😞', label: 'Awful', color: '#7A5CFF', line: 'moodAwful' },
  { level: 2, emoji: '😕', label: 'Meh', color: '#3F7BFF', line: 'moodLow' },
  { level: 3, emoji: '😐', label: 'Okay', color: '#8A93A6', line: 'moodOkay' },
  { level: 4, emoji: '🙂', label: 'Good', color: '#33D17A', line: 'moodGood' },
  { level: 5, emoji: '😄', label: 'Great', color: '#FFC53D', line: 'moodGreat' },
];

export const moodInfo = (level: number) => MOOD_LEVELS[Math.min(5, Math.max(1, Math.round(level))) - 1];

/**
 * The words a check-in can carry. `low`: the ones "Want to name it?" offers after a low check-in. Saved by
 * name, so renaming one would orphan old entries: add new words, don't rename old ones.
 */
export const EMOTIONS: { name: string; emoji: string; low?: true }[] = [
  { name: 'Happy', emoji: '😊' },
  { name: 'Content', emoji: '☺️' },
  { name: 'Calm', emoji: '😌' },
  { name: 'Relieved', emoji: '😮‍💨' },
  { name: 'Hopeful', emoji: '🌱' },
  { name: 'Proud', emoji: '🌟' },
  { name: 'Motivated', emoji: '🔥' },
  { name: 'Grateful', emoji: '🙏' },
  { name: 'Excited', emoji: '🤩' },
  { name: 'Tired', emoji: '😴', low: true },
  { name: 'Restless', emoji: '🌀', low: true },
  { name: 'Stressed', emoji: '😫', low: true },
  { name: 'Overwhelmed', emoji: '🤯', low: true },
  { name: 'Anxious', emoji: '😰', low: true },
  { name: 'Sad', emoji: '😢', low: true },
  { name: 'Numb', emoji: '😶', low: true },
  { name: 'Lonely', emoji: '🫥', low: true },
  { name: 'Angry', emoji: '😠', low: true },
  { name: 'Irritable', emoji: '😤', low: true },
  { name: 'Bored', emoji: '🥱', low: true },
];

export const emotionEmoji = (name: string) => EMOTIONS.find((e) => e.name === name)?.emoji ?? '•';

/**
 * The check-in "Want to name it?" asks about: the day's latest, when it was low and carries no words yet
 * (a one-tap face, a notification button). Asked once: answering or skipping marks it `asked`, and check-ins
 * from the Mood screen, which offers the words right there, come marked.
 */
export function nameItFor(moods: MoodEntry[]) {
  const m = moods.at(-1);
  return m && m.level <= 2 && !m.emotions.length && !m.asked && !m.late ? m : null;
}

/** Words picked in "name it" added to a check-in (old ones kept, none twice). */
export const withNamed = (m: MoodEntry, words: string[]): MoodEntry => ({ ...m, emotions: [...new Set([...m.emotions, ...words])], asked: true });
