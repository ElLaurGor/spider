import type { LineKey } from './lines';
import type { MoodLevel } from './types';

export const MOOD_LEVELS: { level: MoodLevel; emoji: string; label: string; color: string; line: LineKey }[] = [
  { level: 1, emoji: '😞', label: 'Awful', color: '#7A5CFF', line: 'moodAwful' },
  { level: 2, emoji: '😕', label: 'Meh', color: '#3F7BFF', line: 'moodLow' },
  { level: 3, emoji: '😐', label: 'Okay', color: '#8A93A6', line: 'moodOkay' },
  { level: 4, emoji: '🙂', label: 'Good', color: '#33D17A', line: 'moodGood' },
  { level: 5, emoji: '😄', label: 'Great', color: '#FFC53D', line: 'moodGreat' },
];

export const moodInfo = (level: number) => MOOD_LEVELS[Math.min(5, Math.max(1, Math.round(level))) - 1];

export const EMOTIONS: { name: string; emoji: string }[] = [
  { name: 'Happy', emoji: '😊' },
  { name: 'Calm', emoji: '😌' },
  { name: 'Motivated', emoji: '🔥' },
  { name: 'Grateful', emoji: '🙏' },
  { name: 'Excited', emoji: '🤩' },
  { name: 'Tired', emoji: '😴' },
  { name: 'Stressed', emoji: '😫' },
  { name: 'Anxious', emoji: '😰' },
  { name: 'Sad', emoji: '😢' },
  { name: 'Angry', emoji: '😠' },
  { name: 'Bored', emoji: '🥱' },
  { name: 'Lonely', emoji: '🫥' },
];

export const emotionEmoji = (name: string) => EMOTIONS.find((e) => e.name === name)?.emoji ?? '•';
