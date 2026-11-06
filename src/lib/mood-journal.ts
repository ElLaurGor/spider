// The mood journal (step 8 days): every check-in with a note or named emotions, month by month, filterable by
// emotion word. Shown, never graded: no averages, no verdicts, and nothing here feeds roasts or recaps. Pure,
// so logic-test can check it.
import { moodsOf } from './selectors';
import type { MoodEntry, State } from './types';

export type JournalDay = { key: string; entries: MoodEntry[] };

const monthKey = (year: number, month: number) => `${year}-${String(month + 1).padStart(2, '0')}`;

/** The month's check-ins that carry words (a note or emotions), by day, newest first; `emotion` keeps only those naming it. */
export function journalMonth(s: State, year: number, month: number, emotion: string | null = null): JournalDay[] {
  const prefix = monthKey(year, month);
  return Object.keys(s.days)
    .filter((k) => k.startsWith(prefix))
    .sort()
    .reverse()
    .map((key) => ({
      key,
      entries: moodsOf(s.days[key])
        .filter((m) => m.note?.trim() || m.emotions.length)
        .filter((m) => !emotion || m.emotions.includes(emotion))
        .sort((a, b) => b.at - a.at),
    }))
    .filter((d) => d.entries.length > 0);
}

/** The emotion words used that month, most used first (the filter chips). */
export function journalEmotions(s: State, year: number, month: number): { emotion: string; n: number }[] {
  const prefix = monthKey(year, month);
  const counts = new Map<string, number>();
  for (const [k, d] of Object.entries(s.days)) {
    if (!k.startsWith(prefix)) continue;
    for (const m of moodsOf(d)) for (const e of m.emotions) counts.set(e, (counts.get(e) ?? 0) + 1);
  }
  return [...counts.entries()].map(([emotion, n]) => ({ emotion, n })).sort((a, b) => b.n - a.n || a.emotion.localeCompare(b.emotion));
}
